import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ProveedorDatos, useDatos } from '../src/contextos/DatosContexto';
import { ProveedorAutenticacion } from '../src/contextos/AutenticacionContexto';
import { EVENTOS_INICIALES, RECINTOS_INICIALES, USUARIOS_INICIALES } from '../src/datos/datosIniciales';
import type { BoletoDigital, EntradaListaEspera, Evento, FechaEvento, RegistroEscaneo, Reservacion } from '../src/tipos';
import {
  capacidadActividad, estadoInscripcionesActividad, etiquetaActividad, formatearFechaHoraInstitucional, indicadoresActividad,
  instanteInstitucional, limiteInscripcionesActividad, proyectarCambioInscripciones,
  proyectarCierreAutomatico, type CambioInscripciones, type DatosIndicadores, type EstadoTaquilla
} from '../src/dominio/taquilla';

const organizador = USUARIOS_INICIALES.find(u => u.id === 'usr-silva')!;
const ahora = Date.parse('2030-02-01T08:00:00-06:00');
const actividadA: FechaEvento = {
  id: 'actividad-a', idEvento: 'evento-prueba', nombreActividad: 'Taller A', fecha: '2030-02-01',
  horaInicio: '10:00', horaFin: '11:00', idRecinto: 'rec-auditorio', esFinalConfirmado: true,
  ponentes: [], asistenciaEstimada: 5, estadoInscripciones: 'abiertas', versionInscripciones: 0
};
const actividadB: FechaEvento = { ...actividadA, id: 'actividad-b', nombreActividad: 'Taller B', horaInicio: '12:00', horaFin: '13:00', idRecinto: 'rec-sala14', asistenciaEstimada: 3 };
const evento: Evento = {
  ...EVENTOS_INICIALES[0], id: 'evento-prueba', idOrganizador: organizador.id, estado: 'publicado',
  modalidadAsistencia: 'controlado', aforoMaximo: 1000, fechas: [actividadA, actividadB]
};
const reserva = (id: string, actividad: FechaEvento, parcial: Partial<Reservacion> = {}): Reservacion => ({
  id, idEvento: evento.id, idFechaEvento: actividad.id, idUsuario: 'asistente-1', nombreUsuario: 'Asistente',
  correoUsuario: 'asistente@example.test', estado: 'confirmada', fechaCreacion: '2030-02-01T07:00:00-06:00', ...parcial
});
const espera = (id: string, actividad: FechaEvento, parcial: Partial<EntradaListaEspera> = {}): EntradaListaEspera => ({
  id, idEvento: evento.id, idFechaEvento: actividad.id, idUsuario: id, nombreUsuario: 'En espera', correoUsuario: 'espera@example.test',
  posicionFila: 1, fechaCreacion: '2030-02-01T07:00:00-06:00', estado: 'notificado', fechaExpiracionOferta: ahora + 60000, ...parcial
});
const boleto = (id: string, actividad: FechaEvento, parcial: Partial<BoletoDigital> = {}): BoletoDigital => ({
  id, idReservacion: `res-${id}`, idEvento: evento.id, idFechaEvento: actividad.id, idUsuario: 'asistente-1',
  nombreUsuario: 'Asistente', correoUsuario: 'asistente@example.test', tituloEvento: 'Evento', fechaEvento: actividad.fecha,
  horaEvento: actividad.horaInicio, nombreRecinto: 'Recinto', codigoQr: 'TT-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  estado: 'valido', fechaEmision: '2030-02-01T07:00:00-06:00', ...parcial
});
const escaneo = (id: string, b: BoletoDigital): RegistroEscaneo => ({
  id, idBoleto: b.id, idEvento: b.idEvento, idFechaEvento: b.idFechaEvento, fechaEscaneo: '2030-02-01T10:00:00-06:00',
  escaneadoPor: 'Staff', resultado: 'exito', nombreAsistente: b.nombreUsuario
});
const estado = (): EstadoTaquilla => ({ eventos: [structuredClone(evento)], reservaciones: [], espera: [], bloqueos: [] });
const peticion = (parcial: Partial<CambioInscripciones> = {}): CambioInscripciones => ({
  idEvento: evento.id, idsFechaEvento: [actividadA.id], nuevoEstado: 'cerradas', idOrganizador: organizador.id,
  nombreOrganizador: organizador.nombre, versionesEsperadas: { [actividadA.id]: 0 }, ...parcial
});
const datos = (): DatosIndicadores => ({ recintos: RECINTOS_INICIALES, arreglos: [], reservaciones: [], boletos: [], espera: [], escaneos: [], intenciones: [] });

test('cerrar A deja B abierta el mismo día y conserva reservas confirmadas, boletos y el orden de espera', () => {
  const actual = estado();
  actual.reservaciones = [reserva('confirmada-a', actividadA), reserva('temporal-a', actividadA, { estado: 'apartado_temporal' }), reserva('temporal-b', actividadB, { estado: 'apartado_temporal' })];
  actual.espera = [espera('espera-a', actividadA, { posicionFila: 3 }), espera('espera-b', actividadB)];
  const original = structuredClone(actual);
  const siguiente = proyectarCambioInscripciones(actual, peticion(), organizador, ahora);
  assert.equal(siguiente.eventos[0].fechas[0].estadoInscripciones, 'cerradas');
  assert.equal(siguiente.eventos[0].fechas[1].estadoInscripciones, 'abiertas');
  assert.equal(siguiente.eventos[0].fechas[1], actual.eventos[0].fechas[1]);
  assert.equal(siguiente.eventos[0].fechas[0].historialInscripciones?.length, 1);
  assert.equal(siguiente.eventos[0].fechas[1].historialInscripciones, undefined);
  assert.deepEqual(siguiente.reservaciones.map(r => r.estado), ['confirmada', 'cancelada', 'apartado_temporal']);
  assert.equal(siguiente.espera[0].estado, 'esperando');
  assert.equal(siguiente.espera[0].posicionFila, 3);
  assert.equal(siguiente.espera[1], actual.espera[1]);
  assert.equal(siguiente.actividadesActualizadas, 1);
  assert.deepEqual(actual, original);
  const reabierta = proyectarCambioInscripciones(siguiente, peticion({ nuevoEstado: 'abiertas', versionesEsperadas: { [actividadA.id]: 1 } }), organizador, ahora);
  assert.equal(reabierta.eventos[0].fechas[0].estadoInscripciones, 'abiertas');
  assert.equal(reabierta.eventos[0].fechas[1].historialInscripciones, undefined);
});

test('el alcance incluye el evento y no alcanza registros ajenos con el mismo identificador heredado', () => {
  const actual = estado();
  actual.eventos.push({ ...evento, id: 'otro-evento' });
  actual.reservaciones.push(reserva('ajena', actividadA, { idEvento: 'otro-evento', estado: 'apartado_temporal' }));
  actual.espera.push(espera('ajena', actividadA, { idEvento: 'otro-evento' }));
  const siguiente = proyectarCambioInscripciones(actual, peticion(), organizador, ahora);
  assert.equal(siguiente.eventos[1], actual.eventos[1]);
  assert.equal(siguiente.reservaciones[0], actual.reservaciones[0]);
  assert.equal(siguiente.espera[0], actual.espera[0]);
});

test('abrir y cerrar exige al organizador vigente y rechaza actividades canceladas, suspendidas o ajenas', () => {
  for (const usuario of [null, { ...organizador, estaActivo: false }, { ...organizador, roles: ['asistente'] as const }, { ...organizador, id: 'otro' }]) {
    assert.throws(() => proyectarCambioInscripciones(estado(), peticion(), usuario as typeof organizador, ahora), /ERR-TR-02/);
  }
  for (const marca of [{ cancelada: true }, { suspendida: true }]) {
    const actual = estado(); actual.eventos[0].fechas[0] = { ...actividadA, ...marca };
    assert.throws(() => proyectarCambioInscripciones(actual, peticion(), organizador, ahora), /CANCELADA|SUSPENDIDA/);
  }
  assert.throws(() => proyectarCambioInscripciones(estado(), peticion({ idsFechaEvento: ['ajena'] }), organizador, ahora), /ERR-TR-03/);
  assert.equal(estadoInscripcionesActividad(actividadA, 'cancelado'), 'cerradas');
  assert.equal(estadoInscripcionesActividad(actividadA, 'finalizado'), 'cerradas');
});

test('una versión modificada durante la confirmación rechaza la operación completa', () => {
  const actual = estado(); actual.eventos[0].fechas[0].versionInscripciones = 1;
  assert.throws(() => proyectarCambioInscripciones(actual, peticion(), organizador, ahora), /ERR-TR-08/);
  const antes = structuredClone(actual);
  assert.throws(() => proyectarCambioInscripciones(actual, peticion({ idsFechaEvento: [actividadB.id, 'inexistente'] }), organizador, ahora), /ERR-TR-03/);
  assert.deepEqual(actual, antes);
});

test('límites, cierre automático y formatos son institucionales incluso con otro huso del dispositivo', () => {
  const zonaAnterior = process.env.TZ;
  try {
    for (const zona of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'America/Mexico_City']) {
      process.env.TZ = zona;
      assert.equal(limiteInscripcionesActividad(actividadA), Date.parse('2030-02-01T09:00:00-06:00'));
      assert.equal(instanteInstitucional('2030-02-01T09:00'), Date.parse('2030-02-01T15:00:00Z'));
      assert.equal(instanteInstitucional('2030-02-01T09:00:01.123'), Date.parse('2030-02-01T15:00:01.123Z'));
      assert.equal(instanteInstitucional('2030-02-01T15:00:00Z'), Date.parse('2030-02-01T09:00:00-06:00'));
      assert.match(formatearFechaHoraInstitucional('2030-02-01T15:00:00Z'), /9:00|09:00/);
      const siguiente = proyectarCierreAutomatico(estado(), Date.parse('2030-02-01T09:00:00-06:00'));
      assert.equal(siguiente.eventos[0].fechas[0].estadoInscripciones, 'cerradas');
      assert.equal(siguiente.eventos[0].fechas[1].estadoInscripciones, 'abiertas');
      assert.equal(siguiente.actividadesActualizadas, 1);
      const cerrada = estado(); cerrada.eventos[0].fechas[0].estadoInscripciones = 'cerradas';
      assert.throws(() => proyectarCambioInscripciones(cerrada, peticion({ nuevoEstado: 'abiertas' }), organizador, Date.parse('2030-02-01T09:00:00-06:00')), /fecha límite/);
    }
  } finally { if (zonaAnterior === undefined) delete process.env.TZ; else process.env.TZ = zonaAnterior; }
});

test('el pase compartido genera accesos por actividad y las métricas no duplican las categorías especiales', () => {
  const d = datos();
  const a = boleto('boleto-a', actividadA), b = boleto('boleto-b', actividadB), especial = boleto('especial', actividadA, { esEspecial: true, idUsuario: 'vip-1', tipoEspecial: 'vip' });
  d.boletos = [a, b, especial];
  d.reservaciones = [reserva(a.idReservacion, actividadA), reserva(b.idReservacion, actividadB), reserva(especial.idReservacion, actividadA, { idBoleto: especial.id })];
  d.escaneos = [escaneo('acceso-a', a), escaneo('repetido-a', a), escaneo('acceso-b', b), escaneo('acceso-vip', especial)];
  d.espera = [espera('en-a', actividadA), espera('en-b', actividadB), espera('fuera', actividadA, { idEvento: 'otro' })];
  const ma = indicadoresActividad(evento, actividadA, d, ahora), mb = indicadoresActividad(evento, actividadB, d, ahora);
  assert.equal(a.codigoQr, b.codigoQr);
  assert.deepEqual([ma.aforo, ma.reservaciones, ma.especiales, ma.asistencias, ma.espera, ma.disponibles], [5, 1, 1, 2, 1, 3]);
  assert.deepEqual([mb.aforo, mb.reservaciones, mb.especiales, mb.asistencias, mb.espera, mb.disponibles], [3, 1, 0, 1, 1, 2]);
  assert.equal(new Set(d.reservaciones.filter(r => r.id !== especial.idReservacion).map(r => r.idUsuario)).size, 1);
});

test('las intenciones libres no se cuentan como reservas ni consumen cupo', () => {
  const d = datos(); const libre = { ...actividadA, modalidadAsistencia: 'libre' as const };
  d.intenciones = [{ id: 'intencion', idEvento: evento.id, idFechaEvento: libre.id, idUsuario: 'asistente-1', nombreUsuario: 'Asistente', correoUsuario: 'asistente@example.test', fechaRegistro: new Date(ahora).toISOString() }];
  const m = indicadoresActividad(evento, libre, d, ahora);
  assert.deepEqual([m.intenciones, m.reservaciones, m.disponibles], [1, 0, 5]);
});

test('la disponibilidad descuenta apartados y ofertas vigentes una vez y libera los vencidos', () => {
  const d = datos();
  d.reservaciones = [reserva('temporal', actividadA, { estado: 'apartado_temporal', tiempoExpiracionApartado: ahora + 60000, idAsiento: 'lugar-1' }), reserva('vencido', actividadA, { estado: 'apartado_temporal', tiempoExpiracionApartado: ahora - 1 })];
  d.espera = [espera('oferta-misma', actividadA, { idReservacionOferta: 'temporal', idAsientoOferta: 'lugar-1' }), espera('oferta-otra', actividadA, { idAsientoOferta: 'lugar-2' })];
  assert.deepEqual([indicadoresActividad(evento, actividadA, d, ahora).apartados, indicadoresActividad(evento, actividadA, d, ahora).disponibles], [2, 3]);
  assert.equal(indicadoresActividad(evento, actividadA, d, ahora + 60001).disponibles, 5);
});

test('el cupo de la actividad respeta lugares bloqueados, eliminados y un aforo explícito de cero', () => {
  const d = datos();
  d.arreglos = [{ id: 'arreglo', idFechaEvento: actividadA.id, idRecinto: actividadA.idRecinto, estado: 'version_final',
    nombre: 'Final', etiquetaVersion: 'v1', totalAsientos: 20, asientosAsistente: 20, asientosVip: 0, asientosOrganizador: 0,
    asientosStaff: 0, asientosBloqueados: 0, asientosSinAsignar: 0, fechaCreacion: new Date(ahora).toISOString(),
    asientos: [
      { id: '1', etiqueta: '1', fila: 'A', numero: 1, categoria: 'asistente', estaBloqueado: false },
      { id: '2', etiqueta: '2', fila: 'A', numero: 2, categoria: 'asistente', estaBloqueado: true },
      { id: '3', etiqueta: '3', fila: 'A', numero: 3, categoria: 'asistente', estaBloqueado: false, estaEliminado: true }
    ] }];
  assert.equal(capacidadActividad(evento, actividadA, d), 1);
  assert.equal(capacidadActividad(evento, { ...actividadB, asistenciaEstimada: 0 }, d), 0);
  assert.equal(capacidadActividad(evento, { ...actividadB, asistenciaEstimada: undefined }, d), RECINTOS_INICIALES.find(r => r.id === actividadB.idRecinto)!.capacidad);
});

test('dos actividades del mismo día se identifican por nombre, fecha, horario y recinto', () => {
  const a = etiquetaActividad(actividadA, RECINTOS_INICIALES), b = etiquetaActividad(actividadB, RECINTOS_INICIALES);
  assert.notEqual(a, b);
  for (const [etiqueta, actividad] of [[a, actividadA], [b, actividadB]] as const) {
    assert.ok(etiqueta.includes(actividad.nombreActividad!));
    assert.ok(etiqueta.includes(actividad.fecha));
    assert.ok(etiqueta.includes(`${actividad.horaInicio}–${actividad.horaFin}`));
    assert.ok(etiqueta.includes(RECINTOS_INICIALES.find(r => r.id === actividad.idRecinto)!.nombre));
  }
});

class AlmacenPrueba {
  datos = new Map<string, string>();
  fallarEn?: string;
  getItem(clave: string) { return this.datos.get(clave) ?? null; }
  setItem(clave: string, valor: string) {
    if (this.fallarEn === clave) { this.fallarEn = undefined; throw new Error('Cuota de prueba'); }
    this.datos.set(clave, valor);
  }
  removeItem(clave: string) { this.datos.delete(clave); }
}
function montarContexto() {
  const local = new AlmacenPrueba(), sesion = new AlmacenPrueba(), prefijo = 'tt_datos_almacen_escom_v7_';
  Object.assign(globalThis, { localStorage: local, sessionStorage: sesion, window: { location: { search: '', hostname: 'localhost' } } });
  local.setItem('tt_usuarios_sistema_v2', JSON.stringify(USUARIOS_INICIALES));
  local.setItem('tt_rol_activo_v2', 'organizador');
  sesion.setItem('tt_sesion_identidad_v3', JSON.stringify({ id: 'sesion-prueba', usuario: organizador.id, inicio: Date.now(), actividad: Date.now(), version: organizador.versionCredenciales || 0 }));
  local.setItem(prefijo + 'eventos', JSON.stringify([evento]));
  for (const clave of ['reservaciones', 'boletos', 'espera', 'escaneos', 'bloqueos']) local.setItem(prefijo + clave, '[]');
  let contexto!: ReturnType<typeof useDatos>;
  function Capturar() { contexto = useDatos(); return null; }
  renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null, React.createElement(Capturar))));
  return { local, contexto, prefijo, leer: (clave: string) => JSON.parse(local.getItem(prefijo + clave) || 'null') };
}

test('el contexto confirma A sobre el almacenamiento vigente y conserva cambios nuevos de B', () => {
  const c = montarContexto();
  c.local.setItem(c.prefijo + 'eventos', JSON.stringify([{ ...evento, fechas: [actividadA, { ...actividadB, estadoInscripciones: 'cerradas', versionInscripciones: 1 }] }]));
  c.local.setItem(c.prefijo + 'reservaciones', JSON.stringify([reserva('nueva-b', actividadB)]));
  const resultado = c.contexto.cambiarEstadoInscripciones(peticion());
  assert.equal(resultado.exito, true, resultado.error);
  assert.equal(resultado.actividadesActualizadas, 1);
  assert.deepEqual(c.leer('eventos')[0].fechas.map((a: FechaEvento) => a.estadoInscripciones), ['cerradas', 'cerradas']);
  assert.equal(c.leer('eventos')[0].fechas[1].versionInscripciones, 1);
  assert.equal(c.leer('reservaciones')[0].id, 'nueva-b');
});

test('si falla guardar una colección el contexto restaura el cierre completo sin confirmar éxito', () => {
  const c = montarContexto();
  const antes = ['eventos', 'reservaciones', 'espera'].map(k => c.local.getItem(c.prefijo + k));
  c.local.fallarEn = c.prefijo + 'espera';
  assert.equal(c.contexto.cambiarEstadoInscripciones(peticion()).exito, false);
  assert.deepEqual(['eventos', 'reservaciones', 'espera'].map(k => c.local.getItem(c.prefijo + k)), antes);
});

test('retirar el rol en otra ventana impide confirmar inscripciones con permisos obsoletos', () => {
  const c = montarContexto();
  c.local.setItem('tt_usuarios_sistema_v2', JSON.stringify(USUARIOS_INICIALES.map(u => u.id === organizador.id ? { ...u, roles: ['asistente'] } : u)));
  const antes = c.local.getItem(c.prefijo + 'eventos');
  const r = c.contexto.cambiarEstadoInscripciones(peticion());
  assert.equal(r.exito, false);
  assert.match(r.error || '', /ERR-TR-02/);
  assert.equal(c.local.getItem(c.prefijo + 'eventos'), antes);
});
