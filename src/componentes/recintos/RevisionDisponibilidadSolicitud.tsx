import React, { useEffect, useState } from 'react';
import { crearServicioDisponibilidad, type AlternativaDisponibilidad, type RevisionDisponibilidadSolicitud as Revision } from '../../servicios/disponibilidadRecintos';
import { textoParaUsuario } from '../../utilidades/textoParaUsuario';

const servicio = crearServicioDisponibilidad();
const boton = 'rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-40';
const fechaLegible = (fecha: string) => new Date(fecha + 'T12:00:00-06:00').toLocaleDateString('es-MX', {timeZone:'America/Mexico_City', dateStyle:'long'});
export function motivoCorreccionDisponibilidad(revision: Revision, alternativa?: AlternativaDisponibilidad) {
  const lineas = revision.actividades.filter(a => !a.disponible).map(a =>
    `${a.nombreActividad}: ${a.nombreRecinto}, ${a.fecha}, ${a.horaInicio}–${a.horaFin}. Conflicto: ${a.conflictos.map(o => `${o.titulo}, ${o.horaInicio}–${o.horaFin}${o.posteriorAlEnvio ? ' (registrado o actualizado después del envío)' : ''}`).join('; ')}.`);
  if (alternativa) {
    const a = revision.actividades.find(a => a.id === alternativa.id);
    lineas.push(`Opción sugerida para ${a?.nombreActividad || 'la actividad'}: ${alternativa.nombreRecinto}, ${alternativa.fecha}, ${alternativa.horaInicio}–${alternativa.horaFin}.${alternativa.advertencias.length ? ' Coincide con horario académico informativo; requiere revisión de Subdirección.' : ''}`);
  }
  return [...lineas, 'Corrige el recinto o el horario y reenvía la solicitud. Las opciones son orientativas y no reservan el espacio; la disponibilidad se comprobará de nuevo.'].join('\n');
}

export function RevisionDisponibilidadSolicitud({ idSolicitud, version, remota, puedeCorregir, alPedirCorreccion, actualizar = 0 }: {
  idSolicitud: string; version: number; remota: boolean; puedeCorregir: boolean;
  alPedirCorreccion: (motivo: string) => void; actualizar?: number;
}) {
  const [recarga, setRecarga] = useState(0);
  const [estado, setEstado] = useState<{cargando: boolean; revision?: Revision; error?: string}>({cargando:true});
  useEffect(() => {
    if (!remota) return;
    const controlador = new AbortController();
    setEstado({cargando:true});
    servicio.revisarSolicitud(idSolicitud, controlador.signal).then(revision => {
      if (!controlador.signal.aborted) setEstado({cargando:false, revision});
    }).catch(error => {
      if (!controlador.signal.aborted) setEstado({cargando:false, error: error instanceof Error ? error.message : 'Vuelve a consultar la disponibilidad.'});
    });
    return () => controlador.abort();
  }, [idSolicitud, version, remota, recarga, actualizar]);
  const revision = estado.revision?.idSolicitud === idSolicitud ? estado.revision : undefined;
  const vigente = revision?.versionSolicitud === version;
  const conflictos = revision?.actividades.some(a => !a.disponible);
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6" aria-label="Disponibilidad para dictaminar">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Disponibilidad actual</h2>
      {remota && <button type="button" className={boton} disabled={estado.cargando} onClick={() => setRecarga(n => n + 1)}>{estado.cargando ? 'Consultando disponibilidad…' : 'Actualizar disponibilidad'}</button>}
    </div>
    {!remota ? <p className="mt-3 text-sm text-amber-900">La disponibilidad real requiere la conexión con el servidor. La vista de demostración no confirma recintos ni alternativas.</p> : <>
      <div aria-live="polite" className="mt-3 text-sm">
        {estado.cargando && <p role="status" className="text-neutral-600">Consultando recintos, bloqueos y horarios de todas las actividades…</p>}
        {estado.error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-900"><p>No se pudo actualizar la disponibilidad. {textoParaUsuario(estado.error)}</p><p className="mt-1">No hay un resultado confirmado. Reintenta la consulta.</p></div>}
        {revision && <p className={conflictos ? 'font-semibold text-rose-800' : 'font-semibold text-emerald-800'}>{revision.actividades.length === 0 ? 'No hay actividades vigentes que consultar.' : conflictos ? 'Hay conflictos que deben resolverse antes de autorizar.' : 'Todos los horarios solicitados están disponibles en esta consulta.'}</p>}
      </div>
      {revision && <>
        <p className="mt-2 text-xs text-neutral-500">Consultado el {new Date(revision.consultadoEn).toLocaleString('es-MX', {timeZone:'America/Mexico_City'})} · Hora de Ciudad de México · Margen entre actividades: {revision.margenSeparacionMinutos} minutos.</p>
        {!vigente && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">El expediente cambió en otra sesión. Vuelve a abrir la solicitud para revisar su versión actual antes de dictaminar.</p>}
        <ul className="mt-4 space-y-4">{revision.actividades.map(a => <li key={a.id} className="rounded-xl border border-neutral-200 p-4">
          <h3 className="font-bold">{a.nombreActividad}</h3>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-neutral-500">Recinto solicitado</dt><dd className="font-semibold">{a.nombreRecinto}</dd></div><div><dt className="text-neutral-500">Fecha y horario</dt><dd>{fechaLegible(a.fecha)} · {a.horaInicio}–{a.horaFin}</dd></div></dl>
          <p className={`mt-3 text-sm font-semibold ${a.disponible ? 'text-emerald-800' : 'text-rose-800'}`}>{a.disponible ? 'Disponible en el horario solicitado' : 'Horario en conflicto'}</p>
          {a.conflictos.map(o => <div key={o.id} className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-900"><strong>{o.titulo} · {o.horaInicio}–{o.horaFin}</strong>{o.descripcion && <p>{o.descripcion}</p>}{o.posteriorAlEnvio && <p className="mt-1 font-semibold">Este bloqueo se registró o actualizó después del envío de esta versión.</p>}{o.finPrevisto && <p className="mt-1">El fin previsto es informativo; el recinto sigue bloqueado hasta su cierre efectivo.</p>}</div>)}
          {a.advertencias.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Horario académico informativo: {a.advertencias.map(o => `${o.horaInicio}–${o.horaFin}`).join(', ')}. La clase se conserva y no impide automáticamente la autorización; Subdirección debe revisar la coincidencia.</p>}
          {!a.disponible && <div className="mt-4"><h4 className="text-sm font-bold">Alternativas en la misma fecha</h4><p className="mt-1 text-xs text-neutral-500">Conservan la duración y admiten el aforo solicitado. Confirma equipamiento y distribución antes de corregir. Cada opción se evalúa por separado.</p>
            {a.alternativas.length ? <ul className="mt-3 space-y-2">{a.alternativas.map(o => <li key={o.idRecinto + o.horaInicio} className="rounded-lg bg-neutral-50 p-3 text-sm"><p className="font-semibold">{o.nombreRecinto} · {o.horaInicio}–{o.horaFin}</p>{o.advertencias.length > 0 && <p className="mt-1 text-amber-900">Coincide con horario académico informativo.</p>}{puedeCorregir && <button type="button" disabled={!vigente} className={boton + ' mt-2'} onClick={() => alPedirCorreccion(motivoCorreccionDisponibilidad(revision, o))}>Pedir corrección con esta opción</button>}</li>)}</ul> : <p className="mt-2 text-sm text-neutral-600">No se encontraron opciones para la misma fecha y duración. Pide proponer otra fecha o ajustar los requisitos.</p>}
          </div>}
        </li>)}</ul>
        {conflictos && puedeCorregir && <button type="button" disabled={!vigente} className={boton + ' mt-4 text-[#7a132b]'} onClick={() => alPedirCorreccion(motivoCorreccionDisponibilidad(revision))}>Pedir corrección de los horarios en conflicto</button>}
      </>}
      <p className="mt-4 text-xs text-neutral-500">Consultar o sugerir una alternativa no cambia la solicitud ni reserva el recinto. El servidor vuelve a validar al autorizar, aunque la agenda cambie en otra sesión.</p>
    </>}
  </section>;
}
