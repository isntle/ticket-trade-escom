import { test } from "node:test";
import assert from "node:assert/strict";
import { SUBEQUIPOS } from "../src/componentes/demostracion/ExploradorCasosUso";
import { resolverRutaDocumentacion } from "../src/dominio/navegacionDocumentacion";
import { EVENTOS_INICIALES } from "../src/datos/datosIniciales";

test("la demostración selecciona recursos propios futuros y maneja un catálogo vacío", () => {
  const caso = { id: "CU-OR-19", ruta: "/organizador/eventos/evt-simposio-ia" };
  const ruta = resolverRutaDocumentacion(
    caso,
    EVENTOS_INICIALES,
    new Date("2026-10-18T00:00:00Z"),
  );
  const evento = EVENTOS_INICIALES.find(
    (e) => ruta === `/organizador/eventos/${e.id}`,
  );
  assert.ok(evento);
  assert.equal(evento.idOrganizador, "usr-silva");
  assert.notEqual(evento.id, "evt-simposio-ia");
  assert.equal(resolverRutaDocumentacion(caso, []), "/organizador");
  assert.equal(
    resolverRutaDocumentacion({ id: "CU-OR-26", ruta: "/admin/recintos" }, []),
    "/admin/recintos",
  );
});

test("el catálogo conserva los 49 casos oficiales sin IDs duplicados", () => {
  const casos = SUBEQUIPOS.flatMap((e) => e.casos);
  assert.deepEqual(
    SUBEQUIPOS.map((e) => e.casos.length),
    [8, 27, 9, 5],
  );
  assert.equal(new Set(casos.map((c) => c.id)).size, 49);
  const oficiales = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06.1",
    "06.2",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    ...Array.from({ length: 14 }, (_, i) => String(i + 15)),
  ].map((id) => "CU-OR-" + id);
  assert.deepEqual(
    SUBEQUIPOS.find((e) => e.id === "organizacion")!
      .casos.map((c) => c.id)
      .sort(),
    oficiales.sort(),
  );
});
test("B tiene rutas, controles y respuestas; catálogo y administración no abren el formulario equivocado", () => {
  const casos = SUBEQUIPOS.find((e) => e.id === "organizacion")!.casos;
  for (const caso of casos) {
    assert.ok(caso.ruta?.startsWith("/"), caso.id);
    assert.ok(caso.control, caso.id);
    assert.ok(caso.respuesta, caso.id);
  }
  assert.equal(casos.find((c) => c.id === "CU-OR-04")?.ruta, "/recintos");
  assert.equal(casos.find((c) => c.id === "CU-OR-26")?.ruta, "/admin/recintos");
  assert.equal(
    casos.find((c) => c.id === "CU-OR-27")?.ruta,
    "/admin/ocupaciones",
  );
  assert.equal(casos.find((c) => c.id === "CU-OR-28")?.actor, "Administrador");
});
