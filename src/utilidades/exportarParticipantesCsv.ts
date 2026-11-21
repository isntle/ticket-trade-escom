export interface ParticipanteActividadCsv {
  id: string;
  idActividad: string;
  actividad: string;
  fechaHorario: string;
  recinto: string;
  participante: string;
  referencia: string;
  categoria: string;
  estado: string;
  autorizado: boolean;
  observaciones?: string;
}

export interface FiltrosExportacionCsv {
  idActividad?: string;
  categoria?: string;
  estado?: string;
  busqueda?: string;
}

export interface ContratoParticipantesCsv {
  acordado: boolean;
  fuenteCompleta: boolean;
  columnas: ReadonlyArray<{
    clave: keyof Omit<ParticipanteActividadCsv, 'id' | 'idActividad' | 'autorizado'>;
    encabezado: string;
  }>;
}

export const CONTRATO_BASE_PARTICIPANTES_CSV: ContratoParticipantesCsv = {
  acordado: false,
  fuenteCompleta: false,
  columnas: [
    { clave: 'actividad', encabezado: 'Actividad' },
    { clave: 'fechaHorario', encabezado: 'Fecha y horario' },
    { clave: 'recinto', encabezado: 'Recinto' },
    { clave: 'participante', encabezado: 'Participante' },
    { clave: 'referencia', encabezado: 'Referencia' },
    { clave: 'categoria', encabezado: 'Categoría' },
    { clave: 'estado', encabezado: 'Estado' },
    { clave: 'observaciones', encabezado: 'Observaciones' }
  ]
};

const INICIO_FORMULA = /^(?:[\t\r ]*[=+\-@]|[\t\r])/;

export function protegerValorFormulaCsv(valor: unknown): string {
  const texto = String(valor ?? '');
  return INICIO_FORMULA.test(texto) ? `'${texto}` : texto;
}

export function escaparCeldaCsv(valor: unknown): string {
  const protegido = protegerValorFormulaCsv(valor);
  const conComillasDobles = protegido.replace(/"/g, '""');
  return /[",\r\n]/.test(conComillasDobles) ? `"${conComillasDobles}"` : conComillasDobles;
}

export function puedeExponerDescargaCsv(contrato: ContratoParticipantesCsv): boolean {
  return contrato.acordado && contrato.fuenteCompleta && contrato.columnas.length > 0;
}

export function filtrarParticipantesAutorizados(
  registros: readonly ParticipanteActividadCsv[],
  filtros: FiltrosExportacionCsv = {}
): ParticipanteActividadCsv[] {
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
        registro.actividad.toLowerCase().includes(termino);
      if (!coincide) return false;
    }
    return true;
  });
}

export function generarCsvParticipantesAutorizados(
  registros: readonly ParticipanteActividadCsv[],
  filtros: FiltrosExportacionCsv = {},
  contrato: ContratoParticipantesCsv = CONTRATO_BASE_PARTICIPANTES_CSV
): string {
  const filtrados = filtrarParticipantesAutorizados(registros, filtros);
  const encabezados = contrato.columnas.map((col) => escaparCeldaCsv(col.encabezado)).join(',');
  const filas = filtrados.map((registro) =>
    contrato.columnas.map((col) => escaparCeldaCsv(registro[col.clave] ?? '')).join(',')
  );
  return `\uFEFF${[encabezados, ...filas].join('\r\n')}`;
}