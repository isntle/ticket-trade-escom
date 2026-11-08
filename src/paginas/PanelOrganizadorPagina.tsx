import {
  filtrarPorTituloYEstado,
  nombreEstadoOrganizador,
} from "../dominio/filtrosOrganizador";
import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Calendar,
  FileText,
  Settings,
  Users,
  ArrowRight,
  Layers,
  MapPin,
  Eye,
  Search,
  X,
} from "lucide-react";
import { useDatos } from "../contextos/DatosContexto";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { InsigniaEstado } from "../componentes/ui/InsigniaEstado";
import { EstadoVacio } from "../componentes/ui/EstadoVacio";

interface PropiedadesPanelOrganizador {
  navigate: (ruta: string) => void;
  soloSolicitudes?: boolean;
}

export const PanelOrganizadorPagina: React.FC<PropiedadesPanelOrganizador> = ({
  navigate,
  soloSolicitudes = false,
}) => {
  const { listaEventos, listaSolicitudes, listaRecintos, listaArreglos } =
    useDatos();
  const { usuarioActual } = useAutenticacion();

  const [pestañaActiva, setPestañaActiva] = useState<
    "eventos" | "solicitudes" | "arreglos"
  >(soloSolicitudes ? "solicitudes" : "eventos");

  // Estados de filtrado por búsqueda y estado
  const [busqueda, setBusqueda] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("TODOS");

  // Filtrar eventos y solicitudes donde el usuario es el propietario / organizador
  const misEventos = usuarioActual
    ? listaEventos.filter((e) => e.idOrganizador === usuarioActual.id)
    : [];
  const misSolicitudes = usuarioActual
    ? listaSolicitudes.filter((s) => s.idSolicitante === usuarioActual.id)
    : [];
  const misArreglos = listaArreglos.filter((a) =>
    misEventos.some((e) => e.fechas.some((f) => f.id === a.idFechaEvento)),
  );

  // Obtener estados únicos aplicables para cada pestaña de forma dinámica
  const estadosEventos = useMemo(() => {
    const setEstados = new Set(misEventos.map((e) => e.estado).filter(Boolean));
    return ["TODOS", ...Array.from(setEstados)];
  }, [misEventos]);

  const estadosSolicitudes = useMemo(() => {
    const setEstados = new Set(
      misSolicitudes.map((s) => s.estado).filter(Boolean),
    );
    return ["TODOS", ...Array.from(setEstados)];
  }, [misSolicitudes]);

  const estadosActuales =
    pestañaActiva === "eventos" ? estadosEventos : estadosSolicitudes;

  const estadoEfectivo = estadosActuales.includes(estadoFiltro)
    ? estadoFiltro
    : "TODOS";
  const eventosFiltrados = filtrarPorTituloYEstado(
    misEventos,
    (e) => e.titulo,
    busqueda,
    estadoEfectivo,
  );
  const solicitudesFiltradas = filtrarPorTituloYEstado(
    misSolicitudes,
    (s) => s.tituloEvento,
    busqueda,
    estadoEfectivo,
  );
  useEffect(() => {
    setBusqueda("");
    setEstadoFiltro("TODOS");
    setPestañaActiva(soloSolicitudes ? "solicitudes" : "eventos");
  }, [usuarioActual?.id, soloSolicitudes]);

  // Cambio de pestaña reseteando o adaptando los filtros
  const cambiarPestana = (
    nuevaPestaña: "eventos" | "solicitudes" | "arreglos",
  ) => {
    setPestañaActiva(nuevaPestaña);
    setBusqueda("");
    setEstadoFiltro("TODOS");
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setEstadoFiltro("TODOS");
  };

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : "Recinto ESCOM";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="text-sm font-bold text-[#7a132b]">
            Gestión Académica de Espacios
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-0.5">
            {soloSolicitudes ? "Mis solicitudes" : "Mis eventos y solicitudes"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Tramita propuestas ante Subdirección, edita la distribución de
            butacas en auditorios, salas y laboratorios, y publica tus eventos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/solicitar-evento")}
          className="boton-primario px-4 py-2.5 text-sm inline-flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Solicitar nuevo evento</span>
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex items-center gap-4 border-b border-neutral-200 mb-6 overflow-x-auto">
        {!soloSolicitudes && (
          <button
            type="button"
            onClick={() => cambiarPestana("eventos")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              pestañaActiva === "eventos"
                ? "border-[#7a132b] text-[#7a132b]"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Mis Eventos ({misEventos.length})
          </button>
        )}
        {!soloSolicitudes && (
          <button
            type="button"
            onClick={() => cambiarPestana("arreglos")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              pestañaActiva === "arreglos"
                ? "border-[#7a132b] text-[#7a132b]"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#7a132b]" />
            <span>
              Editor de Distribución de Asientos ({misArreglos.length})
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => cambiarPestana("solicitudes")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            pestañaActiva === "solicitudes"
              ? "border-[#7a132b] text-[#7a132b]"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Solicitudes en Trámite ({misSolicitudes.length})
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros por Estado (Visible en Eventos y Solicitudes) */}
      {(soloSolicitudes ||
        pestañaActiva === "eventos" ||
        pestañaActiva === "solicitudes") && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-1/2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="search"
              aria-label={
                soloSolicitudes || pestañaActiva === "solicitudes"
                  ? "Buscar solicitudes por título"
                  : "Buscar eventos por título"
              }
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                !soloSolicitudes && pestañaActiva === "eventos"
                  ? "Buscar eventos por título..."
                  : "Buscar solicitudes por título..."
              }
              className="w-full pl-9 pr-8 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#7a132b] transition-colors"
            />
            {busqueda && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-neutral-500 whitespace-nowrap">
                Estado:
              </span>
              <select
                value={estadoEfectivo}
                aria-label="Filtrar por estado"
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#7a132b] transition-colors w-full sm:w-auto"
              >
                {estadosActuales.map((est) => (
                  <option key={est} value={est}>
                    {est === "TODOS"
                      ? "Todos los estados"
                      : nombreEstadoOrganizador(est)}
                  </option>
                ))}
              </select>
            </div>

            {(busqueda || estadoFiltro !== "TODOS") && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenido Pestaña Eventos */}
      {!soloSolicitudes && pestañaActiva === "eventos" && (
        <div>
          {misEventos.length === 0 ? (
            <EstadoVacio
              icono={<Calendar className="w-8 h-8" />}
              titulo="No tienes eventos registrados aún"
              descripcion="Envía una solicitud formal a Subdirección para iniciar la reserva de recintos."
              textoAccion="Solicitar nuevo evento"
              alHacerAccion={() => navigate("/solicitar-evento")}
            />
          ) : eventosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center space-y-3 shadow-xs">
              <p className="text-neutral-700 font-semibold text-base">
                No se encontraron eventos que coincidan con tu búsqueda o
                filtro.
              </p>
              <p className="text-sm text-neutral-500">
                Intenta ajustar los términos o restablece los filtros aplicados.
              </p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-4 py-2 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {eventosFiltrados.map((evento) => {
                const fechaPrincipal = evento.fechas[0];
                return (
                  <div
                    key={evento.id}
                    className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-900 text-sm">
                          {evento.titulo}
                        </span>
                        <InsigniaEstado estado={evento.estado} />
                        <InsigniaEstado estado={evento.modalidadAsistencia} />
                      </div>
                      <p className="text-sm text-neutral-500 line-clamp-1">
                        {evento.descripcion}
                      </p>
                      <div className="text-sm text-neutral-400">
                        {evento.fechas.length} fecha(s) programada(s) ·
                        Categoría: {evento.categoria} ·{" "}
                        {fechaPrincipal
                          ? obtenerNombreRecinto(fechaPrincipal.idRecinto)
                          : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {fechaPrincipal && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/organizador/eventos/${evento.id}/fechas/${fechaPrincipal.id}/arreglos`,
                            )
                          }
                          className="px-3.5 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-800 hover:border-[#7a132b] hover:bg-neutral-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#7a132b]" />
                          <span>Diseñar Butacas</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/organizador/eventos/${evento.id}`)
                        }
                        className="px-4 py-2 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configurar y Publicar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Contenido Pestaña Editor de Arreglos / Distribución de Butacas */}
      {!soloSolicitudes && pestañaActiva === "arreglos" && (
        <div className="space-y-6">
          <div className="p-4 bg-[#7a132b]/5 border border-[#7a132b]/20 rounded-2xl text-sm text-neutral-700 flex items-start gap-3">
            <Layers className="w-5 h-5 text-[#7a132b] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-neutral-900 block mb-0.5">
                Editor Visual de Distribución de Asientos por Recinto (1:1)
              </span>
              Personaliza la asignación de butacas (VIP, Staff, Organizadores,
              Asistente General), bloquea lugares por logística y retira módulos
              en espacios flexibles como la Sala 14.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {misArreglos.map((arreglo) => {
              const recinto = listaRecintos.find(
                (r) => r.id === arreglo.idRecinto,
              );
              const evento = listaEventos.find((e) =>
                e.fechas.some((f) => f.id === arreglo.idFechaEvento),
              );

              return (
                <div
                  key={arreglo.id}
                  className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 font-mono text-sm text-neutral-600 font-bold">
                        {arreglo.etiquetaVersion}
                      </span>
                      <InsigniaEstado estado={arreglo.estado} />
                    </div>

                    <div>
                      <h3 className="font-bold text-neutral-900 text-sm">
                        {arreglo.nombre}
                      </h3>
                      <p className="text-sm text-[#7a132b] font-semibold mt-0.5">
                        {recinto?.nombre}
                      </p>
                      {evento && (
                        <p className="text-sm text-neutral-500 line-clamp-1 mt-0.5">
                          Evento: {evento.titulo}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-sm pt-1">
                      <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                        <span className="text-sm text-neutral-400 block">
                          Total
                        </span>
                        <span className="font-bold text-neutral-900">
                          {arreglo.totalAsientos}
                        </span>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="text-sm text-amber-700 block">
                          VIP
                        </span>
                        <span className="font-bold text-amber-800">
                          {arreglo.asientosVip}
                        </span>
                      </div>
                      <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                        <span className="text-sm text-neutral-400 block">
                          Bloqueados
                        </span>
                        <span className="font-bold text-neutral-500">
                          {arreglo.asientosBloqueados}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (!evento) return;
                        const idEvt = evento.id;
                        navigate(
                          `/organizador/eventos/${idEvt}/fechas/${arreglo.idFechaEvento}/arreglos`,
                        );
                      }}
                      className="w-full py-2 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Abrir Editor de Asientos</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenido Pestaña Solicitudes */}
      {(soloSolicitudes || pestañaActiva === "solicitudes") && (
        <div>
          {misSolicitudes.length === 0 ? (
            <EstadoVacio
              icono={<FileText className="w-8 h-8" />}
              titulo="No tienes solicitudes tramitadas"
              descripcion="Las solicitudes enviadas a Subdirección aparecerán aquí con su estado de dictamen."
            />
          ) : solicitudesFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center space-y-3 shadow-xs">
              <p className="text-neutral-700 font-semibold text-base">
                No se encontraron solicitudes que coincidan con tu búsqueda o
                filtro.
              </p>
              <p className="text-sm text-neutral-500">
                Intenta ajustar los términos o restablece los filtros aplicados.
              </p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-4 py-2 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudesFiltradas.map((sol) => (
                <div
                  key={sol.id}
                  className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-neutral-900 text-sm">
                        {sol.tituloEvento}
                      </span>
                      <InsigniaEstado estado={sol.estado} />
                      {sol.esExcepcional && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-sm font-bold">
                          Excepcional
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 line-clamp-1">
                      {sol.descripcionEvento}
                    </p>
                    <div className="text-sm text-neutral-400">
                      Fecha de solicitud:{" "}
                      {new Date(sol.fechaCreacion).toLocaleDateString("es-MX")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/organizador/solicitudes/${sol.id}`)
                    }
                    className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Ver dictamen</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
