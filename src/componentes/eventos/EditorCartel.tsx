import React, { useRef, useState } from 'react';
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
  return <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4" aria-label="Cartel del evento">
    <label className="block text-sm font-semibold">Cartel del evento (opcional, JPEG/PNG, máximo 5 MiB)
      <input ref={entrada} aria-label="Seleccionar cartel del evento" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" disabled={cargando} onChange={e => void cargar(e.target.files?.[0])} className="mt-2 block w-full min-w-0 text-sm" />
    </label>
    {cargando && <p role="status" className="text-sm">Preparando vista previa… Espera antes de guardar.</p>}
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><p>{error}</p><button type="button" onClick={() => estado(false)} className="mt-2 underline">Descartar archivo rechazado</button></div>}
    {urlImagen && <img src={urlImagen} alt="Vista previa del cartel del evento" className="max-h-80 w-full rounded-lg bg-neutral-50 object-contain" />}
    {nombre && <p className="break-all text-sm text-neutral-600">Preparado: {nombre}. Se conservará al guardar el formulario.</p>}
    {urlImagen && <button type="button" disabled={cargando} onClick={() => { alCambiar(undefined, ''); estado(false); }} className="rounded-lg border px-3 py-2 text-sm font-semibold">Quitar cartel</button>}
  </section>;
}
