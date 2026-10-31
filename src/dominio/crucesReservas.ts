import type { Evento, Reservacion } from '../tipos';
/** Comprueba las actividades operativas, no los elementos descriptivos del programa. */
export function reservaIncompatible(propuesta: Reservacion, reservas: Reservacion[], eventos: Evento[]): boolean {
  const evento = eventos.find(e => e.id === propuesta.idEvento);
  const actividad = evento?.fechas.find(a => a.id === propuesta.idFechaEvento);
  if (!actividad) return false;
  return reservas.some(reserva => {
    if (reserva.id === propuesta.id || reserva.idUsuario !== propuesta.idUsuario || reserva.estado !== 'confirmada') return false;
    const otroEvento = eventos.find(e => e.id === reserva.idEvento);
    const otra = otroEvento?.fechas.find(a => a.id === reserva.idFechaEvento);
    return !!otra && otroEvento?.estado !== 'cancelado' && !otra.cancelada && otra.fecha === actividad.fecha && actividad.horaInicio < otra.horaFin && actividad.horaFin > otra.horaInicio;
  });
}
