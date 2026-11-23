import type { Usuario } from "../../../src/tipos/index.js";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { conTransaccion, modoBaseDatos, pool } from "../../bd/pool.js";
import { fallo } from "../../comun/http.js";

const instalaciones = new Map<string, Promise<void>>();

export function prepararRestricciones() {
  const modo = modoBaseDatos();
  const instalada = instalaciones.get(modo);
  if (instalada) return instalada;
  const preparar = conTransaccion(async c => {
    await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
    await c.query(`CREATE SCHEMA IF NOT EXISTS infra;
      CREATE TABLE IF NOT EXISTS infra.restriccion_solicitudes (
        cuenta bigint PRIMARY KEY REFERENCES ticket_trade."Cuenta"(id_cuenta),
        desde timestamptz NOT NULL, hasta timestamptz NOT NULL CHECK(hasta > desde),
        motivo text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS infra.peticion_restriccion (
        id uuid PRIMARY KEY, cuenta bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta),
        accion text NOT NULL CHECK(accion IN ('aplicar','levantar')),
        motivo text NOT NULL, solicitudes text NOT NULL, responsable text NOT NULL,
        fecha timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        estado text NOT NULL CHECK(estado IN ('pendiente','aceptada','rechazada')),
        resolucion text, resuelta_por bigint REFERENCES ticket_trade."Cuenta"(id_cuenta),
        resuelta_en timestamptz
      );
      CREATE INDEX IF NOT EXISTS peticion_restriccion_cuenta ON infra.peticion_restriccion(cuenta, fecha);
      CREATE UNIQUE INDEX IF NOT EXISTS peticion_restriccion_pendiente
        ON infra.peticion_restriccion(cuenta) WHERE estado='pendiente';`);
  }).catch(error => {
    instalaciones.delete(modo);
    throw error;
  });
  instalaciones.set(modo, preparar);
  return preparar;
}

export async function consultarRestriccion(id: string, incluirPeticiones: boolean) {
  await prepararRestricciones();
  const { rows: [fila] } = await pool.query<{
    restriccionSolicitudesDesde: Date | null;
    restriccionSolicitudesHasta: Date | null;
    motivoRestriccion: string | null;
    peticionesRestriccion: Usuario["peticionesRestriccion"] | null;
  }>(
    `SELECT r.desde "restriccionSolicitudesDesde", r.hasta "restriccionSolicitudesHasta",
       r.motivo "motivoRestriccion",
       CASE WHEN $2 THEN (SELECT coalesce(jsonb_agg(
         jsonb_build_object('id',p.id,'accion',p.accion,'motivo',p.motivo,'solicitudes',p.solicitudes,
           'responsable',p.responsable,'fecha',p.fecha,'estado',p.estado,'resolucion',p.resolucion)
         ORDER BY p.fecha,p.id), '[]'::jsonb) FROM infra.peticion_restriccion p WHERE p.cuenta=$1)
       END "peticionesRestriccion"
     FROM (SELECT $1::bigint cuenta) c LEFT JOIN infra.restriccion_solicitudes r USING(cuenta)`,
    [id, incluirPeticiones],
  );
  return {
    restriccionSolicitudesDesde: fila.restriccionSolicitudesDesde?.toISOString(),
    restriccionSolicitudesHasta: fila.restriccionSolicitudesHasta?.toISOString(),
    motivoRestriccion: fila.motivoRestriccion ?? undefined,
    peticionesRestriccion: fila.peticionesRestriccion ?? undefined,
  };
}

export async function comprobarEnvioSinRestriccion(c: PoolClient, id: string) {
  const activa = await c.query(
    "SELECT 1 FROM infra.restriccion_solicitudes WHERE cuenta=$1 AND desde<=clock_timestamp() AND hasta>clock_timestamp()",
    [id],
  );
  if (activa.rowCount) fallo("Tu cuenta tiene una restricción vigente para enviar nuevas solicitudes de evento.", 403);
}

type Actor = { id: string; nombre: string; roles: string[] };

export async function pedirRestriccion(actor: Actor, id: string, datos: { accion?: unknown; motivo?: unknown; solicitudes?: unknown }) {
  if (!actor.roles.includes("subdireccion")) fallo("Solo Subdirección puede registrar peticiones.", 403);
  const { accion, motivo, solicitudes } = datos;
  if ((accion !== "aplicar" && accion !== "levantar") || typeof motivo !== "string" ||
      typeof solicitudes !== "string" || !motivo.trim() || !solicitudes.trim() ||
      motivo.length > 4000 || solicitudes.length > 4000) fallo("Indica la acción, el motivo y las solicitudes relacionadas.", 422);
  await prepararRestricciones();
  await conTransaccion(async c => {
    await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
    await comprobarCuenta(c, id);
    const r = await c.query(
      `INSERT INTO infra.peticion_restriccion(id,cuenta,accion,motivo,solicitudes,responsable,estado)
       VALUES($1,$2,$3,$4,$5,$6,'pendiente') ON CONFLICT DO NOTHING`,
      [randomUUID(), id, accion, motivo.trim(), solicitudes.trim(), actor.nombre],
    );
    if (!r.rowCount) fallo("Ya existe una petición pendiente para esta cuenta.", 409);
  });
}

async function comprobarCuenta(c: PoolClient, id: string) {
  if (!(await c.query('SELECT 1 FROM ticket_trade."Cuenta" WHERE id_cuenta=$1', [id])).rowCount)
    fallo("Cuenta no encontrada.", 404);
}

function instante(valor: unknown) {
  if (typeof valor !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)?$/.test(valor)) return NaN;
  return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(valor) ? valor : valor + "-06:00");
}

export async function resolverRestriccion(actor: Actor, id: string, datos: {
  hasta?: unknown; desde?: unknown; motivo?: unknown; peticionId?: unknown; aceptar?: unknown;
}) {
  if (!actor.roles.includes("admin")) fallo("Solo Administración puede resolver restricciones.", 403);
  const { hasta, desde, motivo, peticionId, aceptar } = datos;
  if (typeof motivo !== "string" || !motivo.trim() || motivo.length > 4000 ||
      typeof hasta !== "string" || typeof aceptar !== "boolean" || (!aceptar && !peticionId) ||
      (peticionId !== undefined && (typeof peticionId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(peticionId))))
    fallo("Revisa la decisión y escribe un motivo.", 422);
  await prepararRestricciones();
  await conTransaccion(async c => {
    await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
    await comprobarCuenta(c, id);
    const accion = hasta ? "aplicar" : "levantar";
    if (peticionId) {
      const actual = await c.query("SELECT accion FROM infra.peticion_restriccion WHERE id=$1 AND cuenta=$2 AND estado='pendiente'", [peticionId, id]);
      if (!actual.rowCount) fallo("La petición ya fue resuelta o no corresponde a esta cuenta.", 409);
      if (aceptar && actual.rows[0].accion !== accion) fallo("La decisión debe corresponder a la acción solicitada.", 422);
    }
    if (aceptar && hasta) {
      const inicio = instante(desde), fin = instante(hasta);
      if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio || fin <= Date.now())
        fallo("El término debe ser futuro y posterior al inicio.", 422);
      await c.query(
        `INSERT INTO infra.restriccion_solicitudes(cuenta,desde,hasta,motivo) VALUES($1,$2,$3,$4)
         ON CONFLICT(cuenta) DO UPDATE SET desde=excluded.desde,hasta=excluded.hasta,motivo=excluded.motivo`,
        [id, new Date(inicio), new Date(fin), motivo.trim()],
      );
    } else if (aceptar) {
      await c.query("DELETE FROM infra.restriccion_solicitudes WHERE cuenta=$1", [id]);
    }
    if (peticionId) {
      await c.query(
        `UPDATE infra.peticion_restriccion SET estado=$2,resolucion=$3,resuelta_por=$4,resuelta_en=clock_timestamp() WHERE id=$1`,
        [peticionId, aceptar ? "aceptada" : "rechazada", motivo.trim(), actor.id],
      );
    } else {
      await c.query(
        `INSERT INTO infra.peticion_restriccion(id,cuenta,accion,motivo,solicitudes,responsable,estado,resolucion,resuelta_por,resuelta_en)
         VALUES($1,$2,$3,$4,'', $5,'aceptada',$4,$6,clock_timestamp())`,
        [randomUUID(), id, accion, motivo.trim(), actor.nombre, actor.id],
      );
    }
  });
}
