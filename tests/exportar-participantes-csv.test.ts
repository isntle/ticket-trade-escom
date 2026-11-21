import { describe, expect, it } from 'vitest';
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
    expect(puedeExponerDescargaCsv(CONTRATO_BASE_PARTICIPANTES_CSV)).toBe(false);
    expect(
      puedeExponerDescargaCsv({
        ...CONTRATO_BASE_PARTICIPANTES_CSV,
        acordado: true,
        fuenteCompleta: true
      })
    ).toBe(true);
  });

  it('respeta los filtros de actividad, categoría, estado, búsqueda y excluye no autorizados', () => {
    const filtrados = filtrarParticipantesAutorizados(MUESTRA, {
      idActividad: 'act-2',
      categoria: 'especiales',
      estado: 'activo',
      busqueda: 'núñez'
    });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].participante).toBe('María José Núñez');
  });

  it('conserva acentos con UTF-8 BOM, escapa comillas y neutraliza fórmulas', () => {
    const csv = generarCsvParticipantesAutorizados(MUESTRA, { idActividad: 'todas' });
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Ángel Ramírez');
    expect(csv).toContain('María José Núñez');
    expect(csv).toContain('"Trae laptop; ""equipo 1"""');
    expect(csv).toContain("'=SUMA(A1:A2)");
    expect(csv).not.toContain('Usuario No Autorizado');
  });

  it('conserva guiones intermedios en fechas/folios pero protege fórmulas con espacios o saltos y saltos de línea en celdas', () => {
    expect(escaparCeldaCsv('2026-11-21')).toBe('2026-11-21');
    expect(escaparCeldaCsv('BOL-101')).toBe('BOL-101');
    expect(escaparCeldaCsv(' =CMD()')).toBe("' =CMD()");
    expect(escaparCeldaCsv('Línea 1\nLínea 2')).toBe('"Línea 1\nLínea 2"');
  });
});