import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { hashContrasena } from "../backend/comun/seguridad";

delete process.env.TT_CORREO_ACTIVO;

test(
  "PostgreSQL aislado: cambio de contraseña con sesiones e IDOR",
  { skip: !process.env.TT_API_PRUEBAS },
  async (t) => {
    const { app } = await import("../backend/app");
    const { pool, conTransaccion } = await import("../backend/bd/pool");
    const bd = (await pool.query("SELECT current_database() n")).rows[0].n;
    assert.ok(
      /^tt_pruebas_[a-f0-9]{16}$/.test(bd) &&
        bd === process.env.TT_BD_DESECHABLE,
      "Usa npm run test:postgres; esta prueba solo admite su base desechable.",
    );

    const sufijo = `${Date.now().toString(36)}${process.pid}`;
    const crearCuenta = async (correo: string, clave: string) => {
      const hash = await hashContrasena(clave);
      return conTransaccion(async (c) => {
        const { rows } = await c.query(
          `INSERT INTO ticket_trade."Cuenta"
        (nombres,primer_apellido,segundo_apellido,correo,contrasena_hash,correo_confirmado_en,id_tipo_cuenta,id_estado_cuenta)
        VALUES('Cuenta','Prueba','',$1,$2,CURRENT_TIMESTAMP,
        (SELECT id_tipo_cuenta FROM ticket_trade."TipoCuenta" WHERE nombre='Común'),
        (SELECT id_estado_cuenta FROM ticket_trade."EstadoCuenta" WHERE nombre='Activa'))
        RETURNING id_cuenta::text id`,
          [correo, hash],
        );
        await c.query(
          'INSERT INTO ticket_trade."PerfilUsuario" VALUES($1,(SELECT id_rol_registro FROM ticket_trade."RolRegistro" WHERE nombre=$2))',
          [rows[0].id, "Externo"],
        );
        return rows[0].id as string;
      });
    };
    const claveA = "Vieja-Aislada-938";
    const claveB = "Control-Aislada-938";
    const nuevaA = "Nueva-Aislada-938";
    const correoA = `descartable-a-${sufijo}@example.invalid`;
    const correoB = `descartable-b-${sufijo}@example.invalid`;
    const ids: string[] = [];
    const servidor = http.createServer(app);
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${(servidor.address() as any).port}`;
    t.after(async () => {
      try {
        if (ids.length) {
          const cuentas = [ids];
          await pool
            .query(
              "DELETE FROM infra.sesion_http WHERE id_cuenta=ANY($1::bigint[])",
              cuentas,
            )
            .catch(() => {});
          await pool
            .query(
              "DELETE FROM infra.correo_salida WHERE id_cuenta=ANY($1::bigint[])",
              cuentas,
            )
            .catch(() => {});
          await pool
            .query(
              'DELETE FROM ticket_trade."PerfilUsuario" WHERE id_cuenta=ANY($1::bigint[])',
              cuentas,
            )
            .catch(() => {});
          await pool
            .query(
              'DELETE FROM ticket_trade."Cuenta" WHERE id_cuenta=ANY($1::bigint[])',
              cuentas,
            )
            .catch(() => {});
        }
      } finally {
        servidor.closeAllConnections?.();
        await new Promise<void>((r) => servidor.close(() => r()));
        await pool.end().catch(() => {});
      }
    });
    const idA = await crearCuenta(correoA, claveA);
    ids.push(idA);
    const idB = await crearCuenta(correoB, claveB);
    ids.push(idB);

    const pedir = async (ruta: string, datos?: unknown, cookie?: string) =>
      fetch(base + ruta, {
        method: datos === undefined ? "GET" : "POST",
        headers: {
          ...(datos === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: datos === undefined ? undefined : JSON.stringify(datos),
      });
    const entrar = async (correo: string, clave: string) => {
      const r = await pedir("/api/auth/login", {
        correo,
        password: clave,
      });
      assert.equal(r.status, 200, await r.clone().text());
      return r.headers.get("set-cookie")!.split(";")[0];
    };
    const hashDe = async (id: string) =>
      (
        await pool.query(
          'SELECT contrasena_hash FROM ticket_trade."Cuenta" WHERE id_cuenta=$1',
          [id],
        )
      ).rows[0].contrasena_hash as string;
    const cambiar = (
      cookie: string,
      datos: Record<string, unknown>,
      extra = "",
    ) => pedir(`/api/auth/cambiar-password${extra}`, datos, cookie);

    assert.equal(
      (await pedir("/api/auth/cambiar-password", {
        passwordActual: claveA,
        passwordNueva: nuevaA,
      })).status,
      401,
      "Sin sesión no se puede cambiar la contraseña",
    );

    const cookieA = await entrar(correoA, claveA);
    const cookieA2 = await entrar(correoA, claveA);
    const cookieB = await entrar(correoB, claveB);
    const hashInicial = await hashDe(idA);
    const hashB = await hashDe(idB);
    assert.match(hashInicial, /^scrypt:/);

    const erronea = await cambiar(cookieA, {
      passwordActual: "Incorrecta-Aislada-938",
      passwordNueva: nuevaA,
    });
    assert.equal(erronea.status, 422, await erronea.clone().text());
    assert.equal(await hashDe(idA), hashInicial);
    assert.equal((await pedir("/api/auth/yo", undefined, cookieA)).status, 200);

    for (const invalida of ["corta", "sinmayusculas-938", "SinMayusculas"]) {
      const r = await cambiar(cookieA, {
        passwordActual: claveA,
        passwordNueva: invalida,
      });
      assert.equal(r.status, 422);
      assert.equal(await hashDe(idA), hashInicial);
    }
    const igual = await cambiar(cookieA, {
      passwordActual: claveA,
      passwordNueva: claveA,
    });
    assert.equal(igual.status, 422);
    assert.equal(
      (await igual.json()).error.mensaje,
      "La nueva contraseña debe ser diferente a la actual.",
    );
    assert.equal(await hashDe(idA), hashInicial);

    const idor = await cambiar(cookieA, {
      id: idB,
      passwordActual: claveA,
      passwordNueva: nuevaA,
    });
    assert.equal(idor.status, 400, await idor.clone().text());
    assert.equal(await hashDe(idA), hashInicial);
    assert.equal(await hashDe(idB), hashB);
    const idorQuery = await cambiar(
      cookieA,
      { passwordActual: claveA, passwordNueva: nuevaA },
      `?id_cuenta=${idB}`,
    );
    assert.equal(idorQuery.status, 400);

    const cambio = await cambiar(cookieA, {
      passwordActual: claveA,
      passwordNueva: nuevaA,
    });
    assert.equal(cambio.status, 200, await cambio.clone().text());
    assert.equal((await cambio.json()).datos.exito, true);
    assert.notEqual(await hashDe(idA), hashInicial);
    assert.equal(await hashDe(idB), hashB);
    assert.equal(
      (await pedir("/api/auth/yo", undefined, cookieA)).status,
      401,
      "La sesión usada para el cambio queda revocada",
    );
    assert.equal(
      (await pedir("/api/auth/yo", undefined, cookieA2)).status,
      401,
      "La segunda sesión de la misma cuenta queda revocada",
    );
    assert.equal(
      (await pedir("/api/auth/yo", undefined, cookieB)).status,
      200,
      "La sesión de otra cuenta permanece activa",
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM infra.sesion_http WHERE id_cuenta=$1",
          [idA],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM infra.sesion_http WHERE id_cuenta=$1",
          [idB],
        )
      ).rows[0].n,
      1,
    );

    assert.equal(
      (
        await pedir("/api/auth/login", {
          correo: correoA,
          password: claveA,
        })
      ).status,
      401,
      "La contraseña anterior deja de funcionar",
    );
    assert.equal(
      (
        await pedir("/api/auth/login", {
          correo: correoA,
          password: nuevaA,
        })
      ).status,
      200,
      "La contraseña nueva funciona tras el cambio",
    );
  },
);
