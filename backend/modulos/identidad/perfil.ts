import { validarPeriodosIdentidad } from "../../../src/dominio/periodosIdentidad.js";
import {presentacionCompartida,presentacionAutorizada,clavePresentacionValida,crearCookiePresentacion,nombreCookiePresentacion} from "./presentacion.js";
import { Router } from "express";
import { encolarAviso, registrarAvisoBandeja } from "../correos/avisos.js";
import { pool, conTransaccion } from "../../bd/pool.js";
import { origenSeguro, hashContrasena, huella } from "../../comun/seguridad.js";
import { fallo, ruta, texto, idEntero, demoHabilitada } from "../../comun/http.js";
import { exigirSesion, proyectarUsuario } from "./auth.js";
import { crearToken, consumirToken } from "./tokens.js";
import { comprobarArchivo } from "../archivos/rutas.js";

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
  ruta(async (req, res) => {
    const compartida=presentacionCompartida();
    if (compartida ? !presentacionAutorizada(req) : !demoHabilitada()) return void res.json({ datos: [] });
    const r =
      await pool.query(`SELECT id_cuenta::text id,concat_ws(' ',nombres,primer_apellido) nombre,correo,correo_confirmado_en IS NOT NULL AS "correoConfirmado" FROM ticket_trade."Cuenta"
    WHERE id_cuenta BETWEEN 1001 AND 1007 AND (correo LIKE 'cuenta%@example.invalid' OR correo='ltorres.demo@alumno.ipn.mx' OR correo LIKE 'tickettradescom+%@gmail.com') ORDER BY id_cuenta`);
    res.set("Cache-Control","no-store").json({
      datos: await Promise.all(r.rows.map(async (r) => ({...await proyectarUsuario(r.id),...(compartida?{password:process.env.TT_PRESENTACION_PASSWORD}:{})}))),
    });
  }),
);
routerPerfil.post('/presentacion',ruta(async(req,res)=>{
  const ip='presentacion:'+req.ip;
  if((limitado.get(ip)||0)>Date.now()-2000)fallo('Espera antes de intentarlo de nuevo.',429);
  limitado.set(ip,Date.now());
  if(!clavePresentacionValida(req.body?.clave))fallo('La clave de presentación no es válida.',403);
  res.cookie(nombreCookiePresentacion,crearCookiePresentacion(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:12*60*60*1000});
  res.set('Cache-Control','no-store').json({datos:{exito:true}});
}));
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
      await encolarAviso(
        c,
        t.id,
        "password-restablecida:" + huella(String(req.body.token)),
        "Tu contraseña fue actualizada",
        "Se completó el restablecimiento de tu contraseña y se cerraron las sesiones anteriores. Si no reconoces este cambio, recupera tu cuenta de inmediato.",
        "/recuperar-password",
      );
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
  "/usuarios/:id/estado",
  exigirSesion,
  ruta(async (req, res) => {
    const admin = res.locals.usuario;
    if (!admin.roles.includes("admin")) {
      fallo("Solo Administración puede modificar el estado de la cuenta.", 403);
    }
    const id = idEntero(req.params.id);
    if (String(id) === String(admin.id)) {
      fallo("No puedes suspender tu propia cuenta.", 400);
    }
    const b = req.body || {};
    const motivo = b.motivo ? texto(b.motivo, "el motivo", 500) : undefined;
    const resultado = await conTransaccion(async (c) => {
      const q = await c.query(
        `SELECT c.id_cuenta::text, ec.nombre AS estado, c.correo
         FROM ticket_trade."Cuenta" c
         JOIN ticket_trade."EstadoCuenta" ec USING(id_estado_cuenta)
         WHERE c.id_cuenta=$1 FOR UPDATE OF c`,
        [id],
      );
      if (!q.rowCount) fallo("Cuenta no encontrada.", 404);
      const cuentaActual = q.rows[0];
      const actualmenteActiva = cuentaActual.estado === "Activa";
      if (typeof b.activo !== "boolean") fallo("Indica el estado que deseas guardar.");
      const nuevoActivo = b.activo;
      if (nuevoActivo === actualmenteActiva) return { nuevoActivo };
      const nuevoEstadoNombre = nuevoActivo ? "Activa" : "Desactivada";

      await c.query(
        `UPDATE ticket_trade."Cuenta"
         SET id_estado_cuenta=(SELECT id_estado_cuenta FROM ticket_trade."EstadoCuenta" WHERE nombre=$2)
         WHERE id_cuenta=$1`,
        [id, nuevoEstadoNombre],
      );

      if (!nuevoActivo) {
        // Efecto real: invalidar sesiones activas en la BD de inmediato
        await c.query("DELETE FROM infra.sesion_http WHERE id_cuenta=$1", [id]);
        if (motivo) {
          await encolarAviso(
            c,
            String(id),
            "cuenta-suspendida:" + Date.now(),
            "Tu cuenta fue suspendida",
            `Administración suspendió tu cuenta. Motivo: ${motivo}`,
            "/login",
          );
        }
      } else {
        await encolarAviso(
          c,
          String(id),
          "cuenta-reactivada:" + Date.now(),
          "Tu cuenta fue reactivada",
          "Administración ha reactivado tu cuenta. Ya puedes iniciar sesión nuevamente.",
          "/login",
        );
      }

      return { nuevoActivo, nuevoEstadoNombre };
    });

    res.json({
      datos: {
        exito: true,
        mensaje: resultado.nuevoActivo
          ? "Cuenta activada correctamente."
          : `Cuenta suspendida correctamente.${motivo ? ` Motivo: ${motivo}` : ""}`,
        estaActivo: resultado.nuevoActivo,
        usuario: await proyectarUsuario(String(id)),
      },
    });
  }),
);
routerPerfil.get("/jefaturas/catalogo", exigirSesion, ruta(async (_req, res) => {
  if (!res.locals.usuario.roles.includes("admin")) fallo("Solo Administración puede gestionar jefaturas.", 403);
  const [academias, otorgantes] = await Promise.all([
    pool.query(`SELECT a.id_academia::text id, a.nombre, j.id_cuenta_empleada::text titular
      FROM ticket_trade."Academia" a LEFT JOIN ticket_trade."JefaturaAcademia" j USING(id_academia)
      ORDER BY a.nombre`),
    pool.query(`SELECT id_cuenta::text id, concat_ws(' ', nombres, primer_apellido, segundo_apellido) nombre
      FROM ticket_trade."Cuenta" JOIN ticket_trade."TipoCuenta" USING(id_tipo_cuenta)
      JOIN ticket_trade."EstadoCuenta" USING(id_estado_cuenta)
      WHERE "TipoCuenta".nombre='Subdirección' AND "EstadoCuenta".nombre='Activa'
      ORDER BY id_cuenta`),
  ]);
  res.set("Cache-Control", "private, no-store").json({datos: {academias: academias.rows, otorgantes: otorgantes.rows}});
}));
routerPerfil.post(
  "/periodos",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario;
    if (!u.roles.includes("admin")) {
      fallo("No tienes permiso para configurar periodos escolares.", 403);
    }
    const b = req.body || {};
    if (!Array.isArray(b.periodos) || b.periodos.length > 100) fallo("Envía una lista de hasta 100 periodos.");
    const lista = b.periodos.map((p: any) => ({
      id: texto(p?.id, "la clave del periodo", 80), inicio: p?.inicio, fin: p?.fin, fuente: "PostgreSQL",
    }));
    if (lista.some((p: any) => typeof p.inicio !== "string" || typeof p.fin !== "string"))
      fallo("Indica las fechas del periodo.");
    const error = validarPeriodosIdentidad(lista);
    if (error) fallo(error);

    await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");

      const existentes = await c.query(`SELECT clave id,to_char(inicio,'YYYY-MM-DD') inicio,to_char(fin,'YYYY-MM-DD') fin
        FROM ticket_trade."PeriodoEscolar" ORDER BY inicio`);
      if (typeof b.versionEsperada === "string") {
        let anterior: unknown;
        try { anterior = JSON.parse(b.versionEsperada); }
        catch { fallo("Vuelve a consultar los periodos antes de guardar.", 409); }
        const firma = (p: any) => [p?.id, p?.inicio, p?.fin];
        if (!Array.isArray(anterior) ||
            JSON.stringify(anterior.map(firma)) !== JSON.stringify(existentes.rows.map(firma)))
          fallo("Los periodos cambiaron. Recárgalos antes de guardar.", 409);
      }
      if (existentes.rows.some(p => !lista.some((n: any) => n.id === p.id)))
        fallo("Conserva las claves de los periodos existentes.", 409);
      const conTramites = await c.query(
        `SELECT DISTINCT p.clave, to_char(p.inicio,'YYYY-MM-DD') inicio, to_char(p.fin,'YYYY-MM-DD') fin FROM ticket_trade."PeriodoEscolar" p
         JOIN ticket_trade."SolicitudVerificacion" s USING(id_periodo_escolar)`,
      );
      const clavesEntrantes = new Map(lista.map((p: any) => [p.id.trim(), p]));
      if (clavesEntrantes.size !== lista.length) fallo("Hay claves de periodo duplicadas.");
      for (const row of conTramites.rows) {
        const recibido = clavesEntrantes.get(row.clave) as { inicio: string; fin: string } | undefined;
        if (!recibido || recibido.inicio !== row.inicio || recibido.fin !== row.fin) {
          fallo(
            `Conserva los periodos que ya tienen trámites de verificación; añade el siguiente periodo sin alterar el historial (periodo: ${row.clave}).`,
            409,
          );
        }
      }

      for (const p of lista) {
        await c.query(
          `INSERT INTO ticket_trade."PeriodoEscolar" (clave, inicio, fin)
           VALUES ($1, $2, $3)
           ON CONFLICT (clave) DO UPDATE SET inicio = EXCLUDED.inicio, fin = EXCLUDED.fin`,
          [p.id.trim(), p.inicio, p.fin],
        );
      }
    });

    const actualizados = await pool.query(
      `SELECT clave id, to_char(inicio, 'YYYY-MM-DD') inicio, to_char(fin, 'YYYY-MM-DD') fin
       FROM ticket_trade."PeriodoEscolar" ORDER BY inicio`,
    );

    res.json({
      datos: {
        exito: true,
        mensaje: "Periodos escolares guardados correctamente.",
        periodos: actualizados.rows.map((p) => ({
          ...p,
          fuente: "Periodo configurado en PostgreSQL",
        })),
      },
    });
  }),
);
routerPerfil.post(
  "/usuarios/:id/jefatura",
  exigirSesion,
  ruta(async (req, res) => {
    const operador = res.locals.usuario;
    if (!operador.roles.includes("admin")) {
      fallo("No tienes permiso para gestionar jefaturas de academia.", 403);
    }
    const targetId = idEntero(req.params.id);
    const b = req.body || {};
    if (typeof b.valor !== "boolean") fallo("Indica si deseas asignar o retirar la jefatura.");
    const valor = b.valor;
    const motivo = b.motivo ? texto(b.motivo, "el motivo", 500) : "";

    await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");

      if (!valor) {
        // Retiro de jefatura
        const eliminada = await c.query(
          `DELETE FROM ticket_trade."JefaturaAcademia" WHERE id_cuenta_empleada=$1 RETURNING id_academia::text`,
          [targetId],
        );
        if (!eliminada.rowCount) {
          fallo("El docente no cuenta con una jefatura de academia activa.", 404);
        }
        await encolarAviso(
          c,
          String(targetId),
          "jefatura-retirada:" + Date.now(),
          "Retiro de Jefatura de Academia",
          `Se ha retirado tu nombramiento de jefatura de academia.${motivo ? ` Motivo: ${motivo}` : ""}`,
          "/perfil",
        );
      } else {
        // Alta de jefatura
        // 1. Validar que la cuenta objetivo exista, esté activa y sea empleado del IPN
        const cuentaTarget = await c.query(
          `SELECT c.id_cuenta::text, ec.nombre AS estado,
                  EXISTS(SELECT 1 FROM ticket_trade."EmpleadoIPN" WHERE id_cuenta = c.id_cuenta) AS es_empleado
           FROM ticket_trade."Cuenta" c
           JOIN ticket_trade."EstadoCuenta" ec USING(id_estado_cuenta)
           WHERE c.id_cuenta = $1`,
          [targetId],
        );
        if (!cuentaTarget.rowCount) fallo("Cuenta no encontrada.", 404);
        if (cuentaTarget.rows[0].estado !== "Activa") {
          fallo("La cuenta debe estar activa para recibir una jefatura.", 422);
        }
        if (!cuentaTarget.rows[0].es_empleado) {
          fallo("La jefatura de academia solo puede asignarse a un docente o empleado del IPN.", 422);
        }

        // 2. Validar que tenga una Verificación sin retiro, ligada a SolicitudVerificacion aprobada y periodo vigente (Regla TT012)
        const verifRow = await c.query(
          `SELECT v.id_verificacion::text, v.retirada_en, p.clave, p.inicio, p.fin,
                  ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date BETWEEN p.inicio AND p.fin) AS periodo_vigente
           FROM ticket_trade."Verificacion" v
           JOIN ticket_trade."SolicitudVerificacion" s ON s.id_solicitud_verificacion = v.id_solicitud_verificacion_aprobada
           JOIN ticket_trade."PeriodoEscolar" p USING(id_periodo_escolar)
           WHERE s.id_cuenta = $1
           ORDER BY v.id_verificacion DESC LIMIT 1`,
          [targetId],
        );
        if (!verifRow.rowCount) {
          fallo("El docente no cuenta con una verificación documental aprobada.", 422);
        }
        if (verifRow.rows[0].retirada_en) {
          fallo("La verificación documental del docente fue retirada; no puede recibir jefatura de academia.", 422);
        }
        if (!verifRow.rows[0].periodo_vigente) {
          fallo("La verificación del docente corresponde a un periodo escolar no vigente.", 422);
        }

        const idOtorganteFinal = idEntero(b.idOtorgante);
        const otorgante = await c.query(`SELECT 1 FROM ticket_trade."Cuenta" c
          JOIN ticket_trade."TipoCuenta" tc USING(id_tipo_cuenta)
          JOIN ticket_trade."EstadoCuenta" ec USING(id_estado_cuenta)
          WHERE c.id_cuenta=$1 AND tc.nombre='Subdirección' AND ec.nombre='Activa'`, [idOtorganteFinal]);
        if (!otorgante.rowCount) fallo("El otorgante debe ser una cuenta activa de Subdirección.");

        let idAcademiaFinal: string;
        if (b.nombreAcademia !== undefined) {
          const nombre = texto(b.nombreAcademia, "el nombre de la academia", 120);
          const existente = await c.query('SELECT 1 FROM ticket_trade."Academia" WHERE lower(nombre)=lower($1)', [nombre]);
          if (existente.rowCount) fallo("La academia ya existe. Selecciónala en el catálogo.", 409);
          const creada = await c.query('INSERT INTO ticket_trade."Academia"(nombre) VALUES($1) RETURNING id_academia::text id', [nombre]);
          idAcademiaFinal = creada.rows[0].id;
        } else {
          idAcademiaFinal = idEntero(b.idAcademia);
          const academia = await c.query('SELECT 1 FROM ticket_trade."Academia" WHERE id_academia=$1', [idAcademiaFinal]);
          if (!academia.rowCount) fallo("Academia no encontrada.", 404);
        }
        const nombramientos = await c.query(`SELECT id_academia::text academia, id_cuenta_empleada::text titular
          FROM ticket_trade."JefaturaAcademia" WHERE id_academia=$1 OR id_cuenta_empleada=$2`,
          [idAcademiaFinal, targetId]);
        if (nombramientos.rows.some(n => n.academia === idAcademiaFinal && n.titular === targetId)) return;
        if (nombramientos.rowCount) fallo("La academia o la persona ya tiene una jefatura. Retira primero el nombramiento vigente.", 409);
        await c.query(
          `INSERT INTO ticket_trade."JefaturaAcademia" (id_academia, id_cuenta_empleada, id_cuenta_otorgante)
           VALUES ($1, $2, $3)`,
          [idAcademiaFinal, targetId, idOtorganteFinal],
        );

        await encolarAviso(
          c,
          String(targetId),
          "jefatura-asignada:" + Date.now(),
          "Nombramiento de Jefatura de Academia",
          `Se te ha asignado la jefatura de academia.${motivo ? ` Motivo: ${motivo}` : ""}`,
          "/perfil",
        );
      }
    });

    res.json({
      datos: {
        exito: true,
        mensaje: valor
          ? "Jefatura de academia asignada correctamente."
          : "Jefatura de academia retirada correctamente.",
        tieneJefaturaAcademica: valor,
        usuario: await proyectarUsuario(String(targetId)),
      },
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
    if (u.esVerificado) fallo("Tu verificación sigue vigente. Podrás renovarla cuando corresponda.",409);
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
      await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
      const periodo = await c.query(
        `SELECT id_periodo_escolar FROM ticket_trade."PeriodoEscolar" WHERE (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date BETWEEN inicio AND fin ORDER BY inicio DESC LIMIT 1`,
      );
      if (!periodo.rowCount)
        fallo("No hay periodo escolar vigente. Solicita su configuración.");
      const idPeriodo = periodo.rows[0].id_periodo_escolar;
      const pendiente = await c.query(
        `SELECT 1 FROM ticket_trade."SolicitudVerificacion" s JOIN ticket_trade."EstadoSolicitudVerificacion" es USING(id_estado_solicitud_verificacion) WHERE s.id_cuenta=$1 AND es.nombre='Pendiente de revisión'`,
        [u.id],
      );
      if (pendiente.rowCount)
        fallo("Ya tienes una solicitud pendiente de revisión.", 409);
      const intentos = await c.query(
        'SELECT count(*)::int n FROM ticket_trade."SolicitudVerificacion" WHERE id_cuenta=$1 AND id_periodo_escolar=$2',
        [u.id, idPeriodo],
      );
      if (intentos.rows[0].n >= 3)
        fallo("Alcanzaste los tres envíos permitidos en este periodo.", 409);
      const tipos: Record<string, number> = {
        constancia: 1,
        horario: 1,
        adscripcion: 2,
        existencia: 3,
        representacion: 4,
      };
      const requeridos =
        u.afiliacion === "alumno"
          ? [b.documentos[0]?.tipo === "horario" ? "horario" : "constancia"]
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
        [u.id, idPeriodo, motivo],
      );
      const id = s.rows[0].id;
      const perfil =
        (
          await c.query(
            "SELECT numero_empleado,nombre_entidad,cargo FROM infra.perfil_interfaz WHERE id_cuenta=$1",
            [u.id],
          )
        ).rows[0] || {};
      if (u.afiliacion === "externo") {
        const nombreEntidad = texto(
          b.nombreEntidad || perfil.nombre_entidad,
          "la entidad",
        );
        const cargo = texto(b.cargo || perfil.cargo, "el cargo");
        await c.query(
          'INSERT INTO ticket_trade."DatosVerificacionExterno" VALUES($1,$2,$3)',
          [id, nombreEntidad, cargo],
        );
        await c.query(
          `INSERT INTO infra.perfil_interfaz(id_cuenta,nombre_entidad,cargo) VALUES($1,$2,$3)
      ON CONFLICT(id_cuenta) DO UPDATE SET nombre_entidad=EXCLUDED.nombre_entidad,cargo=EXCLUDED.cargo`,
          [u.id, nombreEntidad, cargo],
        );
      } else if (u.afiliacion !== "alumno") {
        const numeroEmpleado = texto(
          b.numeroEmpleado || perfil.numero_empleado,
          "el número de empleado",
          100,
        );
        await c.query(
          'INSERT INTO ticket_trade."DatosVerificacionEmpleado" VALUES($1,$2)',
          [id, numeroEmpleado],
        );
        await c.query(
          `INSERT INTO infra.perfil_interfaz(id_cuenta,numero_empleado) VALUES($1,$2)
      ON CONFLICT(id_cuenta) DO UPDATE SET numero_empleado=EXCLUDED.numero_empleado`,
          [u.id, numeroEmpleado],
        );
      }
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
      await encolarAviso(
        c,
        u.id,
        "expediente-recibido:" + id,
        "Recibimos tu solicitud de verificación",
        "Tu expediente está pendiente de revisión por Subdirección. Recibirlo no implica su aprobación.",
        "/mi-expediente",
      );
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
    if (!["Aprobada", "Rechazada", "Requiere corrección"].includes(b.decision))
      fallo("Decisión inválida.");
    const motivo = texto(b.motivo, "el motivo de la resolución").replace(/^(?:\[CORRECCION\]\s*)+/g, "").trim();
    if(!motivo)fallo("Escribe el motivo de la resolución.");
    await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
      const s = await c.query(
        `SELECT s.id_cuenta::text titular FROM ticket_trade."SolicitudVerificacion" s JOIN ticket_trade."EstadoSolicitudVerificacion" es USING(id_estado_solicitud_verificacion)
      JOIN ticket_trade."PeriodoEscolar" p USING(id_periodo_escolar) WHERE s.id_solicitud_verificacion=$1 AND es.nombre='Pendiente de revisión' AND (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date BETWEEN p.inicio AND p.fin FOR UPDATE OF s`,
        [id],
      );
      if (!s.rowCount) fallo("El expediente cambió o su periodo terminó.", 409);
      if (s.rows[0].titular === u.id)
        fallo("No puedes revisar tu propio expediente.", 403);
      const correccion = b.decision === "Requiere corrección";
      await c.query(
        `UPDATE ticket_trade."SolicitudVerificacion" SET id_estado_solicitud_verificacion=(SELECT id_estado_solicitud_verificacion FROM ticket_trade."EstadoSolicitudVerificacion" WHERE nombre=$2),
      resuelta_en=CURRENT_TIMESTAMP,id_cuenta_resolutora=$3,motivo_resolucion=$4 WHERE id_solicitud_verificacion=$1`,
        [
          id,
          correccion ? "Rechazada" : b.decision,
          u.id,
          correccion ? "[CORRECCION] " + motivo : motivo,
        ],
      );
      if (b.decision === "Aprobada")
        await c.query(
          'INSERT INTO ticket_trade."Verificacion"(id_solicitud_verificacion_aprobada) VALUES($1)',
          [id],
        );
      // Los documentos resueltos se conservan para el historial y la revisión.
      const tituloBandeja =
        b.decision === "Requiere corrección"
          ? "Tu expediente requiere corrección"
          : b.decision === "Aprobada"
            ? "Tu expediente fue aprobado"
            : "Tu expediente fue rechazado";
      const siguientePaso =
        b.decision === "Aprobada"
          ? "Ya puedes registrar solicitudes de eventos."
          : b.decision === "Requiere corrección"
            ? "Corrige los documentos observados y vuelve a enviar tu expediente."
            : "Revisa el motivo y verifica tus intentos disponibles en el periodo.";
      await registrarAvisoBandeja(c, {
        destinatario: s.rows[0].titular,
        tipo: "expediente_resolucion:" + id,
        titulo: tituloBandeja,
        mensaje: `Motivo: ${motivo}\nSiguiente paso: ${siguientePaso}`,
        referencia: "/mi-expediente",
      });
      await encolarAviso(
        c,
        s.rows[0].titular,
        "expediente-resuelto:" + id,
        b.decision === "Requiere corrección" ? "Tu expediente requiere corrección" : "Tu verificación fue " +
          (b.decision === "Aprobada" ? "aprobada" : "rechazada"),
        "Subdirección resolvió tu solicitud. Motivo: " + motivo,
        "/mi-expediente",
      );
    });
    res.json({ datos: { exito: true } });
  }),
);
