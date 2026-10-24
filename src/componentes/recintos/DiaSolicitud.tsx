import React, { useState } from 'react';
import { Calendar, Building2, Clock, ListChecks, CheckCircle2, AlertTriangle, Pencil, Trash2, ChevronLeft, ChevronRight, Users, MapPin } from 'lucide-react';
import { useDatos } from '../../contextos/DatosContexto';
import { CalendarioRecinto } from '../calendario/CalendarioRecinto';
import { DistribucionSolicitud } from './DistribucionSolicitud';
import { EditorPrograma, ProgramaDia } from '../eventos/EditorPrograma';
import { esFechaUrgente, fechaHoyMexico, inicioEnMexico, validarProgramacion } from '../../dominio/solicitudes';
import { validarDistribuciones } from '../../dominio/distribucionSolicitud';
import type { ElementoFechaSolicitada, ModalidadAsistencia } from '../../tipos';

const pasos = [
  { nombre: 'Fecha', icono: Calendar },
  { nombre: 'Recinto', icono: Building2 },
  { nombre: 'Horario', icono: Clock },
  { nombre: 'Programa y lugares', icono: ListChecks },
];
const modalidades = { controlado: 'Acceso con boleto y lugar asignado', libre: 'Entrada libre', registro: 'Registro de asistencia' };
const campo = 'mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7a132b]/30';

export function DiaSolicitud({ dia, indice, modalidad, aforo, puedeEliminar, alCambiar, alEliminar }: {
  dia: ElementoFechaSolicitada; indice: number; modalidad: ModalidadAsistencia; aforo: number;
  puedeEliminar: boolean; alCambiar: (dia: ElementoFechaSolicitada) => void; alEliminar: () => void;
}) {
  const { listaRecintos, verificarDisponibilidadRecinto } = useDatos();
  const [paso, setPaso] = useState(() => new URLSearchParams(window.location.search).get('distribucion') === '1' && indice === 0 ? 3 : 0);
  const [resumido, setResumido] = useState(false);
  const [error, setError] = useState('');
  const nombre = dia.nombreDia || `Día ${indice + 1}`;
  const recinto = listaRecintos.find(r => r.id === dia.idRecinto);
  const inicio = inicioEnMexico(dia.fecha, dia.horaInicio);
  const fin = inicioEnMexico(dia.fecha, dia.horaFin);
  const horarioValido = Number.isFinite(inicio) && Number.isFinite(fin) && fin > inicio && inicio > Date.now();
  const disponibilidad = horarioValido && recinto
    ? verificarDisponibilidadRecinto(dia.idRecinto, dia.fecha, dia.horaInicio, dia.horaFin) : undefined;
  const errorDia = validarProgramacion([dia], listaRecintos, { modalidad, aforo });
  const errorLugares = validarDistribuciones({ fechasSolicitadas: [dia], modalidadAsistencia: modalidad, asistenciaEstimada: aforo }, listaRecintos);
  const resumenVigente = resumido && !errorDia && !errorLugares;
  const urgente = esFechaUrgente(dia);
  const fechaLegible = Number.isFinite(inicio)
    ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full' }).format(inicio) : 'Fecha por definir';

  const cambiar = (cambios: Partial<ElementoFechaSolicitada>) => {
    setError('');
    alCambiar({ ...dia, ...cambios });
  };
  const avanzar = () => {
    const fallo = paso === 0
      ? (!Number.isFinite(inicioEnMexico(dia.fecha, '00:00')) || dia.fecha < fechaHoyMexico() ? 'Elige hoy o una fecha futura. En el paso Horario podrás ajustar las horas.' : undefined)
      : paso === 1
        ? (!recinto || recinto.activo === false ? 'Selecciona un recinto activo.' : undefined)
        : paso === 2
          ? validarProgramacion([{ ...dia, programa: undefined, actividadOPrograma: undefined }], listaRecintos, { modalidad, aforo })
          : errorDia || errorLugares;
    if (fallo) { setError(fallo); return; }
    setError('');
    if (paso < pasos.length - 1) setPaso(paso + 1);
    else setResumido(true);
  };
  const estadoDisponibilidad = <div role="status" aria-live="polite" className={`rounded-xl border p-4 text-sm ${!disponibilidad ? 'border-neutral-200 bg-neutral-50 text-neutral-600' : disponibilidad.disponible ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
    <p className="flex items-center gap-2 font-bold">{disponibilidad?.disponible ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" /> : <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />}
      {!disponibilidad ? 'Completa una fecha y un horario futuros' : disponibilidad.disponible ? 'Recinto disponible para este horario' : 'El recinto no está disponible para este horario'}
    </p>
    <p className="mt-2">{disponibilidad ? `${recinto?.nombre} · ${dia.fecha} · ${dia.horaInicio} a ${dia.horaFin} h.` : 'La consulta se actualiza al cambiar la fecha, el recinto o las horas.'}</p>
    {disponibilidad && !disponibilidad.disponible && <p className="mt-2">{disponibilidad.motivo}</p>}
    <p className="mt-2">Se revisan eventos, clases, actividades internas y bloqueos registrados. Consultar disponibilidad no reserva el espacio. Los conflictos deben resolverse antes de autorizar la solicitud.</p>
  </div>;

  return <section aria-label={`Programación del ${nombre}`} className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-bold text-neutral-900">{nombre}</h3><p className="mt-1 text-sm text-neutral-600">{resumenVigente ? 'Revisa la programación que se incluirá en tu solicitud.' : 'Elige la fecha, consulta el recinto y prepara el programa de este día.'}</p></div>
      <div className="flex flex-wrap gap-2">
        {resumenVigente && <button type="button" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => { setResumido(false); setPaso(0); }}><Pencil aria-hidden="true" className="h-4 w-4" />Editar {nombre}</button>}
        {puedeEliminar && <button type="button" aria-label={`Eliminar ${nombre}`} onClick={alEliminar} className="rounded-lg border border-rose-200 p-2 text-rose-700"><Trash2 aria-hidden="true" className="h-5 w-5" /></button>}
      </div>
    </header>
    {urgente && <p className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />Faltan menos de 7 días. La solicitud requiere justificar la urgencia.</p>}
    {resumenVigente ? <div className="space-y-5">
      <dl className="grid gap-5 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-2">
        <div><dt className="flex items-center gap-2 font-semibold text-neutral-600"><Calendar className="h-4 w-4" />Fecha</dt><dd className="mt-1 text-base font-semibold capitalize">{fechaLegible}</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold text-neutral-600"><Clock className="h-4 w-4" />Horario</dt><dd className="mt-1 text-base font-semibold">{dia.horaInicio} a {dia.horaFin} h</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold text-neutral-600"><MapPin className="h-4 w-4" />Recinto solicitado</dt><dd className="mt-1 text-base font-semibold">{recinto?.nombre}</dd><dd className="mt-1 text-neutral-600">Capacidad: {recinto?.capacidad} personas</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold text-neutral-600"><Users className="h-4 w-4" />Asistencia</dt><dd className="mt-1 text-base font-semibold">{aforo} personas solicitadas</dd><dd className="mt-1 text-neutral-600">{modalidades[modalidad]}</dd></div>
      </dl>
      {estadoDisponibilidad}
      <div><h4 className="font-bold">Programa del {nombre}</h4>{dia.programa?.length ? <ProgramaDia programa={dia.programa} /> : <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{dia.actividadOPrograma || 'No se han añadido actividades al programa.'}</p>}</div>
      {modalidad === 'controlado' && <p className="flex items-center gap-2 text-sm text-neutral-700"><ListChecks className="h-5 w-5" />Distribución confirmada: {dia.distribucion?.filter(l => !l.estaBloqueado && !l.estaEliminado).length || 0} lugares habilitados.</p>}
    </div> : <div className="space-y-5">
      <ol aria-label={`Pasos del ${nombre}`} className="grid grid-cols-2 gap-2 sm:grid-cols-4">{pasos.map(({ nombre: titulo, icono: Icono }, i) => <li key={titulo} aria-current={paso === i ? 'step' : undefined} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${paso === i ? 'border-[#7a132b] bg-[#7a132b]/5 font-bold text-[#7a132b]' : 'border-neutral-200 text-neutral-500'}`}><Icono aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{i + 1}. {titulo}</span></li>)}</ol>
      {paso === 0 && <div className="grid gap-5 lg:grid-cols-2">
        <div><label className="block text-sm font-semibold">Fecha del {nombre}<input aria-label={`Fecha del ${nombre}`} className={campo} type="date" min={fechaHoyMexico()} value={dia.fecha} onChange={e => cambiar({ fecha: e.target.value })} /></label><p className="mt-3 text-sm text-neutral-600">El calendario muestra {recinto?.nombre || 'el recinto seleccionado'} de {dia.horaInicio} a {dia.horaFin} h. En los siguientes pasos puedes cambiar el recinto y el horario.</p></div>
        <CalendarioRecinto key={dia.fecha.slice(0, 7)} idRecinto={dia.idRecinto} fechaSeleccionada={dia.fecha} horaInicio={dia.horaInicio} horaFin={dia.horaFin} soloFechasFuturas alSeleccionarFecha={fecha => cambiar({ fecha })} />
      </div>}
      {paso === 1 && <div className="space-y-4"><p className="text-sm text-neutral-600">Disponibilidad para el {dia.fecha}, de {dia.horaInicio} a {dia.horaFin} h. Si hay un conflicto puedes probar otro horario en el siguiente paso.</p>
        <label className="block text-sm font-semibold">Recinto del {nombre}<select aria-label={`Recinto del ${nombre}`} value={dia.idRecinto} className={campo} onChange={e => cambiar({ idRecinto: e.target.value, distribucion: undefined, distribucionConfirmada: false })}>{listaRecintos.filter(r => r.activo !== false).map(r => { const d = horarioValido ? verificarDisponibilidadRecinto(r.id, dia.fecha, dia.horaInicio, dia.horaFin) : undefined; return <option key={r.id} value={r.id}>{r.nombre} · {r.capacidad} personas{d ? d.disponible ? ' · Disponible' : ' · Con conflicto' : ''}</option>; })}</select></label>{estadoDisponibilidad}
      </div>}
      {paso === 2 && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Hora de inicio<input aria-label={`Hora de inicio del ${nombre}`} className={campo} type="time" value={dia.horaInicio} onChange={e => cambiar({ horaInicio: e.target.value })} /></label><label className="text-sm font-semibold">Hora de término<input aria-label={`Hora de término del ${nombre}`} className={campo} type="time" value={dia.horaFin} onChange={e => cambiar({ horaFin: e.target.value })} /></label></div>{estadoDisponibilidad}<p className="text-sm text-neutral-600">Entre eventos se considera el margen de 30 minutos establecido para liberar el recinto.</p><CalendarioRecinto key={dia.fecha.slice(0, 7)} idRecinto={dia.idRecinto} fechaSeleccionada={dia.fecha} horaInicio={dia.horaInicio} horaFin={dia.horaFin} soloFechasFuturas alSeleccionarFecha={fecha => cambiar({ fecha })} /></div>}
      {paso === 3 && <div className="space-y-5">{modalidad === 'controlado' && recinto && <DistribucionSolicitud key={dia.id + dia.idRecinto} dia={dia} recinto={recinto} alGuardar={alCambiar} />}<EditorPrograma nombreDia={nombre} programa={dia.programa || []} textoAnterior={dia.actividadOPrograma} alCambiar={programa => cambiar({ programa })} />{estadoDisponibilidad}</div>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <footer className="flex flex-wrap justify-between gap-3 border-t pt-4"><button type="button" disabled={paso === 0} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40" onClick={() => { setPaso(paso - 1); setError(''); }}><ChevronLeft className="h-4 w-4" />Anterior</button><button type="button" onClick={avanzar} className="inline-flex items-center gap-2 rounded-lg bg-[#7a132b] px-4 py-2 text-sm font-bold text-white">{paso === 3 ? 'Guardar programación del día' : 'Siguiente'}{paso === 3 ? <CheckCircle2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button></footer>
    </div>}
  </section>;
}
