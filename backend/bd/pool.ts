import pg from "pg";
import "dotenv/config";
import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestHandler, Request } from "express";
import { destinoBaseDatos, esPoolerSupabase } from "./destino";
pg.types.setTypeParser(20, (valor: string) => valor);
// Una fecha académica no es un instante UTC: evitar cambios de día al serializar JSON.
pg.types.setTypeParser(1082, (valor: string) => valor);
const opciones = {
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
};
const real = new pg.Pool({
  ...opciones,
  ...(!esPoolerSupabase(process.env.DATABASE_URL)
    ? {
        options:
          "-c search_path=ticket_trade,pg_catalog -c timezone=America/Mexico_City -c client_encoding=UTF8",
      }
    : {}),
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {}),
});
const demo = process.env.DATABASE_URL_DEMO
  ? new pg.Pool({
      ...opciones,
      connectionString: process.env.DATABASE_URL_DEMO,
      ...(!esPoolerSupabase(process.env.DATABASE_URL_DEMO)
        ? {
            options:
              "-c search_path=ticket_trade,pg_catalog -c timezone=America/Mexico_City -c client_encoding=UTF8",
          }
        : {}),
    })
  : null;
const contexto = new AsyncLocalStorage<"real" | "demo">();
export const modoBaseDatos = () => contexto.getStore() || "real";
export const nombreCookieSesion = () =>
  modoBaseDatos() === "demo" ? "tt_sesion_demo" : "tt_sesion_id";
export const tokenPeticion = (req: Request) =>
  req.cookies?.[nombreCookieSesion()];
export const seleccionarBaseDatos: RequestHandler = (req, res, next) => {
  const demostracion =
    req.get("x-tickettrade-demo") === "1" ||
    (req.method === "GET" &&
      /^\/archivos\/[1-9]\d*$/.test(req.path) &&
      req.query.demo === "1");
  if (demostracion && (process.env.TT_DEMO !== "1" || !demo))
    return void res
      .status(503)
      .json({
        error: {
          codigo: "DEMO_NO_CONFIGURADA",
          mensaje: "La base independiente de demostración no está configurada.",
        },
      });
  if (
    demostracion &&
    process.env.DATABASE_URL &&
    destinoBaseDatos(process.env.DATABASE_URL) ===
      destinoBaseDatos(process.env.DATABASE_URL_DEMO!)
  )
    return void res
      .status(503)
      .json({
        error: {
          codigo: "BASES_NO_SEPARADAS",
          mensaje: "La demostración debe usar una base distinta de la normal.",
        },
      });
  contexto.run(demostracion ? "demo" : "real", next);
};
export const pool: pg.Pool = new Proxy(real, {
  get(_target, clave) {
    if (clave === "end")
      return async () => {
        await Promise.all([real.end(), demo?.end()]);
      };
    const elegido = modoBaseDatos() === "demo" ? demo! : real;
    const valor = Reflect.get(elegido, clave);
    return typeof valor === "function" ? valor.bind(elegido) : valor;
  },
});
export async function conTransaccion<T>(
  operacion: (cliente: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await cliente.query(
      "SET LOCAL TIME ZONE 'America/Mexico_City'; SET LOCAL search_path=ticket_trade,pg_catalog",
    );
    const resultado = await operacion(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }
}
