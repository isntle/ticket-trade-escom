import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../backend/app';
import { pool } from '../backend/bd/pool';
import http from 'node:http';

test('API endpoints de recintos y eventos devuelven datos reales de PostgreSQL', async (t) => {
  const server = http.createServer(app);

  try {
    await new Promise<void>((resolve, reject) => {
      server.listen(0, resolve);
      server.on('error', reject);
    });
  } catch (error: any) {
    // Si el entorno de ejecución restringe abrir puertos de red (sandbox local)
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
    // 1. Probar salud
    const resSalud = await fetch(`${baseUrl}/api/salud`);
    const jsonSalud = await resSalud.json();
    assert.equal(resSalud.status, 200);
    assert.equal(jsonSalud.datos.estado, 'en_linea');

    // 2. Probar recintos
    const resRecintos = await fetch(`${baseUrl}/api/recintos`);
    const jsonRecintos = await resRecintos.json();
    assert.equal(resRecintos.status, 200);
    assert.ok(Array.isArray(jsonRecintos.datos));
    assert.ok(jsonRecintos.datos.length >= 3);
    assert.equal(typeof jsonRecintos.datos[0].id, 'string');

    // 3. Probar eventos
    const resEventos = await fetch(`${baseUrl}/api/eventos`);
    const jsonEventos = await resEventos.json();
    assert.equal(resEventos.status, 200);
    assert.ok(Array.isArray(jsonEventos.datos));
    assert.ok(jsonEventos.datos.length >= 2);
    assert.equal(typeof jsonEventos.datos[0].id, 'string');
    assert.ok(Array.isArray(jsonEventos.datos[0].fechas));
  } catch (error: any) {
    if (error?.cause?.code === 'EACCES' || error?.code === 'EACCES') {
      t.skip('Llamada HTTP bloqueada por restricción de red de sandbox.');
      return;
    }
    throw error;
  }
});
