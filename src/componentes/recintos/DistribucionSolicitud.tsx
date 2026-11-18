import { nombreActividad } from '../../dominio/actividades';
import React, { useState } from 'react';
import type { ElementoFechaSolicitada, Recinto } from '../../tipos';
import { MapaAsientos } from '../asientos/MapaAsientos';
import { VentanaModal } from '../ui/VentanaModal';
import { lugaresDelRecinto } from '../../dominio/distribucionSolicitud';
export function DistribucionSolicitud({dia,recinto,alGuardar}:{dia:ElementoFechaSolicitada;recinto:Recinto;alGuardar:(dia:ElementoFechaSolicitada)=>void}) {
  const nombre=nombreActividad(dia);
  const [abierto,setAbierto]=useState(new URLSearchParams(window.location.search).get('distribucion')==='1' && (dia.nombreDia==='Día 1'||dia.nombreActividad!==undefined));
  const [lugares,setLugares]=useState(dia.distribucion || lugaresDelRecinto(recinto));
  const [categoria,setCategoria]=useState<'asistente'|'vip'|'staff'|'bloquear'>('asistente');
  const etiquetas = { asistente: 'Asistente', vip: 'VIP', staff: 'Staff', bloquear: 'Bloquear lugar' } as const;
  const estilos = {
    asistente: 'border-neutral-800 bg-neutral-800 text-white',
    vip: 'border-amber-600 bg-amber-100 text-amber-950',
    staff: 'border-purple-600 bg-purple-100 text-purple-950',
    bloquear: 'border-red-600 bg-red-100 text-red-900',
  } as const;
  return <section data-interfaz="UI.07" tabIndex={-1} className="mt-4 rounded-xl border p-4">
    <h3 className="font-bold">Distribución de lugares de {nombre}</h3>
    <p className="my-2 text-sm" role="status">{dia.distribucionConfirmada ? 'Distribución confirmada para esta solicitud. Aún no reserva el recinto.' : 'Configura los lugares antes de enviar. Esto no reserva el recinto.'}</p>
    <button type="button" className="cursor-pointer rounded-xl border px-4 py-2 font-bold transition-colors hover:border-[#7a132b] hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b]" onClick={() => { setLugares(dia.distribucion || lugaresDelRecinto(recinto)); setAbierto(true); }}>Configurar distribución de {nombre}</button>
    {abierto && <VentanaModal estaAbierto anchoMaximo="5xl" alCerrar={() => setAbierto(false)} titulo={`Distribución de ${nombre} · ${recinto.nombre}`}>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Tipo de lugar">
        {(['asistente','vip','staff','bloquear'] as const).map(c => <button type="button" aria-pressed={categoria === c} className={`cursor-pointer rounded-lg border px-3 py-2 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b] ${categoria === c ? estilos[c] : 'border-neutral-300 bg-white text-neutral-700 hover:border-[#7a132b] hover:bg-rose-50'}`} key={c} onClick={() => setCategoria(c)}>{etiquetas[c]}</button>)}
      </div>
      <p className="mb-4 text-sm text-neutral-600" aria-live="polite">Herramienta seleccionada: <strong>{etiquetas[categoria]}</strong>. Selecciona un lugar para {categoria === 'bloquear' ? 'bloquearlo o desbloquearlo' : 'asignarle este tipo'}.</p>
      <MapaAsientos asientos={lugares} tipoRecinto={recinto.tipo} modo="editor" alSeleccionarAsiento={a => setLugares(actuales => actuales.map(l => l.id !== a.id ? l : categoria === 'bloquear' ? {...l, estaBloqueado: !l.estaBloqueado} : {...l, categoria, estaBloqueado: false}))}/>
      <p className="my-3">Lugares habilitados: {lugares.filter(l => !l.estaBloqueado && !l.estaEliminado).length}</p>
      <button type="button" className="cursor-pointer rounded-xl bg-[#7a132b] px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#5d0e21] active:bg-[#460a19] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b]" onClick={() => { alGuardar({...dia, distribucion: lugares, distribucionConfirmada: true}); setAbierto(false); }}>Confirmar distribución de {nombre}</button>
    </VentanaModal>}
  </section>;
}
