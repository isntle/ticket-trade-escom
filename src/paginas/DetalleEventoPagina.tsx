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
  UserCheck
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
    usuarioActual.id === evento.idOrganizador ||
    usuarioActual.roles.includes('subdireccion');

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

        {/* Cuerpo Informativo */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-2">
                Descripción del Evento
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
                      className="px-3 py-1 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-800"
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

      {/* Sesiones y Fechas Programadas (No son sinónimos: cada fecha tiene su horario y recinto) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">
            Sesiones y Fechas Programadas ({evento.fechas.length})
          </h2>
          <span className="text-xs text-neutral-500">
            Selecciona la fecha a la que deseas asistir
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {evento.fechas.map((fecha, indice) => {
            const nombreRecinto = obtenerNombreRecinto(fecha.idRecinto);
            return (
              <div
                key={fecha.id}
                className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 font-mono text-xs font-bold">
                      Jornada {indice + 1}
                    </span>
                    <span className="font-bold text-neutral-900 text-sm">{fecha.fecha}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {fecha.horaInicio} a {fecha.horaFin} hrs
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      {nombreRecinto}
                    </span>
                  </div>

                  {fecha.ponentes && fecha.ponentes.length > 0 && (
                    <div className="text-[11px] text-neutral-500 pt-1">
                      Ponente de sesión: <span className="font-medium text-neutral-700">{fecha.ponentes.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Acción de Registro según la modalidad */}
                <div className="shrink-0">
                  {evento.modalidadAsistencia === 'controlado' ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/eventos/${evento.id}/reservar?dateId=${fecha.id}`)}
                      className="boton-primario px-5 py-2.5 text-xs cursor-pointer shadow-xs inline-flex items-center gap-2"
                    >
                      <span>Elegir Butaca y Reservar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={procesandoRegistro}
                      onClick={() => manejarRegistroDirecto(fecha)}
                      className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-2 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{procesandoRegistro ? 'Registrando...' : 'Registrar mi Asistencia'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
