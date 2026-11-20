import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { fallo, idEntero, texto } from '../../comun/http.js';
import { inicioEnMexico } from '../../../src/dominio/solicitudes.js';
import type { BloqueoRecinto } from '../../../src/tipos/index.js';

export const tiposBloqueo = ['Institucional', 'Mantenimiento', 'Fuera de servicio'] as const;
export function exigirPermisoBloqueo(u: any, tipo: string) {
  const rol = tipo === 'Institucional' ? 'subdireccion' : 'admin';
  if (!u?.roles?.includes(rol)) fallo(tipo === 'Institucional'
    ? 'Los bloqueos institucionales corresponden a Subdirección.'
    : 'El mantenimiento y fuera de servicio corresponden a Administración.', 403);
}

export async function leerBloqueos(c: PoolClient, u: any): Promise<BloqueoRecinto[]> {
  const gestion = u?.roles?.some((r: string) => ['admin', 'subdireccion'].includes(r));
  const filas = (await c.query(`SELECT b.*,b.id_bloqueo_recinto::text id,b.id_recinto::text recinto,t.nombre tipo,
    d.titulo,d.version,d.creado_en,d.cancelado_en,d.motivo_cancelacion,d.historial,
    concat_ws(' ',cu.nombres,cu.primer_apellido,nullif(cu.segundo_apellido,'')) responsable,
    to_char(b.inicio AT TIME ZONE 'America/Mexico_City','YYYY-MM-DD') dia_inicio,
    to_char(b.inicio AT TIME ZONE 'America/Mexico_City','HH24:MI') hora_inicio,
    to_char(b.fin_previsto AT TIME ZONE 'America/Mexico_City','YYYY-MM-DD') dia_fin,
    to_char(b.fin_previsto AT TIME ZONE 'America/Mexico_City','HH24:MI') hora_fin
    FROM ticket_trade."BloqueoRecinto" b JOIN ticket_trade."TipoBloqueoRecinto" t USING(id_tipo_bloqueo_recinto)
    JOIN ticket_trade."Cuenta" cu ON cu.id_cuenta=b.id_cuenta_responsable
    LEFT JOIN infra.bloqueo_detalle d USING(id_bloqueo_recinto) ORDER BY b.inicio DESC,b.id_bloqueo_recinto DESC`)).rows;
  return filas.map(b => ({
    id: b.id, idRecinto: b.recinto, tipo: b.tipo,
    titulo: gestion ? b.titulo || b.motivo : 'Recinto no disponible', motivo: gestion ? b.motivo : '',
    fechaInicio: b.dia_inicio, horaInicio: b.hora_inicio, fechaFin: b.dia_fin || undefined, horaFin: b.hora_fin || undefined,
    esIndefinido: !b.fin_previsto, requiereCierre: !b.finalizado_en,
    finPrevisto: b.fin_previsto ? new Date(b.fin_previsto).toISOString() : undefined,
    finalizadoEn: b.finalizado_en ? new Date(b.finalizado_en).toISOString() : undefined,
    estado: b.cancelado_en || b.finalizado_en && (new Date(b.finalizado_en).getTime() <= Date.now() || new Date(b.finalizado_en).getTime() <= new Date(b.inicio).getTime()) ? 'cancelado' : 'activo', version: b.version || 1,
    creadoPor: gestion ? b.responsable : '', fechaCreacion: b.creado_en ? new Date(b.creado_en).toISOString() : '',
    motivoCancelacion: gestion ? b.motivo_cancelacion || undefined : undefined,
    historial: gestion ? b.historial || [] : undefined,
  }));
}

async function propuesta(c: PoolClient, u: any, datos: any) {
  if (!datos || !tiposBloqueo.includes(datos.tipo)) fallo('Selecciona el tipo de bloqueo.');
  exigirPermisoBloqueo(u, datos.tipo);
  const titulo = texto(datos.titulo, 'el título', 200), motivo = texto(datos.motivo, 'el motivo', 2000);
  if (typeof datos.esIndefinido !== 'boolean') fallo('Indica si el bloqueo tiene un fin previsto.');
  const inicio = inicioEnMexico(datos.fechaInicio, datos.horaInicio);
  const fin = datos.esIndefinido ? null : inicioEnMexico(datos.fechaFin, datos.horaFin);
  if (!Number.isFinite(inicio) || inicio <= Date.now()) fallo('El bloqueo debe iniciar en una fecha y hora futuras.');
  if (fin !== null && (!Number.isFinite(fin) || fin <= inicio)) fallo('El fin previsto debe ser posterior al inicio.');
  const todos = (await c.query('SELECT id_recinto::text id FROM ticket_trade."Recinto" ORDER BY id_recinto')).rows.map(r => r.id);
  if (datos.idsRecintos !== undefined && (!Array.isArray(datos.idsRecintos) || datos.idsRecintos.length > 100)) fallo('Selecciona los recintos afectados.');
  const ids = datos.idRecinto === 'todos' ? todos : [...new Set<string>(datos.idsRecintos?.length ? datos.idsRecintos : [datos.idRecinto])].map(idEntero).sort();
  if (!ids.length || ids.some(id => !todos.includes(id))) fallo('Selecciona recintos existentes.');
  return { titulo, motivo, tipo: datos.tipo as typeof tiposBloqueo[number], ids,
    inicio: new Date(inicio).toISOString(), finPrevisto: fin === null ? null : new Date(fin).toISOString() };
}

export async function revisarBloqueoServidor(c: PoolClient, u: any, datos: any, id?: string) {
  const p = await propuesta(c, u, datos);
  const anterior = id ? (await leerBloqueos(c, u)).find(b => b.id === id) : undefined;
  if (id && !anterior) fallo('El bloqueo no existe.', 404);
  if (anterior) {
    exigirPermisoBloqueo(u, anterior.tipo!);
    if (anterior.estado === 'cancelado' || inicioEnMexico(anterior.fechaInicio, anterior.horaInicio) <= Date.now())
      fallo('El bloqueo cambió, fue cancelado o ya comenzó. Vuelve a consultarlo.', 409);
    if (anterior.finalizadoEn) fallo('El bloqueo ya tiene un cierre efectivo registrado; vuelve a consultarlo.', 409);
    if (p.ids.length !== 1) fallo('Modifica un recinto a la vez. Para varios recintos registra nuevos bloqueos.');
  }
  // fin_previsto es informativo: la liberación exige cierre efectivo, como en el modelo vigente.
  const cruces = await c.query(`SELECT b.id_bloqueo_recinto FROM ticket_trade."BloqueoRecinto" b
    WHERE b.id_recinto=ANY($1::bigint[]) AND ($2::bigint IS NULL OR b.id_bloqueo_recinto<>$2)
    AND coalesce(b.finalizado_en,'infinity'::timestamptz)>$3::timestamptz
    AND (b.finalizado_en IS NULL OR b.finalizado_en>b.inicio) LIMIT 1`, [p.ids, id || null, p.inicio]);
  if (cruces.rowCount) fallo('El periodo coincide con otro bloqueo sin cierre efectivo. Revisa la agenda.', 409);
  const actividades = (await c.query(`SELECT a.id_actividad::text id,a.id_evento::text evento,a.id_recinto::text recinto,
    a.nombre,e.titulo,concat_ws(' ',cu.nombres,cu.primer_apellido) organizador,
    to_char(a.fecha,'YYYY-MM-DD') fecha,to_char(a.hora_inicio,'HH24:MI') hora_inicio,to_char(a.hora_fin,'HH24:MI') hora_fin,
    ea.nombre estado,((a.fecha+a.hora_inicio) AT TIME ZONE 'America/Mexico_City'<=clock_timestamp()) iniciada,
    (EXISTS(SELECT 1 FROM ticket_trade."EntradaOrdinaria" en JOIN ticket_trade."Reservacion" r USING(id_reservacion)
      JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) WHERE cp.id_actividad=a.id_actividad)
     OR EXISTS(SELECT 1 FROM ticket_trade."EntradaEspecial" en JOIN ticket_trade."BoletoEspecial" be USING(id_boleto_especial)
      JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) WHERE cp.id_actividad=a.id_actividad)) entradas
    FROM ticket_trade."Actividad" a JOIN ticket_trade."Evento" e USING(id_evento)
    JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento) JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad)
    JOIN ticket_trade."Cuenta" cu ON cu.id_cuenta=e.id_cuenta_organizadora
    WHERE a.id_recinto=ANY($1::bigint[]) AND ea.nombre<>'Cancelada' AND ee.nombre<>'Cancelado'
    AND ((a.fecha+a.hora_fin) AT TIME ZONE 'America/Mexico_City')>$2::timestamptz
    AND (ee.nombre='Publicado' OR EXISTS(SELECT 1 FROM ticket_trade."SolicitudEvento" s
      JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE s.id_evento=e.id_evento AND es.nombre='Aprobada'))
    ORDER BY a.id_actividad`, [p.ids, p.inicio])).rows;
  if (actividades.some(a => a.iniciada || a.entradas)) fallo('No se pueden suspender actividades iniciadas o con entradas registradas.', 409);
  if (p.tipo === 'Mantenimiento' && actividades.length) fallo('El mantenimiento no puede desplazar actividades autorizadas. Elige otro periodo.', 409);
  const clases = (await c.query(`SELECT ai.id_actividad_interna::text id,ai.id_recinto::text recinto,
    to_char(ai.hora_inicio,'HH24:MI') inicio,to_char(ai.hora_fin,'HH24:MI') fin
    FROM ticket_trade."ActividadInterna" ai WHERE ai.id_recinto=ANY($1::bigint[])
    AND EXISTS(SELECT 1 FROM generate_series(greatest(ai.inicio_vigencia,($2::timestamptz AT TIME ZONE 'America/Mexico_City')::date)::timestamp,
      ai.fin_vigencia::timestamp,interval '1 day') dia
      JOIN ticket_trade."DiaActividadInterna" da ON da.id_actividad_interna=ai.id_actividad_interna AND da.dia_semana=extract(isodow FROM dia)
      WHERE NOT EXISTS(SELECT 1 FROM ticket_trade."DiaInhabil" dh WHERE dh.fecha=dia::date)
      AND ((dia::date+ai.hora_fin) AT TIME ZONE 'America/Mexico_City')>$2::timestamptz)
    ORDER BY ai.id_actividad_interna`, [p.ids, p.inicio])).rows;
  const afectados = actividades.map(a => ({ idEvento: a.evento, idFecha: a.id, titulo: a.titulo, organizador: a.organizador,
    dia: { id: a.id, idEvento: a.evento, idRecinto: a.recinto, fecha: a.fecha, horaInicio: a.hora_inicio, horaFin: a.hora_fin,
      nombreActividad: a.nombre, esFinalConfirmado: false, ponentes: [] } }));
  const firma = crypto.createHash('sha256').update(JSON.stringify([p, id, anterior?.version, actividades, clases])).digest('hex');
  return { p, afectados, firma, advertencias: clases.map(clase =>
    `Horario académico informativo de ${clase.inicio} a ${clase.fin}. Se conserva visible y no impide automáticamente el bloqueo.`) };
}

export async function guardarBloqueoServidor(c: PoolClient, u: any, datos: any, id?: string) {
  const revision = await revisarBloqueoServidor(c, u, datos.propuesta, id);
  if (!datos.firma || datos.firma !== revision.firma) fallo('Las afectaciones cambiaron. Revisa el resumen actualizado antes de confirmar.', 409);
  const { p, afectados } = revision;
  const anterior = id ? (await leerBloqueos(c, u)).find(b => b.id === id) : undefined;
  if (anterior && datos.version !== anterior.version) fallo('El bloqueo cambió en otra sesión. Vuelve a consultarlo.', 409);
  const idsGuardados: string[] = [];
  for (const recinto of p.ids) {
    let idBloqueo = id;
    if (id) {
      await c.query(`UPDATE ticket_trade."BloqueoRecinto" SET id_recinto=$2,
        id_tipo_bloqueo_recinto=(SELECT id_tipo_bloqueo_recinto FROM ticket_trade."TipoBloqueoRecinto" WHERE nombre=$3),
        inicio=$4,fin_previsto=$5,motivo=$6 WHERE id_bloqueo_recinto=$1`, [id, recinto, p.tipo, p.inicio, p.finPrevisto, p.motivo]);
    } else {
      idBloqueo = (await c.query(`INSERT INTO ticket_trade."BloqueoRecinto"(id_recinto,id_tipo_bloqueo_recinto,inicio,fin_previsto,motivo,id_cuenta_responsable)
        VALUES($1,(SELECT id_tipo_bloqueo_recinto FROM ticket_trade."TipoBloqueoRecinto" WHERE nombre=$2),$3,$4,$5,$6)
        RETURNING id_bloqueo_recinto::text id`, [recinto, p.tipo, p.inicio, p.finPrevisto, p.motivo, u.id])).rows[0].id;
    }
    const entrada = [{ fecha: new Date().toISOString(), responsable: u.nombre, accion: id ? 'Modificación' : 'Registro', motivo: p.motivo }];
    await c.query(`INSERT INTO infra.bloqueo_detalle(id_bloqueo_recinto,titulo,version,creado_en,historial) VALUES($1,$2,$3,CURRENT_TIMESTAMP,$4::jsonb)
      ON CONFLICT(id_bloqueo_recinto) DO UPDATE SET titulo=$2,version=infra.bloqueo_detalle.version+1,historial=infra.bloqueo_detalle.historial||$4::jsonb`,
      [idBloqueo, p.titulo, (anterior?.version || 0) + 1, JSON.stringify(entrada)]);
    for (const a of afectados.filter(a => a.dia.idRecinto === recinto)) {
      await c.query(`INSERT INTO ticket_trade."AfectacionActividad"(id_bloqueo_recinto,id_actividad) VALUES($1,$2)
        ON CONFLICT(id_bloqueo_recinto,id_actividad) DO UPDATE SET resuelta_en=NULL`, [idBloqueo, a.idFecha]);
      await c.query(`UPDATE ticket_trade."Actividad" SET id_estado_actividad=(SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Suspendida') WHERE id_actividad=$1`, [a.idFecha]);
      const temporales = (await c.query(`UPDATE ticket_trade."Apartado" ap SET id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Liberado')
        FROM ticket_trade."CompromisoCupo" cp WHERE cp.id_compromiso_cupo=ap.id_compromiso_cupo AND cp.id_actividad=$1
        AND ap.id_estado_apartado=(SELECT id_estado_apartado FROM ticket_trade."EstadoApartado" WHERE nombre='Vigente') RETURNING ap.id_compromiso_cupo`, [a.idFecha])).rows;
      if (temporales.length) await c.query(`UPDATE ticket_trade."CompromisoCupo" SET id_estado_compromiso_cupo=(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Liberado') WHERE id_compromiso_cupo=ANY($1::bigint[])`, [temporales.map(t => t.id_compromiso_cupo)]);
    }
    idsGuardados.push(idBloqueo!);
  }
  return { exito: true, id: idsGuardados[0], ids: idsGuardados, version: (anterior?.version || 0) + 1 };
}

export async function cancelarBloqueoServidor(c: PoolClient, u: any, id: string, datos: any) {
  const b = (await leerBloqueos(c, u)).find(b => b.id === id);
  if (!b) fallo('El bloqueo no existe.', 404);
  exigirPermisoBloqueo(u, b.tipo!);
  const motivo = texto(datos.motivo, 'el motivo de cancelación', 2000);
  if (b.estado === 'cancelado' || datos.version !== b.version) fallo('El bloqueo cambió o ya fue cancelado. Vuelve a consultarlo.', 409);
  // Antes de inicio, finalizado_en=inicio representa un intervalo vacío, no un periodo negativo.
  await c.query('UPDATE ticket_trade."BloqueoRecinto" SET finalizado_en=greatest(inicio,CURRENT_TIMESTAMP) WHERE id_bloqueo_recinto=$1', [id]);
  const historial = [{ fecha: new Date().toISOString(), responsable: u.nombre, accion: 'Cancelación', motivo }];
  await c.query(`INSERT INTO infra.bloqueo_detalle(id_bloqueo_recinto,titulo,version,creado_en,cancelado_en,motivo_cancelacion,historial)
    VALUES($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,$4,$5::jsonb) ON CONFLICT(id_bloqueo_recinto) DO UPDATE
    SET version=infra.bloqueo_detalle.version+1,cancelado_en=CURRENT_TIMESTAMP,motivo_cancelacion=$4,historial=infra.bloqueo_detalle.historial||$5::jsonb`,
    [id, b.titulo, b.version! + 1, motivo, JSON.stringify(historial)]);
  // AfectacionActividad y las suspensiones se conservan para la resolución del organizador.
  return { exito: true, version: b.version! + 1 };
}
