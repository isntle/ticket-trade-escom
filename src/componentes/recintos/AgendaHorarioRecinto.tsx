import React from 'react';
import { useDatos } from '../../contextos/DatosContexto';
import { inicioEnMexico } from '../../dominio/solicitudes';
import { nombreActividad, mismoRecinto } from '../../dominio/actividades';
import type { ElementoFechaSolicitada } from '../../tipos';

const minutos = (hora:string) => Number(hora.slice(0,2))*60 + Number(hora.slice(3));
const hora = (valor:number) => `${String(Math.floor(valor/60)).padStart(2,'0')}:${String(valor%60).padStart(2,'0')}`;
export function AgendaHorarioRecinto({ actividad, otras, alElegir }: {
  actividad: ElementoFechaSolicitada; otras: ElementoFechaSolicitada[];
  alElegir: (inicio:string,fin:string) => void;
}) {
  const { obtenerOcupacionesRecinto, verificarDisponibilidadRecinto, listaRecintos } = useDatos();
  const ocupaciones = [
    ...obtenerOcupacionesRecinto(actividad.idRecinto, actividad.fecha),
    ...otras.filter(a=>a.id!==actividad.id && a.fecha===actividad.fecha && mismoRecinto(listaRecintos,a.idRecinto,actividad.idRecinto))
      .map(a=>({horaInicio:a.horaInicio,horaFin:a.horaFin,titulo:nombreActividad(a)})),
  ];
  return <section className="overflow-hidden rounded-xl border border-neutral-200" aria-label="Agenda horaria del recinto">
    <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 px-4 py-3 text-sm"><strong>{actividad.fecha}</strong><span className="text-neutral-600">Elige un bloque libre y ajusta las horas debajo</span></div>
    <div className="max-h-80 overflow-y-auto overscroll-contain">
      {Array.from({length:30},(_,i)=>420+i*30).map(inicio=>{
        const h=hora(inicio), fin=hora(inicio+30);
        const ocupacion=ocupaciones.find(o=>minutos(o.horaInicio)<inicio+30 && minutos(o.horaFin)>inicio);
        const conflictoPropio=otras.some(a=>a.id!==actividad.id&&mismoRecinto(listaRecintos,a.idRecinto,actividad.idRecinto)&&a.fecha===actividad.fecha&&inicio<minutos(a.horaFin)+30&&inicio+30>minutos(a.horaInicio)-30);
        const pasado=inicioEnMexico(actividad.fecha,h)<=Date.now();
        const libre=!pasado&&!conflictoPropio&&verificarDisponibilidadRecinto(actividad.idRecinto,actividad.fecha,h,fin).disponible;
        const seleccionado=h>=actividad.horaInicio && h<actividad.horaFin;
        return <div key={h} className="grid grid-cols-[4.5rem_1fr] border-t border-neutral-100 text-sm"><span className="bg-neutral-50 px-3 py-2.5 font-medium text-neutral-500">{h}</span><button type="button" disabled={!libre} onClick={()=>alElegir(h,hora(Math.min(inicio+60,1320)))} aria-label={`${h}, ${libre?'elegir horario':ocupacion?'ocupado':pasado?'horario pasado':'margen entre actividades'}`} className={`min-h-10 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#7a132b] ${!libre?'bg-neutral-100 text-neutral-500':seleccionado?'bg-[#7a132b]/10 font-semibold text-[#7a132b]':'bg-white text-neutral-600 hover:bg-emerald-50 hover:text-emerald-900'}`}>{ocupacion?`${ocupacion.horaInicio}–${ocupacion.horaFin} · ${ocupacion.titulo}`:pasado?'Horario pasado':!libre?'Margen de separación':seleccionado?'Tu horario propuesto':'Disponible'}</button></div>;
      })}
    </div>
    <p className="border-t border-neutral-100 px-4 py-3 text-xs text-neutral-500">La consulta incluye ocupaciones y bloqueos registrados, otras actividades de esta solicitud y el margen de 30 minutos. La selección no aparta el recinto.</p>
  </section>;
}
