import React, { useState } from 'react';
import { Calendar, Building2, Clock, ListChecks, CheckCircle2, AlertTriangle, Pencil, Trash2, ChevronLeft, ChevronRight, Users, MapPin, DoorOpen, Monitor, Landmark, Check } from 'lucide-react';
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
const iconosRecinto = { auditorio: Landmark, sala: DoorOpen, laboratorio: Monitor } as const;

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
  const seleccionarPaso = (indicePaso: number) => {
    setPaso(indicePaso);
    setError('');
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

  return <section aria-label={`Programación del ${nombre}`} className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 bg-[#7a132b] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2"><span className="rounded-full bg-white/15 px-2.5 py-1 text-sm font-bold text-white">{nombre}</span><span className="text-sm text-white/80">{resumenVigente ? 'Resumen del día' : pasos[paso].nombre}</span></div>
      <span className="flex items-center gap-1.5 text-sm text-white/80"><Calendar aria-hidden="true" className="h-4 w-4" />{dia.fecha || 'Elige una fecha'}</span>
    </header>
    <div className="space-y-5 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-bold text-neutral-900">{resumenVigente ? `Detalles del ${nombre.toLowerCase()}` : `Programa el ${nombre.toLowerCase()}`}</h3><p className="mt-1 text-sm text-neutral-600">{resumenVigente ? 'Revisa la información y edítala si necesitas hacer algún cambio.' : 'Selecciona cada paso para capturar y revisar la información.'}</p></div>
      <div className="flex flex-wrap gap-2">
        {resumenVigente && <button type="button" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => { setResumido(false); setPaso(0); }}><Pencil aria-hidden="true" className="h-4 w-4" />Editar {nombre}</button>}
        {puedeEliminar && <button type="button" aria-label={`Eliminar ${nombre}`} onClick={alEliminar} className="rounded-lg border border-rose-200 p-2 text-rose-700"><Trash2 aria-hidden="true" className="h-5 w-5" /></button>}
      </div>
    </div>
    {urgente && <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />Faltan menos de 7 días. La solicitud requiere justificar la urgencia.</p>}
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
      <nav aria-label={`Pasos del ${nombre}`}><ol className="flex items-start gap-0">{pasos.map(({ nombre: titulo, icono: Icono }, i) => <React.Fragment key={titulo}><li className="flex min-w-0 flex-1 flex-col items-center"><button type="button" aria-label={`Ir al paso ${i + 1}: ${titulo}`} aria-current={paso === i ? 'step' : undefined} onClick={() => seleccionarPaso(i)} className="group flex w-full min-w-0 flex-col items-center gap-1.5 rounded-lg px-0.5 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b]"><span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${i < paso ? 'border-[#7a132b] bg-[#7a132b] text-white' : paso === i ? 'border-[#7a132b] bg-white text-[#7a132b]' : 'border-neutral-300 bg-white text-neutral-400 group-hover:border-[#7a132b]/60'}`}>{i < paso ? <Check aria-hidden="true" className="h-4 w-4" /> : <Icono aria-hidden="true" className="h-4 w-4" />}</span><span className={`text-[11px] font-semibold leading-tight sm:text-xs ${paso === i ? 'text-[#7a132b]' : 'text-neutral-500 group-hover:text-[#7a132b]'}`}>{titulo}</span></button></li>{i < pasos.length - 1 && <li aria-hidden="true" className={`mt-[18px] h-0.5 min-w-2 flex-1 ${i < paso ? 'bg-[#7a132b]' : 'bg-neutral-200'}`} />}</React.Fragment>)}</ol></nav>
      {paso === 0 && <div className="space-y-4"><p className="text-sm text-neutral-600">Selecciona la fecha en el calendario. Los días ocupados y los bloqueos se muestran para el recinto y el horario actuales.</p><CalendarioRecinto key={dia.fecha.slice(0, 7)} idRecinto={dia.idRecinto} fechaSeleccionada={dia.fecha} horaInicio={dia.horaInicio} horaFin={dia.horaFin} soloFechasFuturas alSeleccionarFecha={fecha => cambiar({ fecha })} /></div>}
      {paso === 1 && <div className="space-y-4"><p className="text-sm text-neutral-600">Elige el espacio para la fecha seleccionada. La disponibilidad se calcula con el horario actual.</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{listaRecintos.filter(r => r.activo !== false).map(r => { const seleccionado = dia.idRecinto === r.id; const Icono = iconosRecinto[r.tipo as keyof typeof iconosRecinto] || Building2; const d = horarioValido ? verificarDisponibilidadRecinto(r.id, dia.fecha, dia.horaInicio, dia.horaFin) : undefined; return <button key={r.id} type="button" aria-pressed={seleccionado} onClick={() => cambiar({ idRecinto: r.id, distribucion: undefined, distribucionConfirmada: false })} className={`rounded-xl border-2 p-4 text-left transition-colors ${seleccionado ? 'border-[#7a132b] bg-[#7a132b]/5' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white'}`}><span className="flex items-start justify-between gap-3"><span className="flex items-start gap-3"><Icono aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${seleccionado ? 'text-[#7a132b]' : 'text-neutral-500'}`} /><span><span className={`block text-sm font-bold ${seleccionado ? 'text-[#7a132b]' : 'text-neutral-800'}`}>{r.nombre}</span><span className="mt-1 block text-xs capitalize text-neutral-500">{r.tipo} · capacidad {r.capacidad} personas</span>{r.ubicacion && <span className="mt-1 block text-xs text-neutral-500">{r.ubicacion}</span>}<span className={`mt-2 block text-xs font-semibold ${d?.disponible ? 'text-emerald-700' : d ? 'text-rose-700' : 'text-neutral-500'}`}>{d ? d.disponible ? 'Disponible en el horario actual' : `Conflicto: ${d.tituloConflicto || 'revisar horario'}` : 'Selecciona primero un horario'}</span></span></span>{seleccionado && <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#7a132b]" />}</span></button>; })}</div>{estadoDisponibilidad}</div>}
      {paso === 2 && <div className="space-y-4"><p className="text-sm text-neutral-600">Define el horario para el <span className="font-semibold text-neutral-800">{dia.fecha}</span> en <span className="font-semibold text-neutral-800">{recinto?.nombre || 'el recinto seleccionado'}</span>.</p><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-neutral-700">Hora de inicio *<input aria-label={`Hora de inicio del ${nombre}`} className={campo} type="time" value={dia.horaInicio} onChange={e => cambiar({ horaInicio: e.target.value })} /></label><label className="text-sm font-semibold text-neutral-700">Hora de término *<input aria-label={`Hora de término del ${nombre}`} className={campo} type="time" value={dia.horaFin} onChange={e => cambiar({ horaFin: e.target.value })} /></label></div>{Number.isFinite(inicio) && Number.isFinite(fin) && fin > inicio && <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Clock aria-hidden="true" className="h-4 w-4 shrink-0" /><span>Duración: {Math.floor((fin - inicio) / 3600000)} h {Math.floor((fin - inicio) % 3600000 / 60000) || ''}{Math.floor((fin - inicio) % 3600000 / 60000) ? ' min' : ''}</span></p>}{dia.horaFin <= dia.horaInicio && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">La hora de término debe ser posterior a la hora de inicio.</p>}{estadoDisponibilidad}<p className="text-sm text-neutral-600">Se toma en cuenta el margen de 30 minutos entre eventos para liberar el recinto.</p></div>}
      {paso === 3 && <div className="space-y-5">{modalidad === 'controlado' && recinto && <DistribucionSolicitud key={dia.id + dia.idRecinto} dia={dia} recinto={recinto} alGuardar={alCambiar} />}<EditorPrograma nombreDia={nombre} programa={dia.programa || []} textoAnterior={dia.actividadOPrograma} alCambiar={programa => cambiar({ programa })} />{estadoDisponibilidad}</div>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4"><button type="button" disabled={paso === 0} className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => seleccionarPaso(paso - 1)}><ChevronLeft aria-hidden="true" className="h-4 w-4" />Anterior</button><button type="button" onClick={avanzar} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#7a132b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#651024]">{paso === 3 ? <><Check aria-hidden="true" className="h-4 w-4" />Guardar {nombre}</> : <>Siguiente<ChevronRight aria-hidden="true" className="h-4 w-4" /></>}</button></footer>
    </div>}
    </div>
  </section>;
}
