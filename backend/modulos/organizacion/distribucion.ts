import { createHash } from "node:crypto";
import { Router } from "express";
import type { PoolClient } from "pg";
import { liberarApartadosVencidos } from "../../bd/apartados.js";
import { conTransaccion, pool } from "../../bd/pool.js";
import { fallo, idEntero, ruta } from "../../comun/http.js";

export const routerDistribucion = Router();

const categorias = {
  asistente: "Asistente",
  vip: "VIP",
  staff: "Staff",
  bloqueado: "Bloqueado",
} as const;
type Categoria = keyof typeof categorias;
type Lugar = {
  idLugarRecinto: string;
  idLugarActividad: string | null;
  codigo: string;
  fila: string | null;
  x: number;
  y: number;
  categoria: Categoria;
  fueraDeServicio: boolean;
  ocupado: boolean;
};
type Distribucion = {
  idActividad: string;
  idRecinto: string;
  aforo: number;
  aforoRecinto: number;
  estadoEvento: string;
  editable: boolean;
  lugares: Lugar[];
};

async function leer(
  c: Pick<PoolClient, "query">,
  idEvento: string,
  idActividad: string,
  u: { id: string; roles: string[] },
) {
  const { rows: [datos] } = await c.query<Distribucion & { autorizado: boolean }>(
    `SELECT a.id_actividad::text "idActividad", a.id_recinto::text "idRecinto",
       a.aforo_solicitado aforo, r.aforo_maximo "aforoRecinto", ee.nombre "estadoEvento",
       (e.id_cuenta_organizadora::text = $3 OR $4::boolean) autorizado,
       (ee.nombre <> 'Cancelado' AND ea.nombre = 'Programada'
         AND (a.fecha + a.hora_inicio) AT TIME ZONE 'America/Mexico_City' > statement_timestamp()
         AND NOT EXISTS (SELECT 1 FROM ticket_trade."AfectacionActividad" af
                         WHERE af.id_actividad = a.id_actividad AND af.resuelta_en IS NULL)) editable,
       coalesce((
         SELECT jsonb_agg(jsonb_build_object(
           'idLugarRecinto', lr.id_lugar_recinto::text,
           'idLugarActividad', la.id_lugar_actividad::text,
           'codigo', lr.codigo, 'fila', lr.fila, 'x', lr.posicion_x, 'y', lr.posicion_y,
           'categoria', lower(coalesce(cl.nombre, 'Asistente')),
           'fueraDeServicio', coalesce(ef.nombre = 'Fuera de servicio', false),
           'ocupado', EXISTS (
             SELECT 1 FROM ticket_trade."AsignacionAsiento" s
             JOIN ticket_trade."CompromisoCupo" cp USING (id_compromiso_cupo)
             JOIN ticket_trade."EstadoCompromisoCupo" ec USING (id_estado_compromiso_cupo)
             LEFT JOIN ticket_trade."Apartado" ap USING (id_compromiso_cupo)
             LEFT JOIN ticket_trade."EstadoApartado" ea USING (id_estado_apartado)
             WHERE s.id_lugar_actividad = la.id_lugar_actividad AND ec.nombre = 'Activo'
               AND (ap.id_compromiso_cupo IS NULL OR ea.nombre = 'Convertido en reservación'
                 OR (ea.nombre = 'Vigente' AND ap.creado_en + interval '2 minutes' > statement_timestamp()))
           )) ORDER BY lr.fila, lr.posicion_x, lr.id_lugar_recinto)
         FROM ticket_trade."LugarRecinto" lr
         LEFT JOIN ticket_trade."LugarActividad" la
           ON la.id_lugar_recinto = lr.id_lugar_recinto AND la.id_actividad = a.id_actividad
         LEFT JOIN ticket_trade."CategoriaLugarActividad" cl USING (id_categoria_lugar_actividad)
         LEFT JOIN ticket_trade."EstacionComputo" pc ON pc.id_lugar_recinto = lr.id_lugar_recinto
         LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING (id_estado_funcionamiento)
         WHERE lr.id_recinto = a.id_recinto
       ), '[]'::jsonb) lugares
     FROM ticket_trade."Actividad" a
     JOIN ticket_trade."Evento" e USING (id_evento)
     JOIN ticket_trade."Recinto" r USING (id_recinto)
     JOIN ticket_trade."EstadoEvento" ee USING (id_estado_evento)
     JOIN ticket_trade."EstadoActividad" ea USING (id_estado_actividad)
     JOIN ticket_trade."TipoAcceso" ta USING (id_tipo_acceso)
     WHERE a.id_actividad = $1 AND a.id_evento = $2
       AND ta.nombre = 'Reservación con lugar asignado'`,
    [idActividad, idEvento, u.id, u.roles.includes("subdireccion")],
  );
  if (!datos) fallo("No hay distribución con lugares asignados para esta actividad.", 404);
  const { autorizado, ...distribucion } = datos;
  if (!autorizado) fallo("Solo el organizador responsable o Subdirección pueden administrar esta distribución.", 403);

  const version = createHash("sha256").update(JSON.stringify({
    ...distribucion,
    lugares: distribucion.lugares.map(({ ocupado, ...lugar }) => lugar),
  })).digest("hex");
  return { ...distribucion, version };
}

const camino = "/eventos/:idEvento/actividades/:idActividad/distribucion";

routerDistribucion.get(camino, ruta(async (req, res) => {
  const datos = await leer(pool, idEntero(req.params.idEvento), idEntero(req.params.idActividad), res.locals.usuario);
  res.set("Cache-Control", "no-store").json({ datos });
}));

routerDistribucion.patch(camino, ruta(async (req, res) => {
  const idEvento = idEntero(req.params.idEvento);
  const idActividad = idEntero(req.params.idActividad);
  const { version, cambios } = req.body ?? {};
  if (typeof version !== "string" || !/^[a-f0-9]{64}$/.test(version))
    fallo("Envía la versión de la distribución que tienes abierta.");
  if (!Array.isArray(cambios) || !cambios.length || cambios.length > 2000)
    fallo("Envía entre 1 y 2000 cambios de lugar.");

  const peticion = new Map<string, Categoria>();
  for (const cambio of cambios) {
    const id = idEntero(cambio?.idLugarRecinto);
    const categoria = cambio?.categoria;
    if (typeof categoria !== "string" || !Object.hasOwn(categorias, categoria))
      fallo("Selecciona una categoría de lugar válida.");
    if (peticion.has(id)) fallo("Un lugar aparece más de una vez.");
    peticion.set(id, categoria as Categoria);
  }

  const datos = await conTransaccion(async (c) => {
    // Mismo bloqueo que taquilla, reubicaciones y emisión de boletos especiales.
    await liberarApartadosVencidos(c);
    const actual = await leer(c, idEvento, idActividad, res.locals.usuario);
    if (!actual.editable) fallo("Ya no se puede editar esta distribución.", 409);
    if (version !== actual.version)
      fallo("La distribución cambió. Actualízala antes de guardar.", 409);
    if (actual.aforo > actual.aforoRecinto)
      fallo("El aforo de la actividad supera el del recinto.", 409);

    const porLugar = new Map(actual.lugares.map((lugar) => [lugar.idLugarRecinto, lugar]));
    const ids: string[] = [];
    const nombres: string[] = [];
    for (const [id, categoria] of peticion) {
      const lugar = porLugar.get(id);
      if (!lugar) fallo("Uno de los lugares no pertenece al recinto de la actividad.");
      if (lugar.idLugarActividad && lugar.categoria === categoria) continue;
      if (lugar.ocupado)
        fallo(`El lugar ${lugar.codigo} tiene un apartado vigente o un acceso confirmado.`, 409);
      if (lugar.fueraDeServicio && categoria !== "bloqueado")
        fallo(`El lugar ${lugar.codigo} está fuera de servicio.`, 409);
      ids.push(id);
      nombres.push(categorias[categoria]);
    }

    const habilitados = (despues: boolean) => actual.lugares.filter((lugar) => {
      if (lugar.fueraDeServicio) return false;
      const propuesta = despues ? peticion.get(lugar.idLugarRecinto) : undefined;
      if (!lugar.idLugarActividad && propuesta === undefined && actual.estadoEvento === "Publicado") return false;
      return (propuesta ?? lugar.categoria) !== "bloqueado";
    }).length;
    // Un mapa anterior incompleto se puede corregir por partes, sin reducir su capacidad.
    if (habilitados(true) < Math.min(actual.aforo, habilitados(false)))
      fallo("La distribución dejaría menos lugares habilitados que el aforo de la actividad.", 409);

    if (!ids.length) return actual;
    await c.query(
      `INSERT INTO ticket_trade."LugarActividad"(id_actividad, id_lugar_recinto, id_categoria_lugar_actividad)
       SELECT $1, cambio.id, cat.id_categoria_lugar_actividad
       FROM unnest($2::bigint[], $3::text[]) cambio(id, nombre)
       JOIN ticket_trade."CategoriaLugarActividad" cat USING (nombre)
       ON CONFLICT (id_actividad, id_lugar_recinto) DO UPDATE
       SET id_categoria_lugar_actividad = excluded.id_categoria_lugar_actividad`,
      [idActividad, ids, nombres],
    );
    return leer(c, idEvento, idActividad, res.locals.usuario);
  });
  res.set("Cache-Control", "no-store").json({ datos });
}));
