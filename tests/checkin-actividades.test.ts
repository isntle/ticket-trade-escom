import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ProveedorDatos, useDatos } from '../src/contextos/DatosContexto';
import { ProveedorAutenticacion } from '../src/contextos/AutenticacionContexto';
import { HistorialAccesosPagina } from '../src/paginas/HistorialAccesosPagina';
import { USUARIOS_INICIALES, EVENTOS_INICIALES } from '../src/datos/datosIniciales';

// Un evento con dos actividades el mismo día, en recintos y horarios distintos.
const manana = { id: 'act-manana', idEvento: 'evt-actividades', idRecinto: 'rec-auditorio', fecha: '2030-01-25', horaInicio: '09:00', horaFin: '11:00', nombreActividad: 'Conferencia inaugural', modalidadAsistencia: 'controlado' as const, ponentes: [], esFinalConfirmado: true };
const tarde = { ...manana, id: 'act-tarde', idRecinto: 'rec-sala14', horaInicio: '12:00', horaFin: '14:00', nombreActividad: 'Taller práctico' };
const noReservada = { ...manana, id: 'act-noche', idRecinto: 'rec-sala14', horaInicio: '16:00', horaFin: '18:00', nombreActividad: 'Mesa de cierre' };
const evento = { ...EVENTOS_INICIALES[0], id: 'evt-actividades', idSolicitud: undefined, idOrganizador: 'usr-silva', estado: 'publicado' as const, modalidadAsistencia: 'controlado' as const, fechas: [manana, tarde, noReservada] };
const escaneo = (id: string, idFechaEvento: string, nombreAsistente: string, escaneadoPor = 'Andrea López') =>
  ({ id, idBoleto: 'b-' + id, idEvento: evento.id, idFechaEvento, resultado: 'exito' as const, nombreAsistente, fechaEscaneo: '2030-01-25T16:00:00Z', escaneadoPor });

class Almacen { datos = new Map<string, string>(); getItem(k: string) { return this.datos.get(k) ?? null; } setItem(k: string, v: string) { this.datos.set(k, v); } removeItem(k: string) { this.datos.delete(k); } }

function renderizarHistorial(props: { initialEventId?: string; initialDateId?: string }, idUsuario = 'usr-silva', rolActivo = 'organizador', usuariosCustom = USUARIOS_INICIALES) {
  const local = new Almacen(), sesion = new Almacen();
  const usuario = usuariosCustom.find((u) => u.id === idUsuario)!;
  Object.assign(globalThis, { localStorage: local, sessionStorage: sesion, window: { location: { search: '?demo=1', hostname: 'localhost' } } });
  local.setItem('tt_usuarios_sistema_v2', JSON.stringify(usuariosCustom));
  local.setItem('tt_rol_activo_v2', rolActivo);
  sesion.setItem('tt_sesion_identidad_v3', JSON.stringify({ id: 'prueba', usuario: usuario.id, inicio: Date.now(), actividad: Date.now(), version: usuario.versionCredenciales || 0 }));
  const prefijo = 'tt_datos_almacen_escom_v7_';
  local.setItem(prefijo + 'eventos', JSON.stringify([evento]));
  local.setItem(prefijo + 'bloqueos', '[]');
  local.setItem(prefijo + 'ocupaciones_internas', '[]');
  local.setItem(prefijo + 'escaneos', JSON.stringify([escaneo('e1', manana.id, 'Asistente Mañana', 'Andrea López'), escaneo('e2', tarde.id, 'Asistente Tarde', 'Roberto Silva')]));
  return renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null,
    React.createElement(HistorialAccesosPagina, { navigate: () => {}, ...props }))));
}

test('el historial distingue dos actividades del mismo día, muestra hora y operador real y filtra por su identificador', () => {
  const todas = renderizarHistorial({ initialEventId: evento.id });
  assert.match(todas, /Evento \/ actividad/);
  assert.doesNotMatch(todas, /Evento \/ día/);
  assert.match(todas, /Conferencia inaugural · 09:00–11:00 h/);
  assert.match(todas, /Taller práctico · 12:00–14:00 h/);
  assert.match(todas, /Asistente Mañana/);
  assert.match(todas, /Asistente Tarde/);
  assert.match(todas, /Andrea López/);
  assert.match(todas, /Roberto Silva/);
  assert.match(todas, /Entrada aceptada/);
  assert.match(todas, /Entradas aceptadas frente a intentos rechazados/);

  const soloTarde = renderizarHistorial({ initialEventId: evento.id, initialDateId: tarde.id });
  assert.match(soloTarde, /Asistente Tarde/);
  assert.doesNotMatch(soloTarde, /Asistente Mañana/);
  assert.match(soloTarde, /Volver al control de acceso/);
});

test('el historial ignora una actividad recibida que no pertenece al evento', () => {
  const html = renderizarHistorial({ initialEventId: evento.id, initialDateId: 'act-de-otro-evento' });
  assert.match(html, /Asistente Mañana/);
  assert.match(html, /Asistente Tarde/);
});

test('el historial respeta el alcance autorizado para Staff asignado y oculta eventos tras retirar permisos', () => {
  const conStaff = USUARIOS_INICIALES.map((u) => u.id === 'usr-andrea' ? { ...u, eventosAsignadosStaff: [evento.id] } : u);
  const htmlAsignada = renderizarHistorial({ initialEventId: evento.id }, 'usr-andrea', 'staff', conStaff);
  assert.match(htmlAsignada, /Asistente Mañana/);
  assert.match(htmlAsignada, /Andrea López/);

  const sinStaff = USUARIOS_INICIALES.map((u) => u.id === 'usr-andrea' ? { ...u, eventosAsignadosStaff: [] } : u);
  const htmlRetirada = renderizarHistorial({ initialEventId: evento.id }, 'usr-andrea', 'staff', sinStaff);
  assert.doesNotMatch(htmlRetirada, /Asistente Mañana/);
  assert.match(htmlRetirada, /No hay registros de acceso para los filtros seleccionados/);
});

test('pase por evento: dos clientes intentan mismo acceso y solo uno entra; rechaza actividad ajena/cancelada y operador sin asignación; segunda actividad conserva acceso y soporta reprogramación sin nuevo QR', () => {
  const ahora = Date.now();
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ahora));
  const codigo = 'TT-' + 'A1B2C3D4E5F60718'.repeat(2);
  const act1 = { ...manana, fecha: hoy, horaInicio: '00:00', horaFin: '23:59' };
  const act2 = { ...tarde, fecha: hoy, horaInicio: '00:00', horaFin: '23:59' };
  const actAjenaMismoEvento = { ...noReservada, fecha: hoy, horaInicio: '00:00', horaFin: '23:59' };
  const actCancelada = { ...manana, id: 'act-cancelada', fecha: hoy, horaInicio: '00:00', horaFin: '23:59', cancelada: true };
  const evtPrincipal = { ...evento, fechas: [act1, act2, actAjenaMismoEvento, actCancelada] };
  const evtAjeno = { ...evento, id: 'evt-ajeno', idOrganizador: 'usr-otro', fechas: [{ ...act1, id: 'act-otro-evt', idEvento: 'evt-ajeno' }] };

  const titular = { idUsuario: 'usr-carlos', nombreUsuario: 'Carlos Méndez Vega', correoUsuario: 'cmendezv@alumno.ipn.mx' };
  const reservas = [
    { id: 'res-1', idEvento: evtPrincipal.id, idFechaEvento: act1.id, ...titular, estado: 'confirmada' as const, fechaCreacion: new Date(ahora).toISOString(), idBoleto: 'bol-1' },
    { id: 'res-2', idEvento: evtPrincipal.id, idFechaEvento: act2.id, ...titular, estado: 'confirmada' as const, fechaCreacion: new Date(ahora).toISOString(), idBoleto: 'bol-2' },
  ];
  const boletos = [
    { id: 'bol-1', idReservacion: 'res-1', idEvento: evtPrincipal.id, idFechaEvento: act1.id, ...titular, tituloEvento: evtPrincipal.titulo, fechaEvento: hoy, horaEvento: '00:00 - 23:59', nombreRecinto: 'Auditorio', etiquetaAsiento: 'A-1', codigoQr: codigo, estado: 'valido' as const, fechaEmision: new Date(ahora - 2000).toISOString() },
    { id: 'bol-2', idReservacion: 'res-2', idEvento: evtPrincipal.id, idFechaEvento: act2.id, ...titular, tituloEvento: evtPrincipal.titulo, fechaEvento: hoy, horaEvento: '00:00 - 23:59', nombreRecinto: 'Sala 14', etiquetaAsiento: 'B-2', codigoQr: codigo, estado: 'valido' as const, fechaEmision: new Date(ahora - 1000).toISOString() },
  ];

  const local = new Almacen(), sesion = new Almacen();
  Object.assign(globalThis, { localStorage: local, sessionStorage: sesion, window: { location: { search: '?demo=1', hostname: 'localhost' } } });
  const andrea = { ...USUARIOS_INICIALES.find((u) => u.id === 'usr-andrea')!, eventosAsignadosStaff: [evtPrincipal.id] };
  const silva = USUARIOS_INICIALES.find((u) => u.id === 'usr-silva')!;
  const sinAsignacion = { ...andrea, id: 'usr-staff-ajeno', nombre: 'Staff Sin Asignación', eventosAsignadosStaff: [] };
  local.setItem('tt_usuarios_sistema_v2', JSON.stringify([...USUARIOS_INICIALES.filter((u) => u.id !== andrea.id), andrea, sinAsignacion]));
  local.setItem('tt_rol_activo_v2', 'staff');
  sesion.setItem('tt_sesion_identidad_v3', JSON.stringify({ id: 'prueba', usuario: andrea.id, inicio: ahora, actividad: ahora, version: andrea.versionCredenciales || 0 }));
  const prefijo = 'tt_datos_almacen_escom_v7_';
  local.setItem(prefijo + 'eventos', JSON.stringify([evtPrincipal, evtAjeno]));
  local.setItem(prefijo + 'reservaciones', JSON.stringify(reservas));
  local.setItem(prefijo + 'boletos', JSON.stringify(boletos));
  for (const clave of ['bloqueos', 'ocupaciones_internas', 'escaneos', 'arreglos']) local.setItem(prefijo + clave, '[]');

  let cliente1!: ReturnType<typeof useDatos>;
  let cliente2!: ReturnType<typeof useDatos>;
  const Capturar1 = () => { cliente1 = useDatos(); return null; };
  const Capturar2 = () => { cliente2 = useDatos(); return null; };
  renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null, React.createElement(Capturar1))));
  renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null, React.createElement(Capturar2))));

  // 1. Operador sin asignación es rechazado
  const intentoSinAsignacion = cliente1.procesarCheckIn(codigo, sinAsignacion.nombre, act1.id, sinAsignacion, evtPrincipal.id);
  assert.equal(intentoSinAsignacion.exito, false);
  assert.equal(intentoSinAsignacion.resultado, 'no_autorizado');

  // 2. Actividad no reservada del mismo evento y actividad de evento ajeno se rechazan
  const intentoActNoReservada = cliente1.procesarCheckIn(codigo, andrea.nombre, actAjenaMismoEvento.id, andrea, evtPrincipal.id);
  assert.equal(intentoActNoReservada.exito, false);
  assert.equal(intentoActNoReservada.resultado, 'fecha_invalida');

  const intentoActCancelada = cliente1.procesarCheckIn(codigo, andrea.nombre, actCancelada.id, andrea, evtPrincipal.id);
  assert.equal(intentoActCancelada.exito, false);
  assert.equal(intentoActCancelada.resultado, 'suspendido');

  // 3. Dos clientes intentan el mismo acceso para act1: solo el primero entra
  const entradaCliente1 = cliente1.procesarCheckIn(codigo, andrea.nombre, act1.id, andrea, evtPrincipal.id);
  const entradaCliente2 = cliente2.procesarCheckIn(codigo, silva.nombre, act1.id, andrea, evtPrincipal.id);
  assert.equal(entradaCliente1.exito, true);
  assert.equal(entradaCliente1.resultado, 'exito');
  assert.equal(entradaCliente2.exito, false);
  assert.equal(entradaCliente2.resultado, 'ya_utilizado');

  // 4. La segunda actividad del pase conserva su acceso independientemente e incluso tras reprogramación sin cambiar QR
  const boletosTrasAct1 = JSON.parse(local.getItem(prefijo + 'boletos')!);
  assert.equal(boletosTrasAct1.find((b: any) => b.id === 'bol-1').estado, 'utilizado');
  assert.equal(boletosTrasAct1.find((b: any) => b.id === 'bol-2').estado, 'valido');
  assert.equal(boletosTrasAct1.find((b: any) => b.id === 'bol-2').codigoQr, codigo);

  // Reprogramar act2 manteniendo su ID y el mismo código QR del pase
  const evtReprogramado = { ...evtPrincipal, fechas: [act1, { ...act2, idRecinto: 'rec-auditorio', horaInicio: '00:00', horaFin: '23:59' }, actAjenaMismoEvento, actCancelada] };
  local.setItem(prefijo + 'eventos', JSON.stringify([evtReprogramado, evtAjeno]));

  const entradaAct2 = cliente1.procesarCheckIn(codigo, andrea.nombre, act2.id, andrea, evtPrincipal.id);
  assert.equal(entradaAct2.exito, true);
  assert.equal(entradaAct2.resultado, 'exito');

  // 5. Si se retira el permiso de Staff en almacenamiento, se rechazan nuevas lecturas
  local.setItem('tt_usuarios_sistema_v2', JSON.stringify(USUARIOS_INICIALES.map((u) => u.id === andrea.id ? { ...u, eventosAsignadosStaff: [] } : u)));
  const trasRetiro = cliente1.procesarCheckIn(codigo, andrea.nombre, act2.id, andrea, evtPrincipal.id);
  assert.equal(trasRetiro.exito, false);
  assert.equal(trasRetiro.resultado, 'no_autorizado');
});
