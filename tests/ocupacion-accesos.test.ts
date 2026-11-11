import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ProveedorDatos, useDatos } from '../src/contextos/DatosContexto';
import { ProveedorAutenticacion } from '../src/contextos/AutenticacionContexto';
import { OcupabilidadVivoPagina } from '../src/paginas/OcupabilidadVivoPagina';
import { USUARIOS_INICIALES, EVENTOS_INICIALES } from '../src/datos/datosIniciales';
import { reglaMonitorActividad, resumirOcupacion } from '../src/dominio/ocupacion';

// ---------- Reglas puras ----------
const asientos = [{ id: 's1', etiqueta: 'A-1' }, { id: 's2', etiqueta: 'A-2' }, { id: 's3', etiqueta: 'A-3' }];
const boleto = (id: string, idFechaEvento: string, idUsuario: string, estado: 'valido' | 'utilizado', idReservacion = 'r-' + id, etiquetaAsiento?: string) =>
  ({ id, idFechaEvento, idUsuario, idReservacion, estado, etiquetaAsiento });
const reserva = (id: string, idFechaEvento: string, idAsiento?: string) => ({ id, idFechaEvento, estado: 'confirmada' as const, idAsiento });

test('una entrada sin butaca cuenta en el total de su actividad y no colorea asientos', () => {
  const r = resumirOcupacion({ idActividad: 'A', boletos: [boleto('b1', 'A', 'u1', 'utilizado')], reservaciones: [reserva('r-b1', 'A')], asientos });
  assert.equal(r.totalIngresados, 1);
  assert.equal(r.ingresadosSinButaca, 1);
  assert.deepEqual(r.idsAsientosCheckIn, []);
});

test('la misma persona cuenta una vez aunque su acceso aparezca repetido', () => {
  const r = resumirOcupacion({ idActividad: 'A', boletos: [boleto('b1', 'A', 'u1', 'utilizado'), boleto('b1-copia', 'A', 'u1', 'utilizado')], reservaciones: [], asientos });
  assert.equal(r.totalIngresados, 1);
});

test('una entrada en B no cambia el total de A', () => {
  const boletos = [boleto('b1', 'A', 'u1', 'utilizado'), boleto('b2', 'B', 'u1', 'utilizado'), boleto('b3', 'B', 'u2', 'utilizado')];
  assert.equal(resumirOcupacion({ idActividad: 'A', boletos, reservaciones: [] }).totalIngresados, 1);
  assert.equal(resumirOcupacion({ idActividad: 'B', boletos, reservaciones: [] }).totalIngresados, 2);
});

test('el mapa colorea solo asientos existentes y no repite ocupados como reservados', () => {
  const boletos = [boleto('b1', 'A', 'u1', 'utilizado', 'r1'), boleto('b2', 'A', 'u2', 'valido', 'r2'), boleto('b3', 'A', 'u3', 'utilizado', 'r3')];
  const reservaciones = [reserva('r1', 'A', 's1'), reserva('r2', 'A', 's2'), reserva('r3', 'A', 'asiento-inexistente'), reserva('r4', 'A', 's1')];
  const r = resumirOcupacion({ idActividad: 'A', boletos, reservaciones, asientos });
  assert.deepEqual(r.idsAsientosCheckIn, ['s1']);
  assert.deepEqual(r.idsAsientosReservados, ['s2']);
  assert.equal(r.totalIngresados, 2);
  assert.equal(r.ingresadosSinButaca, 1);
  assert.equal(r.totalConAcceso, 3);
});

test('una etiqueta solo se usa cuando identifica un único asiento existente', () => {
  const repetidos = [...asientos, { id: 's4', etiqueta: 'A-1' }];
  const r = resumirOcupacion({ idActividad: 'A', boletos: [boleto('e1', 'A', '', 'utilizado', '', 'A-1'), boleto('e2', 'A', '', 'utilizado', '', 'A-3')], reservaciones: [], asientos: repetidos });
  assert.deepEqual(r.idsAsientosCheckIn, ['s3']);
  assert.equal(r.totalIngresados, 2);
});

test('regla del monitor: controlado con o sin distribución; libre o registro no tienen monitor', () => {
  assert.equal(reglaMonitorActividad({ modalidadAsistencia: 'controlado' }, {}, true).tipo, 'mapa');
  assert.equal(reglaMonitorActividad({ modalidadAsistencia: 'controlado' }, {}, false).tipo, 'sin_distribucion');
  assert.equal(reglaMonitorActividad({ modalidadAsistencia: 'controlado' }, { modalidadAsistencia: 'libre' }, true).tipo, 'sin_control');
  assert.equal(reglaMonitorActividad({ modalidadAsistencia: 'registro' }, {}, false).tipo, 'sin_control');
});

// ---------- Aceptación con la validación real del lector ----------
class Almacen { datos = new Map<string, string>(); getItem(k: string) { return this.datos.get(k) ?? null; } setItem(k: string, v: string) { this.datos.set(k, v); } removeItem(k: string) { this.datos.delete(k); } }
const PREFIJO = 'tt_datos_almacen_escom_v7_';
const CODIGO = 'TT-' + '0123456789ABCDEF'.repeat(2);

function preparar() {
  const ahora = Date.now();
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ahora));
  // Actividades activas todo el día de prueba, sin distribución de lugares: acceso sin butaca.
  const actividad = (id: string, idRecinto: string) => ({ id, idEvento: 'evt-monitor', idRecinto, fecha: hoy, horaInicio: '00:00', horaFin: '23:59', nombreActividad: 'Actividad ' + id.slice(-1).toUpperCase(), modalidadAsistencia: 'controlado', ponentes: [], esFinalConfirmado: true });
  const evento = { ...EVENTOS_INICIALES[0], id: 'evt-monitor', idSolicitud: undefined, idOrganizador: 'usr-silva', estado: 'publicado', modalidadAsistencia: 'controlado', fechas: [actividad('act-a', 'rec-lab-1'), actividad('act-b', 'rec-lab-2')] };
  const titular = { idUsuario: 'usr-carlos', nombreUsuario: 'Carlos Méndez Vega', correoUsuario: 'cmendezv@alumno.ipn.mx' };
  const reservas = ['a', 'b'].map((l) => ({ id: 'res-' + l, idEvento: evento.id, idFechaEvento: 'act-' + l, ...titular, estado: 'confirmada', fechaCreacion: new Date(ahora).toISOString(), idBoleto: 'bol-' + l }));
  const boletos = ['a', 'b'].map((l) => ({ id: 'bol-' + l, idReservacion: 'res-' + l, idEvento: evento.id, idFechaEvento: 'act-' + l, ...titular, tituloEvento: evento.titulo, fechaEvento: hoy, horaEvento: '00:00 - 23:59', nombreRecinto: 'Laboratorio', codigoQr: CODIGO, estado: 'valido', fechaEmision: new Date(ahora - 1000).toISOString() }));
  const local = new Almacen(), sesion = new Almacen();
  Object.assign(globalThis, { localStorage: local, sessionStorage: sesion, window: { location: { search: '?demo=1', hostname: 'localhost' } } });
  const andrea = USUARIOS_INICIALES.find((u) => u.id === 'usr-andrea')!;
  local.setItem('tt_usuarios_sistema_v2', JSON.stringify(USUARIOS_INICIALES.map((u) => u.id === andrea.id ? { ...u, eventosAsignadosStaff: [...(u.eventosAsignadosStaff || []), evento.id] } : u)));
  local.setItem('tt_rol_activo_v2', 'staff');
  sesion.setItem('tt_sesion_identidad_v3', JSON.stringify({ id: 'prueba', usuario: andrea.id, inicio: ahora, actividad: ahora, version: andrea.versionCredenciales || 0 }));
  local.setItem(PREFIJO + 'eventos', JSON.stringify([evento]));
  local.setItem(PREFIJO + 'reservaciones', JSON.stringify(reservas));
  local.setItem(PREFIJO + 'boletos', JSON.stringify(boletos));
  for (const clave of ['bloqueos', 'ocupaciones_internas', 'escaneos', 'arreglos']) local.setItem(PREFIJO + clave, '[]');
  return { andrea, evento };
}
const total = (idActividad: string) => resumirOcupacion({
  idActividad,
  boletos: JSON.parse(localStorage.getItem(PREFIJO + 'boletos')!),
  reservaciones: JSON.parse(localStorage.getItem(PREFIJO + 'reservaciones')!),
}).totalIngresados;

test('aceptación: acceso sin butaca suma solo a su actividad, repetir no suma y B no cambia A', () => {
  const { andrea, evento } = preparar();
  let datos!: ReturnType<typeof useDatos>;
  const Capturar = () => { datos = useDatos(); return null; };
  renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null, React.createElement(Capturar))));
  const validar = (idActividad: string) => datos.procesarCheckIn(CODIGO, andrea.nombre, idActividad, andrea, evento.id);

  assert.equal(total('act-a'), 0);
  assert.equal(validar('act-a').resultado, 'exito');
  assert.equal(total('act-a'), 1);
  assert.equal(total('act-b'), 0);
  assert.equal(validar('act-a').resultado, 'ya_utilizado');
  assert.equal(total('act-a'), 1);
  assert.equal(validar('act-b').resultado, 'exito');
  assert.equal(total('act-b'), 1);
  assert.equal(total('act-a'), 1);
});

test('el monitor sin distribución explica la regla y muestra el total sin mapa', () => {
  const { evento } = preparar();
  const boletos = JSON.parse(localStorage.getItem(PREFIJO + 'boletos')!);
  localStorage.setItem(PREFIJO + 'boletos', JSON.stringify(boletos.map((b: { id: string }) => b.id === 'bol-a' ? { ...b, estado: 'utilizado' } : b)));
  const html = renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null,
    React.createElement(OcupabilidadVivoPagina, { navigate: () => {}, initialEventId: evento.id, initialDateId: 'act-a' }))));
  assert.match(html, /no tiene distribución de lugares/);
  assert.match(html, /Entradas registradas/);
  assert.match(html, /1 sin butaca/);
  assert.match(html, /Actividad A/);
});
