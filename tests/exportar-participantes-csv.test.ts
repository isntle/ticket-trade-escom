import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENCABEZADOS_PARTICIPANTES_CSV,
  escaparCeldaCsv,
  formatearReferenciaInternaSegura,
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
    referencia: 'ref-esp-309',
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
  it('usa exactamente las 7 columnas acordadas', () => {
    assert.deepEqual(ENCABEZADOS_PARTICIPANTES_CSV, [
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
    assert.equal(resultado.length, 1);
    assert.equal(resultado[0].id, '2');
  });

  it('conserva acentos con UTF-8 BOM, escapa comillas y protege fórmulas', () => {
    const csv = generarCsvParticipantesAutorizados(DATOS_PRUEBA, { idActividad: 'todas' });
    const lineas = csv.split('\r\n');
    assert.ok(csv.startsWith('\uFEFF'));
    assert.equal(lineas.length, 4); // encabezado + 3 autorizados (excluye id 4)
    assert.ok(csv.includes('Ángel Ramírez'));
    assert.ok(csv.includes('"María José ""Núñez"""'));
    assert.ok(csv.includes("'=FORMULA_INYECTADA()"));
    assert.ok(!csv.includes('Cancelado o En Espera'));
  });

  it('solo exporta folios de la base y descarta identificadores con códigos', () => {
    assert.equal(formatearReferenciaInternaSegura('ref-res-120'), 'ref-res-120');
    assert.equal(formatearReferenciaInternaSegura('ref-esp-420'), 'ref-esp-420');
    assert.equal(formatearReferenciaInternaSegura('ref-res-esp-TT-H8D5E'), 'Sin referencia');
  });

  it('protege celdas con prefijos de fórmula y respeta saltos de línea', () => {
    assert.equal(escaparCeldaCsv('+1-555-0100'), "'+1-555-0100");
    assert.equal(escaparCeldaCsv(' @SUM(A1)'), "' @SUM(A1)");
    assert.equal(escaparCeldaCsv('Línea A\nLínea B'), '"Línea A\nLínea B"');
  });
});
