import { pool, modoBaseDatos } from "../../bd/pool";
export async function leerRecintos() {
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
    const tipoLower = (r.tipo || "").toLowerCase();
    const tipo = tipoLower.includes("auditorio")
      ? "auditorio"
      : tipoLower.includes("sala")
        ? "sala"
        : "laboratorio";

    return {
      id: r.id,
      nombre: r.nombre,
      codigo: r.numeroSalon || `REC-${r.id}`,
      tipo,
      capacidad: Number(r.aforoMaximo) || 0,
      ubicacion: r.numeroSalon ? r.numeroSalon : "",
      indicaciones: "",
      equipamiento: [],
      descripcion: r.descripcion || "",
      permiteEliminarAsientos: tipo === "sala",
      activo: true,
    };
  });

  return recintosAdaptados;
}

export async function leerEventos(usuario: any = null) {
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
        ve.nombre AS visibilidad,
        arc.id_archivo::text AS "idArchivo",
        arc.clave_almacenamiento AS "claveArchivo",
        arc.nombre AS "nombreArchivo"
      FROM ticket_trade."Evento" e
      JOIN ticket_trade."Cuenta" cu ON cu.id_cuenta = e.id_cuenta_organizadora
      JOIN ticket_trade."CategoriaEvento" ce ON ce.id_categoria_evento = e.id_categoria_evento
      JOIN ticket_trade."EstadoEvento" ee ON ee.id_estado_evento = e.id_estado_evento
      JOIN ticket_trade."VisibilidadEvento" ve ON ve.id_visibilidad_evento = e.id_visibilidad_evento
      LEFT JOIN ticket_trade."Archivo" arc ON arc.id_archivo = e.id_archivo_cartel
      WHERE (ee.nombre='Publicado' AND ve.nombre='Público') OR ($1::text IS NOT NULL AND (e.id_cuenta_organizadora::text=$1 OR $2::boolean OR EXISTS(SELECT 1 FROM ticket_trade."StaffEvento" se WHERE se.id_evento=e.id_evento AND se.id_cuenta::text=$1)))
      ORDER BY e.id_evento;
    `;
  const resEventos = await pool.query(consultaEventos, [
    usuario?.id || null,
    !!usuario?.roles?.some((r: string) =>
      ["admin", "subdireccion"].includes(r),
    ),
  ]);

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
    const accesoLower = (act.tipoAcceso || "").toLowerCase();
    const modalidad = accesoLower.includes("libre")
      ? "libre"
      : accesoLower.includes("registro")
        ? "registro"
        : "controlado";

    const actividadAdaptada = {
      id: act.id,
      idEvento: act.idEvento,
      nombreActividad: act.nombreActividad,
      descripcionActividad: act.descripcionActividad || "",
      fecha: act.fecha,
      horaInicio: act.horaInicio,
      horaFin: act.horaFin,
      idRecinto: act.idRecinto,
      modalidadAsistencia: modalidad,
      asistenciaEstimada: act.aforoMaximo,
      esFinalConfirmado: false,
      suspendida: act.estadoActividad === "Suspendida",
      cancelada: act.estadoActividad === "Cancelada",
      ponentes: [],
      estadoInscripciones: "abiertas",
    };

    const lista = actividadesPorEvento.get(act.idEvento) || [];
    lista.push(actividadAdaptada);
    actividadesPorEvento.set(act.idEvento, lista);
  }

  // Combinar evento con sus fechas
  const eventosAdaptados = resEventos.rows.map((e) => {
    const fechas = actividadesPorEvento.get(e.id) || [];
    const visibLower = (e.visibilidad || "").toLowerCase();
    const estadoLower = (e.estado || "").toLowerCase();

    return {
      id: e.id,
      idOrganizador: e.idOrganizador,
      nombreOrganizador: e.nombreOrganizador,
      titulo: e.titulo,
      descripcion: e.descripcion || "",
      categoria: e.categoria || "Conferencia",
      visibilidad: visibLower.includes("privad") ? "privado" : "publico",
      modalidadAsistencia: fechas[0]?.modalidadAsistencia || "controlado",
      estado: estadoLower.includes("cancel")
        ? "cancelado"
        : estadoLower.includes("borr")
          ? "borrador"
          : "publicado",
      fechas,
      urlImagen: e.claveArchivo
        ? e.claveArchivo.startsWith("/imagenes/eventos/") ||
          /^https?:\/\//.test(e.claveArchivo)
          ? e.claveArchivo
          : `/api/archivos/${e.idArchivo}${modoBaseDatos() === "demo" ? "?demo=1" : ""}`
        : e.nombreArchivo
          ? `/imagenes/eventos/${e.nombreArchivo}`
          : undefined,
      ponentes: [],
      etiquetas: [e.categoria].filter(Boolean),
      // El aforo es por actividad; no se inventa un aforo global sumando recintos.
      inscripcionesAbiertas: true,
    };
  });

  return eventosAdaptados;
}
