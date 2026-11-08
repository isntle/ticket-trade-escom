import pg from 'pg';
import dotenv from 'dotenv';

const { Pool, types } = pg;

// Asegurar que BIGINT (OID 20) siempre se devuelva como string para evitar pérdida de precisión en JS
types.setTypeParser(20, (val: string) => val);

dotenv.config();

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'tickettrade',
  user: process.env.PGUSER || 'tickettrade_app',
  password: process.env.PGPASSWORD || 'regina504+',
  // Forzar búsqueda directa en el esquema ticket_trade
  options: process.env.PGOPTIONS || '-c search_path=ticket_trade,public',
  max: 20,
  idleTimeoutMillis: 30000,
});

/**
 * Ejecutor seguro de transacciones atómicas (BEGIN / COMMIT / ROLLBACK)
 */
export async function conTransaccion<T>(
  operacion: (cliente: pg.PoolClient) => Promise<T>
): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await operacion(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
