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

/** Conserva los intervalos del programa al mover el inicio de una actividad. */
export function trasladarPrograma(fecha:FechaEvento,horaInicio:string):FechaEvento['programa'] {
  const minutos=(hora:string)=>Number(hora.slice(0,2))*60+Number(hora.slice(3));
  const diferencia=minutos(horaInicio)-minutos(fecha.horaInicio);
  const trasladar=(hora:string)=>{
    const total=minutos(hora)+diferencia;
    if(!Number.isInteger(total)||total<0||total>=1440)throw new Error('El programa ajustado quedaría fuera del día. Revisa sus horarios antes de reprogramar.');
    return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
  };
  return fecha.programa?.map(actividad=>({...actividad,hora:trasladar(actividad.hora),...(actividad.horaFin?{horaFin:trasladar(actividad.horaFin)}:{})}));
}
