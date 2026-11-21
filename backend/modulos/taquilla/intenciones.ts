import type { PoolClient } from "pg";
import { Router } from "express";
import { conTransaccion, pool } from "../../bd/pool.js";
import { fallo, idEntero, ruta } from "../../comun/http.js";
import { tokenPrivadoValido } from "../../comun/enlacePrivado.js";
import { exigirSesion } from "../identidad/auth.js";

export const routerIntenciones = Router();

async function preparar(c: PoolClient) {
  await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
  await c.query(`CREATE TABLE IF NOT EXISTS infra.intencion_asistencia (
    id_cuenta bigint NOT NULL REFERENCES ticket_trade."PerfilUsuario"(id_cuenta) ON DELETE CASCADE,
    id_actividad bigint NOT NULL REFERENCES ticket_trade."Actividad"(id_actividad) ON DELETE CASCADE,
    creada_en timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id_cuenta, id_actividad)
  )`);
}

export async function leerIntenciones(cuenta: string | undefined) {
  if (!cuenta) return [];
  const { rows: [estado] } = await pool.query(
    "SELECT to_regclass('infra.intencion_asistencia') IS NOT NULL lista",
  );
  if (!estado.lista) return [];
  const { rows } = await pool.query(`SELECT i.id_actividad::text id, a.id_evento::text "idEvento",
    i.id_actividad::text "idFechaEvento", i.id_cuenta::text "idUsuario",
    '' "nombreUsuario", '' "correoUsuario", i.creada_en "fechaRegistro"
    FROM infra.intencion_asistencia i JOIN ticket_trade."Actividad" a USING (id_actividad)
    WHERE i.id_cuenta=$1`, [cuenta]);
  return rows;
}

routerIntenciones.post("/actividades/:id/intencion", exigirSesion, ruta(async (req, res) => {
  const id = idEntero(req.params.id);
  const cuenta = res.locals.usuario;
  if (!cuenta.correoConfirmado) fallo("Confirma tu correo para registrar tu intención.", 403);
  await conTransaccion(async c => {
    await preparar(c);
    const { rows: [actividad] } = await c.query(`
      SELECT v.nombre visibilidad, e.token_enlace_privado token
      FROM ticket_trade."Actividad" a JOIN ticket_trade."Evento" e USING (id_evento)
      JOIN ticket_trade."VisibilidadEvento" v USING (id_visibilidad_evento)
      JOIN ticket_trade."EstadoEvento" ee USING (id_estado_evento)
      JOIN ticket_trade."EstadoActividad" ea USING (id_estado_actividad)
      JOIN ticket_trade."TipoAcceso" t USING (id_tipo_acceso)
      WHERE a.id_actividad=$1 AND ee.nombre='Publicado' AND ea.nombre='Programada'
        AND t.nombre='Entrada libre'
        AND (a.fecha+a.hora_fin) AT TIME ZONE 'America/Mexico_City' > clock_timestamp()
        AND NOT EXISTS (SELECT 1 FROM ticket_trade."AfectacionActividad" af
          WHERE af.id_actividad=a.id_actividad AND af.resuelta_en IS NULL)`, [id]);
    if (!actividad || (actividad.visibilidad !== "Público" &&
        !tokenPrivadoValido(req.get("X-TicketTrade-Enlace"), actividad.token)))
      fallo("No puedes registrar intención para esta actividad.", 404);
    const registro = await c.query(`INSERT INTO infra.intencion_asistencia(id_cuenta,id_actividad)
      SELECT id_cuenta,$2 FROM ticket_trade."PerfilUsuario" WHERE id_cuenta=$1
      ON CONFLICT (id_cuenta,id_actividad) DO UPDATE SET creada_en=intencion_asistencia.creada_en
      RETURNING id_actividad`, [cuenta.id, id]);
    if (!registro.rowCount) fallo("La cuenta no tiene un perfil participante.", 403);
  });
  res.json({ datos: { exito: true } });
}));

routerIntenciones.delete("/actividades/:id/intencion", exigirSesion, ruta(async (req, res) => {
  const id = idEntero(req.params.id);
  await conTransaccion(async c => {
    await preparar(c);
    await c.query("DELETE FROM infra.intencion_asistencia WHERE id_cuenta=$1 AND id_actividad=$2",
      [res.locals.usuario.id, id]);
  });
  res.json({ datos: { exito: true } });
}));
