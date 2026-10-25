import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTOS_DEMOSTRACION, ARREGLOS_DEMOSTRACION, incorporarProgramados, cargarEventosProgramados } from '../src/datos/eventosDemostracion';
import { validarProgramacion } from '../src/dominio/solicitudes';
import { RECINTOS_INICIALES } from '../src/datos/datosIniciales';

test('agenda fija de seis semanas: tres eventos por semana, con programa y distribución cuando corresponde', () => {
  assert.equal(EVENTOS_DEMOSTRACION.length, 18);
  const ids = EVENTOS_DEMOSTRACION.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (let semana = 0; semana < 6; semana++) {
    const dias = EVENTOS_DEMOSTRACION.slice(semana * 3, semana * 3 + 3).map(e => new Date(e.fechas[0].fecha + 'T12:00:00Z').getUTCDay());
    assert.deepEqual(dias, [1, 3, 5]);
  }
  for (const evento of EVENTOS_DEMOSTRACION) {
    assert.equal(evento.esDemostracion, true);
    assert.ok(evento.fechas[0].programa?.length);
    // La fecha de referencia fija permite comprobar también el historial sin mover fechas.
    assert.equal(validarProgramacion(evento.fechas, RECINTOS_INICIALES, { modalidad:evento.modalidadAsistencia, aforo:evento.aforoMaximo, ahora:new Date('2026-10-24T18:00:00-06:00') }), undefined);
    if (evento.modalidadAsistencia === 'controlado') {
      const arreglo = ARREGLOS_DEMOSTRACION.find(a => a.id === evento.fechas[0].idArregloFinal);
      assert.equal(arreglo?.idFechaEvento, evento.fechas[0].id);
      assert.equal(arreglo?.totalAsientos, arreglo?.asientos.length);
    }
  }
});

test('cargar la agenda dos veces conserva cambios, cancelaciones e historial sin duplicados', () => {
  const cambiado = { ...structuredClone(EVENTOS_DEMOSTRACION[0]), titulo:'Título editado', estado:'cancelado' as const };
  const primera = incorporarProgramados([cambiado], EVENTOS_DEMOSTRACION);
  const segunda = incorporarProgramados(primera, EVENTOS_DEMOSTRACION);
  assert.equal(segunda.length, 18);
  assert.equal(segunda[0].titulo, 'Título editado');
  assert.equal(segunda[0].estado, 'cancelado');
  assert.equal(segunda[0].fechas[0].fecha, '2026-10-26');
});

test('las rutas anteriores de carteles migran sin reemplazar carteles personalizados', () => {
  const base = EVENTOS_DEMOSTRACION[0];
  const anterior = { ...base, titulo:'Inteligencia artificial aplicada', urlImagen: '/imagenes/eventos/tecnologia.png', descripcion:'Evento de demostración anterior.' };
  const migrado = cargarEventosProgramados([anterior])[0];
  assert.equal(migrado.urlImagen, '/imagenes/eventos/robotica.jpg');
  assert.equal(migrado.titulo, base.titulo);
  assert.doesNotMatch(migrado.descripcion, /demostración/i);
  const eventoSinCartel = EVENTOS_DEMOSTRACION[4];
  const imagenRepetida = { ...eventoSinCartel, urlImagen:'/imagenes/eventos/ciberseguridad.jpg' };
  assert.equal(cargarEventosProgramados([imagenRepetida])[0].urlImagen, undefined);
  const personalizado = { ...base, urlImagen: 'data:image/jpeg;base64,cartel-personalizado' };
  assert.equal(cargarEventosProgramados([personalizado])[0].urlImagen, personalizado.urlImagen);
});

test('los eventos programados tienen imágenes reales de tema y no muestran el rótulo de demostración', () => {
  const imagenes = EVENTOS_DEMOSTRACION.map(e => e.urlImagen).filter((url): url is string => Boolean(url));
  assert.deepEqual(imagenes, [
    '/imagenes/eventos/robotica.jpg', '/imagenes/eventos/ciberseguridad.jpg',
    '/imagenes/eventos/hackathon.jpg', '/imagenes/eventos/simposio.jpg',
  ]);
  assert.equal(new Set(imagenes).size, 4);
  assert.equal(EVENTOS_DEMOSTRACION.filter(e => !e.urlImagen).length, 14);
  for (const evento of EVENTOS_DEMOSTRACION) {
    assert.ok(!evento.etiquetas.includes('Demostración'));
    assert.doesNotMatch(evento.descripcion, /demostración/i);
  }
});

test('un evento mantiene sus actividades en Sala 14 y Auditorio en días diferentes', () => {
  const evento = EVENTOS_DEMOSTRACION.find(e => e.id === 'evt-demo-agenda-2026-10-28')!;
  assert.equal(evento.fechas.length, 2);
  assert.deepEqual(evento.fechas.map(d => d.idRecinto), ['rec-sala14', 'rec-auditorio']);
  assert.ok(evento.fechas.every(d => d.programa?.length));
  const anterior = { ...evento, fechas:[structuredClone(evento.fechas[0])] };
  assert.equal(cargarEventosProgramados([anterior])[0].fechas.length, 2);
  const editado = { ...anterior, titulo:'Mi evento editado' };
  assert.equal(cargarEventosProgramados([editado])[0].fechas.length, 1);
});
