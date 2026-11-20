import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServicioConfiguracionRecintos } from '../src/servicios/configuracionRecintos';
import { transporteApi } from '../src/servicios/http';
import { afectaBloqueo } from '../src/dominio/bloqueos';
import { datosCalendario } from '../backend/modulos/organizacion/calendario';
import { exigirPermisoBloqueo } from '../backend/modulos/organizacion/bloqueos';

test('calendario rechaza fechas imposibles y días vacíos; normaliza duplicados', () => {
  assert.throws(() => datosCalendario({ diasLaborables: [], diasInhabiles: [] }), /día laborable/);
  assert.throws(() => datosCalendario({ diasLaborables: [1], diasInhabiles: ['2030-02-30'] }), /fechas inhábiles/);
  assert.throws(() => datosCalendario({ diasLaborables: 'lunes', diasInhabiles: [] }), /Revisa/);
  assert.deepEqual(datosCalendario({ diasLaborables: [5, 1, 1], diasInhabiles: ['2030-01-01', '2030-01-01'] }).diasLaborables, [1, 5]);
});

test('cada tipo de bloqueo exige el rol institucional correspondiente', () => {
  assert.throws(() => exigirPermisoBloqueo({ roles: ['admin'] }, 'Institucional'), /Subdirección/);
  assert.throws(() => exigirPermisoBloqueo({ roles: ['subdireccion'] }, 'Mantenimiento'), /Administración/);
  assert.throws(() => exigirPermisoBloqueo({ roles: ['organizador'] }, 'Fuera de servicio'), /Administración/);
  exigirPermisoBloqueo({ roles: ['subdireccion'] }, 'Institucional');
  exigirPermisoBloqueo({ roles: ['admin'] }, 'Fuera de servicio');
});

test('un error HTTP, de red o una respuesta sin confirmación nunca anuncia guardado ni refresca', async () => {
  for (const respuesta of [new Response(JSON.stringify({ error: { mensaje: 'No autorizado' } }), { status: 403 }),
    new Response(JSON.stringify({ error: { mensaje: 'Error del servidor' } }), { status: 500 }),
    new Response(JSON.stringify({ datos: { exito: false } })), new Response('<html>Error</html>')]) {
    let recargas = 0;
    const servicio = crearServicioConfiguracionRecintos(transporteApi('/api', async () => respuesta), async () => { recargas++; });
    const r = await servicio.cancelarBloqueoInstitucional('1', 'Prueba', 1);
    assert.equal(r.exito, false); assert.ok(r.error); assert.equal(recargas, 0);
  }
  const servicio = crearServicioConfiguracionRecintos(transporteApi('/api', async () => { throw new Error('Sin conexión'); }));
  assert.equal((await servicio.guardarCalendarioRevision({ diasLaborables: [1], diasInhabiles: [], responsable: '', fechaConfiguracion: '' })).exito, false);
});

test('distingue un guardado confirmado de un fallo posterior al recargar', async () => {
  const servicio = crearServicioConfiguracionRecintos(transporteApi('/api', async () => new Response(JSON.stringify({ datos: { exito: true, id: '17', version: 2 } }))), async () => { throw new Error('Fallo de lectura'); });
  const r = await servicio.cancelarBloqueoInstitucional('17', 'Finalizó', 1);
  assert.equal(r.exito, true); assert.equal(r.version, 2); assert.match(r.advertencia!, /confirmó el guardado/);
});

test('el cliente espera la confirmación y no acepta una revisión incompleta', async () => {
  let resolver!: (r: Response) => void;
  const servicio = crearServicioConfiguracionRecintos(transporteApi('/api', () => new Promise(r => { resolver = r; })));
  let terminado = false;
  const operacion = servicio.cancelarBloqueoInstitucional('1', 'Finalizó', 1).then(r => { terminado = true; return r; });
  await Promise.resolve(); assert.equal(terminado, false);
  resolver(new Response(JSON.stringify({ datos: { exito: true } })));
  assert.equal((await operacion).exito, true);
  const incompleto = crearServicioConfiguracionRecintos(transporteApi('/api', async () => new Response(JSON.stringify({ datos: { afectados: [] } }))));
  assert.match((await incompleto.revisarBloqueoInstitucional({} as any)).error!, /no confirmó/);
});

test('un fin previsto no libera la ocupación antes de un cierre efectivo', () => {
  const bloqueo = { estado: 'activo', idRecinto: '1', fechaInicio: '2030-01-01', horaInicio: '10:00', fechaFin: '2030-01-01', horaFin: '11:00', requiereCierre: true, esIndefinido: false } as const;
  const actividad = { idRecinto: '1', fecha: '2030-01-02', horaInicio: '10:00', horaFin: '11:00' } as any;
  assert.equal(afectaBloqueo(bloqueo as any, actividad), true);
  assert.equal(afectaBloqueo({ ...bloqueo, estado: 'cancelado' } as any, actividad), false);
});
