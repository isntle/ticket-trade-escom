import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTRATO_BASE_PARTICIPANTES_CSV,
  escaparCeldaCsv,
  filtrarParticipantesAutorizados,
  generarCsvParticipantesAutorizados,
  puedeExponerDescargaCsv,
  type ParticipanteActividadCsv
} from '../src/utilidades/exportarParticipantesCsv';

const MUESTRA: ParticipanteActividadCsv[] = [
  {
    id: '1',
    idActividad: 'act-1',
    actividad: 'Taller de Ciberseguridad',
    fechaHorario: '2026-11-21 09:00–11:00',
    recinto: 'Laboratorio 3',
    participante: 'Ángel Ramírez',
    referencia: 'BOL-101',
    categoria: 'reservaciones',
    estado: 'activo',
    autorizado: true,
    observaciones: 'Trae laptop; "equipo 1"'
  },
  {
    id: '2',
    idActividad: 'act-2',
    actividad: 'Simposio de IA',
    fechaHorario: '2026-11-21 11:30–13:30',
    recinto: 'Auditorio Principal',
    participante: 'María José Núñez',
    referencia: 'VIP-004',
    categoria: 'especiales',
    estado: 'activo',
    autorizado: true,
    observaciones: '=SUMA(A1:A2)'
  },
  {
    id: '3',
    idActividad: 'act-2',
    actividad: 'Simposio de IA',
    fechaHorario: '2026-11-21 11:30–13:30',
    recinto: 'Auditorio Principal',
    participante: 'Usuario No Autorizado',
    referencia: 'CAN-009',
    categoria: 'cancelaciones',
    estado: 'cancelado',
    autorizado: false,
    observaciones: '+1234'
  }
];

describe('exportarParticipantesCsv', () => {
  it('no expone la descarga mientras el contrato no esté acordado y completo', () => {
    assert.equal(puedeExponerDescargaCsv(CONTRATO_BASE_PARTICIPANTES_CSV), false);
    assert.equal(
      puedeExponerDescargaCsv({
        ...CONTRATO_BASE_PARTICIPANTES_CSV,
        acordado: true,
        fuenteCompleta: true
      })
    , true);
  });

  it('respeta los filtros de actividad, categoría, estado, búsqueda y excluye no autorizados', () => {
    const filtrados = filtrarParticipantesAutorizados(MUESTRA, {
      idActividad: 'act-2',
      categoria: 'especiales',
      estado: 'activo',
      busqueda: 'núñez'
    });
    assert.equal(filtrados.length, 1);
    assert.equal(filtrados[0].participante, 'María José Núñez');
  });

  it('conserva acentos con UTF-8 BOM, escapa comillas y neutraliza fórmulas', () => {
    const csv = generarCsvParticipantesAutorizados(MUESTRA, { idActividad: 'todas' });
    assert.equal(csv.startsWith('\uFEFF'), true);
    assert.ok(csv.includes('Ángel Ramírez'));
    assert.ok(csv.includes('María José Núñez'));
    assert.ok(csv.includes('"Trae laptop; ""equipo 1"""'));
    assert.ok(csv.includes("'=SUMA(A1:A2)"));
    assert.ok(!csv.includes('Usuario No Autorizado'));
  });

  it('conserva guiones intermedios en fechas/folios pero protege fórmulas con espacios o saltos y saltos de línea en celdas', () => {
    assert.equal(escaparCeldaCsv('2026-11-21'), '2026-11-21');
    assert.equal(escaparCeldaCsv('BOL-101'), 'BOL-101');
    assert.equal(escaparCeldaCsv(' =CMD()'), "' =CMD()");
    assert.equal(escaparCeldaCsv('Línea 1\nLínea 2'), '"Línea 1\nLínea 2"');
  });
});