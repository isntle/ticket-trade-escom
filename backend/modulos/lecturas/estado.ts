import { Router } from "express";
import { pool, tokenPeticion, modoBaseDatos } from "../../bd/pool";
import { usuarioSesion } from "../identidad/auth";
import { ruta } from "../../comun/http";
import { leerEventos, leerRecintos } from "./catalogos";
import { estadoSolicitudDesdeCatalogo } from "../../../src/servicios/contratoOrganizacion";

export const routerEstado = Router();
export async function leerEstado(u: any) {
  const [eventos, recintos] = await Promise.all([
    leerEventos(u),
    leerRecintos(),
  ]);
  const ids = eventos.map((e) => e.id);
  const revisor = !!u?.roles.some((r: string) =>
    ["admin", "subdireccion"].includes(r),
  );
  const asientos = (
    await pool.query(
      `SELECT la.id_lugar_actividad::text id,la.id_actividad::text actividad,a.id_recinto::text recinto,
    lr.codigo,lr.fila,lr.posicion_x::float8 x,lr.posicion_y::float8 y,cl.nombre categoria,coalesce(ef.nombre='Fuera de servicio',false) averiado
    FROM ticket_trade."LugarActividad" la JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
    JOIN ticket_trade."Actividad" a USING(id_actividad) JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
    LEFT JOIN ticket_trade."EstacionComputo" pc USING(id_lugar_recinto) LEFT JOIN ticket_trade."EstadoFuncionamiento" ef USING(id_estado_funcionamiento)
    WHERE a.id_evento=ANY($1::bigint[]) ORDER BY la.id_actividad,lr.fila,lr.posicion_x,lr.codigo`,
      [ids],
    )
  ).rows;
  const arreglos = eventos.flatMap((e) =>
    e.fechas
      .filter((f) => f.modalidadAsistencia === "controlado")
      .map((f) => {
        const porFila = new Map<string, number>();
        const laboratorio =
          recintos.find((r) => r.id === f.idRecinto)?.tipo === "laboratorio";
        const lugares = asientos
          .filter((l) => l.actividad === f.id)
          .map((l, i) => {
            const numeroFila = (porFila.get(l.fila) || 0) + 1;
            porFila.set(l.fila, numeroFila);
            return {
              id: l.id,
              fila: l.fila || "A",
              numero: laboratorio ? i + 1 : numeroFila,
              etiqueta: l.codigo,
              categoria:
                ({
                  Asistente: "asistente",
                  VIP: "vip",
                  Staff: "staff",
                  Bloqueado: "asistente",
                } as Record<string, string>)[l.categoria] || "sin_definir",
              estaBloqueado: l.categoria === "Bloqueado" || l.averiado,
              posicionX: l.x,
              posicionY: l.y,
            };
          });
        if (lugares.length) {
          f.esFinalConfirmado = true;
          Object.assign(f, { idArregloFinal: "pg-" + f.id });
        }
        return {
          id: "pg-" + f.id,
          idFechaEvento: f.id,
          idRecinto: f.idRecinto,
          nombre: `${e.titulo} · ${f.nombreActividad || f.fecha}`,
          etiquetaVersion: "PostgreSQL",
          estado: "version_final",
          asientos: lugares,
          totalAsientos: lugares.length,
          asientosAsistente: lugares.filter((l) => l.categoria === "asistente" && !l.estaBloqueado)
            .length,
          asientosVip: lugares.filter((l) => l.categoria === "vip").length,
          asientosStaff: lugares.filter((l) => l.categoria === "staff").length,
          asientosOrganizador: 0,
          asientosBloqueados: lugares.filter((l) => l.estaBloqueado).length,
          asientosSinAsignar: 0,
          fechaCreacion: "",
        };
      }),
  );
  const solicitudes = !u
    ? []
    : (
        await pool.query(
          `SELECT s.*,s.id_solicitud_evento::text id,e.id_cuenta_organizadora::text titular,e.titulo,e.descripcion,e.correo_contacto,e.telefono_contacto,
    e.id_evento::text evento,ce.nombre categoria,ve.nombre visibilidad,e.id_archivo_cartel::text cartel,ar.clave_almacenamiento,
    es.nombre estado,ta.nombre anticipacion,concat_ws(' ',c.nombres,c.primer_apellido,c.segundo_apellido) nombre,c.correo,
    (SELECT mensaje FROM ticket_trade."ResolucionSolicitud" r WHERE r.id_solicitud_evento=s.id_solicitud_evento ORDER BY r.resuelta_en DESC LIMIT 1) resolucion
    FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."Cuenta" c ON c.id_cuenta=e.id_cuenta_organizadora
    JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) LEFT JOIN ticket_trade."TipoAnticipacion" ta USING(id_tipo_anticipacion)
    JOIN ticket_trade."CategoriaEvento" ce USING(id_categoria_evento) JOIN ticket_trade."VisibilidadEvento" ve USING(id_visibilidad_evento)
    LEFT JOIN ticket_trade."Archivo" ar ON ar.id_archivo=e.id_archivo_cartel WHERE $1::boolean OR e.id_cuenta_organizadora=$2 ORDER BY s.id_solicitud_evento DESC`,
          [revisor, u.id],
        )
      ).rows.map((s) => {
        const e = eventos.find((e) => e.id === s.evento);
        return {
          id: s.id,
          idEvento: s.evento,
          version: s.version_edicion,
          idSolicitante: s.titular,
          nombreSolicitante: s.nombre,
          correoSolicitante: s.correo,
          afiliacionSolicitante: s.titular === u.id ? u.afiliacion : "externo",
          tituloEvento: s.titulo,
          descripcionEvento: s.descripcion,
          categoria: s.categoria,
          correoContacto: s.correo_contacto,
          telefonoContacto: s.telefono_contacto,
          urlImagen: s.clave_almacenamiento?.startsWith("/imagenes/")
            ? s.clave_almacenamiento
            : s.cartel
              ? `/api/archivos/${s.cartel}${modoBaseDatos() === "demo" ? "?demo=1" : ""}`
              : undefined,
          fechasSolicitadas: (e?.fechas || []).map((f) => ({
            ...f,
            distribucionConfirmada: true,
          })),
          modalidadAsistencia: e?.modalidadAsistencia || "registro",
          visibilidad: s.visibilidad === "Privado" ? "privado" : "publico",
          asistenciaEstimada: Math.max(
            0,
            ...(e?.fechas || []).map((f) => f.asistenciaEstimada || 0),
          ),
          estado: estadoSolicitudDesdeCatalogo(s.estado),
          esExcepcional: s.anticipacion === "Extraordinaria",
          justificacionExcepcional: s.motivo,
          fechaEnvioInicial: s.envio_inicial,
          fechaCreacion: s.envio_inicial || new Date().toISOString(),
          motivoRechazo: s.estado === "Rechazada" ? s.resolucion : undefined,
          observacionesCorreccion:
            s.estado === "Requiere corrección" ? s.resolucion : undefined,
        };
      });
  for (const solicitud of solicitudes) {
    const e = eventos.find((e) => e.id === solicitud.idEvento);
    if (e) Object.assign(e, { idSolicitud: solicitud.id });
  }
  const filas = (
    await pool.query(
      `SELECT r.id_reservacion::text id,cp.id_compromiso_cupo::text cupo,a.id_evento::text evento,a.id_actividad::text actividad,
    b.id_cuenta::text titular,concat_ws(' ',c.nombres,c.primer_apellido) nombre,c.correo,lr.codigo lugar,la.id_lugar_actividad::text asiento,
    er.nombre estado,r.confirmada_en,r.cancelada_en,b.id_boleto_evento::text pase,b.codigo_qr,b.codigo_manual,en.registrada_en entrada,
    ev.id_cuenta_organizadora::text organizador
    FROM ticket_trade."Reservacion" r JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."Actividad" a USING(id_actividad)
    JOIN ticket_trade."Evento" ev USING(id_evento) JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento) JOIN ticket_trade."Cuenta" c ON c.id_cuenta=b.id_cuenta
    JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion) LEFT JOIN ticket_trade."AsignacionAsiento" aa USING(id_compromiso_cupo)
    LEFT JOIN ticket_trade."LugarActividad" la USING(id_lugar_actividad) LEFT JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
    LEFT JOIN ticket_trade."EntradaOrdinaria" en USING(id_reservacion) WHERE a.id_evento=ANY($1::bigint[])`,
      [ids],
    )
  ).rows;
  const reservaciones = filas.map((r) => {
    const puede =
      revisor ||
      r.titular === u?.id ||
      r.organizador === u?.id ||
      u?.eventosAsignadosStaff?.includes(r.evento);
    return {
      id: r.id,
      idEvento: r.evento,
      idFechaEvento: r.actividad,
      idUsuario: puede ? r.titular : "ocupado",
      nombreUsuario: puede ? r.nombre : "Lugar reservado",
      correoUsuario: puede ? r.correo : "",
      idAsiento: r.asiento,
      etiquetaAsiento: r.lugar,
      estado: r.estado === "Confirmada" ? "confirmada" : "cancelada",
      fechaCreacion: r.confirmada_en,
      fechaConfirmacion: r.confirmada_en,
      idBoleto: "boleto-" + r.id,
    };
  });
  const apartados = (
    await pool.query(
      `SELECT ap.id_compromiso_cupo::text id,ap.id_cuenta::text titular,a.id_evento::text evento,a.id_actividad::text actividad,
    ap.creado_en,ap.creado_en+interval '2 minutes' vence,la.id_lugar_actividad::text asiento,lr.codigo lugar
    FROM ticket_trade."Apartado" ap JOIN ticket_trade."EstadoApartado" ea USING(id_estado_apartado) JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
    JOIN ticket_trade."Actividad" a USING(id_actividad) LEFT JOIN ticket_trade."AsignacionAsiento" aa USING(id_compromiso_cupo)
    LEFT JOIN ticket_trade."LugarActividad" la USING(id_lugar_actividad) LEFT JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
    WHERE ea.nombre='Vigente' AND ap.creado_en+interval '2 minutes'>CURRENT_TIMESTAMP AND a.id_evento=ANY($1::bigint[])`,
      [ids],
    )
  ).rows.map((r) => ({
    id: "apartado-" + r.id,
    idEvento: r.evento,
    idFechaEvento: r.actividad,
    idUsuario: r.titular === u?.id ? r.titular : "ocupado",
    nombreUsuario: "",
    correoUsuario: "",
    idAsiento: r.asiento,
    etiquetaAsiento: r.lugar,
    estado: "apartado_temporal",
    fechaCreacion: r.creado_en,
    tiempoExpiracionApartado: new Date(r.vence).getTime(),
  }));
  const boletos = filas
    .filter(
      (r) =>
        r.titular === u?.id ||
        revisor ||
        u?.eventosAsignadosStaff?.includes(r.evento) ||
        r.organizador === u?.id,
    )
    .map((r) => {
      const e = eventos.find((e) => e.id === r.evento),
        f = e?.fechas.find((f) => f.id === r.actividad);
      return {
        id: "boleto-" + r.id,
        idReservacion: r.id,
        idEvento: r.evento,
        idFechaEvento: r.actividad,
        idUsuario: r.titular,
        nombreUsuario: r.nombre,
        correoUsuario: r.correo,
        tituloEvento: e?.titulo || "",
        fechaEvento: f?.fecha || "",
        horaEvento: f?.horaInicio || "",
        nombreRecinto:
          recintos.find((x) => x.id === f?.idRecinto)?.nombre || "",
        etiquetaAsiento: r.lugar,
        codigoQr:
          r.titular === u?.id || modoBaseDatos() === "demo" ? r.codigo_qr : "",
        codigoManual: r.codigo_manual,
        estado:
          r.estado === "Cancelada"
            ? "cancelado"
            : r.entrada
              ? "utilizado"
              : "valido",
        fechaEmision: r.confirmada_en,
        fechaCheckIn: r.entrada,
      };
    });
  const escaneos = filas
    .filter((r) => r.entrada)
    .map((r) => ({
      id: "entrada-" + r.id,
      idEvento: r.evento,
      idFechaEvento: r.actividad,
      idBoleto: "boleto-" + r.id,
      idAsiento: r.asiento,
      resultado: "exito",
      fechaEscaneo: r.entrada,
      escaneadoPor: "Personal autorizado",
      mensaje: "Acceso registrado",
    }));
  const periodos = (
    await pool.query(
      "SELECT clave id,to_char(inicio,'YYYY-MM-DD') inicio,to_char(fin,'YYYY-MM-DD') fin FROM ticket_trade.\"PeriodoEscolar\" ORDER BY inicio",
    )
  ).rows.map((p) => ({ ...p, fuente: "Periodo configurado en PostgreSQL" }));
  const bloqueos = (
    await pool.query(`SELECT b.*,b.id_bloqueo_recinto::text id,b.id_recinto::text recinto,
    to_char(b.inicio AT TIME ZONE 'America/Mexico_City','YYYY-MM-DD') dia_inicio,to_char(b.inicio AT TIME ZONE 'America/Mexico_City','HH24:MI') hora_inicio,
    to_char(b.fin_previsto AT TIME ZONE 'America/Mexico_City','YYYY-MM-DD') dia_fin,to_char(b.fin_previsto AT TIME ZONE 'America/Mexico_City','HH24:MI') hora_fin
    FROM ticket_trade."BloqueoRecinto" b`)
  ).rows.map((b) => ({
    id: b.id,
    idRecinto: b.recinto,
    titulo: b.motivo,
    motivo: b.motivo,
    fechaInicio: b.dia_inicio,
    horaInicio: b.hora_inicio,
    fechaFin: b.dia_fin,
    horaFin: b.hora_fin,
    esIndefinido: !b.finalizado_en,
    estado: b.finalizado_en ? "cancelado" : "activo",
    creadoPor: "Personal autorizado",
    fechaCreacion: b.inicio,
  }));
  return {
    listaEventos: eventos,
    listaRecintos: recintos,
    listaSolicitudes: solicitudes,
    listaArreglos: arreglos,
    listaReservaciones: [...reservaciones, ...apartados],
    listaBoletos: boletos,
    bitacoraEscaneos: escaneos,
    listaBloqueos: bloqueos,
    listaEspera: [],
    listaIntencionesAsistencia: [],
    listaClasesRegulares: [],
    listaOcupacionesInternas: [],
    calendarioRevision: {
      diasLaborables: [1, 2, 3, 4, 5],
      diasInhabiles: [],
      responsable: "Calendario institucional",
      fechaConfiguracion: new Date().toISOString(),
    },
    periodos,
  };
}
routerEstado.get(
  "/",
  ruta(async (req, res) =>
    res.json({
      datos: await leerEstado(await usuarioSesion(tokenPeticion(req))),
    }),
  ),
);
