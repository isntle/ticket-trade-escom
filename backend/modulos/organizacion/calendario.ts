import type { PoolClient } from 'pg';
import { conTransaccion } from '../../bd/pool.js';
import { fallo } from '../../comun/http.js';
import { validarCalendario, vencimientoRevision, type CalendarioRevision } from '../../../src/dominio/calendarioRevision.js';

async function configuracionInstalada(c: PoolClient): Promise<boolean> {
  const { rows: [estado] } = await c.query<{ instalada: boolean }>(`
    SELECT to_regclass('infra.calendario_revision') IS NOT NULL
      AND to_regclass('infra.plazo_revision') IS NOT NULL
      AND to_regclass('infra.bloqueo_detalle') IS NOT NULL AS instalada
  `);
  return estado.instalada;
}

/** Extensiones de persistencia de la aplicación, sin alterar el modelo ER ni sus SQL. */
export async function prepararConfiguracion(c: PoolClient) {
  // También lo usan disponibilidad, solicitudes y operaciones sobre actividades.
  await c.query('SELECT pg_advisory_xact_lock(744220261107::bigint)');
  if (await configuracionInstalada(c)) return;
  await c.query(`CREATE SCHEMA IF NOT EXISTS infra;
    CREATE TABLE IF NOT EXISTS infra.calendario_revision (
      unico boolean PRIMARY KEY DEFAULT true CHECK (unico), dias_laborables integer[] NOT NULL,
      version integer NOT NULL CHECK (version>0), id_cuenta bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta),
      responsable text NOT NULL, actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS infra.plazo_revision (
      id_solicitud_evento bigint NOT NULL REFERENCES ticket_trade."SolicitudEvento"(id_solicitud_evento) ON DELETE CASCADE,
      inicio_revision timestamptz NOT NULL, limite_exclusivo timestamptz NOT NULL,
      PRIMARY KEY (id_solicitud_evento,inicio_revision)
    );
    CREATE TABLE IF NOT EXISTS infra.bloqueo_detalle (
      id_bloqueo_recinto bigint PRIMARY KEY REFERENCES ticket_trade."BloqueoRecinto"(id_bloqueo_recinto),
      titulo text NOT NULL, version integer NOT NULL CHECK (version>0), creado_en timestamptz NOT NULL,
      cancelado_en timestamptz, motivo_cancelacion text,
      historial jsonb NOT NULL DEFAULT '[]'::jsonb
    );`);
}

export async function leerCalendario(c: PoolClient): Promise<CalendarioRevision> {
  const actual = (await c.query('SELECT * FROM infra.calendario_revision WHERE unico')).rows[0];
  const dias = (await c.query('SELECT to_char(fecha,\'YYYY-MM-DD\') fecha FROM ticket_trade."DiaInhabil" ORDER BY fecha')).rows;
  return {
    diasLaborables: actual?.dias_laborables || [1, 2, 3, 4, 5],
    diasInhabiles: dias.map(d => d.fecha), version: actual?.version || 0,
    responsable: actual?.responsable || 'Calendario institucional de lunes a viernes',
    fechaConfiguracion: actual ? new Date(actual.actualizado_en).toISOString() : '',
  };
}

/** Cada ciclo conserva su propio límite. Editar en revisión no inicia otro ciclo. */
export async function conservarPlazos(c: PoolClient) {
  // Conservar la precisión de PostgreSQL: Date de JavaScript perdería los microsegundos del ciclo.
  const pendientes = (await c.query(`SELECT s.id_solicitud_evento::text id,s.inicio_revision::text inicio_revision
    FROM ticket_trade."SolicitudEvento" s
    WHERE s.inicio_revision IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM infra.plazo_revision p WHERE p.id_solicitud_evento=s.id_solicitud_evento AND p.inicio_revision=s.inicio_revision)
    ORDER BY s.id_solicitud_evento`)).rows;
  if (!pendientes.length) return;
  const calendario = await leerCalendario(c);
  for (const s of pendientes) {
    // La función compartida termina en 23:59:59; en PostgreSQL guardamos el límite exclusivo.
    const limite = new Date(Date.parse(vencimientoRevision(new Date(s.inicio_revision).toISOString(), calendario)) + 1000).toISOString();
    await c.query(`INSERT INTO infra.plazo_revision(id_solicitud_evento,inicio_revision,limite_exclusivo)
      VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [s.id, s.inicio_revision, limite]);
  }
}

export async function leerPlazos(c: PoolClient) {
  await conservarPlazos(c);
  const filas = (await c.query(`SELECT s.id_solicitud_evento::text id,p.limite_exclusivo,
    CASE WHEN es.nombre='Requiere corrección' THEN (SELECT max(r.resuelta_en)+interval '24 hours'
      FROM ticket_trade."ResolucionSolicitud" r JOIN ticket_trade."DecisionSolicitud" d USING(id_decision_solicitud)
      WHERE r.id_solicitud_evento=s.id_solicitud_evento AND d.nombre='Devuelta' AND r.resuelta_en>=s.inicio_revision) END correccion
    FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento)
    LEFT JOIN infra.plazo_revision p ON p.id_solicitud_evento=s.id_solicitud_evento AND p.inicio_revision=s.inicio_revision`)).rows;
  return new Map(filas.map(f => [f.id, {
    fechaVencimientoRevision: f.limite_exclusivo ? new Date(f.limite_exclusivo).toISOString() : undefined,
    fechaLimiteCorreccion: f.correccion ? new Date(f.correccion).toISOString() : undefined,
  }]));
}

export function datosCalendario(datos: any): CalendarioRevision {
  if (!datos || !Array.isArray(datos.diasLaborables) || !Array.isArray(datos.diasInhabiles) ||
      datos.diasLaborables.length > 7 || datos.diasInhabiles.length > 1000 ||
      datos.diasInhabiles.some((d: unknown) => typeof d !== 'string')) fallo('Revisa los días laborables y las fechas inhábiles.');
  const error = validarCalendario(datos);
  if (error) fallo(error);
  return { diasLaborables: [...new Set<number>(datos.diasLaborables)].sort(),
    diasInhabiles: [...new Set<string>(datos.diasInhabiles)].sort(), responsable: '', fechaConfiguracion: '' };
}

export async function guardarCalendario(c: PoolClient, usuario: any, datos: any) {
  if (!usuario.roles.includes('admin')) fallo('Solo Administración configura el calendario hábil.', 403);
  const nuevo = datosCalendario(datos);
  if (!Number.isInteger(datos.version) || datos.version < 0) fallo('Vuelve a consultar la versión del calendario.');
  const actual = await leerCalendario(c);
  if (datos.version !== actual.version) fallo('El calendario cambió en otra sesión. Vuelve a consultarlo antes de guardar.', 409);
  // Se conservan ANTES de sustituir los inhábiles, dentro de la misma transacción.
  await conservarPlazos(c);
  await c.query('DELETE FROM ticket_trade."DiaInhabil" WHERE NOT (fecha=ANY($1::date[]))', [nuevo.diasInhabiles]);
  await c.query(`INSERT INTO ticket_trade."DiaInhabil"(fecha,motivo)
    SELECT unnest($1::date[]),'Calendario hábil configurado por Administración' ON CONFLICT DO NOTHING`, [nuevo.diasInhabiles]);
  await c.query(`INSERT INTO infra.calendario_revision(unico,dias_laborables,version,id_cuenta,responsable)
    VALUES(true,$1,1,$2,$3) ON CONFLICT(unico) DO UPDATE SET dias_laborables=$1,
    version=infra.calendario_revision.version+1,id_cuenta=$2,responsable=$3,actualizado_en=CURRENT_TIMESTAMP`,
    [nuevo.diasLaborables, usuario.id, usuario.nombre]);
  return { exito: true, calendario: await leerCalendario(c) };
}

export const conConfiguracion = <T>(accion: (c: PoolClient) => Promise<T>, soloLectura = false) =>
  conTransaccion(async c => {
    if (!soloLectura || !(await configuracionInstalada(c))) await prepararConfiguracion(c);
    return accion(c);
  });
