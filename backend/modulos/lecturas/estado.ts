import { leerIntenciones } from "../taquilla/intenciones.js";
import { Router } from "express";
import { pool, tokenPeticion, modoBaseDatos } from "../../bd/pool.js";
import { exigirSesion, usuarioSesion } from "../identidad/auth.js";
import { ruta, idEntero, fallo } from "../../comun/http.js";
import { origenSeguro } from "../../comun/seguridad.js";
import { leerEventos, leerRecintos } from "./catalogos.js";
import { estadoSolicitudDesdeCatalogo } from "../../../src/servicios/contratoOrganizacion.js";
import { asegurarInfraEspeciales } from "../taquilla/especiales.js";
import { conConfiguracion, leerCalendario, leerPlazos } from '../organizacion/calendario.js';
import { leerBloqueos } from '../organizacion/bloqueos.js';

export const routerEstado = Router();
export async function leerEstado(u: any, eventoEnlace?: string) {
  const configuracion = await conConfiguracion(async c => ({
    calendario: await leerCalendario(c), plazos: u ? await leerPlazos(c) : new Map(), bloqueos: await leerBloqueos(c, u),
  }), !u);
  const [eventos, recintos] = await Promise.all([
    leerEventos(u, eventoEnlace),
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
    WHERE a.id_evento=ANY($1::bigint[]) AND lr.id_recinto=a.id_recinto ORDER BY la.id_actividad,lr.fila,lr.posicion_x,lr.codigo`,
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
              ...(laboratorio ? { equipoComputo: l.codigo } : {}),
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
        if (e.estado === "publicado" && lugares.filter(l=>!l.estaBloqueado).length >= (f.asistenciaEstimada || 1)) {
          f.esFinalConfirmado = true;
          Object.assign(f, { idArregloFinal: "pg-" + f.id });
        }
        return {
          id: "pg-" + f.id,
          idFechaEvento: f.id,
          idRecinto: f.idRecinto,
          nombre: `${e.titulo} · ${f.nombreActividad || f.fecha}`,
          etiquetaVersion: "PostgreSQL",
          estado: f.esFinalConfirmado ? "version_final" : "borrador",
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
    CASE WHEN tc2.nombre<>'Común' THEN 'administrativo' WHEN rr.nombre='Estudiante' THEN 'alumno' WHEN rr.nombre='Empleado del IPN' THEN 'profesor' ELSE 'externo' END afiliacion,
    (SELECT mensaje FROM ticket_trade."ResolucionSolicitud" r WHERE r.id_solicitud_evento=s.id_solicitud_evento ORDER BY r.resuelta_en DESC LIMIT 1) resolucion,
    (SELECT ac.id_archivo::text FROM infra.archivo_contenido ac WHERE ac.metadatos->>'id_solicitud_evento'=s.id_solicitud_evento::text OR ac.metadatos->>'id_evento'=s.id_evento::text LIMIT 1) archivo_documento,
    (SELECT a2.nombre FROM ticket_trade."Archivo" a2 JOIN infra.archivo_contenido ac2 USING(id_archivo) WHERE ac2.metadatos->>'id_solicitud_evento'=s.id_solicitud_evento::text OR ac2.metadatos->>'id_evento'=s.id_evento::text LIMIT 1) nombre_documento
    FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."Cuenta" c ON c.id_cuenta=e.id_cuenta_organizadora
    JOIN ticket_trade."TipoCuenta" tc2 ON tc2.id_tipo_cuenta=c.id_tipo_cuenta
    LEFT JOIN ticket_trade."PerfilUsuario" pu ON pu.id_cuenta=c.id_cuenta LEFT JOIN ticket_trade."RolRegistro" rr ON rr.id_rol_registro=pu.id_rol_registro
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
          afiliacionSolicitante: s.afiliacion,
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
          itinerarios: e?.itinerarios || [],
          nombreDocumento: s.nombre_documento || undefined,
          urlDocumento: s.archivo_documento
            ? `/api/archivos/${s.archivo_documento}${modoBaseDatos() === "demo" ? "?demo=1" : ""}`
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
          ...(configuracion.plazos.get(s.id) || {}),
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
  const autorizadoEvento = (idEvento: string, idOrganizador: string) =>
    Boolean(
      revisor ||
      (u?.roles.includes("organizador") && idOrganizador === u?.id) ||
      (u?.roles.includes("staff") &&
        u?.eventosAsignadosStaff?.includes(idEvento)),
    );
  const puedeGestionarEspeciales = (idOrganizador: string) =>
    Boolean(
      u &&
        u.estaActivo !== false &&
        (u.roles?.includes("admin") ||
          (u.roles?.includes("organizador") && idOrganizador === u.id)),
    );
  await asegurarInfraEspeciales(pool);
  const filas = (
    await pool.query(
      `SELECT r.id_reservacion::text id,cp.id_compromiso_cupo::text cupo,a.id_evento::text evento,a.id_actividad::text actividad,
    b.id_cuenta::text titular,concat_ws(' ',c.nombres,c.primer_apellido,nullif(c.segundo_apellido,'')) nombre,c.correo,lr.codigo lugar,la.id_lugar_actividad::text asiento,
    er.nombre estado,r.confirmada_en,r.cancelada_en,ca.nombre causa,b.id_boleto_evento::text pase,b.codigo_qr,b.codigo_manual,
    en.id_entrada_ordinaria::text id_entrada,en.registrada_en entrada,en.id_cuenta_operadora::text id_operador,
    concat_ws(' ',op.nombres,op.primer_apellido,nullif(op.segundo_apellido,'')) operador,
    ev.id_cuenta_organizadora::text organizador
    FROM ticket_trade."Reservacion" r JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."Actividad" a USING(id_actividad)
    JOIN ticket_trade."Evento" ev USING(id_evento) JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento) JOIN ticket_trade."Cuenta" c ON c.id_cuenta=b.id_cuenta
    JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion)
    LEFT JOIN ticket_trade."CausaCancelacionReservacion" ca USING(id_causa_cancelacion_reservacion)
    LEFT JOIN ticket_trade."AsignacionAsiento" aa USING(id_compromiso_cupo)
    LEFT JOIN ticket_trade."LugarActividad" la USING(id_lugar_actividad) LEFT JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
    LEFT JOIN ticket_trade."EntradaOrdinaria" en USING(id_reservacion)
    LEFT JOIN ticket_trade."Cuenta" op ON op.id_cuenta=en.id_cuenta_operadora
    WHERE a.id_evento=ANY($1::bigint[])`,
      [ids],
    )
  ).rows;
  const especiales = (
    await pool.query(
      `SELECT b.id_boleto_especial::text id,cp.id_compromiso_cupo::text cupo,a.id_evento::text evento,a.id_actividad::text actividad,
    lr.codigo lugar,la.id_lugar_actividad::text asiento,cl.nombre categoria,
    b.codigo_qr,b.codigo_manual,b.emitido_en,b.invalidado_en,b.motivo_invalidacion,
    en.id_entrada_especial::text id_entrada,en.registrada_en entrada,en.id_cuenta_operadora::text id_operador,
    concat_ws(' ',op.nombres,op.primer_apellido,nullif(op.segundo_apellido,'')) operador,
    ev.id_cuenta_organizadora::text organizador,
    bed.tipo_especial,bed.nombre_titular,bed.correo_destino,bed.emitido_por,bed.invalidado_por
    FROM ticket_trade."BoletoEspecial" b JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."Actividad" a USING(id_actividad)
    JOIN ticket_trade."Evento" ev USING(id_evento) LEFT JOIN ticket_trade."AsignacionAsiento" aa USING(id_compromiso_cupo)
    LEFT JOIN ticket_trade."LugarActividad" la USING(id_lugar_actividad)
    LEFT JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad)
    LEFT JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto)
    LEFT JOIN ticket_trade."EntradaEspecial" en USING(id_boleto_especial)
    LEFT JOIN ticket_trade."Cuenta" op ON op.id_cuenta=en.id_cuenta_operadora
    LEFT JOIN infra.boleto_especial_detalle bed USING(id_boleto_especial)
    WHERE a.id_evento=ANY($1::bigint[])
    ORDER BY b.id_boleto_especial DESC`,
      [ids],
    )
  ).rows;
  const reservaciones = filas.map((r) => {
    const puede =
      r.titular === u?.id || autorizadoEvento(r.evento, r.organizador);
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
      motivoCancelacion: puede ? r.causa || undefined : undefined,
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
  const boletos = [
    ...filas
      .filter(
        (r) =>
          r.titular === u?.id || autorizadoEvento(r.evento, r.organizador),
      )
      .map((r) => {
        const e = eventos.find((e) => e.id === r.evento),
          f = e?.fechas.find((f) => f.id === r.actividad);
        return {
          id: "boleto-" + r.id,
          idPase: r.pase,
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
          fechaCheckIn: r.entrada || undefined,
          revisadoPor: r.operador || undefined,
        };
      }),
    ...especiales
      .filter((b: any) => autorizadoEvento(b.evento, b.organizador))
      .map((b: any) => {
        const e = eventos.find((e: any) => e.id === b.evento),
          f = e?.fechas.find((f: any) => f.id === b.actividad);
        const puedeVerCodigo = puedeGestionarEspeciales(b.organizador);
        const tipoEspecial = (b.tipo_especial ||
          (b.categoria === "Staff" ? "staff" : "vip")) as
          | "organizador"
          | "staff"
          | "vip";
        return {
          id: "boleto-esp-" + b.id,
          idReservacion: "esp-" + b.id,
          idEvento: b.evento,
          idFechaEvento: b.actividad,
          idUsuario: "especial-" + b.id,
          nombreUsuario:
            b.nombre_titular ||
            (tipoEspecial === "organizador"
              ? "Integrante del comité"
              : tipoEspecial === "staff"
                ? "Integrante de staff"
                : "Invitado VIP"),
          correoUsuario: puedeVerCodigo ? b.correo_destino || "" : "",
          tituloEvento: e?.titulo || "",
          fechaEvento: f?.fecha || "",
          horaEvento: f ? `${f.horaInicio} - ${f.horaFin}` : "",
          nombreRecinto:
            recintos.find((x: any) => x.id === f?.idRecinto)?.nombre || "",
          etiquetaAsiento: b.lugar,
          codigoQr: puedeVerCodigo ? b.codigo_qr : "",
          codigoManual: puedeVerCodigo ? b.codigo_manual : undefined,
          esEspecial: true,
          tipoEspecial,
          emitidoPor: b.emitido_por || undefined,
          invalidadoPor: b.invalidado_por || undefined,
          estado: b.invalidado_en
            ? "cancelado"
            : b.entrada
              ? "utilizado"
              : "valido",
          fechaEmision: b.emitido_en,
          fechaInvalidacion: b.invalidado_en || undefined,
          motivoInvalidacion: b.motivo_invalidacion || undefined,
          fechaCheckIn: b.entrada || undefined,
          revisadoPor: b.operador || undefined,
        };
      }),
  ];
  const escaneos = [
    ...filas
      .filter((r: any) => r.entrada && autorizadoEvento(r.evento, r.organizador))
      .map((r: any) => ({
        id: "entrada-" + r.id,
        idEvento: r.evento,
        idFechaEvento: r.actividad,
        idBoleto: "boleto-" + r.id,
        idAsiento: r.asiento,
        nombreAsistente: r.nombre,
        etiquetaAsiento: r.lugar || undefined,
        resultado: "exito",
        fechaEscaneo: r.entrada,
        escaneadoPor: r.operador || "Personal autorizado",
        idOperador: r.id_operador || undefined,
        notas: "Entrada registrada",
        mensaje: "Acceso registrado",
      })),
    ...especiales
      .filter((b: any) => b.entrada && autorizadoEvento(b.evento, b.organizador))
      .map((b: any) => ({
        id: "entrada-esp-" + b.id,
        idEvento: b.evento,
        idFechaEvento: b.actividad,
        idBoleto: "boleto-esp-" + b.id,
        idAsiento: b.asiento,
        nombreAsistente: b.nombre_titular
          ? `${b.nombre_titular} (Especial)`
          : b.categoria === "Staff"
            ? "Integrante de staff (Especial)"
            : "Invitado VIP (Especial)",
        etiquetaAsiento: b.lugar || undefined,
        resultado: "exito",
        fechaEscaneo: b.entrada,
        escaneadoPor: b.operador || "Personal autorizado",
        idOperador: b.id_operador || undefined,
        notas: "Entrada especial registrada",
        mensaje: "Acceso especial registrado",
      })),
  ].sort(
    (a, b) =>
      Date.parse(String(b.fechaEscaneo || "")) -
      Date.parse(String(a.fechaEscaneo || "")),
  );
  const periodos = (
    await pool.query(
      "SELECT clave id,to_char(inicio,'YYYY-MM-DD') inicio,to_char(fin,'YYYY-MM-DD') fin FROM ticket_trade.\"PeriodoEscolar\" ORDER BY inicio",
    )
  ).rows.map((p) => ({ ...p, fuente: "Periodo configurado en PostgreSQL" }));
  const notificaciones = !u
    ? []
    : (
        await pool.query(
          `SELECT id_notificacion::text id,titulo,mensaje,referencia_destino enlace,creada_en fecha,(leida_en IS NOT NULL) leida
           FROM ticket_trade."Notificacion"
           WHERE id_cuenta_destinataria=$1 AND tipo<>'evento_operacion'
           ORDER BY creada_en DESC,id_notificacion DESC`,
          [u.id],
        )
      ).rows;
  return {
    listaEventos: eventos,
    listaRecintos: recintos,
    listaSolicitudes: solicitudes,
    listaArreglos: arreglos,
    listaReservaciones: [...reservaciones, ...apartados],
    listaBoletos: boletos,
    bitacoraEscaneos: escaneos,
    listaBloqueos: configuracion.bloqueos,
    listaNotificaciones: notificaciones,
    listaEspera: [],
    listaIntencionesAsistencia: await leerIntenciones(u?.id),
    listaClasesRegulares: [],
    listaOcupacionesInternas: [],
    calendarioRevision: configuracion.calendario,
    periodos,
  };
}
routerEstado.patch(
  "/notificaciones/:id/leida",
  origenSeguro,
  exigirSesion,
  ruta(async (req, res) => {
    const id = idEntero(req.params.id);
    const r = await pool.query(
      `UPDATE ticket_trade."Notificacion" SET leida_en=COALESCE(leida_en,clock_timestamp())
       WHERE id_notificacion=$1 AND id_cuenta_destinataria=$2`,
      [id, res.locals.usuario.id],
    );
    if (!r.rowCount) fallo("Notificación no encontrada.", 404);
    res.json({ datos: { exito: true } });
  }),
);
routerEstado.post('/evento-privado', origenSeguro, ruta(async (req, res) => {
  const id = idEntero(req.body?.idEvento);
  const token = req.body?.token;
  if (typeof token !== 'string' || !token || token.length > 256) fallo('Evento no disponible.', 404);
  const acceso = await pool.query(`SELECT 1 FROM ticket_trade."Evento" e JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento) JOIN ticket_trade."VisibilidadEvento" v USING(id_visibilidad_evento) WHERE e.id_evento=$1 AND ee.nombre='Publicado' AND v.nombre='Privado' AND e.token_enlace_privado IS NOT NULL AND e.token_enlace_privado<>'' AND e.token_enlace_privado=$2`, [id, token]);
  if (!acceso.rowCount) fallo('Evento no disponible.', 404);
  const estado = await leerEstado(await usuarioSesion(tokenPeticion(req)), id);
  const evento = estado.listaEventos.find(e => e.id === id);
  if (!evento) fallo('Evento no disponible.', 404);
  const actividades = new Set(evento.fechas.map(f => f.id));
  res.set('Cache-Control', 'no-store').json({ datos: {
    evento,
    arreglos: estado.listaArreglos.filter(a => actividades.has(a.idFechaEvento)),
    reservaciones: estado.listaReservaciones.filter(r => r.idEvento === id),
  } });
}));
routerEstado.get(
  "/",
  ruta(async (req, res) =>
    res.json({
      datos: await leerEstado(await usuarioSesion(tokenPeticion(req))),
    }),
  ),
);
