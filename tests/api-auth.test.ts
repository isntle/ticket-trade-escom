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

    // 4. Registrar cuenta externa en PostgreSQL y confirmar correo
    const correoNuevo = `registro.prueba.${Date.now()}@example.invalid`;
    const resRegistro = await fetch(`${baseUrl}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombres: 'Usuario',
        primerApellido: 'Prueba',
        segundoApellido: 'Registro',
        correo: correoNuevo,
        password: 'Regina504+',
        afiliacion: 'externo',
      }),
    });
    const jsonRegistro = await resRegistro.json();
    assert.equal(resRegistro.status, 201, JSON.stringify(jsonRegistro));
    assert.ok(jsonRegistro.datos?.idCuenta);
    assert.ok(jsonRegistro.datos?.codigoPrueba);

    const fila = await pool.query(
      `SELECT c.correo, c.id_estado_cuenta::text AS estado
       FROM ticket_trade."Cuenta" c
       WHERE c.id_cuenta = $1`,
      [jsonRegistro.datos.idCuenta],
    );
    assert.equal(fila.rows[0]?.correo, correoNuevo);
    assert.equal(fila.rows[0]?.estado, '1'); // Pendiente de activación

    const resConfirmar = await fetch(`${baseUrl}/api/auth/confirmar-correo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: jsonRegistro.datos.codigoPrueba }),
    });
    const jsonConfirmar = await resConfirmar.json();
    assert.equal(resConfirmar.status, 200, JSON.stringify(jsonConfirmar));

    const activa = await pool.query(
      `SELECT c.id_estado_cuenta::text AS estado, c.correo_confirmado_en IS NOT NULL AS confirmado
       FROM ticket_trade."Cuenta" c
       WHERE c.id_cuenta = $1`,
      [jsonRegistro.datos.idCuenta],
    );
    assert.equal(activa.rows[0]?.estado, '2'); // Activa
    assert.equal(activa.rows[0]?.confirmado, true);

    const resLoginNuevo = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: correoNuevo, password: 'Regina504+' }),
    });
    assert.equal(resLoginNuevo.status, 200);
  } catch (error: any) {
    if (error?.cause?.code === 'EACCES' || error?.code === 'EACCES') {
      t.skip('Llamada HTTP bloqueada por restricción de red de sandbox.');
      return;
    }
    throw error;
  }
});
