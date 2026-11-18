import { textoParaUsuario } from '../../utilidades/textoParaUsuario.js';
import React, { useState } from 'react';
import { useDatos } from '../../contextos/DatosContexto';
import type { CalendarioRevision as TipoCalendario } from '../../dominio/calendarioRevision';
import { apiActiva } from '../../servicios/modoDatos';
export function ConfiguracionCalendarioRevision() {
  const { calendarioRevision, guardarCalendarioRevision } = useDatos();
  const [dias, setDias] = useState(calendarioRevision?.diasLaborables || [1,2,3,4,5]);
  const [fechas, setFechas] = useState(calendarioRevision?.diasInhabiles.join('\n') || '');
  const [mensaje, setMensaje] = useState('');
  if (apiActiva) return <section className="my-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold">Calendario hábil de revisión</h2><p className="mt-2 text-sm">La edición del calendario aún no está conectada al servidor. No se pueden guardar días hábiles ni inhábiles desde esta pantalla.</p></section>;
  return <details className="my-6 rounded-2xl border bg-white p-5"><summary className="font-bold cursor-pointer">Calendario hábil de revisión {calendarioRevision ? '· Configurado' : '· Requiere configuración'}</summary><p className="my-3 text-sm">Define los días laborables y las fechas inhábiles antes de recibir nuevas solicitudes. Los plazos ya calculados no se reinician al cambiar el calendario.</p><form onSubmit={e=>{e.preventDefault(); const r=guardarCalendarioRevision({diasLaborables:dias,diasInhabiles:fechas.split(/[\s,]+/).filter(Boolean)} as TipoCalendario);setMensaje(r.error || 'Calendario guardado. Las solicitudes nuevas tendrán dos días hábiles para revisión.');}}><fieldset className="flex flex-wrap gap-4"><legend>Días laborables</legend>{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((nombre,i)=><label key={i}><input type="checkbox" checked={dias.includes(i)} onChange={e=>setDias(e.target.checked?[...dias,i]:dias.filter(d=>d!==i))}/> {nombre}</label>)}</fieldset><label className="block mt-4">Fechas inhábiles (AAAA-MM-DD, una por línea)<textarea aria-label="Fechas inhábiles" className="block w-full border rounded p-2" rows={3} value={fechas} onChange={e=>setFechas(e.target.value)}/></label><button className="mt-3 rounded-xl border px-4 py-2 font-bold">Guardar calendario</button><p role="status" className="mt-3">{textoParaUsuario(mensaje)}</p></form></details>;
}
