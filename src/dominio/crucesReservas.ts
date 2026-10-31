import type { Reservacion, Evento } from '../tipos';

export interface DetalleConflicto {
  actividad: string;
  inicio: string;
  fin: string;
}

/**
 * Retorna los detalles del conflicto si existe un cruce de horario
 * para el mismo usuario, omitiendo reservaciones o fechas canceladas.
 */
export function obtenerConflictoReserva(
  propuesta: Reservacion,
  reservasExistentes: Reservacion[],
  eventos: Evento[]
): DetalleConflicto | null {
  const eventoPropuesta = eventos.find((e) => e.id === propuesta.idEvento);
  const fechaPropuesta = eventoPropuesta?.fechas.find((f) => f.id === propuesta.idFechaEvento);

  if (!fechaPropuesta || fechaPropuesta.cancelada) return null;

  const { fecha: fechaDia, horaInicio: inicioPropuesta, horaFin: finPropuesta } = fechaPropuesta;

  for (const reserva of reservasExistentes) {
    if (reserva.id === propuesta.id) continue;
    if (reserva.idUsuario !== propuesta.idUsuario) continue;
    if (reserva.estado !== 'confirmada') continue;

    const eventoExistente = eventos.find((e) => e.id === reserva.idEvento);
    if (!eventoExistente || eventoExistente.estado === 'cancelado') continue;

    const fechaExistente = eventoExistente.fechas.find((f) => f.id === reserva.idFechaEvento);
    if (!fechaExistente || fechaExistente.cancelada) continue;

    if (fechaExistente.fecha === fechaDia) {
      if (inicioPropuesta < fechaExistente.horaFin && finPropuesta > fechaExistente.horaInicio) {
        return {
          actividad: eventoExistente.titulo || 'Evento',
          inicio: fechaExistente.horaInicio,
          fin: fechaExistente.horaFin,
        };
      }
    }
  }

  return null;
}

export function reservaIncompatible(
  propuesta: Reservacion,
  reservasExistentes: Reservacion[],
  eventos: Evento[]
): boolean {
  return obtenerConflictoReserva(propuesta, reservasExistentes, eventos) !== null;
}

/**
 * Genera la cadena de error formateada según la especificación ERR-MT-07.
 */
export function obtenerMensajeErrorCruce(conflicto: DetalleConflicto): string {
  return `No puedes confirmar esta reservación porque coincide con «${conflicto.actividad}», de ${conflicto.inicio} a ${conflicto.fin}`;
}
