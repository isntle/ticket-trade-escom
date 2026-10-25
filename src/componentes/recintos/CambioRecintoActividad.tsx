import React from 'react';
import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import { VentanaModal } from '../ui/VentanaModal';
import { useDatos } from '../../contextos/DatosContexto';
import { aforoActividad, nombreActividad } from '../../dominio/actividades';
import type { PropuestaCambioRecinto } from '../../dominio/cambioRecinto';
import type { Evento } from '../../tipos';

export function CambioRecintoActividad({evento,idActividad,alCerrar}:{evento:Evento;idActividad:string;alCerrar:()=>void}) {
  const {listaRecintos,revisarCambioRecinto,confirmarCambioRecinto}=useDatos();
  const actividad=evento.fechas.find(a=>a.id===idActividad)!;
  const aforoActual=aforoActividad(actividad,evento.aforoMaximo)||0;
  const [idRecinto,setRecinto]=React.useState('');
  const [aforo,setAforo]=React.useState(aforoActual);
  const [motivo,setMotivo]=React.useState('');
  const [propuesta,setPropuesta]=React.useState<PropuestaCambioRecinto|null>(null);
  const [reduccion,setReduccion]=React.useState(false);
  const [revisado,setRevisado]=React.useState(false);
  const [mensaje,setMensaje]=React.useState('');
  const [confirmado,setConfirmado]=React.useState(false);
  const campo='mt-1 w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm';
  return <VentanaModal estaAbierto alCerrar={alCerrar} titulo="Cambiar recinto" subtitulo={nombreActividad(actividad,evento.fechas.indexOf(actividad))} anchoMaximo="4xl">
    <div className="space-y-5">
      <div className="rounded-xl bg-sky-50 p-4 text-sm text-sky-950"><strong>{actividad.fecha} · {actividad.horaInicio}–{actividad.horaFin}</strong><p>La fecha y el horario se conservan. Los boletos mantendrán su QR y mostrarán el nuevo recinto y lugar.</p></div>
      {mensaje&&<p role="status" className={`rounded-xl p-4 text-sm ${confirmado?'bg-emerald-50 text-emerald-900':'bg-amber-50 text-amber-950'}`}>{mensaje}</p>}
      {!confirmado&&!propuesta&&<form className="space-y-4" onSubmit={e=>{
        e.preventDefault();setMensaje('');
        const r=revisarCambioRecinto({idEvento:evento.id,idActividad,idRecinto,aforo,motivo});
        if(r.propuesta){setPropuesta(r.propuesta);setReduccion(false);setRevisado(false);}else setMensaje(r.error||'No se pudo consultar la compatibilidad.');
      }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Recinto de destino<select required className={campo} value={idRecinto} onChange={e=>{setRecinto(e.target.value);setAforo(Math.min(aforoActual,listaRecintos.find(r=>r.id===e.target.value)?.capacidad||aforoActual));}}><option value="">Selecciona un recinto</option>{listaRecintos.filter(r=>r.activo!==false&&r.id!==actividad.idRecinto).map(r=><option key={r.id} value={r.id}>{r.nombre} · capacidad {r.capacidad}</option>)}</select></label>
          <label className="text-sm font-semibold">Aforo propuesto<input required type="number" min={1} max={aforoActual} value={aforo} onChange={e=>setAforo(Number(e.target.value))} className={campo}/><span className="mt-1 block text-xs font-normal text-neutral-500">Aprobado: {aforoActual}. No se permite aumentar el aforo ni dejar fuera compromisos vigentes.</span></label>
        </div>
        <label className="block text-sm font-semibold">Motivo del cambio<textarea required value={motivo} onChange={e=>setMotivo(e.target.value)} className={campo}/></label>
        <div className="flex flex-wrap gap-3"><button className="rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white" type="submit">Revisar compatibilidad</button><button type="button" onClick={alCerrar} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm">Cancelar</button></div>
      </form>}
      {!confirmado&&propuesta&&<section className="space-y-4" aria-label="Revisión de correspondencia de lugares">
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-neutral-200 p-4"><span className="text-xs text-neutral-500">Recinto actual</span><strong className="block">{propuesta.recintoAnterior}</strong><span className="text-sm">Aforo {propuesta.aforoAnterior}</span></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><span className="text-xs text-emerald-700">Recinto propuesto</span><strong className="block">{propuesta.recintoNuevo}</strong><span className="text-sm">Aforo {propuesta.aforoNuevo} · {propuesta.compromisos} compromisos conservados</span></div></div>
        <p className="text-sm text-neutral-600">Revisa cada lugar comprometido. Puedes elegir otro destino; no se admiten duplicados. Las categorías y plazas especiales se conservan.</p>
        <div className="space-y-2">{propuesta.lugares.map(l=><div key={l.origen} className="grid gap-3 rounded-xl bg-neutral-50 p-3 sm:grid-cols-2"><div className="min-w-0 text-sm"><strong>{l.etiquetaAnterior} · {l.categoria}</strong><span className="block break-words text-neutral-600">{l.titulares}</span></div><label className="flex items-center gap-2 text-sm"><ArrowRight size={16}/><span className="sr-only">Nuevo lugar para {l.etiquetaAnterior}</span><select aria-label={`Nuevo lugar para ${l.etiquetaAnterior}`} className={campo} value={l.destino} onChange={e=>{const destino=propuesta.destinos.find(d=>d.id===e.target.value)!;setRevisado(false);setPropuesta({...propuesta,lugares:propuesta.lugares.map(x=>x.origen===l.origen?{...x,destino:destino.id,etiquetaNueva:destino.etiqueta}:x),peticion:{...propuesta.peticion,correspondencias:propuesta.peticion.correspondencias!.map(x=>x.origen===l.origen?{...x,destino:destino.id}:x)}});}}>{propuesta.destinos.map(d=><option key={d.id} value={d.id}>{d.etiqueta}</option>)}</select></label></div>)}</div>
        {!propuesta.lugares.length&&<p className="rounded-xl bg-neutral-50 p-3 text-sm">No hay asientos individuales comprometidos. Se conservarán los cupos y la lista de espera.</p>}
        {propuesta.reduccion&&<label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><input type="checkbox" checked={reduccion} onChange={e=>setReduccion(e.target.checked)}/>Acepto reducir expresamente el aforo de {propuesta.aforoAnterior} a {propuesta.aforoNuevo}, conservando los compromisos y plazas especiales.</label>}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={revisado} onChange={e=>setRevisado(e.target.checked)}/><span>Revisé los lugares y confirmo el cambio de recinto. La fecha y el horario no cambian.</span></label>
        <p className="text-xs text-neutral-500">Los avisos quedan registrados para sus destinatarios. El envío real de correo no está configurado.</p>
        <div className="flex flex-wrap gap-3"><button disabled={!revisado||(propuesta.reduccion&&!reduccion)} className="flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white disabled:opacity-40" onClick={()=>{const r=confirmarCambioRecinto(propuesta,reduccion);setMensaje(r.exito?'Recinto actualizado. Se conservaron los QR, los compromisos y la programación.':r.error||'No se pudo confirmar.');if(r.exito)setConfirmado(true);}}><ShieldCheck size={17}/>Confirmar cambio de recinto</button><button className="rounded-xl border border-neutral-200 px-4 py-3 text-sm" onClick={()=>{setPropuesta(null);setMensaje('');}}>Volver a la propuesta</button><button className="px-4 py-3 text-sm" onClick={alCerrar}>Cancelar sin cambios</button></div>
      </section>}
      {confirmado&&<button onClick={alCerrar} className="flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white"><MapPin size={17}/>Volver al evento</button>}
    </div>
  </VentanaModal>;
}
