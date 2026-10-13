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

export const EscaneoStaffPagina: React.FC<PropiedadesEscaneoStaff> = ({ navigate }) => {
  const { listaBoletos, procesarCheckIn, listaEventos, listaRecintos } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [errorCamara, setErrorCamara] = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlesCamara = useRef<IScannerControls | null>(null);
  const lectorQr = useRef(new BrowserQRCodeReader());
  const leyendoQr = useRef(false);
  const intentosRecientes = useRef<number[]>([]);

  // Solo eventos propios del organizador o asignados explícitamente al Staff.
  const eventosPermitidos = listaEventos.filter((ev) => {
    if (!usuarioActual) return false;
    return (usuarioActual.roles.includes('organizador') && ev.idOrganizador === usuarioActual.id) ||
      (usuarioActual.roles.includes('staff') && Boolean(usuarioActual.eventosAsignadosStaff?.includes(ev.id)));
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
  const totalEmitidos = boletosEvento.length;
  const totalIngresados = boletosEvento.filter((b) => b.estado === 'utilizado').length;
  const porcentajeIngreso = totalEmitidos ? Math.round((totalIngresados / totalEmitidos) * 100) : 0;
  const recintoSeleccionado = listaRecintos.find((recinto) => recinto.id === fechaSeleccionada?.idRecinto);

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
    if (validarFormatoManual && !/^TT-[A-Z0-9-]{8,}$/i.test(codigoAProcesar.trim())) {
      mostrarNotificacion('Identificador no válido', 'El código debe tener formato Ticket Trade (TT-…) y al menos 11 caracteres.', 'advertencia');
      return;
    }
    const ahoraMs = Date.now();
    intentosRecientes.current = intentosRecientes.current.filter((instante) => ahoraMs - instante < 60_000);
    if (intentosRecientes.current.length >= 5) {
      mostrarNotificacion('Límite de intentos', 'Espera un minuto antes de volver a validar boletos.', 'advertencia');
      return;
    }
    intentosRecientes.current.push(ahoraMs);
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

    setUltimoResultado({
      ...res,
      horaRegistro: ahora
    });
    setCodigoIngresado('');
  };

  const limpiarParaSiguiente = () => {
    setUltimoResultado(null);
  };

  if (eventosPermitidos.length === 0) {
    return <main className="mx-auto max-w-xl px-4 py-20 text-center"><div className="rounded-3xl border border-neutral-200 bg-white p-8"><Lock className="mx-auto h-10 w-10 text-amber-700"/><h1 className="mt-4 text-xl font-black">No hay eventos asignados</h1><p className="mt-2 text-sm text-neutral-600">Para operar el lector, tu cuenta debe ser el organizador responsable o estar asignada como Staff al evento.</p><button type="button" onClick={() => navigate('/eventos')} className="mt-5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white">Volver a eventos</button></div></main>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 min-h-[85vh] flex flex-col justify-between animate-in fade-in duration-200">
      {/* Selector de Evento Asignado al Staff */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-3 mb-4 shadow-2xs">
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
          Evento en Control de Puerta:
        </label>
        <select
          value={eventoActivoId}
          onChange={(e) => {
            setEventoActivoId(e.target.value);
            const ev = listaEventos.find((item) => item.id === e.target.value);
            if (ev && ev.fechas.length > 0) {
              setFechaActivaId(ev.fechas[0].id);
            }
          }}
          className="w-full text-xs font-bold text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 focus:border-[#7a132b]"
        >
          {eventosPermitidos.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.titulo}
            </option>
          ))}
        </select>

        {eventoSeleccionado && eventoSeleccionado.fechas.length > 1 && (
          <div className="mt-2 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <select
              value={fechaSeleccionada?.id || ''}
              onChange={(e) => setFechaActivaId(e.target.value)}
              className="flex-1 text-xs font-semibold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 focus:border-[#7a132b]"
              aria-label="Día del evento que se está validando"
            >
              {eventoSeleccionado.fechas.map((fecha, indice) => (
                <option key={fecha.id} value={fecha.id}>
                  Día {indice + 1}: {fecha.fecha} · {fecha.horaInicio}
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
      </div>

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
                minLength={11}
                maxLength={128}
                value={codigoIngresado}
                disabled={!estaAsignadoAEvento}
                onChange={(e) => setCodigoIngresado(e.target.value)}
                placeholder="Pega el identificador TT-…"
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#7a132b]"
              />
              <button
                type="submit"
                disabled={!estaAsignadoAEvento}
                className="px-4 py-2 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Validar
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Pie Operativo */}
      <div className="pt-3 text-center">
        {usuarioActual?.roles.some((rol) => ['organizador', 'subdireccion', 'admin'].includes(rol)) ? (
          <button type="button" onClick={() => navigate('/staff/historial')} className="text-xs font-semibold text-[#7a132b] hover:underline cursor-pointer">Consultar historial de accesos →</button>
        ) : (
          <button type="button" onClick={() => navigate('/staff/ocupacion')} className="text-xs font-semibold text-[#7a132b] hover:underline cursor-pointer">Ver ocupación de la sala →</button>
        )}
      </div>
    </div>
  );
};
