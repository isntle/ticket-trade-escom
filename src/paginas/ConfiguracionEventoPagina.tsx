import React from 'react';
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

interface PropiedadesConfiguracionEvento {
  eventId: string;
  navigate: (ruta: string) => void;
}

export const ConfiguracionEventoPagina: React.FC<PropiedadesConfiguracionEvento> = ({
  eventId,
  navigate
}) => {
  const { listaEventos, listaRecintos, listaArreglos, listaReservaciones, bitacoraEscaneos, obtenerListaDeVerificacion, publicarEvento, actualizarEvento, eliminarFechaEvento, verificarDisponibilidadRecinto, cancelarReservacionPorEvento } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();
  const { usuarioActual, rolActivo } = useAutenticacion();

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

  const puedeGestionar = evento.idOrganizador === usuarioActual?.id || rolActivo === 'subdireccion' || rolActivo === 'admin';

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
    const ventana = window.open('', '_blank', 'noopener,noreferrer');
    if (!ventana) { mostrarNotificacion('Ventana bloqueada', 'Permite ventanas emergentes para imprimir la constancia operativa.', 'advertencia'); return; }
    const filas = evento.fechas.map((dia, indice) => `<tr><td>Día ${indice + 1}</td><td>${escapar(dia.fecha)}</td><td>${escapar(dia.horaInicio)}–${escapar(dia.horaFin)}</td><td>${escapar(obtenerNombreRecinto(dia.idRecinto))}</td><td>${dia.cancelada ? 'Cancelado' : 'Programado'}</td></tr>`).join('');
    ventana.document.write(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Constancia operativa · ${escapar(evento.titulo)}</title><style>body{font:14px Arial,sans-serif;margin:48px;color:#222}h1{font-size:24px}p{line-height:1.5}.folio{font-family:monospace;color:#555}table{border-collapse:collapse;width:100%;margin-top:24px}td,th{border:1px solid #bbb;padding:10px;text-align:left}th{background:#f3f3f3}.nota{margin-top:32px;color:#666;font-size:11px}@media print{body{margin:20mm}}</style><h1>Constancia operativa del evento</h1><p class="folio">Folio local: ${escapar(evento.id)} · Estado: ${escapar(evento.estado)}</p><h2>${escapar(evento.titulo)}</h2><p>${escapar(evento.descripcion)}</p><p>Organiza: ${escapar(evento.nombreOrganizador)} · Modalidad: ${escapar(evento.modalidadAsistencia)}</p><table><thead><tr><th>Día</th><th>Fecha</th><th>Horario</th><th>Recinto</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table><p class="nota">Documento de consulta generado desde los datos locales de Ticket Trade.</p></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  };

  const esPublicado = evento.estado === 'publicado';
  const guardarCambioFecha = (e: React.FormEvent<HTMLFormElement>, idFecha: string) => {
    e.preventDefault();
    if (!puedeGestionar) { mostrarNotificacion('Sin autorización', 'Solo el organizador responsable o Subdirección pueden modificar este evento.', 'error'); return; }
    const datos = new FormData(e.currentTarget);
    const fecha = String(datos.get('fecha') || '');
    const horaInicio = String(datos.get('horaInicio') || '');
    const horaFin = String(datos.get('horaFin') || '');
    const idRecinto = String(datos.get('idRecinto') || '');
    const fechaActual = evento.fechas.find((dia) => dia.id === idFecha);
    if (!fechaActual || !fecha || !horaInicio || !horaFin || horaFin <= horaInicio) {
      mostrarNotificacion('Revisa la programación', 'La fecha y el horario deben ser válidos.', 'advertencia'); return;
    }
    if (fecha < new Date().toISOString().slice(0, 10)) {
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
    const compromisosReservados = listaReservaciones.some((reserva) => reserva.idEvento === evento.id && reserva.idFechaEvento === idFecha && reserva.estado === 'confirmada');
    if (idRecinto !== fechaActual.idRecinto && compromisosReservados) {
      mostrarNotificacion('No se puede cambiar el recinto todavía', 'Hay lugares confirmados asociados a la distribución actual. Primero deben resolverse esos compromisos para evitar cambiar los asientos de los boletos.', 'error'); return;
    }
    const horasAnticipacion = (new Date(`${fecha}T${horaInicio}:00`).getTime() - Date.now()) / 3600000;
    if (horasAnticipacion < 168) {
      if (rolActivo !== 'subdireccion' && rolActivo !== 'admin') {
        mostrarNotificacion('Requiere autorización', 'Los cambios con menos de 168 horas deben ser aplicados por Subdirección con una excepción motivada.', 'advertencia'); return;
      }
      const motivo = window.prompt('Justificación obligatoria de la excepción de anticipación:');
      if (!motivo?.trim()) { mostrarNotificacion('Excepción cancelada', 'Se requiere una justificación para aplicar el cambio urgente.', 'advertencia'); return; }
      actualizarEvento(evento.id, {
        fechas: evento.fechas.map((dia) => dia.id === idFecha ? { ...dia, fecha, horaInicio, horaFin, idRecinto } : dia),
        historialExcepcionesAnticipacion: [...(evento.historialExcepcionesAnticipacion || []), { idFechaEvento: idFecha, fechaAplicacion: new Date().toISOString(), motivo: motivo.trim(), responsable: usuarioActual?.nombre || 'Subdirección' }]
      });
      mostrarNotificacion('Excepción aplicada', 'La justificación quedó registrada en la bitácora del evento.', 'informacion');
      return;
    }
    actualizarEvento(evento.id, { fechas: evento.fechas.map((dia) => dia.id === idFecha ? { ...dia, fecha, horaInicio, horaFin, idRecinto } : dia) });
    mostrarNotificacion('Programación actualizada', 'Se guardaron los cambios después de validar el recinto y el horario.', 'exito');
  };

  const retirarDia = (idFecha: string) => {
    if (!puedeGestionar) return;
    const boletosDelDia = listaReservaciones.filter((reserva) => reserva.idEvento === evento.id && reserva.idFechaEvento === idFecha && reserva.estado === 'confirmada');
    const tieneAccesos = bitacoraEscaneos.some((registro) => registro.idEvento === evento.id && registro.idFechaEvento === idFecha && registro.resultado === 'exito');
    if (boletosDelDia.length || tieneAccesos) {
      mostrarNotificacion('El día tiene compromisos', 'No se puede retirar: existen reservaciones confirmadas o accesos registrados.', 'error'); return;
    }
    listaReservaciones.filter((reserva) => reserva.idEvento === evento.id && reserva.idFechaEvento === idFecha && reserva.estado !== 'cancelada').forEach((reserva) => cancelarReservacionPorEvento(reserva.id, usuarioActual?.id || '', rolActivo, 'Retiro del día por la persona organizadora.'));
    eliminarFechaEvento(evento.id, idFecha);
    mostrarNotificacion('Día retirado', 'Se retiró el día sin compromisos y se conservó el historial de reservaciones canceladas.', 'exito');
  };

  const cancelarEventoCompleto = () => {
    if (!puedeGestionar) return;
    const tieneAccesos = bitacoraEscaneos.some((registro) => registro.idEvento === evento.id && registro.resultado === 'exito');
    if (tieneAccesos) { mostrarNotificacion('No se puede cancelar', 'El evento ya tiene check-ins registrados; requiere atención institucional.', 'error'); return; }
    if (!window.confirm('¿Cancelar el evento? Se cancelarán sus reservaciones y boletos vigentes.')) return;
    listaReservaciones.filter((reserva) => reserva.idEvento === evento.id && reserva.estado !== 'cancelada').forEach((reserva) => cancelarReservacionPorEvento(reserva.id, usuarioActual?.id || '', rolActivo, 'Cancelación del evento por la persona responsable.'));
    actualizarEvento(evento.id, { estado: 'cancelado' });
    mostrarNotificacion('Evento cancelado', 'Se cancelaron las reservaciones activas y se conservó el evento en el sistema.', 'exito');
  };

  const cancelarDia = (idFecha: string) => {
    if (!puedeGestionar) return;
    const tieneAccesos = bitacoraEscaneos.some((registro) => registro.idEvento === evento.id && registro.idFechaEvento === idFecha && registro.resultado === 'exito');
    if (tieneAccesos) { mostrarNotificacion('No se puede cancelar el día', 'Ya existen accesos registrados para este día.', 'error'); return; }
    if (!window.confirm('¿Cancelar este día? Sus boletos y reservaciones activas también se cancelarán.')) return;
    listaReservaciones.filter((reserva) => reserva.idEvento === evento.id && reserva.idFechaEvento === idFecha && reserva.estado !== 'cancelada').forEach((reserva) => cancelarReservacionPorEvento(reserva.id, usuarioActual?.id || '', rolActivo, 'Cancelación del día por la persona responsable.'));
    actualizarEvento(evento.id, { fechas: evento.fechas.map((dia) => dia.id === idFecha ? { ...dia, cancelada: true } : dia) });
    mostrarNotificacion('Día cancelado', 'Se conservaron los demás días y se cancelaron las reservaciones vinculadas.', 'exito');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate('/organizador')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Mis Eventos</span>
      </button>

      {/* Cabecera del Evento */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
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
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl line-clamp-2">
            {evento.descripcion}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/eventos/${evento.id}`)}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-500" />
            <span>Ver Cartelera Pública</span>
          </button>
        </div>
      </div>

      {evento.estado === 'publicado' && puedeGestionar && <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const titulo = String(data.get('titulo') || '').trim(); const descripcion = String(data.get('descripcion') || '').trim(); if (!titulo || !descripcion) { mostrarNotificacion('Datos incompletos', 'El título y la descripción no pueden quedar vacíos.', 'advertencia'); return; } actualizarEvento(evento.id, { titulo, descripcion }); mostrarNotificacion('Información actualizada', 'Se guardaron los cambios del evento aprobado.', 'exito'); }} className="mb-8 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><h2 className="font-bold">Información del evento aprobado</h2><p className="text-xs text-neutral-500">Actualiza los datos generales sin modificar sus días ni compromisos.</p></div>
        <label className="text-xs font-semibold">Título<input name="titulo" required defaultValue={evento.titulo} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="text-xs font-semibold sm:col-span-2">Descripción<textarea name="descripcion" required defaultValue={evento.descripcion} rows={3} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><button className="w-fit rounded-lg bg-[#7a132b] px-4 py-2 text-xs font-bold text-white">Guardar información</button>
      </form>}

      {/* ========================================================================= */}
      {/* BANNER HERO: ESTADO DE PREPARACIÓN PARA PUBLICAR                          */}
      {/* ========================================================================= */}
      {esPublicado ? (
        <div className="mb-8 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-emerald-900">
                Evento Publicado Oficialmente en Cartelera
              </h3>
              <p className="text-emerald-800 text-[11px] mt-0.5">
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
          className={`mb-8 p-6 rounded-2xl border text-xs shadow-xs transition-all ${
            checklist.puedePublicar
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Fase de Preparación Normativa
                </span>
                {checklist.puedePublicar ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                    ✓ Listo para Publicar
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                    {checklist.elementosPendientes.length} Requisito(s) Pendiente(s)
                  </span>
                )}
              </div>
              <h2 className="text-base font-extrabold text-neutral-900">
                {checklist.puedePublicar
                  ? 'Todo está listo: La propuesta cumple con los requisitos normativos'
                  : 'Preparación de Evento Previo a Publicación en Cartelera'}
              </h2>
              <p className="text-neutral-500 text-xs max-w-2xl">
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
                className={`px-6 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
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
          <span className="text-[10px] font-bold text-[#7a132b] uppercase tracking-wider">
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
              <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                Genera e invalida acreditaciones QR para Comité Organizador, Staff de apoyo e invitados VIP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${evento.id}/boletos-especiales`)}
            className="px-4 py-2.5 bg-[#7a132b] hover:bg-[#620f23] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
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
              <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                Abre o cierra la taquilla por día y consulta el historial de cambios.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${evento.id}/inscripciones`)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
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
              <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                Consulta aforo, disponibilidad, reservaciones, lista de espera y participación por día.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/organizador/eventos/${evento.id}/taquilla-participacion`)}
            className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
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
              <p className="text-xs text-neutral-500 mt-0.5">
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
                    className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 text-sm">
                          Día {i + 1}: {fecha.fecha}
                        </span>
                        {fecha.cancelada && <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Día cancelado</span>}
                        {tieneArregloConfirmado ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Versión Oficial Lista</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Arreglo Pendiente</span>
                          </span>
                        )}
                      </div>
                      {!fecha.cancelada && !disponibilidadDia.disponible && <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-950"><strong>{disponibilidadDia.tipoConflicto === 'bloqueo' ? 'Día afectado por bloqueo institucional' : 'Conflicto de agenda'}</strong><p>{disponibilidadDia.motivo}</p><span>Resuelve el conflicto reprogramando el día o cancelándolo de forma segura.</span></div>}

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
                      <label className="text-[10px] font-semibold text-neutral-600">Fecha<input name="fecha" type="date" defaultValue={fecha.fecha} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs" /></label>
                      <label className="text-[10px] font-semibold text-neutral-600">Inicio<input name="horaInicio" type="time" defaultValue={fecha.horaInicio} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs" /></label>
                      <label className="text-[10px] font-semibold text-neutral-600">Fin<input name="horaFin" type="time" defaultValue={fecha.horaFin} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs" /></label>
                      <label className="text-[10px] font-semibold text-neutral-600">Recinto<select name="idRecinto" defaultValue={fecha.idRecinto} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs">{listaRecintos.filter((r) => r.activo !== false).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>
                      <button type="submit" className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white">Guardar fecha, horario o recinto</button>
                      {puedeGestionar && <button type="button" onClick={() => retirarDia(fecha.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Retirar día sin compromisos</button>}
                      {puedeGestionar && !fecha.cancelada && <button type="button" onClick={() => cancelarDia(fecha.id)} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700">Cancelar este día</button>}
                    </form>}

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/organizador/eventos/${evento.id}/fechas/${fecha.id}/arreglos`
                        )
                      }
                      className="px-4 py-2.5 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{tieneArregloConfirmado ? 'Revisar / Modificar Butacas' : 'Diseñar Butacas'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            {evento.estado !== 'cancelado' && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><button type="button" onClick={imprimirConstancia} className="rounded-lg border px-3 py-2 text-xs font-bold">Imprimir constancia operativa</button>{puedeGestionar&&<button type="button" onClick={cancelarEventoCompleto} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Cancelar evento aprobado</button>}</div>}
            {(evento.historialExcepcionesAnticipacion?.length || 0) > 0 && <aside className="rounded-xl bg-amber-50 p-4 text-xs"><h3 className="font-bold text-amber-950">Excepciones de anticipación registradas</h3>{evento.historialExcepcionesAnticipacion?.map((item, indice) => <p key={`${item.fechaAplicacion}-${indice}`} className="mt-1 text-amber-900">{new Date(item.fechaAplicacion).toLocaleString('es-MX')} · {item.responsable}: {item.motivo}</p>)}</aside>}
          </div>
        </div>

        {/* Columna Derecha: Checklist Detallado de Publicación (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
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
                  <div className="text-neutral-500 text-[11px]">
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
                  <div className="text-neutral-500 text-[11px]">
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
                  <div className="text-neutral-500 text-[11px]">
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
                  <div className="text-neutral-500 text-[11px]">
                    {checklist.todasLasFechasTienenVersionFinal
                      ? 'Versión oficial confirmada en cada día'
                      : 'Faltan fechas por confirmar su distribución'}
                  </div>
                </div>
              </div>
            </div>

            {/* Elementos Pendientes si existen */}
            {checklist.elementosPendientes && checklist.elementosPendientes.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px] space-y-1">
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
