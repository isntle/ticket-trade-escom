import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  UserCheck,
  Users,
  UserX,
  WalletCards
} from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useDatos } from '../contextos/DatosContexto';
import { AlertaMensaje } from '../componentes/ui/AlertaMensaje';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { FechaEvento } from '../tipos';

interface PropiedadesPanelTaquilla {
  eventId: string;
  navigate: (ruta: string) => void;
}

type FiltroPeriodo = 'todas' | 'proximas' | 'finalizadas';
type FiltroModalidad = 'todas' | 'libre' | 'registro' | 'controlado';
type CategoriaDetalle =
  | 'reservaciones'
  | 'cancelaciones'
  | 'espera'
  | 'especiales'
  | 'participacion';
type EstadoDetalle = 'todos' | 'activo' | 'cancelado' | 'utilizado' | 'pendiente';

interface MetricaSesion {
  fecha: FechaEvento;
  aforo: number;
  reservaciones: number;
  cancelaciones: number;
  espera: number;
  especiales: number;
  intenciones: number;
  asistencias: number;
  disponibles: number;
  ocupacion: number;
  suspendida: boolean;
}

interface RegistroDetalle {
  id: string;
  categoria: CategoriaDetalle;
  nombre: string;
  referencia: string;
  idFechaEvento: string;
  estado: Exclude<EstadoDetalle, 'todos'>;
  fechaRegistro: string;
}

const ETIQUETAS_CATEGORIA: Record<CategoriaDetalle, string> = {
  reservaciones: 'Reservaciones',
  cancelaciones: 'Cancelaciones',
  espera: 'Lista de espera',
  especiales: 'Boletos especiales',
  participacion: 'Participación registrada'
};

const CLASES_ESTADO: Record<Exclude<EstadoDetalle, 'todos'>, string> = {
  activo: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  cancelado: 'bg-rose-50 border-rose-200 text-rose-800',
  utilizado: 'bg-sky-50 border-sky-200 text-sky-800',
  pendiente: 'bg-amber-50 border-amber-200 text-amber-900'
};

const formatearFechaHora = (valor: string | Date) =>
  new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(typeof valor === 'string' ? new Date(valor) : valor);

export const PanelTaquillaParticipacionPagina: React.FC<PropiedadesPanelTaquilla> = ({
  eventId,
  navigate
}) => {
  const {
    listaEventos,
    listaRecintos,
    listaArreglos,
    listaReservaciones,
    listaBoletos,
    listaEspera,
    bitacoraEscaneos,
    listaBloqueos
  } = useDatos();
  const { usuarioActual } = useAutenticacion();

  const evento = listaEventos.find((elemento) => elemento.id === eventId);
  const eventosAdministrados = listaEventos.filter(
    (elemento) => elemento.idOrganizador === usuarioActual?.id
  );

  const [idSesion, setIdSesion] = useState('todas');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('todas');
  const [modalidad, setModalidad] = useState<FiltroModalidad>('todas');
  const [categoria, setCategoria] = useState<CategoriaDetalle>('reservaciones');
  const [estado, setEstado] = useState<EstadoDetalle>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(() => new Date());

  const bloqueoDeSesion = (fecha: FechaEvento) =>
    listaBloqueos.find((bloqueo) => {
      const aplicaRecinto =
        bloqueo.idRecinto === fecha.idRecinto ||
        bloqueo.idRecinto === 'todos' ||
        Boolean(bloqueo.idsRecintos?.includes(fecha.idRecinto));
      if (!aplicaRecinto || fecha.fecha < bloqueo.fechaInicio) return false;
      if (bloqueo.esIndefinido) return true;
      const fechaFin = bloqueo.fechaFin || bloqueo.fechaInicio;
      const horaInicio = bloqueo.horaInicio || '00:00';
      const horaFin = bloqueo.horaFin || '23:59';
      return (
        fecha.fecha <= fechaFin &&
        fecha.horaInicio < horaFin &&
        fecha.horaFin > horaInicio
      );
    });

  const sesionesFiltradas = useMemo(() => {
    if (!evento || (modalidad !== 'todas' && evento.modalidadAsistencia !== modalidad)) return [];
    const ahora = Date.now();
    return evento.fechas.filter((fecha) => {
      if (idSesion !== 'todas' && fecha.id !== idSesion) return false;
      const finSesion = new Date(`${fecha.fecha}T${fecha.horaFin}:00`).getTime();
      if (periodo === 'proximas') return finSesion >= ahora;
      if (periodo === 'finalizadas') return finSesion < ahora;
      return true;
    });
  }, [evento, idSesion, modalidad, periodo]);

  const metricasSesiones = useMemo<MetricaSesion[]>(() => {
    if (!evento) return [];
    return sesionesFiltradas.map((fecha) => {
      const arreglo =
        listaArreglos.find(
          (elemento) => elemento.idFechaEvento === fecha.id && elemento.estado === 'version_final'
        ) || listaArreglos.find((elemento) => elemento.idFechaEvento === fecha.id);
      const recinto = listaRecintos.find((elemento) => elemento.id === fecha.idRecinto);
      const aforo = arreglo?.totalAsientos || recinto?.capacidad || evento.aforoMaximo || 0;
      const boletosEspeciales = listaBoletos.filter(
        (boleto) => boleto.idFechaEvento === fecha.id && boleto.esEspecial
      );
      const idsReservacionesEspeciales = new Set(
        boletosEspeciales.map((boleto) => boleto.idReservacion)
      );
      const reservacionesNormales = listaReservaciones.filter(
        (reservacion) =>
          reservacion.idFechaEvento === fecha.id &&
          !idsReservacionesEspeciales.has(reservacion.id)
      );
      const reservaciones = reservacionesNormales.filter(
        (reservacion) => reservacion.estado === 'confirmada'
      ).length;
      const cancelaciones = reservacionesNormales.filter(
        (reservacion) => reservacion.estado === 'cancelada'
      ).length;
      const espera = listaEspera.filter(
        (entrada) =>
          entrada.idFechaEvento === fecha.id &&
          (entrada.estado === 'esperando' || entrada.estado === 'notificado')
      ).length;
      const especiales = boletosEspeciales.filter(
        (boleto) => boleto.estado === 'valido' || boleto.estado === 'utilizado'
      ).length;
      const intenciones = reservacionesNormales.filter(
        (reservacion) =>
          reservacion.estado === 'confirmada' &&
          !reservacion.idAsiento &&
          evento.modalidadAsistencia !== 'controlado'
      ).length;
      const asistencias = new Set(
        bitacoraEscaneos
          .filter(
            (registro) =>
              registro.idFechaEvento === fecha.id && registro.resultado === 'exito'
          )
          .map((registro) => registro.idBoleto)
      ).size;
      const lugaresOcupados = reservaciones + especiales;
      return {
        fecha,
        aforo,
        reservaciones,
        cancelaciones,
        espera,
        especiales,
        intenciones,
        asistencias,
        disponibles: Math.max(0, aforo - lugaresOcupados),
        ocupacion: aforo > 0 ? Math.min(100, Math.round((lugaresOcupados / aforo) * 100)) : 0,
        suspendida: Boolean(bloqueoDeSesion(fecha))
      };
    });
  }, [
    bitacoraEscaneos,
    evento,
    listaArreglos,
    listaBoletos,
    listaEspera,
    listaRecintos,
    listaReservaciones,
    listaBloqueos,
    sesionesFiltradas
  ]);

  const totales = useMemo(
    () =>
      metricasSesiones.reduce(
        (acumulado, metrica) => ({
          aforo: acumulado.aforo + metrica.aforo,
          reservaciones: acumulado.reservaciones + metrica.reservaciones,
          cancelaciones: acumulado.cancelaciones + metrica.cancelaciones,
          espera: acumulado.espera + metrica.espera,
          especiales: acumulado.especiales + metrica.especiales,
          intenciones: acumulado.intenciones + metrica.intenciones,
          asistencias: acumulado.asistencias + metrica.asistencias,
          disponibles: acumulado.disponibles + metrica.disponibles
        }),
        {
          aforo: 0,
          reservaciones: 0,
          cancelaciones: 0,
          espera: 0,
          especiales: 0,
          intenciones: 0,
          asistencias: 0,
          disponibles: 0
        }
      ),
    [metricasSesiones]
  );

  const idsFechasFiltradas = useMemo(
    () => new Set(sesionesFiltradas.map((fecha) => fecha.id)),
    [sesionesFiltradas]
  );

  const registrosDetalle = useMemo<RegistroDetalle[]>(() => {
    if (!evento) return [];
    const boletosEspeciales = listaBoletos.filter(
      (boleto) => boleto.idEvento === evento.id && boleto.esEspecial
    );
    const idsReservacionesEspeciales = new Set(
      boletosEspeciales.map((boleto) => boleto.idReservacion)
    );

    const reservaciones: RegistroDetalle[] = listaReservaciones
      .filter(
        (reservacion) =>
          reservacion.idEvento === evento.id &&
          idsFechasFiltradas.has(reservacion.idFechaEvento) &&
          !idsReservacionesEspeciales.has(reservacion.id)
      )
      .map((reservacion) => ({
        id: reservacion.id,
        categoria: reservacion.estado === 'cancelada' ? 'cancelaciones' : 'reservaciones',
        nombre: reservacion.nombreUsuario,
        referencia: reservacion.etiquetaAsiento || 'Sin lugar asignado',
        idFechaEvento: reservacion.idFechaEvento,
        estado:
          reservacion.estado === 'cancelada'
            ? 'cancelado'
            : reservacion.estado === 'apartado_temporal'
              ? 'pendiente'
              : 'activo',
        fechaRegistro: reservacion.fechaConfirmacion || reservacion.fechaCreacion
      }));

    const espera: RegistroDetalle[] = listaEspera
      .filter(
        (entrada) =>
          entrada.idEvento === evento.id && idsFechasFiltradas.has(entrada.idFechaEvento)
      )
      .map((entrada) => ({
        id: entrada.id,
        categoria: 'espera',
        nombre: entrada.nombreUsuario,
        referencia: `Posición ${entrada.posicionFila}`,
        idFechaEvento: entrada.idFechaEvento,
        estado:
          entrada.estado === 'cancelado'
            ? 'cancelado'
            : entrada.estado === 'convertido'
              ? 'utilizado'
              : entrada.estado === 'notificado'
                ? 'activo'
                : 'pendiente',
        fechaRegistro: entrada.fechaCreacion
      }));

    const especiales: RegistroDetalle[] = boletosEspeciales
      .filter((boleto) => idsFechasFiltradas.has(boleto.idFechaEvento))
      .map((boleto) => ({
        id: boleto.id,
        categoria: 'especiales',
        nombre: boleto.nombreUsuario,
        referencia: `${boleto.tipoEspecial || 'especial'} · ${boleto.etiquetaAsiento || 'Sin lugar'}`,
        idFechaEvento: boleto.idFechaEvento,
        estado:
          boleto.estado === 'cancelado'
            ? 'cancelado'
            : boleto.estado === 'utilizado'
              ? 'utilizado'
              : 'activo',
        fechaRegistro: boleto.fechaEmision
      }));

    const participacion: RegistroDetalle[] = bitacoraEscaneos
      .filter(
        (registro) =>
          registro.idEvento === evento.id &&
          idsFechasFiltradas.has(registro.idFechaEvento) &&
          registro.resultado === 'exito'
      )
      .map((registro) => ({
        id: registro.id,
        categoria: 'participacion',
        nombre: registro.nombreAsistente || 'Titular identificado',
        referencia: registro.etiquetaAsiento || registro.idBoleto,
        idFechaEvento: registro.idFechaEvento,
        estado: 'utilizado',
        fechaRegistro: registro.fechaEscaneo
      }));

    return [...reservaciones, ...espera, ...especiales, ...participacion].sort(
      (primero, segundo) =>
        new Date(segundo.fechaRegistro).getTime() - new Date(primero.fechaRegistro).getTime()
    );
  }, [
    bitacoraEscaneos,
    evento,
    idsFechasFiltradas,
    listaBoletos,
    listaEspera,
    listaReservaciones
  ]);

  const registrosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return registrosDetalle.filter((registro) => {
      const coincideCategoria = registro.categoria === categoria;
      const coincideEstado = estado === 'todos' || registro.estado === estado;
      const coincideBusqueda =
        !termino ||
        registro.nombre.toLowerCase().includes(termino) ||
        registro.referencia.toLowerCase().includes(termino);
      return coincideCategoria && coincideEstado && coincideBusqueda;
    });
  }, [busqueda, categoria, estado, registrosDetalle]);

  if (!evento) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Evento no encontrado"
          descripcion="ERR-TR-03 · El evento solicitado no existe en el sistema."
          textoAccion="Volver a Mis Eventos"
          alHacerAccion={() => navigate('/organizador')}
        />
      </div>
    );
  }

  if (!usuarioActual || usuarioActual.id !== evento.idOrganizador) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          icono={<ShieldCheck className="w-6 h-6" />}
          titulo="Consulta no autorizada"
          descripcion="ERR-TR-02 · Solo el Organizador responsable puede consultar los indicadores de este evento."
          textoAccion="Volver al panel"
          alHacerAccion={() => navigate('/organizador')}
        />
      </div>
    );
  }

  const ocupacionGeneral =
    totales.aforo > 0
      ? Math.min(100, Math.round(((totales.reservaciones + totales.especiales) / totales.aforo) * 100))
      : 0;
  const entradasEmitidas = totales.reservaciones + totales.especiales;
  const participacionGeneral =
    entradasEmitidas > 0
      ? Math.min(100, Math.round((totales.asistencias / entradasEmitidas) * 100))
      : 0;
  const idsTitularesUnicos = new Set(
    listaReservaciones
      .filter(
        (reservacion) =>
          reservacion.idEvento === evento.id &&
          idsFechasFiltradas.has(reservacion.idFechaEvento) &&
          reservacion.estado === 'confirmada' &&
          !listaBoletos.some(
            (boleto) => boleto.idReservacion === reservacion.id && boleto.esEspecial
          )
      )
      .map((reservacion) => reservacion.idUsuario)
  );
  const sinActividad =
    totales.reservaciones +
      totales.cancelaciones +
      totales.espera +
      totales.especiales +
      totales.intenciones +
      totales.asistencias ===
    0;
  const haySesionesSuspendidas = metricasSesiones.some((metrica) => metrica.suspendida);

  const nombreSesion = (idFechaEvento: string) => {
    const indice = evento.fechas.findIndex((fecha) => fecha.id === idFechaEvento);
    const fecha = evento.fechas[indice];
    return fecha ? fecha.nombreDia || `Día ${indice + 1}` : 'Sesión';
  };

  const tarjetas = [
    { etiqueta: 'Aforo total', valor: totales.aforo, ayuda: 'Lugares por día', icono: Users, color: 'text-neutral-700 bg-neutral-100' },
    { etiqueta: 'Disponibles', valor: totales.disponibles, ayuda: 'Lugares aún libres', icono: CheckCircle2, color: 'text-emerald-700 bg-emerald-50' },
    { etiqueta: 'Reservaciones activas', valor: totales.reservaciones, ayuda: 'Confirmadas en taquilla', icono: Ticket, color: 'text-sky-700 bg-sky-50' },
    { etiqueta: 'Cancelaciones', valor: totales.cancelaciones, ayuda: 'Reservaciones canceladas', icono: UserX, color: 'text-rose-700 bg-rose-50' },
    { etiqueta: 'Lista de espera', valor: totales.espera, ayuda: 'En espera o notificados', icono: Clock3, color: 'text-amber-700 bg-amber-50' },
    { etiqueta: 'Boletos especiales', valor: totales.especiales, ayuda: 'Entradas, no personas únicas', icono: WalletCards, color: 'text-violet-700 bg-violet-50' },
    { etiqueta: 'Intención de asistencia', valor: totales.intenciones, ayuda: 'Registros sin lugar asignado', icono: UserCheck, color: 'text-indigo-700 bg-indigo-50' },
    { etiqueta: 'Participación registrada', valor: totales.asistencias, ayuda: 'Entradas verificadas en puerta', icono: BarChart3, color: 'text-[#7a132b] bg-[#7a132b]/10' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => navigate(`/organizador/eventos/${evento.id}`)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la configuración del evento</span>
      </button>

      <header className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs mb-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-[#7a132b] uppercase tracking-wider">
                CU-MT-09 · Motor de taquilla
              </span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-[9px] font-black text-neutral-600 uppercase tracking-wider">
                Solo lectura
              </span>
              <InsigniaEstado estado={evento.modalidadAsistencia} />
              {evento.estado === 'cancelado' && (
                <span className="px-2.5 py-1 rounded-md border bg-rose-100 border-rose-300 text-rose-900 text-[10px] font-black tracking-wide">
                  CANCELADO
                </span>
              )}
              {haySesionesSuspendidas && (
                <span className="px-2.5 py-1 rounded-md border bg-amber-100 border-amber-300 text-amber-900 text-[10px] font-black tracking-wide">
                  SUSPENDIDO
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Panel de taquilla y participación
            </h1>
            <p className="text-xs text-neutral-500 mt-1 max-w-3xl">
              {evento.titulo} · Consulta consolidada sin modificar aforos, boletos ni reservaciones.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <select
              aria-label="Seleccionar evento"
              value={evento.id}
              onChange={(e) => {
                setIdSesion('todas');
                navigate(`/organizador/eventos/${e.target.value}/taquilla-participacion`);
              }}
              className="min-w-56 px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#7a132b]/20"
            >
              {eventosAdministrados.map((elemento) => (
                <option key={elemento.id} value={elemento.id}>
                  {elemento.titulo}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setUltimaActualizacion(new Date())}
              className="px-4 py-2.5 bg-[#7a132b] hover:bg-[#620f23] text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar datos
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-col lg:flex-row lg:items-end gap-3">
          <label className="flex-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Sesión
            <select
              value={idSesion}
              onChange={(e) => setIdSesion(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs normal-case font-semibold text-neutral-800 focus:outline-none"
            >
              <option value="todas">Todos los días</option>
              {evento.fechas.map((fecha, indice) => (
                <option key={fecha.id} value={fecha.id}>
                  {fecha.nombreDia || `Día ${indice + 1}`} · {fecha.fecha}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Periodo
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as FiltroPeriodo)}
              className="mt-1 w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs normal-case font-semibold text-neutral-800 focus:outline-none"
            >
              <option value="todas">Todo el evento</option>
              <option value="proximas">Próximos días</option>
              <option value="finalizadas">Sesiones finalizadas</option>
            </select>
          </label>
          <label className="flex-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Modalidad
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as FiltroModalidad)}
              className="mt-1 w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs normal-case font-semibold text-neutral-800 focus:outline-none"
            >
              <option value="todas">Todas las modalidades</option>
              <option value="controlado">Acceso controlado</option>
              <option value="registro">Registro de asistencia</option>
              <option value="libre">Acceso libre</option>
            </select>
          </label>
          <div className="flex-1 rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2.5 text-[10px] text-neutral-500">
            <span className="font-bold uppercase tracking-wider block">Última actualización</span>
            <span className="text-xs font-semibold text-neutral-800 mt-1 block">
              {formatearFechaHora(ultimaActualizacion)}
            </span>
          </div>
        </div>
      </header>

      {evento.estado === 'cancelado' && (
        <AlertaMensaje
          tipo="advertencia"
          titulo="Evento cancelado"
          mensaje="La información histórica permanece disponible en modo de solo lectura."
          className="mb-5"
        />
      )}
      {haySesionesSuspendidas && (
        <AlertaMensaje
          tipo="advertencia"
          titulo="INF-OR-06 · SUSPENDIDO"
          mensaje="Uno o más días están suspendidos por un bloqueo institucional. Los datos históricos pueden seguir consultándose."
          className="mb-5"
        />
      )}
      {sesionesFiltradas.length === 0 && (
        <AlertaMensaje
          tipo="informacion"
          titulo="INF-TR-01 · Sin resultados"
          mensaje="No hay días que coincidan con el periodo y la modalidad seleccionados. Modifica o elimina los filtros."
          className="mb-5"
        />
      )}
      {sesionesFiltradas.length > 0 && sinActividad && (
        <AlertaMensaje
          tipo="informacion"
          titulo="INF-MT-07 · Evento sin actividad registrada"
          mensaje="Los indicadores se muestran en cero porque todavía no existen reservaciones, boletos ni registros de participación para esta selección."
          className="mb-5"
        />
      )}

      <section aria-label="Indicadores de taquilla" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {tarjetas.map(({ etiqueta, valor, ayuda, icono: Icono, color }) => (
          <article key={etiqueta} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {etiqueta}
                </span>
                <div className="text-2xl font-black text-neutral-900 mt-1">{valor}</div>
              </div>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icono className="w-4.5 h-4.5" />
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">{ayuda}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <article className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-neutral-900">Ocupación y participación</h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">Totales de la selección actual</p>
            </div>
            <BarChart3 className="w-5 h-5 text-[#7a132b]" />
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-neutral-700">Ocupación comprometida</span>
                <span className="font-black text-neutral-900">{ocupacionGeneral}%</span>
              </div>
              <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#7a132b] rounded-full transition-all" style={{ width: `${ocupacionGeneral}%` }} />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1.5">
                {entradasEmitidas} entradas activas de {totales.aforo} lugares acumulados
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-neutral-700">Participación registrada</span>
                <span className="font-black text-neutral-900">{participacionGeneral}%</span>
              </div>
              <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${participacionGeneral}%` }} />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1.5">
                {totales.asistencias} accesos verificados respecto a {entradasEmitidas} entradas activas
              </p>
            </div>
          </div>
        </article>

        <article className="bg-neutral-900 text-white rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Identidad de asistentes</span>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-black">{idsTitularesUnicos.size}</span>
            <span className="text-xs text-neutral-300 mb-1">titulares únicos por cuenta</span>
          </div>
          <div className="h-px bg-white/10 my-4" />
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-violet-300">{totales.especiales}</span>
            <span className="text-xs text-neutral-300 mb-1">entradas especiales</span>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed mt-3">
            Los boletos especiales se reportan como entradas y no se suman como personas únicas.
          </p>
        </article>
      </section>

      <section className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden mb-5">
        <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-neutral-900">Resumen por día</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Los aforos se suman por día, no como personas únicas.</p>
          </div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            {metricasSesiones.length} día(s)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-200">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-bold">Sesión</th>
                <th className="px-3 py-3 font-bold text-center">Aforo</th>
                <th className="px-3 py-3 font-bold text-center">Reservadas</th>
                <th className="px-3 py-3 font-bold text-center">Disponibles</th>
                <th className="px-3 py-3 font-bold text-center">Espera</th>
                <th className="px-3 py-3 font-bold text-center">Especiales</th>
                <th className="px-3 py-3 font-bold text-center">Asistencias</th>
                <th className="px-5 py-3 font-bold text-right">Ocupación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {metricasSesiones.map((metrica) => {
                const recinto = listaRecintos.find((elemento) => elemento.id === metrica.fecha.idRecinto);
                return (
                  <tr key={metrica.fecha.id} className="hover:bg-neutral-50/70">
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-neutral-900">{nombreSesion(metrica.fecha.id)}</span>
                        {metrica.suspendida && (
                          <span className="px-2 py-0.5 rounded border bg-amber-100 border-amber-300 text-amber-900 text-[9px] font-black">
                            SUSPENDIDO
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {metrica.fecha.fecha} · {metrica.fecha.horaInicio} · {recinto?.nombre || 'Recinto'}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center font-semibold text-neutral-700">{metrica.aforo}</td>
                    <td className="px-3 py-4 text-center font-semibold text-sky-700">{metrica.reservaciones}</td>
                    <td className="px-3 py-4 text-center font-semibold text-emerald-700">{metrica.disponibles}</td>
                    <td className="px-3 py-4 text-center text-neutral-700">{metrica.espera}</td>
                    <td className="px-3 py-4 text-center text-violet-700">{metrica.especiales}</td>
                    <td className="px-3 py-4 text-center text-[#7a132b] font-semibold">{metrica.asistencias}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-black text-neutral-900">{metrica.ocupacion}%</span>
                    </td>
                  </tr>
                );
              })}
              {metricasSesiones.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-neutral-500">
                    INF-TR-01 · No hay días que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-extrabold text-neutral-900">Desglose por categoría</h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">Selecciona una categoría para consultar sus registros.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar titular o referencia"
                  className="w-full sm:w-60 pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7a132b]/20"
                />
              </label>
              <select
                aria-label="Filtrar por estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoDetalle)}
                className="px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 focus:outline-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="utilizado">Utilizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
            {(Object.keys(ETIQUETAS_CATEGORIA) as CategoriaDetalle[]).map((clave) => {
              const cantidad = registrosDetalle.filter((registro) => registro.categoria === clave).length;
              return (
                <button
                  key={clave}
                  type="button"
                  onClick={() => {
                    setCategoria(clave);
                    setEstado('todos');
                  }}
                  className={`px-3 py-2 rounded-xl border text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    categoria === clave
                      ? 'bg-[#7a132b] border-[#7a132b] text-white'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {ETIQUETAS_CATEGORIA[clave]} · {cantidad}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-180">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-bold">Titular / registro</th>
                <th className="px-4 py-3 font-bold">Referencia</th>
                <th className="px-4 py-3 font-bold">Sesión</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-5 py-3 font-bold text-right">Fecha de registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {registrosFiltrados.map((registro) => (
                <tr key={`${registro.categoria}-${registro.id}`} className="hover:bg-neutral-50/70">
                  <td className="px-5 py-4 font-semibold text-neutral-900">{registro.nombre}</td>
                  <td className="px-4 py-4 text-neutral-600 capitalize">{registro.referencia}</td>
                  <td className="px-4 py-4 text-neutral-600">{nombreSesion(registro.idFechaEvento)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] font-bold capitalize ${CLASES_ESTADO[registro.estado]}`}>
                      {registro.estado}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-neutral-500">{formatearFechaHora(registro.fechaRegistro)}</td>
                </tr>
              ))}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <CalendarDays className="w-7 h-7 text-neutral-300 mx-auto mb-2" />
                    <p className="font-bold text-neutral-700">INF-TR-01 · Sin resultados</p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      No existen registros que coincidan con la categoría, el estado o la búsqueda.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
