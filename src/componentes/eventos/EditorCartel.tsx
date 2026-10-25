import React, { useRef, useState } from 'react';
import { ImagePlus, Replace, Trash2 } from 'lucide-react';
import { prepararCartel } from '../../utilidades/cartel';

export function EditorCartel({ urlImagen, nombre, alCambiar, alCambiarEstado }: {
  urlImagen?: string;
  nombre?: string;
  alCambiar: (url: string | undefined, nombre: string) => void;
  alCambiarEstado: (estado: { cargando: boolean; error: string }) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const estado = (ocupado: boolean, mensaje = '') => {
    setCargando(ocupado);
    setError(mensaje);
    alCambiarEstado({ cargando: ocupado, error: mensaje });
  };
  const cargar = async (archivo?: File) => {
    if (!archivo) return;
    estado(true);
    try {
      alCambiar(await prepararCartel(archivo), archivo.name);
      estado(false);
    } catch (fallo) {
      estado(false, fallo instanceof Error ? fallo.message : 'No se pudo preparar el cartel.');
    } finally {
      if (entrada.current) entrada.current.value = '';
    }
  };
  return <section className="space-y-3 rounded-2xl bg-white p-4" aria-label="Cartel del evento">
    <div><h3 className="text-sm font-semibold text-neutral-700">Cartel del evento <span className="font-normal text-neutral-400">(opcional)</span></h3><p className="mt-1 text-xs text-neutral-500">JPEG o PNG, hasta 5 MiB. Verás una vista previa al elegirlo.</p></div>
    <input ref={entrada} aria-label="Seleccionar archivo del cartel" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={cargando} onChange={e => void cargar(e.target.files?.[0])} className="sr-only" />
    <button type="button" aria-label="Seleccionar cartel del evento" disabled={cargando} onClick={() => entrada.current?.click()} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#7a132b]/5 px-4 py-5 text-sm font-semibold text-[#7a132b] transition-colors hover:bg-[#7a132b]/10 focus-visible:outline-2 focus-visible:outline-[#7a132b] disabled:opacity-50">{urlImagen ? <Replace className="h-5 w-5" aria-hidden="true" /> : <ImagePlus className="h-6 w-6" aria-hidden="true" />}{cargando ? 'Preparando cartel…' : urlImagen ? 'Cambiar cartel' : 'Añadir cartel'}</button>
    {cargando && <p role="status" className="text-sm">Preparando vista previa… Espera antes de guardar.</p>}
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><p>{error}</p><button type="button" onClick={() => estado(false)} className="mt-2 underline">Descartar archivo rechazado</button></div>}
    {urlImagen && <img src={urlImagen} alt="Vista previa del cartel del evento" className="max-h-80 w-full rounded-lg bg-neutral-50 object-contain" />}
    {nombre && <p className="break-all text-sm text-neutral-600">Preparado: {nombre}. Se conservará al guardar el formulario.</p>}
    {urlImagen && <button type="button" disabled={cargando} onClick={() => { alCambiar(undefined, ''); estado(false); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" aria-hidden="true" />Quitar cartel</button>}
  </section>;
}
