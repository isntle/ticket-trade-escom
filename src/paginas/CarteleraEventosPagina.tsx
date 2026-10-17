import React, { useState, useMemo } from "react";
import {
  Search,
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  Ticket,
  Building,
  Monitor,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useDatos } from "../contextos/DatosContexto";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { EstadoVacio } from "../componentes/ui/EstadoVacio";
import { Evento, CategoriaEvento } from "../tipos";
import { inicioEnMexico } from "../dominio/solicitudes";

interface PropiedadesCarteleraEventos {
  navigate: (ruta: string) => void;
}

const tieneSesionFutura = (evento: Evento): boolean =>
  evento.fechas.some((fecha) => {
    const finSesion = inicioEnMexico(fecha.fecha, fecha.horaFin);
    return (
      !fecha.cancelada && Number.isFinite(finSesion) && finSesion >= Date.now()
    );
  });

export const CarteleraEventosPagina: React.FC<PropiedadesCarteleraEventos> = ({
  navigate,
}) => {
  const { listaEventos, listaRecintos } = useDatos();
  const { usuarioActual } = useAutenticacion();

  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<string>("todos");
  const [modalidadSeleccionada, setModalidadSeleccionada] =
    useState<string>("todos");
  const [periodo, setPeriodo] = useState("proximos");

  const categorias: ("todos" | CategoriaEvento)[] = [
    "todos",
    "Congreso",
    "Conferencia",
    "Taller",
    "Académico",
    "Institucional",
  ];

  // Filtrado de eventos visibles (públicos e internos si es de la comunidad, excluyendo privados sin enlace directo)
  const eventosFiltrados = useMemo(() => {
    return listaEventos.filter((evento) => {
      if (evento.estado !== "publicado") return false;
      if (evento.visibilidad === "privado") return false;
      if (
        periodo === "proximos"
          ? !tieneSesionFutura(evento)
          : tieneSesionFutura(evento)
      )
        return false;

      // Filtro de búsqueda por título, descripción o ponentes
      const coincideBusqueda =
        evento.titulo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        evento.descripcion
          .toLowerCase()
          .includes(terminoBusqueda.toLowerCase()) ||
        evento.ponentes.some((p) =>
          p.toLowerCase().includes(terminoBusqueda.toLowerCase()),
        );

      if (!coincideBusqueda) return false;

      // Filtro por categoría temática
      if (
        categoriaSeleccionada !== "todos" &&
        evento.categoria !== categoriaSeleccionada
      ) {
        return false;
      }

      // Filtro por modalidad de asistencia
      if (
        modalidadSeleccionada !== "todos" &&
        evento.modalidadAsistencia !== modalidadSeleccionada
      ) {
        return false;
      }

      return true;
    });
  }, [
    listaEventos,
    terminoBusqueda,
    categoriaSeleccionada,
    modalidadSeleccionada,
    periodo,
  ]);

  const obtenerNombreRecinto = (idRecinto: string) => {
    const recinto = listaRecintos.find((r) => r.id === idRecinto);
    return recinto ? recinto.nombre : "Recinto ESCOM";
  };

  // Evento destacado (Hero) y resto de la programación cronológica
  const eventoDestacado = eventosFiltrados[0];
  const eventosSiguientes = eventosFiltrados.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado Principal Editorial */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider block mb-1">
            Escuela Superior de Cómputo · Instituto Politécnico Nacional
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
            Cartelera Académica y Eventos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
            Conferencias magistrales, simposios de investigación, hackathons en
            laboratorios y actividades institucionales oficiales.
          </p>
        </div>

        {usuarioActual?.roles.includes("organizador") && (
          <button
            type="button"
            onClick={() => navigate("/solicitar-evento")}
            className="boton-primario px-4 py-2.5 text-xs font-bold inline-flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
          >
            <span>+ Solicitar nuevo evento</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. FILTROS Y BÚSQUEDA INTERACTIVA (Segmented Controls)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 mb-8 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              placeholder="Buscar por nombre de evento, ponente o tema..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-[#7a132b] transition-all"
            />
          </div>

          {/* Filtro por Modalidad */}
          <select
            aria-label="Periodo de los eventos"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
          >
            <option value="proximos">Próximos y en curso</option>
            <option value="anteriores">Eventos anteriores</option>
          </select>
          <div className="flex items-center gap-2">
            <select
              value={modalidadSeleccionada}
              onChange={(e) => setModalidadSeleccionada(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-700 focus:outline-none focus:border-[#7a132b] cursor-pointer"
            >
              <option value="todos">Todas las modalidades</option>
              <option value="controlado">Acceso Controlado (QR)</option>
              <option value="libre">Acceso Libre</option>
              <option value="registro">Registro de Asistencia</option>
            </select>
          </div>
        </div>

        {/* Píldoras de Categoría Segmentadas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
          {categorias.map((cat) => {
            const activa = categoriaSeleccionada === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activa
                    ? "bg-[#7a132b] text-white shadow-2xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                }`}
              >
                {cat === "todos" ? "Todos los Eventos" : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* === INICIO CÓDIGO TRAYECTORIA A === */}
      {periodo === "proximos" &&
      !listaEventos.some(
        (evento) =>
          evento.estado === "publicado" &&
          evento.visibilidad !== "privado" &&
          tieneSesionFutura(evento),
      ) ? (
        <EstadoVacio
          icono={<Calendar className="w-8 h-8 text-neutral-400" />}
          titulo="Sin eventos próximos"
          descripcion="Actualmente no hay eventos próximos en la cartelera."
        />
      ) : eventosFiltrados.length === 0 ? (
        <EstadoVacio
          icono={<Search className="w-8 h-8 text-neutral-400" />}
          titulo="Sin resultados"
          descripcion="No se encontraron resultados con los filtros seleccionados."
          textoAccion="Restablecer filtros"
          alHacerAccion={() => {
            setTerminoBusqueda("");
            setCategoriaSeleccionada("todos");
            setModalidadSeleccionada("todos");
          }}
        />
      ) : (
        <div className="space-y-10">
          {/* === FIN CÓDIGO TRAYECTORIA A === */}
          {/* ========================================================================= */}
          {/* 2. EVENTO DESTACADO (HERO EDITORIAL CARD)                                */}
          {/* ========================================================================= */}
          {eventoDestacado && (
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-3">
                {periodo === 'anteriores' ? 'Evento del historial' : 'Encuentro Principal Destacado'}
              </span>

              <div
                onClick={() => navigate(`/eventos/${eventoDestacado.id}`)}
                className="group relative bg-white rounded-3xl border border-neutral-300 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer grid grid-cols-1 lg:grid-cols-12"
              >
                {/* Imagen del Evento */}
                <div className="lg:col-span-5 h-64 lg:h-auto relative overflow-hidden bg-neutral-900">
                  {eventoDestacado.urlImagen && (
                    <img
                      src={eventoDestacado.urlImagen}
                      alt={eventoDestacado.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute top-4 left-4">
                    <span className="text-xs font-mono font-bold text-white bg-black/60 backdrop-blur-xs px-3 py-1 rounded-lg uppercase tracking-wider">
                      {eventoDestacado.categoria}
                    </span>
                  </div>
                </div>

                {/* Contenido del Evento Destacado */}
                <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Metadatos limpios sin pills saturadas */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      <span className="font-bold text-[#7a132b]">
                        {eventoDestacado.fechas[0]?.fecha}
                      </span>
                      <span aria-hidden="true" className="text-neutral-300">
                        ·
                      </span>
                      <span className="font-mono text-neutral-700 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        {eventoDestacado.fechas[0]?.horaInicio} -{" "}
                        {eventoDestacado.fechas[0]?.horaFin} hrs
                      </span>
                      <span aria-hidden="true" className="text-neutral-300">
                        ·
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-neutral-800">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        {obtenerNombreRecinto(
                          eventoDestacado.fechas[0]?.idRecinto || "",
                        )}
                      </span>
                      <span aria-hidden="true" className="text-neutral-300">
                        ·
                      </span>
                      <span className="capitalize text-neutral-600">
                        {eventoDestacado.modalidadAsistencia === "controlado"
                          ? "Acceso con Butaca Numerada"
                          : "Acceso Libre"}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug group-hover:text-[#7a132b] transition-colors">
                      {eventoDestacado.titulo}
                    </h2>

                    <p className="text-xs sm:text-sm text-neutral-600 line-clamp-3 leading-relaxed">
                      {eventoDestacado.descripcion}
                    </p>

                    {eventoDestacado.ponentes &&
                      eventoDestacado.ponentes.length > 0 && (
                        <div className="text-xs text-neutral-500 pt-1">
                          Ponentes destacados:{" "}
                          <strong className="text-neutral-800">
                            {eventoDestacado.ponentes.slice(0, 2).join(", ")}
                          </strong>
                        </div>
                      )}
                  </div>

                  {/* Acciones de la tarjeta destacada */}
                  <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400">
                      {eventoDestacado.fechas.length} día(s) programado(s)
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/eventos/${eventoDestacado.id}`);
                      }}
                      className="boton-primario px-5 py-2.5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <span>Consultar detalle del evento</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. PROGRAMACIÓN CRONOLÓGICA DE PRÓXIMOS EVENTOS (CARDS EDITORIALES)     */}
          {/* ========================================================================= */}
          {eventosSiguientes.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-4">
              {periodo === 'anteriores' ? 'Más eventos anteriores' : 'Próximos Encuentros y Talleres'}
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventosSiguientes.map((evento) => {
                  const fechaPrincipal = evento.fechas[0];
                  const esLaboratorio =
                    evento.titulo.toLowerCase().includes("laboratorio") ||
                    evento.titulo.toLowerCase().includes("gpu") ||
                    evento.titulo.toLowerCase().includes("hackathon") ||
                    fechaPrincipal?.idRecinto.includes("lab");

                  return (
                    <div
                      key={evento.id}
                      onClick={() => navigate(`/eventos/${evento.id}`)}
                      className="group bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      {/* Cabecera visual del card */}
                      <div>
                        {evento.urlImagen && (
                          <div className="h-44 w-full bg-neutral-900 relative overflow-hidden">
                            <img
                              src={evento.urlImagen}
                              alt={evento.titulo}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                            />
                            <div className="absolute top-3 left-3">
                              <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded uppercase">
                                {evento.categoria}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="p-5 space-y-2.5">
                          {/* Metadatos limpios */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 font-mono">
                            <span className="font-bold text-[#7a132b]">
                              {fechaPrincipal?.fecha}
                            </span>
                            <span
                              aria-hidden="true"
                              className="text-neutral-300"
                            >
                              ·
                            </span>
                            <span>
                              {fechaPrincipal?.horaInicio} -{" "}
                              {fechaPrincipal?.horaFin} hrs
                            </span>
                            <span
                              aria-hidden="true"
                              className="text-neutral-300"
                            >
                              ·
                            </span>
                            <span className="truncate">
                              {obtenerNombreRecinto(
                                fechaPrincipal?.idRecinto || "",
                              )}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-sm sm:text-base text-neutral-900 leading-snug group-hover:text-[#7a132b] transition-colors line-clamp-2">
                            {evento.titulo}
                          </h3>

                          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                            {evento.descripcion}
                          </p>

                          {esLaboratorio && (
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50/70 p-2 rounded-lg">
                              <Monitor className="w-3.5 h-3.5 text-blue-600" />
                              <span>
                                Sesión con Estaciones de Cómputo (Lab 3)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pie del card */}
                      <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-neutral-400 capitalize">
                          {evento.modalidadAsistencia}
                        </span>

                        <span className="font-bold text-[#7a132b] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>Detalles</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
