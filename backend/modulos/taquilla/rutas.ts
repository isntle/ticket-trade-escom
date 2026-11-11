import { Router } from "express";
import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { conTransaccion, pool } from "../../bd/pool";
import { exigirSesion } from "../identidad/auth";
import { origenSeguro } from "../../comun/seguridad";
import { fallo, ruta, idEntero, texto } from "../../comun/http";

export const routerTaquilla = Router();
routerTaquilla.use((req, res, next) =>
  req.method === "GET" ? next() : origenSeguro(req, res, next),
);
async function bloquear(c: PoolClient) {
  await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
  const vencidos =
    await c.query(`UPDATE ticket_trade."Apartado" SET id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vencido')
    WHERE id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vigente') AND creado_en+interval '2 minutes'<=clock_timestamp() RETURNING id_compromiso_cupo`);
  if (vencidos.rowCount)
    await c.query(
      `UPDATE ticket_trade."CompromisoCupo" SET id_estado_compromiso_cupo=(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Liberado') WHERE id_compromiso_cupo=ANY($1::bigint[])`,
      [vencidos.rows.map((r) => r.id_compromiso_cupo)],
    );
}
async function actividad(c: PoolClient, id: string) {
  const r = await c.query(
    `SELECT a.*,a.id_evento::text evento,ta.nombre acceso,ea.nombre estado,ee.nombre estado_evento,v.nombre visibilidad,e.token_enlace_privado,
    (a.fecha+a.hora_inicio) AT TIME ZONE 'America/Mexico_City' inicio,(a.fecha+a.hora_fin) AT TIME ZONE 'America/Mexico_City' fin
    FROM ticket_trade."Actividad" a JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."TipoAcceso" ta USING(id_tipo_acceso)
    JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) JOIN ticket_trade."EstadoEvento" ee ON ee.id_estado_evento=e.id_estado_evento
    JOIN ticket_trade."VisibilidadEvento" v USING(id_visibilidad_evento) WHERE id_actividad=$1`,
    [id],
  );
  if (!r.rowCount) fallo("Actividad no disponible.", 404);
  return r.rows[0];
}
function reservable(a: any, token?: unknown) {
  if (a.estado !== "Programada" || a.estado_evento !== "Publicado")
    fallo("La actividad no está disponible.", 409);
  if (a.visibilidad === "Privado" && token !== a.token_enlace_privado)
    fallo("Se requiere el enlace privado.", 403);
  if (new Date(a.inicio).getTime() <= Date.now())
    fallo("La actividad ya comenzó.", 409);
  if (a.acceso === "Entrada libre")
    fallo("Esta actividad es de entrada libre y no necesita reservación.");
}
routerTaquilla.get(
  "/actividades/:id/lugares",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id);
    const resultado = await conTransaccion(async (c) => {
      await bloquear(c);
      const a = await actividad(c, id);
      if (a.estado_evento !== "Publicado" || a.visibilidad !== "Público")
        fallo("Actividad no disponible.", 404);
      const r = await c.query(
        `SELECT la.id_lugar_actividad::text id,lr.codigo,lr.fila,lr.posicion_x x,lr.posicion_y y,cl.nombre categoria,
      EXISTS(SELECT 1 FROM ticket_trade."AsignacionAsiento" s JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
      JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE s.id_lugar_actividad=la.id_lugar_actividad AND ec.nombre='Activo') ocupado,
      COALESCE(ef.nombre='Fuera de servicio',false) averiado
      FROM ticket_trade."LugarActividad" la JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
      JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
      LEFT JOIN ticket_trade."EstacionComputo" pc USING(id_lugar_recinto) LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING(id_estado_funcionamiento)
      WHERE la.id_actividad=$1 ORDER BY lr.fila,lr.posicion_x,lr.codigo`,
        [id],
      );
      const cupos = await c.query(
        `SELECT count(*)::int n FROM ticket_trade."CompromisoCupo" cp JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE cp.id_actividad=$1 AND ec.nombre='Activo'`,
        [id],
      );
      return {
        lugares: r.rows,
        disponibles: Math.max(0, a.aforo_solicitado - cupos.rows[0].n),
      };
    });
    res.json({ datos: resultado });
  }),
);
routerTaquilla.post(
  "/apartados",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario,
      b = req.body || {};
    if (!u.correoConfirmado)
      fallo("Confirma tu correo antes de reservar.", 403);
    const id = idEntero(b.idActividad);
    const resultado = await conTransaccion(async (c) => {
      await bloquear(c);
      const a = await actividad(c, id);
      reservable(a, b.token);
      const existente = await c.query(
        `SELECT 1 FROM ticket_trade."Reservacion" r JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento)
      JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion)
      WHERE b.id_cuenta=$1 AND cp.id_actividad=$2 AND er.nombre='Confirmada'`,
        [u.id, id],
      );
      if (existente.rowCount)
        fallo("Ya tienes una reservación para esta actividad.", 409);
      const pendiente = await c.query(
        `SELECT 1 FROM ticket_trade."Apartado" a JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
      JOIN ticket_trade."EstadoApartado" ea USING(id_estado_apartado) WHERE a.id_cuenta=$1 AND cp.id_actividad=$2 AND ea.nombre='Vigente'`,
        [u.id, id],
      );
      if (pendiente.rowCount)
        fallo(
          "Ya tienes un apartado vigente para esta actividad. Confírmalo o espera a que venza.",
          409,
        );
      if (a.acceso === "Reservación con lugar asignado") {
        const lugar = await c.query(
          `SELECT 1 FROM ticket_trade."LugarActividad" la JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
        WHERE la.id_lugar_actividad=$1 AND la.id_actividad=$2 AND cl.nombre='Asistente'`,
          [idEntero(b.idLugar), id],
        );
        if (!lugar.rowCount) fallo("Selecciona un asiento para asistentes.");
      } else if (b.idLugar)
        fallo("El registro sin asiento no admite selección de lugar.");
      const cp = await c.query(
        `INSERT INTO ticket_trade."CompromisoCupo"(id_actividad,id_estado_compromiso_cupo)
      VALUES($1,(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Activo')) RETURNING id_compromiso_cupo::text id`,
        [id],
      );
      const idCupo = cp.rows[0].id;
      const ap = await c.query(
        `INSERT INTO ticket_trade."Apartado"(id_compromiso_cupo,id_cuenta,creado_en,id_estado_apartado)
      VALUES($1,$2,clock_timestamp(),(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vigente')) RETURNING creado_en+interval '2 minutes' vence`,
        [idCupo, u.id],
      );
      if (b.idLugar)
        await c.query(
          'INSERT INTO ticket_trade."AsignacionAsiento" VALUES($1,$2)',
          [idCupo, b.idLugar],
        );
      return { id: idCupo, vence: ap.rows[0].vence };
    });
    res.status(201).json({ datos: resultado });
  }),
);
routerTaquilla.post(
  "/apartados/:id/liberacion",
  exigirSesion,
  ruta(async (req, res) => {
    await conTransaccion(async (c) => {
      await bloquear(c);
      const r = await c.query(
        `UPDATE ticket_trade."Apartado" SET id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Liberado')
        WHERE id_compromiso_cupo=$1 AND id_cuenta=$2 AND id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vigente') RETURNING id_compromiso_cupo`,
        [idEntero(req.params.id), res.locals.usuario.id],
      );
      if (r.rowCount)
        await c.query(
          `UPDATE ticket_trade."CompromisoCupo" SET id_estado_compromiso_cupo=(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Liberado') WHERE id_compromiso_cupo=$1`,
          [req.params.id],
        );
    });
    res.json({ datos: { exito: true } });
  }),
);
routerTaquilla.post(
  "/apartados/:id/confirmacion",
  exigirSesion,
  ruta(async (req, res) => {
    const id = idEntero(req.params.id),
      u = res.locals.usuario;
    const resultado = await conTransaccion(async (c) => {
      await bloquear(c);
      const ap = await c.query(
        `SELECT cp.id_actividad::text actividad FROM ticket_trade."Apartado" ap JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
      JOIN ticket_trade."EstadoApartado" ea USING(id_estado_apartado) WHERE ap.id_compromiso_cupo=$1 AND ap.id_cuenta=$2
      AND ea.nombre='Vigente' AND ap.creado_en+interval '2 minutes'>clock_timestamp() FOR UPDATE OF ap`,
        [id, u.id],
      );
      if (!ap.rowCount)
        fallo("El apartado venció, ya se confirmó o no te pertenece.", 409);
      const a = await actividad(c, ap.rows[0].actividad);
      reservable(a, req.body?.token);
      let pase = (
        await c.query(
          'SELECT id_boleto_evento::text id FROM ticket_trade."BoletoEvento" WHERE id_cuenta=$1 AND id_evento=$2',
          [u.id, a.evento],
        )
      ).rows[0];
      if (!pase)
        pase = (
          await c.query(
            `INSERT INTO ticket_trade."BoletoEvento"(id_cuenta,id_evento,codigo_qr,codigo_manual)
      VALUES($1,$2,$3,$4) RETURNING id_boleto_evento::text id`,
            [
              u.id,
              a.evento,
              crypto.randomBytes(32).toString("hex"),
              crypto.randomBytes(8).toString("hex").toUpperCase(),
            ],
          )
        ).rows[0];
      await c.query(
        `UPDATE ticket_trade."Apartado" SET id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Convertido en reservación') WHERE id_compromiso_cupo=$1`,
        [id],
      );
      const r = await c.query(
        `INSERT INTO ticket_trade."Reservacion"(id_boleto_evento,id_compromiso_cupo,confirmada_en,id_estado_reservacion)
      VALUES($1,$2,clock_timestamp(),(SELECT id_estado_reservacion FROM ticket_trade."EstadoReservacion" WHERE nombre='Confirmada')) RETURNING id_reservacion::text id`,
        [pase.id, id],
      );
      return { id: r.rows[0].id, idPase: pase.id };
    });
    res.status(201).json({ datos: resultado });
  }),
);
routerTaquilla.get(
  "/mis-boletos",
  exigirSesion,
  ruta(async (_req, res) => {
    const r = await pool.query(
      `SELECT v.*,e.titulo FROM ticket_trade.v_pase_actividades v JOIN ticket_trade."Evento" e USING(id_evento) WHERE v.id_cuenta=$1 ORDER BY v.fecha,v.hora_inicio`,
      [res.locals.usuario.id],
    );
    res.json({ datos: r.rows });
  }),
);
routerTaquilla.post(
  "/reservaciones/:id/cancelacion",
  exigirSesion,
  ruta(async (req, res) => {
    await conTransaccion(async (c) => {
      await bloquear(c);
      const r = await c.query(
        `SELECT r.id_compromiso_cupo::text cupo,cp.id_actividad::text actividad FROM ticket_trade."Reservacion" r
      JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento) JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
      JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion) WHERE r.id_reservacion=$1 AND b.id_cuenta=$2 AND er.nombre='Confirmada'
      AND NOT EXISTS(SELECT 1 FROM ticket_trade."EntradaOrdinaria" en WHERE en.id_reservacion=r.id_reservacion)`,
        [idEntero(req.params.id), res.locals.usuario.id],
      );
      if (!r.rowCount) fallo("La reservación no puede cancelarse.", 409);
      const a = await actividad(c, r.rows[0].actividad);
      if (new Date(a.inicio).getTime() <= Date.now())
        fallo("La actividad ya comenzó.", 409);
      await c.query(
        `UPDATE ticket_trade."Reservacion" SET id_estado_reservacion=(SELECT id_estado_reservacion FROM ticket_trade."EstadoReservacion" WHERE nombre='Cancelada'),
      cancelada_en=clock_timestamp(),id_causa_cancelacion_reservacion=(SELECT id_causa_cancelacion_reservacion FROM ticket_trade."CausaCancelacionReservacion" WHERE nombre='Cancelación voluntaria') WHERE id_reservacion=$1`,
        [req.params.id],
      );
      await c.query(
        `UPDATE ticket_trade."CompromisoCupo" SET id_estado_compromiso_cupo=(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Liberado') WHERE id_compromiso_cupo=$1`,
        [r.rows[0].cupo],
      );
    });
    res.json({ datos: { exito: true } });
  }),
);
routerTaquilla.get(
  "/operacion",
  exigirSesion,
  ruta(async (_req, res) => {
    const u = res.locals.usuario;
    const filas = await conTransaccion(async (c) => {
      await bloquear(c);
      const r = await c.query(
        `SELECT v.*,v.id_actividad::text id FROM ticket_trade.v_actividades v WHERE $1::boolean OR v.id_cuenta_organizadora=$2
    OR EXISTS(SELECT 1 FROM ticket_trade."StaffEvento" s WHERE s.id_evento=v.id_evento AND s.id_cuenta=$2) ORDER BY fecha,hora_inicio`,
        [u.roles.includes("admin") || u.roles.includes("subdireccion"), u.id],
      );
      return r.rows;
    });
    res.json({ datos: filas });
  }),
);
routerTaquilla.post(
  "/checkin",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario,
      id = idEntero(req.body?.idActividad),
      codigo = texto(req.body?.codigo, "el código", 200);
    const resultado = await conTransaccion(async (c) => {
      await bloquear(c);
      const a = await actividad(c, id);
      const staff = await c.query(
        'SELECT 1 FROM ticket_trade."StaffEvento" WHERE id_evento=$1 AND id_cuenta=$2',
        [a.evento, u.id],
      );
      if (!staff.rowCount && !u.roles.includes("admin"))
        fallo("Solo el personal asignado puede registrar el acceso.", 403);
      if (a.estado !== "Programada" || a.estado_evento !== "Publicado")
        fallo("La actividad no está habilitada.", 409);
      if (
        Date.now() < new Date(a.inicio).getTime() - 30 * 60000 ||
        Date.now() > new Date(a.fin).getTime()
      )
        fallo(
          "El ingreso abre 30 minutos antes y cierra al terminar la actividad.",
          409,
        );
      const r = await c.query(
        `SELECT r.id_reservacion::text id FROM ticket_trade."Reservacion" r JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento)
      JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion)
      WHERE cp.id_actividad=$1 AND (b.codigo_qr=$2 OR upper(b.codigo_manual)=upper($2)) AND er.nombre='Confirmada'`,
        [id, codigo],
      );
      if (!r.rowCount)
        fallo("Boleto inválido o cancelado para esta actividad.", 409);
      if (
        (
          await c.query(
            'SELECT 1 FROM ticket_trade."EntradaOrdinaria" WHERE id_reservacion=$1',
            [r.rows[0].id],
          )
        ).rowCount
      )
        fallo("Este boleto ya fue utilizado para esta actividad.", 409);
      await c.query(
        'INSERT INTO ticket_trade."EntradaOrdinaria"(id_reservacion,id_cuenta_operadora,registrada_en) VALUES($1,$2,clock_timestamp())',
        [r.rows[0].id, u.id],
      );
      return {
        exito: true,
        mensaje: "Acceso registrado correctamente.",
        idReservacion: r.rows[0].id,
      };
    });
    res.json({ datos: resultado });
  }),
);
