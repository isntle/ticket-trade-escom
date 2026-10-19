import { inicioEnMexico } from '../dominio/solicitudes';
import React from 'react';
import { VentanaModal } from '../componentes/ui/VentanaModal';
import { EditorPrograma, ProgramaDia } from '../componentes/eventos/EditorPrograma';
import { EditorCartel } from '../componentes/eventos/EditorCartel';
import { ordenarPrograma, validarPrograma } from '../dominio/programa';
import type { ActividadPrograma, FechaEvento } from '../tipos';
import {
  ArrowLeft,
  CheckCircle,
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
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { useAutenticacion } from '../contextos/AutenticacionContexto';

interface PropuestaEdicionEvento {
  titulo: string;
  descripcion: string;
  ponentes: string[];
  urlImagen?: string;
  fechas: FechaEvento[];
  versionOriginal: string;
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
  const [propuestaEdicion, setPropuestaEdicion] = React.useState<PropuestaEdicionEvento | null>(null);
  const [urlBannerPropuesto, setUrlBannerPropuesto] = React.useState<string | undefined>();
  const [errorBanner, setErrorBanner] = React.useState('');
  const [nombreBanner, setNombreBanner] = React.useState('');
  const [cargandoBanner, setCargandoBanner] = React.useState(false);
  const [cartelModificado, setCartelModificado] = React.useState(false);
  const [programasEditados, setProgramasEditados] = React.useState<Record<string, ActividadPrograma[]>>({});
  const [motivoEdicion, setMotivoEdicion] = React.useState('');
  const [cancelacion, setCancelacion] = React.useState<{idFecha?:string; retirar:boolean; version:string} | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = React.useState('');

  const evento = listaEventos.find((e) => e.id === eventId);
  const checklist = obtenerListaDeVerificacion(eventId);

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

  const puedeGestionar = evento.idOrganizador === usuarioActual?.id || rolActivo === 'subdireccion';

  const confirmarEdicionEvento = () => {
    if (!evento || !propuestaEdicion || !usuarioActual) return;
    if (JSON.stringify(evento) !== propuestaEdicion.versionOriginal) {
      mostrarNotificacion('El evento cambió', 'Vuelve a revisar los cambios antes de confirmar para no sobrescribir otra modificación.', 'advertencia');
      setPropuestaEdicion(null);
      return;
    }
    if (!puedeGestionar || evento.fechas.some((dia) => inicioEnMexico(dia.fecha, dia.horaInicio) <= Date.now()) || bitacoraEscaneos.some((registro) => registro.idEvento === evento.id && registro.resultado === 'exito')) { mostrarNotificacion('Edición no disponible', 'El evento ya comenzó o tiene entradas registradas.', 'advertencia'); return; }
    const errorPrograma = propuestaEdicion.fechas.map(validarPrograma).find(Boolean);
    if (errorPrograma || errorBanner || cargandoBanner) {
      mostrarNotificacion('Revisa los cambios', errorPrograma || errorBanner || 'Espera a que termine la carga del cartel.', 'advertencia');
      return;
    }
    const motivo = motivoEdicion.trim();
    if (!motivo) {
      mostrarNotificacion('Indica el motivo', 'Es necesario registrar un motivo para conservar la trazabilidad.', 'advertencia');
      return;
    }
    const anterior = { titulo: evento.titulo, descripcion: evento.descripcion, ponentes: [...evento.ponentes], urlImagen: evento.urlImagen };
    const campos = [
      anterior.titulo !== propuestaEdicion.titulo && 'título',
      anterior.descripcion !== propuestaEdicion.descripcion && 'descripción',
      JSON.stringify(anterior.ponentes) !== JSON.stringify(propuestaEdicion.ponentes) && 'ponentes',
      propuestaEdicion.urlImagen !== anterior.urlImagen && 'banner',
      JSON.stringify(evento.fechas.map(dia => dia.programa || [])) !== JSON.stringify(propuestaEdicion.fechas.map(dia => dia.programa || [])) && 'programa por día'
    ].filter((campo): campo is string => Boolean(campo));
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
      motivo: motivo.trim(),
      campos,
      valoresAnteriores: anterior,
      valoresNuevos,
      detalleAnterior: JSON.stringify({ ...anterior, programas: evento.fechas.map(dia => ({ id: dia.id, programa: dia.programa })) }, null, 2),
      detalleNuevo: JSON.stringify({ ...valoresNuevos, programas: propuestaEdicion.fechas.map(dia => ({ id: dia.id, programa: dia.programa })) }, null, 2),
    }];
    const resultado = actualizarEvento(evento.id, { ...valoresNuevos, fechas: propuestaEdicion.fechas, historialCambios }, propuestaEdicion.versionOriginal);
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
    setMotivoEdicion('');
  };

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : 'Recinto no asignado';
  };

  const manejarPublicar = () => {
    const res = publicarEvento(evento.id);
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
    ventana.document.write(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Constancia operativa · ${escapar(evento.titulo)}</title><style>body{font:14px Arial,sans-serif;margin:48px;color:#222}h1{font-size:24px}p{line-height:1.5}.folio{font-family:monospace;color:#555}table{border-collapse:collapse;width:100%;margin-top:24px}td,th{border:1px solid #bbb;padding:10px;text-align:left}th{background:#f3f3f3}.nota{margin-top:32px;color:#666;font-size:11px}@media print{body{margin:20mm}}</style><h1>Constancia operativa del evento</h1><p class="folio">Folio local: ${escapar(evento.id)} · Estado: ${escapar(evento.estado)}</p><h2>${escapar(evento.titulo)}</h2><p>${escapar(evento.descripcion)}</p><p>Organiza: ${escapar(evento.nombreOrganizador)} · Modalidad: ${escapar(evento.modalidadAsistencia)}</p><table><thead><tr><th>Día</th><th>Fecha</th><th>Horario</th><th>Recinto</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table><p class="nota">Documento de consulta generado desde los datos locales de Ticket Trade.</p></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  };

  const esPublicado = evento.estado === 'publicado';
  const puedeEditarInformacion = puedeGestionar && ['configuracion', 'borrador', 'publicado'].includes(evento.estado) && evento.fechas.every((dia) => inicioEnMexico(dia.fecha, dia.horaInicio) > Date.now()) && !bitacoraEscaneos.some((registro) => registro.idEvento === evento.id && registro.resultado === 'exito');
  const guardarCambioFecha = (e: React.FormEvent<HTMLFormElement>, idFecha: string) => {
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
    const errorPrograma = validarPrograma({ ...fechaActual, horaInicio, horaFin });
    if (errorPrograma) { mostrarNotificacion('Revisa el programa del día', errorPrograma, 'advertencia'); return; }
    if (inicioEnMexico(fecha,horaInicio) <= Date.now()) {
      mostrarNotificacion('Fecha no válida', 'No se puede reprogramar a una fecha pasada.', 'error'); return;
    }
    const recinto = listaRecintos.find((item) => item.id === idRecinto);
    const arregloExistente = listaArreglos.find((arreglo) => arreglo.idFechaEvento === idFecha && arreglo.estado === 'version_final');
    if (!recinto || (evento.aforoMaximo || 0) > recinto.capacidad || (arregloExistente && arregloExistente.totalAsientos > recinto.capacidad)) {
      mostrarNotificacion('Capacidad incompatible', 'El recinto elegido no tiene capacidad suficiente para el aforo del evento.', 'error'); return;
    }
    const disponibilidad = verificarDisponibilidadRecinto(idRecinto, fecha, horaInicio, horaFin, idFecha);
    if (!disponibilidad.disponible) {
      mostrarNotificacion('Conflicto de agenda', disponibilidad.motivo || 'El recinto no está disponible.', 'error'); return;
    }
    const compromisosReservados = listaReservaciones.some((reserva) => reserva.idEvento === evento.id && reserva.idFechaEvento === idFecha && (reserva.estado === 'confirmada' || (reserva.estado === 'apartado_temporal' && (reserva.tiempoExpiracionApartado||0)>Date.now()))) || listaBoletos.some(b=>b.idFechaEvento===idFecha&&b.estado!=='cancelado');
    if (idRecinto !== fechaActual.idRecinto && compromisosReservados) {
      mostrarNotificacion('No se puede cambiar el recinto todavía', 'Hay lugares confirmados asociados a la distribución actual. Primero deben resolverse esos compromisos para evitar cambiar los asientos de los boletos.', 'error'); return;
    }
    const motivoCambio = String(datos.get('motivoCambio') || '').trim();
    if (!motivoCambio?.trim()) { mostrarNotificacion('Cambio cancelado', 'Se requiere un motivo para registrar la modificación.', 'advertencia'); return; }
    const fechaNueva = { ...fechaActual, fecha, horaInicio, horaFin, idRecinto, suspendida:false, idBloqueoSuspension:undefined, ...(idRecinto!==fechaActual.idRecinto?{idArregloFinal:undefined,esFinalConfirmado:false}:{}) };
    const registrarCambioFecha = (historialExcepcionesAnticipacion = evento.historialExcepcionesAnticipacion) => {
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
    const horasAnticipacion = (new Date(`${fecha}T${horaInicio}:00`).getTime() - Date.now()) / 3600000;
    if (fecha !== fechaActual.fecha && horasAnticipacion < 168) {
      if (rolActivo !== 'subdireccion') {
        mostrarNotificacion('Requiere autorización', 'Los cambios con menos de 168 horas deben ser aplicados por Subdirección con una excepción motivada.', 'advertencia'); return;
      }
      const motivo = String(datos.get('motivoExcepcion') || '').trim();
      if (!motivo?.trim()) { mostrarNotificacion('Excepción cancelada', 'Se requiere una justificación para aplicar el cambio urgente.', 'advertencia'); return; }
      const resultado = registrarCambioFecha([...(evento.historialExcepcionesAnticipacion || []), { idFechaEvento: idFecha, fechaAplicacion: new Date().toISOString(), motivo: motivo.trim(), responsable: usuarioActual?.nombre || 'Subdirección' }]);
      if (!resultado.exito) { mostrarNotificacion('No se pudo reprogramar', resultado.error || 'Revisa los datos e inténtalo nuevamente.', 'error'); return; }
      mostrarNotificacion('Excepción aplicada', 'La justificación quedó registrada en la bitácora del evento.', 'informacion');
      return;
    }
    const resultado = registrarCambioFecha();
    if (!resultado.exito) { mostrarNotificacion('No se pudo reprogramar', resultado.error || 'Revisa los datos e inténtalo nuevamente.', 'error'); return; }
    mostrarNotificacion('Programación actualizada', `Cambio registrado como versión ${(evento.historialCambios?.length || 0) + 1}.`, 'exito');
  };

  const confirmarCancelacion = (idFecha?:string, retirar=false) => {
    setMotivoCancelacion('');
    setCancelacion({idFecha, retirar, version:JSON.stringify(evento)});
  };
  const ejecutarCancelacion = () => {
    if (!cancelacion || !motivoCancelacion.trim()) return;
    const resultado = cancelarUnidadEvento(evento.id, cancelacion.idFecha, motivoCancelacion, cancelacion.retirar, cancelacion.version);
    mostrarNotificacion(resultado.exito ? 'Operación registrada' : 'Operación no realizada', resultado.exito ? 'Los cambios quedaron guardados conjuntamente. El correo real no está configurado.' : resultado.error || '', resultado.exito ? 'exito' : 'error');
    if (resultado.exito) setCancelacion(null);
  };
  const retirarDia=(id:string)=>confirmarCancelacion(id,true);
  const cancelarDia=(id:string)=>confirmarCancelacion(id);
  const cancelarEventoCompleto=()=>confirmarCancelacion();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <VentanaModal estaAbierto={Boolean(cancelacion)} alCerrar={() => setCancelacion(null)} titulo={cancelacion?.retirar ? 'Retirar día' : 'Confirmar cancelación'}>
        <form onSubmit={e => {e.preventDefault(); ejecutarCancelacion();}} className="space-y-4">
          <p>Se conservará el historial. Al cancelar, se invalidarán los boletos y compromisos del día o evento seleccionado.</p>
          <label className="block text-sm font-semibold">Motivo de la operación<textarea required value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
          <div className="flex gap-3"><button type="button" onClick={() => setCancelacion(null)} className="rounded-lg border px-4 py-2">Volver</button><button type="submit" className="rounded-lg bg-rose-700 px-4 py-2 text-white">Confirmar operación</button></div>
        </form>
      </VentanaModal>
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate('/organizador')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Mis Eventos</span>
      </button>

      {/* Cabecera del Evento */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-sm">
            <span className="font-mono text-neutral-400 font-bold uppercase">ID: {evento.id}</span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <InsigniaEstado estado={evento.estado} />
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span className="font-semibold text-neutral-700 capitalize">
              Modalidad: {evento.modalidadAsistencia}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            {evento.titulo}
          </h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-2xl line-clamp-2">
            {evento.descripcion}
          </p>
          {evento.urlImagen && <img src={evento.urlImagen} alt="Cartel del evento aprobado" className="mt-5 max-h-80 w-full rounded-2xl bg-neutral-100 object-contain" />}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/eventos/${evento.id}`)}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-500" />
            <span>Ver Cartelera Pública</span>
          </button>
        </div>
      </div>

      {puedeEditarInformacion && <form onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const titulo = String(data.get('titulo') || '').trim();
        const descripcion = String(data.get('descripcion') || '').trim();
        const ponentes = String(data.get('ponentes') || '').split('\n').map((ponente) => ponente.trim()).filter(Boolean);
        if (!titulo || !descripcion) { mostrarNotificacion('Datos incompletos', 'El título y la descripción son obligatorios; los ponentes son opcionales.', 'advertencia'); return; }
        const fechas = evento.fechas.map(dia => {
          const programa = ordenarPrograma(programasEditados[dia.id] ?? dia.programa);
          const ponentesDia = [...new Set(programa.map(actividad => actividad.ponente).filter((ponente): ponente is string => Boolean(ponente)))];
          return { ...dia, programa, ponentes: programasEditados[dia.id] !== undefined ? ponentesDia : dia.ponentes };
        });
        const errorPrograma = fechas.map(validarPrograma).find(Boolean);
        if (errorPrograma || errorBanner || cargandoBanner) { mostrarNotificacion('Revisa los cambios', errorPrograma || errorBanner || 'Espera a que termine la carga del cartel.', 'advertencia'); return; }
        setMotivoEdicion('');
        setPropuestaEdicion({ titulo, descripcion, ponentes, fechas, urlImagen: cartelModificado ? urlBannerPropuesto : evento.urlImagen, versionOriginal: JSON.stringify(evento) });
      }} className="mb-8 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><h2 className="font-bold">Editar información del evento aprobado</h2><p className="text-sm text-neutral-500">Revisa título, descripción, cartel y actividades por día. Las fechas, recintos, horarios generales y compromisos vigentes se conservan.</p></div>
        <label className="text-sm font-semibold">Título<input name="titulo" required defaultValue={evento.titulo} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
        <label className="text-sm font-semibold">Ponentes (opcional, uno por línea)<textarea name="ponentes" defaultValue={evento.ponentes.join('\n')} rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
        <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea name="descripcion" required defaultValue={evento.descripcion} rows={3} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
        <div className="sm:col-span-2"><EditorCartel urlImagen={cartelModificado ? urlBannerPropuesto : evento.urlImagen} nombre={nombreBanner}
          alCambiar={(url, nombre) => { setUrlBannerPropuesto(url); setCartelModificado(true); setNombreBanner(nombre); setPropuestaEdicion(null); }}
          alCambiarEstado={({ cargando, error }) => { setCargandoBanner(cargando); setErrorBanner(error); }} /></div>
        {evento.fechas.map((dia, indice) => <div key={dia.id} className="sm:col-span-2"><h3 className="mb-2 text-sm font-bold">{dia.nombreDia || `Día ${indice + 1}`} · {dia.fecha} · {dia.horaInicio}–{dia.horaFin} · {obtenerNombreRecinto(dia.idRecinto)}</h3>
          <EditorPrograma nombreDia={dia.nombreDia || `Día ${indice + 1}`} programa={programasEditados[dia.id] ?? dia.programa ?? []} alCambiar={programa => { setProgramasEditados(actual => ({ ...actual, [dia.id]: programa })); setPropuestaEdicion(null); }} /></div>)}
        <button disabled={cargandoBanner} className="w-fit rounded-lg bg-[#7a132b] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Revisar cambios</button>
      </form>}

      {propuestaEdicion && puedeEditarInformacion && <section role="dialog" aria-modal="true" aria-labelledby="confirmar-cambios-evento" className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 id="confirmar-cambios-evento" className="font-bold">Confirmar modificación del evento</h2>
        <p className="mt-1 text-sm text-neutral-700">Revisa la información propuesta. Al confirmar se guardará una nueva versión en el historial.</p>
        <label className="mt-4 block text-sm font-semibold">Motivo de la modificación *<textarea aria-label="Motivo de la modificación" value={motivoEdicion} onChange={e => setMotivoEdicion(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-white p-2" /></label>
        {propuestaEdicion.fechas.map((dia, indice) => <div key={dia.id} className="mt-3"><h3 className="text-sm font-bold">Programa propuesto · {dia.nombreDia || `Día ${indice + 1}`}</h3><ProgramaDia programa={dia.programa} />{!dia.programa?.length && <p className="text-sm">Sin actividades registradas.</p>}</div>)}
        {!propuestaEdicion.urlImagen && evento.urlImagen && <p className="mt-3 text-sm">Se quitará el cartel actual.</p>}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Título</dt><dd>{evento.titulo} → {propuestaEdicion.titulo}</dd></div><div><dt className="font-semibold">Ponentes</dt><dd>{evento.ponentes.join(', ')} → {propuestaEdicion.ponentes.join(', ')}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Descripción</dt><dd>{evento.descripcion} → {propuestaEdicion.descripcion}</dd></div>{propuestaEdicion.urlImagen && <div className="sm:col-span-2"><dt className="font-semibold">Banner</dt><dd className="mt-2 grid grid-cols-2 gap-3">{evento.urlImagen && <img src={evento.urlImagen} alt="Banner actual" className="max-h-36 w-full rounded-lg object-cover"/>}<img src={propuestaEdicion.urlImagen} alt="Banner propuesto" className="max-h-36 w-full rounded-lg object-cover"/></dd></div>}</dl>
        <div className="mt-4 flex gap-2"><button type="button" onClick={confirmarEdicionEvento} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Confirmar cambios</button><button type="button" onClick={() => { setPropuestaEdicion(null); setNombreBanner(''); setUrlBannerPropuesto(undefined); setCartelModificado(false); setProgramasEditados({}); }} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancelar</button></div>
      </section>}

      {(evento.historialCambios?.length || 0) > 0 && <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5"><h2 className="font-bold">Historial de modificaciones ({evento.historialCambios?.length})</h2><ol className="mt-3 space-y-3 text-sm text-neutral-600">{[...(evento.historialCambios || [])].reverse().map((cambio) => <li key={cambio.version} className="border-t pt-3"><strong>Versión {cambio.version}</strong> · {new Date(cambio.fecha).toLocaleString('es-MX')} · {cambio.responsable}<p className="mt-1">Campos: {cambio.campos.join(', ')}</p>{cambio.motivo && <p className="mt-1"><strong>Motivo:</strong> {cambio.motivo}</p>}{(cambio.detalleAnterior || cambio.detalleNuevo) && <details className="mt-1"><summary className="cursor-pointer font-semibold">Consultar valores antes y después</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><pre className="overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2">Antes: {cambio.detalleAnterior || JSON.stringify(cambio.valoresAnteriores, null, 2)}</pre><pre className="overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2">Después: {cambio.detalleNuevo || JSON.stringify(cambio.valoresNuevos, null, 2)}</pre></div></details>}{cambio.resultadoNotificacion && <p role="status" className="mt-2 rounded bg-amber-50 p-2 text-amber-900">Correo no enviado: no hay proveedor de correo configurado. Destinatarios previstos: {cambio.resultadoNotificacion.destinatarios.join(', ') || 'ninguno registrado'}.</p>}</li>)}</ol></section>}

      {/* ========================================================================= */}
      {/* BANNER HERO: ESTADO DE PREPARACIÓN PARA PUBLICAR                          */}
      {/* ========================================================================= */}
      {esPublicado ? (
        <div className="mb-8 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-emerald-900">
                Evento Publicado Oficialmente en Cartelera
              </h3>
              <p className="text-emerald-800 text-sm mt-0.5">
                La taquilla digital está habilitada. Los alumnos y la comunidad politécnica pueden registrar su asistencia y reservar butacas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/eventos/${evento.id}`)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
          >
            Ver Evento en Cartelera →
          </button>
        </div>
      ) : (
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
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-sm font-bold">
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
                disabled={!checklist.puedePublicar}
                onClick={manejarPublicar}
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

      {/* Operaciones del Motor de Taquilla */}
      <section className="mb-8">
        <div className="mb-3">
          <span className="text-sm font-bold text-[#7a132b] uppercase tracking-wider">
            Subsistema 03 · Motor de Taquilla
          </span>
          <h2 className="text-base font-extrabold text-neutral-900 mt-0.5">
            Operación de boletaje del evento
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7a132b]/10 text-[#7a132b] flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">Boletos especiales</h3>
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  CU-MT-07
                </span>
              </div>
              <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
                Genera e invalida acreditaciones QR para Comité Organizador, Staff de apoyo e invitados VIP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${evento.id}/boletos-especiales`)}
            className="px-4 py-2.5 bg-[#7a132b] hover:bg-[#620f23] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Gestionar boletos</span>
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
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  CU-MT-08
                </span>
              </div>
              <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
                Abre o cierra la taquilla por día y consulta el historial de cambios.
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
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  CU-MT-09
                </span>
              </div>
              <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
                Consulta aforo, disponibilidad, reservaciones, lista de espera y participación por día.
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Días y Configuración de Butacas (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Días Programados y Arreglos de Lugares (1:1)
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Para eventos con acceso controlado, cada fecha debe tener su distribución de butacas o estaciones confirmada.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {evento.fechas.map((fecha, i) => {
                const nombreRecinto = obtenerNombreRecinto(fecha.idRecinto);
                const tieneArregloConfirmado = Boolean(fecha.esFinalConfirmado);
                const disponibilidadDia = verificarDisponibilidadRecinto(fecha.idRecinto, fecha.fecha, fecha.horaInicio, fecha.horaFin, fecha.id);

                return (
                  <div
                    key={fecha.id}
                    className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 text-sm">
                          Día {i + 1}: {fecha.fecha}
                        </span>
                        {fecha.cancelada && <span className="rounded bg-rose-100 px-2 py-0.5 text-sm font-bold text-rose-800">Día cancelado</span>}
                        {fecha.suspendida && !fecha.cancelada && <span className="rounded bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-900">Pendiente de reprogramación por bloqueo</span>}
                        {tieneArregloConfirmado ? (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Versión Oficial Lista</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Arreglo Pendiente</span>
                          </span>
                        )}
                      </div>
                      {!fecha.cancelada && !disponibilidadDia.disponible && <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950"><strong>{disponibilidadDia.tipoConflicto === 'bloqueo' ? 'Día afectado por bloqueo institucional' : 'Conflicto de agenda'}</strong><p>{disponibilidadDia.motivo}</p><span>Resuelve el conflicto reprogramando el día o cancelándolo de forma segura.</span></div>}

                      <div className="text-neutral-600 flex items-center gap-3">
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

                    {!fecha.cancelada && puedeGestionar && <form onSubmit={(e) => guardarCambioFecha(e, fecha.id)} className="grid w-full gap-2 border-t border-neutral-200 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-sm font-semibold text-neutral-600">Fecha<input name="fecha" type="date" defaultValue={fecha.fecha} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" /></label>
                      <label className="text-sm font-semibold text-neutral-600">Inicio<input name="horaInicio" type="time" defaultValue={fecha.horaInicio} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" /></label>
                      <label className="text-sm font-semibold text-neutral-600">Fin<input name="horaFin" type="time" defaultValue={fecha.horaFin} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" /></label>
                      <label className="text-sm font-semibold text-neutral-600">Recinto<select name="idRecinto" defaultValue={fecha.idRecinto} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm">{listaRecintos.filter((r) => r.activo !== false).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>
                      <label className="text-sm font-semibold text-neutral-600 sm:col-span-2">Motivo del cambio<input name="motivoCambio" required className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
                      {rolActivo === 'subdireccion' && <label className="text-sm font-semibold text-neutral-600 sm:col-span-2">Justificación de excepción de anticipación (solo cambios urgentes)<input name="motivoExcepcion" className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>}
                      <button type="submit" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white">Guardar fecha, horario o recinto</button>
                      {puedeGestionar && <button type="button" onClick={() => retirarDia(fecha.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Retirar día sin compromisos</button>}
                      {puedeGestionar && !fecha.cancelada && <button type="button" onClick={() => cancelarDia(fecha.id)} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700">Cancelar este día</button>}
                    </form>}

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/organizador/eventos/${evento.id}/fechas/${fecha.id}/arreglos`
                        )
                      }
                      className="px-4 py-2.5 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{tieneArregloConfirmado ? 'Revisar / Modificar Butacas' : 'Diseñar Butacas'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            {evento.estado !== 'cancelado' && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><button type="button" onClick={imprimirConstancia} className="rounded-lg border px-3 py-2 text-sm font-bold">Imprimir constancia operativa</button>{puedeGestionar&&<button type="button" onClick={cancelarEventoCompleto} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-bold text-white">Cancelar evento aprobado</button>}</div>}
            {(evento.historialExcepcionesAnticipacion?.length || 0) > 0 && <aside className="rounded-xl bg-amber-50 p-4 text-sm"><h3 className="font-bold text-amber-950">Excepciones de anticipación registradas</h3>{evento.historialExcepcionesAnticipacion?.map((item, indice) => <p key={`${item.fechaAplicacion}-${indice}`} className="mt-1 text-amber-900">{new Date(item.fechaAplicacion).toLocaleString('es-MX')} · {item.responsable}: {item.motivo}</p>)}</aside>}
          </div>
        </div>

        {/* Columna Derecha: Checklist Detallado de Publicación (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4 text-sm">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7a132b]" />
              <span>Lista de Verificación (Checklist)</span>
            </h3>

            <div className="space-y-3 divide-y divide-neutral-100">
              {/* 1. Dictamen Subdirección */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.solicitudAutorizada ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Dictamen de Subdirección</div>
                  <div className="text-neutral-500 text-sm">
                    {checklist.solicitudAutorizada ? 'Autorizado formalmente' : 'Pendiente de dictamen'}
                  </div>
                </div>
              </div>

              {/* 2. Información General */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.informacionGeneralCompleta ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Información General Completa</div>
                  <div className="text-neutral-500 text-sm">
                    {checklist.informacionGeneralCompleta ? 'Título, descripción y ponentes registrados' : 'Faltan datos informativos'}
                  </div>
                </div>
              </div>

              {/* 3. Fechas y Recintos */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.todasLasFechasTienenRecinto ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Asignación de Recintos</div>
                  <div className="text-neutral-500 text-sm">
                    {checklist.todasLasFechasTienenRecinto ? 'Todos los días cuentan con espacio físico' : 'Días sin recinto asignado'}
                  </div>
                </div>
              </div>

              {/* 4. Arreglos Confirmados (1:1) */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.todasLasFechasTienenVersionFinal ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Distribución de Asientos (1:1)</div>
                  <div className="text-neutral-500 text-sm">
                    {checklist.todasLasFechasTienenVersionFinal
                      ? 'Versión oficial confirmada en cada día'
                      : 'Faltan fechas por confirmar su distribución'}
                  </div>
                </div>
              </div>
            </div>

            {/* Elementos Pendientes si existen */}
            {checklist.elementosPendientes && checklist.elementosPendientes.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-sm space-y-1">
                <span className="font-bold block text-amber-900">Pendiente para Publicar:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {checklist.elementosPendientes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
