import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Ban,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  Shield,
  FileText,
  Monitor,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { VentanaModal } from '../componentes/ui/VentanaModal';
import { VisorDisponibilidadRecintos } from '../componentes/recintos/VisorDisponibilidadRecintos';
import { SolicitudEvento, Recinto } from '../tipos';

interface PropiedadesPanelSubdireccion {
  navigate: (ruta: string) => void;
  initialTab?: 'solicitudes' | 'agenda' | 'bloqueos' | 'evento_directo';
}

export const PanelSubdireccionPagina: React.FC<PropiedadesPanelSubdireccion> = ({ navigate, initialTab = 'solicitudes' }) => {
  const {
    listaSolicitudes,
    listaRecintos,
    listaBloqueos,
    dictaminarSolicitud,
    crearBloqueoRecinto,
    eliminarBloqueoRecinto,
    crearEventoInstitucionalDirecto,
    obtenerAgendaMultiRecinto,
    verificarDisponibilidadRecinto
  } = useDatos();

  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [pestañaActiva, setPestañaActiva] = useState<'solicitudes' | 'agenda' | 'bloqueos' | 'evento_directo'>(initialTab);

  useEffect(() => {
    setPestañaActiva(initialTab);
  }, [initialTab]);

  const cambiarPestaña = (pestaña: 'solicitudes' | 'agenda' | 'bloqueos' | 'evento_directo') => {
    setPestañaActiva(pestaña);
    navigate(`/subdireccion?tab=${pestaña}`);
  };

  // Estados para dictamen de solicitud
  const [solicitudParaDictaminar, setSolicitudParaDictaminar] = useState<SolicitudEvento | null>(null);
  const [decisionDictamen, setDecisionDictamen] = useState<'autorizada' | 'rechazada'>('autorizada');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Estados para nuevo bloqueo de recinto
  const [modalNuevoBloqueo, setModalNuevoBloqueo] = useState(false);
  const [tipoAlcanceBloqueo, setTipoAlcanceBloqueo] = useState<'individual' | 'multiple' | 'todos'>('individual');
  const [recintoBloqueo, setRecintoBloqueo] = useState('rec-auditorio');
  const [recintosSeleccionadosMulti, setRecintosSeleccionadosMulti] = useState<string[]>(['rec-auditorio', 'rec-sala14']);
  const [tituloBloqueo, setTituloBloqueo] = useState('');
  const [motivoBloqueo, setMotivoBloqueo] = useState('');
  const [observacionesBloqueo, setObservacionesBloqueo] = useState('');
  const [fechaInicioBloqueo, setFechaInicioBloqueo] = useState('2026-10-28');
  const [fechaFinBloqueo, setFechaFinBloqueo] = useState('2026-10-29');
  const [bloqueoIndefinido, setBloqueoIndefinido] = useState(false);

  // Estados para creación directa de evento institucional
  const [tituloEventoDirecto, setTituloEventoDirecto] = useState('');
  const [descripcionEventoDirecto, setDescripcionEventoDirecto] = useState('');
  const [fechaEventoDirecto, setFechaEventoDirecto] = useState('2026-10-26');
  const [recintoEventoDirecto, setRecintoEventoDirecto] = useState('rec-auditorio');

  const solicitudesPendientes = listaSolicitudes.filter((s) => s.estado === 'en_revision');
  const solicitudesHistorial = listaSolicitudes.filter((s) => s.estado !== 'en_revision');
  const solicitudesUrgentes = solicitudesPendientes.filter((s) => s.esExcepcional);

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : 'Recinto ESCOM';
  };

  const manejarEjecutarDictamen = () => {
    if (!solicitudParaDictaminar) return;

    if (decisionDictamen === 'rechazada' && !motivoRechazo.trim()) {
      mostrarNotificacion('Motivo requerido', 'Debes ingresar el motivo formal de rechazo.', 'advertencia');
      return;
    }

    dictaminarSolicitud(
      solicitudParaDictaminar.id,
      decisionDictamen,
      motivoRechazo,
      usuarioActual?.nombre || 'Subdirección'
    );

    setSolicitudParaDictaminar(null);
    setMotivoRechazo('');
    mostrarNotificacion(
      'Dictamen emitido con éxito',
      decisionDictamen === 'autorizada'
        ? `La solicitud fue autorizada y se generó el evento en el panel del organizador.`
        : 'La solicitud fue rechazada con la justificación ingresada.',
      decisionDictamen === 'autorizada' ? 'exito' : 'informacion'
    );
  };

  const manejarCrearBloqueo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloBloqueo.trim() || !motivoBloqueo.trim()) return;

    const idRecintoFinal = tipoAlcanceBloqueo === 'todos' ? 'todos' : recintoBloqueo;
    const idsRecintosFinal = tipoAlcanceBloqueo === 'multiple' ? recintosSeleccionadosMulti : undefined;

    crearBloqueoRecinto({
      idRecinto: idRecintoFinal,
      idsRecintos: idsRecintosFinal,
      titulo: tituloBloqueo,
      motivo: motivoBloqueo,
      observaciones: observacionesBloqueo.trim() || undefined,
      fechaInicio: fechaInicioBloqueo,
      horaInicio: '08:00',
      fechaFin: bloqueoIndefinido ? undefined : fechaFinBloqueo,
      horaFin: bloqueoIndefinido ? undefined : '18:00',
      esIndefinido: bloqueoIndefinido,
      creadoPor: usuarioActual?.nombre || 'Subdirección'
    });

    setModalNuevoBloqueo(false);
    setTituloBloqueo('');
    setMotivoBloqueo('');
    setObservacionesBloqueo('');
    mostrarNotificacion('Bloqueo registrado', 'El bloqueo quedó formalmente activo en el calendario institucional.', 'exito');
  };

  const manejarCrearEventoDirecto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloEventoDirecto.trim() || !descripcionEventoDirecto.trim()) {
      mostrarNotificacion('Datos incompletos', 'El título y la descripción son obligatorios para publicar el evento.', 'advertencia');
      return;
    }
    if (fechaEventoDirecto < new Date().toISOString().slice(0, 10)) {
      mostrarNotificacion('Fecha no válida', 'La fecha del evento debe ser futura.', 'error');
      return;
    }
    const disponibilidad = verificarDisponibilidadRecinto(recintoEventoDirecto, fechaEventoDirecto, '10:00', '13:00');
    if (!disponibilidad.disponible) {
      mostrarNotificacion('Recinto no disponible', disponibilidad.motivo || 'Selecciona otro día o recinto.', 'error');
      return;
    }

    const nuevo = crearEventoInstitucionalDirecto({
      titulo: tituloEventoDirecto,
      descripcion: descripcionEventoDirecto,
      categoria: 'Institucional',
      visibilidad: 'interno',
      modalidadAsistencia: 'libre',
      fechas: [
        {
          id: `fec-inst-${Date.now()}`,
          idEvento: '',
          fecha: fechaEventoDirecto,
          horaInicio: '10:00',
          horaFin: '13:00',
          idRecinto: recintoEventoDirecto,
          esFinalConfirmado: true,
          ponentes: ['Subdirección ESCOM']
        }
      ]
    });

    setTituloEventoDirecto('');
    setDescripcionEventoDirecto('');
    mostrarNotificacion('Evento Institucional Registrado', 'Se creó directamente sin solicitud previa.', 'exito');
    navigate(`/organizador/eventos/${nuevo.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Cabecera de Trabajo */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
            Módulo Operativo Institucional · ESCOM IPN
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
            Subdirección de Servicios Educativos e Integración Social
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Bandeja de dictamen, agenda multi-recinto (Auditorio, Sala 14 y Laboratorios) y gestión de bloqueos de infraestructura.
          </p>
        </div>

        {/* Resumen Operativo Inmediato (Action-Oriented) */}
        <div className="flex items-center gap-3 bg-neutral-50 p-2 rounded-xl border border-neutral-200 text-xs shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
            <span className="text-[10px] text-neutral-400 block font-bold uppercase">Pendientes</span>
            <span className="font-bold text-[#7a132b] text-sm">{solicitudesPendientes.length}</span>
            {solicitudesUrgentes.length > 0 && (
              <span className="text-[10px] text-amber-700 font-semibold block">
                ({solicitudesUrgentes.length} urgente)
              </span>
            )}
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
            <span className="text-[10px] text-neutral-400 block font-bold uppercase">Bloqueos</span>
            <span className="font-bold text-neutral-800 text-sm">{listaBloqueos.length}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
            <span className="text-[10px] text-neutral-400 block font-bold uppercase">Recintos</span>
            <span className="font-bold text-neutral-800 text-sm">{listaRecintos.length - 1}</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación de Trabajo */}
      <div className="flex items-center gap-4 border-b border-neutral-200 mb-6">
        <button
          type="button"
          onClick={() => cambiarPestaña('solicitudes')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            pestañaActiva === 'solicitudes'
              ? 'border-[#7a132b] text-[#7a132b]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <span>Bandeja de Dictamen</span>
          {solicitudesPendientes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#7a132b] text-white text-[10px] font-bold">
              {solicitudesPendientes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => cambiarPestaña('agenda')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestañaActiva === 'agenda'
              ? 'border-[#7a132b] text-[#7a132b]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Agenda Multi-Recinto</span>
        </button>

        <button
          type="button"
          onClick={() => cambiarPestaña('bloqueos')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestañaActiva === 'bloqueos'
              ? 'border-[#7a132b] text-[#7a132b]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Bloqueos Extraordinarios ({listaBloqueos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => cambiarPestaña('evento_directo')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestañaActiva === 'evento_directo'
              ? 'border-[#7a132b] text-[#7a132b]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crear Evento Oficial</span>
        </button>
      </div>

      {/* Pestaña: Bandeja de Dictamen (Tabla de Alta Densidad) */}
      {pestañaActiva === 'solicitudes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Solicitudes Pendientes de Resolución ({solicitudesPendientes.length})
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Revisa las propuestas registradas por profesores, alumnos y entidades externas.
                </p>
              </div>
            </div>

            {solicitudesPendientes.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                ✓ No hay solicitudes pendientes de dictamen. Todo el trabajo administrativo se encuentra al corriente.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/80 text-neutral-500 text-[10px] uppercase font-bold tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3">Solicitante</th>
                      <th className="px-4 py-3">Evento Académico</th>
                      <th className="px-4 py-3">Fechas y Horarios</th>
                      <th className="px-4 py-3">Recinto Requerido</th>
                      <th className="px-4 py-3">Anticipación</th>
                      <th className="px-4 py-3">Aforo</th>
                      <th className="px-4 py-3 text-right">Dictamen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {solicitudesPendientes.map((sol) => {
                      const fechaPrincipal = sol.fechasSolicitadas[0];
                      const recinto = fechaPrincipal
                        ? obtenerNombreRecinto(fechaPrincipal.idRecinto)
                        : 'Por definir';

                      return (
                        <tr
                          key={sol.id}
                          className={`hover:bg-neutral-50/70 transition-colors ${
                            sol.esExcepcional ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 align-top">
                            <div className="font-bold text-neutral-900">{sol.nombreSolicitante}</div>
                            <div className="text-[10px] text-neutral-400 capitalize">
                              {sol.afiliacionSolicitante} · {sol.identificadorSolicitante}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 align-top max-w-xs">
                            <div className="font-semibold text-neutral-900">{sol.tituloEvento}</div>
                            <div className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5">
                              {sol.descripcionEvento}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 align-top whitespace-nowrap">
                            {sol.fechasSolicitadas.map((f, i) => (
                              <div key={i} className="text-neutral-700 font-mono text-[11px]">
                                {f.fecha} ({f.horaInicio}-{f.horaFin})
                              </div>
                            ))}
                          </td>

                          <td className="px-4 py-3.5 align-top">
                            <span className="font-medium text-neutral-800">{recinto}</span>
                            <div className="text-[10px] text-neutral-400 capitalize">
                              Modalidad: {sol.modalidadAsistencia}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 align-top">
                            {sol.esExcepcional ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  <span>&lt; 7 días (Urgente)</span>
                                </span>
                                {sol.justificacionExcepcional && (
                                  <div
                                    className="text-[10px] text-amber-950 mt-1 line-clamp-2 bg-amber-50 p-1.5 rounded border border-amber-200"
                                    title={sol.justificacionExcepcional}
                                  >
                                    "{sol.justificacionExcepcional}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-neutral-500 font-medium">Ordinaria</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 align-top font-mono font-medium text-neutral-700">
                            {sol.asistenciaEstimada}
                          </td>

                          <td className="px-4 py-3.5 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSolicitudParaDictaminar(sol);
                                  setDecisionDictamen('autorizada');
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                Autorizar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSolicitudParaDictaminar(sol);
                                  setDecisionDictamen('rechazada');
                                }}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                Rechazar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historial de Dictámenes Emitidos */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
              Historial de Dictámenes Recientes ({solicitudesHistorial.length})
            </h3>

            <div className="divide-y divide-neutral-100 text-xs">
              {solicitudesHistorial.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-neutral-900">{s.tituloEvento}</span>
                    <span className="text-neutral-400 ml-2">({s.nombreSolicitante})</span>
                    {s.motivoRechazo && (
                      <div className="text-[11px] text-rose-700 mt-0.5">
                        Motivo registrado: {s.motivoRechazo}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <InsigniaEstado estado={s.estado} />
                    <span className="text-[10px] text-neutral-400">
                      {s.fechaRevision ? new Date(s.fechaRevision).toLocaleDateString('es-MX') : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Agenda Multi-Recinto */}
      {pestañaActiva === 'agenda' && (
        <div className="space-y-6">
          <VisorDisponibilidadRecintos />
        </div>
      )}

      {/* Pestaña: Bloqueos Extraordinarios (Soporta múltiples recintos o todas las instalaciones) */}
      {pestañaActiva === 'bloqueos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Bloqueos Operativos y de Mantenimiento ({listaBloqueos.length})
                </h2>
                <p className="text-xs text-neutral-500">
                  Permite inhabilitar un recinto, múltiples recintos o todas las instalaciones por obras, actividades de rectoría o emergencias.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalNuevoBloqueo(true)}
                className="boton-primario px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Bloqueo Extraordinario</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {listaBloqueos.map((b) => {
                const nombreR =
                  b.idRecinto === 'todos'
                    ? 'TODAS LAS INSTALACIONES (Bloqueo General)'
                    : b.idsRecintos && b.idsRecintos.length > 0
                    ? `Múltiples recintos (${b.idsRecintos.map(obtenerNombreRecinto).join(', ')})`
                    : obtenerNombreRecinto(b.idRecinto);

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-bold text-rose-950 text-sm">{b.titulo}</span>
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-[10px]">
                          {nombreR}
                        </span>
                        {b.esIndefinido && (
                          <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-bold text-[10px]">
                            Indefinido
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-700">{b.motivo}</p>
                      {b.observaciones && (
                        <p className="text-[11px] text-neutral-500 italic">Obs: {b.observaciones}</p>
                      )}
                      <div className="text-[11px] text-neutral-500">
                        Vigencia: {b.fechaInicio} a {b.fechaFin || 'Tiempo indeterminado'} · Registrado por: {b.creadoPor}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => eliminarBloqueoRecinto(b.id)}
                      className="p-2 border border-neutral-300 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer shrink-0"
                      title="Eliminar bloqueo y liberar recinto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Evento Directo */}
      {pestañaActiva === 'evento_directo' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
            Registro Directo de Evento Institucional
          </h2>
          <p className="text-xs text-neutral-500">
            Facultad de Subdirección para dar de alta ceremonias oficiales o acreditaciones institucionales de forma inmediata sin someterse al trámite ordinario de solicitud.
          </p>

          <form onSubmit={manejarCrearEventoDirecto} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Título del Evento Oficial *</label>
              <input
                type="text"
                required
                value={tituloEventoDirecto}
                onChange={(e) => setTituloEventoDirecto(e.target.value)}
                placeholder="ej: Ceremonia de Graduación Generación 2026"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Descripción</label>
              <textarea
                rows={3}
                required
                value={descripcionEventoDirecto}
                onChange={(e) => setDescripcionEventoDirecto(e.target.value)}
                placeholder="Detalle oficial de la actividad institucional..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={fechaEventoDirecto}
                  onChange={(e) => setFechaEventoDirecto(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Recinto</label>
                <select
                  value={recintoEventoDirecto}
                  onChange={(e) => setRecintoEventoDirecto(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  {listaRecintos.filter((r) => r.activo !== false).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.capacidad} lugares)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="boton-primario px-5 py-2.5 text-xs font-bold cursor-pointer shadow-xs"
            >
              Registrar y Pasar a Configuración
            </button>
          </form>
        </div>
      )}

      {/* Modal de Dictamen (Autorizar o Rechazar con motivo formal obligatorio) */}
      {solicitudParaDictaminar && (
        <VentanaModal
          estaAbierto={Boolean(solicitudParaDictaminar)}
          alCerrar={() => setSolicitudParaDictaminar(null)}
          titulo={`Dictamen: ${decisionDictamen === 'autorizada' ? 'Autorizar' : 'Rechazar'} Solicitud`}
          anchoMaximo="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-neutral-700">
              Evento: <span className="font-bold text-neutral-900">{solicitudParaDictaminar.tituloEvento}</span>
              <br />
              Solicitante: <span className="font-semibold text-neutral-800">{solicitudParaDictaminar.nombreSolicitante}</span>
            </p>

            {solicitudParaDictaminar.esExcepcional && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <span className="font-bold block mb-0.5">Justificación de Urgencia presentada:</span>
                <p>{solicitudParaDictaminar.justificacionExcepcional}</p>
              </div>
            )}

            {decisionDictamen === 'rechazada' && (
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Motivo Formal de Rechazo (Obligatorio) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Detalla la causa del rechazo (ej: incompatibilidad de aforo, choque de actividades de academia)..."
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={manejarEjecutarDictamen}
                className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                  decisionDictamen === 'autorizada'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirmar {decisionDictamen === 'autorizada' ? 'Autorización' : 'Rechazo'}
              </button>
              <button
                type="button"
                onClick={() => setSolicitudParaDictaminar(null)}
                className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </VentanaModal>
      )}

      {/* Modal de Nuevo Bloqueo Extraordinario (1 recinto, múltiples, o todos) */}
      {modalNuevoBloqueo && (
        <VentanaModal
          estaAbierto={modalNuevoBloqueo}
          alCerrar={() => setModalNuevoBloqueo(false)}
          titulo="Registrar Bloqueo Extraordinario de Instalaciones"
          anchoMaximo="lg"
        >
          <form onSubmit={manejarCrearBloqueo} className="space-y-4 text-xs">
            {/* Alcance del Bloqueo */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1.5">
                Alcance del Bloqueo Institucional
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAlcanceBloqueo('individual')}
                  className={`p-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    tipoAlcanceBloqueo === 'individual'
                      ? 'border-[#7a132b] bg-[#7a132b]/5 text-[#7a132b]'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  Un solo recinto
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAlcanceBloqueo('multiple')}
                  className={`p-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    tipoAlcanceBloqueo === 'multiple'
                      ? 'border-[#7a132b] bg-[#7a132b]/5 text-[#7a132b]'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  Varios recintos
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAlcanceBloqueo('todos')}
                  className={`p-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    tipoAlcanceBloqueo === 'todos'
                      ? 'border-rose-600 bg-rose-50 text-rose-800'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  Todas las instalaciones
                </button>
              </div>
            </div>

            {tipoAlcanceBloqueo === 'individual' && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Recinto a Bloquear</label>
                <select
                  value={recintoBloqueo}
                  onChange={(e) => setRecintoBloqueo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  {listaRecintos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.tipo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipoAlcanceBloqueo === 'multiple' && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Selecciona los recintos a inhabilitar:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-neutral-200 rounded-xl bg-neutral-50">
                  {listaRecintos.filter((r) => r.id !== 'rec-lab-computo-3').map((r) => {
                    const estaSeleccionado = recintosSeleccionadosMulti.includes(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={estaSeleccionado}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRecintosSeleccionadosMulti((prev) => [...prev, r.id]);
                            } else {
                              setRecintosSeleccionadosMulti((prev) => prev.filter((id) => id !== r.id));
                            }
                          }}
                        />
                        <span className="truncate">{r.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Título del Bloqueo *</label>
              <input
                type="text"
                required
                value={tituloBloqueo}
                onChange={(e) => setTituloBloqueo(e.target.value)}
                placeholder="ej: Mantenimiento Preventivo Semestral o Actividad Rectoría"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Motivo / Causa Detallada *</label>
              <textarea
                rows={2}
                required
                value={motivoBloqueo}
                onChange={(e) => setMotivoBloqueo(e.target.value)}
                placeholder="Razón operativa o justificación de infraestructura..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Observaciones Opcionales</label>
              <input
                type="text"
                value={observacionesBloqueo}
                onChange={(e) => setObservacionesBloqueo(e.target.value)}
                placeholder="ej: Permitido únicamente el ingreso a personal de mantenimiento con gafete"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  required
                  value={fechaInicioBloqueo}
                  onChange={(e) => setFechaInicioBloqueo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              {!bloqueoIndefinido && (
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={fechaFinBloqueo}
                    onChange={(e) => setFechaFinBloqueo(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-neutral-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={bloqueoIndefinido}
                onChange={(e) => setBloqueoIndefinido(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span className="font-semibold text-rose-900">
                Bloqueo por tiempo indeterminado (hasta nuevo aviso)
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
              >
                Confirmar Bloqueo
              </button>
              <button
                type="button"
                onClick={() => setModalNuevoBloqueo(false)}
                className="px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </VentanaModal>
      )}
    </div>
  );
};
