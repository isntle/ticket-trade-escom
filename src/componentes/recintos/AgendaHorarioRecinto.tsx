import React, { useEffect, useState } from 'react';
import { useDatos } from '../../contextos/DatosContexto';
import { inicioEnMexico } from '../../dominio/solicitudes';
import { nombreActividad, mismoRecinto } from '../../dominio/actividades';
import type { ElementoFechaSolicitada } from '../../tipos';
import { useDisponibilidadRecintos } from '../../contextos/useDisponibilidadRecintos';
import { EstadoConsultaAgenda } from './EstadoConsultaAgenda';

const minutos = (hora:string) => Number(hora.slice(0,2))*60 + Number(hora.slice(3));
const hora = (valor:number) => `${String(Math.floor(valor/60)).padStart(2,'0')}:${String(valor%60).padStart(2,'0')}`;
export function AgendaHorarioRecinto({ actividad, otras, alElegir }: {
  actividad: ElementoFechaSolicitada; otras: ElementoFechaSolicitada[];
  alElegir: (inicio:string,fin:string) => void;
}) {
  const { obtenerOcupacionesRecinto, verificarDisponibilidadRecinto, listaRecintos } = useDatos();
  const consulta = useDisponibilidadRecintos(actividad.fecha);
  const [inicioPendiente, setInicioPendiente] = useState<number | null>(null);
  const [errorRango, setErrorRango] = useState('');
  useEffect(() => { setInicioPendiente(null); setErrorRango(''); }, [actividad.fecha, actividad.idRecinto]);
  const ocupaciones = [
    ...obtenerOcupacionesRecinto(actividad.idRecinto, actividad.fecha),
    ...otras.filter(a=>a.id!==actividad.id && a.fecha===actividad.fecha && mismoRecinto(listaRecintos,a.idRecinto,actividad.idRecinto))
      .map(a=>({horaInicio:a.horaInicio,horaFin:a.horaFin,titulo:nombreActividad(a),tipo:'evento' as const})),
  ];
  const propias = otras.filter(a=>a.id!==actividad.id && a.fecha===actividad.fecha && mismoRecinto(listaRecintos,a.idRecinto,actividad.idRecinto));
  const libreHasta = (inicio: number, fin: number) => consulta.estado === 'listo' &&
    !propias.some(a=>inicio<minutos(a.horaFin)+consulta.margen && fin>minutos(a.horaInicio)-consulta.margen) &&
    verificarDisponibilidadRecinto(actividad.idRecinto,actividad.fecha,hora(inicio),hora(fin)).disponible;
  return <section className="overflow-hidden rounded-xl border border-neutral-200" aria-label="Agenda horaria del recinto">
    <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 px-4 py-3 text-sm"><strong>{actividad.fecha}</strong><span className="text-neutral-600" aria-live="polite">{inicioPendiente === null ? 'Selecciona el bloque de inicio y luego el bloque final' : `Inicio: ${hora(inicioPendiente)}. Ahora selecciona el último bloque`}</span></div>
    {errorRango && <p role="alert" className="bg-rose-50 px-4 py-2 text-sm text-rose-900">{errorRango}</p>}
    <EstadoConsultaAgenda {...consulta}/>
    <div className="max-h-80 overflow-y-auto overscroll-contain">
      {Array.from({length:28},(_,i)=>420+i*30).map(inicio=>{
        const h=hora(inicio), fin=hora(inicio+30);
        const coincidencias=ocupaciones.filter(o=>minutos(o.horaInicio)<inicio+30 && minutos(o.horaFin)>inicio);
        const ocupacion=coincidencias.find(o=>o.tipo!=='clase');
        const clase=coincidencias.find(o=>o.tipo==='clase');
        const pasado=inicioEnMexico(actividad.fecha,h)<=Date.now();
        const libre=!pasado&&libreHasta(inicio,inicio+30);
        const seleccionado=h>=actividad.horaInicio && h<actividad.horaFin;
        const elegir = () => {
          setErrorRango('');
          if (inicioPendiente === null || inicio < inicioPendiente) {
            setInicioPendiente(inicio);
            alElegir(h, fin);
            return;
          }
          if (!libreHasta(inicioPendiente, inicio + 30)) {
            setErrorRango('El intervalo incluye un horario ocupado o su margen de separación. Elige otro bloque final o un nuevo inicio anterior.');
            return;
          }
          alElegir(hora(inicioPendiente), fin);
          setInicioPendiente(null);
        };
        return <div key={h} className="grid grid-cols-[4.5rem_1fr] border-t border-neutral-100 text-sm"><span className="bg-neutral-50 px-3 py-2.5 font-medium text-neutral-500">{h}</span><button type="button" disabled={!libre} onClick={elegir} aria-label={`${h}–${fin}, ${consulta.estado!=='listo'?'disponibilidad pendiente':libre?'elegir bloque':ocupacion?'ocupado':pasado?'horario pasado':'margen entre actividades'}${clase?', actividad interna informativa':''}`} aria-pressed={seleccionado} className={`min-h-10 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#7a132b] ${!libre?'bg-neutral-100 text-neutral-500':seleccionado?'bg-[#7a132b]/10 font-semibold text-[#7a132b]':'bg-white text-neutral-600 hover:bg-emerald-50 hover:text-emerald-900'}`}>{consulta.estado!=='listo'?'Disponibilidad por confirmar':ocupacion?`${ocupacion.horaInicio}–${ocupacion.horaFin} · ${ocupacion.titulo}`:pasado?'Horario pasado':!libre?'Margen de separación':seleccionado?'Tu horario propuesto':'Disponible'}{clase&&<span className="mt-1 block text-xs font-normal text-neutral-600">{clase.horaInicio}–{clase.horaFin} · Actividad interna (informativa)</span>}</button></div>;
      })}
    </div>
    <p className="border-t border-neutral-100 px-4 py-3 text-xs text-neutral-500">Cada bloque dura 30 minutos; el segundo clic incluye el bloque elegido. Las actividades internas son informativas y no impiden la selección. Se consideran ocupaciones, bloqueos y el margen de {consulta.margen} minutos. La selección no aparta el recinto.</p>
  </section>;
}
