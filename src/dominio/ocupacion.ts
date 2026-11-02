import type { BoletoDigital, ConfiguracionAsiento, Evento, FechaEvento, Reservacion, Usuario } from '../tipos';
import { modalidadActividad } from './actividades';

export function puedeConsultarOcupacion(usuario: Usuario | null, evento: Evento): boolean {
  if (!usuario?.estaActivo) return false;
  return usuario.roles.includes('admin') ||
    (usuario.roles.includes('organizador') && evento.idOrganizador === usuario.id) ||
    (usuario.roles.includes('staff') && Boolean(usuario.eventosAsignadosStaff?.includes(evento.id)));
}

export function obtenerContextoOcupacion(eventos: Evento[], usuario: Usuario | null, idEvento?: string, idFecha?: string) {
  const eventosPermitidos = eventos.filter(evento => evento.estado === 'publicado' && puedeConsultarOcupacion(usuario, evento));
  const evento = idEvento ? eventosPermitidos.find(item => item.id === idEvento) : eventosPermitidos[0];
  const fecha = idFecha ? evento?.fechas.find(item => item.id === idFecha) : evento?.fechas[0];
  return { eventosPermitidos, evento, fecha };
}

// ---------------------------------------------------------------------------
// Monitor de ocupación por actividad
// El conteo de personas con entrada y el coloreado del mapa son independientes:
// una entrada válida cuenta aunque no tenga butaca, y el mapa solo colorea
// asientos que existen en la distribución final de la actividad.
// ---------------------------------------------------------------------------

type BoletoOcupacion = Pick<BoletoDigital, 'id' | 'idFechaEvento' | 'idUsuario' | 'idReservacion' | 'estado' | 'etiquetaAsiento'>;
type ReservacionOcupacion = Pick<Reservacion, 'id' | 'idFechaEvento' | 'estado' | 'idAsiento'>;
type AsientoOcupacion = Pick<ConfiguracionAsiento, 'id' | 'etiqueta'> & Partial<Pick<ConfiguracionAsiento, 'estaEliminado'>>;

export interface ResumenOcupacion {
  /** Personas distintas con entrada válida registrada en la actividad. */
  totalIngresados: number;
  /** De las anteriores, cuántas no tienen un asiento existente en el mapa. */
  ingresadosSinButaca: number;
  /** Personas distintas con acceso vigente o utilizado en la actividad. */
  totalConAcceso: number;
  /** Asientos existentes con entrada registrada (sin duplicados). */
  idsAsientosCheckIn: string[];
  /** Asientos existentes reservados que aún no registran entrada (sin duplicados). */
  idsAsientosReservados: string[];
}

/** Una misma persona cuenta una sola vez por actividad, aunque su QR se repita. */
const clavePersona = (boleto: BoletoOcupacion) => boleto.idUsuario || boleto.idReservacion || boleto.id;

export function resumirOcupacion(datos: {
  idActividad: string;
  boletos: BoletoOcupacion[];
  reservaciones: ReservacionOcupacion[];
  asientos?: AsientoOcupacion[];
}): ResumenOcupacion {
  const { idActividad } = datos;
  const asientos = (datos.asientos || []).filter((asiento) => !asiento.estaEliminado);
  const idsExistentes = new Set(asientos.map((asiento) => asiento.id));
  const reservasPorId = new Map(datos.reservaciones.map((reserva) => [reserva.id, reserva]));
  // Solo se usa la etiqueta cuando identifica un único asiento del mapa.
  const asientoPorEtiqueta = (etiqueta?: string) => {
    if (!etiqueta) return undefined;
    const coincidencias = asientos.filter((asiento) => asiento.etiqueta === etiqueta);
    return coincidencias.length === 1 ? coincidencias[0].id : undefined;
  };
  const asientoDelBoleto = (boleto: BoletoOcupacion) => {
    const idAsiento = reservasPorId.get(boleto.idReservacion)?.idAsiento;
    if (idAsiento) return idsExistentes.has(idAsiento) ? idAsiento : undefined;
    return asientoPorEtiqueta(boleto.etiquetaAsiento);
  };

  const boletosActividad = datos.boletos.filter((boleto) => boleto.idFechaEvento === idActividad);
  const personasIngresadas = new Map<string, string | undefined>();
  for (const boleto of boletosActividad.filter((item) => item.estado === 'utilizado')) {
    const clave = clavePersona(boleto);
    personasIngresadas.set(clave, personasIngresadas.get(clave) || asientoDelBoleto(boleto));
  }
  const idsAsientosCheckIn = [...new Set([...personasIngresadas.values()].filter((id): id is string => Boolean(id)))];
  const ocupados = new Set(idsAsientosCheckIn);
  const idsAsientosReservados = [...new Set(datos.reservaciones
    .filter((reserva) => reserva.idFechaEvento === idActividad && reserva.estado === 'confirmada' && reserva.idAsiento)
    .map((reserva) => reserva.idAsiento!)
    .filter((idAsiento) => idsExistentes.has(idAsiento) && !ocupados.has(idAsiento)))];

  return {
    totalIngresados: personasIngresadas.size,
    ingresadosSinButaca: [...personasIngresadas.values()].filter((idAsiento) => !idAsiento).length,
    totalConAcceso: new Set(boletosActividad.filter((boleto) => boleto.estado === 'valido' || boleto.estado === 'utilizado').map(clavePersona)).size,
    idsAsientosCheckIn,
    idsAsientosReservados,
  };
}

export type TipoMonitor = 'mapa' | 'sin_distribucion' | 'sin_control';

/**
 * Regla del monitor por actividad:
 * - Aforo controlado con distribución final: conteo de entradas + mapa de asientos.
 * - Aforo controlado sin distribución final: se admite; las entradas se cuentan por
 *   persona sin asignarles butaca y no se muestra mapa.
 * - Entrada libre o registro informativo: no hay boletos ni Check-in, no hay monitor.
 */
export function reglaMonitorActividad(
  evento: Pick<Evento, 'modalidadAsistencia'>,
  actividad: Pick<FechaEvento, 'modalidadAsistencia'>,
  tieneDistribucionFinal: boolean,
): { tipo: TipoMonitor; mensaje: string } {
  if (modalidadActividad(actividad, evento.modalidadAsistencia) !== 'controlado') {
    return { tipo: 'sin_control', mensaje: 'Esta actividad no usa control de acceso con boleto, por lo que no tiene monitor de ocupación.' };
  }
  if (!tieneDistribucionFinal) {
    return { tipo: 'sin_distribucion', mensaje: 'Esta actividad no tiene distribución de lugares. Las entradas se cuentan por persona, sin asignarles butaca.' };
  }
  return { tipo: 'mapa', mensaje: 'El mapa colorea solo asientos existentes. Las entradas sin butaca se cuentan en el total, pero no se dibujan.' };
}
