import assert from "node:assert/strict";
import { test } from "node:test";
import { suscribirActualizacionVisible } from "../src/servicios/actualizacionVisible.js";

test("las consultas se pausan con la pestaña oculta y se reanudan al volver o reconectar", (t) => {
  const pagina = Object.assign(new EventTarget(), { hidden: true });
  const red = { onLine: true };
  let consultarEnIntervalo: (() => void) | undefined;
  const ventana = Object.assign(new EventTarget(), {
    setInterval: (consultar: () => void) => {
      consultarEnIntervalo = consultar;
      return 1;
    },
    clearInterval: () => { consultarEnIntervalo = undefined; },
  });
  const entorno = { document: pagina, navigator: red, window: ventana };
  for (const [nombre, valor] of Object.entries(entorno)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, nombre);
    Object.defineProperty(globalThis, nombre, { configurable: true, value: valor });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, nombre, original);
      else Reflect.deleteProperty(globalThis, nombre);
    });
  }

  let consultas = 0;
  const detener = suscribirActualizacionVisible(() => { consultas++; }, 15_000);

  consultarEnIntervalo?.();
  assert.equal(consultas, 0);
  pagina.hidden = false;
  pagina.dispatchEvent(new Event("visibilitychange"));
  assert.equal(consultas, 1);

  red.onLine = false;
  consultarEnIntervalo?.();
  assert.equal(consultas, 1);
  red.onLine = true;
  ventana.dispatchEvent(new Event("online"));
  assert.equal(consultas, 2);

  detener();
  assert.equal(consultarEnIntervalo, undefined);
  pagina.dispatchEvent(new Event("visibilitychange"));
  ventana.dispatchEvent(new Event("online"));
  assert.equal(consultas, 2);
});
