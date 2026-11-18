import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenPrivadoValido } from '../backend/comun/enlacePrivado';
import { tokenEnlacePrivado } from '../src/servicios/enlacePrivado';

test('el enlace exige un token no vacío y coincide exactamente', () => {
  assert.equal(tokenPrivadoValido(null, null), false);
  assert.equal(tokenPrivadoValido('', ''), false);
  assert.equal(tokenPrivadoValido('abc', 'abd'), false);
  assert.equal(tokenPrivadoValido('abc', 'abc'), true);
  assert.equal(tokenPrivadoValido('x'.repeat(257), 'x'.repeat(257)), false);
});

test('el token del fragmento se conserva solo para su evento y sale de la dirección', () => {
  const datos = new Map<string,string>();
  const session = { setItem: (k:string,v:string) => datos.set(k,v), getItem: (k:string) => datos.get(k) ?? null };
  let ruta = '';
  const ventana = { location: { href: 'https://ticket.example/eventos/42?demo=1#key=secreto' }, history: { state: {}, replaceState: (_:unknown, __:string, valor:string) => { ruta = valor; } } };
  const anteriores = { window: globalThis.window, sessionStorage: globalThis.sessionStorage };
  Object.assign(globalThis, { window: ventana, sessionStorage: session });
  try {
    assert.equal(tokenEnlacePrivado('42'), 'secreto');
    assert.equal(ruta, '/eventos/42?demo=1');
    ventana.location.href = 'https://ticket.example/eventos/42/reservar?dateId=7';
    assert.equal(tokenEnlacePrivado('42'), 'secreto');
    assert.equal(tokenEnlacePrivado('43'), undefined);
  } finally { Object.assign(globalThis, anteriores); }
});
