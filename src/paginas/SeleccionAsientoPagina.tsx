import React, { useState, useEffect } from 'react';
import { Clock, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, Ticket } from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { MapaAsientos } from '../componentes/asientos/MapaAsientos';
import { AlertaMensaje } from '../componentes/ui/AlertaMensaje';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { ConfiguracionAsiento, Reservacion } from '../tipos';

interface PropiedadesSeleccionAsiento {
  eventId: string;
  dateId: string;
  navigate: (ruta: string) => void;
}

export const SeleccionAsientoPagina: React.FC<PropiedadesSeleccionAsiento> = ({
  eventId,
  dateId,
  navigate
}) => {
  const {
    listaEventos,
    listaRecintos,
    listaArreglos,
    listaReservaciones,
    apartarAsiento,
    liberarApartadoAsiento,
    confirmarReservacion,
    unirseAListaDeEspera
  } = useDatos();

  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const evento = listaEventos.find((e) => e.id === eventId);
  const fecha = evento?.fechas.find((f) => f.id === dateId);
  const recinto = listaRecintos.find((r) => r.id === fecha?.idRecinto);

  // Buscar el arreglo oficial versión final para esta fecha
  const arregloFinal = listaArreglos.find(
    (a) => a.idFechaEvento === dateId && a.estado === 'version_final'
  ) || listaArreglos.find((a) => a.idFechaEvento === dateId);

  // Estados del apartado
  const [asientoSeleccionado, setAsientoSeleccionado] = useState<ConfiguracionAsiento | null>(null);
  const [reservacionActiva, setReservacionActiva] = useState<Reservacion | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorColision, setErrorColision] = useState<string | null>(null);

  // Temporizador de 10 minutos (600s) para apartados temporales
  useEffect(() => {
    if (!reservacionActiva?.tiempoExpiracionApartado) {
      setSegundosRestantes(null);
      return;
    }

    const actualizarReloj = () => {
      const msRestantes = reservacionActiva.tiempoExpiracionApartado! - Date.now();
      if (msRestantes <= 0) {
        setSegundosRestantes(0);
        setReservacionActiva(null);
        setAsientoSeleccionado(null);
        mostrarNotificacion(
          'Tiempo expirado',
          'El tiempo límite de 10 minutos para confirmar tu lugar ha vencido',
          'advertencia'
        );
      } else {
        setSegundosRestantes(Math.floor(msRestantes / 1000));
      }
    };

    actualizarReloj();
    const intervalo = setInterval(actualizarReloj, 1000);
    return () => clearInterval(intervalo);
  }, [reservacionActiva, mostrarNotificacion]);

  if (!evento || !fecha || !arregloFinal) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Arreglo de asientos no disponible"
          descripcion="Este evento no cuenta con un arreglo de asientos confirmado para la fecha seleccionada."
          textoAccion="Volver al detalle del evento"
          alHacerAccion={() => navigate(`/eventos/${eventId}`)}
        />
      </div>
    );
  }

  // Lista de asientos actualmente reservados u ocupados en esta fecha
  const idsAsientosReservados = listaReservaciones
    .filter((r) => r.idFechaEvento === dateId && r.estado === 'confirmada' && r.idAsiento)
    .map((r) => r.idAsiento!);

  // Lista de asientos en apartado temporal por otros usuarios
  const idsAsientosApartados = listaReservaciones
    .filter(
      (r) =>
        r.idFechaEvento === dateId &&
        r.estado === 'apartado_temporal' &&
        r.tiempoExpiracionApartado &&
        r.tiempoExpiracionApartado > Date.now() &&
        r.idUsuario !== usuarioActual.id &&
        r.idAsiento
    )
    .map((r) => r.idAsiento!);

  // Manejo de clic en un asiento del mapa
  const manejarSeleccionAsiento = (asiento: ConfiguracionAsiento) => {
    setErrorColision(null);

    // Si ya tenía un apartado, liberarlo
    if (reservacionActiva) {
      liberarApartadoAsiento(reservacionActiva.id);
      setReservacionActiva(null);
    }

    // Intentar apartar el nuevo asiento
    const resultado = apartarAsiento(
      evento.id,
      fecha.id,
      asiento.id,
      asiento.etiqueta,
      usuarioActual.id,
      usuarioActual.nombre,
      usuarioActual.correo
    );

    if (resultado.exito && resultado.reservacion) {
      setAsientoSeleccionado(asiento);
      setReservacionActiva(resultado.reservacion);
      mostrarNotificacion(
        'Lugar apartado temporalmente',
        `Has apartado el asiento ${asiento.etiqueta}. Tienes 10 minutos para confirmar tu reservación.`,
        'informacion'
      );
    } else {
      setErrorColision(resultado.error || 'No fue posible apartar este lugar.');
      mostrarNotificacion('Asiento ocupado', resultado.error || '', 'error');
    }
  };

  // Confirmar la reservación final (sin pasarelas de pago)
  const manejarConfirmacion = () => {
    if (!reservacionActiva) return;
    setConfirmando(true);

    const resultado = confirmarReservacion(reservacionActiva.id);
    setConfirmando(false);

    if (resultado.exito) {
      mostrarNotificacion(
        'Reservación confirmada exitosamente',
        `Tu boleto digital con código QR para el asiento ${asientoSeleccionado?.etiqueta} ya está disponible.`,
        'exito'
      );
      navigate('/mis-reservaciones');
    } else {
      setErrorColision(resultado.error || 'Error al confirmar la reservación.');
      mostrarNotificacion('Error', resultado.error || '', 'error');
    }
  };

  const formatoTiempo = (segundosTotales: number) => {
    const m = Math.floor(segundosTotales / 60);
    const s = segundosTotales % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate(`/eventos/${eventId}`)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a detalles del evento</span>
      </button>

      {/* Cabecera de la Taquilla */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
              Taquilla Digital ESCOM — Selección de Butaca
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-0.5">
              {evento.titulo}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Sesión: <span className="font-semibold text-neutral-800">{fecha.fecha}</span> ({fecha.horaInicio} a {fecha.horaFin} hrs) · Recinto: <span className="font-semibold text-neutral-800">{recinto?.nombre}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Cronómetro de Apartado de 10 Minutos */}
            {segundosRestantes !== null && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-amber-900 shrink-0">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                    Tiempo de apartado restante
                  </div>
                  <div className="text-lg font-mono font-extrabold text-amber-900 leading-none">
                    {formatoTiempo(segundosRestantes)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {errorColision && (
        <div className="mb-6">
          <AlertaMensaje
            tipo="error"
            titulo="Colisión de Asiento"
            mensaje={errorColision}
            alCerrar={() => setErrorColision(null)}
          />
        </div>
      )}

      {/* Contenedor Principal: Mapa a la izquierda, Resumen a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa Interactivo */}
        <div className="lg:col-span-2">
          <MapaAsientos
            asientos={arregloFinal.asientos}
            modo="asistente"
            idAsientoSeleccionado={asientoSeleccionado?.id}
            idsAsientosApartados={idsAsientosApartados}
            idsAsientosReservados={idsAsientosReservados}
            alSeleccionarAsiento={manejarSeleccionAsiento}
            permiteEliminar={recinto?.permiteEliminarAsientos}
          />
        </div>

        {/* Panel Lateral de Resumen y Confirmación */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#7a132b]" />
              <span>Resumen de tu Reservación</span>
            </h3>

            {asientoSeleccionado ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#7a132b]/5 border border-[#7a132b]/20">
                  <div className="text-[11px] text-neutral-500">Asiento Seleccionado</div>
                  <div className="text-xl font-bold font-mono text-[#7a132b] mt-0.5">
                    Fila {asientoSeleccionado.fila}, Butaca {asientoSeleccionado.numero}
                  </div>
                  <div className="text-[11px] text-neutral-600 mt-1 capitalize">
                    Categoría: <span className="font-semibold">{asientoSeleccionado.categoria}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-neutral-100 pt-3 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Asistente registrado:</span>
                    <span className="font-semibold text-neutral-900">{usuarioActual.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correo institucional:</span>
                    <span className="font-semibold text-neutral-900 truncate max-w-[170px]">{usuarioActual.correo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costo del boleto:</span>
                    <span className="font-bold text-emerald-600">Gratuito ($0.00 MXN)</span>
                  </div>
                </div>

                {/* Principio Institucional: Cero Pasarelas de Pago */}
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-[11px] text-neutral-500 leading-snug">
                  Este es un servicio institucional de ESCOM. No se solicita tarjeta bancaria ni cobros por servicio.
                </div>

                <button
                  type="button"
                  disabled={confirmando}
                  onClick={manejarConfirmacion}
                  className="w-full py-3 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{confirmando ? 'Generando boleto...' : 'Confirmar mi Reservación'}</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Haz clic en una butaca libre del mapa para apartar tu lugar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
