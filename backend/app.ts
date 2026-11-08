import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pool } from './bd/pool';
import { routerAuth } from './modulos/identidad/auth';

dotenv.config();

export const app = express();

app.use(express.json());
app.use(cookieParser());

// Módulo de Autenticación e Identidad
app.use('/api/auth', routerAuth);

// Endpoint de comprobación de salud
app.get('/api/salud', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      datos: {
        estado: 'en_linea',
        mensaje: 'API de Ticket Trade conectada a PostgreSQL correctamente',
        fecha: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: {
        codigo: 'ERROR_BASE_DATOS',
        mensaje: 'No se pudo comunicar con PostgreSQL',
      },
    });
  }
});

// Endpoint para consultar recintos desde PostgreSQL (adaptado al frontend)
app.get('/api/recintos', async (_req: Request, res: Response) => {
  try {
    const consulta = `
      SELECT 
        r.id_recinto::text AS id,
        r.nombre,
        r.descripcion,
        r.numero_salon AS "numeroSalon",
        r.aforo_maximo AS "aforoMaximo",
        tr.nombre AS tipo
      FROM ticket_trade."Recinto" r
      JOIN ticket_trade."TipoRecinto" tr ON tr.id_tipo_recinto = r.id_tipo_recinto
      ORDER BY r.id_recinto;
    `;
    const resultado = await pool.query(consulta);

    const recintosAdaptados = resultado.rows.map((r) => {
      const tipoLower = (r.tipo || '').toLowerCase();
      const tipo = tipoLower.includes('auditorio')
        ? 'auditorio'
        : tipoLower.includes('sala')
        ? 'sala'
        : 'laboratorio';

      return {
        id: r.id,
        nombre: r.nombre,
        codigo: r.numeroSalon || `REC-${r.id}`,
        tipo,
        capacidad: Number(r.aforoMaximo) || 0,
        ubicacion: r.numeroSalon ? `Edificio ESCOM, ${r.numeroSalon}` : 'Edificio Central ESCOM',
        indicaciones: 'Presentar código de reservación al ingresar.',
        equipamiento: ['Proyector', 'Audio', 'Aire acondicionado'],
        descripcion: r.descripcion || '',
        permiteEliminarAsientos: tipo === 'sala',
        activo: true,
      };
    });

    res.json({ datos: recintosAdaptados });
  } catch (error) {
    console.error('Error al consultar recintos:', error);
    res.status(500).json({
      error: {
        codigo: 'ERROR_CONSULTA',
        mensaje: 'No se pudieron obtener los recintos desde la base de datos',
      },
    });
  }
});

// Endpoint para consultar eventos y actividades desde PostgreSQL (adaptado al frontend)
app.get('/api/eventos', async (_req: Request, res: Response) => {
  try {
    // 1. Consultar eventos
    const consultaEventos = `
      SELECT 
        e.id_evento::text AS id,
        e.id_cuenta_organizadora::text AS "idOrganizador",
        concat_ws(' ', cu.nombres, cu.primer_apellido) AS "nombreOrganizador",
        e.titulo,
        e.descripcion,
        e.total_senales_interes AS "totalSenalesInteres",
        ce.nombre AS categoria,
        ee.nombre AS estado,
        ve.nombre AS visibilidad
      FROM ticket_trade."Evento" e
      JOIN ticket_trade."Cuenta" cu ON cu.id_cuenta = e.id_cuenta_organizadora
      JOIN ticket_trade."CategoriaEvento" ce ON ce.id_categoria_evento = e.id_categoria_evento
      JOIN ticket_trade."EstadoEvento" ee ON ee.id_estado_evento = e.id_estado_evento
      JOIN ticket_trade."VisibilidadEvento" ve ON ve.id_visibilidad_evento = e.id_visibilidad_evento
      ORDER BY e.id_evento;
    `;
    const resEventos = await pool.query(consultaEventos);

    // 2. Consultar actividades de todos los eventos
    const consultaActividades = `
      SELECT 
        a.id_actividad::text AS id,
        a.id_evento::text AS "idEvento",
        a.nombre AS "nombreActividad",
        a.descripcion AS "descripcionActividad",
        to_char(a.fecha, 'YYYY-MM-DD') AS fecha,
        to_char(a.hora_inicio, 'HH24:MI') AS "horaInicio",
        to_char(a.hora_fin, 'HH24:MI') AS "horaFin",
        a.id_recinto::text AS "idRecinto",
        a.aforo_solicitado AS "aforoMaximo",
        ta.nombre AS "tipoAcceso",
        ea.nombre AS "estadoActividad"
      FROM ticket_trade."Actividad" a
      JOIN ticket_trade."TipoAcceso" ta ON ta.id_tipo_acceso = a.id_tipo_acceso
      JOIN ticket_trade."EstadoActividad" ea ON ea.id_estado_actividad = a.id_estado_actividad
      ORDER BY a.fecha, a.hora_inicio;
    `;
    const resActividades = await pool.query(consultaActividades);

    // Agrupar actividades por evento
    const actividadesPorEvento = new Map<string, any[]>();
    for (const act of resActividades.rows) {
      const accesoLower = (act.tipoAcceso || '').toLowerCase();
      const modalidad = accesoLower.includes('libre')
        ? 'libre'
        : accesoLower.includes('registro')
        ? 'registro'
        : 'controlado';

      const actividadAdaptada = {
        id: act.id,
        idEvento: act.idEvento,
        nombreActividad: act.nombreActividad,
        descripcionActividad: act.descripcionActividad || '',
        fecha: act.fecha,
        horaInicio: act.horaInicio,
        horaFin: act.horaFin,
        idRecinto: act.idRecinto,
        modalidadAsistencia: modalidad,
        asistenciaEstimada: act.aforoMaximo,
        esFinalConfirmado: true,
        ponentes: [],
        estadoInscripciones: 'abiertas',
      };

      const lista = actividadesPorEvento.get(act.idEvento) || [];
      lista.push(actividadAdaptada);
      actividadesPorEvento.set(act.idEvento, lista);
    }

    // Combinar evento con sus fechas
    const eventosAdaptados = resEventos.rows.map((e) => {
      const fechas = actividadesPorEvento.get(e.id) || [];
      const visibLower = (e.visibilidad || '').toLowerCase();
      const estadoLower = (e.estado || '').toLowerCase();

      return {
        id: e.id,
        idOrganizador: e.idOrganizador,
        nombreOrganizador: e.nombreOrganizador,
        titulo: e.titulo,
        descripcion: e.descripcion || '',
        categoria: e.categoria || 'Conferencia',
        visibilidad: visibLower.includes('privad') ? 'privado' : 'publico',
        modalidadAsistencia: fechas[0]?.modalidadAsistencia || 'controlado',
        estado: estadoLower.includes('cancel') ? 'cancelado' : estadoLower.includes('borr') ? 'borrador' : 'publicado',
        fechas,
        ponentes: [],
        etiquetas: [e.categoria].filter(Boolean),
        aforoMaximo: fechas.reduce((acc: number, f: any) => acc + (f.asistenciaEstimada || 0), 0),
        inscripcionesAbiertas: true,
      };
    });

    res.json({ datos: eventosAdaptados });
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({
      error: {
        codigo: 'ERROR_CONSULTA',
        mensaje: 'No se pudieron obtener los eventos desde la base de datos',
      },
    });
  }
});
