import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGLA_INGRESO_ACTIVIDAD, agruparActividadesPorDia, coincideConSeleccion, describirActividad,
  etiquetaOpcionActividad, fechaLegible, horaOficial,
} from '../src/dominio/presentacionActividad';
import { inicioEnMexico } from '../src/dominio/solicitudes';

const manana = { id: 'act-a', fecha: '2026-10-24', horaInicio: '09:00', horaFin: '11:00', idRecinto: 'rec-auditorio', nombreActividad: 'Conferencia inaugural' };
const tarde = { id: 'act-b', fecha: '2026-10-24', horaInicio: '12:00', horaFin: '14:00', idRecinto: 'rec-sala14', nombreActividad: 'Taller de GPU' };
const otroDia = { id: 'act-c', fecha: '2026-10-25', horaInicio: '09:00', horaFin: '11:00', idRecinto: 'rec-auditorio', nombreActividad: 'Clausura' };

test('dos actividades del mismo evento y fecha quedan en un día y se distinguen', () => {
  const dias = agruparActividadesPorDia([manana, tarde, otroDia]);
  assert.equal(dias.length, 2);
  assert.deepEqual(dias[0].actividades.map(({ actividad }) => actividad.id), ['act-a', 'act-b']);
  assert.match(dias[0].etiqueta, /^Día 1 · /);
  assert.match(dias[1].etiqueta, /^Día 2 · /);
  const a = etiquetaOpcionActividad(manana, 0, 'Auditorio');
  const b = etiquetaOpcionActividad(tarde, 1, 'Sala 14');
  assert.notEqual(a, b);
  assert.match(a, /Conferencia inaugural · 09:00–11:00 h · Auditorio/);
  assert.match(b, /Taller de GPU · 12:00–14:00 h · Sala 14/);
});

test('la descripción incluye fecha, horario y recinto sin desfase de zona horaria', () => {
  assert.match(fechaLegible('2026-10-24'), /24/);
  assert.match(describirActividad(manana, 'Auditorio'), /24.*09:00–11:00 h · Auditorio$/);
  assert.match(describirActividad(manana), /Recinto por confirmar$/);
  assert.match(etiquetaOpcionActividad({ ...manana, nombreActividad: undefined }, 2), /^Actividad 3 · /);
});

test('el filtro por identificadores no mezcla entradas de actividades del mismo día', () => {
  const registros = [
    { id: 'r1', idEvento: 'evt-1', idFechaEvento: 'act-a' },
    { id: 'r2', idEvento: 'evt-1', idFechaEvento: 'act-b' },
    { id: 'r3', idEvento: 'evt-2', idFechaEvento: 'act-x' },
  ];
  assert.deepEqual(registros.filter((r) => coincideConSeleccion(r, 'evt-1', 'act-a')).map((r) => r.id), ['r1']);
  assert.deepEqual(registros.filter((r) => coincideConSeleccion(r, 'evt-1', 'act-b')).map((r) => r.id), ['r2']);
  assert.deepEqual(registros.filter((r) => coincideConSeleccion(r, 'evt-1', 'todos')).map((r) => r.id), ['r1', 'r2']);
  assert.equal(registros.filter((r) => coincideConSeleccion(r, 'todos', 'todos')).length, 3);
});

test('la ventana de ingreso se explica sin ampliarla: abre 30 minutos antes en hora oficial', () => {
  const apertura = inicioEnMexico('2026-10-24', '09:00') - 30 * 60 * 1000;
  assert.equal(horaOficial(apertura), '08:30');
  assert.match(REGLA_INGRESO_ACTIVIDAD, /30 minutos antes del inicio y cierra al terminar la actividad/);
});
