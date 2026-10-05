import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  User,
  ShieldCheck,
  Building,
  Monitor,
  Download,
  AlertCircle
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';

interface PropiedadesDetalleSolicitud {
  requestId: string;
  navigate: (ruta: string) => void;
}

export const DetalleSolicitudPagina: React.FC<PropiedadesDetalleSolicitud> = ({
  requestId,
  navigate
}) => {
  const {
    listaSolicitudes,
    listaRecintos,
    listaEventos,
    dictaminarSolicitud,
    obtenerOcupacionesRecinto,
    verificarDisponibilidadRecinto
  } = useDatos();

  const { usuarioActual, rolActivo } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [motivoRechazoInput, setMotivoRechazoInput] = useState('');
  const [modalRechazoVisible, setModalRechazoVisible] = useState(false);

  const solicitud = listaSolicitudes.find((s) => s.id === requestId);
  const eventoAsociado = listaEventos.find((e) => e.idSolicitud === requestId);

  if (!solicitud) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Solicitud no encontrada"
          descripcion="La solicitud especificada no existe en los registros oficiales de Subdirección."
          textoAccion="Volver al panel"
          alHacerAccion={() => navigate('/subdireccion')}
        />
      </div>
    );
  }

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : 'Recinto ESCOM';
  };

  const esSubdirector =
    usuarioActual.roles.includes('subdireccion') || usuarioActual.roles.includes('admin');

  // Ejecutar autorización
  const manejarAutorizar = () => {
    dictaminarSolicitud(
      solicitud.id,
      'autorizada',
      undefined,
      usuarioActual.nombre
    );
    mostrarNotificacion(
      'Solicitud Autorizada',
      `El evento "${solicitud.tituloEvento}" ha sido autorizado y transferido a configuración de butacas.`,
      'exito'
    );
  };

  // Ejecutar rechazo
  const manejarRechazar = () => {
    if (!motivoRechazoInput.trim()) {
      mostrarNotificacion(
        'Motivo requerido',
        'Debes ingresar un motivo motivado y fundado para rechazar la propuesta.',
        'advertencia'
      );
      return;
    }

    dictaminarSolicitud(
      solicitud.id,
      'rechazada',
      motivoRechazoInput.trim(),
      usuarioActual.nombre
    );
    setModalRechazoVisible(false);
    mostrarNotificacion(
      'Solicitud Rechazada',
      'El dictamen de rechazo y motivo oficial fueron notificados al solicitante.',
      'informacion'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => (rolActivo === 'subdireccion' ? navigate('/subdireccion') : navigate('/organizador'))}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{rolActivo === 'subdireccion' ? 'Volver a Bandeja de Subdirección' : 'Volver a Mis Solicitudes'}</span>
      </button>

      {/* Cabecera del Expediente */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="font-mono text-neutral-400 font-bold uppercase">EXP: {solicitud.id}</span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <InsigniaEstado estado={solicitud.estado} />
            {solicitud.esExcepcional && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                Trámite Excepcional (&lt; 7 días)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            {solicitud.tituloEvento}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Radicado el {new Date(solicitud.fechaCreacion).toLocaleDateString('es-MX')} por{' '}
            <strong className="text-neutral-800">{solicitud.nombreSolicitante}</strong> ({solicitud.afiliacionSolicitante})
          </p>
        </div>

        {/* Botón hacia el evento si ya está autorizado */}
        {eventoAsociado && (
          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${eventoAsociado.id}`)}
            className="boton-primario px-4 py-2 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <span>Ver Configuración del Evento →</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LAYOUT DIVIDIDO OPERACIONAL: IZQUIERDA (EXPEDIENTE) vs DERECHA (DICTAMEN) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA IZQUIERDA: INFORMACIÓN DEL SOLICITANTE Y EVENTO (6 COLS) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Ficha del Solicitante */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#7a132b]" />
              <span>Identidad del Solicitante</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Nombre</span>
                <span className="font-bold text-neutral-900">{solicitud.nombreSolicitante}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Afiliación</span>
                <span className="capitalize font-semibold text-neutral-800">{solicitud.afiliacionSolicitante}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Identificador / Boleta</span>
                <span className="font-mono text-neutral-700">{solicitud.identificadorSolicitante || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Correo Institucional</span>
                <span className="text-neutral-700 truncate block">{solicitud.correoSolicitante}</span>
              </div>
            </div>
          </div>

          {/* Justificación Académica */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#7a132b]" />
              <span>Memoria Descriptiva del Evento</span>
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              {solicitud.descripcionEvento}
            </p>
          </div>

          {/* Justificación Excepcional si aplica */}
          {solicitud.esExcepcional && (
            <div className="bg-amber-50/80 rounded-2xl border border-amber-300 p-5 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Justificación de Causa de Fuerza Mayor (Regla &lt; 7 Días)</span>
              </div>
              <p className="leading-relaxed bg-white/80 p-3 rounded-xl border border-amber-200">
                "{solicitud.justificacionExcepcional}"
              </p>
            </div>
          )}

          {/* Documento adjunto si aplica */}
          {solicitud.nombreDocumento && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                <span className="font-mono font-medium text-neutral-800">{solicitud.nombreDocumento}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                Documento Acreditado
              </span>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: FECHAS, DISPONIBILIDAD Y DICTAMEN (6 COLS) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Jornadas Solicitadas y Cotejo de Disponibilidad */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#7a132b]" />
              <span>Jornadas y Cotejo de Agenda en Recinto</span>
            </h3>

            <div className="space-y-3">
              {solicitud.fechasSolicitadas.map((f, i) => {
                const nombreRecinto = obtenerNombreRecinto(f.idRecinto);
                const disp = verificarDisponibilidadRecinto(f.idRecinto, f.fecha, f.horaInicio, f.horaFin);
                const ocupacionesDia = obtenerOcupacionesRecinto(f.idRecinto, f.fecha);

                return (
                  <div
                    key={f.id || i}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 text-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-neutral-900 text-sm">
                          Jornada {i + 1}: {f.fecha}
                        </div>
                        <div className="text-neutral-500 text-[11px] mt-0.5">
                          {f.horaInicio} a {f.horaFin} hrs · {nombreRecinto}
                        </div>
                      </div>

                      {/* Estado de disponibilidad técnica */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          disp.disponible
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {disp.disponible ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{disp.disponible ? 'Sin conflicto en recinto' : 'Empalme Detectado'}</span>
                      </span>
                    </div>

                    {!disp.disponible && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px]">
                        <strong>Alerta de Empalme: </strong> {disp.motivo}
                      </div>
                    )}

                    {/* Agenda del recinto ese día */}
                    <div className="pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-500">
                      <span className="font-semibold block text-neutral-700 mb-1">
                        Ocupaciones registradas ese día en {nombreRecinto}:
                      </span>
                      {ocupacionesDia.length === 0 ? (
                        <span className="text-emerald-700 italic">Totalmente libre todo el día</span>
                      ) : (
                        ocupacionesDia.map((item) => (
                          <div key={item.id} className="flex justify-between py-0.5">
                            <span className="font-mono text-neutral-600">{item.horaInicio} - {item.horaFin}</span>
                            <span className="truncate max-w-[200px] text-neutral-800">{item.titulo}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mesa de Dictamen Formal de Subdirección */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#7a132b]" />
              <span>Resolución Formal de Subdirección</span>
            </h3>

            {solicitud.estado === 'en_revision' ? (
              esSubdirector ? (
                <div className="space-y-4 pt-1">
                  <p className="text-xs text-neutral-600">
                    Como autoridad dictaminadora de la Subdirección de ESCOM, revisa el expediente y emite la resolución oficial.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={manejarAutorizar}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Autorizar Propuesta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalRechazoVisible(true)}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Emitir Rechazo Motivado</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Esta solicitud se encuentra actualmente en revisión ante la Subdirección de ESCOM. Recibirás notificación de la resolución.
                </div>
              )
            ) : (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900">Dictamen Emitido:</span>
                  <InsigniaEstado estado={solicitud.estado} />
                </div>
                <div className="text-neutral-600">
                  Emitido por: <strong className="text-neutral-800">{solicitud.revisadoPor || 'Subdirección de ESCOM'}</strong>
                </div>
                {solicitud.motivoRechazo && (
                  <div className="mt-2 p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-950">
                    <span className="font-bold block mb-1">Motivo Registrado del Rechazo:</span>
                    {solicitud.motivoRechazo}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Rechazo con Justificación Obligatoria */}
      {modalRechazoVisible && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Motivo Fundado de Rechazo</span>
            </h3>
            <p className="text-xs text-neutral-600">
              Ingresa la justificación formal que se notificará al solicitante (ej: empalme no subsanable con actividad institucional o falta de aval).
            </p>

            <textarea
              rows={4}
              required
              value={motivoRechazoInput}
              onChange={(e) => setMotivoRechazoInput(e.target.value)}
              placeholder="Explica detalladamente la causa oficial del rechazo..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-rose-600"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalRechazoVisible(false)}
                className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={manejarRechazar}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirmar Rechazo Motivado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
