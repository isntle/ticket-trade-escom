import { Router } from "express";
import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { conTransaccion } from "../../bd/pool.js";
import { liberarApartadosVencidos } from "../../bd/apartados.js";
import { exigirSesion } from "../identidad/auth.js";
import { origenSeguro } from "../../comun/seguridad.js";
import { fallo, idEntero, ruta, texto } from "../../comun/http.js";

const SQL_INFRA_ESPECIALES = `
CREATE SCHEMA IF NOT EXISTS infra;
CREATE TABLE IF NOT EXISTS infra.boleto_especial_detalle (
  id_boleto_especial bigint PRIMARY KEY REFERENCES ticket_trade."BoletoEspecial"(id_boleto_especial) ON DELETE CASCADE,
  tipo_especial text NOT NULL CHECK (tipo_especial IN ('organizador', 'staff', 'vip')),
  nombre_titular text NOT NULL CHECK (btrim(nombre_titular) <> ''),
  correo_destino text NOT NULL CHECK (btrim(correo_destino) <> ''),
  id_cuenta_emisora bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta),
  emitido_por text NOT NULL CHECK (btrim(emitido_por) <> ''),
  id_cuenta_invalidadora bigint REFERENCES ticket_trade."Cuenta"(id_cuenta),
  invalidado_por text,
  id_categoria_lugar_previa bigint REFERENCES ticket_trade."CategoriaLugarActividad"(id_categoria_lugar_actividad)
);
CREATE TABLE IF NOT EXISTS infra.emision_especial_idempotencia (
  id_cuenta bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta) ON DELETE CASCADE,
  clave text NOT NULL CHECK (btrim(clave) <> ''),
  id_actividad bigint NOT NULL REFERENCES ticket_trade."Actividad"(id_actividad) ON DELETE CASCADE,
  ids_boletos bigint[] NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_cuenta, clave)
);
`;

export async function asegurarInfraEspeciales(c: {
  query: (sql: string, params?: any[]) => Promise<any>;
}) {
  await c.query(SQL_INFRA_ESPECIALES);
}

function puedeAdministrarEspeciales(u: any, idOrganizadorEvento: string): boolean {
  if (!u || u.estaActivo === false) return false;
  const roles: string[] = Array.isArray(u.roles) ? u.roles : [];
  return (
    roles.includes("admin") ||
    (roles.includes("organizador") && String(idOrganizadorEvento) === String(u.id))
  );
}

async function proyectarBoletosEspecialesPorIds(
  c: PoolClient,
  idsBoletos: string[],
) {
  if (!idsBoletos.length) return [];
  const r = await c.query(
    `SELECT b.id_boleto_especial::text id,
            a.id_evento::text evento,
            a.id_actividad::text actividad,
            e.titulo titulo_evento,
            to_char(a.fecha, 'YYYY-MM-DD') fecha,
            to_char(a.hora_inicio, 'HH24:MI') || ' - ' || to_char(a.hora_fin, 'HH24:MI') hora,
            rec.nombre recinto,
            lr.codigo lugar,
            cl.nombre categoria,
            b.codigo_qr,
            b.codigo_manual,
            b.emitido_en,
            b.invalidado_en,
            b.motivo_invalidacion,
            bed.tipo_especial,
            bed.nombre_titular,
            bed.correo_destino,
            bed.emitido_por,
            bed.invalidado_por
       FROM ticket_trade."BoletoEspecial" b
       JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
       JOIN ticket_trade."Actividad" a USING(id_actividad)
       JOIN ticket_trade."Evento" e USING(id_evento)
       JOIN ticket_trade."Recinto" rec ON rec.id_recinto = a.id_recinto
       LEFT JOIN ticket_trade."AsignacionAsiento" aa USING(id_compromiso_cupo)
       LEFT JOIN ticket_trade."LugarActividad" la USING(id_lugar_actividad)
       LEFT JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
       LEFT JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
       LEFT JOIN infra.boleto_especial_detalle bed USING(id_boleto_especial)
      WHERE b.id_boleto_especial = ANY($1::bigint[])
      ORDER BY b.id_boleto_especial ASC`,
    [idsBoletos],
  );
  return r.rows.map((b: any) => ({
    id: "boleto-esp-" + b.id,
    idReservacion: "esp-" + b.id,
    idEvento: b.evento,
    idFechaEvento: b.actividad,
    idUsuario: "especial-" + b.id,
    nombreUsuario:
      b.nombre_titular ||
      (b.categoria === "Staff" ? "Integrante de staff" : "Invitado VIP"),
    correoUsuario: b.correo_destino || "",
    tituloEvento: b.titulo_evento || "",
    fechaEvento: b.fecha || "",
    horaEvento: b.hora || "",
    nombreRecinto: b.recinto || "",
    etiquetaAsiento: b.lugar || undefined,
    codigoQr: b.codigo_qr,
    codigoManual: b.codigo_manual,
    esEspecial: true as const,
    tipoEspecial: (b.tipo_especial ||
      (b.categoria === "Staff" ? "staff" : "vip")) as
      | "organizador"
      | "staff"
      | "vip",
    emitidoPor: b.emitido_por || undefined,
    invalidadoPor: b.invalidado_por || undefined,
    estado: b.invalidado_en ? ("cancelado" as const) : ("valido" as const),
    fechaEmision: new Date(b.emitido_en).toISOString(),
    fechaInvalidacion: b.invalidado_en
      ? new Date(b.invalidado_en).toISOString()
      : undefined,
    motivoInvalidacion: b.motivo_invalidacion || undefined,
  }));
}

export const routerEspeciales = Router();
routerEspeciales.use((req, res, next) =>
  req.method === "GET" ? next() : origenSeguro(req, res, next),
);

routerEspeciales.post(
  "/especiales",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario;
    const b = req.body || {};

    const idEvento = idEntero(
      String(b.idEvento ?? "").replace(/^evt-/i, ""),
    );
    const idActividad = idEntero(
      String(b.idFechaEvento ?? b.idActividad ?? "").replace(
        /^(?:act-|fec-)/i,
        "",
      ),
    );
    const tipo = String(b.tipo ?? "").trim();
    if (!["organizador", "staff", "vip"].includes(tipo)) {
      fallo("Selecciona un tipo de boleto especial válido.", 400);
    }
    const cantidadNum = Number(b.cantidad);
    if (!Number.isInteger(cantidadNum) || cantidadNum < 1 || cantidadNum > 20) {
      fallo("La cantidad debe estar entre 1 y 20 boletos.", 400);
    }
    const nombreBase = texto(b.nombreBase, "el nombre de referencia", 160);
    const correoDestino = texto(b.correoDestino, "el correo de destino", 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoDestino)) {
      fallo("Indica un correo electrónico de destino válido.", 400);
    }
    const claveRaw = b.claveIdempotencia ?? req.get("Idempotency-Key");
    const claveIdempotencia =
      typeof claveRaw === "string" && claveRaw.trim()
        ? texto(claveRaw, "la clave de idempotencia", 200)
        : undefined;

    const resultado = await conTransaccion(async (c) => {
      await liberarApartadosVencidos(c);
      await asegurarInfraEspeciales(c);

      const actRes = await c.query(
        `SELECT a.id_actividad::text id,
                a.id_evento::text evento,
                a.aforo_solicitado,
                ta.nombre acceso,
                ea.nombre estado,
                ee.nombre estado_evento,
                e.id_cuenta_organizadora::text organizador,
                EXISTS(
                  SELECT 1 FROM ticket_trade."AfectacionActividad" af
                   WHERE af.id_actividad = a.id_actividad AND af.resuelta_en IS NULL
                ) afectada,
                EXISTS(
                  SELECT 1 FROM ticket_trade."BloqueoRecinto" br
                    JOIN ticket_trade."TipoBloqueoRecinto" tb USING(id_tipo_bloqueo_recinto)
                   WHERE br.id_recinto = a.id_recinto
                     AND br.finalizado_en IS NULL
                     AND tb.nombre IN ('Institucional', 'Fuera de servicio')
                     AND br.inicio < ((a.fecha + a.hora_fin) AT TIME ZONE 'America/Mexico_City')
                     AND (br.fin_previsto IS NULL OR br.fin_previsto > ((a.fecha + a.hora_inicio) AT TIME ZONE 'America/Mexico_City'))
                ) bloqueada,
                (a.fecha + a.hora_inicio) AT TIME ZONE 'America/Mexico_City' inicio
           FROM ticket_trade."Actividad" a
           JOIN ticket_trade."Evento" e USING(id_evento)
           JOIN ticket_trade."TipoAcceso" ta USING(id_tipo_acceso)
           JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad)
           JOIN ticket_trade."EstadoEvento" ee ON ee.id_estado_evento = e.id_estado_evento
          WHERE a.id_actividad = $1
            FOR UPDATE OF a, e`,
        [idActividad],
      );
      if (!actRes.rowCount) {
        fallo("El evento o la actividad seleccionada no existe.", 404);
      }
      const a = actRes.rows[0];
      if (String(a.evento) !== idEvento) {
        fallo("La actividad seleccionada no pertenece a este evento.", 409);
      }
      if (!puedeAdministrarEspeciales(u, a.organizador)) {
        fallo(
          "Solo el organizador responsable puede emitir boletos especiales.",
          403,
        );
      }

      if (claveIdempotencia) {
        const previa = await c.query(
          `SELECT id_actividad::text actividad, ids_boletos::text[] ids
             FROM infra.emision_especial_idempotencia
            WHERE id_cuenta = $1 AND clave = $2`,
          [u.id, claveIdempotencia],
        );
        if (previa.rowCount) {
          if (String(previa.rows[0].actividad) !== idActividad) {
            fallo(
              "La clave de idempotencia ya fue utilizada en otra actividad.",
              409,
            );
          }
          const idsPrevios: string[] = previa.rows[0].ids || [];
          const boletosPrevios = await proyectarBoletosEspecialesPorIds(
            c,
            idsPrevios,
          );
          return {
            ids: idsPrevios,
            boletos: boletosPrevios,
            idempotente: true,
            reutilizado: true,
          };
        }
      }

      if (a.estado_evento !== "Publicado") {
        fallo(
          "No se pueden emitir boletos para un evento cancelado o no publicado.",
          409,
        );
      }
      if (a.estado !== "Programada" || a.afectada || a.bloqueada) {
        fallo(
          "ERR-TR-10 · La actividad está cancelada o suspendida y no permite emitir boletos especiales.",
          409,
        );
      }
      if (a.acceso !== "Reservación con lugar asignado") {
        fallo(
          "Esta actividad no utiliza control de acceso con lugar asignado.",
          409,
        );
      }
      const inicioMs = new Date(a.inicio).getTime();
      if (!Number.isFinite(inicioMs) || inicioMs - Date.now() < 60 * 60 * 1000) {
        fallo(
          "La emisión debe realizarse al menos una hora antes del inicio de la actividad.",
          409,
        );
      }

      await c.query(
        `INSERT INTO ticket_trade."LugarActividad"(id_actividad, id_lugar_recinto, id_categoria_lugar_actividad)
         SELECT a.id_actividad, lr.id_lugar_recinto,
                (SELECT id_categoria_lugar_actividad FROM ticket_trade."CategoriaLugarActividad" WHERE nombre = 'Asistente')
           FROM ticket_trade."Actividad" a
           JOIN ticket_trade."LugarRecinto" lr ON lr.id_recinto = a.id_recinto
          WHERE a.id_actividad = $1
             ON CONFLICT (id_actividad, id_lugar_recinto) DO NOTHING`,
        [idActividad],
      );

      const cuposActivos = await c.query(
        `SELECT count(*)::int n
           FROM ticket_trade."CompromisoCupo" cp
           JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo)
          WHERE cp.id_actividad = $1 AND ec.nombre = 'Activo'`,
        [idActividad],
      );
      const disponibles = Math.max(
        0,
        Number(a.aforo_solicitado) - Number(cuposActivos.rows[0].n),
      );
      if (Number(a.aforo_solicitado) <= 0 || cantidadNum > disponibles) {
        fallo(
          "La cantidad solicitada supera los lugares disponibles para esta actividad.",
          409,
        );
      }

      const categoriaObjetivo = tipo === "vip" ? "VIP" : "Staff";
      const lugaresRes = await c.query(
        `SELECT la.id_lugar_actividad::text id_lugar_actividad,
                la.id_categoria_lugar_actividad::text id_categoria_previa,
                cl.nombre categoria_actual
           FROM ticket_trade."LugarActividad" la
           JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
           JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
           LEFT JOIN ticket_trade."EstacionComputo" pc USING(id_lugar_recinto)
           LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING(id_estado_funcionamiento)
          WHERE la.id_actividad = $1
            AND cl.nombre IN ($2, 'Asistente')
            AND COALESCE(ef.nombre, 'Funcional') <> 'Fuera de servicio'
            AND NOT EXISTS (
              SELECT 1 FROM ticket_trade."AsignacionAsiento" s
                JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
                JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo)
               WHERE s.id_lugar_actividad = la.id_lugar_actividad
                 AND ec.nombre = 'Activo'
            )
          ORDER BY (cl.nombre = $2) DESC, lr.fila NULLS LAST, lr.posicion_x, lr.id_lugar_recinto
          LIMIT $3
            FOR UPDATE OF la`,
        [idActividad, categoriaObjetivo, cantidadNum],
      );
      if (lugaresRes.rows.length < cantidadNum) {
        fallo(
          "La cantidad solicitada supera los lugares disponibles para esta actividad.",
          409,
        );
      }

      const idsEmitidos: string[] = [];
      const emisorNombre = String(u.nombre || "Organizador acreditado").trim();

      for (let i = 0; i < cantidadNum; i++) {
        const lugar = lugaresRes.rows[i];
        if (lugar.categoria_actual !== categoriaObjetivo) {
          await c.query(
            `UPDATE ticket_trade."LugarActividad"
                SET id_categoria_lugar_actividad = (
                  SELECT id_categoria_lugar_actividad
                    FROM ticket_trade."CategoriaLugarActividad"
                   WHERE nombre = $2
                )
              WHERE id_lugar_actividad = $1`,
            [lugar.id_lugar_actividad, categoriaObjetivo],
          );
        }

        const cp = await c.query(
          `INSERT INTO ticket_trade."CompromisoCupo"(id_actividad, id_estado_compromiso_cupo)
           VALUES (
             $1,
             (SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre = 'Activo')
           )
           RETURNING id_compromiso_cupo::text id`,
          [idActividad],
        );
        const idCompromiso = cp.rows[0].id;

        await c.query(
          `INSERT INTO ticket_trade."AsignacionAsiento"(id_compromiso_cupo, id_lugar_actividad)
           VALUES ($1, $2)`,
          [idCompromiso, lugar.id_lugar_actividad],
        );

        const codigoQr =
          "TT-" + crypto.randomBytes(16).toString("hex").toUpperCase();
        const codigoManual = crypto
          .randomBytes(8)
          .toString("hex")
          .toUpperCase();

        const esp = await c.query(
          `INSERT INTO ticket_trade."BoletoEspecial"(id_compromiso_cupo, codigo_qr, codigo_manual, emitido_en)
           VALUES ($1, $2, $3, clock_timestamp())
           RETURNING id_boleto_especial::text id`,
          [idCompromiso, codigoQr, codigoManual],
        );
        const idBoleto = esp.rows[0].id;
        idsEmitidos.push(idBoleto);

        const nombreTitular =
          cantidadNum === 1 ? nombreBase : `${nombreBase} ${i + 1}`;
        await c.query(
          `INSERT INTO infra.boleto_especial_detalle(
             id_boleto_especial,
             tipo_especial,
             nombre_titular,
             correo_destino,
             id_cuenta_emisora,
             emitido_por,
             id_categoria_lugar_previa
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            idBoleto,
            tipo,
            nombreTitular,
            correoDestino,
            u.id,
            emisorNombre,
            lugar.id_categoria_previa,
          ],
        );
      }

      if (claveIdempotencia) {
        await c.query(
          `INSERT INTO infra.emision_especial_idempotencia(id_cuenta, clave, id_actividad, ids_boletos)
           VALUES ($1, $2, $3, $4::bigint[])`,
          [u.id, claveIdempotencia, idActividad, idsEmitidos],
        );
      }

      const boletos = await proyectarBoletosEspecialesPorIds(c, idsEmitidos);
      return { ids: idsEmitidos, boletos, idempotente: false, reutilizado: false };
    });

    res.status(resultado.idempotente ? 200 : 201).json({ datos: resultado });
  }),
);

routerEspeciales.post(
  "/especiales/:id/invalidacion",
  exigirSesion,
  ruta(async (req, res) => {
    const u = res.locals.usuario;
    const idBoleto = idEntero(
      String(req.params.id ?? "").replace(/^(?:boleto-esp-|bol-esp-|esp-)/i, ""),
    );
    const motivo = texto(
      req.body?.motivo,
      "el motivo de invalidación",
      500,
    );

    const resultado = await conTransaccion(async (c) => {
      await liberarApartadosVencidos(c);
      await asegurarInfraEspeciales(c);

      const r = await c.query(
        `SELECT b.id_boleto_especial::text id,
                b.id_compromiso_cupo::text cupo,
                b.invalidado_en,
                e.id_cuenta_organizadora::text organizador,
                aa.id_lugar_actividad::text id_lugar_actividad,
                bed.id_categoria_lugar_previa::text id_categoria_previa,
                EXISTS(
                  SELECT 1 FROM ticket_trade."EntradaEspecial" ee
                   WHERE ee.id_boleto_especial = b.id_boleto_especial
                ) utilizado
           FROM ticket_trade."BoletoEspecial" b
           JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
           JOIN ticket_trade."Actividad" a USING(id_actividad)
           JOIN ticket_trade."Evento" e USING(id_evento)
           LEFT JOIN ticket_trade."AsignacionAsiento" aa USING(id_compromiso_cupo)
           LEFT JOIN infra.boleto_especial_detalle bed USING(id_boleto_especial)
          WHERE b.id_boleto_especial = $1
            FOR UPDATE OF b, cp`,
        [idBoleto],
      );
      if (!r.rowCount) {
        fallo("No se encontró el boleto especial seleccionado.", 404);
      }
      const b = r.rows[0];
      if (!puedeAdministrarEspeciales(u, b.organizador)) {
        fallo(
          "Solo el organizador responsable puede invalidar boletos especiales de este evento.",
          403,
        );
      }
      if (b.utilizado) {
        fallo(
          "Un boleto que ya fue utilizado no puede invalidarse.",
          409,
        );
      }
      if (b.invalidado_en) {
        fallo("El boleto ya se encuentra invalidado.", 409);
      }

      await c.query(
        `UPDATE ticket_trade."BoletoEspecial"
            SET invalidado_en = GREATEST(clock_timestamp(), emitido_en),
                motivo_invalidacion = $2
          WHERE id_boleto_especial = $1`,
        [idBoleto, motivo],
      );

      await c.query(
        `UPDATE ticket_trade."CompromisoCupo"
            SET id_estado_compromiso_cupo = (
              SELECT id_estado_compromiso_cupo
                FROM ticket_trade."EstadoCompromisoCupo"
               WHERE nombre = 'Liberado'
            )
          WHERE id_compromiso_cupo = $1`,
        [b.cupo],
      );

      if (b.id_lugar_actividad && b.id_categoria_previa) {
        await c.query(
          `UPDATE ticket_trade."LugarActividad" la
              SET id_categoria_lugar_actividad = $2
            WHERE la.id_lugar_actividad = $1
              AND NOT EXISTS (
                SELECT 1 FROM ticket_trade."AsignacionAsiento" s
                  JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
                  JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo)
                 WHERE s.id_lugar_actividad = la.id_lugar_actividad
                   AND ec.nombre = 'Activo'
              )`,
          [b.id_lugar_actividad, b.id_categoria_previa],
        );
      }

      await c.query(
        `UPDATE infra.boleto_especial_detalle
            SET id_cuenta_invalidadora = $2,
                invalidado_por = $3
          WHERE id_boleto_especial = $1`,
        [
          idBoleto,
          u.id,
          String(u.nombre || "Organizador acreditado").trim(),
        ],
      );

      return { exito: true, id: "boleto-esp-" + b.id, estado: "invalidado" };
    });

    res.json({ datos: resultado });
  }),
);
