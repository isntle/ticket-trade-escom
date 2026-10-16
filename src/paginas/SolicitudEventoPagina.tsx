import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  ArrowLeft,
  FileText,
  Info,
  Layers,
  Sparkles,
  Users
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { ElementoFechaSolicitada, ModalidadAsistencia, VisibilidadEvento } from '../tipos';

interface PropiedadesSolicitudEvento {
  navigate: (ruta: string) => void;
  requestId?: string;
}

export const SolicitudEventoPagina: React.FC<PropiedadesSolicitudEvento> = ({ navigate, requestId }) => {
  const { listaRecintos, listaSolicitudes, verificarDisponibilidadRecinto, crearSolicitud, guardarBorradorSolicitud, actualizarSolicitud, dictaminarSolicitud } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const solicitudEnEdicion = listaSolicitudes.find((solicitud) => solicitud.id === requestId);

  // Campos generales y de solicitud unificados
  const [titulo, setTitulo] = useState(() => solicitudEnEdicion?.tituloEvento || '');
  const [descripcion, setDescripcion] = useState(() => solicitudEnEdicion?.descripcionEvento || '');
  const [modalidad, setModalidad] = useState<ModalidadAsistencia>(() => solicitudEnEdicion?.modalidadAsistencia || 'controlado');
  const [visibilidad, setVisibilidad] = useState<VisibilidadEvento>(() => solicitudEnEdicion?.visibilidad || 'publico');
  const [asistenciaEstimada, setAsistenciaEstimada] = useState(() => solicitudEnEdicion?.asistenciaEstimada || 120);

  // Lista unificada de días y fechas solicitadas con programa/actividad por día
  const [fechas, setFechas] = useState<ElementoFechaSolicitada[]>(() => solicitudEnEdicion?.fechasSolicitadas || [
    {
      id: `fec-temp-1`,
      nombreDia: 'Día 1',
      fecha: '2026-10-20',
      horaInicio: '10:00',
      horaFin: '14:00',
      idRecinto: 'rec-auditorio',
      actividadOPrograma: 'Inauguración y conferencias magistrales'
    }
  ]);

  const [justificacionExcepcional, setJustificacionExcepcional] = useState(() => solicitudEnEdicion?.justificacionExcepcional || '');

  // Validación de la Regla de Anticipación (Mínimo 7 días)
  const hoy = new Date();
  const fechaLimite7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  const cadenaLimite7Dias = fechaLimite7Dias.toISOString().split('T')[0];

  const fechasFueraDeAnticipacion = fechas.filter((f) => f.fecha && f.fecha < cadenaLimite7Dias);
  const requiereJustificacion = fechasFueraDeAnticipacion.length > 0;

  const agregarDia = () => {
    const siguienteNumero = fechas.length + 1;
    setFechas((previas) => [
      ...previas,
      {
        id: `fec-temp-${Date.now()}`,
        nombreDia: `Día ${siguienteNumero}`,
        fecha: '2026-10-21',
        horaInicio: '10:00',
        horaFin: '14:00',
        idRecinto: 'rec-auditorio',
        actividadOPrograma: ''
      }
    ]);
  };

  const eliminarDia = (id: string) => {
    if (fechas.length === 1) return;
    setFechas((previas) => {
      const filtradas = previas.filter((f) => f.id !== id);
      // Renumerar días consecutivamente (Día 1, Día 2, ...)
      return filtradas.map((item, idx) => ({
        ...item,
        nombreDia: `Día ${idx + 1}`
      }));
    });
  };

  const actualizarFecha = (id: string, campo: keyof ElementoFechaSolicitada, valor: string) => {
    setFechas((previas) =>
      previas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f))
    );
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();

    if (solicitudEnEdicion && (!usuarioActual || solicitudEnEdicion.idSolicitante !== usuarioActual.id)) {
      mostrarNotificacion('Sin autorización', 'Solo la persona solicitante puede editar este trámite.', 'error');
      navigate('/organizador'); return;
    }
    if (solicitudEnEdicion && !['borrador', 'en_revision', 'requiere_correccion'].includes(solicitudEnEdicion.estado)) {
      mostrarNotificacion('Edición no disponible', 'Este trámite ya no admite cambios.', 'advertencia');
      navigate(`/organizador/solicitudes/${solicitudEnEdicion.id}`); return;
    }
    if (solicitudEnEdicion?.estado === 'requiere_correccion' && solicitudEnEdicion.fechaLimiteCorreccion && Date.now() > new Date(solicitudEnEdicion.fechaLimiteCorreccion).getTime()) {
      dictaminarSolicitud(solicitudEnEdicion.id, 'rechazada', 'El plazo de 24 horas para corregir la solicitud expiró.', 'Sistema');
      mostrarNotificacion('Plazo vencido', 'El sistema cerró el trámite porque vencieron las 24 horas para corregir.', 'error');
      navigate(`/organizador/solicitudes/${solicitudEnEdicion.id}`); return;
    }

    if (usuarioActual && usuarioActual.correoConfirmado === false) {
      mostrarNotificacion('Confirma tu correo', 'Confirma tu correo electrónico antes de enviar solicitudes.', 'advertencia');
      navigate('/perfil');
      return;
    }
    if (usuarioActual && usuarioActual.esVerificado !== true) {
      mostrarNotificacion('Verificación requerida', 'Envía tu expediente documental y espera el dictamen de Subdirección.', 'advertencia');
      navigate('/perfil');
      return;
    }
    if (usuarioActual?.restriccionSolicitudesHasta && usuarioActual.restriccionSolicitudesHasta >= new Date().toISOString().slice(0, 10)) {
      mostrarNotificacion('Solicitud restringida', `No puedes crear solicitudes hasta ${usuarioActual.restriccionSolicitudesHasta}.`, 'error');
      return;
    }

    if (!titulo.trim() || !descripcion.trim()) {
      mostrarNotificacion('Campos incompletos', 'Ingresa el título y la descripción del evento', 'advertencia');
      return;
    }

    if (requiereJustificacion && !justificacionExcepcional.trim()) {
      mostrarNotificacion(
        'Justificación obligatoria',
        'Has seleccionado al menos un día con menos de 7 días de anticipación. Debes redactar el motivo extraordinario para Subdirección.',
        'error'
      );
      return;
    }

    // Verificar conflictos con otros eventos y bloqueos en recintos
    for (const f of fechas) {
      const disp = verificarDisponibilidadRecinto(f.idRecinto, f.fecha, f.horaInicio, f.horaFin);
      if (!disp.disponible) {
        mostrarNotificacion(
          `Conflicto en ${f.nombreDia || 'Fecha'}`,
          disp.motivo || 'El recinto no está libre en la fecha u horario solicitado.',
          'error'
        );
        return;
      }
    }

    if (!usuarioActual) {
      mostrarNotificacion('Inicia Sesión', 'Debes iniciar sesión para solicitar un evento.', 'error');
      navigate('/login');
      return;
    }

    const datosSolicitud = {
      idSolicitante: usuarioActual.id,
      nombreSolicitante: usuarioActual.nombre,
      correoSolicitante: usuarioActual.correo,
      afiliacionSolicitante: usuarioActual.afiliacion,
      identificadorSolicitante: usuarioActual.boleta || usuarioActual.numeroEmpleado || usuarioActual.nombreOrganizacion,
      tituloEvento: titulo,
      descripcionEvento: descripcion,
      fechasSolicitadas: fechas,
      modalidadAsistencia: modalidad,
      visibilidad,
      asistenciaEstimada,
      esExcepcional: requiereJustificacion,
      justificacionExcepcional: requiereJustificacion ? justificacionExcepcional : undefined
    };
    const nuevaSolicitud = solicitudEnEdicion
      ? (actualizarSolicitud(solicitudEnEdicion.id, datosSolicitud, true), { ...solicitudEnEdicion, ...datosSolicitud, estado: 'en_revision' as const })
      : crearSolicitud(datosSolicitud);

    mostrarNotificacion(
      'Solicitud enviada a Subdirección',
      'Tu propuesta ha sido radicada formalmente para revisión y dictamen.',
      'exito'
    );

    navigate(`/organizador/solicitudes/${nuevaSolicitud.id}`);
  };

  const manejarGuardarBorrador = () => {
    if (!usuarioActual) {
      mostrarNotificacion('Inicia sesión', 'Necesitas una cuenta para guardar un borrador.', 'advertencia');
      navigate('/login'); return;
    }
    if (usuarioActual.esVerificado !== true) {
      mostrarNotificacion('Verificación requerida', 'La preparación de trámites está disponible para solicitantes verificados.', 'advertencia');
      navigate('/identidad/expediente'); return;
    }
    if (solicitudEnEdicion && solicitudEnEdicion.idSolicitante !== usuarioActual.id) {
      mostrarNotificacion('Sin autorización', 'Solo la persona solicitante puede editar este borrador.', 'error'); return;
    }
    if (!titulo.trim() || !descripcion.trim()) {
      mostrarNotificacion('Completa la información básica', 'El título y la descripción permiten identificar el borrador.', 'advertencia'); return;
    }
    const datosBorrador = {
      idSolicitante: usuarioActual.id, nombreSolicitante: usuarioActual.nombre,
      correoSolicitante: usuarioActual.correo, afiliacionSolicitante: usuarioActual.afiliacion,
      identificadorSolicitante: usuarioActual.boleta || usuarioActual.numeroEmpleado || usuarioActual.nombreOrganizacion,
      tituloEvento: titulo.trim(), descripcionEvento: descripcion.trim(), fechasSolicitadas: fechas,
      modalidadAsistencia: modalidad, visibilidad, asistenciaEstimada, esExcepcional: requiereJustificacion,
      justificacionExcepcional: justificacionExcepcional || undefined
    };
    const borrador = solicitudEnEdicion
      ? (actualizarSolicitud(solicitudEnEdicion.id, datosBorrador), solicitudEnEdicion)
      : guardarBorradorSolicitud(datosBorrador);
    mostrarNotificacion('Borrador guardado', 'Puedes consultarlo desde Mis solicitudes.', 'exito');
    navigate(`/organizador/solicitudes/${borrador.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate('/organizador')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al panel</span>
      </button>

      <div className="mb-8">
        <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider block mb-1">
          Formulario Oficial Unificado · Trámite Escolar y Académico
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Solicitud de Evento y Reserva de Recintos ESCOM
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-3xl">
          Concentra en una sola ficha integrada la información general, modalidad, aforo, recintos requeridos y la programación día a día de tu evento académico o institucional.
        </p>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-8">
        {/* ========================================================================= */}
        {/* 1. DATOS INSTITUCIONALES DEL SOLICITANTE (Validación institucional ESCOM) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#7a132b]" />
            <span>Datos Institucionales del Solicitante</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block font-medium">Nombre del Solicitante</span>
              <span className="font-semibold text-neutral-900 text-xs sm:text-sm">{usuarioActual?.nombre || 'Solicitante'}</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block font-medium">Afiliación Institucional</span>
              <span className="font-semibold text-neutral-900 capitalize text-xs sm:text-sm">{usuarioActual?.afiliacion || 'Comunidad IPN'}</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block font-medium">Identificador Oficial (Boleta / Empleado / Org)</span>
              <span className="font-mono font-semibold text-[#7a132b] text-xs sm:text-sm">
                {usuarioActual?.boleta || usuarioActual?.numeroEmpleado || usuarioActual?.nombreOrganizacion || 'Registrado'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SECCIÓN UNIFICADA: INFORMACIÓN GENERAL, MODALIDAD, AFORO Y PROGRAMA    */}
        {/* (Unificación requerida: fecha, hora, día, recinto, modalidad, aforo, etc.) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7a132b]" />
              <span>Información Unificada del Evento, Fechas y Recintos Solicitados</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Todos los parámetros de la solicitud integrados en un solo bloque: datos del evento, parámetros de asistencia y calendario de días con recintos y horarios.
            </p>
          </div>

          {/* Bloque superior: Título y Descripción */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-800 mb-1">
                Título del Evento *
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ej: Simposio de Robótica Móvil y Visión Artificial 2026"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-[#7a132b] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-800 mb-1">
                Descripción y Objetivo Académico *
              </label>
              <textarea
                rows={3}
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla los objetivos, la población estudiantil a beneficiar y los temas que se abordarán..."
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-xs sm:text-sm focus:outline-none focus:border-[#7a132b] focus:bg-white transition-all"
              />
            </div>

            {/* Parámetros integrados de asistencia, visibilidad y aforo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Modalidad de Asistencia *
                </label>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value as ModalidadAsistencia)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-none focus:border-[#7a132b]"
                >
                  <option value="controlado">Acceso Controlado (QR con Butaca)</option>
                  <option value="libre">Acceso Libre (Sin boleto numerado)</option>
                  <option value="registro">Registro de Asistencia</option>
                </select>
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Determina si se reservan butacas o es entrada general.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Visibilidad Institucional *
                </label>
                <select
                  value={visibilidad}
                  onChange={(e) => setVisibilidad(e.target.value as VisibilidadEvento)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-none focus:border-[#7a132b]"
                >
                  <option value="publico">Público General</option>
                  <option value="interno">Solo Comunidad IPN</option>
                  <option value="privado">Privado (Solo con Clave)</option>
                </select>
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Alcance en cartelera escolar.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Aforo Estimado (Personas) *
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={asistenciaEstimada}
                  onChange={(e) => setAsistenciaEstimada(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-xs focus:outline-none focus:border-[#7a132b]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Capacidad proyectada de asistentes.
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CALENDARIO Y RECINTOS: DÍA 1, DÍA 2, DÍA 3 (Reemplazando "Jornada")       */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#7a132b]" />
                  <span>Programación de Fechas, Horarios y Recintos por Día</span>
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Especifica cada día de tu evento: fecha exacta, horario de inicio y fin, recinto oficial y programa planificado.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarDia}
                className="px-3.5 py-1.5 bg-[#7a132b]/10 hover:bg-[#7a132b]/20 text-[#7a132b] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Día {fechas.length + 1}</span>
              </button>
            </div>

            <div className="space-y-3">
              {fechas.map((f, indice) => {
                const esMenor7Dias = f.fecha && f.fecha < cadenaLimite7Dias;
                const etiquetaDia = f.nombreDia || `Día ${indice + 1}`;

                return (
                  <div
                    key={f.id}
                    className={`p-4 rounded-xl border transition-all ${
                      esMenor7Dias
                        ? 'border-amber-300 bg-amber-50/40'
                        : 'border-neutral-200 bg-neutral-50/70 hover:border-neutral-300'
                    } space-y-3 text-xs`}
                  >
                    {/* Encabezado del Día */}
                    <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#7a132b] text-white font-mono text-xs font-bold">
                          {etiquetaDia}
                        </span>
                        <span className="text-neutral-500 font-medium text-[11px]">
                          Día {indice + 1} del evento
                        </span>
                        {esMenor7Dias && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Urgente (&lt; 7 días)
                          </span>
                        )}
                      </div>

                      {fechas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarDia(f.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                          title={`Eliminar ${etiquetaDia}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Controles de Día: Fecha, Horas y Recinto */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Fecha ({etiquetaDia}) *
                        </label>
                        <input
                          type="date"
                          required
                          value={f.fecha}
                          onChange={(e) => actualizarFecha(f.id, 'fecha', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Hora Inicio *
                        </label>
                        <input
                          type="time"
                          required
                          value={f.horaInicio}
                          onChange={(e) => actualizarFecha(f.id, 'horaInicio', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Hora Fin *
                        </label>
                        <input
                          type="time"
                          required
                          value={f.horaFin}
                          onChange={(e) => actualizarFecha(f.id, 'horaFin', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Recinto Solicitado *
                        </label>
                        <select
                          value={f.idRecinto}
                          onChange={(e) => actualizarFecha(f.id, 'idRecinto', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        >
                          {listaRecintos.filter((r) => r.activo !== false).map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre} ({r.capacidad} cap)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Programa / Actividades específicas de este día */}
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1 text-[11px]">
                        Programa o Actividades Previstas para {etiquetaDia} (opcional)
                      </label>
                      <input
                        type="text"
                        value={f.actividadOPrograma || ''}
                        onChange={(e) => actualizarFecha(f.id, 'actividadOPrograma', e.target.value)}
                        placeholder="ej: 10:00 Conferencia inaugural, 11:30 Panel de debate, 13:00 Ronda de preguntas"
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:outline-none focus:border-[#7a132b]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advertencia y Justificación Excepcional por Regla de Anticipación */}
            {requiereJustificacion && (
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-3 animate-in fade-in duration-200 mt-4">
                <div className="flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Regla de Anticipación Activada (&lt; 7 días):</span>{' '}
                    El reglamento de recintos de ESCOM establece que las solicitudes deben tramitarse con al menos 1 semana de anticipación. Para continuar con esta solicitud urgente, debes justificar el carácter extraordinario del evento ante la Subdirección.
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-amber-900 text-xs mb-1">
                    Justificación Excepcional Obligatoria *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={justificacionExcepcional}
                    onChange={(e) => setJustificacionExcepcional(e.target.value)}
                    placeholder="Explica la causa imprevista o urgente (ej: visita no programada de investigador internacional con aval de academia)..."
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Envío */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={manejarGuardarBorrador}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >Guardar borrador</button>
          <button
            type="button"
            onClick={() => navigate('/organizador')}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="boton-primario px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>{solicitudEnEdicion?.estado === 'requiere_correccion' ? 'Guardar corrección y reenviar' : solicitudEnEdicion ? 'Guardar y enviar cambios' : 'Enviar Solicitud a Subdirección'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
