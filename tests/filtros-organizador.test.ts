import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filtrarPorTituloYEstado,
  nombreEstadoOrganizador,
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
