import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ProveedorDatos, useDatos } from '../src/contextos/DatosContexto';
import { ProveedorAutenticacion } from '../src/contextos/AutenticacionContexto';
import { ProveedorNotificaciones } from '../src/contextos/NotificacionesContexto';
import { DetalleEventoPagina } from '../src/paginas/DetalleEventoPagina';
import { SeleccionAsientoPagina } from '../src/paginas/SeleccionAsientoPagina';
import { EVENTOS_INICIALES, USUARIOS_INICIALES } from '../src/datos/datosIniciales';
import { impedimentoActividad, rutaReservaActividad, rutaAccesoConRegreso } from '../src/dominio/participacionActividad';
import { resolverRutaDocumentacion } from '../src/dominio/navegacionDocumentacion';
import type { Evento, FechaEvento, Usuario } from '../src/tipos';

const prefijo = 'tt_datos_almacen_escom_v7_';
const usuario = USUARIOS_INICIALES.find(u => u.id === 'usr-carlos')!;
const a: FechaEvento = { id: 'act-a', idEvento: 'evt-correctivo', nombreActividad: 'Taller sin programa', fecha: '2030-11-04', horaInicio: '10:00', horaFin: '11:00', idRecinto: 'rec-auditorio', modalidadAsistencia: 'controlado', asistenciaEstimada: 2, esFinalConfirmado: true, ponentes: [], estadoInscripciones: 'abiertas' };
const b: FechaEvento = { ...a, id: 'act-b', nombreActividad: 'Laboratorio con dos ponencias', horaInicio: '12:00', horaFin: '13:00', idRecinto: 'rec-sala14', asistenciaEstimada: 3, programa: [{ hora: '12:00', titulo: 'Primera ponencia', ponente: 'Invitada A' }, { hora: '12:30', titulo: 'Segunda ponencia', ponente: 'Invitado B' }] };
const libre: FechaEvento = { ...a, id: 'act-libre', nombreActividad: 'Encuentro libre', modalidadAsistencia: 'libre', horaInicio: '15:00', horaFin: '16:00' };
const evento: Evento = { ...EVENTOS_INICIALES[0], id: a.idEvento, estado: 'publicado', visibilidad: 'publico', publicoPermitido: undefined, fechas: [a, b, libre], aforoMaximo: 242 };
class Almacen {
  datos = new Map<string, string>();
  getItem(k: string) { return this.datos.get(k) ?? null; }
  setItem(k: string, v: string) { this.datos.set(k, v); }
  removeItem(k: string) { this.datos.delete(k); }
}
function preparar(eventoActual = evento, cuenta: Usuario | null = usuario) {
  const local = new Almacen(), sesion = new Almacen();
  Object.assign(globalThis, { localStorage: local, sessionStorage: sesion, window: { location: { search: '', hostname: 'localhost' } } });
  local.setItem('tt_usuarios_sistema_v2', JSON.stringify(USUARIOS_INICIALES.map(u => u.id === cuenta?.id ? cuenta : u)));
  local.setItem('tt_rol_activo_v2', 'asistente');
  if (cuenta) sesion.setItem('tt_sesion_identidad_v3', JSON.stringify({ id: 'prueba', usuario: cuenta.id, inicio: Date.now(), actividad: Date.now(), version: cuenta.versionCredenciales || 0 }));
  for (const clave of ['reservaciones', 'boletos', 'espera', 'arreglos', 'bloqueos', 'escaneos', 'intenciones_asistencia']) local.setItem(prefijo + clave, '[]');
  local.setItem(prefijo + 'eventos', JSON.stringify([eventoActual]));
  let datos: ReturnType<typeof useDatos>;
  function Capturar() { datos = useDatos(); return null; }
  const render = (hijo: React.ReactNode = React.createElement(Capturar)) => renderToString(React.createElement(ProveedorAutenticacion, null, React.createElement(ProveedorDatos, null, React.createElement(ProveedorNotificaciones, null, hijo)))).replace(/<!--.*?-->/g, '');
  render();
  return { datos: datos!, local, render, leer: (clave: string) => JSON.parse(local.getItem(prefijo + clave) || '[]') };
}
test('sin programa hay una reserva; dos renglones descriptivos conservan una sola acción por actividad', () => {
  const c = preparar();
  const html = c.render(React.createElement(DetalleEventoPagina, { eventId: evento.id, navigate: () => {} }));
  assert.equal((html.match(/Reservar lugar \(/g) || []).length, 2);
  assert.match(html, /Primera ponencia/); assert.match(html, /Segunda ponencia/);
  assert.match(html, /Registrar asistencia \(Encuentro libre\)/);
  assert.match(html, /Aforo: 2 personas/); assert.match(html, /Aforo: 3 personas/);
});
test('dos actividades del mismo día reservan IDs distintos y conservan el QR por evento', () => {
  const c = preparar();
  for (const actividad of [a, b]) {
    const r = c.datos.apartarAsiento(evento.id, actividad.id, 'gen-' + actividad.id, 'Cupo General', usuario.id, usuario.nombre, usuario.correo);
    assert.equal(r.exito, true, r.error);
    const confirmado = c.datos.confirmarReservacion(r.reservacion!.id);
    assert.equal(confirmado.exito, true, confirmado.error);
  }
  assert.deepEqual(c.leer('reservaciones').map((r: { idFechaEvento: string }) => r.idFechaEvento), [a.id, b.id]);
  assert.equal(c.leer('boletos')[0].codigoQr, c.leer('boletos')[1].codigoQr);
  assert.equal(c.datos.apartarAsiento(evento.id, '0', 'gen-falso', 'Cupo General', usuario.id, usuario.nombre, usuario.correo).exito, false);
});
test('el registro libre no consume cupo ni boleto y permite cancelación propia después del cierre', () => {
  const c = preparar();
  const r = c.datos.registrarIntencionAsistencia(evento.id, libre.id, usuario.id, usuario.nombre, usuario.correo);
  assert.equal(r.exito, true, r.error);
  assert.equal(c.leer('intenciones_asistencia')[0].idFechaEvento, libre.id);
  assert.equal(c.leer('boletos').length, 0); assert.equal(c.leer('reservaciones').length, 0);
  c.local.setItem(prefijo + 'eventos', JSON.stringify([{ ...evento, fechas: [{ ...libre, estadoInscripciones: 'cerradas' }] }]));
  const html = c.render(React.createElement(DetalleEventoPagina, { eventId: evento.id, navigate: () => {} }));
  assert.match(html, /Cancelar registro/);
  assert.equal(c.datos.cancelarIntencionAsistencia(r.registro!.id).exito, true);
  assert.equal(c.leer('intenciones_asistencia').length, 0);
});
test('se revalida el cierre, la cancelación y la suspensión al confirmar o registrar', () => {
  for (const cambio of [{ cancelada: true }, { suspendida: true }, { estadoInscripciones: 'cerradas' as const }]) {
    const c = preparar();
    const r = c.datos.apartarAsiento(evento.id, a.id, 'gen-a', 'Cupo General', usuario.id, usuario.nombre, usuario.correo);
    c.local.setItem(prefijo + 'eventos', JSON.stringify([{ ...evento, fechas: evento.fechas.map(d => ({ ...d, ...cambio })) }]));
    assert.equal(c.datos.confirmarReservacion(r.reservacion!.id).exito, false);
    assert.equal(c.datos.registrarIntencionAsistencia(evento.id, libre.id, usuario.id, usuario.nombre, usuario.correo).exito, false);
    assert.equal(c.leer('boletos').length, 0);
  }
});
test('correo pendiente, público restringido y cuenta desactivada impiden reservar y registrar', () => {
  for (const cuenta of [{ ...usuario, correoConfirmado: false }, { ...usuario, estaActivo: false }]) {
    const c = preparar(evento, cuenta);
    assert.equal(c.datos.apartarAsiento(evento.id, a.id, 'gen-a', 'Cupo General', usuario.id, usuario.nombre, usuario.correo).exito, false);
    assert.equal(c.datos.registrarIntencionAsistencia(evento.id, libre.id, usuario.id, usuario.nombre, usuario.correo).exito, false);
  }
  const c = preparar({ ...evento, publicoPermitido: ['admin'] });
  assert.equal(c.datos.apartarAsiento(evento.id, a.id, 'gen-a', 'Cupo General', usuario.id, usuario.nombre, usuario.correo).exito, false);
  assert.equal(c.datos.registrarIntencionAsistencia(evento.id, libre.id, usuario.id, usuario.nombre, usuario.correo).exito, false);
});
test('la taquilla usa la identidad de FechaEvento y el horario propio, y rechaza la modalidad libre', () => {
  const c = preparar();
  const html = c.render(React.createElement(SeleccionAsientoPagina, { eventId: evento.id, dateId: b.id, navigate: () => {} }));
  assert.match(html, /Laboratorio con dos ponencias/); assert.match(html, /12:00–13:00/);
  assert.doesNotMatch(html, /Primera ponencia/); assert.match(html, /Aforo de esta actividad: 3 personas/);
  assert.match(c.render(React.createElement(SeleccionAsientoPagina, { eventId: evento.id, dateId: libre.id, navigate: () => {} })), /Esta actividad no requiere reservación/);
});
test('la hora institucional mantiene el límite aunque el dispositivo esté en Tokio y trata el instante exacto como cerrado', () => {
  const tz = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Tokyo';
    const limite = Date.parse(a.fecha + 'T15:00:00Z'); // 09:00 México, una hora antes.
    assert.equal(impedimentoActividad(evento, a, [], limite - 1), undefined);
    assert.ok(impedimentoActividad(evento, a, [], limite));
  } finally { process.env.TZ = tz; }
});
test('login conserva el identificador y la clave privada; Documentación elige la modalidad correcta', () => {
  const reserva = rutaReservaActividad(evento.id, b.id, 'CLAVE DE PRUEBA');
  assert.equal(new URL('https://prueba.test' + rutaAccesoConRegreso('/login', reserva)).searchParams.get('continuar'), reserva);
  const futuro = new Date('2030-01-01');
  assert.match(resolverRutaDocumentacion({ id: 'CU-MT-02', ruta: '/eventos/evt-ejemplo' }, [evento], futuro)!, /evt-correctivo/);
  const ruta = resolverRutaDocumentacion({ id: 'CU-MT-03', ruta: '/eventos/evt-ejemplo/reservar?dateId=anterior&interfaz=UI-40&caso=CU-MT-03' }, [evento], futuro)!;
  assert.equal(new URL('https://prueba.test' + ruta).searchParams.get('dateId'), a.id);
  assert.equal(new URL('https://prueba.test' + ruta).searchParams.get('interfaz'), 'UI-40');
});
