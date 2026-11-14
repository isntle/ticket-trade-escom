import type { PoolClient } from "pg";
/** Limpiar todos los vencidos conjuntamente para mantener la integridad diferida. */
export async function liberarApartadosVencidos(c: PoolClient) {
  await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
  const r = await c.query(
    `UPDATE ticket_trade."Apartado" SET id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vencido') WHERE id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vigente') AND creado_en+interval '2 minutes'<=clock_timestamp() RETURNING id_compromiso_cupo`,
  );
  if (r.rowCount)
    await c.query(
      `UPDATE ticket_trade."CompromisoCupo" SET id_estado_compromiso_cupo=(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Liberado') WHERE id_compromiso_cupo=ANY($1::bigint[])`,
      [r.rows.map((x) => x.id_compromiso_cupo)],
    );
}
