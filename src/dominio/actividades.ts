import type { ElementoFechaSolicitada, Evento, FechaEvento, ItinerarioDia, ModalidadAsistencia, Recinto } from '../tipos';

export const CATEGORIAS_EVENTO = ['Congreso', 'Conferencia', 'Taller', 'Hackatón', 'Otro'] as const;
export const mismoRecinto = (recintos: Recinto[], a: string, b: string) => a===b || Boolean(recintos.find(r=>r.id===a)?.codigo && recintos.find(r=>r.id===a)?.codigo===recintos.find(r=>r.id===b)?.codigo);
type Unidad = Pick<ElementoFechaSolicitada, 'modalidadAsistencia' | 'asistenciaEstimada' | 'nombreActividad' | 'nombreDia'>;
export const modalidadActividad = (unidad: Unidad, general: ModalidadAsistencia) => unidad.modalidadAsistencia ?? general;
export const accesoMixto = (evento: Evento) => new Set(evento.fechas.map(d=>modalidadActividad(d,evento.modalidadAsistencia))).size>1;
export const aforoActividad = (unidad: Unidad, general?: number) => unidad.asistenciaEstimada ?? general;
export const nombreActividad = (unidad: Unidad, indice = 0) => unidad.nombreActividad?.trim() || unidad.nombreDia || `Actividad ${indice + 1}`;
export const eventoParaActividad = (evento: Evento, unidad?: FechaEvento): Evento => unidad ? {
  ...evento, modalidadAsistencia: modalidadActividad(unidad, evento.modalidadAsistencia),
  aforoMaximo: aforoActividad(unidad, evento.aforoMaximo),
} : evento;

export function validarItinerarios(itinerarios: ItinerarioDia[] | undefined, actividades: {fecha:string}[]): string | undefined {
  const fechas = new Set<string>();
  for (const itinerario of itinerarios || []) {
    if (!actividades.some(actividad => actividad.fecha === itinerario.fecha)) return `El itinerario del ${itinerario.fecha} no tiene actividades. Retíralo o revisa la programación.`;
    if (fechas.has(itinerario.fecha)) return 'Adjunta un solo itinerario por fecha.';
    fechas.add(itinerario.fecha);
    if (!itinerario.nombreArchivo.trim() || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(itinerario.urlImagen) || itinerario.urlImagen.length > 1_500_000) return 'El itinerario debe ser una imagen JPEG o PNG preparada desde el formulario.';
  }
}
