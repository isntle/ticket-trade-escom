import {liberarApartadosVencidos} from "../../bd/apartados.js";
import { encolarAviso } from "../correos/avisos.js";
import { Router } from "express";
import crypto from "node:crypto";
import { encolarCorreo, correoHabilitado } from "../correos/servicio.js";
import { generarPdfBoleto, leerBoleto } from "../correos/boleto.js";
import type { PoolClient } from "pg";
import { conTransaccion, pool } from "../../bd/pool.js";
import { exigirSesion } from "../identidad/auth.js";
import { origenSeguro } from "../../comun/seguridad.js";
import { fallo, ruta, idEntero, texto } from "../../comun/http.js";
import {obtenerMensajeErrorCruce} from "../../../src/dominio/crucesReservas.js";
import { routerEspeciales } from "./especiales.js";
import { tokenPrivadoValido } from '../../comun/enlacePrivado.js';

export const routerTaquilla = Router();
routerTaquilla.use((req, res, next) =>
  req.method === "GET" ? next() : origenSeguro(req, res, next),
);
routerTaquilla.use(routerEspeciales);
const bloquear=liberarApartadosVencidos;
async function actividad(c: PoolClient, id: string) {
  const r = await c.query(
    `SELECT a.*,a.id_evento::text evento,ta.nombre acceso,ea.nombre estado,ee.nombre estado_evento,v.nombre visibilidad,e.token_enlace_privado,
    EXISTS(SELECT 1 FROM ticket_trade."AfectacionActividad" af WHERE af.id_actividad=a.id_actividad AND af.resuelta_en IS NULL) afectada,
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
  if (a.estado !== "Programada" || a.estado_evento !== "Publicado" || a.afectada)
    fallo("La actividad no está disponible.", 409);
  if (a.visibilidad === "Privado" && !tokenPrivadoValido(token, a.token_enlace_privado))
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
      if (a.estado_evento !== "Publicado" || a.estado !== "Programada" || a.afectada || (a.visibilidad === "Privado" && !tokenPrivadoValido(req.get('X-TicketTrade-Enlace'), a.token_enlace_privado)))
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
    res.set('Cache-Control', 'no-store').json({ datos: resultado });
  }),
);
// Lectura breve para el mapa: no toma el bloqueo de escritura ni modifica apartados.
routerTaquilla.get(
  "/actividades/:id/disponibilidad",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id);
    const token = req.get("X-TicketTrade-Enlace");
    const resultado = await pool.query(
      `WITH visible AS (
        SELECT a.id_actividad, a.aforo_solicitado
        FROM ticket_trade."Actividad" a
        JOIN ticket_trade."Evento" e USING (id_evento)
        JOIN ticket_trade."EstadoEvento" ee USING (id_estado_evento)
        JOIN ticket_trade."EstadoActividad" ea USING (id_estado_actividad)
        JOIN ticket_trade."VisibilidadEvento" v USING (id_visibilidad_evento)
        WHERE a.id_actividad = $1 AND ee.nombre = 'Publicado' AND ea.nombre = 'Programada'
          AND (a.fecha + a.hora_inicio) AT TIME ZONE 'America/Mexico_City' > statement_timestamp()
          AND NOT EXISTS (
            SELECT 1 FROM ticket_trade."AfectacionActividad" af
            WHERE af.id_actividad = a.id_actividad AND af.resuelta_en IS NULL
          )
          AND (v.nombre = 'Público' OR (v.nombre = 'Privado' AND e.token_enlace_privado = $2))
      ), ocupacion AS (
        SELECT cp.id_compromiso_cupo, s.id_lugar_actividad::text lugar,
               ea.nombre = 'Vigente' AS apartado
        FROM visible v
        JOIN ticket_trade."CompromisoCupo" cp USING (id_actividad)
        JOIN ticket_trade."EstadoCompromisoCupo" ec USING (id_estado_compromiso_cupo)
        LEFT JOIN ticket_trade."AsignacionAsiento" s USING (id_compromiso_cupo)
        LEFT JOIN ticket_trade."Apartado" ap USING (id_compromiso_cupo)
        LEFT JOIN ticket_trade."EstadoApartado" ea USING (id_estado_apartado)
        WHERE ec.nombre = 'Activo'
          AND (ap.id_compromiso_cupo IS NULL OR ea.nombre = 'Convertido en reservación'
            OR (ea.nombre = 'Vigente' AND ap.creado_en + interval '2 minutes' > statement_timestamp()))
      )
      SELECT greatest(0, v.aforo_solicitado - count(o.id_compromiso_cupo))::int disponibles,
        coalesce(array_agg(o.lugar) FILTER (WHERE o.lugar IS NOT NULL AND o.apartado IS TRUE), '{}') apartados,
        coalesce(array_agg(o.lugar) FILTER (WHERE o.lugar IS NOT NULL AND o.apartado IS NOT TRUE), '{}') ocupados,
        coalesce((
          SELECT jsonb_object_agg(la.id_lugar_actividad::text,
            CASE WHEN ef.nombre = 'Fuera de servicio' THEN 'bloqueado' ELSE lower(cl.nombre) END)
          FROM ticket_trade."LugarActividad" la
          JOIN ticket_trade."CategoriaLugarActividad" cl USING (id_categoria_lugar_actividad)
          LEFT JOIN ticket_trade."EstacionComputo" pc USING (id_lugar_recinto)
          LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING (id_estado_funcionamiento)
          WHERE la.id_actividad = v.id_actividad
            AND (cl.nombre <> 'Asistente' OR ef.nombre = 'Fuera de servicio')
        ), '{}'::jsonb) categorias
      FROM visible v LEFT JOIN ocupacion o ON true
      GROUP BY v.id_actividad, v.aforo_solicitado`,
      [id, token && token.length <= 256 ? token : null],
    );
    if (!resultado.rowCount) fallo("La actividad ya no está disponible para reservar.", 404);
    res.set("Cache-Control", "no-store").json({ datos: resultado.rows[0] });
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
      const idLugar = a.acceso === "Reservación con lugar asignado"
        ? idEntero(b.idLugar)
        : null;
      if (!idLugar && b.idLugar) fallo("El registro sin asiento no admite selección de lugar.");
      const pendiente = await c.query(
        `SELECT ap.id_compromiso_cupo::text id, ap.creado_en + interval '2 minutes' vence,
                s.id_lugar_actividad::text lugar
         FROM ticket_trade."Apartado" ap JOIN ticket_trade."CompromisoCupo" cp USING (id_compromiso_cupo)
         JOIN ticket_trade."EstadoApartado" ea USING (id_estado_apartado)
         LEFT JOIN ticket_trade."AsignacionAsiento" s USING (id_compromiso_cupo)
         WHERE ap.id_cuenta = $1 AND cp.id_actividad = $2 AND ea.nombre = 'Vigente'
           AND ap.creado_en + interval '2 minutes' > clock_timestamp()`,
        [u.id, id],
      );
      if (pendiente.rowCount) {
        const previo = pendiente.rows[0];
        if (previo.lugar === idLugar) return { id: previo.id, vence: previo.vence, recuperado: true };
        fallo("Ya tienes un apartado vigente para esta actividad. Confírmalo o espera a que venza.", 409);
      }
      if (idLugar) {
        const lugar = await c.query(
          `SELECT 1 FROM ticket_trade."LugarActividad" la JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
        WHERE la.id_lugar_actividad=$1 AND la.id_actividad=$2 AND cl.nombre='Asistente'`,
          [idLugar, id],
        );
        if (!lugar.rowCount) fallo("Selecciona un asiento para asistentes.");
      }
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
      if (idLugar)
        await c.query(
          'INSERT INTO ticket_trade."AsignacionAsiento" VALUES($1,$2)',
          [idCupo, idLugar],
        );
      return { id: idCupo, vence: ap.rows[0].vence };
    });
    res.status("recuperado" in resultado ? 200 : 201).json({ datos: resultado });
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
      const previa = await c.query(
        `SELECT r.id_reservacion::text id, b.id_boleto_evento::text "idPase"
         FROM ticket_trade."Apartado" ap
         JOIN ticket_trade."Reservacion" r USING (id_compromiso_cupo)
         JOIN ticket_trade."EstadoReservacion" er USING (id_estado_reservacion)
         JOIN ticket_trade."BoletoEvento" b USING (id_boleto_evento)
         WHERE ap.id_compromiso_cupo = $1 AND ap.id_cuenta = $2 AND b.id_cuenta = $2
           AND er.nombre = 'Confirmada'`,
        [id, u.id],
      );
      if (previa.rowCount) return { ...previa.rows[0], recuperado: true };
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
      const cruce = await c.query(
        `SELECT a2.nombre AS actividad,e2.titulo AS evento,a2.id_evento::text AS id_evento,
          to_char(a2.hora_inicio,'HH24:MI') AS inicio,to_char(a2.hora_fin,'HH24:MI') AS fin
          FROM ticket_trade."Reservacion" r2
          JOIN ticket_trade."BoletoEvento" b2 USING(id_boleto_evento)
          JOIN ticket_trade."CompromisoCupo" cp2 USING(id_compromiso_cupo)
          JOIN ticket_trade."Actividad" a2 ON a2.id_actividad=cp2.id_actividad
          JOIN ticket_trade."Evento" e2 ON e2.id_evento=a2.id_evento
          JOIN ticket_trade."EstadoReservacion" er2 ON er2.id_estado_reservacion=r2.id_estado_reservacion
          WHERE b2.id_cuenta=$1 AND er2.nombre='Confirmada' AND a2.fecha=$2
            AND $3::time < a2.hora_fin AND a2.hora_inicio < $4::time
          LIMIT 1`,
        [u.id, a.fecha, a.hora_inicio, a.hora_fin],
      );
      if (cruce.rowCount) {
        const ch = cruce.rows[0];
        const nombreCruce =
          ch.id_evento === a.evento
            ? ch.actividad || ch.evento
            : ch.evento || ch.actividad;
        fallo(
          obtenerMensajeErrorCruce({
            actividad: nombreCruce,
            inicio: ch.inicio,
            fin: ch.fin,
          }),
          409,
        );
      }
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
      const correoPendiente = await encolarCorreo(
        c,
        u.id,
        "reserva:" + r.rows[0].id,
        { tipo: "boleto", idPase: pase.id },
      );
      return { id: r.rows[0].id, idPase: pase.id, correoPendiente };
    });
    res.status("recuperado" in resultado ? 200 : 201).json({ datos: resultado });
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
      await encolarAviso(
        c,
        res.locals.usuario.id,
        "reserva-cancelada:" + req.params.id,
        "Tu reservación fue cancelada",
        `Cancelaste tu reservación para ${a.nombre} (${a.fecha}). Las demás actividades de tu pase conservan su estado. Consulta el detalle y el boleto actualizado.`,
        "/mis-reservaciones",
      );
    });
    res.json({ datos: { exito: true } });
  }),
);
routerTaquilla.get(
  "/operacion",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario;
    const idEvento =
      typeof req.query.idEvento === "string" && req.query.idEvento.trim()
        ? idEntero(req.query.idEvento)
        : null;
    const filas = await conTransaccion(async (c) => {
      await bloquear(c);
      const r = await c.query(
        `SELECT v.*,v.id_actividad::text id FROM ticket_trade.v_actividades v
          WHERE ($1::boolean OR ($3::boolean AND v.id_cuenta_organizadora=$2)
            OR EXISTS(SELECT 1 FROM ticket_trade."StaffEvento" s WHERE s.id_evento=v.id_evento AND s.id_cuenta=$2))
            AND ($4::bigint IS NULL OR v.id_evento=$4)
          ORDER BY fecha,hora_inicio`,
        [
          u.roles.includes("admin") || u.roles.includes("subdireccion"),
          u.id,
          u.roles.includes("organizador"),
          idEvento,
        ],
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
      if (a.acceso === "Entrada libre")
        fallo(
          "Esta actividad es de entrada libre y no utiliza control de acceso.",
          409,
        );
      if (
        a.estado !== "Programada" ||
        a.estado_evento !== "Publicado" ||
        a.afectada
      )
        fallo(
          a.estado === "Suspendida por bloqueo" || a.afectada
            ? "La actividad está suspendida temporalmente por un bloqueo del recinto."
            : "La actividad no está habilitada.",
          409,
        );
      if (
        Date.now() < new Date(a.inicio).getTime() - 30 * 60000 ||
        Date.now() > new Date(a.fin).getTime()
      )
        fallo(
          "El ingreso abre 30 minutos antes y cierra al terminar la actividad.",
          409,
        );
      const r = await c.query(
        `SELECT r.id_reservacion::text id,er.nombre estado FROM ticket_trade."Reservacion" r
          JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento)
          JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
          JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion)
          WHERE cp.id_actividad=$1 AND (upper(b.codigo_qr)=upper($2) OR upper(b.codigo_manual)=upper($2))
          ORDER BY (er.nombre='Confirmada') DESC, r.id_reservacion DESC`,
        [id, codigo],
      );
      const confirmada = r.rows.find((f: any) => f.estado === "Confirmada");
      if (confirmada) {
        if (
          (
            await c.query(
              'SELECT 1 FROM ticket_trade."EntradaOrdinaria" WHERE id_reservacion=$1',
              [confirmada.id],
            )
          ).rowCount
        )
          fallo("Este boleto ya fue utilizado para esta actividad.", 409);
        const ins = await c.query(
          'INSERT INTO ticket_trade."EntradaOrdinaria"(id_reservacion,id_cuenta_operadora,registrada_en) VALUES($1,$2,clock_timestamp()) RETURNING id_entrada_ordinaria::text id_entrada,registrada_en::text registrada_en',
          [confirmada.id, u.id],
        );
        return {
          exito: true,
          resultado: "exito",
          mensaje: "Acceso registrado correctamente.",
          idReservacion: confirmada.id,
          idEntrada: ins.rows[0].id_entrada,
          registradaEn: ins.rows[0].registrada_en,
          operador: u.nombre,
        };
      }
      if (r.rowCount) {
        fallo("Boleto inválido o cancelado para esta actividad.", 409);
      }
      const esp = await c.query(
        `SELECT b.id_boleto_especial::text id,cp.id_actividad::text actividad,b.invalidado_en
          FROM ticket_trade."BoletoEspecial" b
          JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
          WHERE upper(b.codigo_qr)=upper($1) OR upper(b.codigo_manual)=upper($1)`,
        [codigo],
      );
      if (esp.rowCount) {
        const b = esp.rows[0];
        if (b.actividad !== id)
          fallo("El pase no tiene una reservación para esta actividad.", 409);
        if (b.invalidado_en)
          fallo("Boleto inválido o cancelado para esta actividad.", 409);
        if (
          (
            await c.query(
              'SELECT 1 FROM ticket_trade."EntradaEspecial" WHERE id_boleto_especial=$1',
              [b.id],
            )
          ).rowCount
        )
          fallo("Este boleto ya fue utilizado para esta actividad.", 409);
        const ins = await c.query(
          'INSERT INTO ticket_trade."EntradaEspecial"(id_boleto_especial,id_cuenta_operadora,registrada_en) VALUES($1,$2,clock_timestamp()) RETURNING id_entrada_especial::text id_entrada,registrada_en::text registrada_en',
          [b.id, u.id],
        );
        return {
          exito: true,
          resultado: "exito",
          mensaje: "Acceso registrado correctamente.",
          idBoletoEspecial: b.id,
          idEntrada: ins.rows[0].id_entrada,
          registradaEn: ins.rows[0].registrada_en,
          operador: u.nombre,
        };
      }
      const paseExistente = await c.query(
        `SELECT 1 FROM ticket_trade."BoletoEvento" b WHERE upper(b.codigo_qr)=upper($1) OR upper(b.codigo_manual)=upper($1)`,
        [codigo],
      );
      if (paseExistente.rowCount) {
        fallo("El pase no tiene una reservación para esta actividad.", 409);
      }
      fallo("El código no corresponde a un boleto emitido.", 409);
    });
    res.json({ datos: resultado });
  }),
);

routerTaquilla.get(
  "/pases/:id/pdf",
  exigirSesion,
  ruta(async (req, res) => {
    const b = await conTransaccion((c) =>
      leerBoleto(c, idEntero(req.params.id), res.locals.usuario.id),
    );
    const { pdf } = await generarPdfBoleto(b);
    res
      .set({
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="boleto-tickettrade.pdf"',
      })
      .send(pdf);
  }),
);
routerTaquilla.post(
  "/pases/:id/correo",
  exigirSesion,
  ruta(async (req, res) => {
    if (!correoHabilitado())
      fallo("El envío de correos no está configurado.", 503);
    const id = idEntero(req.params.id),
      cuenta = res.locals.usuario.id;
    const resultado = await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock($1::bigint)", [cuenta]);
      await leerBoleto(c, id, cuenta);
      const reciente = (
        await c.query(
          `SELECT 1 FROM infra.correo_salida WHERE id_cuenta=$1 AND clave LIKE $2 AND creada_en>now()-interval '1 minute'`,
          [cuenta, "reenvio:" + id + ":%"],
        )
      ).rowCount;
      if (reciente) fallo("Espera un minuto antes de reenviar.", 429);
      await encolarCorreo(
        c,
        cuenta,
        "reenvio:" + id + ":" + crypto.randomUUID(),
        { tipo: "boleto", idPase: id },
      );
      return {
        exito: true,
        mensaje: "El envío quedó pendiente; esto no confirma recepción.",
      };
    });
    res.status(202).json({ datos: resultado });
  }),
);

routerTaquilla.get(
  "/pases/:id/correo",
  exigirSesion,
  ruta(async (req, res) => {
    const id = idEntero(req.params.id),
      cuenta = res.locals.usuario.id;
    await conTransaccion((c) => leerBoleto(c, id, cuenta));
    const r = await pool.query(
      `SELECT estado,actualizada_en FROM infra.correo_salida WHERE id_cuenta=$1 AND id_pase=$2 ORDER BY creada_en DESC LIMIT 1`,
      [cuenta, id],
    );
    res.set("Cache-Control", "no-store").json({
      datos: r.rows[0] || {
        estado: correoHabilitado() ? "sin_envio" : "no_configurado",
      },
    });
  }),
);
