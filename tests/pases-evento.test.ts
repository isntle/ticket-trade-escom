import { test } from "node:test";
import assert from "node:assert/strict";
import type { BoletoDigital } from "../src/tipos";
import {
  accesoPendienteDelEvento,
  accesoDelPase,
  agruparPasesEvento,
  codigoQrDelEvento,
} from "../src/dominio/pasesEvento";
const codigo = "TT-" + "A".repeat(32),
  anterior = "TT-" + "B".repeat(32);
const boleto: BoletoDigital = {
  id: "b1",
  idReservacion: "r1",
  idEvento: "e1",
  idFechaEvento: "a1",
  idUsuario: "u1",
  nombreUsuario: "Persona de prueba",
  correoUsuario: "prueba@example.test",
  tituloEvento: "Evento",
  fechaEvento: "2030-01-01",
  horaEvento: "10:00 - 12:00",
  nombreRecinto: "Sala",
  codigoQr: codigo,
  estado: "valido",
  fechaEmision: "2026-10-01T12:00:00Z",
};
const segundo = {
  ...boleto,
  id: "b2",
  idReservacion: "r2",
  idFechaEvento: "a2",
  codigoQr: anterior,
  fechaEmision: "2026-10-02T12:00:00Z",
};
test("un evento y titular tienen un solo pase con accesos separados y QR estable", () => {
  const pase = agruparPasesEvento([segundo, boleto])[0];
  assert.equal(pase.codigoQr, codigo);
  assert.equal(pase.accesos.length, 2);
  assert.equal(
    codigoQrDelEvento(
      [{ ...boleto, estado: "cancelado" }, segundo],
      "e1",
      "u1",
    ),
    codigo,
  );
});
test("el QR común y los códigos anteriores resuelven la actividad seleccionada", () => {
  assert.equal(accesoDelPase([boleto, segundo], codigo, "e1", "a2")!.id, "b2");
  assert.equal(
    accesoDelPase([boleto, segundo], anterior, "e1", "a1")!.id,
    "b1",
  );
  assert.equal(
    accesoDelPase([boleto, segundo], codigo, "e1", "no-reservada"),
    undefined,
  );
  assert.equal(
    accesoDelPase([boleto, segundo], codigo, "otro-evento", "a1"),
    undefined,
  );
});
test("entrada o cancelación de una actividad no consume las demás", () => {
  assert.equal(
    accesoDelPase(
      [{ ...boleto, estado: "utilizado" }, segundo],
      codigo,
      "e1",
      "a2",
    )!.estado,
    "valido",
  );
  assert.equal(
    accesoDelPase(
      [{ ...boleto, estado: "cancelado" }, segundo],
      codigo,
      "e1",
      "a2",
    )!.estado,
    "valido",
  );
});
test("no agrupa personas distintas por compartir correo y rechaza identificadores ambiguos", () => {
  const otra = { ...segundo, id: "b3", idUsuario: "u2" };
  assert.equal(agruparPasesEvento([boleto, otra]).length, 2);
  assert.equal(
    accesoDelPase([boleto, { ...otra, codigoQr: codigo }], codigo, "e1", "a1"),
    undefined,
  );
});
test("una nueva reserva sustituye su acceso cancelado en la vista sin perder el QR anterior", () => {
  const cancelado = { ...boleto, estado: "cancelado" as const };
  const nuevo = { ...segundo, idFechaEvento: "a1" };
  const pase = agruparPasesEvento([cancelado, nuevo])[0];
  assert.equal(pase.codigoQr, codigo);
  assert.equal(pase.accesos.length, 1);
  assert.equal(pase.accesos[0].id, nuevo.id);
});

test("las actividades pasadas dejan de ser accesos pendientes sin cancelar su historial", () => {
  const evento = {
    id: "e1",
    estado: "publicado",
    fechas: [
      { id: "a1", fecha: "2030-01-01", horaInicio: "10:00", horaFin: "12:00" },
    ],
  } as import("../src/tipos").Evento;
  assert.equal(
    accesoPendienteDelEvento(
      boleto,
      evento,
      Date.parse("2030-01-01T11:59:59-06:00"),
    ),
    true,
  );
  assert.equal(
    accesoPendienteDelEvento(
      boleto,
      evento,
      Date.parse("2030-01-01T12:00:00-06:00"),
    ),
    false,
  );
  assert.equal(boleto.estado, "valido");
  assert.equal(
    accesoPendienteDelEvento(
      boleto,
      { ...evento, estado: "cancelado" },
      Date.parse("2029-12-31"),
    ),
    false,
  );
});
