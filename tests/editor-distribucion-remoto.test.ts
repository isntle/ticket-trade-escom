import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ContextoAutenticacion, ContextoDatos } from '../src/contextos/almacenes';
import { ProveedorNotificaciones } from '../src/contextos/NotificacionesContexto';
import {
  DistribucionActividadRemota,
  conciliarPendientesDistribucion,
  evaluarMapaDistribucion,
} from '../src/paginas/DistribucionActividadRemota';
import { MapaAsientos } from '../src/componentes/asientos/MapaAsientos';
import { EVENTOS_INICIALES, RECINTOS_INICIALES, USUARIOS_INICIALES } from '../src/datos/datosIniciales';
import type { ConfiguracionAsiento, Evento, FechaEvento, Usuario } from '../src/tipos';

const organizador = USUARIOS_INICIALES.find((u) => u.id === 'usr-silva')!;
const subdireccion = USUARIOS_INICIALES.find((u) => u.id === 'usr-subdireccion')!;
const otroUsuario = USUARIOS_INICIALES.find((u) => u.id === 'usr-carlos')!;

const actividadControlada: FechaEvento = {
  id: 'act-101',
  idEvento: 'evt-remoto-10',
  nombreActividad: 'Conferencia Inaugural',
  fecha: '2030-11-20',
  horaInicio: '10:00',
  horaFin: '12:00',
  idRecinto: 'rec-auditorio',
  modalidadAsistencia: 'controlado',
  asistenciaEstimada: 100,
  esFinalConfirmado: true,
  ponentes: [],
  estadoInscripciones: 'abiertas',
};

const actividadLibre: FechaEvento = {
  ...actividadControlada,
  id: 'act-102',
  nombreActividad: 'Panel de Entrada Libre',
  horaInicio: '13:00',
  horaFin: '14:00',
  modalidadAsistencia: 'libre',
};

const eventoPrueba: Evento = {
  ...EVENTOS_INICIALES[0],
  id: 'evt-remoto-10',
  idOrganizador: organizador.id,
  titulo: 'Foro de Distribución Remota',
  estado: 'publicado',
  modalidadAsistencia: 'controlado',
  fechas: [actividadControlada, actividadLibre],
};

function renderizarEditor(
  props: React.ComponentProps<typeof DistribucionActividadRemota>,
  usuario: Usuario | null = organizador,
  rolActivo: Usuario['rolActivo'] = usuario?.rolActivo || 'asistente',
) {
  const auth = {
    usuarioActual: usuario,
    rolActivo,
    todosLosUsuarios: USUARIOS_INICIALES,
    cambiarRolActivo: () => {},
  };
  const datos = {
    listaEventos: [eventoPrueba],
    listaRecintos: RECINTOS_INICIALES,
  };
  return renderToString(
    React.createElement(
      ProveedorNotificaciones,
      null,
      React.createElement(
        ContextoAutenticacion.Provider,
        { value: auth as any },
        React.createElement(
          ContextoDatos.Provider,
          { value: datos as any },
          React.createElement(DistribucionActividadRemota, props),
        ),
      ),
    ),
  ).replace(/<!--.*?-->/g, '');
}

test('Acceso 2 (desde detalle del evento): preselecciona la actividad y muestra botón Volver al evento', () => {
  const html = renderizarEditor({
    eventId: eventoPrueba.id,
    dateId: actividadControlada.id,
    navigate: () => {},
  });
  assert.match(html, /Volver al evento/);
  assert.match(html, /Distribución de lugares/);
  assert.match(html, /Foro de Distribución Remota/);
  assert.match(html, /Conferencia Inaugural/);
  assert.doesNotMatch(html, /Selecciona una actividad con lugares asignados/);
  assert.doesNotMatch(html, /no utiliza lugares asignados/);
});

test('Acceso 1 (sin actividad preseleccionada): no preselecciona actividad ni muestra Volver al evento', () => {
  const html = renderizarEditor({ navigate: () => {} });
  assert.doesNotMatch(html, /Volver al evento/);
  assert.match(html, /<option value="" selected="">Selecciona una actividad con lugares asignados<\/option>/);
  assert.match(html, /Foro de Distribución Remota · Conferencia Inaugural/);
});

test('Subdirección puede abrir el editor preseleccionado de cualquier evento controlado', () => {
  const html = renderizarEditor(
    { eventId: eventoPrueba.id, dateId: actividadControlada.id, navigate: () => {} },
    subdireccion,
    'subdireccion',
  );
  assert.match(html, /Foro de Distribución Remota/);
  assert.match(html, /Conferencia Inaugural/);
  assert.doesNotMatch(html, /Selecciona una actividad con lugares asignados/);
  assert.doesNotMatch(html, /Solo el organizador responsable o Subdirección/);
});

test('Muestra avisos claros si la actividad preseleccionada es libre o si el usuario no está autorizado', () => {
  const htmlLibre = renderizarEditor({
    eventId: eventoPrueba.id,
    dateId: actividadLibre.id,
    navigate: () => {},
  });
  assert.match(htmlLibre, /Esta actividad no utiliza lugares asignados/);

  const htmlAjeno = renderizarEditor(
    { eventId: eventoPrueba.id, dateId: actividadControlada.id, navigate: () => {} },
    otroUsuario,
    'organizador',
  );
  assert.match(htmlAjeno, /Solo el organizador responsable o Subdirección pueden administrar la distribución/);
});

test('MapaAsientos en editor remoto distingue ocupados de bloqueados, soporta solo lectura y coordina leyendas', () => {
  const lugares: ConfiguracionAsiento[] = [
    { id: '1', fila: 'A', numero: 1, etiqueta: 'A-1', categoria: 'asistente', estaBloqueado: false },
    { id: '2', fila: 'A', numero: 2, etiqueta: 'A-2', categoria: 'vip', estaBloqueado: false },
    { id: '3', fila: 'A', numero: 3, etiqueta: 'A-3', categoria: 'staff', estaBloqueado: false },
    { id: '4', fila: 'A', numero: 4, etiqueta: 'A-4', categoria: 'asistente', estaBloqueado: true },
    { id: '5', fila: 'A', numero: 5, etiqueta: 'A-5', categoria: 'asistente', estaBloqueado: false },
  ];

  // 1. Modo editable con un lugar ocupado (id '5') y uno bloqueado (id '4') en Sala 14
  const htmlEditable = renderToString(
    React.createElement(MapaAsientos, {
      asientos: lugares,
      tipoRecinto: 'sala',
      modo: 'editor',
      idsAsientosReservados: ['5'],
      motivosNoEditables: new Map([['5', 'Tiene un apartado o una reserva']]),
      ocultarOrganizador: true,
      mostrarLeyendaOcupado: true,
    }),
  ).replace(/<!--.*?-->/g, '');

  // Leyendas coordinadas para PostgreSQL (sin Comité / Docente ni Módulo Suprimido)
  assert.match(htmlEditable, /Asistente \(Libre\)/);
  assert.match(htmlEditable, /★ VIP/);
  assert.match(htmlEditable, /Staff Técnico/);
  assert.match(htmlEditable, /Bloqueado \/ Fuera de servicio/);
  assert.match(htmlEditable, /Ocupado \(no editable\)/);
  assert.doesNotMatch(htmlEditable, /Comité \/ Docente/);
  assert.doesNotMatch(htmlEditable, /Módulo Suprimido/);

  // El lugar ocupado se distingue visualmente en azul cielo y está deshabilitado
  const botonOcupado = htmlEditable.match(/<button\b[^>]*title="A-5 — Tiene un apartado o una reserva"[^>]*>.*?<\/button>/)?.[0];
  assert.ok(botonOcupado, 'Debe renderizar el botón del lugar ocupado');
  assert.ok(botonOcupado.includes('disabled=""'), 'El lugar ocupado debe estar deshabilitado');
  assert.ok(botonOcupado.includes('bg-sky-100'), 'El lugar ocupado debe distinguirse visualmente del bloqueado');
  assert.ok(!botonOcupado.includes('lucide-ban'), 'El lugar ocupado no debe mostrarse como bloqueado con ícono Ban');

  // El lugar bloqueado sigue habilitado para desbloquear y muestra el ícono Ban
  const botonBloqueado = htmlEditable.match(/<button\b[^>]*title="A-4 — Bloqueada para logística"[^>]*>.*?<\/button>/)?.[0];
  assert.ok(botonBloqueado, 'Debe renderizar el botón del lugar bloqueado');
  assert.ok(!botonBloqueado.includes('disabled=""'), 'Un lugar bloqueado manualmente en editor debe poder editarse');
  assert.ok(botonBloqueado.includes('lucide-ban'), 'Un lugar bloqueado debe mostrar ícono Ban');

  // 2. Modo solo lectura (editable: false) deshabilita todos los botones del mapa
  const htmlSoloLectura = renderToString(
    React.createElement(MapaAsientos, {
      asientos: lugares,
      tipoRecinto: 'auditorio',
      modo: 'editor',
      editorDeshabilitado: true,
      motivosNoEditables: new Map(lugares.map((l) => [l.id, 'Actividad en solo lectura'])),
      ocultarOrganizador: true,
      mostrarLeyendaOcupado: true,
    }),
  ).replace(/<!--.*?-->/g, '');

  const botonLibreSoloLectura = htmlSoloLectura.match(/<button\b[^>]*title="A-1 — Actividad en solo lectura"[^>]*>/)?.[0];
  assert.ok(botonLibreSoloLectura?.includes('disabled=""'), 'En solo lectura todos los lugares deben estar deshabilitados');
});

test('Conflicto 409 conserva cambios locales pendientes, señala lugares recién ocupados y protege solo lectura', () => {
  const lugaresRecargados = [
    { idLugarRecinto: '10', codigo: 'A-1', fila: 'A', x: 1, y: 1, categoria: 'asistente' as const, fueraDeServicio: false, ocupado: true },
    { idLugarRecinto: '11', codigo: 'A-2', fila: 'A', x: 2, y: 1, categoria: 'asistente' as const, fueraDeServicio: false, ocupado: false },
    { idLugarRecinto: '12', codigo: 'A-3', fila: 'A', x: 3, y: 1, categoria: 'staff' as const, fueraDeServicio: false, ocupado: false },
    { idLugarRecinto: '13', codigo: 'A-4', fila: 'A', x: 4, y: 1, categoria: 'bloqueado' as const, fueraDeServicio: true, ocupado: false },
  ];

  // El usuario tenía 3 cambios pendientes antes del 409:
  // - 10 -> vip (mientras tanto otro usuario reservó 10 -> ahora ocupado: true)
  // - 11 -> vip (sigue libre -> debe conservarse intacto para poder guardarlo)
  // - 12 -> staff (otra sesión ya lo guardó como staff -> se concilia sin duplicar)
  const pendientesTrasRecarga = conciliarPendientesDistribucion(
    { '10': 'vip', '11': 'vip', '12': 'staff' },
    lugaresRecargados,
  );
  assert.deepEqual(pendientesTrasRecarga, { '10': 'vip', '11': 'vip' });

  const evaluacion = evaluarMapaDistribucion(
    { editable: true, lugares: lugaresRecargados },
    pendientesTrasRecarga,
  );
  assert.deepEqual(evaluacion.idsOcupados, ['10']);
  assert.equal(evaluacion.motivosNoEditables.get('10'), 'Tiene un apartado o una reserva');
  assert.equal(evaluacion.motivosNoEditables.get('13'), 'Fuera de servicio');
  assert.equal(evaluacion.motivosNoEditables.has('11'), false);
  // Solo el lugar 10 quedó impedido; el 11 sigue editable
  assert.deepEqual(evaluacion.cambiosImpedidos.map(([id]) => id), ['10']);
  // El lugar ocupado NO se marca como estaBloqueado para que MapaAsientos lo muestre como Ocupado y no como Bloqueado
  assert.equal(evaluacion.mapa.find((l) => l.id === '10')?.estaBloqueado, false);
  assert.equal(evaluacion.mapa.find((l) => l.id === '13')?.estaBloqueado, true);

  // En solo lectura, todos los lugares reciben motivo y quedan protegidos
  const soloLectura = evaluarMapaDistribucion(
    { editable: false, lugares: lugaresRecargados },
    {},
  );
  assert.equal(soloLectura.motivosNoEditables.get('11'), 'Actividad en solo lectura');
  assert.equal(soloLectura.motivosNoEditables.get('12'), 'Actividad en solo lectura');
});
