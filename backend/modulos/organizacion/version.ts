import type { PoolClient, Pool } from "pg";
// La misma expresión se evalúa en la consulta que lee el evento: evita mezclar
// datos anteriores con una huella posterior si otra sesión escribe entre lecturas.
export const SQL_VERSION_EVENTO = `md5(jsonb_build_object('evento',to_jsonb(e),'actividades',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id_actividad) FROM ticket_trade."Actividad" a WHERE a.id_evento=e.id_evento),'itinerarios',(SELECT jsonb_agg(to_jsonb(i) ORDER BY fecha) FROM ticket_trade."ItinerarioDia" i WHERE i.id_evento=e.id_evento),'lugares',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id_lugar_actividad) FROM ticket_trade."LugarActividad" l JOIN ticket_trade."Actividad" a USING(id_actividad) WHERE a.id_evento=e.id_evento),'asignaciones',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id_compromiso_cupo) FROM ticket_trade."AsignacionAsiento" s JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."Actividad" a USING(id_actividad) WHERE a.id_evento=e.id_evento),'cupos',(SELECT jsonb_agg(to_jsonb(cp) ORDER BY id_compromiso_cupo) FROM ticket_trade."CompromisoCupo" cp JOIN ticket_trade."Actividad" a USING(id_actividad) WHERE a.id_evento=e.id_evento))::text)`;
export async function versionEvento(c: PoolClient | Pool, id: string) {
  const r = await c.query(
    `SELECT ${SQL_VERSION_EVENTO} version FROM ticket_trade."Evento" e WHERE id_evento=$1`,
    [id],
  );
  return r.rows[0]?.version;
}
