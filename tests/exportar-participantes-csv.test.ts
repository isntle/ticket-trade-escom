import { describe, expect, it } from 'vitest';
import {
  ENCABEZADOS_PARTICIPANTES_CSV,
  ESTADO_CONTRATO_CSV_ACTUAL,
  escaparCeldaCsv,
  filtrarParticipantesAutorizadosCsv,
  generarCsvParticipantesAutorizados,
  type ParticipanteAutorizadoCsv
} from '../src/utilidades/exportarParticipantesCsv';

const DATOS_PRUEBA: ParticipanteAutorizadoCsv[] = [
  {
    id: '1',
    idActividad: 'act-1',
    actividad: 'Taller de Ciberseguridad',
    fechaHorario: '2026-11-21 09:00–11:00',
    recinto: 'Laboratorio 3',
    participante: 'Ángel Ramírez',
    referencia: 'ref-res-101',
    categoria: 'General',
    estado: 'Acceso registrado',
    autorizado: true
  },
  {
    id: '2',
    idActividad: 'act-2',
    actividad: 'Simposio de IA',
    fechaHorario: '2026-11-21 11:30–13:30',
    recinto: 'Auditorio Principal',
    participante: 'María José "Núñez"',
    referencia: 'ref-esp-204',
    categoria: 'VIP',
    estado: 'Vigente',
    autorizado: true
  },
  {
    id: '3',
    idActividad: 'act-2',
    actividad: 'Simposio de IA',
    fechaHorario: '2026-11-21 11:30–13:30',
    recinto: 'Auditorio Principal',
    participante: '=FORMULA_INYECTADA()',
    referencia: 'ref-stf-309',
    categoria: 'Staff',
    estado: 'Confirmado',
    autorizado: true
  },
  {
    id: '4',
    idActividad: 'act-2',
    actividad: 'Simposio de IA',
    fechaHorario: '2026-11-21 11:30–13:30',
    recinto: 'Auditorio Principal',
    participante: 'Cancelado o En Espera',
    referencia: 'ref-no-999',
    categoria: 'General',
    estado: 'Confirmado',
    autorizado: false
  }
];

describe('exportarParticipantesCsv - contrato acordado con Luis', () => {
  it('mantiene el botón deshabilitado hasta validar el conjunto completo por actividad y rol', () => {
    expect(ESTADO_CONTRATO_CSV_ACTUAL.contratoAcordado).toBe(true);
    expect(ESTADO_CONTRATO_CSV_ACTUAL.botonHabilitado).toBe(false);
  });

  it('usa exactamente las 7 columnas acordadas', () => {
    expect(ENCABEZADOS_PARTICIPANTES_CSV).toEqual([
      'Actividad',
      'Fecha y horario',
      'Recinto',
      'Participante',
      'Referencia',
      'Categoría',
      'Estado'
    ]);
  });

  it('respeta los filtros activos y excluye registros no autorizados', () => {
    const resultado = filtrarParticipantesAutorizadosCsv(DATOS_PRUEBA, {
      idActividad: 'act-2',
      categoria: 'VIP',
      estado: 'Vigente',
      busqueda: 'núñez'
    });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('2');
  });

  it('conserva acentos con UTF-8 BOM, escapa comillas y protege fórmulas', () => {
    const csv = generarCsvParticipantesAutorizados(DATOS_PRUEBA, { idActividad: 'todas' });
    const lineas = csv.split('\r\n');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lineas).toHaveLength(4); // encabezado + 3 autorizados (excluye id 4)
    expect(csv).toContain('Ángel Ramírez');
    expect(csv).toContain('"María José ""Núñez"""');
    expect(csv).toContain("'=FORMULA_INYECTADA()");
    expect(csv).not.toContain('Cancelado o En Espera');
  });

  it('protege celdas con prefijos de fórmula y respeta saltos de línea', () => {
    expect(escaparCeldaCsv('+1-555-0100')).toBe("'+1-555-0100");
    expect(escaparCeldaCsv(' @SUM(A1)')).toBe("' @SUM(A1)");
    expect(escaparCeldaCsv('Línea A\nLínea B')).toBe('"Línea A\nLínea B"');
  });
});