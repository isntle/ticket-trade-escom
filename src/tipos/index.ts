/**
 * ===================================================================
 * DEFINICIONES DE TIPOS DE DATOS — TICKET TRADE ESCOM IPN
 * ===================================================================
 * Materia: Análisis y Diseño de Sistemas
 * Modelos de datos del dominio institucional en español.
 * Arquitectura unificada bajo el concepto de "Lugar" (asientos fijos,
 * posiciones modulares y estaciones de cómputo en laboratorios).
 */

// Roles de usuario en el sistema
export type RolUsuario = 'asistente' | 'organizador' | 'staff' | 'subdireccion' | 'admin';

// Tipos de afiliación institucional
export type TipoAfiliacion = 'alumno' | 'profesor' | 'administrativo' | 'pae' | 'externo';

// Modelo de Usuario Institucional
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  password?: string;
  afiliacion: TipoAfiliacion;
  roles: RolUsuario[];
  rolActivo: RolUsuario;
  boleta?: string;
  numeroEmpleado?: string;
  nombreOrganizacion?: string;
  puestoContacto?: string;
  telefonoContacto?: string;
  nombreDocumento?: string;
  urlDocumento?: string;
  estaActivo: boolean;
  urlFoto?: string;
}

// Estados del flujo de solicitudes
export type EstadoSolicitud = 'borrador' | 'en_revision' | 'autorizada' | 'rechazada' | 'cancelada';

// Dimensiones de visibilidad y modalidad
export type VisibilidadEvento = 'publico' | 'interno' | 'privado';
export type ModalidadAsistencia = 'libre' | 'registro' | 'controlado';

// Elemento de fecha solicitada
export interface ElementoFechaSolicitada {
  id: string;
  fecha: string; // AAAA-MM-DD
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  idRecinto: string;
  fueraDeAnticipacion?: boolean;
}

// Solicitud formal de evento
export interface SolicitudEvento {
  id: string;
  idSolicitante: string;
  nombreSolicitante: string;
  correoSolicitante: string;
  afiliacionSolicitante: TipoAfiliacion;
  identificadorSolicitante?: string; // Boleta o número de empleado o RFC
  nombreDocumento?: string;
  tituloEvento: string;
  descripcionEvento: string;
  fechasSolicitadas: ElementoFechaSolicitada[];
  modalidadAsistencia: ModalidadAsistencia;
  visibilidad: VisibilidadEvento;
  asistenciaEstimada: number;
  estado: EstadoSolicitud;
  esExcepcional: boolean;
  justificacionExcepcional?: string;
  motivoRechazo?: string;
  revisadoPor?: string;
  fechaRevision?: string;
  fechaCreacion: string;
}

// Estados del ciclo de vida de un evento
export type EstadoEvento = 'borrador' | 'configuracion' | 'publicado' | 'en_curso' | 'finalizado' | 'cancelado';

// Fecha individual de un evento (No son sinónimos)
export interface FechaEvento {
  id: string;
  idEvento: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  idRecinto: string;
  idArregloFinal?: string;
  esFinalConfirmado: boolean;
  ponentes: string[];
}

// Categorías temáticas de eventos ESCOM
export type CategoriaEvento = 'Conferencia' | 'Congreso' | 'Taller' | 'Académico' | 'Cultural' | 'Institucional';

// Entidad Principal de Evento
export interface Evento {
  id: string;
  idSolicitud?: string;
  idOrganizador: string;
  nombreOrganizador: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaEvento;
  visibilidad: VisibilidadEvento;
  modalidadAsistencia: ModalidadAsistencia;
  estado: EstadoEvento;
  claveAccesoPrivada?: string;
  fechas: FechaEvento[];
  urlImagen?: string;
  ponentes: string[];
  etiquetas: string[];
  aforoMaximo?: number;
  fechaPublicacion?: string;
}

// Tipos de recintos físicos en ESCOM
export type TipoRecinto = 'auditorio' | 'sala' | 'laboratorio';

// Recinto Físico
export interface Recinto {
  id: string;
  nombre: string;
  codigo: string;
  tipo: TipoRecinto;
  capacidad: number;
  ubicacion: string;
  indicaciones: string;
  equipamiento: string[];
  descripcion: string;
  permiteEliminarAsientos: boolean; // Sala 14: true (modular), Auditorio/Lab: false
}

// Categorías funcionales de lugares en un arreglo
export type CategoriaAsiento = 'asistente' | 'vip' | 'organizador' | 'staff' | 'sin_definir';
export type CategoriaLugar = CategoriaAsiento;

// Configuración de un Lugar individual (Asiento, Módulo o Estación de Trabajo)
export interface ConfiguracionAsiento {
  id: string;
  fila: string;
  numero: number;
  etiqueta: string;
  categoria: CategoriaAsiento;
  estaBloqueado: boolean;
  estaEliminado?: boolean; // Espacios modulares en Sala 14
  seccion?: 'izq' | 'centro' | 'der' | 'norte' | 'sur' | string; // Bloque en auditorio o zona en laboratorio
  equipoComputo?: string; // En laboratorios: Identificador visual de estación (ej: PC-01, PC-12)
  posicionX?: number;
  posicionY?: number;
}
export type Lugar = ConfiguracionAsiento;

// Estados del arreglo de lugares
export type EstadoArreglo = 'borrador' | 'bloqueado' | 'version_final';

// Arreglo físico de lugares por fecha
export interface ArregloAsientos {
  id: string;
  idFechaEvento: string;
  idRecinto: string;
  nombre: string; // ej: "Arreglo Oficial A"
  etiquetaVersion: string;
  estado: EstadoArreglo;
  asientos: ConfiguracionAsiento[];
  totalAsientos: number;
  asientosAsistente: number;
  asientosVip: number;
  asientosOrganizador: number;
  asientosStaff: number;
  asientosBloqueados: number;
  asientosSinAsignar: number;
  notas?: string;
  fechaCreacion: string;
  fechaConfirmacionFinal?: string;
}
export type ArregloLugares = ArregloAsientos;

// Horario regular de clases docentes en laboratorios de cómputo
export interface HorarioClaseRegular {
  id: string;
  idRecinto: string;
  diaSemana: number; // 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
  materia: string;
  grupo: string;
  profesor: string;
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
}

// Bloqueo operativo o de mantenimiento por Subdirección
export interface BloqueoRecinto {
  id: string;
  idRecinto: string; // ID específico o 'todos'
  idsRecintos?: string[]; // Permite seleccionar varios recintos simultáneos
  titulo: string;
  motivo: string;
  observaciones?: string;
  fechaInicio: string;
  horaInicio: string;
  fechaFin?: string;
  horaFin?: string;
  esIndefinido: boolean;
  creadoPor: string;
  fechaCreacion: string;
}

// Estados de la reservación de boleto
export type EstadoReservacion = 'apartado_temporal' | 'confirmada' | 'cancelada';

// Reservación de lugar
export interface Reservacion {
  id: string;
  idEvento: string;
  idFechaEvento: string;
  idUsuario: string;
  nombreUsuario: string;
  correoUsuario: string;
  idAsiento?: string;
  etiquetaAsiento?: string;
  estado: EstadoReservacion;
  tiempoExpiracionApartado?: number; // epoch ms (temporizador de 10 min)
  fechaCreacion: string;
  fechaConfirmacion?: string;
  idBoleto?: string;
}

// Estados del boleto emitido
export type EstadoBoleto = 'valido' | 'utilizado' | 'cancelado';

// Boleto Digital con Código QR
export interface BoletoDigital {
  id: string;
  idReservacion: string;
  idEvento: string;
  idFechaEvento: string;
  idUsuario: string;
  nombreUsuario: string;
  correoUsuario: string;
  tituloEvento: string;
  fechaEvento: string;
  horaEvento: string;
  nombreRecinto: string;
  etiquetaAsiento?: string;
  codigoQr: string;
  estado: EstadoBoleto;
  fechaCheckIn?: string;
  revisadoPor?: string;
  fechaEmision: string;
}

// Registro en lista de espera
export interface EntradaListaEspera {
  id: string;
  idEvento: string;
  idFechaEvento: string;
  idUsuario: string;
  nombreUsuario: string;
  correoUsuario: string;
  posicionFila: number;
  fechaCreacion: string;
  estado: 'esperando' | 'notificado' | 'convertido' | 'cancelado';
}

// Resultado del escaneo de acceso
export type ResultadoEscaneo =
  | 'exito'
  | 'ya_utilizado'
  | 'evento_invalido'
  | 'fecha_invalida'
  | 'cancelado'
  | 'inexistente';

// Bitácora de escaneos de check-in en puerta
export interface RegistroEscaneo {
  id: string;
  idBoleto: string;
  idEvento: string;
  idFechaEvento: string;
  fechaEscaneo: string;
  escaneadoPor: string;
  resultado: ResultadoEscaneo;
  nombreAsistente?: string;
  etiquetaAsiento?: string;
  notas?: string;
}

// Resultado de verificación de disponibilidad de recinto
export interface ResultadoDisponibilidadRecinto {
  disponible: boolean;
  codigoMensaje?: string;
  motivo?: string;
  tipoConflicto?: 'evento' | 'clase' | 'bloqueo' | 'actividad_institucional' | 'margen_despeje';
  tituloConflicto?: string;
  detallesConflicto?: {
    horarioConflicto?: string;
    nombreActividad?: string;
    materia?: string;
    grupo?: string;
    profesor?: string;
    accionesSugeridas?: {
      otroHorario?: boolean;
      verDisponibilidadDia?: boolean;
      otroRecinto?: boolean;
    };
  };
}

// Registro consolidado para la Agenda Multi-Recinto de Subdirección
export interface OcupacionAgenda {
  id: string;
  idRecinto: string;
  nombreRecinto: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipo: 'evento' | 'clase' | 'actividad_institucional' | 'bloqueo';
  titulo: string;
  descripcion?: string;
  responsable?: string;
  grupo?: string;
}

// Lista de verificación para publicación de evento
export interface ListaVerificacionPublicacion {
  solicitudAutorizada: boolean;
  informacionGeneralCompleta: boolean;
  tieneFechas: boolean;
  todasLasFechasTienenRecinto: boolean;
  todasLasFechasTienenVersionFinal: boolean;
  puedePublicar: boolean;
  elementosPendientes: string[];
}
