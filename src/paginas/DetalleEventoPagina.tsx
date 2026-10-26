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
import { obtenerMensaje } from '../dominio/mensajes';
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
  const {
    listaEventos,
    listaRecintos,
    listaIntencionesAsistencia,
    registrarIntencionAsistencia,
    cancelarIntencionAsistencia
  } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [claveIngresada, setClaveIngresada] = useState(accessKey || '');
  const [claveVerificada, setClaveVerificada] = useState(false);
  const [procesandoRegistro, setProcesandoRegistro] = useState(false);

  // Estado para controlar qué días tienen su programa detallado desplegado
  const [diasExpandidos, setDiasExpandidos] = useState<Record<string, boolean>>({});

  // Estados para confirmación de registro de asistencia libre
  const [mostrarConfirmacionLibre, setMostrarConfirmacionLibre] = useState(false);
  const [fechaSeleccionadaParaLibre, setFechaSeleccionadaParaLibre] = useState<FechaEvento | null>(null);

  const toggleDiaPrograma = (idFecha: string) => {
    setDiasExpandidos((prev) => ({
      ...prev,
      [idFecha]: !prev[idFecha]
    }));
  };

  const evento = listaEventos.find((e) => e.id === eventId);

  // === VALIDACIÓN DE PRECONDICIONES ===
  const debeOcultarse = 
    !evento || 
    ((evento.estado as string) !== 'publicado' && 
     (evento.estado as string) !== 'cancelado' && 
     (evento.estado as string) !== 'suspendido');

  if (debeOcultarse) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Evento no disponible"
          descripcion="El evento solicitado no existe, aún no está publicado o no tienes permiso para consultarlo."
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
                mostrarNotificacion('Acceso Concedido', 'Clave de acceso verificada correctamente.', 'exito');
              } else {
                mostrarNotificacion('Clave Incorrecta', 'Verifica la clave con el organizador.', 'error');
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

  // Inicia el registro de intención de asistencia para el día seleccionado.
  const iniciarRegistroDirecto = (fecha: FechaEvento) => {
    const fechaLimite = fecha.fechaLimiteInscripciones
      ? new Date(fecha.fechaLimiteInscripciones).getTime()
      : new Date(`${fecha.fecha}T${fecha.horaInicio}:00`).getTime() - 60 * 60 * 1000;
    const estadoInscripciones =
      fecha.estadoInscripciones ||
      (evento.estado === 'publicado' || evento.estado === 'en_curso' ? 'abiertas' : 'cerradas');

    // Validación de inscripciones cerradas (ERR-MT-02)
    if (estadoInscripciones === 'cerradas' || fechaLimite <= Date.now()) {
      const msg = obtenerMensaje('ERR-MT-02');
      mostrarNotificacion(msg.titulo, msg.descripcion, msg.tipo);
      return;
    }

    // Validación de sesión activa (ERR-TR-01)
    if (!usuarioActual) {
      const msg = obtenerMensaje('ERR-TR-01');
      mostrarNotificacion(msg.titulo, msg.descripcion, msg.tipo);
      navigate('/login');
      return;
    }

    // Validación de correo confirmado (ERR-IP-04)
    if (usuarioActual.correoConfirmado === false) {
      const msg = obtenerMensaje('ERR-IP-04');
      mostrarNotificacion(msg.titulo, msg.descripcion, msg.tipo);
      navigate('/confirmar-correo');
      return;
    }

    // Validación de público permitido (ERR-MT-01)
    const publicoPermitido = evento.publicoPermitido;
    if (publicoPermitido && Array.isArray(publicoPermitido) && publicoPermitido.length > 0) {
      const esElegible = usuarioActual.roles.some((rol) => publicoPermitido.includes(rol));
      if (!esElegible) {
        const msg = obtenerMensaje('ERR-MT-01', { 'público permitido': publicoPermitido.join(', ') });
        mostrarNotificacion(msg.titulo, msg.descripcion, msg.tipo);
        return;
      }
    }

    // Abre modal de confirmación
    setFechaSeleccionadaParaLibre(fecha);
    setMostrarConfirmacionLibre(true);
  };

  // Guarda la intención de asistencia
  const confirmarRegistroDirecto = () => {
    if (!usuarioActual || !fechaSeleccionadaParaLibre) return;
    
    setProcesandoRegistro(true);

    const resultado = registrarIntencionAsistencia(
      evento!.id,
      fechaSeleccionadaParaLibre.id,
      usuarioActual.id,
      usuarioActual.nombre,
      usuarioActual.correo
    );

    setProcesandoRegistro(false);
    setMostrarConfirmacionLibre(false);

    if (resultado.exito) {
      mostrarNotificacion(
        'Registro completado',
        'Registraste tu intención de asistir este día. No se generó un boleto.',
        'exito'
      );
    } else {
      mostrarNotificacion(
        'No fue posible registrar la asistencia',
        resultado.error || 'No fue posible guardar la operación.',
        'error'
      );
    }
  };

  // Cancela un registro de asistencia directa (OK-MT-02)
  const cancelarRegistroLibre = (idFecha: string) => {
    const registro = listaIntencionesAsistencia.find(
      (intencion) =>
        intencion.idEvento === evento.id &&
        intencion.idFechaEvento === idFecha &&
        intencion.idUsuario === usuarioActual?.id
    );

    if (!registro) return;

    cancelarIntencionAsistencia(registro.id);
    const msg = obtenerMensaje('OK-MT-02');
    mostrarNotificacion(msg.titulo, msg.descripcion, msg.tipo);
  };

  // === CÁLCULO DINÁMICO DE RECINTOS Y HORARIOS ===
  const todosLosRecintos = Array.from(new Set(
    evento?.fechas.flatMap(f => 
      f.programa && f.programa.length > 0 
        ? f.programa.map(p => (p as any).recinto || obtenerNombreRecinto(f.idRecinto)) 
        : [obtenerNombreRecinto(f.idRecinto)]
    ) || []
  ));

  const todosLosHorarios = Array.from(new Set(
    evento?.fechas.flatMap(f => 
      f.programa && f.programa.length > 0 
        ? f.programa.map(p => `${p.hora}${p.horaFin ? ` a ${p.horaFin}` : ''}`) 
        : [`${f.horaInicio} a ${f.horaFin}`]
    ) || []
  ));

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
              {(evento.estado as string) === 'cancelado' && (
                <span className="px-2.5 py-0.5 rounded bg-red-600/90 backdrop-blur-xs text-white text-xs font-bold uppercase tracking-wider border border-red-500/50 shadow-sm flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  CANCELADO
                </span>
              )}
              {(evento.estado as string) === 'suspendido' && (
                <span className="px-2.5 py-0.5 rounded bg-amber-500/90 backdrop-blur-xs text-neutral-900 text-xs font-bold uppercase tracking-wider border border-amber-400/50 shadow-sm flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  SUSPENDIDO
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">{evento.titulo}</h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1">
              Organizado por: <span className="font-semibold text-white">{evento.nombreOrganizador}</span>
            </p>
          </div>
        </div>

        {/* Resumen Superior Rápido */}
        <div className="bg-neutral-50 border-b border-neutral-200/80 px-6 sm:px-8 py-3.5 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7a132b] shrink-0" />
            <span>
              <strong>{evento.fechas.length === 1 ? 'Fecha programada' : 'Fechas programadas'}:</strong>{' '}
              {evento.fechas[0]?.fecha}{evento.fechas.length > 1 ? ` al ${evento.fechas[evento.fechas.length - 1]?.fecha}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#7a132b] shrink-0" />
            <span>
              <strong>{todosLosHorarios.length > 1 ? 'Horarios:' : 'Horario:'}</strong> {todosLosHorarios.join(' / ')} hrs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#7a132b] shrink-0" />
            <span>
              <strong>{todosLosRecintos.length > 1 ? 'Recintos:' : 'Recinto:'}</strong> {todosLosRecintos.join(' / ')}
            </span>
          </div>
        </div>

        {/* Cuerpo Informativo */}
        <div className="p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7a132b]" />
                <span>Descripción del Evento</span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                {evento.descripcion}
              </p>
            </div>

            {/* Aviso de Acceso Normativo */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3 text-xs text-emerald-800">
               <Clock className="w-5 h-5 shrink-0 text-emerald-600" />
               <p>
                 <strong>Acceso al evento:</strong> El ingreso a los recintos se habilita <strong>desde 30 minutos antes hasta finalizar la actividad</strong>. El acceso se gestiona mediante tu cuenta institucional.
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Programa y Fechas Detalladas */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7a132b]" />
              <span>Programa Oficial y Calendario</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Consulta los horarios, el programa de actividades, ponencias y asegura tu lugar en cada fecha.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {evento.fechas.map((fecha) => {
            const nombreRecinto = obtenerNombreRecinto(fecha.idRecinto);
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
            const expandido = diasExpandidos[fecha.id] ?? true;

            return (
              <div
                key={fecha.id}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:border-neutral-300 transition-all"
              >
                {/* Cronograma */}
                {fecha.programa && fecha.programa.length > 0 ? (
                  <div className="p-5 sm:p-6 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#7a132b]" />
                        <span>Programa de Actividades</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => toggleDiaPrograma(fecha.id)}
                        className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{expandido ? 'Ocultar programa de actividades' : 'Ver programa de actividades'}</span>
                        {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {expandido && (
                      <div className="space-y-3 pt-2">
                        {fecha.programa.map((item, idxProg) => (
                          <div
                            key={idxProg}
                            className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center gap-4 shadow-sm"
                          >
                            {/* Información de la Actividad */}
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h5 className="font-bold text-neutral-900 text-sm">
                                  {item.titulo}
                                </h5>
                                <div className="scale-90 origin-left flex flex-wrap items-center gap-1.5">
                                  <InsigniaEstado estado={(item as any).modalidadAsistencia || evento.modalidadAsistencia} />
                                  <InsigniaEstado estado={(item as any).visibilidad || evento.visibilidad} />
                                  <span
                                    className={`px-2 py-0.5 rounded-md border text-[10px] font-black tracking-wide ${
                                      inscripcionesAbiertas && (item as any).estado !== 'cancelado'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                                    }`}
                                  >
                                    {inscripcionesAbiertas && (item as any).estado !== 'cancelado' 
                                      ? 'LUGARES DISPONIBLES' 
                                      : 'REGISTRO CERRADO'}
                                  </span>
                                </div>
                              </div>
                              {item.descripcion && (
                                <p className="text-xs text-neutral-600 leading-relaxed">
                                  {item.descripcion}
                                </p>
                              )}
                              
                              {/* Detalles: Fecha, Horario y Recinto */}
                              <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 font-medium pt-1">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-[#7a132b]" />
                                  {fecha.fecha}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-[#7a132b]" />
                                  {item.hora}{item.horaFin ? ` a ${item.horaFin} hrs` : ''}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-[#7a132b]" />
                                  {(item as any).recinto || nombreRecinto}
                                </span>
                              </div>
                            </div>
                            
                            {/* Botón de Reserva Individual */}
                            <div className="shrink-0 w-full md:w-auto mt-2 md:mt-0 border-t border-neutral-100 md:border-0 pt-3 md:pt-0">
                              {((evento.estado as string) === 'cancelado' || (evento.estado as string) === 'suspendido' || !inscripcionesAbiertas || (item as any).estado === 'cancelado') ? (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full md:w-auto px-5 py-2.5 bg-neutral-100 border border-neutral-200 text-neutral-400 rounded-xl text-xs font-bold cursor-not-allowed inline-flex justify-center items-center gap-2"
                                >
                                  <Lock className="w-4 h-4" />
                                  {(item as any).estado === 'cancelado' ? 'Actividad cancelada' : 'No disponible'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/eventos/${evento.id}/reservar?dateId=${fecha.id}&actividadId=${idxProg}`)}
                                  className="w-full md:w-auto px-5 py-2.5 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs inline-flex justify-center items-center transition-colors"
                                >
                                  Reservar lugar
                                </button>
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
                      Actividad con acceso directo en el horario establecido ({fecha.horaInicio} a {fecha.horaFin} hrs).
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">{nombreRecinto}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Confirmación de Asistencia Libre */}
      {mostrarConfirmacionLibre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-neutral-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#7a132b]" />
                Confirmar Intención de Asistencia
              </h3>
              <p className="text-sm text-neutral-600 mb-6">
                El registro expresa tu intención de asistir. No garantiza un lugar ni genera un boleto.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacionLibre(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarRegistroDirecto}
                  className="px-4 py-2 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Confirmar Registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleEventoPagina;