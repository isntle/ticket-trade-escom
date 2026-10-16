import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import {
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Camera,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Lock
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { RegistroEscaneo, BoletoDigital } from '../tipos';

interface PropiedadesEscaneoStaff {
  navigate: (ruta: string) => void;
}

const CLAVE_INTENTOS_MANUALES_CHECKIN = 'ticket_trade_checkin_intentos_manuales';

const obtenerIntentosManualesActivos = (idOperador: string | undefined, ahora: number): number[] => {
  if (!idOperador) return [];
  try {
    const intentos = JSON.parse(localStorage.getItem(CLAVE_INTENTOS_MANUALES_CHECKIN) || '[]') as Array<{ idOperador: string; instante: number }>;
    return intentos.filter((intento) => intento.idOperador === idOperador && ahora - intento.instante < 60_000).map((intento) => intento.instante);
  } catch {
    return [];
  }
};

const guardarIntentoManualInexistente = (idOperador: string, ahora: number) => {
  try {
    const intentos = JSON.parse(localStorage.getItem(CLAVE_INTENTOS_MANUALES_CHECKIN) || '[]') as Array<{ idOperador: string; instante: number }>;
    const vigentes = intentos.filter((intento) => ahora - intento.instante < 60_000);
    localStorage.setItem(CLAVE_INTENTOS_MANUALES_CHECKIN, JSON.stringify([...vigentes, { idOperador, instante: ahora }]));
  } catch {
    // El control de intentos no debe interrumpir el registro de una entrada.
  }
};

export const EscaneoStaffPagina: React.FC<PropiedadesEscaneoStaff> = ({ navigate }) => {
  const { listaBoletos, procesarCheckIn, listaEventos, listaRecintos, listaBloqueos } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [errorCamara, setErrorCamara] = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [faseControl, setFaseControl] = useState<'seleccion' | 'lector'>('seleccion');
  const [ahoraSistema, setAhoraSistema] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlesCamara = useRef<IScannerControls | null>(null);
  const lectorQr = useRef(new BrowserQRCodeReader());
  const leyendoQr = useRef(false);
  const reanudarCamaraAlContinuar = useRef(false);

  // Solo eventos propios del organizador o asignados explícitamente al Staff.
  const eventosPermitidos = listaEventos.filter((ev) => {
    if (!usuarioActual) return false;
    const esResponsable = (usuarioActual.roles.includes('organizador') && ev.idOrganizador === usuarioActual.id) ||
      (usuarioActual.roles.includes('staff') && Boolean(usuarioActual.eventosAsignadosStaff?.includes(ev.id)));
    return esResponsable && ev.modalidadAsistencia === 'controlado';
  });

  const [eventoActivoId, setEventoActivoId] = useState(() => {
    return eventosPermitidos[0]?.id || 'evt-simposio-ia';
  });

  const [fechaActivaId, setFechaActivaId] = useState(() => {
    return eventosPermitidos[0]?.fechas[0]?.id || 'fec-simposio-d1';
  });

  // Resultado de escaneo activo (soft screen)
  const [ultimoResultado, setUltimoResultado] = useState<{
    exito: boolean;
    resultado: RegistroEscaneo['resultado'];
    boleto?: BoletoDigital;
    mensaje: string;
    horaRegistro?: string;
  } | null>(null);

  const eventoSeleccionado =
    listaEventos.find((e) => e.id === eventoActivoId) || eventosPermitidos[0] || listaEventos[0];
  const fechaSeleccionada =
    eventoSeleccionado?.fechas.find((f) => f.id === fechaActivaId) || eventoSeleccionado?.fechas[0];

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhoraSistema(Date.now()), 15_000);
    return () => window.clearInterval(intervalo);
  }, []);

  // Mantener la selección válida cuando cambia el usuario activo o la asignación de eventos.
  useEffect(() => {
    const eventoValido = eventosPermitidos.some((evento) => evento.id === eventoActivoId);
    const eventoActual = eventoValido
      ? eventosPermitidos.find((evento) => evento.id === eventoActivoId)
      : eventosPermitidos[0];

    if (!eventoValido && eventoActual) {
      setEventoActivoId(eventoActual.id);
    }

    const fechaValida = eventoActual?.fechas.some((fecha) => fecha.id === fechaActivaId);
    if (!fechaValida) {
      setFechaActivaId(eventoActual?.fechas[0]?.id || '');
    }
  }, [eventoActivoId, eventosPermitidos, fechaActivaId]);

  // Verificación de si el staff tiene asignado este evento
  const estaAsignadoAEvento = Boolean(usuarioActual && eventoSeleccionado &&
    ((usuarioActual.roles.includes('organizador') && eventoSeleccionado.idOrganizador === usuarioActual.id) ||
    (usuarioActual.roles.includes('staff') && usuarioActual.eventosAsignadosStaff?.includes(eventoSeleccionado.id))));

  // Cálculo de aforo e ingresos en vivo en puerta
  const boletosEvento = listaBoletos.filter((b) => b.idEvento === eventoSeleccionado?.id && b.idFechaEvento === fechaSeleccionada?.id);
  const totalEmitidos = boletosEvento.filter((boleto) => boleto.estado !== 'cancelado').length;
  const totalIngresados = boletosEvento.filter((b) => b.estado === 'utilizado').length;
  const porcentajeIngreso = totalEmitidos ? Math.round((totalIngresados / totalEmitidos) * 100) : 0;
  const recintoSeleccionado = listaRecintos.find((recinto) => recinto.id === fechaSeleccionada?.idRecinto);

  const estadoDia = (() => {
    if (!eventoSeleccionado || !fechaSeleccionada) return { disponible: false, etiqueta: 'Día no disponible', detalle: 'Selecciona un evento y un día válido.' };
    if (eventoSeleccionado.estado === 'cancelado') return { disponible: false, etiqueta: 'Cancelado', detalle: 'Este evento fue cancelado.' };
    const bloqueo = listaBloqueos.find((elemento) => {
      const aplicaRecinto = elemento.idRecinto === fechaSeleccionada.idRecinto || elemento.idRecinto === 'todos' || Boolean(elemento.idsRecintos?.includes(fechaSeleccionada.idRecinto));
      if (!aplicaRecinto || fechaSeleccionada.fecha < elemento.fechaInicio) return false;
      if (elemento.esIndefinido) return true;
      const finBloqueo = elemento.fechaFin || elemento.fechaInicio;
      return fechaSeleccionada.fecha <= finBloqueo && fechaSeleccionada.horaInicio < (elemento.horaFin || '23:59') && fechaSeleccionada.horaFin > (elemento.horaInicio || '00:00');
    });
    if (bloqueo) return { disponible: false, etiqueta: 'Suspendido', detalle: `El día está suspendido por: ${bloqueo.titulo}.` };
    if (eventoSeleccionado.modalidadAsistencia !== 'controlado') return { disponible: false, etiqueta: 'Sin control de acceso', detalle: 'El evento no tiene aforo controlado.' };
    const inicio = new Date(`${fechaSeleccionada.fecha}T${fechaSeleccionada.horaInicio}:00`).getTime();
    const fin = new Date(`${fechaSeleccionada.fecha}T${fechaSeleccionada.horaFin}:00`).getTime();
    const apertura = inicio - 30 * 60 * 1000;
    if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) return { disponible: false, etiqueta: 'Horario inválido', detalle: 'No se puede validar el horario de este día.' };
    if (ahoraSistema < apertura) return { disponible: false, etiqueta: 'Aún no disponible', detalle: `El control abre ${new Date(apertura).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}.` };
    if (ahoraSistema >= fin) return { disponible: false, etiqueta: 'Finalizado', detalle: 'El horario del día ya terminó; no se admiten entradas tardías.' };
    return { disponible: true, etiqueta: 'Disponible para Check-in', detalle: 'La cámara y la captura manual están habilitadas.' };
  })();

  const fallosManualesActivos = obtenerIntentosManualesActivos(usuarioActual?.id, ahoraSistema);
  const limiteManualHasta = fallosManualesActivos.length >= 20 ? fallosManualesActivos[0] + 60_000 : 0;
  const segundosRestantesManual = Math.max(0, Math.ceil((limiteManualHasta - ahoraSistema) / 1000));

  useEffect(() => () => controlesCamara.current?.stop(), []);

  const iniciarCamara = async () => {
    setErrorCamara('');
    try {
      const video = videoRef.current;
      if (!video) return;
      controlesCamara.current = await lectorQr.current.decodeFromVideoDevice(undefined, video, (resultado) => {
        if (!resultado || leyendoQr.current) return;
        leyendoQr.current = true;
        controlesCamara.current?.stop();
        setCamaraActiva(false);
        reanudarCamaraAlContinuar.current = true;
        ejecutarEscaneo(resultado.getText());
        window.setTimeout(() => { leyendoQr.current = false; }, 800);
      });
      setCamaraActiva(true);
    } catch {
      setErrorCamara('No se pudo abrir la cámara. Revisa el permiso del navegador o captura el identificador manualmente.');
      setCamaraActiva(false);
    }
  };

  const ejecutarEscaneo = (codigoAProcesar: string, validarFormatoManual = false) => {
    if (!codigoAProcesar.trim()) return;
    if (!/^TT-[A-F0-9]{32}$/i.test(codigoAProcesar.trim())) {
      setUltimoResultado({ exito: false, resultado: 'codigo_no_reconocido', mensaje: 'Código no reconocido. Verifica que sea el identificador completo del boleto Ticket Trade.' });
      return;
    }
    if (validarFormatoManual && segundosRestantesManual > 0) {
      mostrarNotificacion('Límite de capturas excedido', `Espera ${segundosRestantesManual} s para volver a validar manualmente. La cámara permanece disponible.`, 'advertencia');
      return;
    }
    controlesCamara.current?.stop();
    setCamaraActiva(false);

    if (!estaAsignadoAEvento) {
      mostrarNotificacion(
        'Acceso Denegado',
        'No estás asignado como Staff autorizado para este evento específico.',
        'error'
      );
      return;
    }

    const res = procesarCheckIn(
      codigoAProcesar.trim(),
      usuarioActual?.nombre || 'Staff ESCOM',
      fechaSeleccionada?.id,
      usuarioActual || undefined,
      eventoSeleccionado?.id
    );
    const ahora = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (validarFormatoManual && res.resultado === 'inexistente') {
      const ahoraDelIntento = Date.now();
      guardarIntentoManualInexistente(usuarioActual!.id, ahoraDelIntento);
      setAhoraSistema(ahoraDelIntento);
    }

    setUltimoResultado({
      ...res,
      horaRegistro: ahora
    });
    setCodigoIngresado('');
  };

  const limpiarParaSiguiente = () => {
    setUltimoResultado(null);
    if (reanudarCamaraAlContinuar.current) {
      reanudarCamaraAlContinuar.current = false;
      window.requestAnimationFrame(() => void iniciarCamara());
    }
  };

  const iniciarControl = () => {
    if (!estaAsignadoAEvento) {
      mostrarNotificacion('Sin autorización', 'Solo puedes controlar eventos propios o asignados a tu cuenta de Staff.', 'error');
      return;
    }
    if (!estadoDia.disponible) {
      mostrarNotificacion('Control no disponible', estadoDia.detalle, 'advertencia');
      return;
    }
    setUltimoResultado(null);
    setFaseControl('lector');
  };

  const terminarControl = () => {
    controlesCamara.current?.stop();
    setCamaraActiva(false);
    setUltimoResultado(null);
    setFaseControl('seleccion');
  };

  if (eventosPermitidos.length === 0) {
    return <main className="mx-auto max-w-xl px-4 py-20 text-center"><div className="rounded-3xl border border-neutral-200 bg-white p-8"><Lock className="mx-auto h-10 w-10 text-amber-700"/><h1 className="mt-4 text-xl font-black">No hay eventos asignados</h1><p className="mt-2 text-sm text-neutral-600">Para operar el lector, debes ser responsable o Staff asignado de un evento con aforo controlado.</p><button type="button" onClick={() => navigate('/eventos')} className="mt-5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white">Volver a eventos</button></div></main>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 min-h-[85vh] flex flex-col justify-between animate-in fade-in duration-200">
      {faseControl === 'seleccion' ? <section className="my-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a132b]">Check-in · IU-CI01</span>
        <h1 className="mt-1 text-xl font-black text-neutral-900">Selecciona un día</h1>
        <p className="mb-4 mt-1 text-sm text-neutral-600">Elige un evento autorizado y un día con aforo controlado para iniciar el control de acceso.</p>
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
          Evento autorizado:
        </label>
        <select
          value={eventoActivoId}
          onChange={(e) => {
            setEventoActivoId(e.target.value);
            const ev = listaEventos.find((item) => item.id === e.target.value);
            if (ev && ev.fechas.length > 0) {
              setFechaActivaId(ev.fechas[0].id);
            }
            setFaseControl('seleccion');
          }}
          className="w-full text-xs font-bold text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 focus:border-[#7a132b]"
        >
          {eventosPermitidos.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.titulo}
            </option>
          ))}
        </select>

        {eventoSeleccionado && eventoSeleccionado.fechas.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <select
              value={fechaSeleccionada?.id || ''}
              onChange={(e) => { setFechaActivaId(e.target.value); setFaseControl('seleccion'); }}
              className="flex-1 text-xs font-semibold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 focus:border-[#7a132b]"
              aria-label="Día del evento que se está validando"
            >
              {eventoSeleccionado.fechas.map((fecha, indice) => (
                <option key={fecha.id} value={fecha.id}>
                  {fecha.nombreDia || `Día ${indice + 1}`}: {fecha.fecha} · {fecha.horaInicio}–{fecha.horaFin}
                </option>
              ))}
            </select>
          </div>
        )}

        {!estaAsignadoAEvento && (
          <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>No estás registrado como staff de este evento.</span>
          </div>
        )}
        {eventoSeleccionado && fechaSeleccionada && <div className={`mt-4 rounded-xl border p-3 text-sm ${estadoDia.disponible ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <strong className="block">{estadoDia.etiqueta}</strong><span className="mt-0.5 block text-xs">{estadoDia.detalle}</span>
        </div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <div className="text-xs text-neutral-500">{recintoSeleccionado?.nombre || 'Recinto no disponible'}</div>
          <button type="button" onClick={iniciarControl} disabled={!estaAsignadoAEvento || !estadoDia.disponible} className="rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Iniciar control</button>
        </div>
      </section> : <>
        <section className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-widest text-[#7a132b]">Check-in · IU-CI02</span><strong className="block truncate text-sm">{eventoSeleccionado?.titulo}</strong><span className="block text-xs text-neutral-500">{fechaSeleccionada?.nombreDia || fechaSeleccionada?.fecha} · {fechaSeleccionada?.horaInicio}–{fechaSeleccionada?.horaFin}</span></div>
          <button type="button" onClick={terminarControl} className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50">Terminar control</button>
        </section>

      {/* ========================================================================= */}
      {/* CASO A: PANTALLA DE RESULTADO ULTRA-ENFOCADA (Soft Green / Soft Red)     */}
      {/* ========================================================================= */}
      {ultimoResultado ? (
        <div
          className={`my-auto p-7 rounded-3xl border text-center shadow-lg transition-all animate-in zoom-in-95 duration-150 flex flex-col justify-between min-h-[460px] ${
            ultimoResultado.exito
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/90 border-rose-300 text-rose-950'
          }`}
        >
          <div className="space-y-4">
            {/* Icono de Verificación Suave */}
            <div className="pt-2">
              {ultimoResultado.exito ? (
                <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-12 h-12 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <XCircle className="w-12 h-12 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {ultimoResultado.exito ? '✓ Entrada válida' : '✕ Entrada no válida'}
              </h2>
              <p className="text-xs mt-1.5 opacity-90 max-w-xs mx-auto leading-relaxed">
                {ultimoResultado.mensaje}
              </p>
            </div>

            {/* Tarjeta del Asistente (legible sin saturación) */}
            {ultimoResultado.boleto ? (
              <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-black/10 text-left text-xs space-y-2.5 shadow-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">
                    Asistente
                  </span>
                  <span className="font-extrabold text-neutral-900 text-base">
                    {ultimoResultado.boleto.nombreUsuario}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                  <span className="text-neutral-500">Lugar Asignado:</span>
                  <span className="font-mono font-black text-lg text-[#7a132b]">
                    {ultimoResultado.boleto.etiquetaAsiento || 'General'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                  <span>Hora de ingreso:</span>
                  <span className="font-mono font-semibold text-neutral-800">
                    {ultimoResultado.horaRegistro} hrs
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/70 border border-black/10 text-xs">
                <span className="text-rose-900 font-semibold block">
                  El código no corresponde a un boleto registrado para esta fecha.
                </span>
              </div>
            )}
          </div>

          {/* Botón Principal para Continuar */}
          <div className="pt-6">
            <button
              type="button"
              autoFocus
              onClick={limpiarParaSiguiente}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                ultimoResultado.exito
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <span>Escanear siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CASO B: ESTADO INICIAL DE ESCANEO ACTIVO (Visor + Contador)               */
        /* ========================================================================= */
        <div className="space-y-4 my-auto">
          {/* Identidad del Evento y Recinto */}
          <div className="text-center space-y-0.5">
            <span className="text-[10px] font-bold tracking-widest text-[#7a132b] uppercase">
              Control de Acceso Operacional
            </span>
            <h1 className="text-base font-black text-neutral-900 line-clamp-1">
              {eventoSeleccionado?.titulo}
            </h1>
            <div className="text-xs text-neutral-500 flex items-center justify-center gap-2">
              <span className="font-mono font-semibold text-neutral-800">
                {fechaSeleccionada?.fecha}
              </span>
                <span aria-hidden="true" className="text-neutral-300">·</span>
                <span>{fechaSeleccionada?.horaInicio}–{fechaSeleccionada?.horaFin} h</span>
              <span aria-hidden="true" className="text-neutral-300">·</span>
                <span className="font-semibold text-neutral-700">{recintoSeleccionado?.nombre || 'Recinto por confirmar'}</span>
            </div>
          </div>

          {/* Contador de Ingresos en Puerta */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-3.5 shadow-xs">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#7a132b]" />
                <span>Ingresos Registrados</span>
              </span>
              <span className="font-mono font-black text-neutral-900">
                {totalIngresados} / {totalEmitidos} ({porcentajeIngreso}%)
              </span>
            </div>
            <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, porcentajeIngreso)}%` }}
              />
            </div>
          </div>

          {/* Lector real por cámara */}
          <div className="bg-neutral-950 rounded-3xl p-5 text-white text-center relative overflow-hidden shadow-md">
            <video ref={videoRef} className={`w-full max-h-64 rounded-xl object-cover ${camaraActiva ? '' : 'hidden'}`} muted playsInline />
            {!camaraActiva && <div className="py-8"><Camera className="w-10 h-10 text-neutral-400 mx-auto mb-2" /><p className="text-xs">Lectura de QR con la cámara del dispositivo</p></div>}
            <button type="button" disabled={!estaAsignadoAEvento} onClick={() => camaraActiva ? (controlesCamara.current?.stop(), setCamaraActiva(false)) : void iniciarCamara()} className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-bold text-neutral-900 disabled:opacity-50">{camaraActiva ? 'Detener cámara' : 'Activar cámara'}</button>
            {errorCamara && <p role="alert" className="mt-2 text-xs text-rose-200">{errorCamara}</p>}
          </div>

          {/* Ingreso Manual de Código o Simulador Rápido */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3">
              <span className="text-xs font-bold text-neutral-800 block">
              Identificador del boleto:
            </span>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ejecutarEscaneo(codigoIngresado, true);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                required
                minLength={35}
                maxLength={35}
                value={codigoIngresado}
                disabled={!estaAsignadoAEvento}
                onChange={(e) => setCodigoIngresado(e.target.value)}
                placeholder="TT- seguido de 32 caracteres hexadecimales"
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#7a132b]"
              />
              <button
                type="submit"
                disabled={!estaAsignadoAEvento || segundosRestantesManual > 0}
                className="px-4 py-2 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Validar
              </button>
            </form>
            <p className="text-[11px] text-neutral-500">Se cuentan identificadores inexistentes. Al llegar a 20 capturas manuales fallidas en un minuto, se pausa la captura manual durante el tiempo restante.</p>
            {segundosRestantesManual > 0 && <p role="status" className="text-xs font-semibold text-amber-800">Límite de capturas excedido. Podrás volver a validar manualmente en {segundosRestantesManual} s; la cámara permanece disponible.</p>}

          </div>
        </div>
      )}
      </>}

      {/* Pie Operativo */}
      {faseControl === 'lector' && <div className="pt-3 text-center">
        {usuarioActual?.roles.some((rol) => ['organizador', 'subdireccion', 'admin'].includes(rol)) ? (
          <button type="button" onClick={() => navigate('/staff/historial')} className="text-xs font-semibold text-[#7a132b] hover:underline cursor-pointer">Consultar historial de accesos →</button>
        ) : (
          <button type="button" onClick={() => navigate('/staff/ocupacion')} className="text-xs font-semibold text-[#7a132b] hover:underline cursor-pointer">Ver ocupación de la sala →</button>
        )}
      </div>}
    </div>
  );
};
