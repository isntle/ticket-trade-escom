import { TipoAfiliacion, RolUsuario, PermisosPorRol } from '../tipos';
import { boletaIdentidadValida } from '../dominio/identidad';

/**
 * Validaciones institucionales ESCOM — IPN
 * Reglas de negocio para matrícula, correos institucionales y acreditación
 */

export interface ResultadoValidacion {
  esValido: boolean;
  mensaje?: string;
  sugerenciaAfiliacion?: TipoAfiliacion;
}

/**
 * Valida si un correo electrónico pertenece a la comunidad politécnica ESCOM / IPN
 */
export function validarCorreoInstitucional(correo: string): {
  esIPN: boolean;
  esAlumno: boolean;
  esPersonal: boolean;
  dominio: string;
} {
  const c = correo.trim().toLowerCase();
  const partes = c.split('@');
  const dominio = partes[1] || '';

  const esAlumno = dominio === 'alumno.ipn.mx';
  const esPersonal = dominio === 'ipn.mx';
  const esIPN = esAlumno || esPersonal;

  return {
    esIPN,
    esAlumno,
    esPersonal,
    dominio
  };
}

/**
 * Valida el formato oficial de la boleta de ESCOM / IPN
 * Formato: 10 dígitos numéricos (ej: 2022630412, donde los primeros 4 dígitos corresponden al año de ingreso)
 */
export function validarBoletaIPN(boleta: string): ResultadoValidacion {
  const b = boleta.trim();
  if (!b) {
    return { esValido: false, mensaje: 'La boleta institucional es obligatoria.' };
  }

  if (!boletaIdentidadValida(b)) {
    return {
      esValido: false,
      mensaje: 'La boleta debe tener diez dígitos o los prefijos PE o PP seguidos de ocho dígitos.'
    };
  }

  return { esValido: true };
}

/**
 * Valida el número de empleado docente o administrativo del IPN
 * Formato común: EMP-xxxxx, TEC-xxxxx, DIR-xxxxx o números de 5 a 8 dígitos
 */
export function validarNumeroEmpleadoIPN(numeroEmpleado: string): ResultadoValidacion {
  const n = numeroEmpleado.trim();
  if (!n) {
    return { esValido: false, mensaje: 'El número de empleado institucional es obligatorio.' };
  }

  if (n.length < 4 || n.length > 15) {
    return {
      esValido: false,
      mensaje: 'El número de empleado debe tener entre 4 y 15 caracteres (ej: EMP-98214 o 87342).'
    };
  }

  return { esValido: true };
}

/**
 * Valida la robustez de contraseña
 * Requisitos: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número
 */
export function validarContrasena(password: string): ResultadoValidacion {
  if (!password || password.length < 8) {
    return {
      esValido: false,
      mensaje: 'La contraseña debe contener al menos 8 caracteres.'
    };
  }

  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneMinuscula = /[a-z]/.test(password);
  const tieneNumero = /\d/.test(password);

  if (!tieneMayuscula || !tieneMinuscula || !tieneNumero) {
    return {
      esValido: false,
      mensaje: 'La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número.'
    };
  }

  return { esValido: true };
}

/**
 * Diccionario canónico de permisos por Rol en el sistema Ticket Trade
 */
export const MATRIZ_PERMISOS_ROLES: PermisosPorRol[] = [
  {
    rol: 'asistente',
    nombre: 'Alumno / Asistente General',
    descripcion: 'Miembro de la comunidad politécnica o visitante externo con acceso a cartelera y reservación de boletos.',
    permisos: [
      'Consultar cartelera pública e interna de eventos',
      'Reservar hasta 1 asiento por fecha con apartado temporal (10 min)',
      'Descargar boleto digital y credencial con código QR',
      'Cancelar reservaciones propias',
      'Inscribirse a lista de espera en eventos con cupo agotado'
    ]
  },
  {
    rol: 'organizador',
    nombre: 'Comité Organizador Acreditado',
    descripcion: 'Docentes o alumnos acreditados con capacidad de crear solicitudes de eventos y configurar recintos.',
    permisos: [
      'Crear y enviar solicitudes formales de eventos a Subdirección',
      'Diseñar y ajustar arreglos espaciales y versiones en recintos autorizados',
      'Asignar butacas VIP, Comité, Staff y bloqueos técnicos en sus eventos',
      'Gestionar accesos con clave privada para eventos exclusivos',
      'Descargar reportes oficiales de asistencia y lista de espera',
      'Designar personal de Staff de apoyo para sus eventos'
    ]
  },
  {
    rol: 'staff',
    nombre: 'Staff de Control de Acceso',
    descripcion: 'Personal operativo responsable de la validación de boletos y conteo de aforo en puerta física.',
    permisos: [
      'Escanear y validar códigos QR en tiempo real en recintos',
      'Procesar check-in de boletos con validación de un solo uso',
      'Consultar el semáforo de aforo y ocupación en vivo en el recinto asignado',
      'Gestionar entrada manual por boleta o nombre en caso de fallo de dispositivo'
    ]
  },
  {
    rol: 'subdireccion',
    nombre: 'Subdirección de Servicios Educativos e Integración Social',
    descripcion: 'Autoridad institucional que autoriza solicitudes, gestiona la agenda y bloquea recintos por mantenimiento.',
    permisos: [
      'Revisar, autorizar o rechazar solicitudes formales de eventos',
      'Bloquear recintos por mantenimiento o actividades académicas oficiales',
      'Revisar solicitudes de verificación documental y su vigencia semestral',
      'Asignar y retirar jefaturas de academia',
      'Pausar nuevos envíos de verificación con motivo y vigencia',
      'Resolver conflictos de agenda y empalmes con margen de 30 minutos',
      'Auditar ocupabilidad histórica y asistencia a nivel escuela'
    ]
  },
  {
    rol: 'admin',
    nombre: 'Administrador de Tecnologías de la Información',
    descripcion: 'Administrador del sistema responsable del catálogo de usuarios, asignación de roles y configuraciones base.',
    permisos: [
      'Consultar y revocar verificaciones documentales con motivo',
      'Gestión de cuentas y catálogo completo de usuarios',
      'Asignar y revocar roles (Asistente, Organizador, Staff, Subdirección, Admin)',
      'Asociar personal de Staff con eventos específicos',
      'Activar o suspender cuentas de usuario',
      'Restaurar contraseñas y base de datos inicial de demostración'
    ]
  }
];
