import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("La conexión es explícita y nunca añade contraseñas ni infraestructura inventada", () => {
  const pool = readFileSync("backend/bd/pool.ts", "utf8");
  assert.ok(!pool.includes("password:"));
  const app = readFileSync("backend/app.ts", "utf8");
  assert.ok(
    app.includes("WHERE ee.nombre='Publicado' AND ve.nombre='Público'"),
  );
  assert.ok(!app.includes("['Proyector', 'Audio', 'Aire acondicionado']"));
});
