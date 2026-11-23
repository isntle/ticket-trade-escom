import { nombreActividad } from '../dominio/actividades.js';
import { puedeAdministrarTaquilla } from '../dominio/taquilla.js';
import type { BoletoDigital, Evento, Recinto, Reservacion, Usuario } from '../tipos/index.js';

export type CategoriaParticipanteCsv = 'General' | 'VIP' | 'Staff';
export type EstadoParticipanteCsv = 'Confirmado' | 'Vigente' | 'Acceso registrado';

export interface ParticipanteAutorizadoCsv {
  id: string;
  idActividad: string;
  actividad: string;
  fechaHorario: string;
  recinto: string;
  participante: string;
  referencia: string;
  categoria: CategoriaParticipanteCsv;
  estado: EstadoParticipanteCsv;
  autorizado: boolean;
}

export interface FiltrosParticipantesCsv {
  idActividad?: string;
  categoria?: 'todas' | CategoriaParticipanteCsv;
  estado?: 'todos' | EstadoParticipanteCsv;
  busqueda?: string;
}

export const ENCABEZADOS_PARTICIPANTES_CSV = [
  'Actividad',
  'Fecha y horario',
  'Recinto',
  'Participante',
  'Referencia',
  'Categoría',
  'Estado'
] as const;

const INICIO_FORMULA = /^(?:\s*[=+\-@＝＋－＠]|[\t\r\n])/;
const REFERENCIA_INTERNA = /^ref-(?:res|esp)-[1-9]\d*$/;

export function participantesAutorizadosDeEvento(
  usuario: Usuario | null,
  evento: Evento,
  idsActividad: ReadonlySet<string>,
  recintos: readonly Recinto[],
  reservas: readonly Reservacion[],
  boletos: readonly BoletoDigital[],
): ParticipanteAutorizadoCsv[] {
  if (!puedeAdministrarTaquilla(usuario, evento) || evento.estado === 'cancelado') return [];
  const actividades = new Map(evento.fechas
    .filter(actividad => idsActividad.has(actividad.id) && !actividad.cancelada)
    .map(actividad => [actividad.id, actividad]));
  const nombresRecintos = new Map(recintos.map(recinto => [recinto.id, recinto.nombre]));
  const reservaciones = new Map(reservas
    .filter(reserva => reserva.idEvento === evento.id && reserva.estado === 'confirmada')
    .map(reserva => [reserva.id, reserva]));
  const registros: ParticipanteAutorizadoCsv[] = [];
  for (const boleto of boletos) {
    const actividad = actividades.get(boleto.idFechaEvento);
    if (!actividad || boleto.idEvento !== evento.id || boleto.estado === 'cancelado') continue;
    const reserva = reservaciones.get(boleto.idReservacion);
    if (!boleto.esEspecial && reserva?.idFechaEvento !== actividad.id) continue;
    // En el demo local el identificador de un boleto especial puede incluir su código de acceso.
    const referencia = boleto.esEspecial
      ? 'ref-' + boleto.idReservacion
      : 'ref-res-' + boleto.idReservacion;
    registros.push({
      id: boleto.id,
      idActividad: actividad.id,
      actividad: nombreActividad(actividad),
      fechaHorario: actividad.fecha + ' ' + actividad.horaInicio + '–' + actividad.horaFin,
      recinto: nombresRecintos.get(actividad.idRecinto) || 'Recinto no disponible',
      participante: boleto.nombreUsuario,
      referencia: formatearReferenciaInternaSegura(referencia),
      categoria: !boleto.esEspecial ? 'General' : boleto.tipoEspecial === 'vip' ? 'VIP' : 'Staff',
      estado: boleto.estado === 'utilizado' ? 'Acceso registrado' : boleto.esEspecial ? 'Vigente' : 'Confirmado',
      autorizado: true,
    });
  }
  return registros;
}

export function protegerValorFormulaCsv(valor: unknown): string {
  const texto = String(valor ?? '');
  return INICIO_FORMULA.test(texto) ? `'${texto}` : texto;
}

export function escaparCeldaCsv(valor: unknown): string {
  const protegido = protegerValorFormulaCsv(valor);
  const escapado = protegido.replace(/"/g, '""');
  return /[",\r\n]/.test(escapado) ? `"${escapado}"` : escapado;
}

export function formatearReferenciaInternaSegura(idInterno: string): string {
  return REFERENCIA_INTERNA.test(idInterno) ? idInterno : 'Sin referencia';
}

export function filtrarParticipantesAutorizadosCsv(
  registros: readonly ParticipanteAutorizadoCsv[],
  filtros: FiltrosParticipantesCsv = {}
): ParticipanteAutorizadoCsv[] {
  const termino = (filtros.busqueda ?? '').trim().toLowerCase();

  return registros.filter((registro) => {
    if (!registro.autorizado) return false;
    if (filtros.idActividad && filtros.idActividad !== 'todas' && registro.idActividad !== filtros.idActividad) {
      return false;
    }
    if (filtros.categoria && filtros.categoria !== 'todas' && registro.categoria !== filtros.categoria) {
      return false;
    }
    if (filtros.estado && filtros.estado !== 'todos' && registro.estado !== filtros.estado) {
      return false;
    }
    if (termino) {
      const coincide =
        registro.participante.toLowerCase().includes(termino) ||
        registro.referencia.toLowerCase().includes(termino) ||
        registro.actividad.toLowerCase().includes(termino) ||
        registro.recinto.toLowerCase().includes(termino);
      if (!coincide) return false;
    }
    return true;
  });
}

export function generarCsvParticipantesAutorizados(
  registros: readonly ParticipanteAutorizadoCsv[],
  filtros: FiltrosParticipantesCsv = {}
): string {
  const filtrados = filtrarParticipantesAutorizadosCsv(registros, filtros);
  const filaEncabezados = ENCABEZADOS_PARTICIPANTES_CSV.map((col) => escaparCeldaCsv(col)).join(',');
  const filas = filtrados.map((item) =>
    [
      item.actividad,
      item.fechaHorario,
      item.recinto,
      item.participante,
      formatearReferenciaInternaSegura(item.referencia),
      item.categoria,
      item.estado
    ]
      .map((celda) => escaparCeldaCsv(celda))
      .join(',')
  );

  return `\uFEFF${[filaEncabezados, ...filas].join('\r\n')}`;
}
