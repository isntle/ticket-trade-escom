import { test } from "node:test";
import assert from "node:assert/strict";
import type { EstadoEvento, FechaEvento } from "../src/tipos";
import {
  filtrarPorTituloYEstado,
  nombreEstadoOrganizador,
  ordenarEventosOrganizador,
  ordenarSolicitudesRecientes,
} from "../src/dominio/filtrosOrganizador";
const filas = [
  { titulo: "Simposio de Robótica", estado: "publicado" },
  { titulo: "Taller de Robótica", estado: "borrador" },
  { titulo: "Congreso", estado: "publicado" },
];
test("Combina título y estado, conserva acentos y no modifica los registros", () => {
  assert.deepEqual(
    filtrarPorTituloYEstado(
      filas,
      (x) => x.titulo,
      "  ROBOTICA  ",
      "publicado",
    ),
    [filas[0]],
  );
  assert.deepEqual(
    filtrarPorTituloYEstado(filas, (x) => x.titulo, "", "TODOS"),
    filas,
  );
  assert.deepEqual(
    filtrarPorTituloYEstado(filas, (x) => x.titulo, "ausente", "TODOS"),
    [],
  );
  assert.equal(filas.length, 3);
});
test("Sirve también para solicitudes y devuelve estados entendibles", () => {
  const solicitudes = [
    { tituloEvento: "Congreso de cómputo", estado: "en_revision" },
  ];
  assert.equal(
    filtrarPorTituloYEstado(
      solicitudes,
      (x) => x.tituloEvento,
      "computo",
      "en_revision",
    ).length,
    1,
  );
  assert.equal(nombreEstadoOrganizador("en_revision"), "En revisión");
  assert.equal(nombreEstadoOrganizador("requiere_correccion"), "Por corregir");
});

test("Los eventos activos y próximos aparecen antes que el historial con la actividad que determina el orden", () => {
  const actividad = (fecha: string, cancelada = false): FechaEvento => ({
    id: fecha, idEvento: "1", fecha, horaInicio: "10:00", horaFin: "12:00", idRecinto: "1", cancelada,
    esFinalConfirmado: false, ponentes: [],
  });
  const crear = (id: string, fechas: FechaEvento[], estado: EstadoEvento = "publicado") => ({ id, fechas, estado });
  const eventos = [
    crear("antiguo", [actividad("2026-11-19")]),
    crear("más adelante", [actividad("2026-12-06")]),
    crear("cancelado", [actividad("2026-11-24", true)], "cancelado"),
    crear("próximo", [actividad("2026-11-01"), actividad("2026-11-26", true), actividad("2026-11-28")]),
    crear("en curso", [actividad("2026-11-25")], "en_curso"),
  ];
  const ordenados = ordenarEventosOrganizador(eventos, Date.parse("2026-11-25T17:00:00Z"));
  assert.deepEqual(ordenados.map(e => e.evento.id), ["en curso", "próximo", "más adelante", "cancelado", "antiguo"]);
  assert.equal(ordenados[1].actividadPrincipal?.fecha, "2026-11-28");
  assert.equal(eventos[0].id, "antiguo");
});

test("Las solicitudes se ordenan por envío inicial, con la fecha de creación como respaldo", () => {
  const solicitudes = [
    { id: "antigua", fechaCreacion: "2026-11-10", fechaUltimoCambio: "2026-11-25" },
    { id: "sin fecha", fechaCreacion: "" },
    { id: "reciente", fechaCreacion: "2026-11-09", fechaEnvioInicial: "2026-11-23" },
  ];
  assert.deepEqual(ordenarSolicitudesRecientes(solicitudes).map(s => s.id), ["reciente", "antigua", "sin fecha"]);
});
