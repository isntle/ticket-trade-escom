import { nombreActividad } from '../dominio/actividades';
import { volverA } from '../dominio/navegacion';
import { afectaBloqueo } from '../dominio/bloqueos';
import { etiquetaActividad, estadoInscripcionesActividad, formatearFechaHoraInstitucional, impedimentoApertura, limiteInscripcionesActividad, puedeAdministrarTaquilla } from '../dominio/taquilla';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  History,
  Lock,
  MapPin,
  Unlock,
  Users
} from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useDatos } from '../contextos/DatosContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { AlertaMensaje } from '../componentes/ui/AlertaMensaje';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { VentanaModal } from '../componentes/ui/VentanaModal';
import { EstadoInscripciones, FechaEvento, RegistroCambioInscripciones } from '../tipos';

interface PropiedadesGestionInscripciones {
  eventId: string;
  navigate: (ruta: string) => void;
}

interface RegistroConSesion extends RegistroCambioInscripciones {
  nombreSesion: string;
}

const ETIQUETAS_CAUSA: Record<RegistroCambioInscripciones['causa'], string> = {
  apertura_manual: 'Apertura manual',
  cierre_manual: 'Cierre manual',
  cierre_automatico: 'Cierre automático por fecha límite'
};

export const GestionInscripcionesPagina: React.FC<PropiedadesGestionInscripciones> = ({
  eventId,
  navigate
}) => {
  const {
    listaEventos,
    listaRecintos,
    listaReservaciones,
    listaBoletos,
    listaEspera,
    listaBloqueos,
    cambiarEstadoInscripciones
  } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const evento = listaEventos.find((elemento) => elemento.id === eventId);
  const [idsSeleccionadas, setIdsSeleccionadas] = useState<string[]>([]);
  const [accionPendiente, setAccionPendiente] = useState<EstadoInscripciones | null>(null);
  const [idsOperacion, setIdsOperacion] = useState<string[]>([]);
  const [versionesEsperadas, setVersionesEsperadas] = useState<Record<string, number>>({});
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(intervalo);
  }, []);
  useEffect(() => { setIdsSeleccionadas([]); setAccionPendiente(null); setIdsOperacion([]); }, [eventId]);

  const obtenerEstado = (fecha: FechaEvento): EstadoInscripciones =>
    obtenerBloqueo(fecha) ? 'cerradas' : estadoInscripcionesActividad(fecha, evento?.estado || 'borrador');

  const obtenerFechaLimite = (fecha: FechaEvento): Date => {
    return new Date(limiteInscripcionesActividad(fecha));
  };

  const obtenerBloqueo = (fecha: FechaEvento) =>
    listaBloqueos.find((bloqueo) => afectaBloqueo(bloqueo, fecha));

  const historial = useMemo<RegistroConSesion[]>(() => {
    if (!evento) return [];
    return evento.fechas
      .flatMap((fecha, indice) =>
        (fecha.historialInscripciones || []).map((registro) => ({
          ...registro,
          nombreSesion: etiquetaActividad(fecha, listaRecintos, indice)
        }))
      )
      .sort(
        (primero, segundo) =>
          new Date(segundo.fechaCambio).getTime() - new Date(primero.fechaCambio).getTime()
      );
  }, [evento, listaRecintos]);

  if (!evento) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Evento no encontrado"
          descripcion="El evento solicitado no existe o ya no se encuentra disponible."
          textoAccion="Volver a Mis Eventos"
          alHacerAccion={() => navigate('/organizador')}
        />
      </div>
    );
  }

  if (!usuarioActual || !puedeAdministrarTaquilla(usuarioActual, evento)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          icono={<Lock className="w-6 h-6" />}
          titulo="Administración no autorizada"
          descripcion="ERR-TR-02 · Solo el Organizador responsable puede modificar las inscripciones de este evento."
          textoAccion="Volver al panel"
          alHacerAccion={() => navigate('/organizador')}
        />
      </div>
    );
  }

  const totalAbiertas = evento.fechas.filter((fecha) => obtenerEstado(fecha) === 'abiertas').length;
  const totalCerradas = evento.fechas.length - totalAbiertas;
  const totalReservaciones = listaReservaciones.filter(
    (reservacion) => reservacion.idEvento === evento.id && reservacion.estado === 'confirmada' &&
      !listaBoletos.some(b => b.esEspecial && (b.idReservacion === reservacion.id || b.id === reservacion.idBoleto))
  ).length;

  const actividadesSeleccionables = evento.fechas.filter(fecha => !fecha.cancelada && !fecha.suspendida && !obtenerBloqueo(fecha) && !['cancelado', 'finalizado'].includes(evento.estado));
  const actividadesOrdenadas = [...evento.fechas].sort((a, b) => `${a.fecha} ${a.horaInicio}`.localeCompare(`${b.fecha} ${b.horaInicio}`));

  const alternarSeleccion = (idFecha: string) => {
    setIdsSeleccionadas((anteriores) =>
      anteriores.includes(idFecha)
        ? anteriores.filter((id) => id !== idFecha)
        : [...anteriores, idFecha]
    );
  };

  const prepararOperacion = (
    nuevoEstado: EstadoInscripciones,
    idsObjetivo: string[] = idsSeleccionadas
  ) => {
    const idsConCambio = idsObjetivo.filter((idFecha) => {
      const fecha = evento.fechas.find((elemento) => elemento.id === idFecha);
      return fecha && obtenerEstado(fecha) !== nuevoEstado;
    });

    if (idsConCambio.length === 0) {
      mostrarNotificacion(
        'No hay cambios por aplicar',
        `Las actividades seleccionadas ya tienen las inscripciones ${nuevoEstado}.`,
        'informacion'
      );
      return;
    }

    setIdsOperacion(idsConCambio);
    setVersionesEsperadas(Object.fromEntries(idsConCambio.map(id => [id, evento.fechas.find(f => f.id === id)?.versionInscripciones || 0])));
    setAccionPendiente(nuevoEstado);
  };

  const confirmarOperacion = () => {
    if (!accionPendiente) return;
    const resultado = cambiarEstadoInscripciones({
      idEvento: evento.id,
      idsFechaEvento: idsOperacion,
      nuevoEstado: accionPendiente,
      idOrganizador: usuarioActual.id,
      nombreOrganizador: usuarioActual.nombre,
      versionesEsperadas
    });

    if (!resultado.exito) {
      mostrarNotificacion('No fue posible actualizar las inscripciones', resultado.error || '', 'error');
      return;
    }

    const accion = accionPendiente === 'abiertas' ? 'abrieron' : 'cerraron';
    mostrarNotificacion(
      'OK-MT-09 · Estado actualizado',
      `Se ${accion} las inscripciones de ${resultado.actividadesActualizadas} actividad(es).`,
      'exito'
    );
    setAccionPendiente(null);
    setIdsOperacion([]);
    setIdsSeleccionadas([]);
  };

  const cerrarModal = () => {
    setAccionPendiente(null);
    setIdsOperacion([]);
  };

  const formatearFechaHora = formatearFechaHoraInstitucional;

  const nombreRecinto = (idRecinto: string) =>
    listaRecintos.find((recinto) => recinto.id === idRecinto)?.nombre || 'Recinto ESCOM';

  const sesionesOperacion = idsOperacion
    .map((id) => evento.fechas.find((fecha) => fecha.id === id))
    .filter((fecha): fecha is FechaEvento => Boolean(fecha));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => navigate(volverA(`/organizador/eventos/${evento.id}`))}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /><span>Regresar</span></button>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
        <div>
          <span className="text-[10px] font-bold text-[#7a132b] uppercase tracking-wider">
            Motor de Taquilla · CU-MT-08
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mt-1">
            Apertura y cierre de inscripciones
          </h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-3xl">
            Administra las actividades de <strong className="text-neutral-700">{evento.titulo}</strong> y conserva la trazabilidad de cada cambio. Horarios en hora institucional de Ciudad de México.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={idsSeleccionadas.length === 0}
            onClick={() => prepararOperacion('abiertas')}
            className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Abrir seleccionadas
          </button>
          <button
            type="button"
            disabled={idsSeleccionadas.length === 0}
            onClick={() => prepararOperacion('cerradas')}
            className="px-4 py-2.5 rounded-xl bg-[#7a132b] hover:bg-[#620f23] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Lock className="w-4 h-4" />
            Cerrar seleccionadas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Inscripciones abiertas</span>
            <Unlock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{totalAbiertas}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Actividades que admiten nuevos registros</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Inscripciones cerradas</span>
            <Lock className="w-4 h-4 text-[#7a132b]" />
          </div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{totalCerradas}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Actividades cerradas para nuevos registros</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Reservaciones vigentes</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{totalReservaciones}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Se conservan aunque se cierre la taquilla</p>
        </div>
      </div>

      {evento.estado !== 'publicado' && (
        <AlertaMensaje
          tipo="advertencia"
          titulo="El evento todavía no está publicado"
          mensaje="Las inscripciones solo podrán abrirse cuando el evento tenga el estado PUBLICADO."
          className="mb-6"
        />
      )}

      <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden mb-7">
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-neutral-900">Actividades del evento</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Selecciona una o varias actividades para realizar una operación conjunta.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 cursor-pointer">
            <input
              type="checkbox"
              checked={actividadesSeleccionables.length > 0 && actividadesSeleccionables.every(a => idsSeleccionadas.includes(a.id))}
              disabled={actividadesSeleccionables.length === 0}
              onChange={(campo) =>
                setIdsSeleccionadas(campo.target.checked ? actividadesSeleccionables.map((fecha) => fecha.id) : [])
              }
              className="w-4 h-4 accent-[#7a132b]"
            />
            Seleccionar todas
          </label>
        </div>

        <div className="divide-y divide-neutral-100">
          {actividadesOrdenadas.map((fecha, indice) => {
            const estado = obtenerEstado(fecha);
            const bloqueo = obtenerBloqueo(fecha);
            const limite = obtenerFechaLimite(fecha);
            const limiteVencido = limite.getTime() <= ahora;
            const seleccionable = actividadesSeleccionables.some(a => a.id === fecha.id);
            const reservaciones = listaReservaciones.filter(
              (item) => item.idEvento === evento.id && item.idFechaEvento === fecha.id && item.estado === 'confirmada' &&
                !listaBoletos.some(b => b.esEspecial && (b.idReservacion === item.id || b.id === item.idBoleto))
            ).length;
            const apartados = listaReservaciones.filter(
              (item) => item.idEvento === evento.id && item.idFechaEvento === fecha.id && item.estado === 'apartado_temporal' && (item.tiempoExpiracionApartado || 0) > ahora
            ).length;
            const espera = listaEspera.filter(
              (item) =>
                item.idEvento === evento.id && item.idFechaEvento === fecha.id &&
                (item.estado === 'esperando' || item.estado === 'notificado')
            ).length;
            const ultimoCambio = [...(fecha.historialInscripciones || [])].sort(
              (primero, segundo) =>
                new Date(segundo.fechaCambio).getTime() - new Date(primero.fechaCambio).getTime()
            )[0];

            return (
              <React.Fragment key={fecha.id}>
              {(indice === 0 || actividadesOrdenadas[indice - 1].fecha !== fecha.fecha) && <h3 className="px-5 py-3 bg-neutral-50 text-xs font-bold text-neutral-600">Día {fecha.fecha}</h3>}
              <article className="p-5 sm:p-6">
                <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${etiquetaActividad(fecha, listaRecintos, evento.fechas.indexOf(fecha))}`}
                      disabled={!seleccionable}
                      checked={idsSeleccionadas.includes(fecha.id)}
                      onChange={() => alternarSeleccion(fecha.id)}
                      className="w-4 h-4 mt-1 accent-[#7a132b] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-neutral-900">
                          {nombreActividad(fecha,evento.fechas.indexOf(fecha))} · {fecha.fecha}
                        </h3>
                        <span
                          className={`px-2.5 py-1 rounded-md border text-[10px] font-black tracking-wide ${
                            estado === 'abiertas'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                          }`}
                        >
                          INSCRIPCIONES {estado.toUpperCase()}
                        </span>
                        {fecha.cancelada && <span className="text-xs font-bold text-rose-800">CANCELADA</span>}
                        {(bloqueo || fecha.suspendida) && (
                          <span className="px-2.5 py-1 rounded-md border bg-amber-100 border-amber-300 text-amber-900 text-[10px] font-black tracking-wide">
                            SUSPENDIDO
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500 mt-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {fecha.horaInicio} a {fecha.horaFin} hrs
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {nombreRecinto(fecha.idRecinto)}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 ${limiteVencido ? 'text-rose-700 font-semibold' : ''}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          Límite: {formatearFechaHora(limite)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
                        <span className="px-2 py-1 bg-sky-50 text-sky-800 rounded border border-sky-100">
                          {reservaciones} reservaciones
                        </span>
                        <span className="px-2 py-1 bg-amber-50 text-amber-800 rounded border border-amber-100">
                          {apartados} apartados temporales
                        </span>
                        <span className="px-2 py-1 bg-violet-50 text-violet-800 rounded border border-violet-100">
                          {espera} en espera
                        </span>
                      </div>

                      <p className="text-[11px] text-neutral-400 mt-3">
                        {ultimoCambio
                          ? `Último cambio: ${ETIQUETAS_CAUSA[ultimoCambio.causa]} por ${ultimoCambio.responsable}, ${formatearFechaHora(ultimoCambio.fechaCambio)}`
                          : 'Sin cambios de inscripción registrados todavía.'}
                      </p>
                      {bloqueo && (
                        <p className="text-[11px] font-semibold text-amber-800 mt-1">
                          {bloqueo.titulo}: {bloqueo.motivo}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button
                      type="button"
                      disabled={
                        estado === 'abiertas' || !seleccionable ||
                        Boolean(impedimentoApertura(evento, fecha, listaBloqueos, ahora))
                      }
                      onClick={() => prepararOperacion('abiertas', [fecha.id])}
                      className="px-3.5 py-2 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Abrir
                    </button>
                    <button
                      type="button"
                      disabled={estado === 'cerradas' || !seleccionable}
                      onClick={() => prepararOperacion('cerradas', [fecha.id])}
                      className="px-3.5 py-2 rounded-lg border border-[#7a132b]/30 text-[#7a132b] hover:bg-[#7a132b]/5 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Cerrar
                    </button>
                  </div>
                </div>
              </article>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
            <History className="w-4 h-4 text-[#7a132b]" />
            Historial de cambios
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Fecha, responsable y causa registrada para cada apertura o cierre.
          </p>
        </div>

        {historial.length === 0 ? (
          <div className="p-6 text-xs text-neutral-500">No hay cambios registrados todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-6 py-3 font-bold">Actividad</th>
                  <th className="px-6 py-3 font-bold">Cambio</th>
                  <th className="px-6 py-3 font-bold">Responsable</th>
                  <th className="px-6 py-3 font-bold">Fecha y hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {historial.slice(0, 12).map((registro) => (
                  <tr key={registro.id}>
                    <td className="px-6 py-3.5 font-semibold text-neutral-900">{registro.nombreSesion}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold ${
                          registro.estado === 'abiertas' ? 'text-emerald-700' : 'text-[#7a132b]'
                        }`}
                      >
                        {registro.estado === 'abiertas' ? (
                          <Unlock className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        {ETIQUETAS_CAUSA[registro.causa]}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-neutral-600">{registro.responsable}</td>
                    <td className="px-6 py-3.5 text-neutral-500">{formatearFechaHora(registro.fechaCambio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <VentanaModal
        estaAbierto={Boolean(accionPendiente)}
        alCerrar={cerrarModal}
        titulo={accionPendiente === 'abiertas' ? 'Abrir inscripciones' : 'Cerrar inscripciones'}
        subtitulo={`${sesionesOperacion.length} actividad(es) seleccionada(s)`}
        anchoMaximo="lg"
      >
        <div className="space-y-4">
          {accionPendiente === 'cerradas' ? (
            <AlertaMensaje
              tipo="advertencia"
              titulo="AV-MT-04 · Confirma el cierre"
              mensaje="No se admitirán nuevos registros, reservaciones, incorporaciones a la lista de espera ni emisiones de boletos especiales. Las reservaciones, boletos y posiciones de espera existentes se conservarán; los apartados temporales y ofertas no aceptadas se cerrarán."
            />
          ) : (
            <AlertaMensaje
              tipo="informacion"
              titulo="Confirmación de apertura"
              mensaje="Las actividades volverán a admitir registros, reservaciones, listas de espera y boletos especiales hasta su fecha límite."
            />
          )}

          <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
            {sesionesOperacion.map((fecha) => (
              <div key={fecha.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-neutral-900">{etiquetaActividad(fecha, listaRecintos, evento.fechas.indexOf(fecha))}</div>
                </div>
                {accionPendiente === 'abiertas' ? (
                  <Unlock className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Lock className="w-4 h-4 text-[#7a132b]" />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cerrarModal}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarOperacion}
              className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 ${
                accionPendiente === 'abiertas'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-[#7a132b] hover:bg-[#620f23]'
              }`}
            >
              {accionPendiente === 'abiertas' ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              Confirmar {accionPendiente === 'abiertas' ? 'apertura' : 'cierre'}
            </button>
          </div>
        </div>
      </VentanaModal>
    </div>
  );
};
