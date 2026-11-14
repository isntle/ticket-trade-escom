import React from 'react';
import type { EstadoAgenda } from '../../servicios/almacenDisponibilidad.js';

export function EstadoConsultaAgenda({ estado, error, recargar }: EstadoAgenda & { recargar: () => void }) {
  if (estado === 'listo') return null;
  return <div role={estado === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${estado === 'error' ? 'bg-rose-50 text-rose-900' : 'bg-neutral-50 text-neutral-600'}`}>
    {estado === 'error' ? <><p>No se pudo confirmar la disponibilidad. {error}</p><button type="button" className="mt-2 rounded-lg border border-rose-300 px-3 py-2 font-semibold" onClick={recargar}>Reintentar consulta</button></> : 'Consultando la agenda actual del servidor…'}
  </div>;
}
