import React from 'react';
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
  return <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4" aria-label={`Programa del ${nombreDia}`}>
    <h3 className="font-bold">Programa del {nombreDia}</h3>
    <p className="text-sm text-neutral-600">Agrega actividades dentro del horario del día. El título y la hora de inicio son obligatorios al añadir una actividad. Los ponentes son opcionales.</p>
    {textoAnterior && <p className="whitespace-pre-line rounded-lg bg-neutral-50 p-3 text-sm"><strong>Texto del programa anterior:</strong> {textoAnterior}<span className="mt-1 block">Se conserva si no registras actividades estructuradas.</span></p>}
    {programa.map((actividad, indice) => <fieldset key={indice} className="grid min-w-0 gap-3 rounded-xl border p-3 sm:grid-cols-2">
      <legend className="px-1 text-sm font-semibold">Actividad {indice + 1}</legend>
      <label className="text-sm font-semibold">Hora de inicio *<input aria-label={`Inicio actividad ${indice + 1} del ${nombreDia}`} type="time" value={actividad.hora} onChange={e => cambiar(indice, 'hora', e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="text-sm font-semibold">Hora de término (opcional)<input aria-label={`Término actividad ${indice + 1} del ${nombreDia}`} type="time" value={actividad.horaFin || ''} onChange={e => cambiar(indice, 'horaFin', e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Título de la actividad *<input aria-label={`Título actividad ${indice + 1} del ${nombreDia}`} value={actividad.titulo} onChange={e => cambiar(indice, 'titulo', e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea aria-label={`Descripción actividad ${indice + 1} del ${nombreDia}`} value={actividad.descripcion || ''} onChange={e => cambiar(indice, 'descripcion', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Ponente(s), si aplica<input aria-label={`Ponentes actividad ${indice + 1} del ${nombreDia}`} value={actividad.ponente || ''} onChange={e => cambiar(indice, 'ponente', e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <button type="button" onClick={() => alCambiar(programa.filter((_, posicion) => posicion !== indice))} className="w-fit rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-800">Quitar actividad {indice + 1} del {nombreDia}</button>
    </fieldset>)}
    <button type="button" onClick={() => alCambiar([...programa, { hora: '', titulo: '' }])} className="rounded-lg border border-[#7a132b] px-3 py-2 text-sm font-bold text-[#7a132b]">Añadir actividad al {nombreDia}</button>
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
