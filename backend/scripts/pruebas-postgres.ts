import "dotenv/config";
import pg from "pg";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { opciones, instalar, sembrar, ejecutarSql } from "./bd";

// Crea una base EXCLUSIVA para esta ejecución; nunca modifica los hashes ni registros de desarrollo.
const nombre = "tt_pruebas_" + crypto.randomBytes(8).toString("hex");
const admin = new pg.Client(opciones());
let creada = false;
try {
  await admin.connect();
  await admin.query(
    `CREATE DATABASE "${nombre}" ENCODING 'UTF8' TEMPLATE template0`,
  );
  creada = true;
  const conexion = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL)
    : null;
  if (conexion) conexion.pathname = "/" + nombre;
  const config = conexion
    ? { connectionString: conexion.toString() }
    : { database: nombre };
  const c = new pg.Client({
    ...config,
    options: "-c timezone=America/Mexico_City -c client_encoding=UTF8",
  });
  await c.connect();
  try {
    await instalar(c);
    await ejecutarSql(c, "04_pruebas_integridad.sql");
    await sembrar(c);
  } finally {
    await c.end();
  }
  const env = {
    ...process.env,
    TT_API_PRUEBAS: "1",
    TT_BD_DESECHABLE: nombre,
    TT_DEMO: "1",
    TT_MOSTRAR_CODIGOS: "1",
    DATABASE_URL_DEMO: "",
    PGDATABASE: nombre,
    ...(conexion ? { DATABASE_URL: conexion.toString() } : {}),
  };
  const codigo = await new Promise<number>((resolve) => {
    const hijo = spawn(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "--test",
        "--test-concurrency=1",
        "tests/api-auth.test.ts",
        "tests/api-flujos-postgres.test.ts",
        "tests/api-demo-aislamiento.test.ts",
      ],
      { env, stdio: "inherit", windowsHide: true },
    );
    hijo.on("error", (e) => {
      console.error(e.message);
      resolve(1);
    });
    hijo.on("exit", (c) => resolve(c || 0));
  });
  if (codigo) process.exitCode = codigo;
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  if (creada) {
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()",
      [nombre],
    );
    await admin.query(`DROP DATABASE "${nombre}"`);
    console.log(
      "Base desechable eliminada; la base de desarrollo se conserva.",
    );
  }
  await admin.end();
}
