import { comprobarArchivo } from "../archivos/rutas";
import crypto from "node:crypto";
import { fallo, idEntero, ruta, texto } from "../../comun/http";
import { Router } from "express";
import { pool, conTransaccion } from "../../bd/pool";
import { exigirSesion } from "../identidad/auth";
import { origenSeguro } from "../../comun/seguridad";
export const routerOrganizacion = Router();
routerOrganizacion.use(exigirSesion);
routerOrganizacion.use((req, res, next) =>
  req.method === "GET" ? next() : origenSeguro(req, res, next),
);
const esRevision = (u: any) =>
  u.roles.includes("subdireccion") || u.roles.includes("admin");
const error = (res: any, codigo: string, mensaje: string, estado = 422) =>
  res.status(estado).json({ error: { codigo, mensaje } });
routerOrganizacion.get("/solicitudes", async (_req, res, next) => {
  try {
    const u = res.locals.usuario;
    const { rows } = await pool.query(
      `SELECT s.*,s.id_solicitud_evento::text AS id,e.titulo,e.descripcion,e.id_cuenta_organizadora::text,
      es.nombre AS estado,coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id_actividad::text,'nombre',a.nombre,'fecha',to_char(a.fecha,'YYYY-MM-DD'),'horaInicio',to_char(a.hora_inicio,'HH24:MI'),'horaFin',to_char(a.hora_fin,'HH24:MI'),'recinto',r.nombre,'aforo',a.aforo_solicitado,'acceso',ta.nombre) ORDER BY a.fecha,a.hora_inicio)
      FROM ticket_trade."Actividad" a JOIN ticket_trade."Recinto" r USING(id_recinto) JOIN ticket_trade."TipoAcceso" ta USING(id_tipo_acceso) WHERE a.id_evento=e.id_evento),'[]'::jsonb) actividades FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE ($1::boolean OR e.id_cuenta_organizadora=$2) ORDER BY s.id_solicitud_evento DESC`,
      [esRevision(u), u.id],
    );
    res.json({ datos: rows });
  } catch (e) {
    next(e);
  }
});
routerOrganizacion.post("/solicitudes", async (req, res, next) => {
  const u = res.locals.usuario,
    b = req.body || {};
  if (b.visibilidad && !["publico", "privado"].includes(b.visibilidad))
    return void error(
      res,
      "VISIBILIDAD_INVALIDA",
      "El modelo admite eventos públicos o privados.",
    );
  if (!u.correoConfirmado || !u.esVerificado)
    return void error(
      res,
      "VERIFICACION_REQUERIDA",
      "Confirma tu correo y verifica tu cuenta.",
      403,
    );
  if (
    typeof b.tituloEvento !== "string" ||
    !b.tituloEvento.trim() ||
    typeof b.descripcionEvento !== "string" ||
    !b.descripcionEvento.trim() ||
    !Array.isArray(b.fechasSolicitadas) ||
    b.fechasSolicitadas.length < 1
  )
    return void error(
      res,
      "DATOS_INVALIDOS",
      "Captura título, descripción y al menos una actividad.",
    );
  for (const a of b.fechasSolicitadas)
    if (
      !a ||
      !/^\d{4}-\d{2}-\d{2}$/.test(a.fecha) ||
      !/^\d{2}:\d{2}$/.test(a.horaInicio) ||
      !/^\d{2}:\d{2}$/.test(a.horaFin) ||
      !/^[1-9]\d*$/.test(a.idRecinto) ||
      !Number.isInteger(a.asistenciaEstimada) ||
      a.asistenciaEstimada < 1
    )
      return void error(
        res,
        "ACTIVIDAD_INVALIDA",
        "Revisa fecha, recinto, horario y aforo de cada actividad.",
      );
  const accesos: Record<string, string> = {
    libre: "Entrada libre",
    registro: "Registro sin asiento asignado",
    controlado: "Reservación con lugar asignado",
  };
  if (b.fechasSolicitadas.some((a: any) => !accesos[a.modalidadAsistencia]))
    return void error(
      res,
      "ACCESO_INVALIDO",
      "Revisa el acceso de cada actividad.",
    );
  try {
    const resultado = await conTransaccion(async (c) => {
      if (b.idArchivoCartel) {
        const semilla = await c.query(
          `SELECT 1 FROM ticket_trade."Archivo" WHERE id_archivo=$1 AND clave_almacenamiento LIKE '/imagenes/eventos/%'`,
          [b.idArchivoCartel],
        );
        if (!semilla.rowCount)
          await comprobarArchivo(c, b.idArchivoCartel, u.id, [
            "image/jpeg",
            "image/png",
          ]);
      }
      const { rows } = await c.query(
        `INSERT INTO ticket_trade."Evento"(id_cuenta_organizadora,titulo,descripcion,correo_contacto,telefono_contacto,id_categoria_evento,id_visibilidad_evento,id_estado_evento,id_archivo_cartel,token_enlace_privado) VALUES($1,$2,$3,$4,$5,(SELECT id_categoria_evento FROM ticket_trade."CategoriaEvento" WHERE nombre=$6),(SELECT id_visibilidad_evento FROM ticket_trade."VisibilidadEvento" WHERE nombre=$7),(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Borrador'),$8,$9) RETURNING id_evento::text AS id`,
        [
          u.id,
          b.tituloEvento.trim(),
          b.descripcionEvento.trim(),
          b.correoContacto || null,
          b.telefonoContacto || null,
          b.categoria || null,
          b.visibilidad === "privado" ? "Privado" : "Público",
          b.idArchivoCartel || null,
          b.visibilidad === "privado"
            ? crypto.randomBytes(24).toString("hex")
            : null,
        ],
      );
      const id = rows[0].id;
      for (const a of b.fechasSolicitadas)
        await c.query(
          `INSERT INTO ticket_trade."Actividad"(id_evento,nombre,descripcion,fecha,hora_inicio,hora_fin,id_recinto,id_tipo_acceso,aforo_solicitado,id_estado_actividad) VALUES($1,$2,$3,$4,$5,$6,$7,(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre=$8),$9,(SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Programada'))`,
          [
            id,
            a.nombreActividad || b.tituloEvento,
            a.descripcionActividad || "",
            a.fecha,
            a.horaInicio,
            a.horaFin,
            a.idRecinto,
            accesos[a.modalidadAsistencia],
            a.asistenciaEstimada,
          ],
        );
      const enviar = b.enviar === true;
      const tiempo = await c.query(
        `SELECT bool_or((fecha+hora_inicio) AT TIME ZONE 'America/Mexico_City'<=CURRENT_TIMESTAMP) AS pasado,bool_or((fecha+hora_inicio) AT TIME ZONE 'America/Mexico_City'<CURRENT_TIMESTAMP+interval '168 hours') AS urgente FROM ticket_trade."Actividad" WHERE id_evento=$1`,
        [id],
      );
      if (enviar && tiempo.rows[0].pasado)
        throw Object.assign(
          new Error("No se pueden enviar actividades en el pasado."),
          { estado: 422 },
        );
      const extraordinaria = !!tiempo.rows[0].urgente;
      if (
        enviar &&
        extraordinaria &&
        (typeof b.justificacionExcepcional !== "string" ||
          !b.justificacionExcepcional.trim())
      )
        throw Object.assign(
          new Error("Justifica la urgencia de la solicitud."),
          { estado: 422 },
        );
      const r = await c.query(
        `INSERT INTO ticket_trade."SolicitudEvento"(id_evento,id_tipo_tramite,id_tipo_anticipacion,motivo,id_estado_solicitud_evento,envio_inicial,inicio_revision) VALUES($1,(SELECT id_tipo_tramite FROM ticket_trade."TipoTramite" WHERE nombre='Solicitud inicial'),(SELECT id_tipo_anticipacion FROM ticket_trade."TipoAnticipacion" WHERE nombre=$2),$3,(SELECT id_estado_solicitud_evento FROM ticket_trade."EstadoSolicitudEvento" WHERE nombre=$4),CASE WHEN $5 THEN CURRENT_TIMESTAMP END,CASE WHEN $5 THEN CURRENT_TIMESTAMP END) RETURNING id_solicitud_evento::text AS id`,
        [
          id,
          extraordinaria ? "Extraordinaria" : "Ordinaria",
          b.justificacionExcepcional || null,
          enviar ? "En revisión" : "Borrador",
          enviar,
        ],
      );
      return { id: r.rows[0].id, idEvento: id };
    });
    res.status(201).json({ datos: resultado });
  } catch (e) {
    next(e);
  }
});
routerOrganizacion.post(
  "/solicitudes/:id/resolucion",
  async (req, res, next) => {
    if (!esRevision(res.locals.usuario))
      return void error(
        res,
        "NO_AUTORIZADO",
        "Solo Subdirección o Administración pueden revisar.",
        403,
      );
    if (!/^[1-9]\d*$/.test(req.params.id))
      return void error(res, "ID_INVALIDO", "Solicitud inválida.");
    const { decision, mensaje, version } = req.body || {};
    const estados: Record<string, string> = {
      Aprobada: "Aprobada",
      Devuelta: "Requiere corrección",
      Rechazada: "Rechazada",
    };
    if (
      !estados[decision] ||
      !Number.isInteger(version) ||
      version < 1 ||
      ((decision === "Devuelta" || decision === "Rechazada") &&
        (typeof mensaje !== "string" || !mensaje.trim()))
    )
      return void error(
        res,
        "DECISION_INVALIDA",
        "Revisa la decisión, versión y motivo.",
      );
    try {
      await conTransaccion(async (c) => {
        // Mismo bloqueo que usa el DDL: validar y resolver sobre el estado vigente.
        await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
        const { rows } = await c.query(
          `SELECT s.*,es.nombre AS estado FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE id_solicitud_evento=$1 FOR UPDATE OF s`,
          [req.params.id],
        );
        if (!rows[0])
          throw Object.assign(new Error("Solicitud inexistente"), {
            estado: 404,
          });
        const s = rows[0];
        if (s.estado !== "En revisión" || s.version_edicion !== version)
          throw Object.assign(
            new Error("La solicitud cambió; vuelve a consultarla."),
            { estado: 409 },
          );
        if (decision === "Aprobada") {
          // La distribución usa los lugares físicos del recinto del modelo ER.
          await c.query(
            `INSERT INTO ticket_trade."LugarActividad"(id_actividad,id_lugar_recinto,id_categoria_lugar_actividad)
            SELECT a.id_actividad,l.id_lugar_recinto,(SELECT id_categoria_lugar_actividad FROM ticket_trade."CategoriaLugarActividad" WHERE nombre='Asistente')
            FROM ticket_trade."Actividad" a JOIN ticket_trade."LugarRecinto" l USING(id_recinto) JOIN ticket_trade."TipoAcceso" t USING(id_tipo_acceso)
            WHERE a.id_evento=$1 AND t.nombre='Reservación con lugar asignado'
            AND NOT EXISTS(SELECT 1 FROM ticket_trade."LugarActividad" la WHERE la.id_actividad=a.id_actividad AND la.id_lugar_recinto=l.id_lugar_recinto)`,
            [s.id_evento],
          );
          const bloqueos = await c.query(
            `SELECT 1 FROM ticket_trade."Actividad" a JOIN ticket_trade."BloqueoRecinto" b ON b.id_recinto=a.id_recinto AND b.finalizado_en IS NULL WHERE a.id_evento=$1 AND (a.fecha+a.hora_fin) AT TIME ZONE 'America/Mexico_City'>b.inicio LIMIT 1`,
            [s.id_evento],
          );
          if (bloqueos.rowCount)
            throw Object.assign(
              new Error("El recinto tiene un bloqueo vigente."),
              { estado: 409 },
            );
          await c.query(
            `UPDATE ticket_trade."Evento" SET id_estado_evento=(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Publicado'),publicado_en=CURRENT_TIMESTAMP WHERE id_evento=$1`,
            [s.id_evento],
          );
        }
        await c.query(
          `INSERT INTO ticket_trade."ResolucionSolicitud"(id_solicitud_evento,version_revisada,id_decision_solicitud,mensaje,resuelta_en,id_cuenta_resolutora) VALUES($1,$2,(SELECT id_decision_solicitud FROM ticket_trade."DecisionSolicitud" WHERE nombre=$3),$4,CURRENT_TIMESTAMP,$5)`,
          [
            req.params.id,
            version,
            decision,
            mensaje || null,
            res.locals.usuario.id,
          ],
        );
        await c.query(
          `UPDATE ticket_trade."SolicitudEvento" SET id_estado_solicitud_evento=(SELECT id_estado_solicitud_evento FROM ticket_trade."EstadoSolicitudEvento" WHERE nombre=$2) WHERE id_solicitud_evento=$1`,
          [req.params.id, estados[decision]],
        );
      });
      res.json({ datos: { exito: true } });
    } catch (e) {
      next(e);
    }
  },
);

routerOrganizacion.patch(
  "/solicitudes/:id",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id),
      u = res.locals.usuario,
      b = req.body || {};
    if (!Number.isInteger(b.version) || b.version < 1)
      fallo("Recarga la versión de la solicitud.");
    if (!Array.isArray(b.fechasSolicitadas) || !b.fechasSolicitadas.length)
      fallo("Conserva al menos una actividad.");
    const accesos: Record<string, string> = {
      libre: "Entrada libre",
      registro: "Registro sin asiento asignado",
      controlado: "Reservación con lugar asignado",
    };
    await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
      const r = await c.query(
        `SELECT s.id_evento::text evento,s.version_edicion,es.nombre estado,e.id_cuenta_organizadora::text titular FROM ticket_trade."SolicitudEvento" s
   JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE s.id_solicitud_evento=$1 FOR UPDATE OF s`,
        [id],
      );
      const s = r.rows[0];
      if (!s || s.titular !== u.id)
        fallo("Solo puedes modificar tu propia solicitud.", 403);
      if (
        s.version_edicion !== b.version ||
        !["Borrador", "Requiere corrección"].includes(s.estado)
      )
        fallo("La solicitud cambió o ya no admite edición.", 409);
      if (b.enviar && (!u.correoConfirmado || !u.esVerificado))
        fallo("Necesitas una cuenta confirmada y verificada.", 403);
      if (!["publico", "privado"].includes(b.visibilidad))
        fallo("El modelo admite visibilidad pública o privada.");
      if (b.idArchivoCartel)
        await comprobarArchivo(c, b.idArchivoCartel, u.id, [
          "image/jpeg",
          "image/png",
        ]);
      await c.query(
        `UPDATE ticket_trade."Evento" SET titulo=$2,descripcion=$3,correo_contacto=$4,telefono_contacto=$5,
   id_categoria_evento=(SELECT id_categoria_evento FROM ticket_trade."CategoriaEvento" WHERE nombre=$6),
   id_visibilidad_evento=(SELECT id_visibilidad_evento FROM ticket_trade."VisibilidadEvento" WHERE nombre=$7),id_archivo_cartel=$8,
   token_enlace_privado=CASE WHEN $7='Privado' THEN coalesce(token_enlace_privado,$9) ELSE NULL END WHERE id_evento=$1`,
        [
          s.evento,
          texto(b.tituloEvento, "el título"),
          texto(b.descripcionEvento, "la descripción"),
          b.correoContacto || null,
          b.telefonoContacto || null,
          b.categoria || "Otro",
          b.visibilidad === "privado" ? "Privado" : "Público",
          b.idArchivoCartel || null,
          crypto.randomBytes(24).toString("hex"),
        ],
      );
      const conservar: string[] = [];
      for (const a of b.fechasSolicitadas) {
        if (
          !accesos[a.modalidadAsistencia] ||
          !Number.isInteger(a.asistenciaEstimada) ||
          a.asistenciaEstimada < 1
        )
          fallo("Revisa el acceso y aforo de las actividades.");
        const valores = [
          s.evento,
          a.nombreActividad || b.tituloEvento,
          a.descripcionActividad || "",
          a.fecha,
          a.horaInicio,
          a.horaFin,
          idEntero(a.idRecinto),
          accesos[a.modalidadAsistencia],
          a.asistenciaEstimada,
        ];
        const propia =
          typeof a.id === "string" && /^[1-9]\d*$/.test(a.id)
            ? (
                await c.query(
                  'SELECT id_actividad::text id FROM ticket_trade."Actividad" WHERE id_actividad=$1 AND id_evento=$2',
                  [a.id, s.evento],
                )
              ).rows[0]
            : null;
        if (propia) {
          await c.query(
            `UPDATE ticket_trade."Actividad" SET nombre=$2,descripcion=$3,fecha=$4,hora_inicio=$5,hora_fin=$6,id_recinto=$7,id_tipo_acceso=(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre=$8),aforo_solicitado=$9 WHERE id_actividad=$10 AND id_evento=$1`,
            [...valores, propia.id],
          );
          conservar.push(propia.id);
        } else {
          const n = await c.query(
            `INSERT INTO ticket_trade."Actividad"(id_evento,nombre,descripcion,fecha,hora_inicio,hora_fin,id_recinto,id_tipo_acceso,aforo_solicitado,id_estado_actividad) VALUES($1,$2,$3,$4,$5,$6,$7,(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre=$8),$9,1) RETURNING id_actividad::text id`,
            valores,
          );
          conservar.push(n.rows[0].id);
        }
      }
      await c.query(
        'DELETE FROM ticket_trade."Actividad" WHERE id_evento=$1 AND NOT(id_actividad=ANY($2::bigint[]))',
        [s.evento, conservar],
      );
      const tiempo = (
        await c.query(
          `SELECT bool_or((fecha+hora_inicio) AT TIME ZONE 'America/Mexico_City'<=CURRENT_TIMESTAMP) pasado,bool_or((fecha+hora_inicio) AT TIME ZONE 'America/Mexico_City'<CURRENT_TIMESTAMP+interval '168 hours') urgente FROM ticket_trade."Actividad" WHERE id_evento=$1`,
          [s.evento],
        )
      ).rows[0];
      if (b.enviar && tiempo.pasado)
        fallo("No puedes enviar actividades pasadas.");
      if (b.enviar && tiempo.urgente && !b.justificacionExcepcional?.trim())
        fallo("Justifica la anticipación extraordinaria.");
      await c.query(
        `UPDATE ticket_trade."SolicitudEvento" SET version_edicion=version_edicion+1,motivo=$2,
   id_tipo_anticipacion=(SELECT id_tipo_anticipacion FROM ticket_trade."TipoAnticipacion" WHERE nombre=$3),
   id_estado_solicitud_evento=CASE WHEN $4 THEN (SELECT id_estado_solicitud_evento FROM ticket_trade."EstadoSolicitudEvento" WHERE nombre='En revisión') ELSE id_estado_solicitud_evento END,
   envio_inicial=CASE WHEN $4 THEN coalesce(envio_inicial,CURRENT_TIMESTAMP) ELSE envio_inicial END,inicio_revision=CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE inicio_revision END WHERE id_solicitud_evento=$1`,
        [
          id,
          b.justificacionExcepcional || null,
          tiempo.urgente ? "Extraordinaria" : "Ordinaria",
          b.enviar === true,
        ],
      );
    });
    res.json({ datos: { exito: true } });
  }),
);

routerOrganizacion.post(
  "/solicitudes/:id/cancelacion",
  ruta(async (req, res) => {
    await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
      const r = await c.query(
        `UPDATE ticket_trade."SolicitudEvento" s SET id_estado_solicitud_evento=(SELECT id_estado_solicitud_evento FROM ticket_trade."EstadoSolicitudEvento" WHERE nombre='Cancelada'),version_edicion=version_edicion+1
   FROM ticket_trade."Evento" e,ticket_trade."EstadoSolicitudEvento" es WHERE e.id_evento=s.id_evento AND es.id_estado_solicitud_evento=s.id_estado_solicitud_evento
   AND s.id_solicitud_evento=$1 AND e.id_cuenta_organizadora=$2 AND s.version_edicion=$3 AND es.nombre IN ('Borrador','En revisión','Requiere corrección') RETURNING s.id_solicitud_evento`,
        [idEntero(req.params.id), res.locals.usuario.id, req.body?.version],
      );
      if (!r.rowCount)
        fallo("La solicitud cambió o no puedes cancelarla.", 409);
    });
    res.json({ datos: { exito: true } });
  }),
);
