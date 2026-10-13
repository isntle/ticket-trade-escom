import React, { useState, useEffect } from 'react';
import { Clock, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck, Ticket, Users, Lock } from 'lucide-react';
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

  // Temporizador de 2 minutos (120s) para apartados temporales (Trayectoria D)
  useEffect(() => {
    if (!reservacionActiva?.tiempoExpiracionApartado) {
      setSegundosRestantes(null);
      return;
    }

    const actualizarReloj = () => {
      const msRestantes = reservacionActiva.tiempoExpiracionApartado! - Date.now();
      if (msRestantes <= 0) {
        // D-2: Libera el lugar inmediatamente en el sistema
        liberarApartadoAsiento(reservacionActiva.id);
        // D-3: Limpia el apartado y deja al Actor en la vista del mapa para elegir otro asiento
        setSegundosRestantes(0);
        setReservacionActiva(null);
        setAsientoSeleccionado(null);
        mostrarNotificacion(
          'Tiempo expirado',
          'El tiempo límite de 2 minutos para confirmar tu lugar ha vencido y el asiento fue liberado.',
          'error'
        );
      } else {
        setSegundosRestantes(Math.floor(msRestantes / 1000));
      }
    };

    actualizarReloj();
    const intervalo = setInterval(actualizarReloj, 1000);
    return () => clearInterval(intervalo);
  }, [reservacionActiva, liberarApartadoAsiento, mostrarNotificacion]);

// === INICIO TRAYECTORIA A: Elegibilidad denegada ===
  
// 1. Validar correo confirmado
  if (usuarioActual && usuarioActual.correoConfirmado === false) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Acceso Restringido"
          descripcion="Debes confirmar tu correo electrónico institucional para poder reservar un lugar en este evento."
          textoAccion="Volver al inicio"
          alHacerAccion={() => navigate('/')}
        />
      </div>
    );
  }

  // 2. Validar elegibilidad de público permitido
  const publicoPermitido = evento?.publicoPermitido;
  if (usuarioActual && publicoPermitido && Array.isArray(publicoPermitido) && publicoPermitido.length > 0) {
    const esElegible = usuarioActual.roles.some(rol => publicoPermitido.includes(rol));
    if (!esElegible) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16">
          <EstadoVacio
            titulo="Perfil no autorizado"
            descripcion={`Este evento está restringido exclusivamente para el siguiente público: ${publicoPermitido.join(', ')}.`}
            textoAccion="Volver a la cartelera"
            alHacerAccion={() => navigate('/eventos')}
          />
        </div>
      );
    }
  }
  // === FIN TRAYECTORIA A ===


  // === INICIO TRAYECTORIA B: Inscripciones cerradas ===
// === INICIO TRAYECTORIA C (CU-MT-02): Validar cierre de inscripciones ===
  const inscripcionesAbiertas = evento?.inscripcionesAbiertas !== false;
  const limiteInscripcion = evento?.fechaCierreInscripcion;
  const inscripcionVencida = limiteInscripcion ? new Date(limiteInscripcion) < new Date() : false;
  // === FIN TRAYECTORIA C ===
  if (!inscripcionesAbiertas || inscripcionVencida) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Inscripciones Cerradas"
          descripcion="El proceso de inscripciones para este evento no se encuentra disponible actualmente."
          textoAccion="Volver a la cartelera"
          alHacerAccion={() => navigate('/eventos')}
        />
      </div>
    );
  }
  // === FIN TRAYECTORIA B ===

// Ya no exigimos que exista arregloFinal para entrar
if (!evento || !fecha) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Información no disponible"
          descripcion="No se pudo cargar la información del evento o la fecha solicitada."
          textoAccion="Volver al detalle del evento"
          alHacerAccion={() => navigate(`/eventos/${eventId}`)}
        />
      </div>
    );
  }

  // === INICIO TRAYECTORIA C: Identificar modalidad ===
  const esSinMapa = !arregloFinal; // Si no hay mapa, aplicamos la Trayectoria C
  // === FIN TRAYECTORIA C ===

  const fechaLimiteInscripciones = fecha.fechaLimiteInscripciones
    ? new Date(fecha.fechaLimiteInscripciones).getTime()
    : new Date(`${fecha.fecha}T${fecha.horaInicio}:00`).getTime() - 60 * 60 * 1000;
  const estadoInscripciones =
    fecha.estadoInscripciones ||
    (evento.estado === 'publicado' || evento.estado === 'en_curso' ? 'abiertas' : 'cerradas');

  if (estadoInscripciones === 'cerradas' || fechaLimiteInscripciones <= Date.now()) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <button
          type="button"
          onClick={() => navigate(`/eventos/${eventId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a detalles del evento
        </button>
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-neutral-900">Inscripciones cerradas</h1>
          <p className="text-sm text-neutral-500 mt-1 mb-5">
             El día {fecha.fecha}, de {fecha.horaInicio} a {fecha.horaFin} hrs, ya no admite nuevas reservaciones.
          </p>
          <AlertaMensaje
            tipo="advertencia"
            titulo="ERR-MT-02 · Reservaciones no disponibles"
            mensaje="Las reservaciones y boletos existentes continúan vigentes. Consulta otra sesión o vuelve al detalle del evento."
          />
        </div>
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
        r.idUsuario !== usuarioActual?.id &&
        r.idAsiento
    )
    .map((r) => r.idAsiento!);

    // === INICIO TRAYECTORIA E: Función para detectar cruce de horarios ===
  const tieneSuperposicion = () => {

    if (!usuarioActual || !fecha) return false;
    
    const reservacionesActivas = listaReservaciones.filter(
      (reservacion) =>
        reservacion.idUsuario === usuarioActual.id &&
        reservacion.estado === 'confirmada'
    );
    
    // Convertimos la hora (ej. "14:30") a minutos desde la medianoche para comparar fácil
    const aMinutos = (horaStr: string) => {
      if (!horaStr) return 0;
      const [h, m] = horaStr.split(':').map(Number);
      return (h * 60) + m;
    };

    const inicioNuevo = aMinutos(fecha.horaInicio);
    const finNuevo = aMinutos(fecha.horaFin);

    // Revisar si alguna reservación existente cruza con el nuevo evento
    for (const res of reservacionesActivas) {
      // Necesitamos buscar la fecha en listaEventos porque el historial solo guarda IDs
      for (const evt of listaEventos) {
        const fechaExistente = evt.fechas.find((f) => f.id === res.idFechaEvento);
        if (fechaExistente) {
          // Si es el mismo día (misma fecha literal, ej. "12 Nov 2026")
          if (fechaExistente.fecha === fecha.fecha) {
            const inicioExistente = aMinutos(fechaExistente.horaInicio);
            const finExistente = aMinutos(fechaExistente.horaFin);
            
            // Lógica de cruce de rangos
            const hayCruce = (inicioNuevo < finExistente) && (finNuevo > inicioExistente);
            if (hayCruce) {
              return evt.titulo; // Devolvemos el nombre del evento que choca
            }
          }
        }
      }
    }
    return false;
  };
  // === FIN TRAYECTORIA E ===

  // Manejo de clic en un asiento del mapa
  const manejarSeleccionAsiento = (asiento: ConfiguracionAsiento) => {
    if (!usuarioActual) {
      mostrarNotificacion('Inicia Sesión', 'Debes iniciar sesión para apartar un asiento.', 'error');
      navigate('/login');
      return;
    }

    setErrorColision(null);

    const yaTieneReservacionEnLaSesion = listaReservaciones.some(
      (reservacion) =>
        reservacion.idUsuario === usuarioActual.id &&
        reservacion.idFechaEvento === dateId &&
        reservacion.estado === 'confirmada'
    );

    if (yaTieneReservacionEnLaSesion) {
      const mensaje = 'Ya tienes una reservación confirmada para esta sesión.';
      setErrorColision(mensaje);
      mostrarNotificacion('Reservación duplicada', mensaje, 'error');
      return;
    }

    // === INICIO TRAYECTORIA E: Verificación al elegir butaca ===
    const choque = tieneSuperposicion();
    if (choque) {
      setErrorColision(`Superposición de horarios. Ya tienes una reservación confirmada para el evento "${choque}" que coincide con este horario.`);
      mostrarNotificacion('Conflicto de horario', 'Ya tienes otra reservación en este horario.', 'error');
      return; // Detenemos la acción
    }
    // === FIN TRAYECTORIA E ===

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
        `Has apartado el asiento ${asiento.etiqueta}. Tienes 2 minutos para confirmar tu reservación.`,
        'informacion'
      );
    } else {
      // Trayectoria D (Paso 6 - ERR-MT-04): El asiento cambió de estado / ya no está disponible
      setAsientoSeleccionado(null);
      setReservacionActiva(null);
      setErrorColision(resultado.error || 'El asiento seleccionado cambió de estado y ya no está disponible. Selecciona un nuevo asiento en el mapa.');
      mostrarNotificacion('Asiento no disponible', resultado.error || 'Selecciona otro lugar en el mapa.', 'error');
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
      // Trayectoria D (Paso 8 - ERR-MT-04 / ERR-MT-05): Expiró o cambió de estado al confirmar
      liberarApartadoAsiento(reservacionActiva.id);
      setAsientoSeleccionado(null);
      setReservacionActiva(null);
      setErrorColision(resultado.error || 'El asiento ya no está disponible o el apartado venció. Por favor, selecciona un nuevo asiento en el mapa.');
      mostrarNotificacion('No se pudo confirmar', resultado.error || 'Selecciona un nuevo asiento en el mapa.', 'error');
    }
  };

  // === INICIO TRAYECTORIA C: Confirmación directa (Paso C-4 y C-5) ===
  const manejarConfirmacionGeneral = () => {
    if (!usuarioActual) return;
    setConfirmando(true);
    setErrorColision(null);

    // === INICIO TRAYECTORIA E: Verificación al confirmar cupo general ===
    const choque = tieneSuperposicion();
    if (choque) {
      setConfirmando(false);
      setErrorColision(`Superposición de horarios. Ya tienes una reservación confirmada para el evento "${choque}" que coincide con este horario.`);
      mostrarNotificacion('Conflicto de horario', 'Ya tienes otra reservación en este horario.', 'error');
      return; // Detenemos la acción
    }
    // === FIN TRAYECTORIA E ===

    const capacidad = evento.aforoMaximo ?? recinto?.capacidad;
    const lugaresOcupados = listaReservaciones.filter(
      (reservacion) =>
        reservacion.idFechaEvento === dateId &&
        reservacion.estado === 'confirmada'
    ).length;

    if (capacidad !== undefined && lugaresOcupados >= capacidad) {
      setConfirmando(false);
      setErrorColision('Cupo general agotado. Ya no hay lugares disponibles en esta sesión.');
      mostrarNotificacion('Cupo agotado', 'No hay lugares disponibles en esta sesión.', 'error');
      return;
    }

    const yaTieneReservacionEnLaSesion = listaReservaciones.some(
      (reservacion) =>
        reservacion.idUsuario === usuarioActual.id &&
        reservacion.idFechaEvento === dateId &&
        reservacion.estado === 'confirmada'
    );

    if (yaTieneReservacionEnLaSesion) {
      const mensaje = 'Ya tienes una reservación confirmada para esta sesión.';
      setConfirmando(false);
      setErrorColision(mensaje);
      mostrarNotificacion('Reservación duplicada', mensaje, 'error');
      return;
    }

    // Intentar apartar un lugar general de forma indivisible (Paso C-4)
    const resultadoApartado = apartarAsiento(
      evento.id,
      fecha.id,
      `gen-${Date.now()}`, // ID genérico
      'Cupo General',      // Etiqueta
      usuarioActual.id,
      usuarioActual.nombre,
      usuarioActual.correo
    );

    if (resultadoApartado.exito && resultadoApartado.reservacion) {
      // Confirmar inmediatamente (omitiendo el paso de espera)
      const confirmacion = confirmarReservacion(resultadoApartado.reservacion.id);
      setConfirmando(false);
      
      if (confirmacion.exito) {
        mostrarNotificacion(
          'Reservación exitosa (OK-MT-01)',
          'Tu lugar general ha sido asegurado y tu boleto digital está listo.',
          'exito'
        );
        navigate('/mis-reservaciones');
      } else {
        setErrorColision(confirmacion.error || 'Error al generar el boleto.');
      }
    } else {
      setConfirmando(false);
      // Trayectoria F: Cupo general agotado -> ERR-MT-03
      setErrorColision('Cupo general agotado. Ya no hay lugares disponibles en esta sesión.');
      mostrarNotificacion('Cupo agotado', 'No hay lugares disponibles en esta sesión.', 'error');
    }
  };
  // === FIN TRAYECTORIA C ===

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
              {esSinMapa ? 'Taquilla Digital ESCOM — Reservación de Cupo General' : 'Taquilla Digital ESCOM — Selección de Asiento'}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-0.5">
              {evento.titulo}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Sesión: <span className="font-semibold text-neutral-800">{fecha.fecha}</span> ({fecha.horaInicio} a {fecha.horaFin} hrs) · Recinto: <span className="font-semibold text-neutral-800">{recinto?.nombre}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Cronómetro de apartado de 2 minutos */}
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
        <div className="mb-6 space-y-3">
          <AlertaMensaje
            tipo="error"
            titulo="Aviso de Taquilla"
            mensaje={errorColision}
            alCerrar={() => setErrorColision(null)}
          />
          {/* === TRAYECTORIA F (Paso F-2 y F-3): Opción de Lista de Espera (CU-MT-04) === */}
          {errorColision.includes('Cupo general agotado') && usuarioActual && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-amber-900 font-medium">
                El cupo de esta sesión se ha agotado. ¿Deseas ingresar a la lista de espera por si se libera un lugar?
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/eventos/${eventId}`)}
                  className="px-3.5 py-2 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Abandonar proceso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    unirseAListaDeEspera(evento.id, fecha.id, usuarioActual.id, usuarioActual.nombre, usuarioActual.correo);
                    mostrarNotificacion('Lista de espera', 'Te has unido a la lista de espera exitosamente.', 'exito');
                    navigate('/mis-reservaciones');
                  }}
                  className="px-3.5 py-2 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Unirse a la lista de espera
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mapa Interactivo o Mensaje de Cupo General (Trayectoria C) */}
        <div className="lg:col-span-2">
          {esSinMapa ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 flex flex-col items-center justify-center h-full min-h-[400px]">
               <div className="w-16 h-16 bg-neutral-50 border border-neutral-100 rounded-full flex items-center justify-center mb-4">
                 <Users className="w-8 h-8 text-neutral-400" />
               </div>
               <h3 className="text-lg font-bold text-neutral-900">Modalidad de Cupo General</h3>
               <p className="text-sm text-neutral-500 text-center max-w-md mt-2">
                 Este evento tiene aforo controlado pero no requiere selección de butaca en un mapa. Al confirmar, el sistema garantizará un lugar disponible para ti en el recinto.
               </p>
            </div>
          ) : (
            <MapaAsientos
              asientos={arregloFinal!.asientos}
              modo="asistente"
              idAsientoSeleccionado={asientoSeleccionado?.id}
              idsAsientosApartados={idsAsientosApartados}
              idsAsientosReservados={idsAsientosReservados}
              alSeleccionarAsiento={manejarSeleccionAsiento}
              permiteEliminar={recinto?.permiteEliminarAsientos}
            />
          )}
        </div>

        {/* Panel Lateral de Resumen y Confirmación */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#7a132b]" />
              <span>Resumen de tu Reservación</span>
            </h3>

            {asientoSeleccionado || esSinMapa ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#7a132b]/5 border border-[#7a132b]/20">
                  <div className="text-[11px] text-neutral-500">
                    {esSinMapa ? 'Tipo de Acceso' : 'Asiento Seleccionado'}
                  </div>
                  <div className="text-xl font-bold font-mono text-[#7a132b] mt-0.5">
                    {esSinMapa ? 'Cupo General' : `Fila ${asientoSeleccionado?.fila}, Butaca ${asientoSeleccionado?.numero}`}
                  </div>
                  <div className="text-[11px] text-neutral-600 mt-1 capitalize">
                    Categoría: <span className="font-semibold">{esSinMapa ? 'General' : asientoSeleccionado?.categoria}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-neutral-100 pt-3 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Asistente registrado:</span>
                    <span className="font-semibold text-neutral-900">{usuarioActual?.nombre || 'Asistente'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correo institucional:</span>
                    <span className="font-semibold text-neutral-900 truncate max-w-[170px]">{usuarioActual?.correo || 'correo@ipn.mx'}</span>
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
                  onClick={esSinMapa ? manejarConfirmacionGeneral : manejarConfirmacion}
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
