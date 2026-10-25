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
  const resumenVigente = resumido && !errorDia && !errorLugares && disponibilidad?.disponible;
  const urgente = esFechaUrgente(dia);
  const conflicto = disponibilidad && !disponibilidad.disponible ? "El recinto está ocupado. Elige otro recinto o modifica la fecha y el horario." : undefined;
  const duracionMinutos = Number.isFinite(inicio) && Number.isFinite(fin) ? Math.round((fin - inicio) / 60000) : 0;
  const fechaLegible = Number.isFinite(inicio)
    ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full' }).format(inicio) : 'Fecha por definir';

  const cambiar = (cambios: Partial<ElementoFechaSolicitada>) => {
    setError('');
    alCambiar({ ...dia, ...cambios });
  };
  const pasosCompletos = [
    Boolean(dia.fecha >= fechaHoyMexico() && Number.isFinite(inicioEnMexico(dia.fecha, '00:00'))),
    Boolean(recinto && recinto.activo !== false && aforo <= recinto.capacidad && disponibilidad?.disponible),
    Boolean(horarioValido && disponibilidad?.disponible),
    Boolean(!errorDia && !errorLugares && disponibilidad?.disponible),
  ];
  const seleccionarPaso = (indicePaso: number) => {
    setPaso(indicePaso);
    setError('');
  };
  const avanzar = () => {
    const fallo = paso === 0
      ? (!Number.isFinite(inicioEnMexico(dia.fecha, '00:00')) || dia.fecha < fechaHoyMexico() ? 'Elige hoy o una fecha futura. En el paso Horario podrás ajustar las horas.' : undefined)
      : paso === 1
        ? (!recinto || recinto.activo === false ? 'Selecciona un recinto activo.' : aforo > recinto.capacidad ? 'El recinto no tiene capacidad para el aforo solicitado. Elige uno más grande o ajusta el aforo.' : conflicto)
        : paso === 2
          ? validarProgramacion([{ ...dia, programa: undefined, actividadOPrograma: undefined }], listaRecintos, { modalidad, aforo }) || conflicto
          : errorDia || errorLugares || conflicto;
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
    {!resumenVigente && <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600" aria-label="Tu selección del día"><span className="flex items-center gap-2"><Calendar aria-hidden="true" className="h-4 w-4 text-[#7a132b]" /><span>Fecha seleccionada: <strong className="text-neutral-800">{dia.fecha || 'Por elegir'}</strong></span></span><span className="flex items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4 text-[#7a132b]" />{recinto?.nombre || 'Recinto por elegir'}</span><span className="flex items-center gap-2"><Clock aria-hidden="true" className="h-4 w-4 text-[#7a132b]" />{dia.horaInicio} a {dia.horaFin} h</span></div>}
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
      <nav aria-label={`Pasos del ${nombre}`}><ol className="flex items-start gap-0">{pasos.map(({ nombre: titulo, icono: Icono }, i) => <React.Fragment key={titulo}><li className="flex min-w-0 flex-1 flex-col items-center"><button type="button" aria-label={`Ir al paso ${i + 1}: ${titulo}`} aria-current={paso === i ? 'step' : undefined} onClick={() => seleccionarPaso(i)} className="group flex w-full min-w-0 flex-col items-center gap-1.5 rounded-lg px-0.5 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b]"><span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${(i !== paso && pasosCompletos[i]) ? 'border-[#7a132b] bg-[#7a132b] text-white' : paso === i ? 'border-[#7a132b] bg-white text-[#7a132b]' : 'border-neutral-300 bg-white text-neutral-400 group-hover:border-[#7a132b]/60'}`}>{(i !== paso && pasosCompletos[i]) ? <Check aria-hidden="true" className="h-4 w-4" /> : <Icono aria-hidden="true" className="h-4 w-4" />}</span><span className={`text-[11px] font-semibold leading-tight sm:text-xs ${paso === i ? 'text-[#7a132b]' : 'text-neutral-500 group-hover:text-[#7a132b]'}`}>{titulo}</span></button></li>{i < pasos.length - 1 && <li aria-hidden="true" className={`mt-[18px] h-0.5 min-w-2 flex-1 ${(i !== paso && pasosCompletos[i]) ? 'bg-[#7a132b]' : 'bg-neutral-200'}`} />}</React.Fragment>)}</ol></nav>
      {paso === 0 && <div className="space-y-4"><p className="text-sm text-neutral-600">Selecciona la fecha en el calendario. Los días ocupados y los bloqueos se muestran para el recinto y el horario actuales.</p><CalendarioRecinto key={dia.fecha.slice(0, 7)} idRecinto={dia.idRecinto} fechaSeleccionada={dia.fecha} horaInicio={dia.horaInicio} horaFin={dia.horaFin} soloFechasFuturas alSeleccionarFecha={fecha => cambiar({ fecha })} /></div>}
      {paso === 1 && <div className="space-y-4">
        <p className="text-sm text-neutral-600">Elige un recinto para ver su capacidad, equipo y disponibilidad.</p>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-2" aria-label="Recintos disponibles">
            {listaRecintos.filter((r, indiceRecinto, lista) => r.activo !== false && lista.findIndex(otro => otro.codigo === r.codigo && otro.activo !== false) === indiceRecinto).map(r => {
              const seleccionado = dia.idRecinto === r.id || recinto?.codigo === r.codigo;
              const Icono = iconosRecinto[r.tipo as keyof typeof iconosRecinto] || Building2;
              const consulta = horarioValido ? verificarDisponibilidadRecinto(r.id, dia.fecha, dia.horaInicio, dia.horaFin) : undefined;
              return <button key={r.id} type="button" aria-pressed={seleccionado} onClick={() => cambiar({ idRecinto: r.id, distribucion: undefined, distribucionConfirmada: false })}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#7a132b] ${seleccionado ? 'border-[#7a132b]/35 bg-[#7a132b]/5' : 'border-transparent bg-neutral-50 hover:bg-neutral-100'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${seleccionado ? 'bg-[#7a132b] text-white' : 'bg-white text-neutral-500'}`}><Icono aria-hidden="true" className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-neutral-800">{r.nombre}</span><span className="mt-0.5 block text-xs text-neutral-500">{r.capacidad} personas</span></span>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${consulta?.disponible ? 'bg-emerald-50 text-emerald-800' : consulta ? 'bg-rose-50 text-rose-800' : 'bg-neutral-100 text-neutral-500'}`}>{consulta ? consulta.disponible ? 'Libre' : 'Ocupado' : 'Por consultar'}</span>
              </button>;
            })}
          </div>
          {recinto && <aside className="rounded-2xl bg-[#f5f3f0] p-5 sm:p-6" aria-label="Detalle del recinto seleccionado">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#7a132b]"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Recinto seleccionado</div>
            <h4 className="text-xl font-bold tracking-tight">{recinto.nombre}</h4>
            <p className="mt-2 flex items-start gap-2 text-sm text-neutral-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{recinto.ubicacion}</p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">{recinto.descripcion}</p>
            <div className="my-5 flex items-center gap-4 rounded-xl bg-white p-4"><Users className="h-6 w-6 text-[#7a132b]" aria-hidden="true" /><div><p className="text-lg font-bold">{recinto.capacidad} personas</p><p className={`text-xs ${aforo > recinto.capacidad ? 'font-bold text-rose-700' : 'text-neutral-500'}`}>Solicitas {aforo} lugares{aforo > recinto.capacidad ? ': elige un recinto con más capacidad' : ''}</p></div></div>
            <h5 className="text-sm font-semibold">Equipo del recinto</h5><ul className="mt-2 space-y-2">{recinto.equipamiento.map(equipo => <li key={equipo} className="flex gap-2 text-sm text-neutral-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7a132b]" aria-hidden="true" />{equipo}</li>)}</ul>
          </aside>}
        </div>
        {estadoDisponibilidad}
      </div>}
      {paso === 2 && <div className="space-y-5">
        <p className="text-sm text-neutral-600">Define el horario de tu evento. Se considera el margen de 30 minutos entre eventos.</p>
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold text-neutral-700">Hora de inicio *<input aria-label={`Hora de inicio del ${nombre}`} className={campo} type="time" value={dia.horaInicio} onChange={e => cambiar({ horaInicio: e.target.value })} /></label>
          <label className="text-sm font-semibold text-neutral-700">Hora de término *<input aria-label={`Hora de término del ${nombre}`} className={campo} type="time" value={dia.horaFin} onChange={e => cambiar({ horaFin: e.target.value })} /></label>
          <div className="flex min-h-12 items-center gap-3 rounded-xl bg-[#7a132b]/5 px-4 py-2.5 text-[#7a132b]" role="status"><Clock className="h-5 w-5" aria-hidden="true" /><div><p className="text-xs">Duración</p><p className="whitespace-nowrap text-sm font-bold">{duracionMinutos > 0 ? `${Math.floor(duracionMinutos / 60)} h${duracionMinutos % 60 ? ` ${duracionMinutos % 60} min` : ''}` : 'Revisa el horario'}</p></div></div>
        </div>
        {dia.horaFin <= dia.horaInicio && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">La hora de término debe ser posterior a la hora de inicio.</p>}
        {estadoDisponibilidad}
      </div>}
      {paso === 3 && <div className="space-y-5">{modalidad === 'controlado' && recinto && <DistribucionSolicitud key={dia.id + dia.idRecinto} dia={dia} recinto={recinto} alGuardar={alCambiar} />}<EditorPrograma nombreDia={nombre} programa={dia.programa || []} textoAnterior={dia.actividadOPrograma} alCambiar={programa => cambiar({ programa })} />{estadoDisponibilidad}</div>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4"><button type="button" disabled={paso === 0} className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => seleccionarPaso(paso - 1)}><ChevronLeft aria-hidden="true" className="h-4 w-4" />Anterior</button><button type="button" onClick={avanzar} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#7a132b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#651024]">{paso === 3 ? <><Check aria-hidden="true" className="h-4 w-4" />Guardar {nombre}</> : <>Siguiente<ChevronRight aria-hidden="true" className="h-4 w-4" /></>}</button></footer>
    </div>}
    </div>
  </section>;
}
