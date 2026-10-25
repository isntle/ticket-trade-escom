import type {
  ElementoFechaSolicitada,
  Recinto,
  SolicitudEvento,
  Usuario,
} from "../tipos";
import { validarPrograma } from './programa';
import { aforoActividad, modalidadActividad, nombreActividad, mismoRecinto } from './actividades';

export const ZONA_HORARIA = "America/Mexico_City";
export const HORAS_ANTICIPACION = 168;

export function fechaHoyMexico(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function inicioEnMexico(fecha: string, hora: string): number {
  // Ciudad de México usa UTC-6, sin cambios estacionales desde 2022.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
  )
    return NaN;
  const instante = new Date(`${fecha}T${hora}:00-06:00`);
  if (Number.isNaN(instante.getTime()) || fechaHoyMexico(instante) !== fecha)
    return NaN;
  return instante.getTime();
}

export function esFechaUrgente(
  fecha: ElementoFechaSolicitada,
  ahora = new Date(),
): boolean {
  const inicio = inicioEnMexico(fecha.fecha, fecha.horaInicio);
  return (
    inicio > ahora.getTime() &&
    inicio - ahora.getTime() < HORAS_ANTICIPACION * 3600000
  );
}

export function validarProgramacion(
  fechas: ElementoFechaSolicitada[],
  recintos: Recinto[],
  opciones: {
    ahora?: Date;
    borrador?: boolean;
    modalidad?: string;
    aforo?: number;
  } = {},
): string | undefined {
  const ahora = opciones.ahora || new Date();
  if (!fechas.length && !opciones.borrador)
    return "Agrega al menos una actividad al evento.";
  const identificadores = new Set<string>();
  for (const [indice, fecha] of fechas.entries()) {
    const etiqueta = nombreActividad(fecha, indice);
    if (identificadores.has(fecha.id)) return "Las actividades deben tener identificadores distintos.";
    identificadores.add(fecha.id);
    if (fecha.nombreActividad !== undefined && !fecha.nombreActividad.trim() && !opciones.borrador) return `${etiqueta}: escribe el nombre de la actividad.`;
    if (opciones.borrador && (!fecha.fecha || !fecha.idRecinto || !fecha.horaInicio || !fecha.horaFin)) {
      if (fecha.fecha && (!Number.isFinite(inicioEnMexico(fecha.fecha,'00:00')) || fecha.fecha < fechaHoyMexico(ahora))) return `${etiqueta}: revisa la fecha del borrador.`;
      if ([fecha.horaInicio,fecha.horaFin].some(h=>h&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(h))) return `${etiqueta}: revisa el formato de las horas.`;
      if(fecha.horaInicio&&fecha.horaFin&&fecha.horaFin<=fecha.horaInicio)return `${etiqueta}: la hora de término debe ser posterior a la de inicio.`;
      if(fecha.fecha&&fecha.horaInicio&&inicioEnMexico(fecha.fecha,fecha.horaInicio)<=ahora.getTime())return `${etiqueta}: la fecha y hora de inicio ya pasaron.`;
      continue;
    }
    const inicio = inicioEnMexico(fecha.fecha, fecha.horaInicio);
    const fin = inicioEnMexico(fecha.fecha, fecha.horaFin);
    if (!Number.isFinite(inicio) || !Number.isFinite(fin))
      return `${etiqueta}: completa una fecha y horarios válidos.`;
    if (inicio <= ahora.getTime())
      return `${etiqueta}: la fecha y hora de inicio ya pasaron. Selecciona un horario futuro.`;
    if (fin <= inicio)
      return `${etiqueta}: la hora de término debe ser posterior a la de inicio.`;
    const errorPrograma = validarPrograma({ ...fecha, nombreDia: etiqueta });
    if (errorPrograma) return errorPrograma;
    for (const otra of fechas.slice(0, indice)) {
      if (otra.fecha !== fecha.fecha || !mismoRecinto(recintos,otra.idRecinto,fecha.idRecinto)) continue;
      const otroInicio = inicioEnMexico(otra.fecha, otra.horaInicio);
      const otroFin = inicioEnMexico(otra.fecha, otra.horaFin);
      if (inicio < otroFin + 30 * 60000 && fin + 30 * 60000 > otroInicio)
        return `${etiqueta}: coincide con ${nombreActividad(otra)} en el mismo recinto. Conserva 30 minutos entre actividades.`;
    }
    const modalidad = modalidadActividad(fecha, (opciones.modalidad || 'controlado') as import('../tipos').ModalidadAsistencia);
    const aforo = aforoActividad(fecha, opciones.aforo);
    if (!['controlado', 'libre', 'registro'].includes(modalidad)) return `${etiqueta}: elige un tipo de acceso válido.`;
    const recinto = recintos.find((item) => item.id === fecha.idRecinto);
    if (!recinto || recinto.activo === false)
      return `${etiqueta}: selecciona un recinto activo.`;
    if (modalidad === "libre" && recinto.tipo === "laboratorio")
      return `${etiqueta}: los laboratorios requieren aforo controlado.`;
    if (
      aforo !== undefined &&
      (!Number.isInteger(aforo) ||
        aforo < 1 ||
        aforo > recinto.capacidad)
    )
      return `${etiqueta}: el aforo debe estar entre 1 y ${recinto.capacidad} personas (${recinto.nombre}).`;
  }
}

export function puedeConsultarSolicitud(
  usuario: Usuario | null | undefined,
  solicitud: SolicitudEvento,
): boolean {
  return Boolean(
    usuario &&
      (usuario.id === solicitud.idSolicitante ||
        usuario.roles.some((rol) => rol === "subdireccion" || rol === "admin")),
  );
}

export const versionSolicitud = (solicitud: SolicitudEvento): number =>
  solicitud.version || 1;

export function validarAnticipacionSolicitud(
  datos: Pick<
    SolicitudEvento,
    "fechasSolicitadas" | "esExcepcional" | "justificacionExcepcional"
  >,
  anterior?: SolicitudEvento,
  ahora = new Date(),
): string | undefined {
  if (datos.esExcepcional)
    return datos.justificacionExcepcional?.trim()
      ? undefined
      : "Explica el motivo de urgencia de la solicitud extraordinaria.";
  const fechasNuevas = datos.fechasSolicitadas.filter(
    (fecha) =>
      !anterior ||
      anterior.estado === "borrador" ||
      !anterior.fechasSolicitadas.some(
        (previa) => previa.id === fecha.id && previa.fecha === fecha.fecha,
      ),
  );
  if (fechasNuevas.some((fecha) => esFechaUrgente(fecha, ahora)))
    return "Las fechas nuevas de una solicitud ordinaria requieren al menos 168 horas de anticipación.";
}

const camposVersion = [
  "fechaVencimientoRevision",
  "tiempoRevisionRestanteMs",
  "categoria",
  "itinerarios",
  "tituloEvento",
  "descripcionEvento",
  "fechasSolicitadas",
  "modalidadAsistencia",
  "visibilidad",
  "asistenciaEstimada",
  "esExcepcional",
  "justificacionExcepcional",
  "correoContacto",
  "telefonoContacto",
  "nombreDocumento",
  "urlDocumento",
  "nombreBanner",
  "urlImagen",
  "estado",
  "observacionesCorreccion",
  "motivoRechazo",
] as const;

export function registrarCambioSolicitud(
  solicitud: SolicitudEvento,
  cambios: Partial<SolicitudEvento>,
  responsable: string,
  accion: string,
  motivo?: string,
  ahora = new Date(),
): SolicitudEvento {
  const nueva = { ...solicitud, ...cambios };
  const modificaciones = camposVersion
    .filter(
      (campo) =>
        JSON.stringify(solicitud[campo]) !== JSON.stringify(nueva[campo]),
    )
    .map((campo) => ({
      campo,
      anterior: structuredClone(solicitud[campo] ?? null),
      nuevo: structuredClone(nueva[campo] ?? null),
    }));
  if (!modificaciones.length) return solicitud;
  const version = versionSolicitud(solicitud) + 1;
  return {
    ...nueva,
    version,
    fechaUltimoCambio: ahora.toISOString(),
    historialVersiones: [
      ...(solicitud.historialVersiones || []),
      {
        version,
        fecha: ahora.toISOString(),
        responsable,
        accion,
        motivo,
        modificaciones,
      },
    ],
  };
}

export function solicitudesCoincidentes(
  solicitud: SolicitudEvento,
  todas: SolicitudEvento[],
): SolicitudEvento[] {
  return todas.filter(
    (otra) =>
      otra.id !== solicitud.id &&
      otra.estado === "en_revision" &&
      otra.fechasSolicitadas.some((b) =>
        solicitud.fechasSolicitadas.some(
          (a) =>
            a.idRecinto === b.idRecinto &&
            a.fecha === b.fecha &&
            a.horaInicio < b.horaFin &&
            a.horaFin > b.horaInicio,
        ),
      ),
  );
}
