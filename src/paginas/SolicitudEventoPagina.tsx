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
  Info
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { AlertaMensaje } from '../componentes/ui/AlertaMensaje';
import { ElementoFechaSolicitada, ModalidadAsistencia, VisibilidadEvento } from '../tipos';

interface PropiedadesSolicitudEvento {
  navigate: (ruta: string) => void;
}

export const SolicitudEventoPagina: React.FC<PropiedadesSolicitudEvento> = ({ navigate }) => {
  const { listaRecintos, verificarDisponibilidadRecinto, crearSolicitud } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  // Campos generales
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modalidad, setModalidad] = useState<ModalidadAsistencia>('controlado');
  const [visibilidad, setVisibilidad] = useState<VisibilidadEvento>('publico');
  const [asistenciaEstimada, setAsistenciaEstimada] = useState(120);

  // Lista de fechas solicitadas
  const [fechas, setFechas] = useState<ElementoFechaSolicitada[]>([
    {
      id: `fec-temp-1`,
      fecha: '2026-10-20',
      horaInicio: '10:00',
      horaFin: '14:00',
      idRecinto: 'rec-auditorio'
    }
  ]);

  const [justificacionExcepcional, setJustificacionExcepcional] = useState('');

  // Validación de la Regla de Anticipación (Mínimo 7 días)
  const hoy = new Date('2026-09-30'); // Fecha base de simulación
  const fechaLimite7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  const cadenaLimite7Dias = fechaLimite7Dias.toISOString().split('T')[0];

  const fechasFueraDeAnticipacion = fechas.filter((f) => f.fecha && f.fecha < cadenaLimite7Dias);
  const requiereJustificacion = fechasFueraDeAnticipacion.length > 0;

  const agregarFecha = () => {
    setFechas((previas) => [
      ...previas,
      {
        id: `fec-temp-${Date.now()}`,
        fecha: '2026-10-21',
        horaInicio: '10:00',
        horaFin: '14:00',
        idRecinto: 'rec-auditorio'
      }
    ]);
  };

  const eliminarFecha = (id: string) => {
    if (fechas.length === 1) return;
    setFechas((previas) => previas.filter((f) => f.id !== id));
  };

  const actualizarFecha = (id: string, campo: keyof ElementoFechaSolicitada, valor: string) => {
    setFechas((previas) =>
      previas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f))
    );
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !descripcion.trim()) {
      mostrarNotificacion('Campos incompletos', 'Ingresa el título y la descripción del evento', 'advertencia');
      return;
    }

    if (requiereJustificacion && !justificacionExcepcional.trim()) {
      mostrarNotificacion(
        'Justificación obligatoria',
        'Has seleccionado al menos una fecha con menos de 7 días de anticipación. Debes redactar el motivo extraordinario para Subdirección.',
        'error'
      );
      return;
    }

    // Verificar conflictos con otros eventos y bloqueos en recintos
    for (const f of fechas) {
      const disp = verificarDisponibilidadRecinto(f.idRecinto, f.fecha, f.horaInicio, f.horaFin);
      if (!disp.disponible) {
        mostrarNotificacion(
          'Conflicto de Horario en Recinto',
          disp.motivo || 'El recinto no está libre en la fecha u horario solicitado.',
          'error'
        );
        return;
      }
    }

    const nuevaSolicitud = crearSolicitud({
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
    });

    mostrarNotificacion(
      'Solicitud enviada a Subdirección',
      'Tu propuesta ha sido radicada formalmente para revisión y dictamen.',
      'exito'
    );

    navigate(`/organizador/solicitudes/${nuevaSolicitud.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
        <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
          Solicitud de Evento y Reserva de Recintos ESCOM
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Formulario oficial para tramitar auditorios, salas y laboratorios ante la Subdirección de Servicios Educativos e Integración Social.
        </p>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-8">
        {/* Identidad del Solicitante */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#7a132b]" />
            <span>Datos Institucionales del Solicitante</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block">Nombre del Solicitante</span>
              <span className="font-semibold text-neutral-900">{usuarioActual.nombre}</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block">Afiliación Institucional</span>
              <span className="font-semibold text-neutral-900 capitalize">{usuarioActual.afiliacion}</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block">Identificador Oficial</span>
              <span className="font-mono font-semibold text-[#7a132b]">
                {usuarioActual.boleta || usuarioActual.numeroEmpleado || usuarioActual.nombreOrganizacion || 'Registrado'}
              </span>
            </div>
          </div>
        </div>

        {/* Datos Generales del Evento */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
            Información del Evento
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Título del Evento *
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ej: Simposio de Robótica Móvil y Visión Artificial 2026"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-[#7a132b]"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Descripción y Objetivo Académico *
              </label>
              <textarea
                rows={4}
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla los objetivos, la población estudiantil a beneficiar y los temas que se abordarán..."
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-[#7a132b]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Modalidad de Asistencia</label>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value as ModalidadAsistencia)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800"
                >
                  <option value="controlado">Acceso Controlado (QR con Butaca)</option>
                  <option value="libre">Acceso Libre (Sin boleto)</option>
                  <option value="registro">Registro de Asistencia</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Visibilidad</label>
                <select
                  value={visibilidad}
                  onChange={(e) => setVisibilidad(e.target.value as VisibilidadEvento)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800"
                >
                  <option value="publico">Público General</option>
                  <option value="interno">Solo Comunidad IPN</option>
                  <option value="privado">Privado (Solo con Clave)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Aforo Estimado</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={asistenciaEstimada}
                  onChange={(e) => setAsistenciaEstimada(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Programación de Fechas y Recintos Solicitados */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Fechas y Recintos Solicitados
              </h2>
              <p className="text-xs text-neutral-500">
                Puedes solicitar una o varias fechas para congresos de múltiples jornadas.
              </p>
            </div>
            <button
              type="button"
              onClick={agregarFecha}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir otra fecha</span>
            </button>
          </div>

          <div className="space-y-3">
            {fechas.map((f, indice) => {
              const esMenor7Dias = f.fecha && f.fecha < cadenaLimite7Dias;
              return (
                <div
                  key={f.id}
                  className={`p-4 rounded-xl border ${
                    esMenor7Dias ? 'border-amber-300 bg-amber-50/40' : 'border-neutral-200 bg-neutral-50/50'
                  } grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs`}
                >
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Fecha (Jornada {indice + 1})
                    </label>
                    <input
                      type="date"
                      required
                      value={f.fecha}
                      onChange={(e) => actualizarFecha(f.id, 'fecha', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Hora Inicio</label>
                    <input
                      type="time"
                      required
                      value={f.horaInicio}
                      onChange={(e) => actualizarFecha(f.id, 'horaInicio', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Hora Fin</label>
                    <input
                      type="time"
                      required
                      value={f.horaFin}
                      onChange={(e) => actualizarFecha(f.id, 'horaFin', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Recinto Solicitado</label>
                    <select
                      value={f.idRecinto}
                      onChange={(e) => actualizarFecha(f.id, 'idRecinto', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg"
                    >
                      {listaRecintos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} ({r.capacidad} cap)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {fechas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarFecha(f.id)}
                        className="p-2 border border-neutral-300 text-neutral-500 hover:text-rose-600 rounded-lg hover:bg-white"
                        title="Eliminar esta fecha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advertencia y Justificación Excepcional por Regla de Anticipación */}
          {requiereJustificacion && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-3 animate-in fade-in duration-200">
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

        {/* Acciones de Envío */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/organizador')}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="boton-primario px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Solicitud a Subdirección</span>
          </button>
        </div>
      </form>
    </div>
  );
};
