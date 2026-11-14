import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("API disponibilidad: ambos endpoints exigen sesión antes de leer la agenda", async (t) => {
  const { app } = await import("../backend/app");
  const { pool } = await import("../backend/bd/pool");
  const servidor = http.createServer(app);
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
    await pool.end();
  });
  const base = `http://127.0.0.1:${(servidor.address() as any).port}/api/organizacion/disponibilidad`;
  const agenda = await fetch(base + "/agenda?fecha=2030-01-25&idRecinto=1");
  assert.equal(agenda.status, 401);
  assert.equal((await agenda.json()).error.codigo, "NO_AUTENTICADO");
  const revision = await fetch(base + "/revision", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actividades: [{ id: "a", idRecinto: "1", fecha: "2030-01-25", horaInicio: "10:00", horaFin: "11:00" }] }),
  });
  assert.equal(revision.status, 401);
  assert.equal((await revision.json()).error.codigo, "NO_AUTENTICADO");
});
