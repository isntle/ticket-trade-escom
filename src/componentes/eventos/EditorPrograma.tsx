import React from 'react';
import { ListMusic, Plus, Trash2 } from 'lucide-react';
import type { ActividadPrograma } from '../../tipos';

interface PropiedadesPrograma {
  nombreDia: string;
  programa: ActividadPrograma[];
  alCambiar: (actividades: ActividadPrograma[]) => void;
  textoAnterior?: string;
}

export function EditorPrograma({ nombreDia, programa, alCambiar, textoAnterior }: PropiedadesPrograma) {
  const cambiar = (indice: number, campo: keyof ActividadPrograma, valor: string) =>
    alCambiar(programa.map((actividad, posicion) => posicion === indice ? { ...actividad, [campo]: valor } : actividad));
  const campo = 'mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-normal text-neutral-800 outline-none focus:border-[#7a132b]/50 focus:ring-2 focus:ring-[#7a132b]/10';
  return <section className="space-y-5" aria-label={`Programa del ${nombreDia}`}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-bold">Programa del {nombreDia}</h3><p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-500">Ordena las actividades de tu evento. Captura el título y la hora de inicio; añade los demás detalles cuando los tengas.</p></div>
      <span className="rounded-full bg-[#7a132b]/5 px-3 py-1 text-xs font-semibold text-[#7a132b]">{programa.length} {programa.length === 1 ? 'actividad' : 'actividades'}</span>
    </header>
    {textoAnterior && <p className="whitespace-pre-line rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Programa anterior:</strong> {textoAnterior}<span className="mt-1 block">Se conserva mientras no añadas actividades.</span></p>}
    {!programa.length && <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 p-5"><ListMusic className="h-8 w-8 shrink-0 text-[#7a132b]/60" aria-hidden="true" /><p className="text-sm text-neutral-600">Comienza con la primera actividad: una bienvenida, una conferencia o un taller.</p></div>}
    <div className="space-y-4">{programa.map((actividad, indice) => <fieldset key={indice} className="min-w-0 overflow-hidden rounded-2xl bg-neutral-50">
      <legend className="sr-only">Actividad {indice + 1}</legend>
      <div className="flex items-center justify-between gap-3 px-4 pb-0 pt-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#7a132b]">{indice + 1}</span><p className="truncate text-sm font-bold text-neutral-700">{actividad.titulo || 'Nueva actividad'}</p></div>
        <button type="button" aria-label={`Quitar actividad ${indice + 1} del ${nombreDia}`} title="Quitar actividad" onClick={() => alCambiar(programa.filter((_, posicion) => posicion !== indice))} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-neutral-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600"><Trash2 className="h-4 w-4" aria-hidden="true" /><span>Quitar</span></button>
      </div>
      <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="text-sm font-semibold text-neutral-600 sm:col-span-2">Título de la actividad *<input aria-label={`Título actividad ${indice + 1} del ${nombreDia}`} placeholder="Por ejemplo: Conferencia de apertura" value={actividad.titulo} onChange={e => cambiar(indice, 'titulo', e.target.value)} className={campo} /></label>
        <label className="text-sm font-semibold text-neutral-600">Hora de inicio *<input aria-label={`Inicio actividad ${indice + 1} del ${nombreDia}`} type="time" value={actividad.hora} onChange={e => cambiar(indice, 'hora', e.target.value)} className={campo} /></label>
        <label className="text-sm font-semibold text-neutral-600">Hora de término <span className="font-normal text-neutral-400">(opcional)</span><input aria-label={`Término actividad ${indice + 1} del ${nombreDia}`} type="time" value={actividad.horaFin || ''} onChange={e => cambiar(indice, 'horaFin', e.target.value)} className={campo} /></label>
        <label className="text-sm font-semibold text-neutral-600 sm:col-span-2">Descripción<textarea aria-label={`Descripción actividad ${indice + 1} del ${nombreDia}`} placeholder="¿Qué se hará en esta actividad?" value={actividad.descripcion || ''} onChange={e => cambiar(indice, 'descripcion', e.target.value)} rows={2} className={campo} /></label>
        <label className="text-sm font-semibold text-neutral-600 sm:col-span-2">Ponentes <span className="font-normal text-neutral-400">(si aplica)</span><input aria-label={`Ponentes actividad ${indice + 1} del ${nombreDia}`} value={actividad.ponente || ''} onChange={e => cambiar(indice, 'ponente', e.target.value)} className={campo} /></label>
      </div>
    </fieldset>)}</div>
    <button type="button" onClick={() => alCambiar([...programa, { hora: '', titulo: '' }])} className="inline-flex items-center gap-2 rounded-xl bg-[#7a132b]/5 px-4 py-3 text-sm font-bold text-[#7a132b] hover:bg-[#7a132b]/10 focus-visible:outline-2 focus-visible:outline-[#7a132b]"><Plus className="h-4 w-4" aria-hidden="true" />Añadir actividad</button>
  </section>;
}

export function ProgramaDia({ programa }: { programa?: ActividadPrograma[] }) {
  if (!programa?.length) return null;
  return <ol className="mt-3 space-y-3">{[...programa].sort((a, b) => a.hora.localeCompare(b.hora)).map((actividad, indice) =>
    <li key={indice} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
      <span className="font-semibold text-[#7a132b]">{actividad.hora}{actividad.horaFin ? `–${actividad.horaFin}` : ''} h</span>
      <h4 className="mt-1 break-words font-bold">{actividad.titulo}</h4>
      {actividad.descripcion && <p className="mt-1 whitespace-pre-line break-words">{actividad.descripcion}</p>}
      {actividad.ponente && <p className="mt-1 break-words"><strong>Ponente(s):</strong> {actividad.ponente}</p>}
    </li>)}</ol>;
}
