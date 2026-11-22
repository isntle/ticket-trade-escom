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
  categoria?: 'todas' | CategoriaParticipanteCsv | string;
  estado?: 'todos' | EstadoParticipanteCsv | string;
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

export interface EstadoContratoCsv {
  contratoAcordado: boolean;
  conjuntoValidadoPorRolYActividad: boolean;
  botonHabilitado: boolean;
}

export const ESTADO_CONTRATO_CSV_ACTUAL: EstadoContratoCsv = {
  contratoAcordado: true,
  conjuntoValidadoPorRolYActividad: false,
  botonHabilitado: false
};

const INICIO_FORMULA = /^(?:[\t\r ]*[=+\-@]|[\t\r])/;

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
  const limpio = String(idInterno ?? '').trim() || 'sin-ref';
  return limpio.startsWith('ref-') ? limpio : `ref-${limpio}`;
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