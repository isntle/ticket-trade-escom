import React, { useState } from "react";
import {
  Users,
  Shield,
  Check,
  X,
  ShieldAlert,
  ArrowLeft,
  UserPlus,
  Lock,
  KeyRound,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useDatos } from "../contextos/DatosContexto";
import { useNotificaciones } from "../contextos/NotificacionesContexto";
import { RolUsuario, Usuario } from "../tipos";
import { MATRIZ_PERMISOS_ROLES } from "../utilidades/validaciones";

interface PropiedadesAdministracionUsuarios {
  navigate: (ruta: string) => void;
}

export const AdministracionUsuariosPagina: React.FC<
  PropiedadesAdministracionUsuarios
> = ({ navigate }) => {
  const {
    todosLosUsuarios,
    asignarRolesAUsuario,
    asociarStaffAEvento,
    alternarEstadoUsuario,
    cambiarAutoaprobacion,
  } = useAutenticacion();
  const { listaEventos } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();

  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("todos");

  // Modal para gestionar roles
  const [usuarioEditandoRoles, setUsuarioEditandoRoles] =
    useState<Usuario | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<RolUsuario[]>(
    [],
  );
  const [autoaprobar, setAutoaprobar] = useState(false);

  // Modal para asociar staff a eventos
  const [usuarioEditandoStaff, setUsuarioEditandoStaff] =
    useState<Usuario | null>(null);

  const usuariosFiltrados = todosLosUsuarios.filter((u) => {
    const coincideTexto =
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.boleta && u.boleta.includes(busqueda)) ||
      (u.numeroEmpleado &&
        u.numeroEmpleado.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideRol =
      filtroRol === "todos" || u.roles.includes(filtroRol as RolUsuario);

    return coincideTexto && coincideRol;
  });

  const abrirModalRoles = (u: Usuario) => {
    setUsuarioEditandoRoles(u);
    setRolesSeleccionados([...u.roles]);
    setAutoaprobar(u.puedeAutoaprobar === true);
  };

  const alternarRol = (r: RolUsuario) => {
    if (r === "asistente" && rolesSeleccionados.includes("asistente")) {
      mostrarNotificacion(
        "Aviso",
        "El rol de Asistente es la base y no puede removerse.",
        "informacion",
      );
      return;
    }

    if (rolesSeleccionados.includes(r)) {
      setRolesSeleccionados(rolesSeleccionados.filter((item) => item !== r));
    } else {
      setRolesSeleccionados([...rolesSeleccionados, r]);
    }
  };

  const guardarRoles = () => {
    if (!usuarioEditandoRoles) return;
    const res = asignarRolesAUsuario(
      usuarioEditandoRoles.id,
      rolesSeleccionados,
    );
    if (res.exito) {
      const permiso = cambiarAutoaprobacion(
        usuarioEditandoRoles.id,
        autoaprobar,
      );
      if (!permiso.exito) {
        mostrarNotificacion(
          "No se pudo cambiar autoaprobación",
          permiso.mensaje,
          "error",
        );
        return;
      }
      mostrarNotificacion("Permisos Actualizados", res.mensaje, "exito");
      setUsuarioEditandoRoles(null);
    } else {
      mostrarNotificacion("Error", res.mensaje, "error");
    }
  };

  const abrirModalStaff = (u: Usuario) => {
    setUsuarioEditandoStaff(u);
  };

  const alternarAsignacionStaffEvento = (idEvento: string) => {
    if (!usuarioEditandoStaff) return;
    const yaAsignado =
      usuarioEditandoStaff.eventosAsignadosStaff?.includes(idEvento) || false;
    const res = asociarStaffAEvento(
      usuarioEditandoStaff.id,
      idEvento,
      !yaAsignado,
    );
    if (res.exito) {
      mostrarNotificacion("Staff Actualizado", res.mensaje, "exito");
      // Actualizar estado local del modal
      const actuales = usuarioEditandoStaff.eventosAsignadosStaff || [];
      const nuevos = yaAsignado
        ? actuales.filter((id) => id !== idEvento)
        : [...actuales, idEvento];
      setUsuarioEditandoStaff({
        ...usuarioEditandoStaff,
        eventosAsignadosStaff: nuevos,
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate("/eventos")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la cartelera</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/registro")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7a132b] text-white rounded-xl text-xs font-bold hover:bg-[#620f23] transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      <div className="mb-6">
        <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
          Módulo Técnico y de Soporte TI
        </span>
        <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
          Administración de Cuentas, Roles y Permisos
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Configura roles (Asistente, Organizador, Staff, Subdirección, Admin) y
          asocia al personal operativo con sus eventos.
        </p>
      </div>

      <nav className="mb-5 flex flex-wrap gap-3 text-sm">
        <button
          className="rounded-xl border p-3"
          onClick={() => navigate("/admin/expedientes")}
        >
          Revisar expedientes
        </button>
        <button
          className="rounded-xl border p-3"
          onClick={() => navigate("/admin/restricciones")}
        >
          Resolver restricciones
        </button>
        <button
          className="rounded-xl border p-3"
          onClick={() => navigate("/organizador/staff")}
        >
          Asignar personal de acceso
        </button>
      </nav>
      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo, boleta o empleado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:border-[#7a132b]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500 font-semibold text-[11px]">
            Filtrar por Rol:
          </span>
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800"
          >
            <option value="todos">Todos los roles</option>
            <option value="asistente">Asistente</option>
            <option value="organizador">Organizador</option>
            <option value="staff">Staff de Acceso</option>
            <option value="subdireccion">Subdirección</option>
            <option value="admin">Administrador TI</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Usuario / Correo</th>
                <th className="px-5 py-3.5">Afiliación</th>
                <th className="px-5 py-3.5">Identificador IPN</th>
                <th className="px-5 py-3.5">Roles Asignados</th>
                <th className="px-5 py-3.5">Eventos Staff</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {usuariosFiltrados.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-neutral-50/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-neutral-900">{u.nombre}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {u.correo}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 capitalize font-medium text-[11px]">
                      {u.afiliacion}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-neutral-700 text-[11px]">
                    {u.boleta ? (
                      <span title="Boleta ESCOM">Boleta: {u.boleta}</span>
                    ) : u.numeroEmpleado ? (
                      <span title="Empleado IPN">Emp: {u.numeroEmpleado}</span>
                    ) : u.nombreOrganizacion ? (
                      <span title="Entidad">{u.nombreOrganizacion}</span>
                    ) : (
                      <span className="text-neutral-400">N/A</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-700 font-semibold text-[10px] capitalize"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    {u.roles.includes("staff") ? (
                      <button
                        type="button"
                        onClick={() => abrirModalStaff(u)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                      >
                        {u.eventosAsignadosStaff?.length || 0} asignados
                      </button>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => alternarEstadoUsuario(u.id)}
                      className={`inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer ${
                        u.estaActivo
                          ? "text-emerald-700"
                          : "text-neutral-400 line-through"
                      }`}
                    >
                      {u.estaActivo ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>Suspendido</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => abrirModalRoles(u)}
                      className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-semibold text-[11px] transition-colors"
                    >
                      Editar Roles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriz de Permisos Institucional como Referencia */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#7a132b]" />
          <span>Matriz Oficial de Capacidades y Permisos por Rol</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {MATRIZ_PERMISOS_ROLES.map((matriz) => (
            <div
              key={matriz.rol}
              className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col justify-between"
            >
              <div>
                <span className="font-bold text-neutral-900 text-sm block mb-1">
                  {matriz.nombre}
                </span>
                <p className="text-[11px] text-neutral-500 mb-3">
                  {matriz.descripcion}
                </p>
                <ul className="space-y-1.5 text-[11px] text-neutral-700">
                  {matriz.permisos.map((p, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#7a132b] font-bold mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDITAR ROLES                                                     */}
      {/* ========================================================================= */}
      {usuarioEditandoRoles && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-neutral-200 text-xs animate-in zoom-in-95">
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              Configurar Roles de Usuario
            </h3>
            <p className="text-neutral-500 text-[11px] mb-4">
              {usuarioEditandoRoles.nombre} ({usuarioEditandoRoles.correo})
            </p>

            <div className="space-y-2 mb-6">
              {(
                [
                  "asistente",
                  "organizador",
                  "staff",
                  "subdireccion",
                  "admin",
                ] as RolUsuario[]
              ).map((rol) => {
                const seleccionado = rolesSeleccionados.includes(rol);
                return (
                  <button
                    key={rol}
                    type="button"
                    onClick={() => alternarRol(rol)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                      seleccionado
                        ? "border-[#7a132b] bg-[#7a132b]/5 text-[#7a132b] font-bold"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="capitalize">{rol}</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        seleccionado
                          ? "border-[#7a132b] bg-[#7a132b] text-white"
                          : "border-neutral-300"
                      }`}
                    >
                      {seleccionado && "✓"}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mb-5 block text-sm">
              <input
                type="checkbox"
                checked={autoaprobar}
                onChange={(e) => setAutoaprobar(e.target.checked)}
              />{" "}
              Permitir autoaprobación de solicitudes propias ordinarias
            </label>
            <p className="mb-4 text-xs text-neutral-500">
              No concede aprobación de eventos ajenos ni la excepción de menos
              de siete días. Subdirección conserva sus facultades propias.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setUsuarioEditandoRoles(null)}
                className="px-4 py-2 border rounded-xl font-semibold text-neutral-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarRoles}
                className="px-5 py-2 bg-[#7a132b] text-white rounded-xl font-bold hover:bg-[#620f23]"
              >
                Guardar Roles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASOCIAR STAFF A EVENTOS                                          */}
      {/* ========================================================================= */}
      {usuarioEditandoStaff && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 text-xs animate-in zoom-in-95">
            <h3 className="text-base font-bold text-neutral-900 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-700" />
              <span>Asociar Staff con Eventos Oficiales</span>
            </h3>
            <p className="text-neutral-500 text-[11px] mb-4">
              Selecciona los eventos donde{" "}
              <strong className="text-neutral-800">
                {usuarioEditandoStaff.nombre}
              </strong>{" "}
              tendrá autorización de escaneo y acceso.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto mb-6 pr-1">
              {listaEventos.map((ev) => {
                const asignado =
                  usuarioEditandoStaff.eventosAsignadosStaff?.includes(ev.id) ||
                  false;
                return (
                  <div
                    key={ev.id}
                    onClick={() => alternarAsignacionStaffEvento(ev.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      asignado
                        ? "border-purple-300 bg-purple-50/80 text-purple-950 font-bold"
                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <div>
                      <div className="text-xs">{ev.titulo}</div>
                      <div className="text-[10px] text-neutral-400 font-normal mt-0.5">
                        {ev.fechas[0]?.fecha} · {ev.categoria}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        asignado
                          ? "bg-purple-600 text-white"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {asignado ? "Asignado" : "Sin asignar"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setUsuarioEditandoStaff(null)}
                className="px-5 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
