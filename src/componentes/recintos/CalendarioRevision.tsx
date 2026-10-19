import React, { useState } from 'react';
import { useDatos } from '../../contextos/DatosContexto';
import type { CalendarioRevision as TipoCalendario } from '../../dominio/calendarioRevision';
export function ConfiguracionCalendarioRevision() {
  const { calendarioRevision, guardarCalendarioRevision } = useDatos();
  const [dias, setDias] = useState(calendarioRevision?.diasLaborables || [1,2,3,4,5]);
  const [fechas, setFechas] = useState(calendarioRevision?.diasInhabiles.join('\n') || '');
  const [mensaje, setMensaje] = useState('');
  return <details className="my-6 rounded-2xl border bg-white p-5"><summary className="font-bold cursor-pointer">Calendario hábil de revisión {calendarioRevision ? '· Configurado' : '· Requiere configuración'}</summary><p className="my-3 text-sm">Define los días laborables y las fechas inhábiles antes de recibir nuevas solicitudes. Los plazos ya calculados no se reinician al cambiar el calendario.</p><form onSubmit={e=>{e.preventDefault(); const r=guardarCalendarioRevision({diasLaborables:dias,diasInhabiles:fechas.split(/[\s,]+/).filter(Boolean)} as TipoCalendario);setMensaje(r.error || 'Calendario guardado. Las solicitudes nuevas tendrán dos días hábiles para revisión.');}}><fieldset className="flex flex-wrap gap-4"><legend>Días laborables</legend>{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((nombre,i)=><label key={i}><input type="checkbox" checked={dias.includes(i)} onChange={e=>setDias(e.target.checked?[...dias,i]:dias.filter(d=>d!==i))}/> {nombre}</label>)}</fieldset><label className="block mt-4">Fechas inhábiles (AAAA-MM-DD, una por línea)<textarea aria-label="Fechas inhábiles" className="block w-full border rounded p-2" rows={3} value={fechas} onChange={e=>setFechas(e.target.value)}/></label><button className="mt-3 rounded-xl border px-4 py-2 font-bold">Guardar calendario</button><p role="status" className="mt-3">{mensaje}</p></form></details>;
}
