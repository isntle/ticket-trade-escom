import assert from 'node:assert/strict';
import test from 'node:test';
import { convertirDiasSolicitud, ordenarPrograma, validarPrograma } from '../src/dominio/programa';
import { registrarCambioSolicitud, validarProgramacion } from '../src/dominio/solicitudes';
import type { SolicitudEvento } from '../src/tipos';

const solicitud: SolicitudEvento = {
  id: 'sol-prueba', idSolicitante: 'organizador', nombreSolicitante: 'Prueba', correoSolicitante: 'prueba@example.test', afiliacionSolicitante: 'profesor',
  tituloEvento: 'Evento de prueba', descripcionEvento: 'Prueba del programa', modalidadAsistencia: 'controlado', visibilidad: 'publico', asistenciaEstimada: 10,
  estado: 'en_revision', esExcepcional: false, fechaCreacion: '2026-10-17', urlImagen: 'data:image/png;base64,prueba',
  fechasSolicitadas: [{ id: 'd1', nombreDia: 'Día 1', fecha: '2099-01-01', horaInicio: '10:00', horaFin: '14:00', idRecinto: 'rec-prueba',
    programa: [{ hora: '12:00', titulo: 'Panel', descripcion: 'Preguntas', ponente: 'Persona B' }, { hora: '10:00', horaFin: '11:00', titulo: 'Apertura', descripcion: 'Bienvenida', ponente: 'Persona A' }] }],
};

test('autorizar conserva días, recinto, horas, actividades, descripción y ponentes sin mutar la solicitud', () => {
  const antes = structuredClone(solicitud);
  const dias = convertirDiasSolicitud(solicitud, 'evt-prueba');
  assert.equal(dias[0].nombreDia, 'Día 1');
  assert.equal(dias[0].idRecinto, 'rec-prueba');
  assert.equal(dias[0].horaFin, '14:00');
  assert.deepEqual(dias[0].programa?.map(a => a.titulo), ['Apertura', 'Panel']);
  assert.equal(dias[0].programa?.[0].descripcion, 'Bienvenida');
  assert.equal(dias[0].programa?.[0].horaFin, '11:00');
  assert.deepEqual(dias[0].ponentes, ['Persona A', 'Persona B']);
  dias[0].programa![0].titulo = 'Edición posterior';
  assert.deepEqual(solicitud, antes);
});

test('cada día mantiene su propio programa y se conserva el texto anterior de solicitudes antiguas', () => {
  const nueva = structuredClone(solicitud);
  nueva.fechasSolicitadas.push({ ...nueva.fechasSolicitadas[0], id: 'd2', fecha: '2099-01-02', nombreDia: 'Día 2', programa: undefined, actividadOPrograma: 'Programa anterior sin estructurar' });
  const dias = convertirDiasSolicitud(nueva, 'evt-dos');
  assert.equal(dias[1].programa?.[0].descripcion, 'Programa anterior sin estructurar');
  assert.equal(dias[0].programa?.length, 2);
  assert.notEqual(dias[0].id, dias[1].id);
});

test('valida horas reales, títulos, límites del día, duración y actividades superpuestas', () => {
  const dia = { horaInicio: '10:00', horaFin: '14:00', nombreDia: 'Día 1' };
  for (const programa of [
    [{ hora: '25:00', titulo: 'Inválida' }], [{ hora: '10:00', titulo: '  ' }], [{ hora: '09:59', titulo: 'Antes' }],
    [{ hora: '14:00', titulo: 'Después' }], [{ hora: '10:00', horaFin: '10:00', titulo: 'Duración inválida' }],
    [{ hora: '10:00', horaFin: '15:00', titulo: 'Fuera' }], [{ hora: '10:00', titulo: 'Uno' }, { hora: '10:00', titulo: 'Dos' }],
    [{ hora: '10:00', horaFin: '12:00', titulo: 'Uno' }, { hora: '11:00', titulo: 'Dos' }],
  ]) assert.ok(validarPrograma({ ...dia, programa }));
  assert.equal(validarPrograma({ ...dia, programa: [{ hora: '10:00', horaFin: '11:00', titulo: 'Uno' }, { hora: '11:00', horaFin: '14:00', titulo: 'Dos' }] }), undefined);
  assert.equal(validarPrograma(dia), undefined);
});

test('la validación compartida de envío y autorización no acepta actividades fuera del día', () => {
  const fechas = structuredClone(solicitud.fechasSolicitadas);
  fechas[0].programa![0].hora = '15:00';
  assert.match(validarProgramacion(fechas, []) || '', /actividad.*horario/);
});

test('los cambios del programa forman parte del historial y el orden se normaliza sin perder contenido', () => {
  const fechas = structuredClone(solicitud.fechasSolicitadas);
  fechas[0].programa![0].descripcion = 'Descripción corregida';
  const cambiada = registrarCambioSolicitud(solicitud, { fechasSolicitadas: fechas }, 'Responsable', 'Edición');
  assert.equal(cambiada.historialVersiones?.[0].modificaciones[0].campo, 'fechasSolicitadas');
  assert.equal(ordenarPrograma([{ hora: '12:00', titulo: ' Panel ', ponente: ' ' }])[0].titulo, 'Panel');
  assert.equal(ordenarPrograma([{ hora: '12:00', titulo: 'Panel', ponente: ' ' }])[0].ponente, undefined);
});
