import type {
  ArregloAsientos, BloqueoRecinto, BoletoDigital, EntradaListaEspera, EstadoInscripciones,
  Evento, FechaEvento, Recinto, RegistroEscaneo, RegistroIntencionAsistencia, Reservacion, Usuario
} from '../tipos';
import { modalidadActividad, nombreActividad } from './actividades';
import { afectaBloqueo } from './bloqueos';
import { inicioEnMexico, ZONA_HORARIA } from './solicitudes';

/** Las fechas de formulario sin offset se interpretan en la hora institucional. */
export function instanteInstitucional(valor: string): number {
  const local = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(valor);
  if (!local) return Date.parse(valor);
  const inicio = inicioEnMexico(local[1], local[2]);
  const segundos = Number(local[3] || 0);
  return segundos < 60 ? inicio + segundos * 1000 + Number((local[4] || '').padEnd(3, '0')) : NaN;
}

export function formatearFechaHoraInstitucional(valor: string | number | Date): string {
  const instante = typeof valor === 'string' ? instanteInstitucional(valor) : Number(valor);
  return Number.isFinite(instante)
    ? new Intl.DateTimeFormat('es-MX', { timeZone: ZONA_HORARIA, dateStyle: 'medium', timeStyle: 'short' }).format(instante)
    : 'Fecha no disponible';
}

export function limiteInscripcionesActividad(actividad: FechaEvento): number {
  return actividad.fechaLimiteInscripciones
    ? instanteInstitucional(actividad.fechaLimiteInscripciones)
    : inicioEnMexico(actividad.fecha, actividad.horaInicio) - 3600000;
}

export function etiquetaActividad(actividad: FechaEvento, recintos: Recinto[], indice = 0): string {
  const recinto = recintos.find(r => r.id === actividad.idRecinto)?.nombre || 'Recinto no disponible';
  return `${nombreActividad(actividad, indice)} · ${actividad.fecha} · ${actividad.horaInicio}–${actividad.horaFin} · ${recinto}`;
}

export function estadoInscripcionesActividad(actividad: FechaEvento, estadoEvento: Evento['estado']): EstadoInscripciones {
  return actividad.cancelada || actividad.suspendida || estadoEvento === 'cancelado' || estadoEvento === 'finalizado' ? 'cerradas' : actividad.estadoInscripciones ||
    (estadoEvento === 'publicado' || estadoEvento === 'en_curso' ? 'abiertas' : 'cerradas');
}

export function puedeAdministrarTaquilla(usuario: Usuario | null, evento: Evento): boolean {
  return Boolean(usuario?.estaActivo && usuario.roles.includes('organizador') && usuario.id === evento.idOrganizador);
}

export function impedimentoApertura(evento: Evento, actividad: FechaEvento, bloqueos: BloqueoRecinto[], ahora = Date.now()): string | undefined {
  if (evento.estado !== 'publicado') return 'ERR-TR-10 · El evento debe estar PUBLICADO antes de abrir inscripciones.';
  if (actividad.cancelada) return 'ERR-TR-10 · La actividad está CANCELADA.';
  const bloqueo = bloqueos.find(b => afectaBloqueo(b, actividad));
  if (actividad.suspendida || bloqueo) return `ERR-TR-10 · SUSPENDIDO: ${bloqueo?.titulo || 'Actividad pendiente de reprogramación'}.`;
  const fin = inicioEnMexico(actividad.fecha, actividad.horaFin);
  const limite = limiteInscripcionesActividad(actividad);
  if (!Number.isFinite(fin) || !Number.isFinite(limite)) return 'ERR-TR-10 · Revisa las fechas y horarios de la actividad.';
  if (fin <= ahora) return 'ERR-TR-10 · La actividad ya FINALIZÓ.';
  if (limite <= ahora) return 'ERR-TR-10 · Se alcanzó la fecha límite de inscripción de la actividad.';
}

export interface EstadoTaquilla {
  eventos: Evento[];
  reservaciones: Reservacion[];
  espera: EntradaListaEspera[];
  bloqueos: BloqueoRecinto[];
}

export interface CambioInscripciones {
  idEvento: string;
  idsFechaEvento: string[];
  nuevoEstado: EstadoInscripciones;
  idOrganizador: string;
  nombreOrganizador: string;
  versionesEsperadas?: Record<string, number>;
}

/** Proyecta el cambio por identificador de actividad, nunca por su día ni por el pase del evento. */
export function proyectarCambioInscripciones(actual: EstadoTaquilla, peticion: CambioInscripciones, usuario: Usuario | null, ahora = Date.now()) {
  const evento = actual.eventos.find(e => e.id === peticion.idEvento);
  if (!evento) throw new Error('ERR-TR-03 · El evento seleccionado no existe.');
  if (!puedeAdministrarTaquilla(usuario, evento) || usuario!.id !== peticion.idOrganizador)
    throw new Error('ERR-TR-02 · No estás autorizado para administrar las inscripciones de este evento.');
  if (!['abiertas', 'cerradas'].includes(peticion.nuevoEstado)) throw new Error('ERR-TR-05 · Estado de inscripción inválido.');
  const ids = new Set(peticion.idsFechaEvento);
  if (!ids.size) throw new Error('Selecciona al menos una actividad para continuar.');
  if (evento.estado === 'cancelado' || evento.estado === 'finalizado') throw new Error(`ERR-TR-10 · El evento está ${evento.estado.toUpperCase()}.`);
  for (const id of ids) {
    const actividad = evento.fechas.find(a => a.id === id);
    if (!actividad) throw new Error('ERR-TR-03 · Una de las actividades ya no existe.');
    const version = peticion.versionesEsperadas?.[id];
    if (version !== undefined && version !== (actividad.versionInscripciones || 0))
      throw new Error('ERR-TR-08 · El estado cambió mientras confirmabas. Recarga y vuelve a intentarlo.');
    if (actividad.cancelada || actividad.suspendida || actual.bloqueos.some(b => afectaBloqueo(b, actividad)))
      throw new Error('ERR-TR-10 · La actividad está CANCELADA o SUSPENDIDA.');
    if (estadoInscripcionesActividad(actividad, evento.estado) === peticion.nuevoEstado)
      throw new Error(`ERR-TR-10 · ${nombreActividad(actividad)} ya tiene inscripciones ${peticion.nuevoEstado.toUpperCase()}.`);
    if (peticion.nuevoEstado === 'abiertas') {
      const error = impedimentoApertura(evento, actividad, actual.bloqueos, ahora);
      if (error) throw new Error(error);
    }
  }
  const causa = peticion.nuevoEstado === 'abiertas' ? 'apertura_manual' as const : 'cierre_manual' as const;
  const pertenece = (registro: { idEvento: string; idFechaEvento: string }) => registro.idEvento === evento.id && ids.has(registro.idFechaEvento);
  return {
    ...actual,
    eventos: actual.eventos.map(e => e.id !== evento.id ? e : {
      ...e,
      fechas: e.fechas.map(a => !ids.has(a.id) ? a : {
        ...a, estadoInscripciones: peticion.nuevoEstado, versionInscripciones: (a.versionInscripciones || 0) + 1,
        historialInscripciones: [...(a.historialInscripciones || []), {
          id: `ins-${a.id}-${ahora}-${(a.versionInscripciones || 0) + 1}`, estado: peticion.nuevoEstado, fechaCambio: new Date(ahora).toISOString(),
          idResponsable: usuario!.id, responsable: usuario!.nombre, causa
        }]
      })
    }),
    reservaciones: actual.reservaciones.map(r => peticion.nuevoEstado === 'cerradas' && pertenece(r) && r.estado === 'apartado_temporal' ? { ...r, estado: 'cancelada' as const } : r),
    espera: actual.espera.map(e => peticion.nuevoEstado === 'cerradas' && pertenece(e) && e.estado === 'notificado' ? {
      ...e, estado: 'esperando' as const, fechaOferta: undefined, fechaExpiracionOferta: undefined,
      idReservacionOferta: undefined, idAsientoOferta: undefined, etiquetaAsientoOferta: undefined
    } : e),
    actividadesActualizadas: ids.size
  };
}

/** El vencimiento usa los límites de cada actividad y conserva las demás sin cambios. */
export function proyectarCierreAutomatico(actual: EstadoTaquilla, ahora = Date.now()) {
  const vencidas = new Set(actual.eventos.flatMap(e => ['publicado', 'en_curso'].includes(e.estado)
    ? e.fechas.filter(a => estadoInscripcionesActividad(a, e.estado) === 'abiertas' && limiteInscripcionesActividad(a) <= ahora).map(a => JSON.stringify([e.id, a.id])) : []));
  const pertenece = (r: { idEvento: string; idFechaEvento: string }) => vencidas.has(JSON.stringify([r.idEvento, r.idFechaEvento]));
  return {
    ...actual,
    actividadesActualizadas: vencidas.size,
    eventos: actual.eventos.map(e => ({ ...e, fechas: e.fechas.map(a => !vencidas.has(JSON.stringify([e.id, a.id])) ? a : {
      ...a, estadoInscripciones: 'cerradas' as const, versionInscripciones: (a.versionInscripciones || 0) + 1,
      historialInscripciones: [...(a.historialInscripciones || []), {
        id: `ins-auto-${a.id}-${ahora}-${(a.versionInscripciones || 0) + 1}`, estado: 'cerradas' as const, fechaCambio: new Date(ahora).toISOString(),
        idResponsable: 'sistema', responsable: 'Sistema Ticket Trade', causa: 'cierre_automatico' as const
      }]
    }) })),
    reservaciones: actual.reservaciones.map(r => pertenece(r) && r.estado === 'apartado_temporal' ? { ...r, estado: 'cancelada' as const } : r),
    espera: actual.espera.map(e => pertenece(e) && ['esperando', 'notificado'].includes(e.estado) ? { ...e, estado: 'cancelado' as const } : e)
  };
}

export interface DatosIndicadores {
  recintos: Recinto[];
  arreglos: ArregloAsientos[];
  reservaciones: Reservacion[];
  boletos: BoletoDigital[];
  espera: EntradaListaEspera[];
  escaneos: RegistroEscaneo[];
  intenciones: RegistroIntencionAsistencia[];
}

/** El aforo propio y el recinto/arreglo de la actividad tienen prioridad sobre la compatibilidad heredada. */
export function capacidadActividad(evento: Evento, actividad: FechaEvento, datos: Pick<DatosIndicadores, 'recintos' | 'arreglos'>): number {
  const recinto = datos.recintos.find(r => r.id === actividad.idRecinto);
  const arreglo = datos.arreglos.find(a => a.idFechaEvento === actividad.id && a.idRecinto === actividad.idRecinto && a.estado === 'version_final' && a.id === actividad.idArregloFinal) ||
    datos.arreglos.find(a => a.idFechaEvento === actividad.id && a.idRecinto === actividad.idRecinto && a.estado === 'version_final');
  const plazas = modalidadActividad(actividad, evento.modalidadAsistencia) === 'controlado' && arreglo
    ? arreglo.asientos.filter(a => !a.estaBloqueado && !a.estaEliminado && a.categoria !== 'sin_definir').length : undefined;
  const limites = [actividad.asistenciaEstimada, recinto?.capacidad, plazas].filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0);
  return Math.floor(limites.length ? Math.min(...limites) : Math.max(0, evento.aforoMaximo || 0));
}

export function registrosDeActividad(evento: Evento, actividad: FechaEvento, datos: DatosIndicadores, ahora = Date.now()) {
  const pertenece = (r: { idEvento: string; idFechaEvento: string }) => r.idEvento === evento.id && r.idFechaEvento === actividad.id;
  const boletos = datos.boletos.filter(pertenece);
  const especiales = boletos.filter(b => b.esEspecial);
  const idsEspeciales = new Set(especiales.map(b => b.idReservacion));
  const normales = datos.reservaciones.filter(r => pertenece(r) && !idsEspeciales.has(r.id) && !especiales.some(b => b.id === r.idBoleto));
  const apartados = normales.filter(r => r.estado === 'apartado_temporal' && (r.tiempoExpiracionApartado || 0) > ahora);
  const espera = datos.espera.filter(pertenece);
  const ofertas = espera.filter(e => e.estado === 'notificado' && (e.fechaExpiracionOferta || 0) > ahora && e.idAsientoOferta &&
    !apartados.some(r => r.id === e.idReservacionOferta || r.idAsiento === e.idAsientoOferta));
  const participaciones: RegistroEscaneo[] = [];
  const accesos = new Set<string>();
  for (const escaneo of datos.escaneos.filter(e => pertenece(e) && e.resultado === 'exito')) {
    const boleto = boletos.find(b => b.id === escaneo.idBoleto);
    const clave = boleto?.esEspecial ? boleto.id : boleto?.idUsuario || escaneo.idBoleto;
    if (accesos.has(clave)) continue;
    accesos.add(clave);
    participaciones.push(escaneo);
  }
  return { normales, especiales, apartados, espera, ofertas, participaciones, intenciones: datos.intenciones.filter(pertenece) };
}

export function indicadoresActividad(evento: Evento, actividad: FechaEvento, datos: DatosIndicadores, ahora = Date.now()) {
  const registros = registrosDeActividad(evento, actividad, datos, ahora);
  const aforo = capacidadActividad(evento, actividad, datos);
  const reservaciones = registros.normales.filter(r => r.estado === 'confirmada').length;
  const especiales = registros.especiales.filter(b => b.estado !== 'cancelado').length;
  const comprometidos = reservaciones + especiales + registros.apartados.length + registros.ofertas.length;
  return {
    fecha: actividad, aforo, reservaciones, especiales,
    cancelaciones: registros.normales.filter(r => r.estado === 'cancelada').length,
    espera: registros.espera.filter(e => e.estado === 'esperando' || e.estado === 'notificado').length,
    intenciones: registros.intenciones.length,
    asistencias: registros.participaciones.length,
    apartados: registros.apartados.length + registros.ofertas.length,
    disponibles: Math.max(0, aforo - comprometidos),
    ocupacion: aforo ? Math.min(100, Math.round(comprometidos / aforo * 100)) : 0
  };
}
