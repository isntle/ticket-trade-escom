import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import crypto from "node:crypto";
import http from "node:http";
import { instalar } from "../backend/scripts/bd";

test(
  "URL normal y demo: bases independientes, cuentas, sesiones y registros sin contaminación",
  { skip: !process.env.TT_API_PRUEBAS },
  async (t) => {
    const origen = process.env.DATABASE_URL!;
    const admin = new pg.Client({ connectionString: origen });
    await admin.connect();
    const actual = (await admin.query("SELECT current_database() n")).rows[0].n;
    assert.ok(
      /^tt_pruebas_[a-f0-9]{16}$/.test(actual) &&
        actual === process.env.TT_BD_DESECHABLE,
    );
    const nombre = "tt_pruebas_" + crypto.randomBytes(8).toString("hex");
    await admin.query(
      `CREATE DATABASE "${nombre}" ENCODING 'UTF8' TEMPLATE template0`,
    );
    let servidor: http.Server | undefined,
      cerrarPool: (() => Promise<void>) | undefined;
    t.after(async () => {
      if (servidor) await new Promise<void>((r) => servidor!.close(() => r()));
      if (cerrarPool) await cerrarPool();
      await admin.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1",
        [nombre],
      );
      await admin.query(`DROP DATABASE "${nombre}"`);
      await admin.end();
    });
    const limpia = new URL(origen);
    limpia.pathname = "/" + nombre;
    const nueva = new pg.Client({ connectionString: limpia.toString() });
    await nueva.connect();
    try {
      await instalar(nueva);
    } finally {
      await nueva.end();
    }
    process.env.DATABASE_URL_DEMO = origen;
    process.env.DATABASE_URL = limpia.toString();
    const { app } = await import("../backend/app");
    const { pool } = await import("../backend/bd/pool");
    cerrarPool = () => pool.end();
    servidor = http.createServer(app);
    await new Promise<void>((r) => servidor!.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${(servidor.address() as any).port}`;
    async function pedir(
      ruta: string,
      demo = false,
      body?: unknown,
      cookie?: string,
    ) {
      return fetch(base + ruta, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(demo ? { "X-TicketTrade-Demo": "1" } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
    async function bien(r: Response, status = 200) {
      assert.equal(r.status, status, await r.clone().text());
      return (await r.json()).datos;
    }
    assert.deepEqual(
      await bien(await pedir("/api/eventos")),
      [],
      "La base normal empieza vacía",
    );
    assert.ok(
      (await bien(await pedir("/api/eventos", true))).length > 0,
      "El catálogo vive solo en la demo",
    );
    assert.deepEqual(
      await bien(await pedir("/api/auth/demo")),
      [],
      "No hay selector de cuentas fuera de demo",
    );
    assert.ok((await bien(await pedir("/api/auth/demo", true))).length >= 6);
    const body = {
      nombres: "Ana María",
      primerApellido: "Hernández",
      segundoApellido: "",
      correo: "aislamiento@alumno.ipn.mx",
      password: "ClaveSegura-123",
      rol: "Estudiante",
      boleta: "2026630991",
    };
    const r = await bien(await pedir("/api/auth/registro", false, body), 201);
    assert.equal(
      (
        await admin.query(
          'SELECT count(*)::int n FROM ticket_trade."Cuenta" WHERE correo=$1',
          [body.correo],
        )
      ).rows[0].n,
      0,
      "Registrar fuera de demo no toca la demo",
    );
    await bien(
      await pedir("/api/auth/confirmar-correo", false, {
        token: r.codigoPrueba,
      }),
    );
    const login = await pedir("/api/auth/login", false, {
      correo: body.correo,
      password: body.password,
    });
    await bien(login);
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    assert.match(cookie, /^tt_sesion_id=/);
    assert.equal(
      (await pedir("/api/auth/yo", true, undefined, cookie)).status,
      401,
      "La cookie normal no autentica en demo",
    );
    const d = await bien(
      await pedir("/api/auth/registro", true, {
        ...body,
        nombres: "Cuenta de demostración",
      }),
      201,
    );
    await bien(
      await pedir("/api/auth/confirmar-correo", true, {
        token: d.codigoPrueba,
      }),
    );
    const loginDemo = await pedir("/api/auth/login", true, {
      correo: body.correo,
      password: body.password,
    });
    await bien(loginDemo);
    const cookieDemo = loginDemo.headers.get("set-cookie")!.split(";")[0];
    assert.match(cookieDemo, /^tt_sesion_demo=/);
    assert.equal(
      (await pedir("/api/auth/yo", false, undefined, cookieDemo)).status,
      401,
      "La cookie demo no autentica en normal",
    );
    assert.equal(
      (await bien(await pedir("/api/auth/yo", false, undefined, cookie)))
        .usuario.nombre,
      "Ana María Hernández",
    );
    assert.equal(
      (await bien(await pedir("/api/auth/yo", true, undefined, cookieDemo)))
        .usuario.nombre,
      "Cuenta de demostración Hernández",
    );
    assert.equal(
      (await pool.query('SELECT count(*)::int n FROM ticket_trade."Evento"'))
        .rows[0].n,
      0,
      "No se copian eventos demo a la base normal",
    );
    const estado = await bien(
      await pedir("/api/estado", true, undefined, cookieDemo),
    );
    const modalidades = new Set(
      estado.listaEventos.flatMap((e: any) =>
        e.fechas.map((f: any) => f.modalidadAsistencia),
      ),
    );
    for (const arreglo of estado.listaArreglos) {
      const recinto = estado.listaRecintos.find((r: any) => r.id === arreglo.idRecinto);
      assert.equal(new Set(arreglo.asientos.map((a: any) => a.id)).size, arreglo.asientos.length);
      if (recinto.tipo !== 'laboratorio') {
        for (const fila of new Set(arreglo.asientos.map((a: any) => a.fila))) {
          const numeros = arreglo.asientos.filter((a: any) => a.fila === fila).map((a: any) => a.numero);
          assert.deepEqual(numeros, numeros.map((_: number, i: number) => i + 1), 'El mapa numera cada fila desde uno');
        }
      }
    }
    assert.ok(
      ["libre", "registro", "controlado"].every((m) => modalidades.has(m)),
      "Hay acceso libre, registro y asiento controlado",
    );
    assert.ok(
      estado.listaEventos.some(
        (e: any) => new Set(e.fechas.map((f: any) => f.idRecinto)).size > 1,
      ),
      "Hay un evento con varios recintos",
    );
    assert.ok(
      estado.listaEventos.some((e: any) => e.fechas.length === 1),
      "También hay eventos sencillos",
    );
    assert.ok(
      estado.listaEventos.every(
        (e: any) => e.urlImagen && !/prueba [0-9]/i.test(e.titulo),
      ),
    );
    const actividadRegistro = estado.listaEventos.flatMap((e: any) => e.fechas)
      .find((f: any) => f.modalidadAsistencia === 'registro');
    const apartado = await bien(await pedir('/api/taquilla/apartados', true, {
      idActividad: actividadRegistro.id,
    }, cookieDemo), 201);
    const reservacion = await bien(await pedir(`/api/taquilla/apartados/${apartado.id}/confirmacion`, true, {}, cookieDemo), 201);
    const actualizado = await bien(await pedir('/api/estado', true, undefined, cookieDemo));
    const boleto = actualizado.listaBoletos.find((b: any) => b.idReservacion === reservacion.id);
    assert.ok(boleto, 'Registro sin asiento genera un pase persistido');
    assert.ok(!boleto.etiquetaAsiento, 'No inventa una butaca para registro general');
    await bien(await pedir(`/api/taquilla/reservaciones/${reservacion.id}/cancelacion`, true, {}, cookieDemo));
  },
);
