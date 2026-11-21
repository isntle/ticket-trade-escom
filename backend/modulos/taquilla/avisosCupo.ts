import { Router } from "express";
import type { PoolClient } from "pg";
import { conTransaccion, pool } from "../../bd/pool.js";
import { liberarApartadosVencidos } from "../../bd/apartados.js";
import { fallo, idEntero, ruta } from "../../comun/http.js";
import { exigirSesion } from "../identidad/auth.js";
import { encolarAviso } from "../correos/avisos.js";

export const routerAvisosCupo = Router();

const actividadesElegibles = `
  SELECT a.id_actividad, a.id_evento, a.nombre, a.aforo_solicitado, t.nombre acceso
  FROM ticket_trade."Actividad" a
  JOIN ticket_trade."Evento" e USING(id_evento)
  JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento)
  JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad)
  JOIN ticket_trade."VisibilidadEvento" v USING(id_visibilidad_evento)
  JOIN ticket_trade."TipoAcceso" t USING(id_tipo_acceso)
  WHERE ee.nombre='Publicado' AND ea.nombre='Programada' AND v.nombre='Público'
    AND t.nombre<>'Entrada libre'
    AND (a.fecha+a.hora_inicio) AT TIME ZONE 'America/Mexico_City' > statement_timestamp()
    AND NOT EXISTS (SELECT 1 FROM ticket_trade."AfectacionActividad" af
      WHERE af.id_actividad=a.id_actividad AND af.resuelta_en IS NULL)`;

const hayCupo = `a.aforo_solicitado > (
          SELECT count(*) FROM ticket_trade."CompromisoCupo" cp
          JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo)
          WHERE cp.id_actividad=a.id_actividad AND ec.nombre='Activo'
        )
        AND (a.acceso<>'Reservación con lugar asignado' OR EXISTS (
          SELECT 1 FROM ticket_trade."LugarActividad" la
          JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
          LEFT JOIN ticket_trade."EstacionComputo" pc USING(id_lugar_recinto)
          LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING(id_estado_funcionamiento)
          WHERE la.id_actividad=a.id_actividad AND cl.nombre='Asistente'
            AND ef.nombre IS DISTINCT FROM 'Fuera de servicio'
            AND NOT EXISTS (
              SELECT 1 FROM ticket_trade."AsignacionAsiento" aa
              JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
              JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo)
              WHERE aa.id_lugar_actividad=la.id_lugar_actividad AND ec.nombre='Activo'
            )
        ))`;

export async function despacharAvisosCupo(c: PoolClient) {
  const { rows } = await c.query(`
    WITH elegibles AS (${actividadesElegibles}), disponibles AS (
      SELECT a.* FROM elegibles a
      WHERE EXISTS (SELECT 1 FROM ticket_trade."AvisoDisponibilidad" w WHERE w.id_actividad=a.id_actividad)
        AND ${hayCupo}
    )
    DELETE FROM ticket_trade."AvisoDisponibilidad" w USING disponibles a
    WHERE w.id_actividad=a.id_actividad
    RETURNING w.id_cuenta::text cuenta, a.id_evento::text evento, a.nombre,
      w.id_actividad::text actividad, w.solicitado_en::text solicitado`);
  for (const aviso of rows) {
    const titulo = "Hay cupo disponible";
    const mensaje = `Se liberó cupo para ${aviso.nombre}. Consulta la disponibilidad. El aviso no aparta un lugar.`;
    await c.query(`INSERT INTO ticket_trade."Notificacion"
      (id_cuenta_destinataria,tipo,titulo,mensaje,creada_en,referencia_destino)
      VALUES($1,'disponibilidad',$2,$3,now(),$4)`, [aviso.cuenta,titulo,mensaje,aviso.evento]);
    await encolarAviso(c,aviso.cuenta,`cupo:${aviso.actividad}:${aviso.cuenta}:${aviso.solicitado}`,
      titulo,mensaje,`/eventos/${aviso.evento}`);
  }
}

export async function procesarAvisosCupo(actividad?: string) {
  if (!(await pool.query(`SELECT 1 FROM ticket_trade."AvisoDisponibilidad"
    WHERE ($1::bigint IS NULL OR id_actividad=$1) LIMIT 1`, [actividad ?? null])).rowCount) return;
  await conTransaccion(async c => {
    await liberarApartadosVencidos(c);
    await despacharAvisosCupo(c);
  });
}

const camino = "/actividades/:id/aviso-cupo";
routerAvisosCupo.get(camino, exigirSesion, ruta(async (req, res) => {
  const r = await pool.query('SELECT 1 FROM ticket_trade."AvisoDisponibilidad" WHERE id_actividad=$1 AND id_cuenta=$2',
    [idEntero(req.params.id), res.locals.usuario.id]);
  res.set("Cache-Control","private, no-store").json({ datos: { activo: Boolean(r.rowCount) } });
}));
routerAvisosCupo.post(camino, exigirSesion, ruta(async (req, res) => {
  const id = idEntero(req.params.id);
  const cuenta = res.locals.usuario;
  if (!cuenta.correoConfirmado) fallo("Confirma tu correo para recibir el aviso.",403);
  await conTransaccion(async c => {
    await liberarApartadosVencidos(c);
    const elegible = await c.query(`SELECT 1 FROM (${actividadesElegibles}) a
      JOIN ticket_trade."PerfilUsuario" p ON p.id_cuenta=$2 WHERE a.id_actividad=$1`, [id,cuenta.id]);
    if (!elegible.rowCount) fallo("El aviso no está disponible para esta actividad.",404);
    await c.query(`WITH elegibles AS (${actividadesElegibles})
      INSERT INTO ticket_trade."AvisoDisponibilidad"(id_cuenta,id_actividad,solicitado_en)
      SELECT p.id_cuenta,a.id_actividad,clock_timestamp() FROM elegibles a
      JOIN ticket_trade."PerfilUsuario" p ON p.id_cuenta=$2 WHERE a.id_actividad=$1
      AND NOT (${hayCupo})
      ON CONFLICT (id_cuenta,id_actividad) DO NOTHING`, [id,cuenta.id]);
    await despacharAvisosCupo(c);
  });
  const r = await pool.query('SELECT 1 FROM ticket_trade."AvisoDisponibilidad" WHERE id_actividad=$1 AND id_cuenta=$2', [id,cuenta.id]);
  res.json({ datos: { activo: Boolean(r.rowCount) } });
}));
routerAvisosCupo.delete(camino, exigirSesion, ruta(async (req, res) => {
  await pool.query('DELETE FROM ticket_trade."AvisoDisponibilidad" WHERE id_actividad=$1 AND id_cuenta=$2',
    [idEntero(req.params.id),res.locals.usuario.id]);
  res.json({ datos: { activo: false } });
}));
