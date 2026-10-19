import type { Evento, FechaEvento, Usuario } from '../tipos';
import { inicioEnMexico } from './solicitudes';
export function duracionProgramada(fechas:FechaEvento[]):number {
  return fechas.reduce((total,d)=>total+(inicioEnMexico(d.fecha,d.horaFin)-inicioEnMexico(d.fecha,d.horaInicio))/60000,0);
}
export function validarLimitesEvento(evento:Evento,fechas:FechaEvento[],original:Evento=evento):string|undefined {
  const limites=evento.limitesAprobados||{numeroFechas:original.fechas.length,duracionMinutos:duracionProgramada(original.fechas)};
  if(!fechas.length)return 'El evento debe conservar al menos un día. Para retirar el último, cancela el evento.';
  if(fechas.length>limites.numeroFechas||duracionProgramada(fechas)>limites.duracionMinutos)return 'El cambio supera el número de días o la duración originalmente aprobados. Debes presentar una solicitud nueva.';
  if(fechas.some(d=>!Number.isFinite(inicioEnMexico(d.fecha,d.horaInicio))||inicioEnMexico(d.fecha,d.horaFin)<=inicioEnMexico(d.fecha,d.horaInicio)))return 'La programación contiene una fecha u horario inválido.';
}
export function puedeModificarEvento(usuario:Usuario|null,evento:Evento):boolean {
  return !!usuario?.estaActivo&&(usuario.roles.includes('subdireccion')||usuario.id===evento.idOrganizador);
}
