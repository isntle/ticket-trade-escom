import { EncabezadoPagina } from "../componentes/ui/EncabezadoPagina";
import { BotonRegresar } from "../componentes/ui/BotonRegresar";
import { useEscaneosPendientes } from "../contextos/useEscaneosPendientes";
import { textoParaUsuario } from '../utilidades/textoParaUsuario.js';
import { inicioEnMexico } from "../dominio/solicitudes";
import { modalidadActividad, nombreActividad } from '../dominio/actividades';
import { volverASeccion, reemplazarParametrosUrl } from '../dominio/navegacion';
import { REGLA_INGRESO_ACTIVIDAD, agruparActividadesPorDia, describirActividad, fechaLegible, horaOficial, horarioActividad } from '../dominio/presentacionActividad';
import React, { useEffect, useRef, useState } from 'react';
import type { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { ArrowRight, Camera, CheckCircle, Lock, QrCode, Users, XCircle } from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { RegistroEscaneo, BoletoDigital } from '../tipos';

interface PropiedadesEscaneoStaff {
  navigate: (ruta: string) => void;
  /** Evento y actividad recibidos por URL (?eventId=&dateId=) para conservar la selección al regresar. */
  initialEventId?: string;
  initialDateId?: string;
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

export const EscaneoStaffPagina: React.FC<PropiedadesEscaneoStaff> = ({ navigate, initialEventId, initialDateId }) => {
  const { listaBoletos, procesarCheckIn, listaEventos, listaRecintos, listaBloqueos } = useDatos();
  const { usuarioActual, rolActivo } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const pendientes = useEscaneosPendientes(usuarioActual?.id);

  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [errorCamara, setErrorCamara] = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [abriendoCamara, setAbriendoCamara] = useState(false);
  const [validando, setValidando] = useState(false);
  const validacionEnCurso = useRef(false);
  const [faseControl, setFaseControl] = useState<'seleccion' | 'lector'>('seleccion');
  const [ahoraSistema, setAhoraSistema] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlesCamara = useRef<IScannerControls | null>(null);
  const lectorQr = useRef<BrowserQRCodeReader | null>(null);
  const leyendoQr = useRef(false);
  const reanudarCamaraAlContinuar = useRef(false);

  // Solo eventos propios del organizador, asignados explícitamente al Staff o administrados por Admin.
  const eventosPermitidos = listaEventos.filter((ev) => {
    if (!usuarioActual) return false;
    const esResponsable =
      usuarioActual.roles.includes('admin') ||
      (usuarioActual.roles.includes('organizador') && ev.idOrganizador === usuarioActual.id) ||
      (usuarioActual.roles.includes('staff') && Boolean(usuarioActual.eventosAsignadosStaff?.includes(ev.id)));
    return esResponsable && ev.fechas.some(f=>modalidadActividad(f,ev.modalidadAsistencia)==='controlado');
  });

  const [eventoActivoId, setEventoActivoId] = useState(initialEventId ?? '');
  const [fechaActivaId, setFechaActivaId] = useState(initialDateId ?? '');

  // Resultado de escaneo activo (soft screen)
  const [ultimoResultado, setUltimoResultado] = useState<{
    exito: boolean;
    resultado: RegistroEscaneo['resultado'];
    boleto?: BoletoDigital;
    mensaje: string;
    horaRegistro?: string;
  } | null>(null);

  const eventoSeleccionado = eventosPermitidos.find(ev => ev.id === eventoActivoId) ?? eventosPermitidos[0];
  const actividadesControladas = eventoSeleccionado?.fechas.filter(
    fecha => modalidadActividad(fecha, eventoSeleccionado.modalidadAsistencia) === 'controlado',
  ) ?? [];
  const fechaSeleccionada = actividadesControladas.find(f => f.id === fechaActivaId)
    ?? actividadesControladas.find(f => !f.cancelada && inicioEnMexico(f.fecha, f.horaFin) > ahoraSistema)
    ?? actividadesControladas[0];
  const idEventoSeleccionado = eventoSeleccionado?.id;
  const idFechaSeleccionada = fechaSeleccionada?.id;
  const estaAsignadoAEvento = Boolean(idEventoSeleccionado && idFechaSeleccionada);

  useEffect(() => {
    if (idEventoSeleccionado && idFechaSeleccionada) {
      reemplazarParametrosUrl({ eventId: idEventoSeleccionado, dateId: idFechaSeleccionada });
    }
  }, [idEventoSeleccionado, idFechaSeleccionada]);

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhoraSistema(Date.now()), 1_000);
    return () => window.clearInterval(intervalo);
  }, []);

  // Cálculo de aforo e ingresos en vivo en puerta
  const boletosEvento = listaBoletos.filter((b) => b.idEvento === eventoSeleccionado?.id && b.idFechaEvento === fechaSeleccionada?.id);
  const totalEmitidos = boletosEvento.filter((boleto) => boleto.estado !== 'cancelado').length;
  const totalIngresados = boletosEvento.filter((b) => b.estado === 'utilizado').length;
  const porcentajeIngreso = totalEmitidos ? Math.round((totalIngresados / totalEmitidos) * 100) : 0;
  const recintoSeleccionado = listaRecintos.find((recinto) => recinto.id === fechaSeleccionada?.idRecinto);
  const nombreRecinto = (idRecinto?: string) => listaRecintos.find((recinto) => recinto.id === idRecinto)?.nombre;
  const indiceActividad = Math.max(0, eventoSeleccionado?.fechas.findIndex((f) => f.id === fechaSeleccionada?.id) ?? 0);
  const nombreActividadSeleccionada = fechaSeleccionada ? nombreActividad(fechaSeleccionada, indiceActividad) : 'Actividad no disponible';
  const resumenActividad = fechaSeleccionada ? describirActividad(fechaSeleccionada, recintoSeleccionado?.nombre) : '';
  const consultaSeleccion = `eventId=${encodeURIComponent(idEventoSeleccionado ?? '')}&dateId=${encodeURIComponent(idFechaSeleccionada ?? '')}`;

  const estadoActividad = (() => {
    if (!eventoSeleccionado || !fechaSeleccionada) return { disponible: false, etiqueta: 'Actividad no disponible', detalle: 'Selecciona un evento y una actividad válida.' };
    if (fechaSeleccionada.cancelada || eventoSeleccionado.estado === 'cancelado') return { disponible: false, etiqueta: 'Actividad cancelada', detalle: 'El registro de entradas está cerrado.' };
    if (eventoSeleccionado.estado === 'finalizado') return { disponible: false, etiqueta: 'Evento finalizado', detalle: 'El registro de entradas está cerrado.' };
    const bloqueo = listaBloqueos.find((elemento) => {
      const aplicaRecinto = elemento.idRecinto === fechaSeleccionada.idRecinto || elemento.idRecinto === 'todos' || Boolean(elemento.idsRecintos?.includes(fechaSeleccionada.idRecinto));
      if (!aplicaRecinto || fechaSeleccionada.fecha < elemento.fechaInicio) return false;
      if (elemento.esIndefinido) return true;
      const finBloqueo = elemento.fechaFin || elemento.fechaInicio;
      return fechaSeleccionada.fecha <= finBloqueo && fechaSeleccionada.horaInicio < (elemento.horaFin || '23:59') && fechaSeleccionada.horaFin > (elemento.horaInicio || '00:00');
    });
    if (bloqueo || fechaSeleccionada.suspendida) return { disponible: false, etiqueta: 'Actividad suspendida', detalle: bloqueo?.titulo || 'El registro de entradas está cerrado.' };
    const inicio = inicioEnMexico(fechaSeleccionada.fecha,fechaSeleccionada.horaInicio);
    const fin = inicioEnMexico(fechaSeleccionada.fecha,fechaSeleccionada.horaFin);
    const apertura = inicio - 30 * 60 * 1000;
    if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) return { disponible: false, etiqueta: 'Horario inválido', detalle: 'No se puede validar el horario de esta actividad.' };
    if (ahoraSistema < apertura) return { disponible: false, etiqueta: 'Aún no disponible', detalle: `El acceso abre a las ${horaOficial(apertura)} h.` };
    if (ahoraSistema >= fin) return { disponible: false, etiqueta: 'Finalizado', detalle: 'El registro de entradas está cerrado.' };
    return { disponible: true, etiqueta: 'Acceso abierto', detalle: `Cierra a las ${fechaSeleccionada.horaFin} h.` };
  })();

  const fallosManualesActivos = obtenerIntentosManualesActivos(usuarioActual?.id, ahoraSistema);
  const limiteManualHasta = fallosManualesActivos.length >= 20 ? fallosManualesActivos[0] + 60_000 : 0;
  const segundosRestantesManual = Math.max(0, Math.ceil((limiteManualHasta - ahoraSistema) / 1000));

  useEffect(() => () => controlesCamara.current?.stop(), []);

  const detenerCamara = () => {
    controlesCamara.current?.stop();
    controlesCamara.current = null;
    setCamaraActiva(false);
  };

  const iniciarCamara = async () => {
    const video = videoRef.current;
    if (!video || controlesCamara.current) return;
    setErrorCamara('');
    setAbriendoCamara(true);
    let codigoLeido = false;
    try {
      lectorQr.current ??= new (await import("@zxing/browser")).BrowserQRCodeReader();
      if (videoRef.current !== video) return;
      const controles = await lectorQr.current.decodeFromVideoDevice(undefined, video, (resultado, _error, lectura) => {
        if (!resultado || leyendoQr.current || videoRef.current !== video) return;
        codigoLeido = true;
        leyendoQr.current = true;
        lectura.stop();
        controlesCamara.current = null;
        setCamaraActiva(false);
        reanudarCamaraAlContinuar.current = true;
        void ejecutarEscaneo(resultado.getText());
        window.setTimeout(() => { leyendoQr.current = false; }, 800);
      });
      if (videoRef.current !== video || codigoLeido) {
        controles.stop();
        return;
      }
      controlesCamara.current = controles;
      setCamaraActiva(true);
    } catch {
      if (videoRef.current === video) {
        setErrorCamara('No se pudo abrir la cámara. Revisa el permiso del navegador o usa el código de boleto.');
        setCamaraActiva(false);
      }
    } finally {
      setAbriendoCamara(false);
    }
  };

  const ejecutarEscaneo = async (codigoAProcesar: string, validarFormatoManual = false) => {
    if (!codigoAProcesar.trim() || validacionEnCurso.current) return;
    if (!/^(?:TT-[A-F0-9]{32}|[A-F0-9]{64}|[A-F0-9]{16})$/i.test(codigoAProcesar.trim())) {
      setUltimoResultado({ exito: false, resultado: 'codigo_no_reconocido', mensaje: 'Código no reconocido. Verifica que sea el identificador completo del boleto Ticket Trade.' });
      return;
    }
    if (validarFormatoManual && segundosRestantesManual > 0) {
      mostrarNotificacion('Límite de capturas excedido', `Espera ${segundosRestantesManual} s para volver a validar manualmente. La cámara permanece disponible.`, 'advertencia');
      return;
    }
    detenerCamara();

    if (!estaAsignadoAEvento) {
      mostrarNotificacion(
        'Acceso Denegado',
        'No estás asignado como Staff autorizado para este evento específico.',
        'error'
      );
      return;
    }

    if (pendientes.habilitado && !navigator.onLine && fechaSeleccionada) {
      const guardado = pendientes.guardar(codigoAProcesar.trim(), fechaSeleccionada.id);
      mostrarNotificacion(guardado ? 'Escaneo pendiente' : 'No se guardó el escaneo',
        guardado ? 'Se enviará al recuperar conexión. El acceso aún no está validado.' : 'La cola está llena o el navegador no puede guardarla. Recupera la conexión antes de continuar.',
        guardado ? 'advertencia' : 'error');
      setCodigoIngresado('');
      return;
    }

    validacionEnCurso.current = true;
    setValidando(true);
    try {
      const res = await procesarCheckIn(
        codigoAProcesar.trim(), usuarioActual?.nombre || 'Staff ESCOM',
        fechaSeleccionada?.id, usuarioActual || undefined, eventoSeleccionado?.id,
      );
      if (validarFormatoManual && res.resultado === 'inexistente' && usuarioActual) {
        const instante = Date.now();
        guardarIntentoManualInexistente(usuarioActual.id, instante);
        setAhoraSistema(instante);
      }
      setUltimoResultado({ ...res, horaRegistro: horaOficial(Date.now()) });
      setCodigoIngresado('');
    } catch {
      mostrarNotificacion('No se pudo validar', 'Verifica la conexión y vuelve a intentarlo.', 'error');
    } finally {
      validacionEnCurso.current = false;
      setValidando(false);
    }
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
    if (!estadoActividad.disponible) {
      mostrarNotificacion('Control no disponible', estadoActividad.detalle, 'advertencia');
      return;
    }
    // Conserva la actividad del lector aunque su ventana de acceso cierre.
    setEventoActivoId(idEventoSeleccionado ?? '');
    setFechaActivaId(idFechaSeleccionada ?? '');
    setUltimoResultado(null);
    setFaseControl('lector');
  };

  const terminarControl = () => {
    detenerCamara();
    setUltimoResultado(null);
    setFaseControl('seleccion');
    setCodigoIngresado('');
    setErrorCamara('');
    reanudarCamaraAlContinuar.current = false;
  };

  const botonPrimario = 'boton-primario inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';
  const botonSecundario = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50';
  const alVolver = () => navigate(volverASeccion('/eventos'));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {faseControl === 'seleccion' && <BotonRegresar destino="Volver a la cartelera" alVolver={alVolver} />}
      <EncabezadoPagina titulo="Control de acceso"
        descripcion={faseControl === 'seleccion' && eventosPermitidos.length ? 'Elige la actividad en la que registrarás entradas.' : undefined}
        accion={faseControl === 'lector' && <button type="button" disabled={validando} onClick={terminarControl}
          className={botonSecundario}>Cambiar actividad</button>}
      />

      {!eventoSeleccionado || !fechaSeleccionada ? (
        <section className="flex max-w-2xl items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <Lock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#7a132b]" />
          <div>
            <h2 className="font-bold text-neutral-900">No tienes actividades asignadas</h2>
            <p className="mt-1 text-sm text-neutral-600">Pide al responsable del evento que te asigne como personal de acceso.</p>
          </div>
        </section>
      ) : (
        <>
          {faseControl === 'seleccion' ? (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)]">
              <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
                {eventosPermitidos.length > 1 ? <label className="block text-sm font-semibold text-neutral-900">
                  Evento
                  <select value={idEventoSeleccionado} onChange={e => {
                    setEventoActivoId(e.target.value);
                    setFechaActivaId('');
                  }} className="mt-2 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">
                    {eventosPermitidos.map(ev => <option key={ev.id} value={ev.id}>{ev.titulo}</option>)}
                  </select>
                </label> : <h2 className="text-lg font-bold text-neutral-900">{eventoSeleccionado.titulo}</h2>}

                <fieldset className="mt-5 min-w-0">
                  <legend className="text-sm font-semibold text-neutral-900">Actividad</legend>
                  {agruparActividadesPorDia(eventoSeleccionado.fechas).map(dia => {
                    const actividades = dia.actividades.filter(({ actividad }) => actividadesControladas.includes(actividad));
                    if (!actividades.length) return null;
                    return <div key={dia.fecha} className="mt-3 space-y-2">
                      <p className="text-sm text-neutral-600">{fechaLegible(dia.fecha)}</p>
                      {actividades.map(({ actividad, indice }) => (
                        <label key={actividad.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3.5 has-checked:border-[#7a132b] has-checked:bg-[#7a132b]/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#7a132b]">
                          <input type="radio" name="actividad-control" checked={idFechaSeleccionada === actividad.id}
                            onChange={() => setFechaActivaId(actividad.id)} className="mt-1 h-4 w-4 shrink-0 accent-[#7a132b]" />
                          <span className="min-w-0 break-words text-sm">
                            <strong className="block text-neutral-900">{nombreActividad(actividad, indice)}</strong>
                            <span className="mt-1 block text-neutral-600">{horarioActividad(actividad)} · {nombreRecinto(actividad.idRecinto) || 'Recinto por confirmar'}</span>
                          </span>
                        </label>
                      ))}
                    </div>;
                  })}
                </fieldset>
              </section>

              <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6" aria-label="Disponibilidad del acceso">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900" role="status">
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${estadoActividad.disponible ? 'bg-emerald-600' : 'bg-neutral-500'}`} />
                  {estadoActividad.etiqueta}
                </p>
                <p className="mt-2 text-sm text-neutral-600">{estadoActividad.detalle}</p>
                <button type="button" onClick={iniciarControl} disabled={!estadoActividad.disponible} className={`${botonPrimario} mt-5 w-full`}>
                  <QrCode size={18} aria-hidden="true" /> Abrir lector
                </button>
              </section>
            </div>
          ) : (
            <>
              <section className="mb-5 border-b border-neutral-200 pb-4" aria-label="Actividad en control">
                <p className="text-sm font-medium text-neutral-600">{eventoSeleccionado.titulo}</p>
                <h2 className="mt-1 text-xl font-bold leading-snug text-neutral-900">{nombreActividadSeleccionada}</h2>
                <p className="mt-1 text-sm text-neutral-600">{resumenActividad}</p>
              </section>

              {!estadoActividad.disponible && <p role="status" className="mb-4 rounded-xl border border-neutral-200 bg-white p-3 text-sm"><strong>{estadoActividad.etiqueta}.</strong> {estadoActividad.detalle}</p>}

              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)]">
                {ultimoResultado ? (
                  <section aria-label="Resultado de validación" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
                    <div className="flex items-start gap-3" role="status">
                      {ultimoResultado.exito
                        ? <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
                        : <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-700" aria-hidden="true" />}
                      <div>
                        <h3 className="text-xl font-bold text-neutral-900">{ultimoResultado.exito ? 'Entrada válida' : 'Entrada no válida'}</h3>
                        <p className="mt-1 text-sm text-neutral-600">{ultimoResultado.mensaje}</p>
                        {ultimoResultado.resultado === 'fuera_de_horario' && <p className="mt-2 text-sm text-neutral-600">{REGLA_INGRESO_ACTIVIDAD}</p>}
                      </div>
                    </div>
                    {ultimoResultado.boleto && <dl className="my-4 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
                      <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_1fr]"><dt className="text-neutral-600">Asistente</dt><dd className="font-semibold text-neutral-900">{ultimoResultado.boleto.nombreUsuario}</dd></div>
                      <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_1fr]"><dt className="text-neutral-600">Lugar</dt><dd className="font-semibold text-neutral-900">{ultimoResultado.boleto.etiquetaAsiento || 'General'}</dd></div>
                      {ultimoResultado.exito && <div className="grid gap-1 py-2.5 sm:grid-cols-[8rem_1fr]"><dt className="text-neutral-600">Hora de ingreso</dt><dd>{ultimoResultado.horaRegistro} h</dd></div>}
                    </dl>}
                    <button type="button" autoFocus onClick={limpiarParaSiguiente} className={`${botonPrimario} mt-4 w-full sm:w-auto`}>
                      Escanear siguiente <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </section>
                ) : (
                  <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white" aria-label="Lector QR">
                    <div className="relative grid min-h-52 place-items-center overflow-hidden bg-neutral-950 text-white sm:min-h-64">
                      <video ref={videoRef} className={`max-h-[55svh] w-full object-contain ${camaraActiva ? '' : 'hidden'}`} muted playsInline />
                      {camaraActiva && <span aria-hidden="true" className="pointer-events-none absolute aspect-square w-1/2 max-w-48 rounded-xl border-2 border-white/80" />}
                      {!camaraActiva && <div className="grid justify-items-center gap-3 p-5 text-center">
                        <QrCode size={44} strokeWidth={1.25} aria-hidden="true" />
                        <p className="text-sm">{validando ? 'Validando boleto…' : 'Cámara desactivada'}</p>
                      </div>}
                    </div>
                    <div className="p-4">
                      <button type="button" disabled={validando || abriendoCamara || (!camaraActiva && !estadoActividad.disponible)}
                        onClick={() => camaraActiva ? detenerCamara() : void iniciarCamara()}
                        className={`${camaraActiva ? botonSecundario : botonPrimario} w-full sm:w-auto`}>
                        <Camera size={18} aria-hidden="true" /> {camaraActiva ? 'Detener cámara' : abriendoCamara ? 'Abriendo cámara…' : 'Activar cámara'}
                      </button>
                      {errorCamara && <p role="alert" className="mt-3 text-sm text-rose-800">{textoParaUsuario(errorCamara)}</p>}
                    </div>
                  </section>
                )}

                <aside className="min-w-0 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
                  <section className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Users size={17} aria-hidden="true" /> Entradas registradas</h3>
                      <span className="font-bold tabular-nums text-neutral-900">{totalIngresados} de {totalEmitidos}</span>
                    </div>
                    <progress className="mt-2 block h-2 w-full overflow-hidden rounded-full accent-[#7a132b]" max={100}
                      value={porcentajeIngreso} aria-label="Porcentaje de entradas registradas" />
                  </section>

                  <form className="space-y-3 p-4 sm:p-5" onSubmit={e => {
                    e.preventDefault();
                    void ejecutarEscaneo(codigoIngresado, true);
                  }}>
                    <label htmlFor="codigo-boleto-staff" className="block font-semibold text-neutral-900">Código de boleto</label>
                    <input id="codigo-boleto-staff" type="text" required minLength={16} maxLength={64}
                      value={codigoIngresado} disabled={validando || abriendoCamara || Boolean(ultimoResultado) || !estadoActividad.disponible}
                      onChange={e => setCodigoIngresado(e.target.value)} autoComplete="off" spellCheck={false}
                      className="block min-h-11 w-full rounded-xl border border-neutral-300 px-3 py-2 font-mono text-base disabled:bg-neutral-100" />
                    <button type="submit" aria-busy={validando}
                      disabled={validando || abriendoCamara || Boolean(ultimoResultado) || !estadoActividad.disponible || !codigoIngresado.trim() || segundosRestantesManual > 0}
                      className={botonSecundario}>{validando ? 'Validando…' : 'Validar código'}</button>
                    {segundosRestantesManual > 0 && <p role="status" className="text-sm text-neutral-700">Puedes volver a capturar un código en {segundosRestantesManual} s.</p>}
                  </form>
                </aside>
              </div>

              <div className="mt-5">
                <button type="button"
                  onClick={() => navigate(rolActivo === 'staff' ? `/staff/ocupacion?${consultaSeleccion}` : `/staff/historial?${consultaSeleccion}`)}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#7a132b] hover:underline">
                  {rolActivo === 'staff' ? 'Ver ocupación de lugares' : 'Ver historial de accesos'}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </>
      )}

      {pendientes.habilitado && (pendientes.cantidad > 0 || pendientes.aviso) && (
        <aside role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          {pendientes.cantidad > 0 && <strong>Escaneos por sincronizar ({pendientes.cantidad})</strong>}
          {pendientes.aviso && <span>{pendientes.aviso}</span>}
          {pendientes.cantidad > 0 && <button type="button" onClick={() => void pendientes.sincronizar()} className={botonSecundario}>Sincronizar</button>}
        </aside>
      )}
    </div>
  );
};
