import { liberarApartadosVencidos } from "../../bd/apartados.js";
import { Router } from "express";
import { conTransaccion } from "../../bd/pool.js";
import { fallo, ruta, idEntero, texto } from "../../comun/http.js";
import { versionEvento } from "./version.js";
import { encolarAviso } from "../correos/avisos.js";
import { comprobarArchivo } from "../archivos/rutas.js";
import type { PoolClient } from "pg";
export const routerEventos = Router();
// La limpieza vence antes de la operación; un conflicto posterior no la deshace.
routerEventos.use("/eventos/:id", async (_req, _res, next) => {
  try {
    await conTransaccion(liberarApartadosVencidos);
    next();
  } catch (e) {
    next(e);
  }
});

async function contexto(c: PoolClient, id: string, u: any, version: unknown) {
  await c.query("SELECT pg_advisory_xact_lock(744220261107::bigint)");
  const e = (
    await c.query(
      'SELECT e.*,s.nombre estado FROM ticket_trade."Evento" e JOIN ticket_trade."EstadoEvento" s USING(id_estado_evento) WHERE id_evento=$1 FOR UPDATE OF e',
      [id],
    )
  ).rows[0];
  if (!e) fallo("Evento no disponible.", 404);
  if (
    e.id_cuenta_organizadora.toString() !== u.id &&
    !u.roles.includes("subdireccion")
  )
    fallo(
      "Solo el propietario o Subdirección pueden modificar este evento.",
      403,
    );
  if (typeof version !== "string" || version !== (await versionEvento(c, id)))
    fallo(
      "El evento cambió. Actualiza la pantalla y revisa los datos antes de confirmar.",
      409,
    );
  if (e.estado === "Cancelado") fallo("El evento ya está cancelado.", 409);
  const a = (
    await c.query(
      `SELECT a.*,id_actividad::text id,to_char(fecha,'YYYY-MM-DD') dia,to_char(hora_inicio,'HH24:MI') inicio,to_char(hora_fin,'HH24:MI') fin,s.nombre estado FROM ticket_trade."Actividad" a JOIN ticket_trade."EstadoActividad" s USING(id_estado_actividad) WHERE id_evento=$1 ORDER BY id_actividad`,
      [id],
    )
  ).rows;
  return { e, a };
}
async function comprobarBloqueo(
  c: PoolClient,
  recinto: string,
  fecha: string,
  inicio: string,
  fin: string,
) {
  const r = await c.query(
    `SELECT 1 FROM ticket_trade."BloqueoRecinto" WHERE id_recinto=$1 AND (finalizado_en IS NULL OR finalizado_en>inicio) AND inicio < ($2::date+$4::time) AT TIME ZONE 'America/Mexico_City' AND coalesce(finalizado_en,'infinity'::timestamptz)>($2::date+$3::time) AT TIME ZONE 'America/Mexico_City' LIMIT 1`,
    [recinto, fecha, inicio, fin],
  );
  if (r.rowCount)
    fallo("El recinto tiene un bloqueo vigente en ese horario.", 409);
}
async function proteger(c: PoolClient, ids: string[]) {
  const r = await c.query(
    `SELECT 1 FROM ticket_trade."Actividad" a WHERE id_actividad=ANY($1::bigint[]) AND ((fecha+hora_inicio) AT TIME ZONE 'America/Mexico_City'<=now() OR EXISTS(SELECT 1 FROM ticket_trade."CompromisoCupo" cp JOIN ticket_trade."Reservacion" r USING(id_compromiso_cupo) JOIN ticket_trade."EntradaOrdinaria" en USING(id_reservacion) WHERE cp.id_actividad=a.id_actividad) OR EXISTS(SELECT 1 FROM ticket_trade."CompromisoCupo" cp JOIN ticket_trade."BoletoEspecial" b USING(id_compromiso_cupo) JOIN ticket_trade."EntradaEspecial" en USING(id_boleto_especial) WHERE cp.id_actividad=a.id_actividad)) LIMIT 1`,
    [ids],
  );
  if (r.rowCount)
    fallo(
      "No se pueden modificar actividades iniciadas o con entradas registradas.",
      409,
    );
}
async function audiencia(c: PoolClient, ids: string[]) {
  return (
    await c.query(
      `SELECT DISTINCT b.id_cuenta::text id FROM ticket_trade."BoletoEvento" b JOIN ticket_trade."Reservacion" r USING(id_boleto_evento) JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion) JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) WHERE cp.id_actividad=ANY($1::bigint[]) AND er.nombre='Confirmada'`,
      [ids],
    )
  ).rows;
}
async function registrar(
  c: PoolClient,
  e: any,
  u: any,
  motivo: string,
  operacion: string,
  antes: any,
  despues: any,
  personas: any[],
) {
  const detalle = {
    fecha: new Date().toISOString(),
    responsable: u.nombre || "Usuario autorizado",
    motivo,
    campos: [operacion],
    detalleAnterior: JSON.stringify(antes),
    detalleNuevo: JSON.stringify(despues),
    valoresAnteriores: {
      titulo: e.titulo,
      descripcion: e.descripcion,
      ponentes: [],
    },
    valoresNuevos: {
      titulo: despues.titulo || e.titulo,
      descripcion: despues.descripcion || e.descripcion,
      ponentes: [],
    },
  };
  const r = await c.query(
    `INSERT INTO ticket_trade."Notificacion"(id_cuenta_destinataria,tipo,titulo,mensaje,creada_en,referencia_destino) VALUES($1,'evento_operacion',$2,$3,now(),$4) RETURNING id_notificacion::text id`,
    [
      e.id_cuenta_organizadora,
      operacion,
      JSON.stringify(detalle),
      String(e.id_evento),
    ],
  );
  for (const p of personas)
    await encolarAviso(
      c,
      p.id,
      `evento:${e.id_evento}:operacion:${r.rows[0].id}:${p.id}`,
      operacion,
      `${e.titulo}. ${motivo}`,
      "/mis-reservaciones",
    );
}
routerEventos.post(
  "/eventos/:id/cancelacion",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id),
      b = req.body || {},
      u = res.locals.usuario;
    const motivo = texto(b.motivo, "el motivo", 2000);
    await conTransaccion(async (c) => {
      const { e, a } = await contexto(c, id, u, b.version);
      const objetivo = b.idActividad
        ? [idEntero(b.idActividad)]
        : a.filter((x) => x.estado !== "Cancelada").map((x) => x.id);
      if (
        !objetivo.length ||
        objetivo.some(
          (x) => !a.some((y) => y.id === x && y.estado !== "Cancelada"),
        )
      )
        fallo("Actividad no disponible.", 409);
      await proteger(c, objetivo);
      const personas = await audiencia(c, objetivo);
      const historial = (
        await c.query(
          'SELECT 1 FROM ticket_trade."CompromisoCupo" WHERE id_actividad=ANY($1::bigint[]) LIMIT 1',
          [objetivo],
        )
      ).rowCount;
      if (b.retirar) {
        if (!b.idActividad || a.length <= 1 || historial)
          fallo(
            "Solo se puede retirar una actividad sin compromisos ni historial, conservando al menos otra actividad.",
            409,
          );
        await c.query(
          'DELETE FROM ticket_trade."LugarActividad" WHERE id_actividad=ANY($1::bigint[])',
          [objetivo],
        );
        await c.query(
          'DELETE FROM ticket_trade."Actividad" WHERE id_actividad=ANY($1::bigint[])',
          [objetivo],
        );
        await c.query(
          'DELETE FROM ticket_trade."ItinerarioDia" i WHERE id_evento=$1 AND NOT EXISTS(SELECT 1 FROM ticket_trade."Actividad" a WHERE a.id_evento=i.id_evento AND a.fecha=i.fecha)',
          [id],
        );
      } else {
        await c.query(
          `UPDATE ticket_trade."Apartado" ap SET id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Liberado') FROM ticket_trade."CompromisoCupo" cp WHERE cp.id_compromiso_cupo=ap.id_compromiso_cupo AND cp.id_actividad=ANY($1::bigint[]) AND ap.id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vigente')`,
          [objetivo],
        );
        await c.query(
          `UPDATE ticket_trade."Reservacion" r SET id_estado_reservacion=(SELECT id_estado_reservacion FROM ticket_trade."EstadoReservacion" WHERE nombre='Cancelada'),cancelada_en=clock_timestamp(),id_causa_cancelacion_reservacion=(SELECT id_causa_cancelacion_reservacion FROM ticket_trade."CausaCancelacionReservacion" WHERE nombre=$2) FROM ticket_trade."CompromisoCupo" cp WHERE cp.id_compromiso_cupo=r.id_compromiso_cupo AND cp.id_actividad=ANY($1::bigint[]) AND r.cancelada_en IS NULL`,
          [
            objetivo,
            b.idActividad
              ? "Cancelación de la actividad"
              : "Cancelación del evento",
          ],
        );
        await c.query(
          `UPDATE ticket_trade."BoletoEspecial" b SET invalidado_en=clock_timestamp(),motivo_invalidacion=$2 FROM ticket_trade."CompromisoCupo" cp WHERE cp.id_compromiso_cupo=b.id_compromiso_cupo AND cp.id_actividad=ANY($1::bigint[]) AND b.invalidado_en IS NULL`,
          [objetivo, motivo],
        );
        await c.query(
          `UPDATE ticket_trade."CompromisoCupo" SET id_estado_compromiso_cupo=(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Liberado') WHERE id_actividad=ANY($1::bigint[])`,
          [objetivo],
        );
        await c.query(
          `UPDATE ticket_trade."Actividad" SET id_estado_actividad=(SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Cancelada') WHERE id_actividad=ANY($1::bigint[])`,
          [objetivo],
        );
        await c.query(
          `UPDATE ticket_trade."Evento" SET id_estado_evento=(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Cancelado') WHERE id_evento=$1 AND NOT EXISTS(SELECT 1 FROM ticket_trade."Actividad" a JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) WHERE a.id_evento=$1 AND ea.nombre<>'Cancelada')`,
          [id],
        );
      }
      await registrar(
        c,
        e,
        u,
        motivo,
        b.retirar ? "Actividad retirada" : "Cancelación de actividad o evento",
        objetivo,
        { actividades: objetivo },
        personas,
      );
    });
    res.json({ datos: { exito: true } });
  }),
);
routerEventos.patch(
  "/eventos/:id",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id),
      b = req.body || {},
      u = res.locals.usuario,
      p = b.parcial || {};
    const motivo = texto(b.motivo, "el motivo", 2000);
    await conTransaccion(async (c) => {
      const { e, a } = await contexto(c, id, u, b.version);
      const ids = a.map((x) => x.id);
      if (
        p.titulo !== undefined ||
        p.descripcion !== undefined ||
        p.idArchivoCartel !== undefined
      )
        await proteger(c, ids);
      if (p.idArchivoCartel === null)
        fallo(
          "El evento aprobado debe conservar un cartel. Selecciona su reemplazo antes de guardar.",
        );
      if (p.ponentes?.length)
        fallo("Incluye los ponentes en el itinerario adjunto del día.");
      if (
        p.idArchivoCartel !== undefined &&
        String(p.idArchivoCartel) !== String(e.id_archivo_cartel)
      )
        await comprobarArchivo(c, p.idArchivoCartel, u.id, [
          "image/jpeg",
          "image/png",
        ]);
      const titulo =
          p.titulo === undefined ? e.titulo : texto(p.titulo, "el título", 300),
        descripcion =
          p.descripcion === undefined
            ? e.descripcion
            : texto(p.descripcion, "la descripción", 12000);
      const personas = await audiencia(c, ids);
      if (p.fechas) {
        if (
          !Array.isArray(p.fechas) ||
          p.fechas.length !== a.length ||
          new Set(p.fechas.map((x: any) => x.id)).size !== a.length
        )
          fallo(
            "Conserva las actividades existentes; usa alta o retiro para cambiar su número.",
          );
        for (const n of p.fechas) {
          const old = a.find((x) => x.id === n.id);
          if (!old) fallo("Actividad ajena al evento.");
          const cambio =
            old.dia !== n.fecha ||
            old.inicio !== n.horaInicio ||
            old.fin !== n.horaFin ||
            String(old.id_recinto) !== n.idRecinto ||
            (old.estado === "Suspendida" && n.suspendida === false) ||
            old.nombre !== n.nombreActividad ||
            old.descripcion !== n.descripcionActividad;
          if (!cambio) continue;
          if (old.estado === "Cancelada")
            fallo("Conserva las actividades canceladas.", 409);
          await proteger(c, [old.id]);
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(n.fecha) ||
            !/^\d{2}:\d{2}$/.test(n.horaInicio) ||
            !/^\d{2}:\d{2}$/.test(n.horaFin) ||
            n.horaInicio < "07:00" ||
            n.horaFin > "21:00" ||
            n.horaInicio >= n.horaFin ||
            new Date(n.fecha + "T" + n.horaInicio + ":00-06:00").getTime() <=
              Date.now()
          )
            fallo("Revisa la fecha futura y el horario de 07:00 a 21:00.");
          if (
            n.asistenciaEstimada !== old.aforo_solicitado ||
            n.idRecinto !== String(old.id_recinto)
          )
            fallo(
              "Para cambiar recinto o aforo utiliza la revisión de correspondencias.",
            );
          if (
            old.dia !== n.fecha &&
            new Date(n.fecha + "T" + n.horaInicio + ":00-06:00").getTime() -
              Date.now() <
              168 * 3600000 &&
            (!u.roles.includes("subdireccion") ||
              !p.historialExcepcionesAnticipacion?.some(
                (h: any) => h.idFechaEvento === old.id && h.motivo?.trim(),
              ))
          )
            fallo(
              "La reprogramación urgente requiere Subdirección y una justificación.",
              403,
            );
          await comprobarBloqueo(
            c,
            n.idRecinto,
            n.fecha,
            n.horaInicio,
            n.horaFin,
          );
          const nombre = texto(
            n.nombreActividad,
            "el nombre de la actividad",
            300,
          );
          await c.query(
            `UPDATE ticket_trade."Actividad" SET nombre=$2,descripcion=$3,fecha=$4,hora_inicio=$5,hora_fin=$6,id_estado_actividad=CASE WHEN $7::boolean THEN (SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Programada') ELSE id_estado_actividad END WHERE id_actividad=$1`,
            [
              old.id,
              nombre,
              typeof n.descripcionActividad === "string"
                ? n.descripcionActividad.trim()
                : old.descripcion,
              n.fecha,
              n.horaInicio,
              n.horaFin,
              old.estado === "Suspendida" && n.suspendida === false,
            ],
          );
          if (old.estado === "Suspendida" && n.suspendida === false)
            await c.query(
              'DELETE FROM ticket_trade."AfectacionActividad" WHERE id_actividad=$1',
              [old.id],
            );
          if (old.dia !== n.fecha) {
            const restantes = a.filter(
              (x) =>
                x.id !== old.id &&
                p.fechas.find((f: any) => f.id === x.id)?.fecha === old.dia,
            );
            if (!restantes.length) {
              const destino = await c.query(
                'SELECT 1 FROM ticket_trade."ItinerarioDia" WHERE id_evento=$1 AND fecha=$2',
                [id, n.fecha],
              );
              if (destino.rowCount)
                fallo(
                  "El nuevo día ya tiene itinerario; elige cuál conservar antes de moverlo.",
                  409,
                );
              await c.query(
                'UPDATE ticket_trade."ItinerarioDia" SET fecha=$3 WHERE id_evento=$1 AND fecha=$2',
                [id, old.dia, n.fecha],
              );
            }
          }
        }
      }
      if (p.itinerarios !== undefined) {
        if (
          !Array.isArray(p.itinerarios) ||
          new Set(p.itinerarios.map((i: any) => i.fecha)).size !==
            p.itinerarios.length
        )
          fallo("Solo se admite un itinerario por día.");
        for (const i of p.itinerarios) {
          const fecha = await c.query(
            'SELECT 1 FROM ticket_trade."Actividad" WHERE id_evento=$1 AND fecha=$2',
            [id, i.fecha],
          );
          if (!fecha.rowCount)
            fallo("Cada itinerario debe corresponder a un día del evento.");
          const propio = await c.query(
            'SELECT 1 FROM ticket_trade."ItinerarioDia" WHERE id_evento=$1 AND id_archivo=$2',
            [id, i.idArchivo],
          );
          if (!propio.rowCount)
            await comprobarArchivo(c, i.idArchivo, u.id, [
              "image/jpeg",
              "image/png",
            ]);
        }
        await c.query(
          'DELETE FROM ticket_trade."ItinerarioDia" WHERE id_evento=$1',
          [id],
        );
        for (const i of p.itinerarios)
          await c.query(
            'INSERT INTO ticket_trade."ItinerarioDia"(id_evento,fecha,id_archivo) VALUES($1,$2,$3)',
            [id, i.fecha, i.idArchivo],
          );
      }
      await c.query(
        'UPDATE ticket_trade."Evento" SET titulo=$2,descripcion=$3,id_archivo_cartel=$4 WHERE id_evento=$1',
        [
          id,
          titulo,
          descripcion,
          p.idArchivoCartel === undefined
            ? e.id_archivo_cartel
            : p.idArchivoCartel,
        ],
      );
      if ((await versionEvento(c, id)) === b.version)
        fallo("No hay cambios para guardar.");
      await registrar(
        c,
        e,
        u,
        motivo,
        "Evento actualizado",
        { titulo: e.titulo, descripcion: e.descripcion, actividades: a },
        { titulo, descripcion, actividades: p.fechas || a },
        personas,
      );
    });
    res.json({ datos: { exito: true } });
  }),
);
async function propuestaRecinto(c: PoolClient, id: string, u: any, b: any) {
  const { e, a } = await contexto(c, id, u, b.version);
  const p = b.peticion || b;
  const act = a.find((x) => x.id === p.idActividad);
  if (!act || act.estado === "Cancelada")
    fallo("Actividad no disponible.", 404);
  await proteger(c, [act.id]);
  if (p.idRecinto === String(act.id_recinto)) fallo("Elige otro recinto.");
  if (
    !Number.isInteger(p.aforo) ||
    p.aforo < 1 ||
    p.aforo > act.aforo_solicitado
  )
    fallo("Conserva o reduce el aforo aprobado.");
  const r = (
    await c.query(
      'SELECT r.*,t.nombre tipo FROM ticket_trade."Recinto" r JOIN ticket_trade."TipoRecinto" t USING(id_tipo_recinto) WHERE id_recinto=$1',
      [idEntero(p.idRecinto)],
    )
  ).rows[0];
  if (!r || r.aforo_maximo < p.aforo)
    fallo("El destino no tiene capacidad suficiente.", 409);
  const acceso = (
    await c.query(
      'SELECT nombre FROM ticket_trade."TipoAcceso" WHERE id_tipo_acceso=$1',
      [act.id_tipo_acceso],
    )
  ).rows[0].nombre;
  if (acceso === "Entrada libre" && r.tipo === "Laboratorio")
    fallo("Un laboratorio no admite entrada libre.");
  const conflicto = await c.query(
    `SELECT 1 FROM ticket_trade."Actividad" a JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento) JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) WHERE id_recinto=$1 AND fecha=$2 AND id_actividad<>$3 AND ea.nombre<>'Cancelada' AND ee.nombre='Publicado' AND hora_inicio<$5::time+interval '30 minutes' AND $4::time<hora_fin+interval '30 minutes' LIMIT 1`,
    [p.idRecinto, act.dia, act.id, act.inicio, act.fin],
  );
  if (conflicto.rowCount)
    fallo(
      "El recinto está ocupado en ese horario, incluyendo los 30 minutos de separación.",
      409,
    );
  const bloqueado = await c.query(
    `SELECT 1 FROM ticket_trade."BloqueoRecinto" WHERE id_recinto=$1 AND (finalizado_en IS NULL OR finalizado_en>inicio) AND inicio < ($2::date+$4::time) AT TIME ZONE 'America/Mexico_City' AND coalesce(finalizado_en,'infinity'::timestamptz) > ($2::date+$3::time) AT TIME ZONE 'America/Mexico_City' LIMIT 1`,
    [p.idRecinto, act.dia, act.inicio, act.fin],
  );
  if (bloqueado.rowCount)
    fallo("El recinto tiene un bloqueo vigente para ese horario.", 409);
  const cupos = (
    await c.query(
      `SELECT cp.id_compromiso_cupo::text id,aa.id_lugar_actividad::text origen,cl.nombre categoria,lr.codigo etiqueta FROM ticket_trade."CompromisoCupo" cp JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) LEFT JOIN ticket_trade."AsignacionAsiento" aa USING(id_compromiso_cupo) LEFT JOIN ticket_trade."LugarActividad" la USING(id_lugar_actividad) LEFT JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad) LEFT JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto) WHERE cp.id_actividad=$1 AND ec.nombre='Activo' ORDER BY cp.id_compromiso_cupo`,
      [act.id],
    )
  ).rows;
  if (cupos.length > p.aforo)
    fallo("La reducción dejaría compromisos vigentes sin cupo.", 409);
  const destinos = (
    await c.query(
      `SELECT lr.id_lugar_recinto::text id,lr.codigo etiqueta FROM ticket_trade."LugarRecinto" lr LEFT JOIN ticket_trade."EstacionComputo" pc USING(id_lugar_recinto) LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING(id_estado_funcionamiento) WHERE lr.id_recinto=$1 AND coalesce(ef.nombre,'')<>'Fuera de servicio' ORDER BY lr.fila,lr.posicion_x,lr.id_lugar_recinto`,
      [p.idRecinto],
    )
  ).rows;
  const controlado = acceso === "Reservación con lugar asignado";
  if (controlado && destinos.length < p.aforo)
    fallo("No hay suficientes lugares físicos habilitados.", 409);
  const asignados = cupos.filter((x) => x.origen);
  const corr = p.correspondencias;
  if (
    corr &&
    (!Array.isArray(corr) ||
      corr.length !== asignados.length ||
      new Set(corr.map((x: any) => x.origen)).size !== asignados.length ||
      new Set(corr.map((x: any) => x.destino)).size !== asignados.length)
  )
    fallo("Revisa la correspondencia completa y sin duplicados.");
  const lugares = asignados.map((x, i) => {
    const d = corr
      ? destinos.find(
          (d) => d.id === corr.find((y: any) => y.origen === x.origen)?.destino,
        )
      : destinos[i];
    if (!d) fallo("Destino inválido para un lugar comprometido.");
    return {
      origen: x.origen,
      destino: d.id,
      etiquetaAnterior: x.etiqueta,
      etiquetaNueva: d.etiqueta,
      categoria: (
        { Asistente: "asistente", VIP: "vip", Staff: "staff" } as any
      )[x.categoria],
      titulares: "Lugar comprometido",
    };
  });
  const origen = (
    await c.query(
      'SELECT nombre FROM ticket_trade."Recinto" WHERE id_recinto=$1',
      [act.id_recinto],
    )
  ).rows[0].nombre;
  return {
    e,
    act,
    cupos,
    controlado,
    destinos,
    propuesta: {
      peticion: {
        ...p,
        idEvento: id,
        correspondencias: lugares.map((x) => ({
          origen: x.origen,
          destino: x.destino,
        })),
      },
      firma: b.version,
      recintoAnterior: origen,
      recintoNuevo: r.nombre,
      aforoAnterior: act.aforo_solicitado,
      aforoNuevo: p.aforo,
      compromisos: cupos.length,
      reduccion: p.aforo < act.aforo_solicitado,
      lugares,
      destinos,
    },
  };
}
routerEventos.post(
  "/eventos/:id/recinto/revision",
  ruta(async (req, res) => {
    const propuesta = await conTransaccion(
      async (c) =>
        (
          await propuestaRecinto(
            c,
            idEntero(req.params.id),
            res.locals.usuario,
            req.body || {},
          )
        ).propuesta,
    );
    res.json({ datos: { exito: true, propuesta } });
  }),
);
routerEventos.post(
  "/eventos/:id/recinto",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id),
      b = req.body || {},
      u = res.locals.usuario;
    await conTransaccion(async (c) => {
      const { e, act, cupos, controlado, destinos, propuesta } =
        await propuestaRecinto(c, id, u, b);
      const motivo = texto(b.peticion?.motivo, "el motivo", 2000);
      if (propuesta.reduccion && b.aceptarReduccion !== true)
        fallo("Confirma expresamente la reducción de aforo.");
      const personas = await audiencia(c, [act.id]);
      if (controlado) {
        const categorias = (
          await c.query(
            `SELECT cl.nombre,count(*)::int n FROM ticket_trade."LugarActividad" la JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad) JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto) WHERE la.id_actividad=$1 AND lr.id_recinto=$2 AND cl.nombre IN ('VIP','Staff') GROUP BY cl.nombre`,
            [act.id, act.id_recinto],
          )
        ).rows;
        const categoriasDestino = new Map<string, string>();
        for (const l of propuesta.lugares)
          categoriasDestino.set(
            l.destino,
            ({ asistente: "Asistente", vip: "VIP", staff: "Staff" } as any)[
              l.categoria
            ],
          );
        for (const cat of categorias) {
          let n =
            cat.n -
            [...categoriasDestino.values()].filter((v) => v === cat.nombre)
              .length;
          for (const d of destinos)
            if (n > 0 && !categoriasDestino.has(d.id)) {
              categoriasDestino.set(d.id, cat.nombre);
              n--;
            }
          if (n > 0)
            fallo("El destino no conserva las plazas especiales.", 409);
        }
        const nuevos = new Map<string, string>();
        for (const d of destinos) {
          const r = await c.query(
            `INSERT INTO ticket_trade."LugarActividad"(id_actividad,id_lugar_recinto,id_categoria_lugar_actividad) VALUES($1,$2,(SELECT id_categoria_lugar_actividad FROM ticket_trade."CategoriaLugarActividad" WHERE nombre=$3)) ON CONFLICT(id_actividad,id_lugar_recinto) DO UPDATE SET id_categoria_lugar_actividad=excluded.id_categoria_lugar_actividad RETURNING id_lugar_actividad::text id`,
            [act.id, d.id, categoriasDestino.get(d.id) || "Asistente"],
          );
          nuevos.set(d.id, r.rows[0].id);
        }
        const asignaciones = (
          await c.query(
            'SELECT aa.id_compromiso_cupo::text id,aa.id_lugar_actividad::text origen FROM ticket_trade."AsignacionAsiento" aa JOIN ticket_trade."LugarActividad" la USING(id_lugar_actividad) JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto) WHERE la.id_actividad=$1 AND lr.id_recinto<>$2',
            [act.id, b.peticion.idRecinto],
          )
        ).rows;
        for (const cupo of asignaciones) {
          const l = propuesta.lugares.find((x) => x.origen === cupo.origen);
          const destino = l?.destino || destinos[0]?.id;
          if (!destino)
            fallo(
              "No hay destino para conservar el historial de lugares.",
              409,
            );
          await c.query(
            'UPDATE ticket_trade."AsignacionAsiento" SET id_lugar_actividad=$2 WHERE id_compromiso_cupo=$1',
            [cupo.id, nuevos.get(destino)],
          );
        }
      }
      await c.query(
        'UPDATE ticket_trade."Actividad" SET id_recinto=$2,aforo_solicitado=$3 WHERE id_actividad=$1',
        [act.id, b.peticion.idRecinto, b.peticion.aforo],
      );
      await c.query(
        'DELETE FROM ticket_trade."LugarActividad" l WHERE id_actividad=$1 AND NOT EXISTS(SELECT 1 FROM ticket_trade."AsignacionAsiento" a WHERE a.id_lugar_actividad=l.id_lugar_actividad) AND id_lugar_recinto IN (SELECT id_lugar_recinto FROM ticket_trade."LugarRecinto" WHERE id_recinto<>$2)',
        [act.id, b.peticion.idRecinto],
      );
      await registrar(
        c,
        e,
        u,
        motivo,
        "Cambio de recinto",
        act,
        propuesta,
        personas,
      );
    });
    res.json({ datos: { exito: true } });
  }),
);
routerEventos.post(
  "/eventos/:id/publicacion",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id);
    await conTransaccion(async (c) => {
      const { e, a } = await contexto(
        c,
        id,
        res.locals.usuario,
        req.body?.version,
      );
      await proteger(
        c,
        a.filter((x) => x.estado !== "Cancelada").map((x) => x.id),
      );
      if (!a.some((x) => x.estado !== "Cancelada"))
        fallo("El evento necesita una actividad vigente.");
      const permiso = await c.query(
        `SELECT 1 FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE id_evento=$1 AND es.nombre='Aprobada'`,
        [id],
      );
      if (
        !permiso.rowCount &&
        !res.locals.usuario.roles.includes("subdireccion")
      )
        fallo("La publicación requiere autorización de Subdirección.", 403);
      const incompleta = await c.query(
        `SELECT 1 FROM ticket_trade."Actividad" a JOIN ticket_trade."TipoAcceso" t USING(id_tipo_acceso) WHERE id_evento=$1 AND t.nombre='Reservación con lugar asignado' AND (SELECT count(*) FROM ticket_trade."LugarActividad" l JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad) JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto) LEFT JOIN ticket_trade."EstacionComputo" pc USING(id_lugar_recinto) LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING(id_estado_funcionamiento) WHERE l.id_actividad=a.id_actividad AND lr.id_recinto=a.id_recinto AND cl.nombre<>'Bloqueado' AND coalesce(ef.nombre,'')<>'Fuera de servicio')<a.aforo_solicitado`,
        [id],
      );
      if (incompleta.rowCount)
        fallo(
          "Completa la distribución y los lugares habilitados antes de publicar.",
          409,
        );
      await c.query(
        `UPDATE ticket_trade."Evento" SET id_estado_evento=(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Publicado'),publicado_en=coalesce(publicado_en,now()) WHERE id_evento=$1`,
        [id],
      );
    });
    res.json({ datos: { exito: true } });
  }),
);
routerEventos.post(
  "/eventos/:id/actividades",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id),
      b = req.body || {},
      u = res.locals.usuario,
      n = b.actividad || {};
    const motivo = texto(b.motivo, "el motivo", 2000);
    const resultado = await conTransaccion(async (c) => {
      const { e, a } = await contexto(c, id, u, b.version);
      // La autorización del evento no concede al cliente permiso para aumentar su programación sin revisión.
      if (!u.roles.includes("subdireccion"))
        fallo(
          "Subdirección debe autorizar el alta de una actividad en un evento aprobado.",
          403,
        );
      const nombre = texto(n.nombreActividad, "el nombre", 300),
        descripcion = texto(n.descripcionActividad, "la descripción", 12000);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(n.fecha) ||
        !/^\d{2}:\d{2}$/.test(n.horaInicio) ||
        !/^\d{2}:\d{2}$/.test(n.horaFin) ||
        n.horaInicio < "07:00" ||
        n.horaFin > "21:00" ||
        n.horaInicio >= n.horaFin ||
        new Date(n.fecha + "T" + n.horaInicio + ":00-06:00").getTime() <=
          Date.now() ||
        !Number.isInteger(n.asistenciaEstimada) ||
        n.asistenciaEstimada < 1
      )
        fallo("Revisa fecha futura, horario de 07:00 a 21:00 y aforo.");
      const accesos: { [k: string]: string } = {
        libre: "Entrada libre",
        registro: "Registro sin asiento asignado",
        controlado: "Reservación con lugar asignado",
      };
      if (!accesos[n.modalidadAsistencia])
        fallo("Selecciona un acceso válido.");
      await comprobarBloqueo(
        c,
        idEntero(n.idRecinto),
        n.fecha,
        n.horaInicio,
        n.horaFin,
      );
      const r = await c.query(
        `INSERT INTO ticket_trade."Actividad"(id_evento,nombre,descripcion,fecha,hora_inicio,hora_fin,id_recinto,id_tipo_acceso,aforo_solicitado,id_estado_actividad) VALUES($1,$2,$3,$4,$5,$6,$7,(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre=$8),$9,(SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Programada')) RETURNING id_actividad::text id`,
        [
          id,
          nombre,
          descripcion,
          n.fecha,
          n.horaInicio,
          n.horaFin,
          idEntero(n.idRecinto),
          accesos[n.modalidadAsistencia],
          n.asistenciaEstimada,
        ],
      );
      if (n.modalidadAsistencia === "controlado") {
        const lugares = await c.query(
          `INSERT INTO ticket_trade."LugarActividad"(id_actividad,id_lugar_recinto,id_categoria_lugar_actividad) SELECT $1,lr.id_lugar_recinto,(SELECT id_categoria_lugar_actividad FROM ticket_trade."CategoriaLugarActividad" WHERE nombre='Asistente') FROM ticket_trade."LugarRecinto" lr LEFT JOIN ticket_trade."EstacionComputo" pc USING(id_lugar_recinto) LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING(id_estado_funcionamiento) WHERE lr.id_recinto=$2 AND coalesce(ef.nombre,'')<>'Fuera de servicio'`,
          [r.rows[0].id, n.idRecinto],
        );
        if ((lugares.rowCount || 0) < n.asistenciaEstimada)
          fallo("El recinto no tiene suficientes lugares habilitados.", 409);
      }
      await registrar(
        c,
        e,
        u,
        motivo,
        "Actividad autorizada",
        a,
        { actividad: n },
        [],
      );
      return r.rows[0];
    });
    res.status(201).json({ datos: { exito: true, ...resultado } });
  }),
);
