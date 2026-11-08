import pg from "pg";
import "dotenv/config";
pg.types.setTypeParser(20, (valor: string) => valor);
export const pool = new pg.Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {}),
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  options:
    "-c search_path=ticket_trade,pg_catalog -c timezone=America/Mexico_City",
});
export async function conTransaccion<T>(
  operacion: (cliente: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN ISOLATION LEVEL READ COMMITTED");
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
