import { test } from "node:test";
import assert from "node:assert/strict";
import {
  impedimentoVerificacion,
  periodoIdentidadActual,
  rechazosPeriodo,
  validarPeriodosIdentidad,
  leerPeriodosIdentidad,
  PERIODOS_IPN_2026_2027,
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
test("calendario IPN escolarizado: límites oficiales, receso y renovación de periodo", () => {
  const p = PERIODOS_IPN_2026_2027;
  assert.equal(validarPeriodosIdentidad(p), undefined);
  assert.equal(periodoIdentidadActual(p, Date.parse("2026-10-25T12:00:00-06:00"))?.id, "27/1");
  assert.equal(periodoIdentidadActual(p, Date.parse("2026-12-18T23:59:59.999-06:00"))?.id, "27/1");
  assert.equal(periodoIdentidadActual(p, Date.parse("2026-12-19T00:00:00-06:00")), undefined);
  assert.equal(periodoIdentidadActual(p, Date.parse("2027-01-25T00:00:00-06:00"))?.id, "27/2");
  assert.equal(periodoIdentidadActual(p, Date.parse("2027-06-23T00:00:00-06:00")), undefined);
  const cuenta = { ...USUARIOS_INICIALES[0], historialExpediente: ["2026-09-01", "2026-10-01", "2026-10-20"].map(fecha => ({estado:"rechazado",fecha:fecha+"T12:00:00-06:00",responsable:"Prueba",documentos:[]})) };
  assert.match(impedimentoVerificacion(cuenta,p,Date.parse("2026-10-25T12:00:00-06:00"))!, /tres rechazos/);
  assert.equal(impedimentoVerificacion(cuenta,p,Date.parse("2027-01-25T00:00:00-06:00")), undefined);
});
test("la precarga no sobrescribe calendarios guardados ni oculta datos inválidos", () => {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let valor: string | null = null;
  Object.defineProperty(globalThis, "localStorage", {configurable:true,value:{getItem:()=>valor}});
  try {
    assert.deepEqual(leerPeriodosIdentidad(), PERIODOS_IPN_2026_2027);
    const copia = leerPeriodosIdentidad(); copia[0].id = "modificado";
    assert.equal(leerPeriodosIdentidad()[0].id, "27/1");
    valor = JSON.stringify(periodos);
    assert.deepEqual(leerPeriodosIdentidad(), periodos);
    valor = "[]"; assert.deepEqual(leerPeriodosIdentidad(), []);
    valor = "inválido"; assert.deepEqual(leerPeriodosIdentidad(), []);
  } finally {
    if (anterior) Object.defineProperty(globalThis,"localStorage",anterior);
    else Reflect.deleteProperty(globalThis,"localStorage");
  }
});
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
