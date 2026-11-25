import { BotonRegresar } from "../componentes/ui/BotonRegresar";
import { fechaLegible } from "../dominio/presentacionActividad";
import {apiActiva} from "../servicios/modoDatos";
import { transporteApi } from '../servicios/http';
import {NuevaActividadEvento} from "../componentes/eventos/NuevaActividadEvento";
import { CambioRecintoActividad } from "../componentes/recintos/CambioRecintoActividad";
import { trasladarPrograma } from "../dominio/cambiosEvento";
import { EditorItinerarios } from '../componentes/eventos/EditorItinerarios';
import { validarItinerarios, nombreActividad } from '../dominio/actividades';
import type { Evento, ItinerarioDia } from '../tipos';
import { modalidadActividad, aforoActividad } from '../dominio/actividades';
import { volverASeccion } from '../dominio/navegacion';
import { inicioEnMexico } from '../dominio/solicitudes';
import React from 'react';
import { interfazSolicitada } from '../dominio/pantallasDocumentacion';
import { VentanaModal } from '../componentes/ui/VentanaModal';
import { EditorPrograma, ProgramaDia } from '../componentes/eventos/EditorPrograma';
import { EditorCartel } from '../componentes/eventos/EditorCartel';
import { ordenarPrograma, validarPrograma } from '../dominio/programa';
import type { ActividadPrograma, FechaEvento } from '../tipos';
import {
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  Layers,
  Send,
  Eye,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Ticket,
  CalendarClock,
  BarChart3
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useCargarAgendasRecintos } from '../contextos/useDisponibilidadRecintos';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { useAutenticacion } from '../contextos/AutenticacionContexto';

interface PropuestaEdicionEvento {
  itinerarios?: ItinerarioDia[];
  titulo: string;
  descripcion: string;
  ponentes: string[];
  urlImagen?: string;
  fechas: FechaEvento[];
  versionOriginal: string;
}

function camposEditados(evento: Evento, propuesta: PropuestaEdicionEvento) {
  return [
    evento.titulo !== propuesta.titulo && 'Título',
    evento.descripcion !== propuesta.descripcion && 'Descripción',
    JSON.stringify(evento.ponentes) !== JSON.stringify(propuesta.ponentes) && 'Ponentes',
    evento.urlImagen !== propuesta.urlImagen && 'Cartel',
    JSON.stringify(evento.fechas) !== JSON.stringify(propuesta.fechas) && 'Actividades',
    JSON.stringify(evento.itinerarios ?? []) !== JSON.stringify(propuesta.itinerarios ?? []) && 'Itinerarios',
  ].filter((campo): campo is string => Boolean(campo));
}

interface PropiedadesConfiguracionEvento {
  eventId: string;
  navigate: (ruta: string) => void;
}

export const ConfiguracionEventoPagina: React.FC<PropiedadesConfiguracionEvento> = ({
  eventId,
  navigate
}) => {
  const { listaEventos, listaRecintos, listaArreglos, listaReservaciones, listaBoletos, cancelarUnidadEvento, bitacoraEscaneos, obtenerListaDeVerificacion, publicarEvento, actualizarEvento, eliminarFechaEvento, verificarDisponibilidadRecinto, cancelarReservacionPorEvento } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();
  const { usuarioActual, rolActivo, todosLosUsuarios } = useAutenticacion();
  const bloqueoGuardado=React.useRef(false);
  const [guardando,setGuardando]=React.useState(false);
  const guardar=async(accion:()=>unknown)=>{if(bloqueoGuardado.current)return;bloqueoGuardado.current=true;setGuardando(true);try{await accion();}catch{mostrarNotificacion('No se pudo guardar','Revisa la conexión y vuelve a consultar el evento antes de intentarlo otra vez.','error');}finally{bloqueoGuardado.current=false;setGuardando(false);}};
  const [propuestaEdicion, setPropuestaEdicion] = React.useState<PropuestaEdicionEvento | null>(null);
  const [urlBannerPropuesto, setUrlBannerPropuesto] = React.useState<string | undefined>();
  const [errorBanner, setErrorBanner] = React.useState('');
  const [nombreBanner, setNombreBanner] = React.useState('');
  const [cargandoBanner, setCargandoBanner] = React.useState(false);
  const [cartelModificado, setCartelModificado] = React.useState(false);
  const [programasEditados, setProgramasEditados] = React.useState<Record<string, ActividadPrograma[]>>({});
  const [itinerariosEditados,setItinerariosEditados] = React.useState<ItinerarioDia[] | undefined>();
  const [erroresItinerario,setErroresItinerario] = React.useState<Record<string,{cargando:boolean;error:string}>>({});
  const [actividadesEditadas,setActividadesEditadas] = React.useState<Record<string,{nombreActividad:string;descripcionActividad:string}>>({});
  const [cancelacion, setCancelacion] = React.useState<{idFecha?:string; version:string} | null>(null);
  const [reprogramacion,setReprogramacion] = React.useState<{anterior:FechaEvento;nueva:FechaEvento;confirmar:()=>void} | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = React.useState('');
  const [idCambioRecinto,setIdCambioRecinto] = React.useState<string|null>(null);
  const [verConstancia,setVerConstancia] = React.useState(interfazSolicitada() === 'UI.22');
  const [compartiendo, setCompartiendo] = React.useState(false);
  const [enlacePrivado, setEnlacePrivado] = React.useState('');

  const evento = listaEventos.find((e) => e.id === eventId);
  const agendaRemota = useCargarAgendasRecintos((evento?.fechas || []).filter(f=>!f.cancelada).map(f=>({fecha:f.fecha,idActividadExcluir:f.id})));
  const checklist = obtenerListaDeVerificacion(eventId);
  const casoDocumentado = new URLSearchParams(window.location.search).get('caso');
  const interfazDocumentada = interfazSolicitada();
  const actividadSolicitada = new URLSearchParams(window.location.search).get('cambioRecinto');
  React.useEffect(() => { setIdCambioRecinto(actividadSolicitada); }, [eventId, actividadSolicitada]);
  React.useEffect(() => {
    if (interfazDocumentada !== 'UI.21' || !evento || !(evento.idOrganizador === usuarioActual?.id || rolActivo === 'subdireccion')) return;
    const dia = evento.fechas.find(d => !d.cancelada && inicioEnMexico(d.fecha,d.horaInicio)>Date.now());
    if (['CU-OR-22','CU-OR-23','CU-OR-24','CU-OR-25'].includes(casoDocumentado || '') && dia) {
      setCancelacion({idFecha:casoDocumentado === 'CU-OR-23'?undefined:dia.id,version:JSON.stringify(evento)});
    }
    if (casoDocumentado === 'CU-OR-21' && dia) setIdCambioRecinto(dia.id);
    if (casoDocumentado === 'CU-OR-19') setPropuestaEdicion({titulo:evento.titulo,descripcion:evento.descripcion,ponentes:evento.ponentes,urlImagen:evento.urlImagen,fechas:evento.fechas,versionOriginal:JSON.stringify(evento)});
  }, [eventId,usuarioActual?.id,casoDocumentado,interfazDocumentada]);

  if (!evento) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Evento no encontrado"
          descripcion="El evento que intentas configurar no existe en la base de datos."
          textoAccion="Volver al panel"
          alHacerAccion={() => navigate('/organizador')}
        />
      </div>
    );
  }

  const panelEventos = rolActivo === 'subdireccion' ? '/subdireccion' : '/organizador';
  const textoRegreso = rolActivo === 'subdireccion' ? 'Volver a Subdirección' : 'Volver a mis eventos y solicitudes';
  const puedeGestionar = !!usuarioActual?.estaActivo && (evento.idOrganizador === usuarioActual.id || (rolActivo === 'subdireccion' && usuarioActual.roles.includes('subdireccion')));

  const confirmarEdicionEvento = async () => {
    if (!evento || !propuestaEdicion || !usuarioActual) return;
    if (JSON.stringify(evento) !== propuestaEdicion.versionOriginal) {
      mostrarNotificacion('El evento cambió', 'Vuelve a revisar los cambios antes de confirmar para no sobrescribir otra modificación.', 'advertencia');
      setPropuestaEdicion(null);
      return;
    }
    if (!puedeGestionar || evento.fechas.some((dia) => inicioEnMexico(dia.fecha, dia.horaInicio) <= Date.now()) || bitacoraEscaneos.some((registro) => registro.idEvento === evento.id && registro.resultado === 'exito')) { mostrarNotificacion('Edición no disponible', 'El evento ya comenzó o tiene entradas registradas.', 'advertencia'); return; }
    if(propuestaEdicion.fechas.some(d=>d.nombreActividad!==undefined&&!d.nombreActividad.trim())){mostrarNotificacion('Nombre requerido','Escribe el nombre de cada actividad.','advertencia');return;}
    const errorPrograma = propuestaEdicion.fechas.map(validarPrograma).find(Boolean);
    if (errorPrograma || errorBanner || cargandoBanner) {
      mostrarNotificacion('Revisa los cambios', errorPrograma || errorBanner || 'Espera a que termine la carga del cartel.', 'advertencia');
      return;
    }
    const itinerarios = propuestaEdicion.itinerarios ?? evento.itinerarios;
    const errorItinerario = validarItinerarios(itinerarios,propuestaEdicion.fechas);
    const pendienteItinerario = Object.values(erroresItinerario).find(e=>e.cargando||e.error);
    if(errorItinerario||pendienteItinerario){mostrarNotificacion('Revisa el itinerario',errorItinerario||pendienteItinerario?.error||'Espera a que termine la preparación.','advertencia');return;}
    const anterior = { titulo: evento.titulo, descripcion: evento.descripcion, ponentes: [...evento.ponentes], urlImagen: evento.urlImagen };
    const campos = camposEditados(evento, propuestaEdicion);
    if (!campos.length) {
      mostrarNotificacion('Sin cambios', 'No modificaste la información del evento.', 'informacion');
      setPropuestaEdicion(null);
      setUrlBannerPropuesto(undefined);
      setNombreBanner('');
      setCartelModificado(false);
      setProgramasEditados({});
      return;
    }
    const valoresNuevos = {
      titulo: propuestaEdicion.titulo,
      descripcion: propuestaEdicion.descripcion,
      ponentes: propuestaEdicion.ponentes,
      urlImagen: propuestaEdicion.urlImagen,
    };
    const historialCambios = [...(evento.historialCambios || []), {
      version: (evento.historialCambios?.length || 0) + 1,
      fecha: new Date().toISOString(),
      responsable: usuarioActual.nombre,
      motivo: "Edición de información",
      campos,
      valoresAnteriores: anterior,
      valoresNuevos,
      detalleAnterior: JSON.stringify({ ...anterior, itinerarios:evento.itinerarios, actividades:evento.fechas, programas: evento.fechas.map(dia => ({ id: dia.id, programa: dia.programa })) }, null, 2),
      detalleNuevo: JSON.stringify({ ...valoresNuevos, itinerarios, actividades:propuestaEdicion.fechas, programas: propuestaEdicion.fechas.map(dia => ({ id: dia.id, programa: dia.programa })) }, null, 2),
    }];
    const resultado = await actualizarEvento(evento.id, { ...valoresNuevos, fechas: propuestaEdicion.fechas, itinerarios, historialCambios }, propuestaEdicion.versionOriginal);
    if (!resultado.exito) {
      mostrarNotificacion('No se pudo guardar', resultado.error || 'Tus cambios siguen en el formulario.', 'error');
      return;
    }
    mostrarNotificacion('Información actualizada', `Se guardó la versión ${historialCambios.length} del evento.`, 'exito');
    setPropuestaEdicion(null);
    setNombreBanner('');
    setUrlBannerPropuesto(undefined);
    setCartelModificado(false);
    setProgramasEditados({});
  };

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : 'Recinto no asignado';
  };

  const manejarPublicar = async () => {
    const res = await publicarEvento(evento.id);
    if (res.exito) {
      mostrarNotificacion(
        '¡Evento publicado oficialmente!',
        'El evento y su taquilla digital ya están disponibles en la cartelera general de ESCOM.',
        'exito'
      );
      navigate(`/eventos/${evento.id}`);
    } else {
      mostrarNotificacion('No se puede publicar', res.error || '', 'error');
    }
  };

  const imprimirConstancia = () => {
    const escapar = (texto: string) => texto.replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter] || caracter);
    const ventana = window.open('', '_blank');
    if (!ventana) { mostrarNotificacion('Ventana bloqueada', 'Permite ventanas emergentes para imprimir la constancia operativa.', 'advertencia'); return; }
    ventana.opener = null;
    const filas = evento.fechas.map((dia, indice) => `<tr><td>Día ${indice + 1}</td><td>${escapar(dia.fecha)}</td><td>${escapar(dia.horaInicio)}–${escapar(dia.horaFin)}</td><td>${escapar(obtenerNombreRecinto(dia.idRecinto))}</td><td>${dia.cancelada ? 'Cancelado' : 'Programado'}</td></tr>`).join('');
    ventana.document.write(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Constancia operativa · ${escapar(evento.titulo)}</title><style>body{font:14px Arial,sans-serif;margin:48px;color:#222}h1{font-size:24px}p{line-height:1.5}.folio{font-family:monospace;color:#555}table{border-collapse:collapse;width:100%;margin-top:24px}td,th{border:1px solid #bbb;padding:10px;text-align:left}th{background:#f3f3f3}.nota{margin-top:32px;color:#666;font-size:11px}@media print{body{margin:20mm}}</style><h1>Constancia operativa del evento</h1>
        {puedeGestionar && rolActivo==='subdireccion' && evento.estado!=='cancelado' && <NuevaActividadEvento evento={evento}/>}<p class="folio">Folio local: ${escapar(evento.id)} · Estado: ${escapar(evento.estado)}</p><h2>${escapar(evento.titulo)}</h2><p>${escapar(evento.descripcion)}</p><p>Organiza: ${escapar(evento.nombreOrganizador)} · Modalidad: ${escapar(evento.modalidadAsistencia)}</p><table><thead><tr><th>Día</th><th>Fecha</th><th>Horario</th><th>Recinto</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table><p class="nota">Documento de consulta generado desde los datos locales de Ticket Trade.</p></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  };

  const esPublicado = evento.estado === 'publicado';
  const puedeEditarInformacion = puedeGestionar && ['configuracion', 'borrador', 'publicado'].includes(evento.estado) && evento.fechas.every((dia) => inicioEnMexico(dia.fecha, dia.horaInicio) > Date.now()) && !bitacoraEscaneos.some((registro) => registro.idEvento === evento.id && registro.resultado === 'exito');
  const guardarCambioFecha = async (e: React.FormEvent<HTMLFormElement>, idFecha: string) => {
    e.preventDefault();
    if (!puedeGestionar) { mostrarNotificacion('Sin autorización', 'Solo el organizador responsable o Subdirección pueden modificar este evento.', 'error'); return; }
    const datos = new FormData(e.currentTarget);
    const fecha = String(datos.get('fecha') || '');
    const horaInicio = String(datos.get('horaInicio') || '');
    const horaFin = String(datos.get('horaFin') || '');
    const idRecinto = String(datos.get('idRecinto') || '');
    const fechaActual = evento.fechas.find((dia) => dia.id === idFecha);
    if (fechaActual && (fechaActual.cancelada || inicioEnMexico(fechaActual.fecha, fechaActual.horaInicio) <= Date.now() || bitacoraEscaneos.some((registro) => registro.idFechaEvento === idFecha && registro.resultado === 'exito'))) { mostrarNotificacion('Cambio no disponible', 'Solo puedes reprogramar días futuros, no cancelados y sin entradas registradas.', 'advertencia'); return; }
    if (!fechaActual || !fecha || !horaInicio || !horaFin || horaFin <= horaInicio) {
      mostrarNotificacion('Revisa la programación', 'La fecha y el horario deben ser válidos.', 'advertencia'); return;
    }
    if (fecha === fechaActual.fecha && horaInicio === fechaActual.horaInicio && horaFin === fechaActual.horaFin && idRecinto === fechaActual.idRecinto && !fechaActual.suspendida) {
      mostrarNotificacion('Sin cambios', 'Modifica la fecha o el horario antes de revisar.', 'informacion'); return;
    }
    let programa:FechaEvento['programa'];
    try { programa=trasladarPrograma(fechaActual,horaInicio); }
    catch(error){mostrarNotificacion('Revisa el programa',(error as Error).message,'advertencia');return;}
    const errorPrograma = validarPrograma({ ...fechaActual, horaInicio, horaFin,programa });
    if (errorPrograma) { mostrarNotificacion('Revisa el programa del día', errorPrograma, 'advertencia'); return; }
    if (inicioEnMexico(fecha,horaInicio) <= Date.now()) {
      mostrarNotificacion('Fecha no válida', 'No se puede reprogramar a una fecha pasada.', 'error'); return;
    }
    const recinto = listaRecintos.find((item) => item.id === idRecinto);
    const arregloExistente = listaArreglos.find((arreglo) => arreglo.idFechaEvento === idFecha && arreglo.estado === 'version_final');
    if (!recinto || (aforoActividad(fechaActual,evento.aforoMaximo) || 0) > recinto.capacidad || (arregloExistente && arregloExistente.totalAsientos > recinto.capacidad)) {
      mostrarNotificacion('Capacidad incompatible', 'El recinto elegido no tiene capacidad suficiente para el aforo del evento.', 'error'); return;
    }
    let disponibilidad;
    try {
      disponibilidad = agendaRemota ? (await agendaRemota.revisar([{id:idFecha,idRecinto,fecha,horaInicio,horaFin}],{idActividadExcluir:idFecha})).actividades[0] : verificarDisponibilidadRecinto(idRecinto, fecha, horaInicio, horaFin, idFecha);
    } catch (error) {
      mostrarNotificacion('No se pudo confirmar la disponibilidad',error instanceof Error?error.message:'Reintenta la consulta.','error');return;
    }
    if (!disponibilidad.disponible) {
      mostrarNotificacion('Conflicto de agenda', 'motivo' in disponibilidad && disponibilidad.motivo || 'El recinto no está disponible en la agenda actual.', 'error'); return;
    }
    const compromisosReservados = listaReservaciones.some((reserva) => reserva.idEvento === evento.id && reserva.idFechaEvento === idFecha && (reserva.estado === 'confirmada' || (reserva.estado === 'apartado_temporal' && (reserva.tiempoExpiracionApartado||0)>Date.now()))) || listaBoletos.some(b=>b.idFechaEvento===idFecha&&b.estado!=='cancelado');
    if (idRecinto !== fechaActual.idRecinto && compromisosReservados) {
      mostrarNotificacion('No se puede cambiar el recinto todavía', 'Hay lugares confirmados asociados a la distribución actual. Primero deben resolverse esos compromisos para evitar cambiar los asientos de los boletos.', 'error'); return;
    }
    const motivoCambio = String(datos.get('motivoCambio') || '').trim();
    if (!motivoCambio?.trim()) { mostrarNotificacion('Cambio cancelado', 'Se requiere un motivo para registrar la modificación.', 'advertencia'); return; }
    const fechaNueva = { ...fechaActual, programa, fecha, horaInicio, horaFin, idRecinto, suspendida:false, idBloqueoSuspension:undefined, ...(idRecinto!==fechaActual.idRecinto?{idArregloFinal:undefined,esFinalConfirmado:false}:{}) };
    const registrarCambioFecha = async (historialExcepcionesAnticipacion = evento.historialExcepcionesAnticipacion) => {
      const historialCambios = [...(evento.historialCambios || []), {
        version: (evento.historialCambios?.length || 0) + 1,
        fecha: new Date().toISOString(),
        responsable: usuarioActual?.nombre || 'Usuario autorizado',
        motivo: motivoCambio.trim(),
        campos: ['fecha', 'hora de inicio', 'hora de fin', 'recinto'],
        valoresAnteriores: { titulo: evento.titulo, descripcion: evento.descripcion, ponentes: [...evento.ponentes], urlImagen: evento.urlImagen },
        valoresNuevos: { titulo: evento.titulo, descripcion: evento.descripcion, ponentes: [...evento.ponentes], urlImagen: evento.urlImagen },
        detalleAnterior: JSON.stringify(fechaActual),
        detalleNuevo: JSON.stringify(fechaNueva)
      }];
      return actualizarEvento(evento.id, {
        fechas: evento.fechas.map((dia) => dia.id === idFecha ? fechaNueva : dia),
        historialCambios,
        ...(historialExcepcionesAnticipacion ? { historialExcepcionesAnticipacion } : {})
      }, JSON.stringify(evento));
    };
    const horasAnticipacion = (inicioEnMexico(fecha,horaInicio) - Date.now()) / 3600000;
    const revisar = (confirmar:()=>void) => setReprogramacion({anterior:fechaActual,nueva:fechaNueva,confirmar});
    if (fecha !== fechaActual.fecha && horasAnticipacion < 168) {
      if (rolActivo !== 'subdireccion') {
        mostrarNotificacion('Requiere autorización', 'Los cambios con menos de 168 horas deben ser aplicados por Subdirección con una excepción motivada.', 'advertencia'); return;
      }
      const motivo = String(datos.get('motivoExcepcion') || '').trim();
      if (!motivo?.trim()) { mostrarNotificacion('Excepción cancelada', 'Se requiere una justificación para aplicar el cambio urgente.', 'advertencia'); return; }
      revisar(async () => {
      const resultado = await registrarCambioFecha([...(evento.historialExcepcionesAnticipacion || []), { idFechaEvento: idFecha, fechaAplicacion: new Date().toISOString(), motivo: motivo.trim(), responsable: usuarioActual?.nombre || 'Subdirección' }]);
      if (!resultado.exito) { mostrarNotificacion('No se pudo reprogramar', resultado.error || 'Revisa los datos e inténtalo nuevamente.', 'error'); return; }
      mostrarNotificacion('Excepción aplicada', 'La justificación quedó registrada en la bitácora del evento.', 'informacion');
      setReprogramacion(null);
      });
      return;
    }
    revisar(async () => {
    const resultado = await registrarCambioFecha();
    if (!resultado.exito) { mostrarNotificacion('No se pudo reprogramar', resultado.error || 'Revisa los datos e inténtalo nuevamente.', 'error'); return; }
    mostrarNotificacion('Programación actualizada', `Cambio registrado como versión ${(evento.historialCambios?.length || 0) + 1}.`, 'exito');
    setReprogramacion(null);
    });
  };

  const confirmarCancelacion = (idFecha?:string) => {
    setMotivoCancelacion('');
    setCancelacion({idFecha, version:JSON.stringify(evento)});
  };
  const ejecutarCancelacion = async () => {
    if (!cancelacion || !motivoCancelacion.trim()) return;
    const resultado = await cancelarUnidadEvento(evento.id, cancelacion.idFecha, motivoCancelacion, false, cancelacion.version);
    mostrarNotificacion(resultado.exito ? 'Operación registrada' : 'Operación no realizada', resultado.exito ? 'La cancelación quedó guardada. Los avisos se enviarán a los participantes registrados.' : resultado.error || '', resultado.exito ? 'exito' : 'error');
    if (resultado.exito) setCancelacion(null);
  };
  const cancelarDia=(id:string)=>confirmarCancelacion(id);
  const cancelarEventoCompleto=()=>confirmarCancelacion();

  const recintosProgramados = [...new Set(evento.fechas
    .filter(fecha => !fecha.cancelada)
    .map(fecha => obtenerNombreRecinto(fecha.idRecinto)))];
  const fechaInicial = evento.fechas.filter(fecha => !fecha.cancelada).map(fecha => fecha.fecha).sort()[0];
  const secciones = [
    { id: 'gestion-taquilla', nombre: 'Taquilla' },
    { id: 'gestion-actividades', nombre: 'Actividades y lugares' },
    ...(puedeEditarInformacion ? [{ id: 'gestion-informacion', nombre: 'Editar información' }] : []),
    ...(puedeGestionar && esPublicado && evento.visibilidad === 'privado'
      ? [{ id: 'gestion-enlace', nombre: 'Enlace privado' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {puedeGestionar && idCambioRecinto && evento.fechas.some(a=>a.id===idCambioRecinto) && <CambioRecintoActividad key={idCambioRecinto} evento={evento} idActividad={idCambioRecinto} alCerrar={()=>setIdCambioRecinto(null)}/>}
      <VentanaModal estaAbierto={Boolean(reprogramacion)} alCerrar={()=>setReprogramacion(null)} titulo="Revisar cambio de actividad">
        {reprogramacion && <div className="space-y-4">
          <h3 className="font-bold">{nombreActividad(reprogramacion.anterior)}</h3>
          <div className="grid gap-3 sm:grid-cols-2">{[{titulo:'Programación actual',actividad:reprogramacion.anterior},{titulo:'Nueva programación',actividad:reprogramacion.nueva}].map(({titulo,actividad})=><div key={titulo} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"><p className="font-semibold">{titulo}</p><p>{actividad.fecha} · {actividad.horaInicio}–{actividad.horaFin}</p><p>{obtenerNombreRecinto(actividad.idRecinto)}</p></div>)}</div>
          {reprogramacion.nueva.programa?.length && reprogramacion.nueva.horaInicio!==reprogramacion.anterior.horaInicio ? <details className="rounded-xl border border-neutral-200 p-4"><summary className="cursor-pointer font-semibold">Programa ajustado al nuevo inicio</summary><p className="my-2 text-sm text-neutral-500">Se conservan los intervalos y la duración de las actividades del programa.</p><ProgramaDia programa={reprogramacion.nueva.programa}/></details>:null}
          <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-800">Los boletos conservan su QR y muestran el horario actualizado.</p>
          <div className="flex gap-3"><button type="button" onClick={()=>setReprogramacion(null)} className="rounded-lg border border-neutral-200 px-4 py-2">Seguir editando</button><button type="button" disabled={guardando} aria-busy={guardando} onClick={()=>guardar(reprogramacion.confirmar)} className="rounded-lg bg-[#7a132b] px-4 py-2 font-semibold text-white">Confirmar cambio</button></div>
        </div>}
      </VentanaModal>
      <VentanaModal estaAbierto={verConstancia} alCerrar={() => setVerConstancia(false)} titulo="Constancia operativa del evento" anchoMaximo="4xl">
        <h2 className="text-xl font-bold">{evento.titulo}</h2>
        <p className="my-3">{evento.descripcion}</p><p>Folio: {evento.id} · Organiza: {evento.nombreOrganizador}</p>
        <ul className="my-5 space-y-3">{evento.fechas.map((dia,i) => <li className="rounded-lg border p-3" key={dia.id}><strong>Día {i+1} · {dia.fecha}</strong><p>{dia.horaInicio}–{dia.horaFin} · {obtenerNombreRecinto(dia.idRecinto)}</p><p>{dia.cancelada?'Cancelado':dia.suspendida?'Pendiente de reprogramación':'Programado'}</p></li>)}</ul>
        <button type="button" onClick={imprimirConstancia} className="rounded-lg border px-4 py-2">Imprimir constancia operativa</button>
      </VentanaModal>
      <VentanaModal estaAbierto={Boolean(cancelacion)} alCerrar={() => setCancelacion(null)} titulo={cancelacion?.idFecha ? "Cancelar actividad" : "Cancelar evento"}>
        <form onSubmit={e => {e.preventDefault(); void guardar(ejecutarCancelacion);}} className="space-y-4">
          <p>Los accesos afectados se invalidarán. {apiActiva && "Se enviará un aviso a las cuentas registradas con correo confirmado."}</p>
          {(!cancelacion?.idFecha || evento.fechas.filter(a=>!a.cancelada).every(a=>a.id===cancelacion.idFecha)) && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">No quedarán actividades vigentes. El evento completo aparecerá como cancelado, conservando su expediente e historial.</p>}
          <ul className="space-y-2">{evento.fechas.filter(actividad=>!actividad.cancelada&&(!cancelacion?.idFecha||actividad.id===cancelacion.idFecha)).map((actividad,indice)=><li key={actividad.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"><strong>{nombreActividad(actividad,indice)}</strong><p className="text-sm">{actividad.fecha} · {actividad.horaInicio}–{actividad.horaFin} · {obtenerNombreRecinto(actividad.idRecinto)}</p><p className="mt-2 text-sm text-neutral-600">{listaReservaciones.filter(r=>r.idFechaEvento===actividad.id&&r.estado==='confirmada').length} reservaciones confirmadas · {listaBoletos.filter(b=>b.idFechaEvento===actividad.id&&b.estado==='valido').length} boletos vigentes</p></li>)}</ul>
          <label className="block text-sm font-semibold">Motivo de la cancelación<textarea required value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
          <div className="flex gap-3"><button type="button" onClick={() => setCancelacion(null)} className="rounded-lg border px-4 py-2">Volver</button><button type="submit" disabled={guardando} aria-busy={guardando} className="rounded-lg bg-rose-700 px-4 py-2 text-white">{cancelacion?.idFecha ? "Cancelar actividad" : "Cancelar evento"}</button></div>
        </form>
      </VentanaModal>
      <BotonRegresar destino={textoRegreso} alVolver={() => navigate(volverASeccion(panelEventos))} />

      <header className="overflow-hidden rounded-[1.75rem] border border-[#4d1121] bg-[#521426] text-white md:grid md:grid-cols-[minmax(0,1fr)_minmax(15rem,34%)]">
        <div className="flex min-w-0 flex-col justify-between gap-6 p-5 sm:p-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <InsigniaEstado estado={evento.estado} />
              <span className="rounded-full border border-white/25 px-2.5 py-1 text-xs font-semibold text-white">
                {evento.visibilidad === 'privado' ? 'Privado' : 'Público'}
              </span>
            </div>
            <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">{evento.titulo}</h1>
            {evento.descripcion && <p className="mt-3 max-w-prose text-sm leading-relaxed text-rose-100/90">{evento.descripcion}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/20 pt-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-rose-200">Actividades</dt><dd className="mt-1 font-semibold">{evento.fechas.length}</dd></div>
            {fechaInicial && <div><dt className="text-xs text-rose-200">Primera fecha</dt><dd className="mt-1 font-semibold">{fechaLegible(fechaInicial)}</dd></div>}
            {recintosProgramados.length > 0 && <div><dt className="text-xs text-rose-200">{recintosProgramados.length === 1 ? 'Recinto' : 'Recintos'}</dt><dd className="mt-1 font-semibold">{recintosProgramados.length === 1 ? recintosProgramados[0] : recintosProgramados.length}</dd></div>}
          </dl>
        </div>
        <div className="relative min-h-36 overflow-hidden bg-[#682139] md:min-h-full">
          {evento.urlImagen ? <img key={evento.urlImagen} src={evento.urlImagen} alt="" className="h-44 w-full object-cover md:absolute md:inset-0 md:h-full" />
            : <Calendar className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 text-rose-200/35" aria-hidden="true" />}
        </div>
      </header>

      <nav aria-label="Secciones de gestión del evento" className="mb-7 flex flex-wrap items-center gap-2 border-b border-neutral-200 py-3">
        {secciones.map(seccion => (
          <button type="button" key={seccion.id} onClick={() => {
            const destino = document.getElementById(seccion.id);
            destino?.scrollIntoView({ block: 'start' });
            destino?.focus({ preventScroll: true });
          }} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#7a132b] hover:bg-rose-50">
            {seccion.nombre}
          </button>
        ))}
        {esPublicado && evento.visibilidad !== 'privado' && <button type="button"
          onClick={() => navigate(`/eventos/${evento.id}`)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 sm:ml-auto">
          <Eye size={16} aria-hidden="true" /> Ver en cartelera
        </button>}
      </nav>

      {/* Cabecera del Evento */}
      {puedeGestionar && evento.visibilidad === 'privado' && evento.estado === 'publicado' && <section id="gestion-enlace" tabIndex={-1} className="mb-6 scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-5" aria-label="Compartir evento privado">
        <h2 className="font-bold text-neutral-900">Compartir enlace privado</h2>
        {apiActiva ? <p className="mt-1 text-sm text-neutral-600">Cualquier persona con el enlace puede consultar el evento. Para reservar necesita iniciar sesión.</p> : <p className="mt-1 text-sm text-neutral-700">Este evento pertenece al prototipo local y solo existe en este navegador. Para compartirlo con invitados debes crearlo en la aplicación conectada a la base de datos.</p>}
        {apiActiva && <button type="button" disabled={compartiendo} className="mt-3 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold hover:border-[#7a132b] hover:bg-rose-50 disabled:opacity-50" onClick={async () => {
          setCompartiendo(true);
          try {
            const token = apiActiva ? (await transporteApi()<{token:string}>(`/organizacion/eventos/${encodeURIComponent(eventId)}/enlace-privado`)).token : evento.claveAccesoPrivada;
            if (!token) throw new Error('El enlace no está disponible.');
            const url = new URL(`/eventos/${encodeURIComponent(eventId)}`, window.location.origin);
            if (apiActiva) url.hash = new URLSearchParams({key: token}).toString(); else url.searchParams.set('key', token);
            if (new URLSearchParams(window.location.search).get('demo') === '1') url.searchParams.set('demo', '1');
            setEnlacePrivado(url.toString());
            try { await navigator.clipboard.writeText(url.toString()); mostrarNotificacion('Enlace copiado', 'Puedes compartirlo con tus invitados.', 'exito'); }
            catch { mostrarNotificacion('Enlace disponible', 'Copia el enlace mostrado.', 'advertencia'); }
          } catch { mostrarNotificacion('Enlace no disponible', 'No fue posible obtener el enlace privado.', 'error'); }
          finally { setCompartiendo(false); }
        }}>{compartiendo ? 'Obteniendo enlace…' : 'Copiar enlace privado'}</button>}
        {apiActiva && <button type="button" disabled={compartiendo} className="ml-2 mt-3 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold hover:border-[#7a132b] hover:bg-rose-50 disabled:opacity-50" onClick={async () => {
          if (!window.confirm('¿Renovar el enlace? El enlace anterior dejará de funcionar. Los boletos confirmados se conservarán.')) return;
          setCompartiendo(true);
          setEnlacePrivado('');
          try {
            const { token } = await transporteApi()<{token:string}>(`/organizacion/eventos/${encodeURIComponent(eventId)}/enlace-privado/renovacion`, { metodo: 'POST', datos: {} });
            const url = new URL(`/eventos/${encodeURIComponent(eventId)}`, window.location.origin);
            url.hash = new URLSearchParams({key: token}).toString();
            if (new URLSearchParams(window.location.search).get('demo') === '1') url.searchParams.set('demo', '1');
            setEnlacePrivado(url.toString());
            mostrarNotificacion('Enlace renovado', 'El enlace anterior ya no funciona. Copia el nuevo enlace para compartirlo.', 'exito');
          } catch { mostrarNotificacion('No se pudo renovar', 'Consulta de nuevo el enlace antes de volver a intentarlo.', 'error'); }
          finally { setCompartiendo(false); }
        }}>Renovar enlace</button>}
        {enlacePrivado && <label className="mt-3 block text-sm font-semibold">Enlace para invitados<input readOnly value={enlacePrivado} onFocus={e=>e.currentTarget.select()} className="mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-50 p-2 text-xs font-normal" /></label>}
      </section>}
      {puedeEditarInformacion && <form id="gestion-informacion" onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const titulo = String(data.get('titulo') || '').trim();
        const descripcion = String(data.get('descripcion') || '').trim();
        const ponentes = apiActiva ? evento.ponentes : String(data.get('ponentes') || '').split('\n').map((ponente) => ponente.trim()).filter(Boolean);
        if (!titulo || !descripcion) { mostrarNotificacion('Datos incompletos', 'El título y la descripción son obligatorios; los ponentes son opcionales.', 'advertencia'); return; }
        const fechas = evento.fechas.map(dia => {
          const programa = ordenarPrograma(programasEditados[dia.id] ?? dia.programa);
          const ponentesDia = [...new Set(programa.map(actividad => actividad.ponente).filter((ponente): ponente is string => Boolean(ponente)))];
          return { ...dia, ...actividadesEditadas[dia.id], programa, ponentes: programasEditados[dia.id] !== undefined ? ponentesDia : dia.ponentes };
        });
        const errorPrograma = fechas.map(validarPrograma).find(Boolean);
        if (errorPrograma || errorBanner || cargandoBanner) { mostrarNotificacion('Revisa los cambios', errorPrograma || errorBanner || 'Espera a que termine la carga del cartel.', 'advertencia'); return; }
        const propuesta = { titulo, descripcion, ponentes, fechas, itinerarios: itinerariosEditados ?? evento.itinerarios,
          urlImagen: cartelModificado ? urlBannerPropuesto : evento.urlImagen, versionOriginal: JSON.stringify(evento) };
        if (!camposEditados(evento, propuesta).length) {
          mostrarNotificacion('Sin cambios', 'Edita la información que quieras actualizar.', 'informacion');
          return;
        }
        setPropuestaEdicion(propuesta);
      }} data-interfaz={casoDocumentado === 'CU-OR-19' ? 'UI.21' : undefined} tabIndex={-1} className="mb-8 grid scroll-mt-24 gap-3 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><h2 className="font-bold">Editar información del evento</h2></div>
        <label className="text-sm font-semibold">Título<input name="titulo" required defaultValue={evento.titulo} className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm"/></label>
        {!apiActiva && <label className="text-sm font-semibold">Ponentes (opcional, uno por línea)<textarea name="ponentes" defaultValue={evento.ponentes.join('\n')} rows={2} className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm"/></label>}
        <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea name="descripcion" required defaultValue={evento.descripcion} rows={3} className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm"/></label>
        <div className="sm:col-span-2"><EditorCartel urlImagen={cartelModificado ? urlBannerPropuesto : evento.urlImagen} nombre={nombreBanner}
          alCambiar={(url, nombre) => { setUrlBannerPropuesto(url); setCartelModificado(true); setNombreBanner(nombre); setPropuestaEdicion(null); }}
          alCambiarEstado={({ cargando, error }) => { setCargandoBanner(cargando); setErrorBanner(error); }} /></div>
        <div className="sm:col-span-2"><EditorItinerarios fechas={evento.fechas.map(f=>f.fecha)} itinerarios={itinerariosEditados??evento.itinerarios??[]} alCambiar={it=>{setItinerariosEditados(it);setPropuestaEdicion(null);}} alCambiarEstado={(fecha,estado)=>setErroresItinerario(prev=>({...prev,[fecha]:estado}))}/></div>
        {evento.fechas.map((dia, indice) => <div key={dia.id} className="space-y-3 rounded-xl bg-neutral-50 p-4 sm:col-span-2"><h3 className="text-sm font-bold">{nombreActividad(dia,indice)} · {dia.fecha} · {dia.horaInicio}–{dia.horaFin} · {obtenerNombreRecinto(dia.idRecinto)}</h3>
          {dia.nombreActividad!==undefined&&<div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Nombre de la actividad<input required className="mt-1 block w-full rounded-lg border bg-white p-2" value={actividadesEditadas[dia.id]?.nombreActividad??dia.nombreActividad} onChange={e=>{setActividadesEditadas(prev=>({...prev,[dia.id]:{nombreActividad:e.target.value,descripcionActividad:prev[dia.id]?.descripcionActividad??dia.descripcionActividad??''}}));setPropuestaEdicion(null);}}/></label><label className="text-sm">Descripción de la actividad<textarea className="mt-1 block w-full rounded-lg border bg-white p-2" value={actividadesEditadas[dia.id]?.descripcionActividad??dia.descripcionActividad??''} onChange={e=>{setActividadesEditadas(prev=>({...prev,[dia.id]:{nombreActividad:prev[dia.id]?.nombreActividad??dia.nombreActividad??'',descripcionActividad:e.target.value}}));setPropuestaEdicion(null);}}/></label></div>}
          {(dia.nombreActividad===undefined||dia.programa?.length)&&<EditorPrograma nombreDia={nombreActividad(dia,indice)} programa={programasEditados[dia.id] ?? dia.programa ?? []} alCambiar={programa => { setProgramasEditados(actual => ({ ...actual, [dia.id]: programa })); setPropuestaEdicion(null); }} />}</div>)}
        <button disabled={cargandoBanner} className="w-fit rounded-lg bg-[#7a132b] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Revisar cambios</button>
      </form>}

      <VentanaModal estaAbierto={Boolean(propuestaEdicion && puedeEditarInformacion)}
        alCerrar={() => { if (!guardando) setPropuestaEdicion(null); }} titulo="Confirmar cambios">
        {propuestaEdicion && <>
          <p className="text-sm text-neutral-700">{camposEditados(evento, propuestaEdicion).join(" · ") || "Información del evento"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" disabled={guardando} onClick={() => setPropuestaEdicion(null)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold">Seguir editando</button>
            <button type="button" disabled={guardando} aria-busy={guardando} onClick={() => guardar(confirmarEdicionEvento)}
              className="rounded-lg bg-[#7a132b] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Confirmar cambios'}
            </button>
          </div>
        </>}
      </VentanaModal>

      {(evento.historialCambios?.length || 0) > 0 && <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5"><h2 className="font-bold">Historial de modificaciones ({evento.historialCambios?.length})</h2><ol className="mt-3 space-y-3 text-sm text-neutral-600">{[...(evento.historialCambios || [])].reverse().map((cambio) => <li key={cambio.version} className="border-t pt-3"><strong>Versión {cambio.version}</strong> · {new Date(cambio.fecha).toLocaleString('es-MX')} · {cambio.responsable}<p className="mt-1">Campos: {cambio.campos.join(', ')}</p>{cambio.motivo && <p className="mt-1"><strong>Motivo:</strong> {cambio.motivo}</p>}{(cambio.detalleAnterior || cambio.detalleNuevo) && <details className="mt-1"><summary className="cursor-pointer font-semibold">Consultar valores antes y después</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><pre className="overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2">Antes: {cambio.detalleAnterior || JSON.stringify(cambio.valoresAnteriores, null, 2)}</pre><pre className="overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2">Después: {cambio.detalleNuevo || JSON.stringify(cambio.valoresNuevos, null, 2)}</pre></div></details>}{cambio.resultadoNotificacion && <p role="status" className="mt-2 rounded bg-neutral-50 p-2 text-neutral-700">Correo no enviado: no hay proveedor de correo configurado. Destinatarios previstos: {cambio.resultadoNotificacion.destinatarios.join(', ') || 'ninguno registrado'}.</p>}</li>)}</ol></section>}

      {!esPublicado && (
        <div
          className={`mb-8 p-6 rounded-2xl border text-sm shadow-xs transition-all ${
            checklist.puedePublicar
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-400">
                  Fase de Preparación Normativa
                </span>
                {checklist.puedePublicar ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-sm font-bold">
                    ✓ Listo para Publicar
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-sm font-bold">
                    {checklist.elementosPendientes.length} Requisito(s) Pendiente(s)
                  </span>
                )}
              </div>
              <h2 className="text-base font-extrabold text-neutral-900">
                {checklist.puedePublicar
                  ? 'Todo está listo: La propuesta cumple con los requisitos normativos'
                  : 'Preparación de Evento Previo a Publicación en Cartelera'}
              </h2>
              <p className="text-neutral-500 text-sm max-w-2xl">
                {checklist.puedePublicar
                  ? 'Cada día cuenta con recinto autorizado y versión final (1:1) confirmada de lugares. Puedes abrir taquilla inmediatamente.'
                  : 'Revisa que cada día tenga su recinto asignado y su arreglo de lugares formalmente confirmado.'}
              </p>
            </div>

            {/* Botón de Publicación */}
            <div>
              <button
                type="button"
                disabled={!checklist.puedePublicar || guardando} aria-busy={guardando} onClick={()=>guardar(manejarPublicar)}
                className={`px-6 py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  checklist.puedePublicar
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Publicar Evento en Cartelera</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <section id="gestion-taquilla" tabIndex={-1} aria-labelledby="titulo-gestion-taquilla" className="mb-8 scroll-mt-24">
        <h2 id="titulo-gestion-taquilla" className="mb-3 text-xl font-bold tracking-tight text-neutral-900">Taquilla y participación</h2>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7a132b]/10 text-[#7a132b] flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">Boletos especiales</h3>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${evento.id}/boletos-especiales`)}
            className="px-4 py-2.5 bg-[#7a132b] hover:bg-[#620f23] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Generar boletos especiales</span>
          </button>
        </div>

        <div className="mt-3 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">Apertura y cierre de inscripciones</h3>
              </div>
              <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
                Abre o cierra la taquilla por actividad y consulta el historial de cambios.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${evento.id}/inscripciones`)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Gestionar inscripciones</span>
          </button>
        </div>

        <div className="mt-3 bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">Panel de taquilla y participación</h3>
              </div>
              <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
                Consulta aforo, disponibilidad, reservaciones, lista de espera y participación por actividad.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${evento.id}/taquilla-participacion`)}
            className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Consultar panel</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CUERPO PRINCIPAL: DÍAS (IZQUIERDA) + CHECKLIST DETALLADO (DERECHA)   */}
      {/* ========================================================================= */}
      <div className={`grid grid-cols-1 gap-6 items-start ${esPublicado || evento.estado === "cancelado" ? "" : "xl:grid-cols-12"}`}>
        {/* Columna Izquierda: Días y Configuración de Butacas (8 COLS) */}
        <div className={`min-w-0 space-y-6 ${esPublicado || evento.estado === "cancelado" ? "" : "xl:col-span-8"}`}>
          <section id="gestion-actividades" tabIndex={-1} aria-labelledby="titulo-gestion-actividades" className="scroll-mt-24 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <div>
              <h2 id="titulo-gestion-actividades" className="text-lg font-bold text-neutral-900">
                Actividades y distribución de lugares
              </h2>

            </div>

            <div className="space-y-4 pt-1">
              {evento.fechas.map((fecha, i) => {
                const nombreRecinto = obtenerNombreRecinto(fecha.idRecinto);
                const tieneArregloConfirmado = Boolean(fecha.esFinalConfirmado);
                const disponibilidadDia = verificarDisponibilidadRecinto(fecha.idRecinto, fecha.fecha, fecha.horaInicio, fecha.horaFin, fecha.id);

                return (
                  <div
                    key={fecha.id}
                    className="min-w-0 p-4 sm:p-5 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-5 text-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-neutral-900 text-sm">
                          {nombreActividad(fecha,i)} · {fecha.fecha}
                        </span>
                        {fecha.cancelada && <span className="rounded bg-rose-100 px-2 py-0.5 text-sm font-bold text-rose-800">Día cancelado</span>}
                        {fecha.suspendida && !fecha.cancelada && <span className="rounded bg-neutral-100 px-2 py-0.5 text-sm font-bold text-neutral-700">Pendiente de reprogramación por bloqueo</span>}
                        {modalidadActividad(fecha,evento.modalidadAsistencia) !== 'controlado' ? <span className="rounded-lg bg-sky-50 px-2 py-1 text-sky-800">Sin asientos numerados</span> : tieneArregloConfirmado ? (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Distribución confirmada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-neutral-700 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Distribución pendiente</span>
                          </span>
                        )}
                      </div>
                      {!fecha.cancelada && disponibilidadDia.estadoConsulta && disponibilidadDia.estadoConsulta!=='listo' ? <p role="status" className="rounded-lg bg-neutral-100 p-3 text-neutral-600">{disponibilidadDia.motivo}<button type="button" onClick={()=>{void agendaRemota?.cargar({fecha:fecha.fecha,idActividadExcluir:fecha.id},true);}} className="ml-2 font-semibold underline">Consultar de nuevo</button></p> : !fecha.cancelada && !disponibilidadDia.disponible && <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-sm text-neutral-900"><strong>{disponibilidadDia.tipoConflicto === 'bloqueo' ? 'Día afectado por bloqueo institucional' : 'Conflicto de agenda'}</strong><p>{disponibilidadDia.motivo}</p></div>}
                      {!fecha.cancelada && (disponibilidadDia.tipoConflicto==='clase'||Boolean(disponibilidadDia.advertencias?.length)) && <p className="rounded-lg bg-neutral-50 p-3 text-neutral-700">Coincidencia con clase informativa: requiere revisión de Subdirección.</p>}

                      <div className="text-neutral-600 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1 font-semibold text-neutral-800">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          {nombreRecinto}
                        </span>
                        <span aria-hidden="true" className="text-neutral-300">·</span>
                        <span className="flex items-center gap-1 font-mono text-neutral-500">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {fecha.horaInicio} - {fecha.horaFin} hrs
                        </span>
                      </div>
                    </div>

                    {!fecha.cancelada && puedeGestionar && <details className="rounded-xl border border-neutral-200 bg-white p-3">
                      <summary className="cursor-pointer font-semibold text-neutral-800">Cambiar fecha u horario</summary>
                      <form data-interfaz={casoDocumentado !== 'CU-OR-19' ? 'UI.21' : undefined} tabIndex={-1} onSubmit={(e) => guardarCambioFecha(e, fecha.id)} className="grid min-w-0 w-full gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-neutral-600">Fecha<input name="fecha" type="date" defaultValue={fecha.fecha} className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm" /></label>
                      <label className="text-sm font-semibold text-neutral-600">Inicio<input name="horaInicio" type="time" defaultValue={fecha.horaInicio} className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm" /></label>
                      <label className="text-sm font-semibold text-neutral-600">Fin<input name="horaFin" type="time" defaultValue={fecha.horaFin} className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm" /></label>
                      <input type="hidden" name="idRecinto" value={fecha.idRecinto} />
                      <label className="text-sm font-semibold text-neutral-600 sm:col-span-2">Motivo del cambio<input name="motivoCambio" required className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm" /></label>
                      {rolActivo === 'subdireccion' && <label className="text-sm font-semibold text-neutral-600 sm:col-span-2">Justificación de excepción de anticipación (solo cambios urgentes)<input name="motivoExcepcion" className="mt-1 min-w-0 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm" /></label>}
                      <button type="submit" className="w-fit rounded-lg bg-[#7a132b] px-3 py-2 text-sm font-bold text-white">Revisar horario</button>
                      </form>
                    </details>}

                    <div className="flex flex-wrap items-center gap-2">
                    {!fecha.cancelada && puedeGestionar && <button type="button"
                      disabled={inicioEnMexico(fecha.fecha,fecha.horaInicio)<=Date.now() || listaBoletos.some(b=>b.idFechaEvento===fecha.id&&b.estado==='utilizado') || bitacoraEscaneos.some(r=>r.idFechaEvento===fecha.id&&r.resultado==='exito')}
                      onClick={() => setIdCambioRecinto(fecha.id)}
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40">Cambiar recinto</button>}
                    {modalidadActividad(fecha,evento.modalidadAsistencia) === 'controlado' && <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/organizador/eventos/${evento.id}/fechas/${fecha.id}/arreglos`
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold hover:border-[#7a132b]"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{tieneArregloConfirmado ? 'Revisar distribución de lugares' : 'Diseñar distribución de lugares'}</span>
                    </button>}
                    {!fecha.cancelada && puedeGestionar && <button type="button" onClick={() => cancelarDia(fecha.id)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-[#7a132b] underline underline-offset-4">Cancelar actividad</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            {evento.estado !== 'cancelado' && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><button type="button" onClick={imprimirConstancia} className="rounded-lg border px-3 py-2 text-sm font-bold">Imprimir constancia operativa</button>{puedeGestionar&&<button type="button" onClick={cancelarEventoCompleto} className="rounded-lg border border-[#7a132b]/40 px-3 py-2 text-sm font-semibold text-[#7a132b]">Cancelar evento</button>}</div>}
            {(evento.historialExcepcionesAnticipacion?.length || 0) > 0 && <aside className="rounded-xl bg-neutral-50 p-4 text-sm"><h3 className="font-bold text-neutral-900">Excepciones de anticipación registradas</h3>{evento.historialExcepcionesAnticipacion?.map((item, indice) => <p key={`${item.fechaAplicacion}-${indice}`} className="mt-1 text-neutral-700">{new Date(item.fechaAplicacion).toLocaleString('es-MX')} · {item.responsable}: {item.motivo}</p>)}</aside>}
          </section>
        </div>

        {!esPublicado && evento.estado !== 'cancelado' && (
          <aside className="rounded-2xl border border-neutral-200 bg-white p-5 xl:col-span-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <ShieldCheck className="h-4 w-4 text-[#7a132b]" />
              Requisitos de publicación
            </h3>
            <ul className="mt-3 divide-y divide-neutral-100 text-sm">
              {[
                { listo: checklist.solicitudAutorizada, etiqueta: 'Dictamen de Subdirección' },
                { listo: checklist.informacionGeneralCompleta, etiqueta: 'Información del evento' },
                { listo: checklist.todasLasFechasTienenRecinto, etiqueta: 'Recintos asignados' },
                { listo: checklist.todasLasFechasTienenVersionFinal, etiqueta: 'Distribución de lugares' },
              ].map(({ listo, etiqueta }) => (
                <li key={etiqueta} className="flex items-center gap-2 py-2">
                  {listo ? <CheckCircle2 aria-label="Completo" className="h-4 w-4 shrink-0 text-neutral-600" />
                    : <XCircle aria-label="Pendiente" className="h-4 w-4 shrink-0 text-[#7a132b]" />}
                  {etiqueta}
                </li>
              ))}
            </ul>
            {!!checklist.elementosPendientes?.length && (
              <ul className="mt-3 list-inside list-disc space-y-1 rounded-xl bg-neutral-50 p-3 text-sm">
                {checklist.elementosPendientes.map(item => <li key={item}>{item}</li>)}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
