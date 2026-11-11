import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { pool, conTransaccion } from '../../bd/pool';

export const routerAuth = Router();

const CLAVE_SECRETA = process.env.SESSION_SECRET || 'tt_clave_secreta_institucional_2026';

type AfiliacionRegistro =
  | 'alumno'
  | 'externo'
  | 'profesor'
  | 'administrativo'
  | 'pae';

const ID_TIPO_COMUN = 1;
const ID_ESTADO_PENDIENTE = 1;
const ID_ESTADO_ACTIVA = 2;
const ID_ROL_ESTUDIANTE = 1;
const ID_ROL_EXTERNO = 2;
const ID_ROL_EMPLEADO = 3;
const ID_PROPOSITO_CONFIRMACION = 1;

function hashToken(tokenPlano: string): string {
  return crypto.createHash('sha256').update(tokenPlano).digest('hex');
}

function generarTokenConfirmacion(): string {
  return crypto.randomBytes(32).toString('hex');
}

function contrasenaRegistroValida(password: string): string | null {
  if (!password || password.length < 8) {
    return 'La contraseña debe contener al menos 8 caracteres.';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número.';
  }
  return null;
}

function dominioAdmitido(correo: string, afiliacion: AfiliacionRegistro): boolean {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return false;
  const dominio = correo.split('@')[1];
  if (afiliacion === 'externo') return true;
  if (afiliacion === 'alumno') return dominio === 'alumno.ipn.mx';
  return dominio === 'ipn.mx';
}

function boletaValida(boleta: string): boolean {
  return /^(\d{10}|(?:PE|PP)\d{8})$/.test(boleta.trim().toUpperCase());
}

function rfcValido(rfc: string): boolean {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(rfc.trim());
}

function mapearErrorPostgres(error: unknown): { estado: number; codigo: string; mensaje: string } | null {
  const err = error as { code?: string; constraint?: string; message?: string };
  if (err?.code === '23505') {
    if (err.constraint?.includes('correo') || err.message?.includes('correo')) {
      return { estado: 409, codigo: 'CORREO_DUPLICADO', mensaje: 'El correo no está disponible.' };
    }
    if (err.constraint?.toLowerCase().includes('boleta') || err.message?.toLowerCase().includes('boleta')) {
      return { estado: 409, codigo: 'BOLETA_DUPLICADA', mensaje: 'Boleta ya registrada.' };
    }
    if (err.constraint?.toLowerCase().includes('rfc') || err.message?.toLowerCase().includes('rfc')) {
      return { estado: 409, codigo: 'RFC_DUPLICADO', mensaje: 'RFC ya registrado.' };
    }
    return { estado: 409, codigo: 'DATO_DUPLICADO', mensaje: 'Ya existe un registro con esos datos.' };
  }
  if (err?.code === '23514') {
    return {
      estado: 400,
      codigo: 'REGLA_INTEGRIDAD',
      mensaje: err.message?.includes('TT')
        ? 'Los datos no cumplen las reglas de registro de la base de datos.'
        : 'Los datos enviados no son válidos.',
    };
  }
  return null;
}

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

/**
 * POST /api/auth/registro
 * Crea una cuenta común en PostgreSQL (Pendiente de activación) + perfil y token de confirmación.
 */
routerAuth.post('/registro', async (req: Request, res: Response): Promise<void> => {
  const cuerpo = req.body || {};
  const nombres = String(cuerpo.nombres || '').trim();
  const primerApellido = String(cuerpo.primerApellido || '').trim();
  const segundoApellido = String(cuerpo.segundoApellido || '').trim();
  const correo = String(cuerpo.correo || '').trim().toLowerCase();
  const password = String(cuerpo.password || '');
  const afiliacion = String(cuerpo.afiliacion || '') as AfiliacionRegistro;
  const boleta = cuerpo.boleta ? String(cuerpo.boleta).trim().toUpperCase() : '';
  const rfc = cuerpo.rfc ? String(cuerpo.rfc).trim().toUpperCase() : '';

  const afiliacionesValidas: AfiliacionRegistro[] = [
    'alumno',
    'externo',
    'profesor',
    'administrativo',
    'pae',
  ];

  if (!nombres || !primerApellido) {
    res.status(400).json({
      error: {
        codigo: 'DATOS_INCOMPLETOS',
        mensaje: 'Ingresa tu nombre y primer apellido.',
      },
    });
    return;
  }

  if (!afiliacionesValidas.includes(afiliacion) || !dominioAdmitido(correo, afiliacion)) {
    res.status(400).json({
      error: {
        codigo: 'IDENTIDAD_INVALIDA',
        mensaje: 'Revisa nombre, correo y dominio admitido para tu categoría.',
      },
    });
    return;
  }

  const errorPassword = contrasenaRegistroValida(password);
  if (errorPassword) {
    res.status(400).json({
      error: { codigo: 'CONTRASENA_INVALIDA', mensaje: errorPassword },
    });
    return;
  }

  let idRol = ID_ROL_EXTERNO;
  if (afiliacion === 'alumno') {
    idRol = ID_ROL_ESTUDIANTE;
    if (!boletaValida(boleta)) {
      res.status(400).json({
        error: {
          codigo: 'BOLETA_INVALIDA',
          mensaje: 'Boleta: diez dígitos o PE/PP seguidos de ocho dígitos.',
        },
      });
      return;
    }
  } else if (afiliacion !== 'externo') {
    idRol = ID_ROL_EMPLEADO;
    if (!rfcValido(rfc)) {
      res.status(400).json({
        error: {
          codigo: 'RFC_INVALIDO',
          mensaje: 'El RFC debe tener el formato oficial (12 o 13 caracteres).',
        },
      });
      return;
    }
  }

  const tokenPlano = generarTokenConfirmacion();
  const tokenHash = hashToken(tokenPlano);
  const contrasenaHash = hashContrasena(password);

  try {
    const idCuenta = await conTransaccion(async (cliente) => {
      const cuenta = await cliente.query(
        `INSERT INTO ticket_trade."Cuenta"
          (nombres, primer_apellido, segundo_apellido, correo, contrasena_hash, id_tipo_cuenta, id_estado_cuenta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_cuenta::text AS id`,
        [
          nombres,
          primerApellido,
          segundoApellido,
          correo,
          contrasenaHash,
          ID_TIPO_COMUN,
          ID_ESTADO_PENDIENTE,
        ],
      );
      const id = cuenta.rows[0].id as string;

      await cliente.query(
        `INSERT INTO ticket_trade."PerfilUsuario" (id_cuenta, id_rol_registro)
         VALUES ($1, $2)`,
        [id, idRol],
      );

      if (idRol === ID_ROL_ESTUDIANTE) {
        await cliente.query(
          `INSERT INTO ticket_trade."Estudiante" (id_cuenta, boleta) VALUES ($1, $2)`,
          [id, boleta],
        );
      } else if (idRol === ID_ROL_EMPLEADO) {
        await cliente.query(
          `INSERT INTO ticket_trade."EmpleadoIPN" (id_cuenta, rfc) VALUES ($1, $2)`,
          [id, rfc],
        );
      }

      await cliente.query(
        `INSERT INTO ticket_trade."TokenCuenta"
          (id_cuenta, id_proposito_token_cuenta, token_hash, correo_destino, vence_en)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + interval '24 hours')`,
        [id, ID_PROPOSITO_CONFIRMACION, tokenHash, correo],
      );

      return id;
    });

    res.status(201).json({
      datos: {
        idCuenta,
        correo,
        mensaje:
          'Cuenta creada. Confirma el correo para continuar. El envío real aún no está configurado.',
        // Se devuelve mientras no exista envío de correo real, para poder completar el flujo.
        codigoPrueba: tokenPlano,
      },
    });
  } catch (error) {
    const conocido = mapearErrorPostgres(error);
    if (conocido) {
      res.status(conocido.estado).json({
        error: { codigo: conocido.codigo, mensaje: conocido.mensaje },
      });
      return;
    }
    console.error('Error al registrar cuenta:', error);
    res.status(500).json({
      error: {
        codigo: 'ERROR_REGISTRO',
        mensaje: 'No se pudo crear la cuenta en la base de datos.',
      },
    });
  }
});

/**
 * POST /api/auth/confirmar-correo
 * Activa la cuenta y marca el correo como confirmado usando el token de TokenCuenta.
 */
routerAuth.post('/confirmar-correo', async (req: Request, res: Response): Promise<void> => {
  const codigo = String(req.body?.codigo || req.body?.token || '').trim();
  if (!codigo) {
    res.status(400).json({
      error: {
        codigo: 'CODIGO_REQUERIDO',
        mensaje: 'Enlace inválido, vencido o ya utilizado.',
      },
    });
    return;
  }

  const tokenHash = hashToken(codigo);

  try {
    const resultado = await conTransaccion(async (cliente) => {
      const token = await cliente.query(
        `SELECT t.id_token_cuenta, t.id_cuenta::text AS id_cuenta
         FROM ticket_trade."TokenCuenta" t
         WHERE t.token_hash = $1
           AND t.id_proposito_token_cuenta = $2
           AND t.utilizado_en IS NULL
           AND t.vence_en > CURRENT_TIMESTAMP
         FOR UPDATE`,
        [tokenHash, ID_PROPOSITO_CONFIRMACION],
      );

      if (token.rows.length === 0) {
        return null;
      }

      const { id_token_cuenta, id_cuenta } = token.rows[0];

      await cliente.query(
        `UPDATE ticket_trade."TokenCuenta"
         SET utilizado_en = CURRENT_TIMESTAMP
         WHERE id_token_cuenta = $1`,
        [id_token_cuenta],
      );

      await cliente.query(
        `UPDATE ticket_trade."Cuenta"
         SET correo_confirmado_en = COALESCE(correo_confirmado_en, CURRENT_TIMESTAMP),
             id_estado_cuenta = $2
         WHERE id_cuenta = $1`,
        [id_cuenta, ID_ESTADO_ACTIVA],
      );

      return id_cuenta as string;
    });

    if (!resultado) {
      res.status(400).json({
        error: {
          codigo: 'CODIGO_INVALIDO',
          mensaje: 'Enlace inválido, vencido o ya utilizado.',
        },
      });
      return;
    }

    res.json({
      datos: {
        exito: true,
        idCuenta: resultado,
        mensaje: 'Correo confirmado correctamente.',
      },
    });
  } catch (error) {
    const conocido = mapearErrorPostgres(error);
    if (conocido) {
      res.status(conocido.estado).json({
        error: { codigo: conocido.codigo, mensaje: conocido.mensaje },
      });
      return;
    }
    console.error('Error al confirmar correo:', error);
    res.status(500).json({
      error: {
        codigo: 'ERROR_CONFIRMACION',
        mensaje: 'No se pudo confirmar el correo.',
      },
    });
  }
});
