import { crearToken } from "./tokens";
// Validación de dominio recuperada del registro de Regina; comparación exacta.
const validarDominioIdentidad = (correo: string, afiliacion: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) &&
  (afiliacion === "externo" ||
    correo.toLowerCase().split("@")[1] ===
      (afiliacion === "alumno" ? "alumno.ipn.mx" : "ipn.mx"));
import { Router, type RequestHandler } from "express";
import crypto from "node:crypto";
import {
  pool,
  conTransaccion,
  tokenPeticion,
  nombreCookieSesion,
} from "../../bd/pool";
import {
  hashContrasena,
  verificarContrasena,
  huella,
  origenSeguro,
} from "../../comun/seguridad";
export { hashContrasena, verificarContrasena } from "../../comun/seguridad";
export const routerAuth = Router();
const idValido = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[1-9][0-9]{0,18}$/.test(id) &&
  BigInt(id) <= 9223372036854775807n;
export async function proyectarUsuario(id: string) {
  if (!idValido(id)) return null;
  const { rows } = await pool.query(
    `SELECT c.id_cuenta::text AS id,concat_ws(' ',c.nombres,c.primer_apellido,nullif(c.segundo_apellido,'')) AS nombre,c.correo,
 tc.nombre AS tipo,ec.nombre AS estado,rr.nombre AS afiliacion,c.correo_confirmado_en,e.boleta,m.rfc,
 EXISTS(SELECT 1 FROM ticket_trade.v_verificaciones_vigentes v WHERE v.id_cuenta=c.id_cuenta) AS verificado,
 ARRAY(SELECT se.id_evento::text FROM ticket_trade."StaffEvento" se WHERE se.id_cuenta=c.id_cuenta) AS eventos,
 EXISTS(SELECT 1 FROM ticket_trade."JefaturaAcademia" j JOIN ticket_trade.v_verificaciones_vigentes v ON v.id_cuenta=j.id_cuenta_empleada WHERE j.id_cuenta_empleada=c.id_cuenta) AS jefatura
 FROM ticket_trade."Cuenta" c JOIN ticket_trade."TipoCuenta" tc USING(id_tipo_cuenta) JOIN ticket_trade."EstadoCuenta" ec USING(id_estado_cuenta)
 LEFT JOIN ticket_trade."PerfilUsuario" p USING(id_cuenta) LEFT JOIN ticket_trade."RolRegistro" rr USING(id_rol_registro)
 LEFT JOIN ticket_trade."Estudiante" e USING(id_cuenta) LEFT JOIN ticket_trade."EmpleadoIPN" m USING(id_cuenta) WHERE c.id_cuenta=$1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  const expediente = await pool.query(
    `SELECT s.id_solicitud_verificacion::text id,s.motivo_solicitud,s.motivo_resolucion,es.nombre estado,
    d.numero_empleado,x.nombre_entidad,x.cargo_o_relacion FROM ticket_trade."SolicitudVerificacion" s
    JOIN ticket_trade."EstadoSolicitudVerificacion" es USING(id_estado_solicitud_verificacion)
    LEFT JOIN ticket_trade."DatosVerificacionEmpleado" d USING(id_solicitud_verificacion)
    LEFT JOIN ticket_trade."DatosVerificacionExterno" x USING(id_solicitud_verificacion)
    WHERE s.id_cuenta=$1 ORDER BY s.id_solicitud_verificacion DESC LIMIT 1`,
    [id],
  );
  const ex = expediente.rows[0];
  const documentos = ex
    ? (
        await pool.query(
          `SELECT a.id_archivo::text id,a.nombre,a.tamano_bytes tamano,td.nombre tipo,b.metadatos
    FROM ticket_trade."DocumentoVerificacion" d JOIN ticket_trade."Archivo" a USING(id_archivo)
    JOIN ticket_trade."TipoDocumentoVerificacion" td USING(id_tipo_documento_verificacion) LEFT JOIN infra.archivo_contenido b USING(id_archivo) WHERE d.id_solicitud_verificacion=$1`,
          [ex.id],
        )
      ).rows
    : [];
  const perfil =
    (
      await pool.query(
        "SELECT * FROM infra.perfil_interfaz WHERE id_cuenta=$1",
        [id],
      )
    ).rows[0] || {};
  const roles: string[] = ["asistente"];
  if (r.tipo === "Administrador") roles.unshift("admin");
  if (r.tipo === "Subdirección") roles.unshift("subdireccion");
  if (r.verificado) roles.push("organizador");
  if (r.eventos.length) roles.push("staff");
  return {
    id: r.id,
    estadoExpediente: r.verificado
      ? "aprobado"
      : ex?.estado === "Pendiente de revisión"
        ? "en_revision"
        : ex?.estado === "Rechazada"
          ? "rechazado"
          : "sin_enviar",
    idSolicitudVerificacion: ex?.id,
    motivoExpediente: ex?.motivo_resolucion,
    motivoSolicitudVerificacion: ex?.motivo_solicitud,
    numeroEmpleado: perfil.numero_empleado || ex?.numero_empleado,
    nombreOrganizacion: perfil.nombre_entidad || ex?.nombre_entidad,
    puestoContacto: perfil.cargo || ex?.cargo_o_relacion,
    telefonoContacto: perfil.telefono,
    archivosExpediente: documentos.map((d) => ({
      ...d.metadatos,
      id: d.id,
      nombre: d.nombre,
      tamano: d.tamano,
      tipo:
        (
          {
            "Constancia de estudios": "constancia",
            "Comprobante de adscripción": "adscripcion",
            "Acreditación de existencia de la entidad": "existencia",
            "Acreditación de representación": "representacion",
          } as any
        )[d.tipo] || "constancia",
      fechaEmision: d.metadatos?.fechaEmision || "",
    })),
    nombre: r.nombre,
    correo: r.correo,
    afiliacion:
      r.tipo !== "Común"
        ? "administrativo"
        : r.afiliacion === "Estudiante"
          ? "alumno"
          : r.afiliacion === "Empleado del IPN"
            ? "profesor"
            : "externo",
    roles,
    rolActivo: roles[0],
    estaActivo: r.estado === "Activa",
    correoConfirmado: !!r.correo_confirmado_en,
    esVerificado: r.verificado,
    boleta: r.boleta || undefined,
    rfc: r.rfc || undefined,
    eventosAsignadosStaff: r.eventos,
    puedeAutoaprobar: false, // La autorización automática aún no forma parte del comando remoto.
  };
}
export async function usuarioSesion(token: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await pool.query(
    "SELECT id_cuenta::text AS id FROM infra.sesion_http WHERE token_hash=$1 AND vence_en>CURRENT_TIMESTAMP",
    [huella(token)],
  );
  if (!rows[0]) return null;
  const u = await proyectarUsuario(rows[0].id);
  return u?.estaActivo ? u : null;
}
export const exigirSesion: RequestHandler = async (req, res, next) => {
  try {
    const u = await usuarioSesion(tokenPeticion(req));
    if (!u) {
      res.status(401).json({
        error: { codigo: "NO_AUTENTICADO", mensaje: "Inicia sesión." },
      });
      return;
    }
    res.locals.usuario = u;
    next();
  } catch (e) {
    next(e);
  }
};
const cookies = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};
const intentos = new Map<string, { desde: number; cantidad: number }>();
routerAuth.post("/login", origenSeguro, async (req, res, next) => {
  const ahora = Date.now(),
    ip = req.ip || "local";
  const contador = intentos.get(ip);
  if (contador && ahora - contador.desde < 60000 && contador.cantidad >= 20) {
    res.status(429).json({
      error: {
        codigo: "DEMASIADOS_INTENTOS",
        mensaje: "Espera un minuto antes de intentar de nuevo.",
      },
    });
    return;
  }
  if (intentos.size > 10000)
    for (const [clave, v] of intentos)
      if (ahora - v.desde >= 60000) intentos.delete(clave);
  intentos.set(ip, {
    desde: contador && ahora - contador.desde < 60000 ? contador.desde : ahora,
    cantidad:
      contador && ahora - contador.desde < 60000 ? contador.cantidad + 1 : 1,
  });
  const { correo, password } = req.body || {};
  if (
    typeof correo !== "string" ||
    correo.length > 320 ||
    typeof password !== "string" ||
    !password ||
    password.length > 1024
  ) {
    res.status(400).json({
      error: {
        codigo: "DATOS_INVALIDOS",
        mensaje: "Revisa correo y contraseña.",
      },
    });
    return;
  }
  try {
    const { rows } = await pool.query(
      'SELECT id_cuenta::text AS id,contrasena_hash FROM ticket_trade."Cuenta" WHERE lower(correo)=lower($1)',
      [correo.trim()],
    );
    if (
      !rows[0] ||
      !(await verificarContrasena(password, rows[0].contrasena_hash))
    ) {
      res.status(401).json({
        error: {
          codigo: "CREDENCIALES_INVALIDAS",
          mensaje: "Correo o contraseña incorrectos.",
        },
      });
      return;
    }
    const usuario = await proyectarUsuario(rows[0].id);
    if (!usuario?.estaActivo) {
      res.status(403).json({
        error: {
          codigo: "CUENTA_INACTIVA",
          mensaje: "La cuenta no está activa.",
        },
      });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    await conTransaccion(async (c) => {
      if (typeof tokenPeticion(req) === "string")
        await c.query("DELETE FROM infra.sesion_http WHERE token_hash=$1", [
          huella(tokenPeticion(req)),
        ]);
      await c.query(
        "INSERT INTO infra.sesion_http(token_hash,id_cuenta,vence_en) VALUES($1,$2,CURRENT_TIMESTAMP+interval '7 days')",
        [huella(token), usuario.id],
      );
    });
    res.cookie(nombreCookieSesion(), token, {
      ...cookies,
      maxAge: 7 * 86400000,
    });
    res.json({ datos: { usuario } });
  } catch (e) {
    next(e);
  }
});
routerAuth.get("/yo", exigirSesion, (_req, res) => {
  res.json({ datos: { usuario: res.locals.usuario } });
});
routerAuth.post("/logout", origenSeguro, async (req, res, next) => {
  try {
    if (typeof tokenPeticion(req) === "string")
      await pool.query("DELETE FROM infra.sesion_http WHERE token_hash=$1", [
        huella(tokenPeticion(req)),
      ]);
    res.clearCookie(nombreCookieSesion(), cookies);
    res.json({ datos: { exito: true } });
  } catch (e) {
    next(e);
  }
});
routerAuth.post("/registro", origenSeguro, async (req, res, next) => {
  const b = req.body || {};
  const roles = ["Estudiante", "Externo", "Empleado del IPN"];
  const afiliacion =
    b.rol === "Estudiante"
      ? "alumno"
      : b.rol === "Empleado del IPN"
        ? "profesor"
        : "externo";
  if (
    !["nombres", "primerApellido", "correo", "password", "rol"].every(
      (k) => typeof b[k] === "string" && b[k].trim(),
    ) ||
    !roles.includes(b.rol) ||
    b.password.length < 8 ||
    !/[A-Z]/.test(b.password) ||
    !/[a-z]/.test(b.password) ||
    !/[0-9]/.test(b.password) ||
    !validarDominioIdentidad(b.correo.trim().toLowerCase(), afiliacion) ||
    b.password.length > 1024 ||
    b.correo.length > 320
  ) {
    res.status(422).json({
      error: {
        codigo: "DATOS_INVALIDOS",
        mensaje:
          "Revisa los campos, el dominio del correo y usa al menos 8 caracteres con mayúscula, minúscula y número.",
      },
    });
    return;
  }
  if (
    b.rol === "Estudiante" &&
    (typeof b.boleta !== "string" ||
      !/^([0-9]{10}|(PE|PP)[0-9]{8})$/i.test(b.boleta))
  ) {
    res.status(422).json({
      error: { codigo: "BOLETA_INVALIDA", mensaje: "Revisa la boleta." },
    });
    return;
  }
  if (
    b.rol === "Empleado del IPN" &&
    (typeof b.rfc !== "string" ||
      !/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i.test(b.rfc.trim()))
  ) {
    res
      .status(422)
      .json({ error: { codigo: "RFC_REQUERIDO", mensaje: "Captura el RFC." } });
    return;
  }
  try {
    const hash = await hashContrasena(b.password);
    const id = await conTransaccion(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO ticket_trade."Cuenta"(nombres,primer_apellido,segundo_apellido,correo,contrasena_hash,id_tipo_cuenta,id_estado_cuenta) VALUES($1,$2,$3,$4,$5,(SELECT id_tipo_cuenta FROM ticket_trade."TipoCuenta" WHERE nombre='Común'),(SELECT id_estado_cuenta FROM ticket_trade."EstadoCuenta" WHERE nombre='Pendiente de activación')) RETURNING id_cuenta::text AS id`,
        [
          b.nombres.trim(),
          b.primerApellido.trim(),
          typeof b.segundoApellido === "string" ? b.segundoApellido.trim() : "",
          b.correo.trim().toLowerCase(),
          hash,
        ],
      );
      const id = rows[0].id;
      await c.query(
        'INSERT INTO ticket_trade."PerfilUsuario" VALUES($1,(SELECT id_rol_registro FROM ticket_trade."RolRegistro" WHERE nombre=$2))',
        [id, b.rol],
      );
      if (b.rol === "Estudiante")
        await c.query('INSERT INTO ticket_trade."Estudiante" VALUES($1,$2)', [
          id,
          b.boleta.toUpperCase(),
        ]);
      if (b.rol === "Empleado del IPN")
        await c.query('INSERT INTO ticket_trade."EmpleadoIPN" VALUES($1,$2)', [
          id,
          b.rfc.trim().toUpperCase(),
        ]);
      return {
        id,
        codigoPrueba: await crearToken(
          c,
          id,
          b.correo.trim().toLowerCase(),
          "Confirmación de correo",
        ),
      };
    });
    res.status(201).json({ datos: { ...id, correoConfirmado: false } });
  } catch (e) {
    next(e);
  }
});
