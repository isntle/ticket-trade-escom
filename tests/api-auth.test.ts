import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../backend/app';
import { pool } from '../backend/bd/pool';
import http from 'node:http';

test('Autenticación contra PostgreSQL: login, cookie y /yo', async (t) => {
  const server = http.createServer(app);

  try {
    await new Promise<void>((resolve, reject) => {
      server.listen(0, resolve);
      server.on('error', reject);
    });
  } catch (error: any) {
    if (error?.code === 'EACCES' || error?.code === 'EPERM') {
      t.skip('Entorno con restricción de sockets de red locales.');
      return;
    }
    throw error;
  }

  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end().catch(() => {});
  });

  try {
    // 1. Iniciar sesión con cuenta Administrador de PostgreSQL
    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: 'cuenta1001@example.invalid',
        password: 'Regina504+',
      }),
    });

    const jsonLogin = await resLogin.json();
    assert.equal(resLogin.status, 200);
    assert.equal(jsonLogin.datos.usuario.correo, 'cuenta1001@example.invalid');
    assert.ok(jsonLogin.datos.usuario.roles.includes('admin'));

    // Extraer cookie
    const cookie = resLogin.headers.get('set-cookie');
    assert.ok(cookie && cookie.includes('tt_sesion_id'));

    // 2. Consultar /yo con la cookie recibida
    const resYo = await fetch(`${baseUrl}/api/auth/yo`, {
      headers: { Cookie: cookie },
    });
    const jsonYo = await resYo.json();
    assert.equal(resYo.status, 200);
    assert.equal(jsonYo.datos.usuario.id, '1001');
    assert.equal(jsonYo.datos.usuario.rolActivo, 'admin');

    // 3. Cerrar sesión
    const resLogout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.equal(resLogout.status, 200);
  } catch (error: any) {
    if (error?.cause?.code === 'EACCES' || error?.code === 'EACCES') {
      t.skip('Llamada HTTP bloqueada por restricción de red de sandbox.');
      return;
    }
    throw error;
  }
});
