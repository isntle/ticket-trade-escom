import React, { useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, Plus, Save, XCircle } from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import type { OcupacionInterna, Recinto, TipoRecinto } from '../tipos';

export const AdministracionRecintosPagina: React.FC<{ modo: 'catalogo' | 'ocupaciones'; navigate: (ruta: string) => void }> = ({ modo, navigate }) => {
  const { listaRecintos, listaOcupacionesInternas, guardarRecinto, crearOcupacionInterna, cancelarOcupacionInterna, verificarDisponibilidadRecinto } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const [recintoEditando, setRecintoEditando] = useState<Recinto | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idRecinto, setIdRecinto] = useState(listaRecintos.find((r) => r.activo !== false)?.id || '');
  const [fechaInicio, setFechaInicio] = useState('2026-11-10');
  const [fechaFin, setFechaFin] = useState('2026-11-10');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('12:00');

  const abrirEdicion = (recinto?: Recinto) => setRecintoEditando(recinto || {
    id: `rec-${Date.now().toString(36)}`, nombre: '', codigo: '', tipo: 'sala', capacidad: 1,
    ubicacion: '', indicaciones: '', equipamiento: [], descripcion: '', permiteEliminarAsientos: false, activo: true
  });

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recintoEditando?.nombre.trim() || !recintoEditando.codigo.trim() || recintoEditando.capacidad < 1) {
      mostrarNotificacion('Revisa los datos', 'Nombre, código y capacidad son obligatorios.', 'advertencia'); return;
    }
    if (listaRecintos.some((r) => r.id !== recintoEditando.id && r.codigo.trim().toLowerCase() === recintoEditando.codigo.trim().toLowerCase())) {
      mostrarNotificacion('Código duplicado', 'Cada recinto debe tener un código institucional único.', 'error'); return;
    }
    guardarRecinto(recintoEditando);
    setRecintoEditando(null);
    mostrarNotificacion('Catálogo actualizado', 'Los datos del recinto se guardaron en este navegador.', 'exito');
  };

  const registrarOcupacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !idRecinto || fechaFin < fechaInicio || (fechaInicio === fechaFin && horaFin <= horaInicio)) {
      mostrarNotificacion('Datos incompletos', 'Verifica el nombre, recinto y periodo de la ocupación.', 'advertencia'); return;
    }
    for (let dia = new Date(`${fechaInicio}T12:00:00`); dia <= new Date(`${fechaFin}T12:00:00`); dia.setDate(dia.getDate() + 1)) {
      const fecha = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
      const disponibilidad = verificarDisponibilidadRecinto(idRecinto, fecha, horaInicio, horaFin);
      if (!disponibilidad.disponible) {
        mostrarNotificacion('Conflicto de agenda', disponibilidad.motivo || 'El recinto ya está ocupado en ese periodo.', 'error'); return;
      }
    }
    crearOcupacionInterna({ idRecinto, titulo: titulo.trim(), descripcion: descripcion.trim(), fechaInicio, fechaFin, horaInicio, horaFin, responsable: usuarioActual?.nombre || 'Subdirección' });
    setTitulo(''); setDescripcion('');
    mostrarNotificacion('Ocupación registrada', 'La actividad ya afecta la disponibilidad del recinto.', 'exito');
  };

  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
    <button onClick={() => navigate('/subdireccion')} className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950"><ArrowLeft size={16}/>Volver a Subdirección</button>
    <header className="mb-6"><p className="text-xs font-bold uppercase tracking-wider text-[#7a132b]">Organización y recintos</p><h1 className="text-2xl font-black mt-1">{modo === 'catalogo' ? 'Administrar catálogo de recintos' : 'Gestionar ocupaciones internas'}</h1><p className="text-sm text-neutral-600 mt-2">{modo === 'catalogo' ? 'Consulta, registra y actualiza la información y el estado de los espacios.' : 'Registra actividades institucionales y consulta su impacto en la agenda.'}</p></header>
    {modo === 'catalogo' ? <>
      <div className="flex justify-end mb-4"><button onClick={() => abrirEdicion()} className="inline-flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Agregar recinto</button></div>
      <section className="grid gap-3 md:grid-cols-2">{listaRecintos.map((recinto) => <article key={recinto.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex justify-between gap-3"><div className="flex gap-3"><Building2 className="mt-1 text-[#7a132b]"/><div><h2 className="font-bold">{recinto.nombre}</h2><p className="text-xs text-neutral-500">{recinto.codigo} · {recinto.tipo} · capacidad {recinto.capacidad}</p></div></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-semibold ${recinto.activo === false ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-50 text-emerald-700'}`}>{recinto.activo === false ? 'Desactivado' : 'Activo'}</span></div>
        <p className="mt-3 text-sm text-neutral-600">{recinto.descripcion || recinto.ubicacion}</p><button onClick={() => abrirEdicion(recinto)} className="mt-4 rounded-lg border px-3 py-2 text-xs font-bold hover:bg-neutral-50">Editar recinto</button>
      </article>)}</section>
      {recintoEditando && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={guardar} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="font-bold">{listaRecintos.some((r) => r.id === recintoEditando.id) ? 'Editar recinto' : 'Nuevo recinto'}</h2><button type="button" onClick={() => setRecintoEditando(null)} aria-label="Cerrar"><XCircle/></button></div>
        <div className="grid gap-3 sm:grid-cols-2">{([['nombre','Nombre'],['codigo','Código'],['ubicacion','Ubicación'],['indicaciones','Indicaciones'],['descripcion','Descripción']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold">{label}<input className="mt-1 w-full rounded-lg border p-2 text-sm" value={recintoEditando[key] as string} onChange={(e) => setRecintoEditando({...recintoEditando,[key]:e.target.value})}/></label>)}
          <label className="text-xs font-semibold">Tipo<select className="mt-1 w-full rounded-lg border p-2 text-sm" value={recintoEditando.tipo} onChange={(e) => setRecintoEditando({...recintoEditando,tipo:e.target.value as TipoRecinto})}><option value="auditorio">Auditorio</option><option value="sala">Sala</option><option value="laboratorio">Laboratorio</option></select></label>
          <label className="text-xs font-semibold">Capacidad<input type="number" min="1" className="mt-1 w-full rounded-lg border p-2 text-sm" value={recintoEditando.capacidad} onChange={(e) => setRecintoEditando({...recintoEditando,capacidad:Number(e.target.value)})}/></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={recintoEditando.activo !== false} onChange={(e) => setRecintoEditando({...recintoEditando,activo:e.target.checked})}/>Recinto activo</label></div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-bold text-white"><Save size={15}/>Guardar</button></form></div>}
    </> : <>
      <form onSubmit={registrarOcupacion} className="mb-7 grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold">Actividad<input className="mt-1 w-full rounded-lg border p-2 text-sm" value={titulo} onChange={(e)=>setTitulo(e.target.value)} required/></label>
        <label className="text-xs font-semibold">Recinto<select className="mt-1 w-full rounded-lg border p-2 text-sm" value={idRecinto} onChange={(e)=>setIdRecinto(e.target.value)}>{listaRecintos.filter((r)=>r.activo!==false).map((r)=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>
        <label className="text-xs font-semibold">Fecha inicial<input type="date" className="mt-1 w-full rounded-lg border p-2 text-sm" value={fechaInicio} onChange={(e)=>setFechaInicio(e.target.value)} required/></label><label className="text-xs font-semibold">Fecha final<input type="date" className="mt-1 w-full rounded-lg border p-2 text-sm" value={fechaFin} onChange={(e)=>setFechaFin(e.target.value)} required/></label>
        <label className="text-xs font-semibold">Hora de inicio<input type="time" className="mt-1 w-full rounded-lg border p-2 text-sm" value={horaInicio} onChange={(e)=>setHoraInicio(e.target.value)} required/></label><label className="text-xs font-semibold">Hora de término<input type="time" className="mt-1 w-full rounded-lg border p-2 text-sm" value={horaFin} onChange={(e)=>setHoraFin(e.target.value)} required/></label>
        <label className="text-xs font-semibold sm:col-span-2">Descripción<textarea className="mt-1 w-full rounded-lg border p-2 text-sm" value={descripcion} onChange={(e)=>setDescripcion(e.target.value)}/></label><button className="self-end rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-bold text-white">Registrar ocupación</button>
      </form>
      <section className="space-y-3">{listaOcupacionesInternas.length ? listaOcupacionesInternas.map((o: OcupacionInterna)=><article key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><h2 className="font-bold">{o.titulo}</h2><p className="text-sm text-neutral-600">{listaRecintos.find((r)=>r.id===o.idRecinto)?.nombre} · {o.fechaInicio}{o.fechaFin!==o.fechaInicio?` a ${o.fechaFin}`:''} · {o.horaInicio}–{o.horaFin}</p><p className="text-xs text-neutral-500">{o.descripcion} · Responsable: {o.responsable} · {o.estado}</p></div>{o.estado==='activa'&&<button onClick={()=>cancelarOcupacionInterna(o.id)} className="rounded-lg border px-3 py-2 text-xs font-bold text-rose-700">Cancelar actividad</button>}</article>) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500"><CalendarDays className="mx-auto mb-2"/>No hay ocupaciones internas registradas.</p>}</section>
    </>}
  </main>;
};
