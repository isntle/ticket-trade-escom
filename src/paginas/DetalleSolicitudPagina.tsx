import React, { useState } from "react";
import { ProgramaDia } from "../componentes/eventos/EditorPrograma";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Image as Imagen,
  History,
  ExternalLink,
} from "lucide-react";
import { useDatos } from "../contextos/DatosContexto";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useNotificaciones } from "../contextos/NotificacionesContexto";
import { InsigniaEstado } from "../componentes/ui/InsigniaEstado";
import { EstadoVacio } from "../componentes/ui/EstadoVacio";
import { VentanaModal } from "../componentes/ui/VentanaModal";
import {
  puedeConsultarSolicitud,
  solicitudesCoincidentes,
  versionSolicitud,
  ZONA_HORARIA,
} from "../dominio/solicitudes";

const formatoFecha = (valor: string) =>
  new Date(valor).toLocaleString("es-MX", {
    timeZone: ZONA_HORARIA,
    dateStyle: "medium",
    timeStyle: "short",
  });
const archivoSeguro = (url?: string) =>
  Boolean(
    url &&
    /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,|data:application\/pdf;base64,)/i.test(
      url,
    ),
  );
const etiquetas: Record<string, string> = {
  tituloEvento: "Título",
  descripcionEvento: "Descripción",
  fechasSolicitadas: "Días, horarios y recintos",
  modalidadAsistencia: "Modalidad",
  visibilidad: "Visibilidad",
  asistenciaEstimada: "Aforo",
  esExcepcional: "Solicitud urgente",
  justificacionExcepcional: "Motivo de urgencia",
  correoContacto: "Correo de contacto",
  telefonoContacto: "Teléfono",
  nombreDocumento: "Documento",
  urlDocumento: "Archivo del documento",
  nombreBanner: "Cartel",
  urlImagen: "Imagen del cartel",
  estado: "Estado",
  observacionesCorreccion: "Correcciones solicitadas",
  motivoRechazo: "Motivo del rechazo",
};
const seccion = "rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6";
const boton =
  "rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-neutral-50";
const primario =
  "rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40";
type Accion = "autorizar" | "rechazar" | "devolver" | "cancelar";

export const DetalleSolicitudPagina: React.FC<{
  requestId: string;
  navigate: (ruta: string) => void;
}> = ({ requestId, navigate }) => {
  const {
    calendarioRevision,
    listaSolicitudes,
    listaRecintos,
    listaEventos,
    dictaminarSolicitud,
    atenderSolicitudExtraordinaria,
    devolverSolicitud,
    cancelarSolicitud,
    verificarDisponibilidadRecinto,
  } = useDatos();
  const { usuarioActual, rolActivo, todosLosUsuarios } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const [accion, setAccion] = useState<Accion | null>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [versionConsultada, setVersionConsultada] = useState(1);
  const solicitud = listaSolicitudes.find((s) => s.id === requestId);
  const regreso =
    usuarioActual?.roles.some(
      (rol) => rol === "subdireccion" || rol === "admin",
    ) && rolActivo !== "organizador"
      ? "/subdireccion"
      : "/organizador";
  if (!solicitud || !puedeConsultarSolicitud(usuarioActual, solicitud))
    return (
      <div className="max-w-4xl mx-auto p-8">
        <EstadoVacio
          titulo="Solicitud no disponible"
          descripcion="Inicia sesión con la cuenta solicitante o con un perfil autorizado para consultar este expediente."
          textoAccion="Volver"
          alHacerAccion={() => navigate(regreso)}
        />
      </div>
    );
  const titular = todosLosUsuarios.find(
    (u) => u.id === solicitud.idSolicitante,
  );
  const evento = listaEventos.find((e) => e.idSolicitud === solicitud.id);
  const imagenVistaPrevia = solicitud.urlImagen || evento?.urlImagen;
  const esTitular = usuarioActual?.id === solicitud.idSolicitante;
  const esRevisor =
    rolActivo === "subdireccion" &&
    usuarioActual?.roles.includes("subdireccion");
  const puedeAutoaprobar =
    esTitular && usuarioActual?.puedeAutoaprobar && !solicitud.esExcepcional;
  const pendientes =
    esRevisor || usuarioActual?.roles.includes("admin")
      ? solicitudesCoincidentes(solicitud, listaSolicitudes)
      : [];
  const version = versionSolicitud(solicitud);
  const documento = solicitud.urlDocumento || titular?.urlDocumento;
  const correo = solicitud.correoContacto || solicitud.correoSolicitante;
  const nombreRecinto = (id: string) =>
    listaRecintos.find((r) => r.id === id)?.nombre || "Recinto no disponible";
  const abrir = (tipo: Accion) => {
    setAccion(tipo);
    setMotivo("");
    setError("");
    setVersionConsultada(version);
  };
  const ejecutar = () => {
    const resultado =
      accion === "cancelar"
        ? cancelarSolicitud(solicitud.id, versionConsultada)
        : accion === "devolver"
          ? devolverSolicitud(
              solicitud.id,
              motivo,
              usuarioActual?.nombre,
              versionConsultada,
            )
          : accion === "rechazar"
            ? dictaminarSolicitud(
                solicitud.id,
                "rechazada",
                motivo,
                usuarioActual?.nombre,
                versionConsultada,
              )
            : solicitud.esExcepcional
              ? atenderSolicitudExtraordinaria(solicitud.id, versionConsultada)
              : dictaminarSolicitud(
                  solicitud.id,
                  "autorizada",
                  undefined,
                  usuarioActual?.nombre,
                  versionConsultada,
                );
    if (!resultado.exito) {
      setError(resultado.error || "No se pudo completar la operación.");
      return;
    }
    mostrarNotificacion(
      "Solicitud actualizada",
      "La operación y la versión revisada quedaron registradas.",
      "exito",
    );
    setAccion(null);
  };
  const mostrarValor = (campo: string, valor: unknown): string => {
    if (valor === null || valor === undefined || valor === "")
      return "Sin registrar";
    if (campo === "urlDocumento" || campo === "urlImagen")
      return "Archivo adjunto";
    if (campo === "fechasSolicitadas" && Array.isArray(valor))
      return valor
        .map((d) =>
          [
            d.nombreDia || "Día",
            d.fecha,
            d.horaInicio + "–" + d.horaFin,
            nombreRecinto(d.idRecinto),
            d.actividadOPrograma,
            d.programa
              ?.map(
                (actividad: {
                  hora: string;
                  horaFin?: string;
                  titulo: string;
                  descripcion?: string;
                  ponente?: string;
                }) =>
                  [
                    actividad.hora,
                    actividad.horaFin,
                    actividad.titulo,
                    actividad.descripcion,
                    actividad.ponente,
                  ]
                    .filter(Boolean)
                    .join(" · "),
              )
              .join("\n"),
          ]
            .filter(Boolean)
            .join(" · "),
        )
        .join("\n");
    return typeof valor === "boolean" ? (valor ? "Sí" : "No") : String(valor);
  };
  const itinerario = (comprobar: boolean) => (
    <ol className="mt-4 space-y-5">
      {solicitud.fechasSolicitadas.map((d, i) => {
        const disp = verificarDisponibilidadRecinto(
          d.idRecinto,
          d.fecha,
          d.horaInicio,
          d.horaFin,
          evento?.fechas[i]?.id,
        );
        return (
          <li key={d.id} className="border-l-2 border-[#7a132b]/25 pl-4">
            <h3 className="font-bold">
              {d.nombreDia || "Día " + (i + 1)} ·{" "}
              {d.fecha || "Fecha por completar"}
            </h3>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <CalendarDays size={15} />
              {d.horaInicio}–{d.horaFin} h
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
              <MapPin size={15} />
              {nombreRecinto(d.idRecinto)}
            </p>
            <ProgramaDia programa={d.programa} />
            {!d.programa?.length && d.actividadOPrograma && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6">
                {d.actividadOPrograma}
              </p>
            )}
            {comprobar && solicitud.estado === "en_revision" && (
              <p
                className={
                  "mt-2 text-sm " +
                  (disp.disponible ? "text-emerald-700" : "text-rose-700")
                }
              >
                {disp.disponible
                  ? "Recinto disponible en el horario solicitado"
                  : disp.motivo}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(regreso)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600"
      >
        <ArrowLeft size={17} />
        {regreso === "/subdireccion"
          ? "Volver a solicitudes"
          : "Volver a mis solicitudes"}
      </button>
      <header className="mb-7 flex flex-wrap justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            <InsigniaEstado estado={solicitud.estado} />
            <span className="text-sm text-neutral-500">Versión {version}</span>
            {solicitud.esExcepcional && (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
                Solicitud extraordinaria
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold break-words">
            {solicitud.tituloEvento || "Solicitud sin título"}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Solicita {solicitud.nombreSolicitante} · Creada el{" "}
            {formatoFecha(solicitud.fechaCreacion)}
          </p>
          <p className="mt-1 break-all text-xs text-neutral-500">
            Folio: {solicitud.id}
            {solicitud.fechaEnvioInicial
              ? " · Enviada el " + formatoFecha(solicitud.fechaEnvioInicial)
              : ""}
          </p>
        </div>
        {evento && (
          <button
            className={boton}
            onClick={() => navigate("/organizador/eventos/" + evento.id)}
          >
            Ver evento asociado
          </button>
        )}
      </header>
      <div className="grid items-start gap-7 md:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="min-w-0 space-y-6">
          <section className={seccion}>
            <h2 className="text-lg font-bold">Información de la solicitud</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-700">
              {solicitud.descripcionEvento ||
                "El borrador todavía no tiene descripción."}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
              {[
                [
                  "Aforo solicitado",
                  solicitud.asistenciaEstimada + " personas",
                ],
                [
                  "Modalidad",
                  solicitud.modalidadAsistencia === "libre"
                    ? "Entrada libre"
                    : solicitud.modalidadAsistencia === "registro"
                      ? "Registro de asistencia"
                      : "Aforo controlado",
                ],
                [
                  "Visibilidad",
                  solicitud.visibilidad === "publico"
                    ? "Público"
                    : solicitud.visibilidad === "privado"
                      ? "Privado, mediante enlace"
                      : "Comunidad IPN",
                ],
                [
                  "Tipo de solicitud",
                  solicitud.esExcepcional
                    ? "Extraordinaria: menos de 7 días"
                    : "Ordinaria",
                ],
              ].map(([nombre, valor]) => (
                <div key={nombre}>
                  <dt className="text-neutral-500">{nombre}</dt>
                  <dd className="mt-1 font-semibold">{valor}</dd>
                </div>
              ))}
            </dl>
            {solicitud.esExcepcional && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 className="font-bold">Motivo de urgencia</h3>
                <p className="mt-2 whitespace-pre-line leading-6">
                  {solicitud.justificacionExcepcional ||
                    "Sin justificación registrada."}
                </p>
                <p className="mt-3">
                  El envío no reserva el recinto ni autoriza el evento.
                  Subdirección debe revisar y confirmar su creación.
                </p>
              </div>
            )}
          </section>
          <section className={seccion}><h2 className="text-lg font-bold">Plazos de revisión</h2><p className="mt-3 text-sm">Envío inicial: {formatoFecha(solicitud.fechaEnvioInicial || solicitud.fechaCreacion)}</p>{solicitud.estado==='requiere_correccion'?<><p className="mt-2">Revisión pausada. Tiempo restante: {solicitud.tiempoRevisionRestanteMs===undefined?'Sin plazo calculado':Math.ceil(solicitud.tiempoRevisionRestanteMs/3600000)+' horas'}.</p><p>Corrección hasta: {solicitud.fechaLimiteCorreccion?formatoFecha(solicitud.fechaLimiteCorreccion):'Sin registrar'}.</p></>:<p className="mt-2">Vencimiento de revisión: {solicitud.fechaVencimientoRevision?formatoFecha(solicitud.fechaVencimientoRevision):'Sin plazo calculado para este registro anterior'}.</p>}{!calendarioRevision&&<p className="mt-3 text-amber-800">Administración debe configurar el calendario hábil antes de recibir solicitudes nuevas.</p>}<p className="mt-2 text-sm text-neutral-500">Hora de Ciudad de México. El vencimiento se comprueba al consultar y mientras la aplicación está abierta; el proceso de servidor se integra con la base de datos.</p></section>
          <section className={seccion}>
            <h2 className="text-lg font-bold">Días, horarios y recintos</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Horarios de Ciudad de México.
            </p>
            {itinerario(true)}
            {pendientes.length > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                <h3 className="font-bold">Solicitudes coincidentes</h3>
                <p className="mt-1">
                  Otras solicitudes piden el mismo horario. Todavía no son
                  reservas confirmadas.
                </p>
                {pendientes.map((s) => (
                  <p key={s.id} className="mt-2">
                    {s.tituloEvento}
                  </p>
                ))}
              </div>
            )}
          </section>
          <section className={seccion}>
            <h2 className="text-lg font-bold">Solicitante y contacto</h2>
            <p className="mt-3 font-semibold">{solicitud.nombreSolicitante}</p>
            <p className="mt-1 text-sm capitalize text-neutral-600">
              {solicitud.afiliacionSolicitante}
              {titular?.nombreOrganizacion
                ? " · " + titular.nombreOrganizacion
                : ""}
            </p>
            {titular?.puestoContacto && (
              <p className="mt-1 text-sm">{titular.puestoContacto}</p>
            )}
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Correo de la cuenta", solicitud.correoSolicitante],
                [
                  "Identificación declarada",
                  solicitud.identificadorSolicitante || "No registrada",
                ],
                [
                  "Teléfono",
                  solicitud.telefonoContacto ||
                    titular?.telefonoContacto ||
                    "No registrado",
                ],
              ].map(([nombre, valor]) => (
                <div key={nombre}>
                  <dt className="text-neutral-500">{nombre}</dt>
                  <dd className="break-words">{valor}</dd>
                </div>
              ))}
              <div>
                <dt className="text-neutral-500">
                  Correo de contacto del evento
                </dt>
                <dd>
                  <a
                    href={"mailto:" + correo}
                    className="break-all text-[#7a132b] underline"
                  >
                    {correo}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-neutral-500">
              El contacto y los documentos son privados y no aparecen en el
              detalle público.
            </p>
            {(solicitud.nombreDocumento ||
              titular?.nombreDocumento ||
              documento) && (
              <div className="mt-5 border-t pt-4">
                <h3 className="font-semibold">Documento de respaldo</h3>
                <p className="mt-2 break-words text-sm">
                  {solicitud.nombreDocumento ||
                    titular?.nombreDocumento ||
                    "Archivo adjunto"}
                </p>
                {archivoSeguro(documento) ? (
                  <a
                    href={documento}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#7a132b] underline"
                  >
                    Abrir documento
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-neutral-500">
                    El registro conserva el nombre, pero no el archivo.
                  </p>
                )}
              </div>
            )}
          </section>
          <section className={seccion}>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <History size={19} />
              Historial de la solicitud
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Versión actual: {version}. Consulta las ediciones y decisiones
              registradas.
            </p>
            <ol className="mt-5 space-y-5">
              {[...(solicitud.historialVersiones || [])].reverse().map((r) => (
                <li
                  key={r.version}
                  className="border-l-2 border-neutral-200 pl-4"
                >
                  <h3 className="font-semibold">
                    Versión {r.version} · {r.accion}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {formatoFecha(r.fecha)} · {r.responsable}
                  </p>
                  {r.motivo && <p className="mt-2 text-sm">{r.motivo}</p>}
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-semibold text-[#7a132b]">
                      Ver qué cambió
                    </summary>
                    <dl className="mt-3 space-y-4">
                      {r.modificaciones.map((c) => (
                        <div key={c.campo}>
                          <dt className="font-semibold">
                            {etiquetas[c.campo] || "Datos de la solicitud"}
                          </dt>
                          <dd className="mt-1 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-neutral-50 p-3 whitespace-pre-line break-words">
                              <span className="block text-xs text-neutral-500">
                                Antes
                              </span>
                              {mostrarValor(c.campo, c.anterior)}
                            </div>
                            <div className="rounded-lg bg-[#7a132b]/5 p-3 whitespace-pre-line break-words">
                              <span className="block text-xs text-neutral-500">
                                Después
                              </span>
                              {mostrarValor(c.campo, c.nuevo)}
                            </div>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </li>
              ))}
              <li className="border-l-2 border-neutral-200 pl-4">
                <h3 className="font-semibold">Registro inicial</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatoFecha(solicitud.fechaCreacion)} ·{" "}
                  {solicitud.nombreSolicitante}
                </p>
                {!solicitud.historialVersiones?.length && (
                  <p className="mt-2 text-sm">
                    No hay modificaciones registradas. Los registros antiguos no
                    contienen versiones previas.
                  </p>
                )}
              </li>
            </ol>
          </section>
          {!!evento?.historialCambios?.length && (
            <section className={seccion}>
              <h2 className="text-lg font-bold">Cambios del evento asociado</h2>
              <p className="mt-2 text-sm">
                {evento.historialCambios.length} modificaciones · Estado:{" "}
                {evento.estado}
              </p>
              <ol className="mt-4 space-y-3">
                {[...evento.historialCambios].reverse().map((r) => (
                  <li key={r.version} className="border-t pt-3 text-sm">
                    <strong>Versión {r.version}</strong> ·{" "}
                    {formatoFecha(r.fecha)}
                    <p>
                      {r.responsable}: {r.motivo || r.campos.join(", ")}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <aside className="min-w-0 space-y-5 md:sticky md:top-24">
          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="border-b p-5">
              <h2 className="text-lg font-bold">Vista previa del evento</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {evento
                  ? "Vista del evento asociado; su cartel puede haberse actualizado después de la solicitud."
                  : "Información capturada; esta vista no publica el evento."}
              </p>
            </div>
            {archivoSeguro(imagenVistaPrevia) ? (
              <img
                src={imagenVistaPrevia}
                alt={"Cartel de " + solicitud.tituloEvento}
                className="max-h-80 w-full bg-neutral-100 object-contain"
              />
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center gap-3 bg-neutral-100 p-7 text-neutral-500">
                <Imagen size={32} />
                <span className="text-sm">Sin cartel adjunto</span>
              </div>
            )}
            <div className="p-5 sm:p-6">
              <h3 className="text-xl font-extrabold">
                {solicitud.tituloEvento || "Título por completar"}
              </h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-600">
                {solicitud.descripcionEvento}
              </p>
              {itinerario(false)}
            </div>
          </section>
          <section className={seccion}>
            <h2 className="text-lg font-bold">Revisión de la solicitud</h2>
            {solicitud.observacionesCorreccion && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                <h3 className="font-bold">Correcciones solicitadas</h3>
                <p className="mt-2">{solicitud.observacionesCorreccion}</p>
                {solicitud.fechaLimiteCorreccion && (
                  <p className="mt-2">
                    Plazo: {formatoFecha(solicitud.fechaLimiteCorreccion)}
                  </p>
                )}
              </div>
            )}
            {solicitud.motivoRechazo && (
              <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
                {solicitud.motivoRechazo}
              </p>
            )}
            {solicitud.revisadoPor && (
              <p className="mt-3 text-sm text-neutral-600">
                Última revisión: {solicitud.revisadoPor}
                {solicitud.fechaRevision
                  ? " · " + formatoFecha(solicitud.fechaRevision)
                  : ""}
              </p>
            )}
            {(esRevisor || puedeAutoaprobar) &&
              solicitud.estado === "en_revision" && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-6 text-neutral-600">
                    Revisa el expediente y los posibles conflictos antes de
                    resolver la versión {version}.
                  </p>
                  <button
                    onClick={() => abrir("autorizar")}
                    className={primario + " w-full"}
                  >
                    {solicitud.esExcepcional
                      ? "Revisar creación extraordinaria"
                      : "Revisar autorización"}
                  </button>
                  {esRevisor && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => abrir("devolver")}
                        className={boton + " flex-1"}
                      >
                        Pedir correcciones
                      </button>
                      <button
                        onClick={() => abrir("rechazar")}
                        className={boton + " flex-1 text-rose-700"}
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              )}
            {esTitular &&
              ["borrador", "en_revision", "requiere_correccion"].includes(
                solicitud.estado,
              ) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      navigate("/solicitar-evento?editar=" + solicitud.id)
                    }
                    className={primario}
                  >
                    {solicitud.estado === "borrador"
                      ? "Continuar borrador"
                      : solicitud.estado === "requiere_correccion"
                        ? "Corregir solicitud"
                        : "Editar solicitud"}
                  </button>
                  <button
                    onClick={() => abrir("cancelar")}
                    className={boton + " text-rose-700"}
                  >
                    Cancelar solicitud
                  </button>
                </div>
              )}
            {!esTitular && !esRevisor && (
              <p className="mt-3 text-sm text-neutral-600">
                Consulta autorizada. La resolución corresponde a Subdirección.
              </p>
            )}
          </section>
        </aside>
      </div>
      {accion && (
        <VentanaModal
          estaAbierto
          alCerrar={() => setAccion(null)}
          titulo={
            accion === "autorizar"
              ? solicitud.esExcepcional
                ? "Confirmar creación extraordinaria"
                : "Confirmar autorización"
              : accion === "devolver"
                ? "Pedir correcciones"
                : accion === "rechazar"
                  ? "Rechazar solicitud"
                  : "Cancelar solicitud"
          }
          anchoMaximo="lg"
        >
          <div className="space-y-4 text-sm">
            <p>
              <strong>{solicitud.tituloEvento}</strong> · Versión revisada{" "}
              {versionConsultada}
            </p>
            {accion === "autorizar" && (
              <p>
                Se comprobarán los recintos y horarios antes de registrar la
                decisión.
                {solicitud.esExcepcional
                  ? " Subdirección confirma expresamente la creación del evento vinculado, conservando al solicitante como organizador."
                  : ""}
              </p>
            )}
            {accion === "cancelar" && (
              <p>
                La solicitud quedará cancelada en el historial y no podrá
                reenviarse.
              </p>
            )}
            {(accion === "rechazar" || accion === "devolver") && (
              <label className="block font-semibold">
                {accion === "devolver"
                  ? "Qué debe corregir el solicitante"
                  : "Motivo del rechazo"}
                <textarea
                  autoFocus
                  rows={4}
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="mt-2 w-full rounded-xl border p-3 font-normal"
                />
                {accion === "devolver" && (
                  <span className="mt-2 block font-normal text-neutral-600">
                    Tendrá 24 horas para corregir y reenviar.
                  </span>
                )}
              </label>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-3 text-rose-800"
              >
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button className={boton} onClick={() => setAccion(null)}>
                Volver al detalle
              </button>
              <button
                className={primario}
                onClick={ejecutar}
                disabled={
                  (accion === "rechazar" || accion === "devolver") &&
                  !motivo.trim()
                }
              >
                {accion === "autorizar"
                  ? solicitud.esExcepcional
                    ? "Crear evento vinculado"
                    : "Autorizar solicitud"
                  : accion === "devolver"
                    ? "Enviar correcciones"
                    : accion === "rechazar"
                      ? "Confirmar rechazo"
                      : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </VentanaModal>
      )}
    </div>
  );
};
