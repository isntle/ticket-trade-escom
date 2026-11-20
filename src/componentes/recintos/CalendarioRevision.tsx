import React, { useEffect, useRef, useState } from 'react';
import { useDatos } from '../../contextos/DatosContexto';
import { useAutenticacion } from '../../contextos/AutenticacionContexto';
import { textoParaUsuario } from '../../utilidades/textoParaUsuario';

export function ConfiguracionCalendarioRevision() {
  const { calendarioRevision, guardarCalendarioRevision, agendaRemota } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const [dias, setDias] = useState(calendarioRevision?.diasLaborables || [1, 2, 3, 4, 5]);
  const [fechas, setFechas] = useState(calendarioRevision?.diasInhabiles.join('\n') || '');
  const [version, setVersion] = useState(calendarioRevision?.version || 0);
  const [editado, setEditado] = useState(false), [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(''), [mensaje, setMensaje] = useState('');
  const pendiente = useRef(false);
  const firma = JSON.stringify(calendarioRevision);
  useEffect(() => {
    if (editado || pendiente.current) return;
    setDias(calendarioRevision?.diasLaborables || [1, 2, 3, 4, 5]);
    setFechas(calendarioRevision?.diasInhabiles.join('\n') || '');
    setVersion(calendarioRevision?.version || 0);
  }, [firma, editado, guardando]);
  if (!usuarioActual?.roles.includes('admin')) return null;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendiente.current) return;
    pendiente.current = true; setGuardando(true); setError(''); setMensaje('');
    try {
      const resultado = await guardarCalendarioRevision({ diasLaborables: dias, diasInhabiles: fechas.split(/[\s,]+/).filter(Boolean),
        responsable: '', fechaConfiguracion: '', version });
      if (!resultado.exito) { setError(resultado.error || 'No se pudo guardar el calendario.'); return; }
      setEditado(false);
      setMensaje(resultado.advertencia || (agendaRemota ? 'Calendario guardado en el servidor. Los plazos de las solicitudes anteriores se conservaron.' : 'Calendario guardado en este navegador. Los plazos anteriores se conservaron.'));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el calendario.'); }
    finally { pendiente.current = false; setGuardando(false); }
  };
  const cambiar = () => { setEditado(true); setError(''); setMensaje(''); };
  return <details className="my-6 rounded-2xl border bg-white p-5">
    <summary className="font-bold cursor-pointer">Calendario hábil de revisión · {calendarioRevision?.version ? 'Configurado' : calendarioRevision ? 'Calendario institucional' : 'Requiere configuración'}</summary>
    <p className="my-3 text-sm">Define días laborables y fechas inhábiles. Los cambios se aplican a nuevas solicitudes; los plazos de las solicitudes ya enviadas se conservan.</p>
    {calendarioRevision?.fechaConfiguracion && <p className="mb-3 text-sm text-neutral-600">Última actualización: {new Date(calendarioRevision.fechaConfiguracion).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · {calendarioRevision.responsable}</p>}
    {editado && (calendarioRevision?.version || 0) !== version && <p role="alert" className="my-3 text-amber-800">Otra sesión cambió el calendario. Tu captura se conserva; vuelve a consultar antes de guardar.</p>}
    <form onSubmit={guardar} aria-busy={guardando}>
      <fieldset disabled={guardando} className="space-y-3">
        <legend className="font-semibold">Días laborables</legend>
        <div className="flex flex-wrap gap-4">{['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((nombre, i) =>
          <label key={i}><input type="checkbox" checked={dias.includes(i)} onChange={e => { cambiar(); setDias(e.target.checked ? [...dias, i] : dias.filter(d => d !== i)); }} /> {nombre}</label>)}</div>
        <label className="block mt-4">Fechas inhábiles (AAAA-MM-DD, una por línea)
          <textarea aria-label="Fechas inhábiles" className="block w-full border rounded p-2" rows={3} value={fechas} onChange={e => { cambiar(); setFechas(e.target.value); }} />
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="mt-3 rounded-xl bg-[#7a132b] text-white px-4 py-2 font-bold" disabled={guardando}>{guardando ? 'Guardando calendario…' : 'Guardar calendario'}</button>
          {editado && <button type="button" className="mt-3 rounded-xl border px-4 py-2" onClick={() => { setEditado(false); setError(''); setMensaje('Se recuperó el último calendario consultado.'); }}>Restablecer captura</button>}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-rose-700">{textoParaUsuario(error)}</p>}
      {mensaje && <p role="status" className="mt-3">{textoParaUsuario(mensaje)}</p>}
    </form>
  </details>;
}
