import { textoParaUsuario } from '../../utilidades/textoParaUsuario.js';
import React, { useEffect, useRef, useState } from 'react';
import { interfazSolicitada } from '../../dominio/pantallasDocumentacion';
import { useDatos, type RevisionBloqueo } from '../../contextos/DatosContexto';
import { useAutenticacion } from '../../contextos/AutenticacionContexto';
import { VentanaModal } from '../ui/VentanaModal';
import { fechaHoyMexico, inicioEnMexico } from '../../dominio/solicitudes';
import type { BloqueoRecinto } from '../../tipos';
import type { PropuestaBloqueo } from '../../dominio/bloqueos';

const tipos = ['Institucional', 'Mantenimiento', 'Fuera de servicio'] as const;
export function GestionBloqueos({ navigate }: { navigate: (ruta: string) => void }) {
  const { listaBloqueos, listaEventos, listaRecintos, agendaRemota, revisarBloqueoInstitucional, guardarBloqueoInstitucional, cancelarBloqueoInstitucional } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const puedeTipo = (tipo?: string) => !!usuarioActual?.roles.includes(tipo === 'Institucional' ? 'subdireccion' : 'admin');
  const permitidos = tipos.filter(puedeTipo);
  const [detalle, setDetalle] = useState<string | null>(null), [edicion, setEdicion] = useState<PropuestaBloqueo | null>(null);
  const [idEdicion, setIdEdicion] = useState<string>(), [version, setVersion] = useState<number>();
  const [revision, setRevision] = useState<RevisionBloqueo | null>(null), [error, setError] = useState(''), [mensaje, setMensaje] = useState('');
  const [motivo, setMotivo] = useState(''), [cancelando, setCancelando] = useState(false), [ocupado, setOcupado] = useState(false);
  const [filtro, setFiltro] = useState(''), [estado, setEstado] = useState('todos'), [desde, setDesde] = useState(''), [hasta, setHasta] = useState('');
  const pendiente = useRef(false);
  const b = listaBloqueos.find(b => b.id === detalle);
  const actividadesPendientes = b ? listaEventos.flatMap(e => e.fechas.filter(d => d.suspendida && d.idBloqueoSuspension === b.id).map(d => ({ evento: e.titulo, dia: d }))) : [];
  const ejecutar = async (accion: () => Promise<void>) => {
    if (pendiente.current) return;
    pendiente.current = true; setOcupado(true); setError(''); setMensaje('');
    try { await accion(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { pendiente.current = false; setOcupado(false); }
  };
  const abrir = (bloqueo?: BloqueoRecinto) => {
    if (pendiente.current) return;
    setError(''); setMensaje(''); setRevision(null); setDetalle(null); setCancelando(false);
    setIdEdicion(bloqueo?.id); setVersion(bloqueo?.version || 1);
    const fecha = fechaHoyMexico(new Date(Date.now() + 86400000));
    setEdicion(bloqueo ? { ...structuredClone(bloqueo), idsRecintos: [bloqueo.idRecinto] } : {
      titulo: '', motivo: '', tipo: permitidos[0], idRecinto: listaRecintos.find(r => r.activo !== false)?.id || '',
      fechaInicio: fecha, horaInicio: '08:00', fechaFin: fecha, horaFin: '18:00', esIndefinido: false,
      creadoPor: usuarioActual?.nombre || '', requiereCierre: !!agendaRemota,
    });
  };
  const revisar = (propuesta: PropuestaBloqueo) => ejecutar(async () => {
    const r = await revisarBloqueoInstitucional(propuesta, idEdicion);
    if (r.error || !r.firma) setError(r.error || 'No se pudo revisar el bloqueo.'); else setRevision(r);
  });
  useEffect(() => {
    if (!permitidos.length) return;
    const interfaz = interfazSolicitada();
    if (interfaz === 'UI.10') abrir();
    if (interfaz === 'UI.12' && listaBloqueos[0]) { setDetalle(listaBloqueos[0].id); setVersion(listaBloqueos[0].version || 1); }
  }, [usuarioActual?.id]);
  const textoRecintos = (propuesta: PropuestaBloqueo) => propuesta.idRecinto === 'todos' ? 'Todas las instalaciones' :
    (propuesta.idsRecintos?.length ? propuesta.idsRecintos : [propuesta.idRecinto]).map(id => listaRecintos.find(r => r.id === id)?.nombre || 'Recinto').join(', ');
  const periodo = (propuesta: PropuestaBloqueo) => `${propuesta.fechaInicio} ${propuesta.horaInicio} · ${propuesta.esIndefinido ? 'Sin fecha prevista de cierre' : `Fin previsto: ${propuesta.fechaFin} ${propuesta.horaFin}`}`;
  const guardar = () => ejecutar(async () => {
    if (!edicion || !revision?.firma) return;
    const r = await guardarBloqueoInstitucional(edicion, idEdicion, version, revision.firma);
    if (!r.exito) { setError(r.error || 'No se pudo guardar el bloqueo.'); setRevision(null); return; }
    setEdicion(null); setRevision(null); setDetalle(r.id || null); setVersion(r.version);
    setMensaje(r.advertencia || (agendaRemota ? 'El servidor guardó el bloqueo.' : 'Bloqueo guardado en este navegador.'));
  });
  const cancelar = () => ejecutar(async () => {
    if (!b) return;
    const r = await cancelarBloqueoInstitucional(b.id, motivo, version);
    if (!r.exito) { setError(r.error || 'No se pudo guardar el cierre del bloqueo.'); return; }
    setCancelando(false); setVersion(r.version);
    setMensaje(r.advertencia || 'Se guardó el cierre del bloqueo. Las actividades suspendidas siguen pendientes de resolución.');
  });
  const filtrados = listaBloqueos.filter(b => (estado === 'todos' || (b.estado || 'activo') === estado) &&
    (!desde || b.estado !== 'cancelado' && b.requiereCierre || (b.fechaFin || b.fechaInicio) >= desde) && (!hasta || b.fechaInicio <= hasta) &&
    `${b.titulo} ${b.motivo} ${textoRecintos(b)}`.toLowerCase().includes(filtro.toLowerCase()));

  return <section className="rounded-2xl border bg-white p-5 space-y-4" aria-busy={ocupado}>
    <header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Bloqueos de recintos</h2><p className="text-sm">Consulta el periodo, las afectaciones y el historial de cada bloqueo.</p></div>
      {!!permitidos.length && <button disabled={ocupado} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-50" onClick={() => abrir()}>Registrar bloqueo</button>}
    </header>
    <p className="text-sm text-neutral-600">Subdirección gestiona bloqueos institucionales. Administración gestiona mantenimiento y fuera de servicio. Las clases son informativas y se conservan en la agenda.</p>
    <div className="flex flex-wrap gap-3">
      <input className="rounded border p-2" aria-label="Buscar bloqueo" placeholder="Buscar bloqueo o motivo" value={filtro} onChange={e => setFiltro(e.target.value)} />
      <select aria-label="Estado del bloqueo" value={estado} onChange={e => setEstado(e.target.value)}><option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="cancelado">Cancelados o finalizados</option></select>
      <label>Desde<input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta<input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label>
    </div>
    {!filtrados.length && <p className="rounded-xl border border-dashed p-5 text-neutral-600">No hay bloqueos para los filtros seleccionados.</p>}
    {filtrados.map(b => <article key={b.id} className="rounded-xl border p-4">
      <h3 className="font-bold">{b.titulo} · {b.estado === 'cancelado' ? 'Cancelado o finalizado' : 'Activo'}</h3>
      <p>{b.tipo} · {textoRecintos(b)}</p><p>{periodo(b)}</p><p>{b.motivo}</p>
      {b.requiereCierre && b.estado !== 'cancelado' && <p className="mt-2 text-sm text-amber-800">El fin previsto no libera el recinto. Se necesita cancelar o finalizar el bloqueo.</p>}
      <button disabled={ocupado} className="mt-3 rounded border px-3 py-2" onClick={() => { setDetalle(b.id); setVersion(b.version || 1); setError(''); setCancelando(false); }}>Ver detalle del bloqueo</button>
    </article>)}
    {mensaje && <p role="status">{textoParaUsuario(mensaje)}</p>}
    {error && !b && !edicion && <p role="alert" className="text-rose-700">{textoParaUsuario(error)}</p>}

    {b && <VentanaModal estaAbierto titulo="Detalle de bloqueo" anchoMaximo="4xl" alCerrar={() => { if (!ocupado) { setDetalle(null); setCancelando(false); } }}>
      <h3 className="text-xl font-bold">{b.titulo}</h3><p>{b.tipo} · {textoRecintos(b)}</p><p>{periodo(b)}</p>
      <p className="my-3">{b.motivo}</p><p className="text-sm">Responsable: {b.creadoPor || 'Sin información disponible'}</p>
      <h4 className="mt-4 font-bold">Actividades pendientes de resolución</h4>
      {actividadesPendientes.length ? actividadesPendientes.map(({ evento, dia }) =>
        <p key={dia.id}>{evento} · {dia.fecha} {dia.horaInicio}-{dia.horaFin} · Pendiente de reprogramación</p>) : <p>No hay actividades pendientes para este bloqueo.</p>}
      <p className="my-3">Retirar o modificar el bloqueo no reactiva las actividades suspendidas. El Organizador o Subdirección deben resolverlas.</p>
      <h4 className="font-bold">Historial</h4>
      {b.historial?.length ? b.historial.map((h, i) => <p key={i}>{new Date(h.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · {h.responsable} · {h.accion} · {h.motivo}</p>) : <p>No hay movimientos adicionales registrados.</p>}
      {b.motivoCancelacion && <p>Motivo de cierre: {b.motivoCancelacion}</p>}
      {puedeTipo(b.tipo) && b.estado !== 'cancelado' && <div className="flex flex-wrap gap-3 mt-4">
        {!b.finalizadoEn && inicioEnMexico(b.fechaInicio, b.horaInicio) > Date.now() && <button disabled={ocupado} className="rounded border px-3 py-2" onClick={() => abrir(b)}>Modificar bloqueo</button>}
        <button disabled={ocupado} className="rounded border px-3 py-2" onClick={() => { setCancelando(true); setMotivo(''); }}>Cancelar o finalizar bloqueo</button>
      </div>}
      {cancelando && <form onSubmit={e => { e.preventDefault(); void cancelar(); }} className="mt-4">
        <fieldset disabled={ocupado}><label className="block">Motivo de cancelación o cierre<textarea required maxLength={2000} className="my-2 block border w-full p-2" value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
          <p className="text-sm">El cierre libera el recinto; las actividades suspendidas conservan su estado.</p>
          <button className="mt-3 rounded border p-2">{ocupado ? 'Guardando cierre…' : 'Confirmar cierre del bloqueo'}</button>
        </fieldset>
      </form>}
      {error && <p role="alert" className="mt-3 text-rose-700">{textoParaUsuario(error)}</p>}
      {mensaje && <p role="status" className="mt-3">{textoParaUsuario(mensaje)}</p>}
    </VentanaModal>}

    {edicion && <VentanaModal estaAbierto titulo={revision ? 'Revisión de afectaciones del bloqueo' : 'Formulario de bloqueo'} anchoMaximo="4xl" alCerrar={() => { if (!ocupado) { setEdicion(null); setRevision(null); } }}>
      {!revision ? <form onSubmit={e => { e.preventDefault(); void revisar(edicion); }}>
        <fieldset disabled={ocupado} className="space-y-3">
          <label className="block">Tipo de bloqueo<select className="block border w-full p-2" required value={edicion.tipo || ''} onChange={e => setEdicion({ ...edicion, tipo: e.target.value as BloqueoRecinto['tipo'] })}>{permitidos.map(tipo => <option key={tipo}>{tipo}</option>)}</select></label>
          <label className="block">Título<input required maxLength={200} className="block border w-full p-2" value={edicion.titulo} onChange={e => setEdicion({ ...edicion, titulo: e.target.value })} /></label>
          <label className="block">Motivo<textarea required maxLength={2000} className="block border w-full p-2" value={edicion.motivo} onChange={e => setEdicion({ ...edicion, motivo: e.target.value })} /></label>
          <fieldset><legend>Recintos afectados</legend>
            {idEdicion ? <select aria-label="Recinto afectado" className="border rounded p-2 w-full" value={edicion.idRecinto} onChange={e => setEdicion({ ...edicion, idRecinto: e.target.value, idsRecintos: [e.target.value] })}>{listaRecintos.filter(r => r.activo !== false).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select> : <>
              <label><input type="checkbox" checked={edicion.idRecinto === 'todos'} onChange={e => setEdicion({ ...edicion, idRecinto: e.target.checked ? 'todos' : '', idsRecintos: [] })} /> Todas las instalaciones</label>
              {edicion.idRecinto !== 'todos' && listaRecintos.filter(r => r.activo !== false).map(r => <label className="block" key={r.id}><input type="checkbox" checked={(edicion.idsRecintos || [edicion.idRecinto]).includes(r.id)} onChange={e => {
                const ids = edicion.idsRecintos || [edicion.idRecinto].filter(Boolean), nuevos = e.target.checked ? [...new Set([...ids, r.id])] : ids.filter(id => id !== r.id);
                setEdicion({ ...edicion, idRecinto: nuevos[0] || '', idsRecintos: nuevos });
              }} /> {r.nombre}</label>)}
              <p className="mt-2 text-sm text-neutral-600">Se guardará un bloqueo por recinto. La operación completa debe confirmarse para guardar los cambios.</p>
            </>}
          </fieldset>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            <label>Fecha de inicio<input aria-label="Fecha de inicio del bloqueo" type="date" required value={edicion.fechaInicio} onChange={e => setEdicion({ ...edicion, fechaInicio: e.target.value })} /></label>
            <label>Hora de inicio<input aria-label="Hora de inicio del bloqueo" type="time" required value={edicion.horaInicio} onChange={e => setEdicion({ ...edicion, horaInicio: e.target.value })} /></label>
            {!edicion.esIndefinido && <><label>Fecha prevista de cierre<input aria-label="Fecha de término del bloqueo" type="date" required value={edicion.fechaFin || ''} onChange={e => setEdicion({ ...edicion, fechaFin: e.target.value })} /></label><label>Hora prevista de cierre<input aria-label="Hora de término del bloqueo" type="time" required value={edicion.horaFin || ''} onChange={e => setEdicion({ ...edicion, horaFin: e.target.value })} /></label></>}
          </div>
          <label className="block"><input type="checkbox" checked={edicion.esIndefinido} onChange={e => setEdicion({ ...edicion, esIndefinido: e.target.checked })} /> Sin fecha prevista de cierre</label>
          {agendaRemota && <p className="text-sm text-amber-800">El cierre es manual: la fecha prevista es informativa. Se revisan también las actividades posteriores que podrían quedar afectadas hasta finalizar el bloqueo.</p>}
          <button className="mt-4 rounded-xl bg-[#7a132b] text-white px-4 py-2">{ocupado ? 'Consultando afectaciones…' : 'Revisar afectaciones'}</button>
        </fieldset>
      </form> : <>
        <p className="font-bold">{edicion.titulo} · {textoRecintos(edicion)}</p><p>{periodo(edicion)}</p><p>{edicion.motivo}</p>
        {revision.afectados?.length ? <><p className="my-3 text-amber-900">Estas actividades se suspenderán y quedarán pendientes de resolución.</p>{revision.afectados.map(a => <p key={a.idFecha}>{a.titulo} · {a.dia.fecha} {a.dia.horaInicio}-{a.dia.horaFin} · {a.organizador}</p>)}</> : <p className="my-3">No hay eventos autorizados afectados.</p>}
        {revision.advertencias?.map((aviso, i) => <p key={i} className="my-2 text-amber-800">{aviso}</p>)}
        <p className="my-3 text-sm">Se conservan boletos y reservaciones confirmadas. Se liberan los apartados temporales de las actividades suspendidas. Confirmar vuelve a consultar los datos actuales del servidor.</p>
        <div className="flex flex-wrap gap-3"><button disabled={ocupado} className="rounded border p-2" onClick={() => setRevision(null)}>Volver a editar</button><button disabled={ocupado} className="rounded bg-[#7a132b] text-white p-2 disabled:opacity-50" onClick={() => void guardar()}>{ocupado ? 'Guardando bloqueo…' : idEdicion ? 'Confirmar modificación' : 'Confirmar bloqueo'}</button></div>
      </>}
      {error && <p role="alert" className="my-3 text-rose-700">{textoParaUsuario(error)}</p>}
    </VentanaModal>}
  </section>;
}
