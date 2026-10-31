import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ProveedorDatos } from '../src/contextos/DatosContexto';
import { ProveedorAutenticacion } from '../src/contextos/AutenticacionContexto';
import { HistorialAccesosPagina } from '../src/paginas/HistorialAccesosPagina';
import { USUARIOS_INICIALES, EVENTOS_INICIALES } from '../src/datos/datosIniciales';

// Un evento con dos actividades el mismo día, en recintos y horarios distintos.
const manana = { id: 'act-manana', idEvento: 'evt-actividades', idRecinto: 'rec-auditorio', fecha: '2030-01-25', horaInicio: '09:00', horaFin: '11:00', nombreActividad: 'Conferencia inaugural', ponentes: [], esFinalConfirmado: true };
const tarde = { ...manana, id: 'act-tarde', idRecinto: 'rec-sala14', horaInicio: '12:00', horaFin: '14:00', nombreActividad: 'Taller práctico' };
const evento = { ...EVENTOS_INICIALES[0], id: 'evt-actividades', idSolicitud: undefined, idOrganizador: 'usr-silva', estado: 'publicado', fechas: [manana, tarde] };
const escaneo = (id: string, idFechaEvento: string, nombreAsistente: string) =>
  ({ id, idBoleto: 'b-' + id, idEvento: evento.id, idFechaEvento, resultado: 'exito', nombreAsistente, fechaEscaneo: '2030-01-25T16:00:00Z', escaneadoPor: 'Staff de prueba' });

class Almacen { datos = new Map<string, string>(); getItem(k: string) { return this.datos.get(k) ?? null; } setItem(k: string, v: string) { this.datos.set(k, v); } removeItem(k: string) { this.datos.delete(k); } }

function renderizarHistorial(props: { initialEventId?: string; initialDateId?: string }) {
  const local = new Almacen(), sesion = new Almacen();
  const usuario = USUARIOS_INICIALES.find((u) => u.id === 'usr-silva')!;
  Object.assign(globalThis, { localStorage: local, sessionStorage: sesion, window: { location: { search: '', hostname: 'localhost' } } });
  local.setItem('tt_usuarios_sistema_v2', JSON.stringify(USUARIOS_INICIALES));
  local.setItem('tt_rol_activo_v2', 'organizador');
  sesion.setItem('tt_sesion_identidad_v3', JSON.stringify({ id: 'prueba', usuario: usuario.id, inicio: Date.now(), actividad: Date.now(), version: usuario.versionCredenciales || 0 }));
  const prefijo = 'tt_datos_almacen_escom_v7_';
  local.setItem(prefijo + 'eventos', JSON.stringify([evento]));
  local.setItem(prefijo + 'bloqueos', '[]');
  local.setItem(prefijo + 'ocupaciones_internas', '[]');
  local.setItem(prefijo + 'escaneos', JSON.stringify([escaneo('e1', manana.id, 'Asistente Mañana'), escaneo('e2', tarde.id, 'Asistente Tarde')]));
  return renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null,
    React.createElement(HistorialAccesosPagina, { navigate: () => {}, ...props }))));
}

test('el historial distingue dos actividades del mismo día y filtra por su identificador', () => {
  const todas = renderizarHistorial({ initialEventId: evento.id });
  assert.match(todas, /Evento \/ actividad/);
  assert.doesNotMatch(todas, /Evento \/ día/);
  assert.match(todas, /Conferencia inaugural · 09:00–11:00 h/);
  assert.match(todas, /Taller práctico · 12:00–14:00 h/);
  assert.match(todas, /Asistente Mañana/);
  assert.match(todas, /Asistente Tarde/);

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
