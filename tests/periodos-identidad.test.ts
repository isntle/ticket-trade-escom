import { test } from "node:test";
import assert from "node:assert/strict";
import {
  impedimentoVerificacion,
  periodoIdentidadActual,
  rechazosPeriodo,
  validarPeriodosIdentidad,
} from "../src/dominio/periodosIdentidad";
import { USUARIOS_INICIALES } from "../src/datos/datosIniciales";
const periodos = [
  {
    id: "prueba-1",
    inicio: "2026-08-01",
    fin: "2027-01-24",
    fuente: "Calendario ficticio de pruebas",
  },
  {
    id: "prueba-2",
    inicio: "2027-01-25",
    fin: "2027-07-31",
    fuente: "Calendario ficticio de pruebas",
  },
];
test("tres rechazos revisados restringen envíos únicamente durante el periodo correspondiente", () => {
  const historial = ["2026-09-01", "2026-10-01", "2026-10-20"].map((fecha) => ({
    estado: "rechazado",
    fecha: fecha + "T12:00:00-06:00",
    responsable: "Revisor de prueba",
    documentos: [],
  }));
  const u = {
    ...USUARIOS_INICIALES[0],
    historialExpediente: [
      ...historial,
      { ...historial[0], estado: "requiere_correccion" },
    ],
  };
  assert.equal(rechazosPeriodo(u, periodos[0]), 3);
  assert.match(
    impedimentoVerificacion(
      u,
      periodos,
      Date.parse("2026-10-25T12:00:00-06:00"),
    )!,
    /tres rechazos/,
  );
  assert.equal(
    impedimentoVerificacion(
      u,
      periodos,
      Date.parse("2027-01-25T00:00:00-06:00"),
    ),
    undefined,
  );
  assert.equal(
    periodoIdentidadActual(periodos, Date.parse("2027-01-24T23:59:59-06:00"))!
      .id,
    "prueba-1",
  );
});
test("periodos sin calendario, superpuestos o fechas inexistentes no son válidos", () => {
  assert.equal(validarPeriodosIdentidad(periodos), undefined);
  assert.ok(validarPeriodosIdentidad([{ ...periodos[0], fin: "2026-02-30" }]));
  assert.ok(
    validarPeriodosIdentidad([
      periodos[0],
      { ...periodos[1], inicio: "2027-01-24" },
    ]),
  );
  assert.ok(validarPeriodosIdentidad([{ ...periodos[0], fuente: "" }]));
  assert.match(
    impedimentoVerificacion(
      USUARIOS_INICIALES[0],
      [],
      Date.parse("2026-10-25"),
    )!,
    /configurar/,
  );
});
