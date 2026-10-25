import { GestionBloqueos } from '../componentes/recintos/GestionBloqueos';
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

    try {
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
    } catch(error){mostrarNotificacion('No se creó el evento',error instanceof Error?error.message:'No se pudo guardar el evento.','error');}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-5 flex flex-wrap gap-3">{esSubdireccion && <><button className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-[#7a132b]" onClick={()=>navigate('/subdireccion/verificaciones')}>Solicitudes de verificación</button><button className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-[#7a132b]" onClick={()=>navigate('/subdireccion/jefes-academia')}>Jefes de academia y periodos</button></>}</div>
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

      {pestañaActiva === 'bloqueos' && <GestionBloqueos navigate={navigate} />}

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

    </div>
  );
};
