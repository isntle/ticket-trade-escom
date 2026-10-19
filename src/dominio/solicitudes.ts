import type {
  ElementoFechaSolicitada,
  Recinto,
  SolicitudEvento,
  Usuario,
} from "../tipos";
import { validarPrograma } from './programa';

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
    return "Agrega al menos un día al evento.";
  const dias = new Set<string>();
  for (const [indice, fecha] of fechas.entries()) {
    const etiqueta = fecha.nombreDia || `Día ${indice + 1}`;
    if (opciones.borrador && !fecha.fecha) continue;
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
    if (dias.has(fecha.fecha))
      return `${etiqueta}: ya registraste esa fecha. Cada día debe tener un solo recinto y horario general.`;
    dias.add(fecha.fecha);
    const recinto = recintos.find((item) => item.id === fecha.idRecinto);
    if (!recinto || recinto.activo === false)
      return `${etiqueta}: selecciona un recinto activo.`;
    if (opciones.modalidad === "libre" && recinto.tipo === "laboratorio")
      return `${etiqueta}: los laboratorios requieren aforo controlado.`;
    if (
      opciones.aforo !== undefined &&
      (!Number.isInteger(opciones.aforo) ||
        opciones.aforo < 1 ||
        opciones.aforo > recinto.capacidad)
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
