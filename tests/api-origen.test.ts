import { test } from 'node:test';
import assert from 'node:assert/strict';
import { origenPermitido, origenSeguro } from '../backend/comun/seguridad';

test('desarrollo admite ambos nombres locales en el mismo puerto; producción exige origen exacto', () => {
  const configurado = 'http://localhost:3000';
  assert.equal(origenPermitido('http://127.0.0.1:3000', configurado, false), true);
  assert.equal(origenPermitido(configurado, 'http://127.0.0.1:3000', false), true);
  for (const origen of ['http://127.0.0.1:3001', 'https://127.0.0.1:3000', 'http://localhost.evil:3000', 'http://192.168.1.1:3000', 'null', 'http://localhost:3000/ruta']) {
    assert.equal(origenPermitido(origen, configurado, false), false, origen);
  }
  assert.equal(origenPermitido('http://127.0.0.1:3000', configurado, true), false);
  assert.equal(origenPermitido(configurado, configurado, true), true);
  assert.equal(origenPermitido('http://localhost:3000', 'https://ticket.example', false), false);
});
test('peticiones entre sitios continúan bloqueadas incluso con un origen local permitido', () => {
  let status = 0, continuo = false;
  const req = { get: (nombre: string) => nombre === 'sec-fetch-site' ? 'cross-site' : process.env.APP_ORIGIN };
  const res = { status: (n: number) => { status = n; return res; }, json: () => {} };
  origenSeguro(req as any, res as any, () => { continuo = true; });
  assert.equal(status, 403);
  assert.equal(continuo, false);
});
