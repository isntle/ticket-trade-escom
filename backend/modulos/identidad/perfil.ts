import { Router } from "express";
import { pool, conTransaccion } from "../../bd/pool";
import { origenSeguro, hashContrasena } from "../../comun/seguridad";
import { fallo, ruta, texto, idEntero, demoHabilitada } from "../../comun/http";
import { exigirSesion, proyectarUsuario } from "./auth";
import { crearToken, consumirToken } from "./tokens";
import { comprobarArchivo } from "../archivos/rutas";

export const routerPerfil = Router();
routerPerfil.get(
  "/periodos",
  ruta(async (_req, res) => {
    const p = await pool.query(
      `SELECT clave id,to_char(inicio,'YYYY-MM-DD') inicio,to_char(fin,'YYYY-MM-DD') fin FROM ticket_trade."PeriodoEscolar" ORDER BY inicio`,
    );
    res.json({
      datos: p.rows.map((p) => ({
        ...p,
        fuente: "Periodo configurado en PostgreSQL",
      })),
    });
  }),
);
const limitado = new Map<string, number>();
routerPerfil.use((req, _res, next) =>
  req.method === "GET" ? next() : origenSeguro(req, _res, next),
);
routerPerfil.get(
  "/demo",
  ruta(async (_req, res) => {
    if (!demoHabilitada()) return void res.json({ datos: [] });
    const r =
      await pool.query(`SELECT id_cuenta::text id,concat_ws(' ',nombres,primer_apellido) nombre,correo,correo_confirmado_en IS NOT NULL AS "correoConfirmado" FROM ticket_trade."Cuenta"
    WHERE id_cuenta BETWEEN 1001 AND 1007 AND (correo LIKE 'cuenta%@example.invalid' OR correo='ltorres.demo@alumno.ipn.mx') ORDER BY id_cuenta`);
    res.json({
      datos: await Promise.all(r.rows.map((r) => proyectarUsuario(r.id))),
    });
  }),
);
routerPerfil.post(
  "/confirmar-correo",
  ruta(async (req, res) => {
    await conTransaccion(async (c) => {
      const t = await consumirToken(
        c,
        req.body?.token,
        "Confirmación de correo",
      );
      await c.query(
        `UPDATE ticket_trade."Cuenta" SET correo_confirmado_en=CURRENT_TIMESTAMP,
      id_estado_cuenta=CASE WHEN id_estado_cuenta=(SELECT id_estado_cuenta FROM ticket_trade."EstadoCuenta" WHERE nombre='Pendiente de activación')
      THEN (SELECT id_estado_cuenta FROM ticket_trade."EstadoCuenta" WHERE nombre='Activa') ELSE id_estado_cuenta END WHERE id_cuenta=$1 AND correo=$2`,
        [t.id, t.correo],
      );
    });
    res.json({
      datos: {
        exito: true,
        mensaje: "Correo confirmado. Ya puedes iniciar sesión.",
      },
    });
  }),
);
for (const [camino, proposito] of [
  ["reenviar-confirmacion", "Confirmación de correo"],
  ["recuperacion", "Recuperación de contraseña"],
]) {
  routerPerfil.post(
    "/" + camino,
    ruta(async (req, res) => {
      const correo = texto(req.body?.correo, "el correo", 320).toLowerCase();
      const clave = `${req.ip}:${camino}:${correo}`;
      if ((limitado.get(clave) || 0) > Date.now() - 60000)
        fallo("Espera un minuto antes de solicitar otro código.", 429);
      if (limitado.size > 5000)
        for (const [k, v] of limitado)
          if (v < Date.now() - 3600000) limitado.delete(k);
      limitado.set(clave, Date.now());
      const codigoPrueba = await conTransaccion(async (c) => {
        const r = await c.query(
          `SELECT c.id_cuenta::text id FROM ticket_trade."Cuenta" c JOIN ticket_trade."EstadoCuenta" e USING(id_estado_cuenta)
        WHERE lower(c.correo)=$1 AND e.nombre<>'Desactivada' AND ($2='Confirmación de correo' AND c.correo_confirmado_en IS NULL OR $2='Recuperación de contraseña' AND c.correo_confirmado_en IS NOT NULL)`,
          [correo, proposito],
        );
        return r.rowCount
          ? crearToken(c, r.rows[0].id, correo, proposito)
          : undefined;
      });
      res.json({
        datos: {
          exito: true,
          mensaje:
            "Si la cuenta cumple los requisitos, se generó un nuevo código.",
          codigoPrueba,
        },
      });
    }),
  );
}
routerPerfil.post(
  "/restablecer-password",
  ruta(async (req, res) => {
    const password = texto(req.body?.password, "la contraseña", 1024);
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      fallo("Usa 8 caracteres con mayúscula, minúscula y número.");
    const hash = await hashContrasena(password);
    await conTransaccion(async (c) => {
      const t = await consumirToken(
        c,
        req.body?.token,
        "Recuperación de contraseña",
      );
      await c.query(
        'UPDATE ticket_trade."Cuenta" SET contrasena_hash=$1 WHERE id_cuenta=$2',
        [hash, t.id],
      );
      await c.query("DELETE FROM infra.sesion_http WHERE id_cuenta=$1", [t.id]);
    });
    res.json({
      datos: {
        exito: true,
        mensaje: "Contraseña actualizada. Inicia sesión de nuevo.",
      },
    });
  }),
);
routerPerfil.get(
  "/usuarios",
  exigirSesion,
  ruta(async (_req, res) => {
    if (
      !res.locals.usuario.roles.some((r: string) =>
        ["admin", "subdireccion"].includes(r),
      )
    )
      fallo("No tienes permiso.", 403);
    const ids = await pool.query(
      'SELECT id_cuenta::text id FROM ticket_trade."Cuenta" ORDER BY id_cuenta',
    );
    res.json({
      datos: await Promise.all(ids.rows.map((r) => proyectarUsuario(r.id))),
    });
  }),
);
routerPerfil.post(
  "/perfil",
  exigirSesion,
  ruta(async (req, res) => {
    const b = req.body || {},
      id = res.locals.usuario.id;
    await conTransaccion(async (c) => {
      if (b.nombre !== undefined) {
        const nombre = texto(b.nombre, "el nombre", 200);
        const partes = nombre.split(/\s+/);
        await c.query(
          'UPDATE ticket_trade."Cuenta" SET nombres=$1,primer_apellido=$2,segundo_apellido=$3 WHERE id_cuenta=$4',
          [
            partes.slice(0, -2).join(" ") || partes[0],
            partes.length > 2 ? partes.at(-2) : partes.at(-1),
            "",
            id,
          ],
        );
        if (partes.length > 2)
          await c.query(
            'UPDATE ticket_trade."Cuenta" SET segundo_apellido=$1 WHERE id_cuenta=$2',
            [partes.at(-1), id],
          );
      }
      await c.query(
        `INSERT INTO infra.perfil_interfaz(id_cuenta,numero_empleado,nombre_entidad,cargo,telefono) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(id_cuenta) DO UPDATE SET numero_empleado=COALESCE(EXCLUDED.numero_empleado,infra.perfil_interfaz.numero_empleado),nombre_entidad=COALESCE(EXCLUDED.nombre_entidad,infra.perfil_interfaz.nombre_entidad),cargo=COALESCE(EXCLUDED.cargo,infra.perfil_interfaz.cargo),telefono=COALESCE(EXCLUDED.telefono,infra.perfil_interfaz.telefono)`,
        [
          id,
          ...[
            "numeroEmpleado",
            "nombreOrganizacion",
            "puestoContacto",
            "telefonoContacto",
          ].map((k) =>
            typeof b[k] === "string" ? b[k].trim().slice(0, 200) : null,
          ),
        ],
      );
    });
    res.json({ datos: { usuario: await proyectarUsuario(id) } });
  }),
);

routerPerfil.post(
  "/expediente",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario,
      b = req.body || {};
    if (!u.correoConfirmado) fallo("Confirma primero tu correo.", 403);
    if (u.roles.includes("admin") || u.roles.includes("subdireccion"))
      fallo("Las cuentas especiales no requieren expediente.");
    if (
      !Array.isArray(b.documentos) ||
      b.documentos.length < 1 ||
      b.documentos.length > 2
    )
      fallo("Adjunta uno o dos PDF según tu perfil.");
    const motivo = texto(b.motivoSolicitud, "el motivo de la verificación");
    const id = await conTransaccion(async (c) => {
      const periodo = await c.query(
        `SELECT id_periodo_escolar FROM ticket_trade."PeriodoEscolar" WHERE CURRENT_DATE BETWEEN inicio AND fin ORDER BY inicio DESC LIMIT 1`,
      );
      if (!periodo.rowCount)
        fallo("No hay periodo escolar vigente. Solicita su configuración.");
      const tipos: Record<string, number> = {
        constancia: 1,
        horario: 1,
        adscripcion: 2,
        existencia: 3,
        representacion: 4,
      };
      const requeridos =
        u.afiliacion === "alumno"
          ? [b.documentos[0]?.tipo === 'horario' ? 'horario' : 'constancia']
          : u.afiliacion === "externo"
            ? ["existencia", "representacion"]
            : ["adscripcion"];
      if (
        b.documentos.length !== requeridos.length ||
        requeridos.some((t) => !b.documentos.some((d: any) => d.tipo === t))
      )
        fallo("Faltan los documentos requeridos para tu perfil.");
      const s = await c.query(
        `INSERT INTO ticket_trade."SolicitudVerificacion"(id_cuenta,id_periodo_escolar,motivo_solicitud,enviada_en,id_estado_solicitud_verificacion)
      VALUES($1,$2,$3,CURRENT_TIMESTAMP,(SELECT id_estado_solicitud_verificacion FROM ticket_trade."EstadoSolicitudVerificacion" WHERE nombre='Pendiente de revisión')) RETURNING id_solicitud_verificacion::text id`,
        [u.id, periodo.rows[0].id_periodo_escolar, motivo],
      );
      const id = s.rows[0].id;
      if (u.afiliacion === "externo")
        await c.query(
          'INSERT INTO ticket_trade."DatosVerificacionExterno" VALUES($1,$2,$3)',
          [
            id,
            texto(b.nombreEntidad, "la entidad"),
            texto(b.cargo, "el cargo"),
          ],
        );
      else if (u.afiliacion !== "alumno")
        await c.query(
          'INSERT INTO ticket_trade."DatosVerificacionEmpleado" VALUES($1,$2)',
          [id, texto(b.numeroEmpleado, "el número de empleado", 100)],
        );
      for (const d of b.documentos) {
        await comprobarArchivo(c, d.id, u.id, ["application/pdf"]);
        await c.query(
          "UPDATE infra.archivo_contenido SET metadatos=$1::jsonb WHERE id_archivo=$2",
          [
            JSON.stringify({
              tipo: d.tipo,
              fechaEmision: d.fechaEmision,
              vigenteHasta: d.vigenteHasta,
              periodo: d.periodo,
              periodoActual: d.periodoActual,
            }),
            d.id,
          ],
        );
        await c.query(
          'INSERT INTO ticket_trade."DocumentoVerificacion"(id_solicitud_verificacion,id_tipo_documento_verificacion,id_archivo) VALUES($1,$2,$3)',
          [id, tipos[d.tipo], d.id],
        );
      }
      return id;
    });
    res
      .status(201)
      .json({ datos: { id, usuario: await proyectarUsuario(u.id) } });
  }),
);
routerPerfil.post(
  "/expedientes/:id/resolucion",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario,
      b = req.body || {},
      id = idEntero(req.params.id);
    if (!u.roles.includes("subdireccion"))
      fallo("Solo Subdirección puede revisar expedientes.", 403);
    if (!["Aprobada", "Rechazada"].includes(b.decision))
      fallo("Decisión inválida.");
    const motivo = texto(b.motivo, "el motivo de la resolución");
    await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
      const s = await c.query(
        `SELECT s.id_cuenta::text titular FROM ticket_trade."SolicitudVerificacion" s JOIN ticket_trade."EstadoSolicitudVerificacion" es USING(id_estado_solicitud_verificacion)
      JOIN ticket_trade."PeriodoEscolar" p USING(id_periodo_escolar) WHERE s.id_solicitud_verificacion=$1 AND es.nombre='Pendiente de revisión' AND CURRENT_DATE BETWEEN p.inicio AND p.fin FOR UPDATE OF s`,
        [id],
      );
      if (!s.rowCount) fallo("El expediente cambió o su periodo terminó.", 409);
      if (s.rows[0].titular === u.id)
        fallo("No puedes revisar tu propio expediente.", 403);
      await c.query(
        `UPDATE ticket_trade."SolicitudVerificacion" SET id_estado_solicitud_verificacion=(SELECT id_estado_solicitud_verificacion FROM ticket_trade."EstadoSolicitudVerificacion" WHERE nombre=$2),
      resuelta_en=CURRENT_TIMESTAMP,id_cuenta_resolutora=$3,motivo_resolucion=$4 WHERE id_solicitud_verificacion=$1`,
        [id, b.decision, u.id, motivo],
      );
      if (b.decision === "Aprobada")
        await c.query(
          'INSERT INTO ticket_trade."Verificacion"(id_solicitud_verificacion_aprobada) VALUES($1)',
          [id],
        );
    });
    res.json({ datos: { exito: true } });
  }),
);
