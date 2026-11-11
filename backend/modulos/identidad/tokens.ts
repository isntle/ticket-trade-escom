import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { huella } from "../../comun/seguridad";
import { mostrarCodigos, fallo } from "../../comun/http";

export async function crearToken(
  c: PoolClient,
  id: string,
  correo: string,
  proposito: string,
) {
  const token = crypto.randomBytes(32).toString("hex");
  await c.query(
    `UPDATE ticket_trade."TokenCuenta" SET utilizado_en=CURRENT_TIMESTAMP
    WHERE id_cuenta=$1 AND id_proposito_token_cuenta=(SELECT id_proposito_token_cuenta FROM ticket_trade."PropositoTokenCuenta" WHERE nombre=$2) AND utilizado_en IS NULL AND vence_en>CURRENT_TIMESTAMP`,
    [id, proposito],
  );
  await c.query(
    `INSERT INTO ticket_trade."TokenCuenta"(id_cuenta,id_proposito_token_cuenta,token_hash,correo_destino,vence_en)
    VALUES($1,(SELECT id_proposito_token_cuenta FROM ticket_trade."PropositoTokenCuenta" WHERE nombre=$2),$3,$4,
    CURRENT_TIMESTAMP+CASE WHEN $2='Recuperación de contraseña' THEN interval '30 minutes' ELSE interval '24 hours' END)`,
    [id, proposito, huella(token), correo],
  );
  return mostrarCodigos() ? token : undefined;
}
export async function consumirToken(
  c: PoolClient,
  token: unknown,
  proposito: string,
) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    fallo("Código inválido, vencido o utilizado.");
  const r = await c.query(
    `UPDATE ticket_trade."TokenCuenta" SET utilizado_en=CURRENT_TIMESTAMP
    WHERE token_hash=$1 AND utilizado_en IS NULL AND vence_en>CURRENT_TIMESTAMP
    AND id_proposito_token_cuenta=(SELECT id_proposito_token_cuenta FROM ticket_trade."PropositoTokenCuenta" WHERE nombre=$2)
    RETURNING id_cuenta::text id,correo_destino correo`,
    [huella(token), proposito],
  );
  if (!r.rowCount) fallo("Código inválido, vencido o utilizado.");
  return r.rows[0] as { id: string; correo: string };
}
