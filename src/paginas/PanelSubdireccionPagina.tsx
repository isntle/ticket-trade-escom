import {
  inicioEnMexico,
  fechaHoyMexico,
  esFechaUrgente,
} from "../dominio/solicitudes";
import { SolicitudesSubdireccion } from "../componentes/recintos/SolicitudesSubdireccion";
import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Ban,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  Shield,
  FileText,
  Monitor,
  Eye,
  AlertCircle,
} from "lucide-react";
import { useDatos } from "../contextos/DatosContexto";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useNotificaciones } from "../contextos/NotificacionesContexto";
import { InsigniaEstado } from "../componentes/ui/InsigniaEstado";
import { VentanaModal } from "../componentes/ui/VentanaModal";
import { VisorDisponibilidadRecintos } from "../componentes/recintos/VisorDisponibilidadRecintos";
import { SolicitudEvento, Recinto } from "../tipos";

interface PropiedadesPanelSubdireccion {
  navigate: (ruta: string) => void;
  initialTab?: "solicitudes" | "agenda" | "bloqueos" | "evento_directo";
}

export const PanelSubdireccionPagina: React.FC<
  PropiedadesPanelSubdireccion
> = ({ navigate, initialTab = "solicitudes" }) => {
  const {
    listaSolicitudes,
    listaRecintos,
    listaBloqueos,
    crearBloqueoRecinto,
    eliminarBloqueoRecinto,
    crearEventoInstitucionalDirecto,
    verificarDisponibilidadRecinto,
  } = useDatos();

  const { usuarioActual } = useAutenticacion();
  const esAdministrador = Boolean(usuarioActual?.roles.includes("admin"));
  const esSubdireccion = Boolean(usuarioActual?.roles.includes("subdireccion"));
  const { mostrarNotificacion } = useNotificaciones();

  const [pestañaActiva, setPestañaActiva] = useState<
    "solicitudes" | "agenda" | "bloqueos" | "evento_directo"
  >(initialTab);

  useEffect(() => {
    setPestañaActiva(initialTab);
  }, [initialTab]);

  const cambiarPestaña = (
    pestaña: "solicitudes" | "agenda" | "bloqueos" | "evento_directo",
  ) => {
    setPestañaActiva(pestaña);
    navigate(`/subdireccion?tab=${pestaña}`);
  };

  // Estados para nuevo bloqueo de recinto
  const [modalNuevoBloqueo, setModalNuevoBloqueo] = useState(false);
  const [tipoAlcanceBloqueo, setTipoAlcanceBloqueo] = useState<
    "individual" | "multiple" | "todos"
  >("individual");
  const [recintoBloqueo, setRecintoBloqueo] = useState("rec-auditorio");
  const [recintosSeleccionadosMulti, setRecintosSeleccionadosMulti] = useState<
    string[]
  >(["rec-auditorio", "rec-sala14"]);
  const [tituloBloqueo, setTituloBloqueo] = useState("");
  const [motivoBloqueo, setMotivoBloqueo] = useState("");
  const [observacionesBloqueo, setObservacionesBloqueo] = useState("");
  const [fechaInicioBloqueo, setFechaInicioBloqueo] =
    useState(fechaHoyMexico());
  const [fechaFinBloqueo, setFechaFinBloqueo] = useState(fechaHoyMexico());
  const [bloqueoIndefinido, setBloqueoIndefinido] = useState(false);

  // Estados para creación directa de evento institucional
  const [tituloEventoDirecto, setTituloEventoDirecto] = useState("");
  const [descripcionEventoDirecto, setDescripcionEventoDirecto] = useState("");
  const [fechaEventoDirecto, setFechaEventoDirecto] =
    useState(fechaHoyMexico());
  const [horaInicioEventoDirecto, setHoraInicioEventoDirecto] =
    useState("10:00");
  const [horaFinEventoDirecto, setHoraFinEventoDirecto] = useState("13:00");
  const [recintoEventoDirecto, setRecintoEventoDirecto] =
    useState("rec-auditorio");

  const solicitudesPendientes = listaSolicitudes.filter((s) =>
    ["en_revision", "requiere_correccion"].includes(s.estado),
  );
  const solicitudesUrgentes = solicitudesPendientes.filter(
    (s) =>
      s.esExcepcional && s.fechasSolicitadas.some((dia) => esFechaUrgente(dia)),
  );

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : "Recinto ESCOM";
  };

  const manejarCrearBloqueo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esAdministrador) return;
    if (!tituloBloqueo.trim() || !motivoBloqueo.trim()) return;

    const idRecintoFinal =
      tipoAlcanceBloqueo === "todos" ? "todos" : recintoBloqueo;
    const idsRecintosFinal =
      tipoAlcanceBloqueo === "multiple"
        ? recintosSeleccionadosMulti
        : undefined;

    crearBloqueoRecinto({
      idRecinto: idRecintoFinal,
      idsRecintos: idsRecintosFinal,
      titulo: tituloBloqueo,
      motivo: motivoBloqueo,
      observaciones: observacionesBloqueo.trim() || undefined,
      fechaInicio: fechaInicioBloqueo,
      horaInicio: "08:00",
      fechaFin: bloqueoIndefinido ? undefined : fechaFinBloqueo,
      horaFin: bloqueoIndefinido ? undefined : "18:00",
      esIndefinido: bloqueoIndefinido,
      creadoPor: usuarioActual?.nombre || "Subdirección",
    });

    setModalNuevoBloqueo(false);
    setTituloBloqueo("");
    setMotivoBloqueo("");
    setObservacionesBloqueo("");
    mostrarNotificacion(
      "Bloqueo registrado",
      "El bloqueo quedó formalmente activo en el calendario institucional.",
      "exito",
    );
  };

  const manejarCrearEventoDirecto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloEventoDirecto.trim() || !descripcionEventoDirecto.trim()) {
      mostrarNotificacion(
        "Datos incompletos",
        "El título y la descripción son obligatorios para publicar el evento.",
        "advertencia",
      );
      return;
    }
    if (
      !esSubdireccion ||
      inicioEnMexico(fechaEventoDirecto, horaInicioEventoDirecto) <=
        Date.now() ||
      horaFinEventoDirecto <= horaInicioEventoDirecto
    ) {
      mostrarNotificacion(
        "Fecha no válida",
        "La fecha del evento debe ser futura.",
        "error",
      );
      return;
    }
    const disponibilidad = verificarDisponibilidadRecinto(
      recintoEventoDirecto,
      fechaEventoDirecto,
      horaInicioEventoDirecto,
      horaFinEventoDirecto,
    );
    if (!disponibilidad.disponible) {
      mostrarNotificacion(
        "Recinto no disponible",
        disponibilidad.motivo || "Selecciona otro día o recinto.",
        "error",
      );
      return;
    }

    const nuevo = crearEventoInstitucionalDirecto({
      titulo: tituloEventoDirecto,
      descripcion: descripcionEventoDirecto,
      categoria: "Institucional",
      visibilidad: "interno",
      modalidadAsistencia: "libre",
      fechas: [
        {
          id: `fec-inst-${Date.now()}`,
          idEvento: "",
          fecha: fechaEventoDirecto,
          horaInicio: horaInicioEventoDirecto,
          horaFin: horaFinEventoDirecto,
          idRecinto: recintoEventoDirecto,
          esFinalConfirmado: true,
          ponentes: ["Subdirección ESCOM"],
        },
      ],
    });

    setTituloEventoDirecto("");
    setDescripcionEventoDirecto("");
    mostrarNotificacion(
      "Evento Institucional Registrado",
      "Se creó directamente sin solicitud previa.",
      "exito",
    );
    navigate(`/organizador/eventos/${nuevo.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Cabecera de Trabajo */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-sm font-bold text-[#7a132b] ">
            Organización y recintos
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
            Subdirección de Servicios Educativos e Integración Social
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Revisa solicitudes, consulta la agenda y da seguimiento a los
            eventos y recintos.
          </p>
        </div>

        {/* Resumen Operativo Inmediato (Action-Oriented) */}
        <div className="flex items-center gap-3 bg-neutral-50 p-2 rounded-xl border border-neutral-200 text-sm shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
            <span className="text-sm text-neutral-400 block font-bold uppercase">
              Pendientes
            </span>
            <span className="font-bold text-[#7a132b] text-sm">
              {solicitudesPendientes.length}
            </span>
            {solicitudesUrgentes.length > 0 && (
              <span className="text-sm text-amber-700 font-semibold block">
                ({solicitudesUrgentes.length} urgente)
              </span>
            )}
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
            <span className="text-sm text-neutral-400 block font-bold uppercase">
              Bloqueos
            </span>
            <span className="font-bold text-neutral-800 text-sm">
              {listaBloqueos.length}
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
            <span className="text-sm text-neutral-400 block font-bold uppercase">
              Recintos
            </span>
            <span className="font-bold text-neutral-800 text-sm">
              {listaRecintos.length - 1}
            </span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación de Trabajo */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 mb-6">
        <button
          type="button"
          onClick={() => cambiarPestaña("solicitudes")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            pestañaActiva === "solicitudes"
              ? "border-[#7a132b] text-[#7a132b]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <span>Solicitudes</span>
          {solicitudesPendientes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#7a132b] text-white text-sm font-bold">
              {solicitudesPendientes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => cambiarPestaña("agenda")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestañaActiva === "agenda"
              ? "border-[#7a132b] text-[#7a132b]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => cambiarPestaña("bloqueos")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestañaActiva === "bloqueos"
              ? "border-[#7a132b] text-[#7a132b]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Bloqueos de recintos ({listaBloqueos.length})</span>
        </button>

        <button
          type="button"
          disabled={!esSubdireccion}
          onClick={() => cambiarPestaña("evento_directo")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestañaActiva === "evento_directo"
              ? "border-[#7a132b] text-[#7a132b]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crear evento</span>
        </button>
      </div>

      {pestañaActiva === "solicitudes" && (
        <SolicitudesSubdireccion navigate={navigate} />
      )}

      {/* Pestaña: Agenda */}
      {pestañaActiva === "agenda" && (
        <div className="space-y-6">
          <VisorDisponibilidadRecintos />
        </div>
      )}

      {/* Pestaña: Bloqueos de recintos (Soporta múltiples recintos o todas las instalaciones) */}
      {pestañaActiva === "bloqueos" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 ">
                  Bloqueos de recintos ({listaBloqueos.length})
                </h2>
                <p className="text-sm text-neutral-500">
                  Permite inhabilitar un recinto, múltiples recintos o todas las
                  instalaciones por obras, actividades de rectoría o
                  emergencias.
                </p>
              </div>

              <button
                type="button"
                disabled={!esAdministrador}
                title={
                  esAdministrador
                    ? "Registrar bloqueo"
                    : "El Administrador gestiona los bloqueos de recintos"
                }
                onClick={() => setModalNuevoBloqueo(true)}
                className="boton-primario px-3.5 py-2 text-sm flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar bloqueo</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {listaBloqueos.map((b) => {
                const nombreR =
                  b.idRecinto === "todos"
                    ? "TODAS LAS INSTALACIONES (Bloqueo General)"
                    : b.idsRecintos && b.idsRecintos.length > 0
                      ? `Múltiples recintos (${b.idsRecintos.map(obtenerNombreRecinto).join(", ")})`
                      : obtenerNombreRecinto(b.idRecinto);

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-bold text-rose-950 text-sm">
                          {b.titulo}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-sm">
                          {nombreR}
                        </span>
                        {b.esIndefinido && (
                          <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-bold text-sm">
                            Indefinido
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-700">{b.motivo}</p>
                      {b.observaciones && (
                        <p className="text-sm text-neutral-500 italic">
                          Obs: {b.observaciones}
                        </p>
                      )}
                      <div className="text-sm text-neutral-500">
                        Vigencia: {b.fechaInicio} a{" "}
                        {b.fechaFin || "Tiempo indeterminado"} · Registrado por:{" "}
                        {b.creadoPor}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!esAdministrador}
                      onClick={() =>
                        esAdministrador && eliminarBloqueoRecinto(b.id)
                      }
                      className="p-2 border border-neutral-300 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer shrink-0"
                      title="Eliminar bloqueo y liberar recinto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Evento Directo */}
      {pestañaActiva === "evento_directo" && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-neutral-900 ">
            Registro Directo de Evento Institucional
          </h2>
          <p className="text-sm text-neutral-500">
            Facultad de Subdirección para dar de alta ceremonias oficiales o
            acreditaciones institucionales de forma inmediata sin someterse al
            trámite ordinario de solicitud.
          </p>

          <form
            onSubmit={manejarCrearEventoDirecto}
            className="space-y-4 text-sm"
          >
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Título del Evento Oficial *
              </label>
              <input
                type="text"
                required
                value={tituloEventoDirecto}
                onChange={(e) => setTituloEventoDirecto(e.target.value)}
                placeholder="ej: Ceremonia de Graduación Generación 2026"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Descripción
              </label>
              <textarea
                rows={3}
                required
                value={descripcionEventoDirecto}
                onChange={(e) => setDescripcionEventoDirecto(e.target.value)}
                placeholder="Detalle oficial de la actividad institucional..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  min={fechaHoyMexico()}
                  value={fechaEventoDirecto}
                  onChange={(e) => setFechaEventoDirecto(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Recinto
                </label>
                <select
                  value={recintoEventoDirecto}
                  onChange={(e) => setRecintoEventoDirecto(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  {listaRecintos
                    .filter((r) => r.activo !== false)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} ({r.capacidad} lugares)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Hora de inicio
                <input
                  aria-label="Hora de inicio del evento propio"
                  type="time"
                  required
                  value={horaInicioEventoDirecto}
                  onChange={(e) => setHoraInicioEventoDirecto(e.target.value)}
                  className="mt-1 block w-full rounded-xl border p-2.5"
                />
              </label>
              <label className="text-sm font-semibold">
                Hora de término
                <input
                  aria-label="Hora de término del evento propio"
                  type="time"
                  required
                  value={horaFinEventoDirecto}
                  onChange={(e) => setHoraFinEventoDirecto(e.target.value)}
                  className="mt-1 block w-full rounded-xl border p-2.5"
                />
              </label>
            </div>
            <button
              type="submit"
              className="boton-primario px-5 py-2.5 text-sm font-bold cursor-pointer shadow-xs"
            >
              Crear evento y continuar
            </button>
          </form>
        </div>
      )}

      {/* Modal de Nuevo Bloqueo Extraordinario (1 recinto, múltiples, o todos) */}
      {modalNuevoBloqueo && (
        <VentanaModal
          estaAbierto={modalNuevoBloqueo}
          alCerrar={() => setModalNuevoBloqueo(false)}
          titulo="Registrar bloqueo de recintos"
          anchoMaximo="lg"
        >
          <form onSubmit={manejarCrearBloqueo} className="space-y-4 text-sm">
            {/* Alcance del Bloqueo */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1.5">
                Recintos afectados
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAlcanceBloqueo("individual")}
                  className={`p-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    tipoAlcanceBloqueo === "individual"
                      ? "border-[#7a132b] bg-[#7a132b]/5 text-[#7a132b]"
                      : "border-neutral-200 text-neutral-600"
                  }`}
                >
                  Un solo recinto
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAlcanceBloqueo("multiple")}
                  className={`p-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    tipoAlcanceBloqueo === "multiple"
                      ? "border-[#7a132b] bg-[#7a132b]/5 text-[#7a132b]"
                      : "border-neutral-200 text-neutral-600"
                  }`}
                >
                  Varios recintos
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAlcanceBloqueo("todos")}
                  className={`p-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    tipoAlcanceBloqueo === "todos"
                      ? "border-rose-600 bg-rose-50 text-rose-800"
                      : "border-neutral-200 text-neutral-600"
                  }`}
                >
                  Todas las instalaciones
                </button>
              </div>
            </div>

            {tipoAlcanceBloqueo === "individual" && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Recinto a Bloquear
                </label>
                <select
                  value={recintoBloqueo}
                  onChange={(e) => setRecintoBloqueo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  {listaRecintos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.tipo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipoAlcanceBloqueo === "multiple" && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Selecciona los recintos a inhabilitar:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-neutral-200 rounded-xl bg-neutral-50">
                  {listaRecintos
                    .filter((r) => r.id !== "rec-lab-computo-3")
                    .map((r) => {
                      const estaSeleccionado =
                        recintosSeleccionadosMulti.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={estaSeleccionado}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRecintosSeleccionadosMulti((prev) => [
                                  ...prev,
                                  r.id,
                                ]);
                              } else {
                                setRecintosSeleccionadosMulti((prev) =>
                                  prev.filter((id) => id !== r.id),
                                );
                              }
                            }}
                          />
                          <span className="truncate">{r.nombre}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Título del Bloqueo *
              </label>
              <input
                type="text"
                required
                value={tituloBloqueo}
                onChange={(e) => setTituloBloqueo(e.target.value)}
                placeholder="ej: Mantenimiento Preventivo Semestral o Actividad Rectoría"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Motivo del bloqueo *
              </label>
              <textarea
                rows={2}
                required
                value={motivoBloqueo}
                onChange={(e) => setMotivoBloqueo(e.target.value)}
                placeholder="Razón operativa o justificación de infraestructura..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Observaciones Opcionales
              </label>
              <input
                type="text"
                value={observacionesBloqueo}
                onChange={(e) => setObservacionesBloqueo(e.target.value)}
                placeholder="ej: Permitido únicamente el ingreso a personal de mantenimiento con gafete"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  required
                  value={fechaInicioBloqueo}
                  onChange={(e) => setFechaInicioBloqueo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              {!bloqueoIndefinido && (
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaFinBloqueo}
                    onChange={(e) => setFechaFinBloqueo(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-neutral-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={bloqueoIndefinido}
                onChange={(e) => setBloqueoIndefinido(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span className="font-semibold text-rose-900">
                Bloqueo por tiempo indeterminado (hasta nuevo aviso)
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
              >
                Confirmar Bloqueo
              </button>
              <button
                type="button"
                onClick={() => setModalNuevoBloqueo(false)}
                className="px-4 py-2.5 border border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </VentanaModal>
      )}
    </div>
  );
};
