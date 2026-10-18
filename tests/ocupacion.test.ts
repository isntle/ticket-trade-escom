import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTOS_INICIALES, USUARIOS_INICIALES } from '../src/datos/datosIniciales';
import { obtenerContextoOcupacion, puedeConsultarOcupacion } from '../src/dominio/ocupacion';

const simposio = EVENTOS_INICIALES.find(e => e.id === 'evt-simposio-ia')!;
const staff = USUARIOS_INICIALES.find(u => u.id === 'usr-andrea')!;
const organizador = USUARIOS_INICIALES.find(u => u.id === 'usr-silva')!;
const ajeno = { ...simposio, id: 'evento-ajeno', idOrganizador: 'otro' };
const eventos = [simposio, ajeno];

test('Staff ve solo asignados y Organizador solo propios; ni titularidad ni asignación bastan sin rol', () => {
  assert.equal(puedeConsultarOcupacion(staff, simposio), true);
  assert.equal(puedeConsultarOcupacion(staff, ajeno), false);
  assert.equal(puedeConsultarOcupacion(organizador, simposio), true);
  assert.equal(puedeConsultarOcupacion(organizador, ajeno), false);
  assert.equal(puedeConsultarOcupacion({ ...organizador, roles: ['asistente'] }, simposio), false);
  assert.equal(puedeConsultarOcupacion({ ...staff, roles: ['asistente'] }, simposio), false);
  assert.equal(puedeConsultarOcupacion({ ...staff, estaActivo: false }, simposio), false);
  assert.equal(puedeConsultarOcupacion(null, simposio), false);
});
test('la ruta ajena o inexistente no cae silenciosamente en otro evento o día', () => {
  assert.equal(obtenerContextoOcupacion(eventos, staff, ajeno.id).evento, undefined);
  assert.equal(obtenerContextoOcupacion(eventos, staff, 'inexistente').evento, undefined);
  assert.equal(obtenerContextoOcupacion(eventos, staff, simposio.id, 'dia-ajeno').fecha, undefined);
  assert.deepEqual(obtenerContextoOcupacion(eventos, staff).eventosPermitidos.map(e => e.id), [simposio.id]);
});
test('retirar la asignación o el estado publicado oculta inmediatamente el recurso', () => {
  assert.equal(obtenerContextoOcupacion(eventos, { ...staff, eventosAsignadosStaff: [] }, simposio.id).evento, undefined);
  assert.equal(obtenerContextoOcupacion([{ ...simposio, estado: 'cancelado' }], staff, simposio.id).evento, undefined);
});
test('Administración conserva consulta institucional y los días siempre pertenecen al evento permitido', () => {
  const admin = USUARIOS_INICIALES.find(u => u.id === 'usr-admin')!;
  assert.equal(obtenerContextoOcupacion(eventos, admin).eventosPermitidos.length, 2);
  assert.equal(obtenerContextoOcupacion(eventos, staff, simposio.id, simposio.fechas[1].id).fecha?.id, simposio.fechas[1].id);
});
