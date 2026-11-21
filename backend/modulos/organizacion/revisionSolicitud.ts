import type { PoolClient } from 'pg';
import { fallo } from '../../comun/http.js';
import { consultarAgendaRecintos } from './disponibilidad.js';
import { alternativasDisponibilidad } from '../../../src/dominio/alternativasDisponibilidad.js';
import { revisarFranjaRecinto, MARGEN_SEPARACION_RECINTOS } from '../../../src/dominio/disponibilidadRecintos.js';
import type { ActividadDisponibilidad, OcupacionDisponibilidad, RevisionDisponibilidadSolicitud } from '../../../src/servicios/disponibilidadRecintos.js';

/** Se revisa el expediente persistido bajo el mismo bloqueo transaccional que dictamen/bloqueos. */
export async function revisarSolicitudServidor(c: PoolClient, u: {id: string; roles: string[]}, id: string): Promise<RevisionDisponibilidadSolicitud> {
  const s = (await c.query(`SELECT s.id_evento::text evento,s.version_edicion version,e.id_cuenta_organizadora::text titular
    FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."Evento" e USING(id_evento) WHERE s.id_solicitud_evento=$1`, [id])).rows[0];
  if (!s || (s.titular !== u.id && !u.roles.some(r => ['subdireccion', 'admin'].includes(r)))) fallo('Solicitud no disponible para esta cuenta.', 404);
  const actividades = (await c.query(`SELECT a.id_actividad::text id,a.id_recinto::text "idRecinto",a.nombre "nombreActividad",r.nombre "nombreRecinto",a.aforo_solicitado aforo,ta.nombre acceso,
    to_char(a.fecha,'YYYY-MM-DD') fecha,to_char(a.hora_inicio,'HH24:MI') "horaInicio",to_char(a.hora_fin,'HH24:MI') "horaFin"
    FROM ticket_trade."Actividad" a JOIN ticket_trade."Recinto" r USING(id_recinto) JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) JOIN ticket_trade."TipoAcceso" ta USING(id_tipo_acceso)
    WHERE a.id_evento=$1 AND ea.nombre<>'Cancelada' ORDER BY a.fecha,a.hora_inicio,a.id_actividad`, [s.evento])).rows;
  const recintos = (await c.query('SELECT r.id_recinto::text id,r.aforo_maximo capacidad,tr.nombre tipo FROM ticket_trade."Recinto" r JOIN ticket_trade."TipoRecinto" tr USING(id_tipo_recinto)')).rows;
  // La ausencia de auditoría en bloqueos antiguos no permite afirmar cuándo se registraron.
  const posteriores = new Set((await c.query(`SELECT 'bloqueo-'||d.id_bloqueo_recinto id FROM infra.bloqueo_detalle d, ticket_trade."SolicitudEvento" s
    WHERE s.id_solicitud_evento=$1 AND (d.creado_en>coalesce(s.inicio_revision,s.envio_inicial)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(d.historial) h WHERE (h->>'fecha')::timestamptz>coalesce(s.inicio_revision,s.envio_inicial)))`, [id])).rows.map(r => r.id));
  const revisiones: RevisionDisponibilidadSolicitud['actividades'] = [];
  for (const fecha of new Set<string>(actividades.map(a => a.fecha))) {
    const agenda = await consultarAgendaRecintos(c, u, fecha, undefined, { idEventoExcluir: s.evento });
    for (const a of actividades.filter(a => a.fecha === fecha)) {
      const recinto = agenda.recintos.find(r => r.id === a.idRecinto)!;
      const propias: OcupacionDisponibilidad[] = actividades.filter(o => o.id !== a.id).map((o: ActividadDisponibilidad) => ({
        ...o, tipo: 'evento', fuente: 'propuesta', informativa: false, nombreRecinto: '', titulo: 'Otra actividad de esta solicitud',
      }));
      const revision = revisarFranjaRecinto(a, [...recinto.ocupaciones, ...propias], agenda.margenSeparacionMinutos);
      revision.conflictos = revision.conflictos.map(o => ({...o, ...(posteriores.has(o.id) ? {posteriorAlEnvio: true} : {})}));
      const capacidades = new Map<string, number>(recintos.filter(r => a.acceso !== 'Entrada libre' || r.tipo !== 'Laboratorio').map(r => [r.id,r.capacidad]));
      revisiones.push({...revision, nombreActividad: a.nombreActividad, nombreRecinto: a.nombreRecinto,
        alternativas: revision.disponible ? [] : alternativasDisponibilidad(a, actividades, agenda, capacidades, a.aforo)});
    }
  }
  return {idSolicitud: id, versionSolicitud: s.version, consultadoEn: new Date().toISOString(), margenSeparacionMinutos: MARGEN_SEPARACION_RECINTOS, actividades: revisiones};
}
