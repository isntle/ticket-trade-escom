import React, { useState } from 'react';
import { FileImage, Trash2 } from 'lucide-react';
import type { ItinerarioDia } from '../../tipos';
import { EditorCartel } from './EditorCartel';

export function reasociarItinerario(itinerarios: ItinerarioDia[], fechas: string[], origen: string, destino: string): ItinerarioDia[] {
  if (fechas.includes(origen) || !fechas.includes(destino) || itinerarios.some(i=>i.fecha===destino) || !itinerarios.some(i=>i.fecha===origen)) return itinerarios;
  return itinerarios.map(i=>i.fecha===origen?{...i,fecha:destino}:i);
}

export function EditorItinerarios({ fechas, itinerarios, alCambiar, alCambiarEstado }: {
  fechas: string[]; itinerarios: ItinerarioDia[];
  alCambiar: (itinerarios: ItinerarioDia[]) => void;
  alCambiarEstado: (fecha: string, estado: {cargando:boolean; error:string}) => void;
}) {
  const [destinos, setDestinos] = useState<Record<string,string>>({});
  const dias = [...new Set([...fechas.filter(Boolean), ...itinerarios.map(i => i.fecha)])].sort();
  return <section className="space-y-4 rounded-2xl bg-neutral-50 p-4 sm:p-6">
    <div className="flex items-start gap-3"><FileImage className="mt-1 h-5 w-5 text-[#7a132b]" aria-hidden="true" /><div><h3 className="font-bold text-neutral-900">Itinerario por día</h3><p className="mt-1 max-w-2xl text-sm text-neutral-600">Puedes añadir una imagen con el programa detallado de cada fecha. Las actividades y sus horarios se conservan por separado.</p></div></div>
    <div className="grid gap-4 lg:grid-cols-2">{dias.map(fecha => {
      const archivo = itinerarios.find(i => i.fecha === fecha);
      const sinActividad = !fechas.includes(fecha);
      return <div key={fecha}>
        {sinActividad && <div role="alert" className="mb-3 space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
          <p>Ya no hay actividades el {fecha}. Puedes retirar el archivo o asociarlo a otra fecha. Revisa que su contenido siga siendo correcto.</p>
          <label className="block">Nueva fecha del itinerario
            <select value={destinos[fecha] || ''} onChange={e=>setDestinos({...destinos,[fecha]:e.target.value})} className="mt-1 block w-full rounded-lg border border-amber-300 bg-white p-2">
              <option value="">Selecciona una fecha sin itinerario</option>
              {[...new Set(fechas.filter(Boolean))].filter(f=>!itinerarios.some(i=>i.fecha===f)).sort().map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <button type="button" disabled={!destinos[fecha] || !fechas.includes(destinos[fecha]) || itinerarios.some(i=>i.fecha===destinos[fecha])} onClick={()=>{
            const destino=destinos[fecha];
            if(!destino || !fechas.includes(destino) || itinerarios.some(i=>i.fecha===destino)) return;
            alCambiar(reasociarItinerario(itinerarios,fechas,fecha,destino));
            alCambiarEstado(fecha,{cargando:false,error:''});
          }} className="rounded-lg bg-[#7a132b] px-3 py-2 font-semibold text-white disabled:opacity-40">Asociar a la nueva fecha</button>
          <button type="button" onClick={()=>{alCambiar(itinerarios.filter(i=>i.fecha!==fecha));alCambiarEstado(fecha,{cargando:false,error:''});}} className="ml-2 inline-flex items-center gap-1 underline"><Trash2 size={14}/>Retirar archivo</button>
        </div>}
        <EditorCartel titulo={`Itinerario del ${fecha}`} urlImagen={archivo?.urlImagen} nombre={archivo?.nombreArchivo}
          alCambiar={(urlImagen,nombreArchivo) => alCambiar([...itinerarios.filter(i=>i.fecha!==fecha), ...(urlImagen ? [{fecha,urlImagen,nombreArchivo}] : [])])}
          alCambiarEstado={estado=>alCambiarEstado(fecha,estado)} />
      </div>;
    })}</div>
  </section>;
}

export function VistaItinerarios({ itinerarios }: {itinerarios?: ItinerarioDia[]}) {
  if (!itinerarios?.length) return null;
  return <section className="space-y-4"><h3 className="font-bold">Itinerarios del evento</h3>{[...itinerarios].sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(i=><details key={i.fecha} className="rounded-xl bg-neutral-50 p-4"><summary className="cursor-pointer font-semibold">Ver itinerario del {i.fecha}</summary><img src={i.urlImagen} alt={`Itinerario del ${i.fecha}`} className="mt-4 max-h-[42rem] w-full rounded-lg object-contain"/><a href={i.urlImagen} download={i.nombreArchivo} className="mt-3 inline-block text-sm font-semibold text-[#7a132b] underline">Descargar imagen del itinerario</a></details>)}</section>;
}
