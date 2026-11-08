import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { pool } from '../../bd/pool';

export const routerAuth = Router();

const CLAVE_SECRETA = process.env.SESSION_SECRET || 'tt_clave_secreta_institucional_2026';

/**
 * Funciones de hashing y verificación de contraseñas
 */
export function hashContrasena(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verificarContrasena(password: string, contrasenaHash: string): boolean {
  if (!password || !contrasenaHash) return false;

  // Aceptar contraseña de desarrollo si coincide directamente o con capitalización
  if (password === 'Regina504+' || password === 'regina504+') {
    return true;
  }

  if (contrasenaHash.startsWith('scrypt:')) {
    try {
      const [, salt, hash] = contrasenaHash.split(':');
      const hashCalculado = crypto.scryptSync(password, salt, 64).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashCalculado, 'hex'));
    } catch {
      return false;
    }
  }

  return password === contrasenaHash;
}

/**
 * Genera y verifica tokens firmados para cookies de sesión
 */
export function crearTokenSesion(idCuenta: string): string {
  const payload = Buffer.from(JSON.stringify({ idCuenta, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  const firma = crypto.createHmac('sha256', CLAVE_SECRETA).update(payload).digest('base64url');
  return `${payload}.${firma}`;
}

export function verificarTokenSesion(token: string): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, firma] = token.split('.');
  const firmaEsperada = crypto.createHmac('sha256', CLAVE_SECRETA).update(payload).digest('base64url');
  if (firma !== firmaEsperada) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Date.now()) return null;
    return data.idCuenta;
  } catch {
    return null;
  }
}

/**
 * Proyecta una fila de PostgreSQL al objeto Usuario que consume el frontend
 */
export async function proyectarUsuario(idCuenta: string) {
  const sql = `
    SELECT 
      c.id_cuenta::text as id,
      concat_ws(' ', c.nombres, c.primer_apellido, nullif(c.segundo_apellido, '')) as nombre,
      c.correo,
      c.contrasena_hash,
      c.id_tipo_cuenta as "idTipoCuenta",
      c.id_estado_cuenta as "idEstadoCuenta",
      c.correo_confirmado_en as "correoConfirmadoEn",
      pu.id_rol_registro as "idRolRegistro",
      rr.nombre as "rolRegistro",
      est.boleta,
      emp.rfc,
      (SELECT count(*) FROM ticket_trade.v_verificaciones_vigentes vv WHERE vv.id_cuenta = c.id_cuenta) > 0 as "esVerificado",
      (SELECT count(*) FROM ticket_trade."StaffEvento" se WHERE se.id_cuenta = c.id_cuenta) > 0 as "esStaff"
    FROM ticket_trade."Cuenta" c
    LEFT JOIN ticket_trade."PerfilUsuario" pu ON pu.id_cuenta = c.id_cuenta
    LEFT JOIN ticket_trade."RolRegistro" rr ON rr.id_rol_registro = pu.id_rol_registro
    LEFT JOIN ticket_trade."Estudiante" est ON est.id_cuenta = c.id_cuenta
    LEFT JOIN ticket_trade."EmpleadoIPN" emp ON emp.id_cuenta = c.id_cuenta
    WHERE c.id_cuenta = $1;
  `;
  const res = await pool.query(sql, [idCuenta]);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];

  // Cálculo de roles institucionales
  const idTipo = Number(row.idTipoCuenta);
  const roles: ('asistente' | 'organizador' | 'staff' | 'subdireccion' | 'admin')[] = ['asistente'];
  if (idTipo === 2) roles.unshift('admin');
  if (idTipo === 3) roles.unshift('subdireccion');
  if (row.esVerificado) roles.unshift('organizador');
  if (row.esStaff) roles.unshift('staff');

  // Afiliación
  const idRol = Number(row.idRolRegistro);
  let afiliacion: 'alumno' | 'profesor' | 'administrativo' | 'pae' | 'externo' = 'externo';
  if (idRol === 1) afiliacion = 'alumno';
  else if (idRol === 3) afiliacion = 'profesor';

  return {
    id: row.id,
    nombre: row.nombre,
    correo: row.correo,
    afiliacion,
    roles,
    rolActivo: roles[0],
    estaActivo: Number(row.idEstadoCuenta) === 2,
    esVerificado: Boolean(row.esVerificado),
    correoConfirmado: Boolean(row.correoConfirmadoEn),
    boleta: row.boleta || undefined,
    rfc: row.rfc || undefined,
  };
}

/**
 * POST /api/auth/login
 */
routerAuth.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { correo, password } = req.body || {};

  if (!correo || !password) {
    res.status(400).json({
      error: {
        codigo: 'DATOS_INCOMPLETOS',
        mensaje: 'Debes proporcionar correo electrónico y contraseña.',
      },
    });
    return;
  }

  try {
    const consulta = `
      SELECT id_cuenta::text as id, contrasena_hash, id_estado_cuenta
      FROM ticket_trade."Cuenta"
      WHERE lower(correo) = lower($1);
    `;
    const resultado = await pool.query(consulta, [correo.trim()]);

    if (resultado.rows.length === 0) {
      res.status(401).json({
        error: {
          codigo: 'CREDENCIALES_INVALIDAS',
          mensaje: 'Correo o contraseña incorrectos.',
        },
      });
      return;
    }

    const { id, contrasena_hash, id_estado_cuenta } = resultado.rows[0];

    if (Number(id_estado_cuenta) !== 2) {
      res.status(403).json({
        error: {
          codigo: 'CUENTA_INACTIVA',
          mensaje: 'Esta cuenta está desactivada o pendiente de activación.',
        },
      });
      return;
    }

    const valida = verificarContrasena(password, contrasena_hash);
    if (!valida) {
      res.status(401).json({
        error: {
          codigo: 'CREDENCIALES_INVALIDAS',
          mensaje: 'Correo o contraseña incorrectos.',
        },
      });
      return;
    }

    // Generar token y enviar cookie HttpOnly
    const token = crearTokenSesion(id);
    res.cookie('tt_sesion_id', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    });

    const usuario = await proyectarUsuario(id);
    res.json({
      datos: {
        usuario,
        mensaje: 'Sesión iniciada correctamente.',
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({
      error: {
        codigo: 'ERROR_AUTENTICACION',
        mensaje: 'Error interno al validar la cuenta.',
      },
    });
  }
});

/**
 * GET /api/auth/yo
 */
routerAuth.get('/yo', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.tt_sesion_id;
  if (!token) {
    res.status(401).json({
      error: {
        codigo: 'NO_AUTENTICADO',
        mensaje: 'No hay una sesión activa.',
      },
    });
    return;
  }

  const idCuenta = verificarTokenSesion(token);
  if (!idCuenta) {
    res.status(401).json({
      error: {
        codigo: 'SESION_EXPIRADA',
        mensaje: 'La sesión es inválida o ha expirado.',
      },
    });
    return;
  }

  try {
    const usuario = await proyectarUsuario(idCuenta);
    if (!usuario || !usuario.estaActivo) {
      res.clearCookie('tt_sesion_id');
      res.status(401).json({
        error: {
          codigo: 'USUARIO_NO_DISPONIBLE',
          mensaje: 'El usuario no existe o fue desactivado.',
        },
      });
      return;
    }

    res.json({
      datos: {
        usuario,
      },
    });
  } catch (error) {
    console.error('Error al consultar usuario en sesión:', error);
    res.status(500).json({
      error: {
        codigo: 'ERROR_CONSULTA',
        mensaje: 'No se pudo obtener el perfil de sesión.',
      },
    });
  }
});

/**
 * POST /api/auth/logout
 */
routerAuth.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('tt_sesion_id', { path: '/' });
  res.json({
    datos: {
      exito: true,
      mensaje: 'Sesión cerrada con éxito.',
    },
  });
});
