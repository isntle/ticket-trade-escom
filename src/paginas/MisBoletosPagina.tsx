import { accesoPendienteDelEvento, agruparPasesEvento } from "../dominio/pasesEvento";
import { inicioEnMexico } from "../dominio/solicitudes";
import { nombreActividad } from '../dominio/actividades';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Ticket } from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { AlertaMensaje } from '../componentes/ui/AlertaMensaje';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { FilaHistorial, HistorialBoletos } from '../componentes/taquilla/HistorialBoletos';
import { ModalListaEspera } from '../componentes/taquilla/ModalListaEspera';
import { ModalBoletoQR } from '../componentes/taquilla/ModalBoletoQR';
import { ModalCancelarReservacion } from '../componentes/taquilla/ModalCancelarReservacion';
import { TarjetaBoleto } from '../componentes/taquilla/TarjetaBoleto';
import { BannerOfertaEspera } from '../componentes/taquilla/BannerOfertaEspera';
import { BoletoDigital } from '../tipos';
import { obtenerMensaje } from '../dominio/mensajes';

interface PropiedadesMisBoletos {
  navigate: (ruta: string) => void;
}

type BoletoConDia = BoletoDigital & {
  nombreDia: string;
  restriccionCancelacion?: string;
};

export const MisBoletosPagina: React.FC<PropiedadesMisBoletos> = ({ navigate }) => {
  const {
    listaBoletos,
    listaReservaciones,
    listaEventos,
    listaRecintos,
    listaIntencionesAsistencia,
    listaEspera,
    cancelarReservacion,
    retirarseDeListaDeEspera,
    responderOfertaListaDeEspera
  } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const [pestanaActiva, setPestanaActiva] = useState<'activos' | 'historial'>('activos');
  const [boletoParaQR, setBoletoParaQR] = useState<(BoletoDigital & { nombreDia?: string }) | null>(null);
  const [boletoACancelar, setBoletoACancelar] = useState<BoletoConDia | null>(null);
  const [participacionParaRetirar, setParticipacionParaRetirar] = useState<FilaHistorial | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const ofertaEnProceso = useRef<string | null>(null);

  const boletosDelUsuario = useMemo(
    () => usuarioActual ? listaBoletos.filter((boleto) => boleto.idUsuario === usuarioActual.id) : [],
    [listaBoletos, usuarioActual]
  );
  const pasesDelUsuario=agruparPasesEvento(boletosDelUsuario);
  const pendiente=(boleto:BoletoDigital)=>accesoPendienteDelEvento(boleto,listaEventos.find(e=>e.id===boleto.idEvento));
  const pasesActivos = pasesDelUsuario.filter(pase=>pase.accesos.some(pendiente));
  const pasesAnteriores = pasesDelUsuario.filter(pase=>!pase.accesos.some(pendiente));
  const paseSeleccionado=pasesDelUsuario.find(pase=>pase.idEvento===boletoParaQR?.idEvento);
  const accesosVista=(accesos:BoletoDigital[])=>accesos.map(b=>({...b,nombreDia:obtenerDatosDia(b.idEvento,b.idFechaEvento).dia,entradaPendiente:pendiente(b),restriccionCancelacion:obtenerRestriccionCancelacion(b)||undefined}));
  const ofertaActiva = usuarioActual
    ? listaEspera.find((entrada) => entrada.idUsuario === usuarioActual.id && entrada.estado === 'notificado')
    : undefined;
  const totalRegistros = usuarioActual
    ? listaReservaciones.filter((r) => r.idUsuario === usuarioActual.id).length
      + listaIntencionesAsistencia.filter((r) => r.idUsuario === usuarioActual.id).length
      + listaEspera.filter((r) => r.idUsuario === usuarioActual.id).length
      + boletosDelUsuario.length
    : 0;

  const obtenerDatosDia = (idEvento: string, idFecha: string) => {
    const evento = listaEventos.find((item) => item.id === idEvento);
    const fecha = evento?.fechas.find((item) => item.id === idFecha);
    const recinto = listaRecintos.find((item) => item.id === fecha?.idRecinto);
    return {
      evento,
      fecha,
      dia: fecha ? nombreActividad(fecha) : 'Actividad no disponible',
      recinto: recinto?.nombre || 'Recinto no disponible'
    };
  };

  const obtenerRestriccionCancelacion = (boleto: BoletoDigital): string | null => {
    if (!usuarioActual || boleto.idUsuario !== usuarioActual.id) return 'La reservación no pertenece a tu cuenta.';
    if (boleto.estado === 'utilizado') return obtenerMensaje('ERR-MT-09').descripcion;
    if (boleto.estado !== 'valido') return 'Este boleto ya no está activo.';

    const reservacion = listaReservaciones.find((item) => item.id === boleto.idReservacion);
    if (!reservacion || reservacion.idUsuario !== usuarioActual.id || reservacion.estado !== 'confirmada') {
      return 'La reservación ya no está confirmada o no pertenece a tu cuenta.';
    }

    const { evento, fecha } = obtenerDatosDia(boleto.idEvento, boleto.idFechaEvento);
    if (!evento || !fecha || evento.estado === 'cancelado' || evento.estado === 'finalizado') {
      return 'El día del evento ya no admite cancelaciones.';
    }

    const inicio = inicioEnMexico(fecha.fecha,fecha.horaInicio);
    const fin = inicioEnMexico(fecha.fecha,fecha.horaFin);
    const ahora = Date.now();
    if (!Number.isFinite(inicio) || !Number.isFinite(fin)) return 'No se pudo verificar el horario del evento.';
    if (ahora >= inicio) return 'No se puede cancelar una reservación cuando el día ya comenzó o terminó.';
    if (inicio - ahora < 24 * 60 * 60 * 1000) return obtenerMensaje('ERR-MT-08').descripcion;
    return null;
  };

  const abrirCancelacion = (boleto: BoletoDigital) => {
    const restriccion = obtenerRestriccionCancelacion(boleto);
    if (restriccion) {
      mostrarNotificacion('No es posible cancelar', restriccion, 'error');
      return;
    }
    const { fecha, dia } = obtenerDatosDia(boleto.idEvento, boleto.idFechaEvento);
    setBoletoACancelar({ ...boleto, nombreDia: dia, horaEvento: fecha ? `${fecha.horaInicio} - ${fecha.horaFin}` : boleto.horaEvento });
  };

  const confirmarCancelacion = (boleto: BoletoConDia, motivo: string) => {
    const restriccion = obtenerRestriccionCancelacion(boleto);
    if (restriccion) {
      setBoletoACancelar(null);
      mostrarNotificacion('No es posible cancelar', restriccion, 'error');
      return;
    }

    const resultado = cancelarReservacion(boleto.idReservacion, usuarioActual!.id, motivo);
    if (!resultado.exito) {
      mostrarNotificacion('No se pudo cancelar la reservación', resultado.error || 'Actualiza la información e inténtalo de nuevo.', 'error');
      return;
    }
    setBoletoACancelar(null);
    const mensaje = obtenerMensaje('OK-MT-02');
    mostrarNotificacion(mensaje.titulo, mensaje.descripcion, mensaje.tipo);
  };

  const retirarseDeLista = (fila: FilaHistorial) => {
    setParticipacionParaRetirar(fila);
  };

  const confirmarRetiroLista = () => {
    if (!usuarioActual) return;
    if (!participacionParaRetirar) return;
    const resultado = retirarseDeListaDeEspera(participacionParaRetirar.id, usuarioActual.id);
    if (!resultado.exito) {
      mostrarNotificacion('No se pudo actualizar la lista', resultado.error || 'Intenta actualizar la información.', 'error');
      return;
    }
    setParticipacionParaRetirar(null);
    const mensaje = obtenerMensaje('OK-MT-07', { día: participacionParaRetirar.dia || 'este día' });
    mostrarNotificacion(mensaje.titulo, mensaje.descripcion, mensaje.tipo);
  };

  useEffect(() => {
    if (!ofertaActiva) return;
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [ofertaActiva?.id]);

  useEffect(() => {
    if (!usuarioActual || !ofertaActiva?.fechaExpiracionOferta || ahora < ofertaActiva.fechaExpiracionOferta) return;
    if (ofertaEnProceso.current === ofertaActiva.id) return;
    ofertaEnProceso.current = ofertaActiva.id;
    const resultado = responderOfertaListaDeEspera(ofertaActiva.id, usuarioActual.id, 'vencer');
    const mensaje = obtenerMensaje('ERR-MT-11');
    mostrarNotificacion(mensaje.titulo, resultado.error || mensaje.descripcion, resultado.exito ? 'advertencia' : 'error');
  }, [ahora, ofertaActiva?.id, ofertaActiva?.fechaExpiracionOferta, usuarioActual, responderOfertaListaDeEspera, mostrarNotificacion]);

  const responderOferta = (decision: 'aceptar' | 'rechazar') => {
    if (!usuarioActual || !ofertaActiva) return;
    const resultado = responderOfertaListaDeEspera(ofertaActiva.id, usuarioActual.id, decision);
    if (!resultado.exito) {
      mostrarNotificacion('No se pudo actualizar la oferta', resultado.error || 'Actualiza tus boletos e inténtalo de nuevo.', 'error');
      return;
    }
    if (decision === 'aceptar') {
      const dia = obtenerDatosDia(ofertaActiva.idEvento, ofertaActiva.idFechaEvento).dia;
      const mensaje = obtenerMensaje('OK-MT-01', { día: dia });
      mostrarNotificacion(mensaje.titulo, mensaje.descripcion, mensaje.tipo);
    } else {
      const dia = obtenerDatosDia(ofertaActiva.idEvento, ofertaActiva.idFechaEvento).dia;
      const mensaje = obtenerMensaje('OK-MT-07', { día: dia });
      mostrarNotificacion(mensaje.titulo, mensaje.descripcion, mensaje.tipo);
    }
  };

  const filasReservaciones = usuarioActual ? listaReservaciones
    .filter((reserva) => reserva.idUsuario === usuarioActual.id)
    .map((reserva) => {
      const { evento, fecha, dia, recinto } = obtenerDatosDia(reserva.idEvento, reserva.idFechaEvento);
      return {
        id: reserva.id,
        evento: evento?.titulo || 'Evento no disponible',
        dia,
        fecha: fecha?.fecha || '—',
        horario: fecha ? `${fecha.horaInicio} a ${fecha.horaFin}` : '—',
        recinto,
        asiento: reserva.etiquetaAsiento || 'Cupo general',
        estado: (() => {
          const boleto = listaBoletos.find((item) => item.idReservacion === reserva.id);
          if (boleto?.estado === 'utilizado') return 'utilizado';
          if (boleto?.estado === 'cancelado') return 'cancelado';
          return reserva.estado === 'confirmada' ? 'vigente' : reserva.estado === 'cancelada' ? 'cancelado' : 'apartado';
        })(),
        motivoCancelacion: reserva.motivoCancelacion || listaBoletos.find((boleto) => boleto.idReservacion === reserva.id)?.motivoInvalidacion
      };
    }) : [];

  const filasIntenciones = usuarioActual ? listaIntencionesAsistencia
    .filter((registro) => registro.idUsuario === usuarioActual.id)
    .map((registro) => {
      const { evento, fecha, dia } = obtenerDatosDia(registro.idEvento, registro.idFechaEvento);
      return {
        id: registro.id,
        evento: evento?.titulo || 'Evento no disponible',
        dia,
        fecha: fecha?.fecha || '—',
        fechaRegistro: new Date(registro.fechaRegistro).toLocaleString('es-MX')
      };
    }) : [];

  const filasListaEspera = usuarioActual ? listaEspera
    .filter((entrada) => entrada.idUsuario === usuarioActual.id)
    .map((entrada) => {
      const { evento, fecha, dia } = obtenerDatosDia(entrada.idEvento, entrada.idFechaEvento);
      return {
        id: entrada.id,
        evento: evento?.titulo || 'Evento no disponible',
        dia,
        fecha: fecha?.fecha || '—',
        horario: fecha ? `${fecha.horaInicio} a ${fecha.horaFin}` : 'Horario no disponible',
        posicion: entrada.posicionFila,
        puedeRetirarse: entrada.estado === 'esperando',
        estado: entrada.estado === 'esperando' ? 'en_espera'
          : entrada.estado === 'notificado' ? 'oferta_vigente'
            : entrada.estado === 'convertido' ? 'aceptada'
              : entrada.estado === 'cancelado' ? 'retirada'
                : entrada.estado,
        fechaRegistro: new Date(entrada.fechaCreacion).toLocaleString('es-MX')
      };
    }) : [];

  if (!usuarioActual) {
    const mensaje = obtenerMensaje('ERR-TR-01');
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio titulo={mensaje.titulo} descripcion={mensaje.descripcion} textoAccion="Iniciar sesión" alHacerAccion={() => navigate('/login')} />
      </div>
    );
  }

  if (usuarioActual.correoConfirmado !== true) {
    const mensaje = obtenerMensaje('ERR-IP-04');
    return <div className="max-w-4xl mx-auto px-4 py-16"><AlertaMensaje tipo="error" titulo={mensaje.titulo} mensaje={mensaje.descripcion} /><button onClick={() => navigate('/confirmar-correo')} className="mt-5 rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white">Confirmar correo</button></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-7">
        <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">Taquilla digital</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-0.5">Mis boletos e historial</h1>
        <p className="text-sm text-neutral-500 mt-1">Un boleto por evento con tus actividades reservadas y su estado de entrada.</p>
      </div>

      {totalRegistros === 0 && (
        <div className="mb-6">
          <EstadoVacio titulo={obtenerMensaje('INF-MT-06').titulo} descripcion={obtenerMensaje('INF-MT-06').descripcion} textoAccion="Ver cartelera" alHacerAccion={() => navigate('/eventos')} />
        </div>
      )}

      {ofertaActiva?.fechaExpiracionOferta && (
        <BannerOfertaEspera
          variante="vigente"
          oferta={{
            dia: `${obtenerDatosDia(ofertaActiva.idEvento, ofertaActiva.idFechaEvento).evento?.titulo || 'Evento'} · ${obtenerDatosDia(ofertaActiva.idEvento, ofertaActiva.idFechaEvento).dia}`,
            fechaHoraLimite: new Date(ofertaActiva.fechaExpiracionOferta).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
            tiempoRestante: (() => {
              const segundos = Math.max(0, Math.ceil((ofertaActiva.fechaExpiracionOferta! - ahora) / 1000));
              return `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
            })(),
            actividadTraslape: '',
            inicioTraslape: '',
            finTraslape: ''
          }}
          alAceptar={() => responderOferta('aceptar')}
          alRechazar={() => responderOferta('rechazar')}
        />
      )}

      <div className="flex border-b border-neutral-200 mb-6" role="tablist" aria-label="Boletos e historial">
        <button type="button" role="tab" aria-selected={pestanaActiva === 'activos'} onClick={() => setPestanaActiva('activos')} className={`py-3 px-5 text-sm border-b-2 ${pestanaActiva === 'activos' ? 'border-[#7a132b] text-[#7a132b] font-semibold' : 'border-transparent text-neutral-500'}`}>
          Boletos activos ({pasesActivos.length})
        </button>
        <button type="button" role="tab" aria-selected={pestanaActiva === 'historial'} onClick={() => setPestanaActiva('historial')} className={`py-3 px-5 text-sm border-b-2 ${pestanaActiva === 'historial' ? 'border-[#7a132b] text-[#7a132b] font-semibold' : 'border-transparent text-neutral-500'}`}>
          Historial ({filasReservaciones.length + filasIntenciones.length + filasListaEspera.length})
        </button>
      </div>

      {pestanaActiva === 'activos' ? (
        pasesActivos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-12 text-center">
            <Ticket className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
            <h2 className="font-semibold text-neutral-800">No tienes boletos activos</h2>
            <p className="text-sm text-neutral-500 mt-1">Tus reservaciones anteriores y participaciones están en Historial.</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-6 ${pasesActivos.length>1 ? "md:grid-cols-2" : ""}`}>
            {pasesActivos.map(pase=>{
              const accesos=accesosVista(pase.accesos);
              const principal={...accesos.find(a=>a.estado==='valido')!,codigoQr:pase.codigoQr};
              return <TarjetaBoleto key={pase.idEvento} boleto={principal} accesos={accesos} alAmpliarQr={setBoletoParaQR} alCancelar={abrirCancelacion}/>;
            })}
          </div>
        )
      ) : (
        <div className="space-y-6">{pasesAnteriores.length>0&&<section aria-label="Boletos anteriores" className="grid gap-6 md:grid-cols-2">{pasesAnteriores.map(pase=>{const accesos=accesosVista(pase.accesos);return <TarjetaBoleto key={pase.idEvento} boleto={{...accesos[0],codigoQr:pase.codigoQr}} accesos={accesos} alAmpliarQr={setBoletoParaQR} alCancelar={abrirCancelacion}/>;})}</section>}<HistorialBoletos reservaciones={filasReservaciones} intenciones={filasIntenciones} listaEspera={filasListaEspera} alRetirarse={retirarseDeLista} /></div>
      )}

      <ModalBoletoQR boleto={boletoParaQR && paseSeleccionado ? {...(paseSeleccionado.accesos.find(pendiente)||paseSeleccionado.accesos[0]),codigoQr:paseSeleccionado.codigoQr}:null} accesos={paseSeleccionado ? accesosVista(paseSeleccionado.accesos) : []} alCerrar={() => setBoletoParaQR(null)} />
      <ModalCancelarReservacion boleto={boletoACancelar} alConservar={() => setBoletoACancelar(null)} alConfirmar={confirmarCancelacion} />
      <ModalListaEspera
        estaAbierto={participacionParaRetirar !== null}
        variante="retiro"
        evento={participacionParaRetirar?.evento || 'Evento'}
        dia={participacionParaRetirar?.dia || 'Día del evento'}
        horario={participacionParaRetirar?.horario || 'Horario no disponible'}
        alCerrar={() => setParticipacionParaRetirar(null)}
        alConfirmar={confirmarRetiroLista}
      />
    </div>
  );
};

export default MisBoletosPagina;
