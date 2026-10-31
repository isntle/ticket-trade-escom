export interface ActividadReserva {
  id: string;
  actividad: string;
  inicio: string;
  fin: string;
  estado?: 'confirmada' | 'pendiente' | 'cancelada';
}

export interface DetalleConflicto {
  actividad: string;
  inicio: string;
  fin: string;
}

/**
 * Valida si existe un traslape de horario con alguna reservación activa.
 * Ignora la misma reservación (mismo ID) y reservaciones canceladas.
 */
export function detectarCruceReservas(
  nuevaReserva: { id?: string; inicio: string; fin: string },
  reservasExistentes: ActividadReserva[]
): DetalleConflicto | null {
  const inicioNuevo = new Date(nuevaReserva.inicio).getTime();
  const finNuevo = new Date(nuevaReserva.fin).getTime();

  for (const reserva of reservasExistentes) {
    if (nuevaReserva.id && reserva.id === nuevaReserva.id) continue;
    if (reserva.estado === 'cancelada') continue;

    const inicioExistente = new Date(reserva.inicio).getTime();
    const finExistente = new Date(reserva.fin).getTime();

    if (inicioNuevo < finExistente && finNuevo > inicioExistente) {
      return {
        actividad: reserva.actividad,
        inicio: reserva.inicio,
        fin: reserva.fin,
      };
    }
  }

  return null;
}

/**
 * Genera el mensaje de error estandarizado según la plantilla ERR-MT-07.
 */
export function obtenerMensajeErrorCruce(conflicto: DetalleConflicto): string {
  return `No puedes confirmar esta reservación porque coincide con «${conflicto.actividad}», de ${conflicto.inicio} a ${conflicto.fin}`;
}