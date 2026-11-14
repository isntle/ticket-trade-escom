import type { PoolClient } from "pg";
import { fallo, idEntero } from "../../comun/http.js";
import { fechaRecintoValida, horarioRecintoValido, horaRecinto, franjasLibresRecinto, revisarFranjaRecinto, MARGEN_SEPARACION_RECINTOS } from "../../../src/dominio/disponibilidadRecintos.js";
import type { ActividadDisponibilidad, AgendaDisponibilidad, ContextoDisponibilidad, OcupacionDisponibilidad, RevisionDisponibilidad } from "../../../src/servicios/disponibilidadRecintos.js";

type Cliente = Pick<PoolClient, "query">;
interface Usuario { id: string; roles: string[] }
interface Exclusiones extends ContextoDisponibilidad { /** Solo la decide el servidor, nunca se copia del body. */ idEventoExcluir?: string }
const revisor = (u: Usuario) => u.roles.some((rol) => ["admin", "subdireccion"].includes(rol));

export function actividadesParaDisponibilidad(valor: unknown): ActividadDisponibilidad[] {
  if (!Array.isArray(valor) || !valor.length || valor.length > 100) fallo("Indica entre una y cien actividades para consultar.");
  return valor.map((a, indice) => {
    if (!a || !fechaRecintoValida(a.fecha) || !horarioRecintoValido(a.horaInicio, a.horaFin))
      fallo("Revisa la fecha y el horario de cada actividad; el término máximo es a las 21:00.");
    return { id: typeof a.id === "string" ? a.id.slice(0, 200) : String(indice), idRecinto: idEntero(a.idRecinto), fecha: a.fecha, horaInicio: a.horaInicio, horaFin: a.horaFin };
  });
}
async function exclusionesAutorizadas(c: Cliente, u: Usuario, contexto: Exclusiones) {
  const resultado = { evento: contexto.idEventoExcluir, actividad: contexto.idActividadExcluir };
  if (contexto.idSolicitud) {
    const r = await c.query(`SELECT e.id_evento::text evento,e.id_cuenta_organizadora::text titular FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."Evento" e USING(id_evento) WHERE s.id_solicitud_evento=$1`, [idEntero(contexto.idSolicitud)]);
    if (!r.rows[0] || (!revisor(u) && r.rows[0].titular !== u.id)) fallo("No puedes excluir esa solicitud de la consulta.", 403);
    resultado.evento = r.rows[0].evento;
  }
  if (resultado.evento) {
    const r = await c.query('SELECT id_cuenta_organizadora::text titular FROM ticket_trade."Evento" WHERE id_evento=$1', [idEntero(resultado.evento)]);
    if (!r.rows[0] || (!revisor(u) && r.rows[0].titular !== u.id)) fallo("No puedes excluir ese evento de la consulta.", 403);
  }
  if (resultado.actividad) {
    const r = await c.query(`SELECT e.id_cuenta_organizadora::text titular FROM ticket_trade."Actividad" a JOIN ticket_trade."Evento" e USING(id_evento) WHERE a.id_actividad=$1`, [idEntero(resultado.actividad)]);
    if (!r.rows[0] || (!revisor(u) && r.rows[0].titular !== u.id)) fallo("No puedes excluir esa actividad de la consulta.", 403);
  }
  return resultado;
}

/** Lector común para captura y para Luis. Recibe el cliente de la transacción vigente. */
export async function consultarAgendaRecintos(
  c: Cliente, u: Usuario, fecha: string, idRecinto?: string, contexto: Exclusiones = {},
): Promise<AgendaDisponibilidad> {
  if (!fechaRecintoValida(fecha)) fallo("Selecciona una fecha válida.");
  if (idRecinto) idEntero(idRecinto);
  const excluir = await exclusionesAutorizadas(c, u, contexto);
  const recintos = (await c.query(`SELECT id_recinto::text id,nombre FROM ticket_trade."Recinto" WHERE ($1::bigint IS NULL OR id_recinto=$1) ORDER BY id_recinto`, [idRecinto || null])).rows;
  if (idRecinto && !recintos.length) fallo("El recinto no está disponible.", 404);
  const ids = recintos.map((r) => r.id);
  const eventos = (await c.query(`SELECT a.id_actividad::text id,a.id_recinto::text recinto,to_char(a.hora_inicio,'HH24:MI') inicio,to_char(a.hora_fin,'HH24:MI') fin,
    e.titulo,a.nombre actividad,e.id_cuenta_organizadora::text titular,v.nombre visibilidad
    FROM ticket_trade."Actividad" a JOIN ticket_trade."Evento" e USING(id_evento)
    JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento) JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad)
    JOIN ticket_trade."VisibilidadEvento" v USING(id_visibilidad_evento)
    WHERE a.fecha=$1::date AND a.id_recinto=ANY($2::bigint[]) AND ea.nombre<>'Cancelada' AND ee.nombre<>'Cancelado'
    AND (ee.nombre='Publicado' OR EXISTS(SELECT 1 FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE s.id_evento=e.id_evento AND es.nombre='Aprobada'))
    AND ($3::bigint IS NULL OR a.id_evento<>$3) AND ($4::bigint IS NULL OR a.id_actividad<>$4) ORDER BY a.hora_inicio,a.id_actividad`, [fecha, ids, excluir.evento || null, excluir.actividad || null])).rows;
  const bloqueos = (await c.query(`SELECT b.id_bloqueo_recinto::text id,b.id_recinto::text recinto,b.inicio,b.finalizado_en fin,b.fin_previsto,b.motivo
    FROM ticket_trade."BloqueoRecinto" b WHERE b.id_recinto=ANY($2::bigint[])
    AND b.inicio<($1::date+interval '1 day') AT TIME ZONE 'America/Mexico_City'
    AND coalesce(b.finalizado_en,'infinity'::timestamptz)>($1::date::timestamp) AT TIME ZONE 'America/Mexico_City' ORDER BY b.inicio`, [fecha, ids])).rows;
  const clases = (await c.query(`SELECT a.id_actividad_interna::text id,a.id_recinto::text recinto,to_char(a.hora_inicio,'HH24:MI') inicio,to_char(a.hora_fin,'HH24:MI') fin
    FROM ticket_trade."ActividadInterna" a JOIN ticket_trade."DiaActividadInterna" d USING(id_actividad_interna)
    WHERE a.id_recinto=ANY($2::bigint[]) AND $1::date BETWEEN a.inicio_vigencia AND a.fin_vigencia
    AND d.dia_semana=EXTRACT(ISODOW FROM $1::date) AND NOT EXISTS(SELECT 1 FROM ticket_trade."DiaInhabil" i WHERE i.fecha=$1::date) ORDER BY a.hora_inicio`, [fecha, ids])).rows;
  const inicioDia = Date.parse(fecha + "T00:00:00-06:00");
  return {
    fecha, consultadoEn: new Date().toISOString(), zonaHoraria: "America/Mexico_City", margenSeparacionMinutos: MARGEN_SEPARACION_RECINTOS,
    recintos: recintos.map((r) => {
      const ocupaciones: OcupacionDisponibilidad[] = eventos.filter((e) => e.recinto === r.id).map((e) => ({
        id: "actividad-" + e.id, idRecinto: r.id, nombreRecinto: r.nombre, fecha, horaInicio: e.inicio, horaFin: e.fin,
        tipo: "evento", fuente: "evento", informativa: false,
        titulo: revisor(u) || e.titular === u.id || e.visibilidad === "Público" ? e.titulo : "Actividad autorizada",
        descripcion: revisor(u) || e.titular === u.id || e.visibilidad === "Público" ? e.actividad : undefined,
      }));
      for (const b of bloqueos.filter((b) => b.recinto === r.id)) {
        const inicio = Math.max(0, Math.floor((new Date(b.inicio).getTime() - inicioDia) / 60000));
        const fin = Math.min(1440, b.fin ? Math.ceil((new Date(b.fin).getTime() - inicioDia) / 60000) : 1440);
        if (inicio >= fin) continue;
        ocupaciones.push({ id: "bloqueo-" + b.id, idRecinto: r.id, nombreRecinto: r.nombre, fecha,
          horaInicio: horaRecinto(inicio), horaFin: horaRecinto(fin), tipo: "bloqueo", fuente: "bloqueo", informativa: false,
          titulo: "Bloqueo de recinto", descripcion: revisor(u) ? b.motivo : undefined,
          finPrevisto: b.fin_previsto ? new Date(b.fin_previsto).toISOString() : undefined });
      }
      ocupaciones.push(...clases.filter((a) => a.recinto === r.id).map((a): OcupacionDisponibilidad => ({
        id: "clase-" + a.id, idRecinto: r.id, nombreRecinto: r.nombre, fecha, horaInicio: a.inicio, horaFin: a.fin,
        tipo: "clase", fuente: "clase", informativa: true, titulo: "Horario académico informativo",
        descripcion: "Coincidencia informativa para la decisión de Subdirección.",
      })));
      ocupaciones.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio) || a.id.localeCompare(b.id));
      return { id: r.id, nombre: r.nombre, ocupaciones, franjasLibres: franjasLibresRecinto(ocupaciones, MARGEN_SEPARACION_RECINTOS) };
    }),
  };
}

export async function revisarDisponibilidadServidor(
  c: Cliente, u: Usuario, actividades: ActividadDisponibilidad[], contexto: Exclusiones = {},
): Promise<RevisionDisponibilidad> {
  actividades = actividadesParaDisponibilidad(actividades);
  const agendas = new Map<string, AgendaDisponibilidad>();
  for (const fecha of new Set(actividades.map((a) => a.fecha))) agendas.set(fecha, await consultarAgendaRecintos(c, u, fecha, undefined, contexto));
  const revisiones = actividades.map((a, indice) => {
    const recinto = agendas.get(a.fecha)!.recintos.find((r) => r.id === a.idRecinto);
    if (!recinto) fallo("Uno de los recintos seleccionados no existe.");
    const propias = actividades.flatMap((otra, i): OcupacionDisponibilidad[] => i === indice ? [] : [{
      ...otra, id: "propuesta-" + i, nombreRecinto: "", tipo: "evento", fuente: "propuesta", informativa: false, titulo: "Otra actividad de esta propuesta",
    }]);
    return revisarFranjaRecinto(a, [...recinto.ocupaciones, ...propias], MARGEN_SEPARACION_RECINTOS);
  });
  return { consultadoEn: new Date().toISOString(), margenSeparacionMinutos: MARGEN_SEPARACION_RECINTOS, actividades: revisiones };
}
export function exigirPropuestaSinCruces(revision: RevisionDisponibilidad, autorizar = false) {
  const choque = revision.actividades.find((a) => a.conflictos.some((c) => autorizar || c.fuente === "propuesta"));
  if (choque) fallo(autorizar ? "El recinto ya no está disponible para una de las actividades. Actualiza la agenda y revisa el horario." : "Hay actividades de la misma propuesta que coinciden en un recinto o no conservan los 30 minutos de separación.", autorizar ? 409 : 422);
}
export async function revisarEventoServidor(c: Cliente, u: Usuario, idEvento: string) {
  const filas = (await c.query(`SELECT id_actividad::text id,id_recinto::text "idRecinto",to_char(fecha,'YYYY-MM-DD') fecha,to_char(hora_inicio,'HH24:MI') "horaInicio",to_char(hora_fin,'HH24:MI') "horaFin" FROM ticket_trade."Actividad" a JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) WHERE id_evento=$1 AND ea.nombre<>'Cancelada' ORDER BY id_actividad`, [idEvento])).rows;
  return revisarDisponibilidadServidor(c, u, actividadesParaDisponibilidad(filas), { idEventoExcluir: idEvento });
}
