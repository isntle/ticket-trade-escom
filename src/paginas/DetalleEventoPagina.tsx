import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Shield,
  Tag,
  Share2,
  Lock,
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { AlertaMensaje } from '../componentes/ui/AlertaMensaje';
import { FechaEvento } from '../tipos';

interface PropiedadesDetalleEvento {
  eventId: string;
  accessKey?: string;
  navigate: (ruta: string) => void;
}

export const DetalleEventoPagina: React.FC<PropiedadesDetalleEvento> = ({
  eventId,
  accessKey,
  navigate
}) => {
  const { listaEventos, listaRecintos, apartarAsiento, confirmarReservacion } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [claveIngresada, setClaveIngresada] = useState(accessKey || '');
  const [claveVerificada, setClaveVerificada] = useState(false);
  const [procesandoRegistro, setProcesandoRegistro] = useState(false);

  // Estado para controlar qué días tienen su programa detallado desplegado
  const [diasExpandidos, setDiasExpandidos] = useState<Record<string, boolean>>({});

  const toggleDiaPrograma = (idFecha: string) => {
    setDiasExpandidos((prev) => ({
      ...prev,
      [idFecha]: !prev[idFecha]
    }));
  };

  const evento = listaEventos.find((e) => e.id === eventId);

  if (!evento) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Evento no encontrado"
          descripcion="El evento solicitado no existe o fue cancelado por el organizador."
          textoAccion="Volver a la cartelera"
          alHacerAccion={() => navigate('/eventos')}
        />
      </div>
    );
  }

  // Validación de eventos privados
  const esPrivado = evento.visibilidad === 'privado';
  const accesoConcedido =
    !esPrivado ||
    claveVerificada ||
    (evento.claveAccesoPrivada && accessKey === evento.claveAccesoPrivada) ||
    usuarioActual?.id === evento.idOrganizador ||
    (usuarioActual?.roles.includes('subdireccion') ?? false);

  if (esPrivado && !accesoConcedido) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">Evento Privado Restringido</h2>
          <p className="text-xs text-neutral-500 mt-1 mb-6">
            Este evento requiere una clave de acceso institucional proporcionada por el organizador o Subdirección.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (claveIngresada.trim() === evento.claveAccesoPrivada?.trim()) {
                setClaveVerificada(true);
                mostrarNotificacion('Clave correcta', 'Acceso al evento privado autorizado', 'exito');
              } else {
                mostrarNotificacion('Clave incorrecta', 'Verifica la clave con el organizador', 'error');
              }
            }}
            className="space-y-3"
          >
            <input
              type="text"
              value={claveIngresada}
              onChange={(e) => setClaveIngresada(e.target.value)}
              placeholder="Ingresa la clave (ej: ABET-ESCOM-2026)"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono text-center tracking-wider focus:outline-none focus:border-[#7a132b]"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Desbloquear Evento
            </button>
            <button
              type="button"
              onClick={() => navigate('/eventos')}
              className="w-full py-2 text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              Regresar a la cartelera
            </button>
          </form>
        </div>
      </div>
    );
  }

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : 'Recinto ESCOM';
  };

  // Manejo de registro directo para eventos de Acceso Libre o Registro
  const manejarRegistroDirecto = (fecha: FechaEvento) => {
    const fechaLimite = fecha.fechaLimiteInscripciones
      ? new Date(fecha.fechaLimiteInscripciones).getTime()
      : new Date(`${fecha.fecha}T${fecha.horaInicio}:00`).getTime() - 60 * 60 * 1000;
    const estadoInscripciones =
      fecha.estadoInscripciones ||
      (evento.estado === 'publicado' || evento.estado === 'en_curso' ? 'abiertas' : 'cerradas');

    if (estadoInscripciones === 'cerradas' || fechaLimite <= Date.now()) {
      mostrarNotificacion(
        'Inscripciones cerradas',
        'ERR-MT-02 · Esta sesión ya no admite nuevos registros.',
        'advertencia'
      );
      return;
    }

    if (!usuarioActual) {
      mostrarNotificacion('Inicia Sesión', 'Debes iniciar sesión para obtener un boleto.', 'error');
      navigate('/login');
      return;
    }
    setProcesandoRegistro(true);
    const resultadoApartado = apartarAsiento(
      evento.id,
      fecha.id,
      `gen-${Date.now()}`,
      'General',
      usuarioActual.id,
      usuarioActual.nombre,
      usuarioActual.correo
    );

    if (resultadoApartado.exito && resultadoApartado.reservacion) {
      const confirmacion = confirmarReservacion(resultadoApartado.reservacion.id);
      setProcesandoRegistro(false);
      if (confirmacion.exito) {
        mostrarNotificacion(
          'Registro completado',
          'Tu pase de asistencia ha sido generado con éxito en "Mis Boletos"',
          'exito'
        );
        navigate('/mis-reservaciones');
      }
    } else {
      setProcesandoRegistro(false);
      mostrarNotificacion('Error al registrar', resultadoApartado.error || '', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate('/eventos')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-4 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la cartelera</span>
      </button>

      {/* Banner Principal */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs mb-8">
        <div className="h-60 sm:h-72 w-full bg-neutral-900 relative">
          {evento.urlImagen && (
            <img
              src={evento.urlImagen}
              alt={evento.titulo}
              className="w-full h-full object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded bg-white/20 backdrop-blur-xs text-xs font-semibold uppercase tracking-wider">
                {evento.categoria}
              </span>
              <InsigniaEstado estado={evento.modalidadAsistencia} />
              <InsigniaEstado estado={evento.visibilidad} />
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">{evento.titulo}</h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1">
              Organizado por: <span className="font-semibold text-white">{evento.nombreOrganizador}</span>
            </p>
          </div>
        </div>

        {/* Resumen Superior Rápido: Fechas Totales, Horarios y Recintos Principales */}
        <div className="bg-neutral-50 border-b border-neutral-200/80 px-6 sm:px-8 py-3.5 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7a132b] shrink-0" />
            <span>
              <strong>{evento.fechas.length} {evento.fechas.length === 1 ? 'Día programado' : 'Días programados'}:</strong>{' '}
              {evento.fechas[0]?.fecha}{evento.fechas.length > 1 ? ` al ${evento.fechas[evento.fechas.length - 1]?.fecha}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#7a132b] shrink-0" />
            <span>
              <strong>Horario:</strong> {evento.fechas[0]?.horaInicio} a {evento.fechas[0]?.horaFin} hrs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#7a132b] shrink-0" />
            <span>
              <strong>Recinto:</strong> {obtenerNombreRecinto(evento.fechas[0]?.idRecinto || '')}
            </span>
          </div>
        </div>

        {/* Cuerpo Informativo */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7a132b]" />
                <span>Descripción del Evento</span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                {evento.descripcion}
              </p>
            </div>

            {evento.ponentes && evento.ponentes.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-2">
                  Ponentes e Investigadores Invitados
                </h2>
                <div className="flex flex-wrap gap-2">
                  {evento.ponentes.map((p, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-800 border border-neutral-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Información Institucional */}
          <div className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-4 text-xs">
            <h3 className="font-bold text-neutral-900 text-sm">Información Politécnica</h3>
            <div className="space-y-2.5 text-neutral-600">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>Capacidad autorizada: {evento.aforoMaximo || 120} asistentes</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>Validez académica con registro de asistencia</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>Tolerancia de acceso: 15 minutos en puerta</span>
              </div>
            </div>

            {/* Aviso de gratuidad institucional */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] leading-snug">
              ✓ Evento politécnico sin costo ni pasarelas de pago. La reservación es directa mediante tu cuenta institucional.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PROGRAMA Y FECHAS DETALLADAS DÍA POR DÍA (Día 1, Día 2, con cronograma)   */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7a132b]" />
              <span>Programa Oficial y Calendario de Días ({evento.fechas.length})</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Consulta los horarios, el programa de actividades por día, ponencias y asegura tu lugar en cada fecha.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#7a132b] bg-[#7a132b]/10 px-3 py-1 rounded-full self-start sm:self-auto">
            {evento.fechas.length} {evento.fechas.length === 1 ? 'Día de actividades' : 'Días de actividades'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {evento.fechas.map((fecha, indice) => {
            const nombreRecinto = obtenerNombreRecinto(fecha.idRecinto);
            const etiquetaDia = fecha.nombreDia || `Día ${indice + 1}`;
            const fechaLimite = fecha.fechaLimiteInscripciones
              ? new Date(fecha.fechaLimiteInscripciones).getTime()
              : new Date(`${fecha.fecha}T${fecha.horaInicio}:00`).getTime() - 60 * 60 * 1000;
            const estadoInscripciones =
              fecha.estadoInscripciones ||
              (evento.estado === 'publicado' || evento.estado === 'en_curso'
                ? 'abiertas'
                : 'cerradas');
            const inscripcionesAbiertas =
              estadoInscripciones === 'abiertas' && fechaLimite > Date.now();
            // Expandido por defecto el primer día o si el usuario dio clic
            const expandido = diasExpandidos[fecha.id] ?? (indice === 0 || !!fecha.programa);

            return (
              <div
                key={fecha.id}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:border-neutral-300 transition-all"
              >
                {/* Cabecera de la Tarjeta del Día */}
                <div className="p-5 sm:p-6 bg-linear-to-r from-neutral-50/80 via-white to-neutral-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-[#7a132b] text-white font-mono text-xs font-bold shadow-2xs">
                        {etiquetaDia}
                      </span>
                      <span className="font-extrabold text-neutral-900 text-base sm:text-lg">
                        {fecha.fecha}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-md border text-[10px] font-black tracking-wide ${
                          inscripcionesAbiertas
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                        }`}
                      >
                        INSCRIPCIONES {inscripcionesAbiertas ? 'ABIERTAS' : 'CERRADAS'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-0.5">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-4 h-4 text-[#7a132b]" />
                        <strong>Horario:</strong> {fecha.horaInicio} a {fecha.horaFin} hrs
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4 text-[#7a132b]" />
                        <strong>Recinto:</strong> {nombreRecinto}
                      </span>
                    </div>

                    {fecha.ponentes && fecha.ponentes.length > 0 && (
                      <div className="text-xs text-neutral-500 pt-0.5">
                        Ponente(s) del día: <strong className="text-neutral-800">{fecha.ponentes.join(', ')}</strong>
                      </div>
                    )}
                  </div>

                  {/* Acción de Registro para este día específico */}
                  <div className="flex items-center gap-3 shrink-0">
                    {!inscripcionesAbiertas ? (
                      <div className="px-5 py-2.5 bg-neutral-100 border border-neutral-300 text-neutral-600 rounded-xl text-xs font-bold inline-flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>Inscripciones cerradas</span>
                      </div>
                    ) : evento.modalidadAsistencia === 'controlado' ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/eventos/${evento.id}/reservar?dateId=${fecha.id}`)}
                        className="boton-primario px-5 py-2.5 text-xs font-bold cursor-pointer shadow-xs inline-flex items-center gap-2"
                      >
                        <span>Elegir Butaca ({etiquetaDia})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={procesandoRegistro}
                        onClick={() => manejarRegistroDirecto(fecha)}
                        className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs inline-flex items-center gap-2 transition-colors"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{procesandoRegistro ? 'Registrando...' : `Registrar Pase (${etiquetaDia})`}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sección de Programa de Actividades del Día */}
                {fecha.programa && fecha.programa.length > 0 ? (
                  <div className="p-5 sm:p-6 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#7a132b]" />
                        <span>Programa y Cronograma de Actividades — {etiquetaDia}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => toggleDiaPrograma(fecha.id)}
                        className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{expandido ? 'Ocultar cronograma' : 'Ver cronograma'}</span>
                        {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {expandido && (
                      <div className="space-y-3 pt-2">
                        {fecha.programa.map((item, idxProg) => (
                          <div
                            key={idxProg}
                            className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/70 hover:bg-neutral-50 transition-colors flex flex-col sm:flex-row sm:items-start gap-3 text-xs"
                          >
                            <span className="font-mono font-bold text-[#7a132b] bg-white px-2.5 py-1 rounded-lg border border-neutral-200 shrink-0 self-start">
                              {item.hora}
                            </span>
                            <div className="space-y-1 flex-1">
                              <h5 className="font-bold text-neutral-900 text-xs sm:text-sm">
                                {item.titulo}
                              </h5>
                              {item.ponente && (
                                <p className="text-[11px] font-semibold text-neutral-700">
                                  Ponente: <span className="text-[#7a132b]">{item.ponente}</span>
                                </p>
                              )}
                              {item.descripcion && (
                                <p className="text-xs text-neutral-600 leading-relaxed">
                                  {item.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-4 bg-white flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      Sesión académica con acceso directo en el horario establecido ({fecha.horaInicio} a {fecha.horaFin} hrs).
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">{nombreRecinto}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
