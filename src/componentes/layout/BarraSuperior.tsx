import { modoDemostracionActivo } from "../../dominio/demostracion";
import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import { useAutenticacion } from "../../contextos/AutenticacionContexto";
import { useDatos } from "../../contextos/DatosContexto";
import { useNotificaciones } from "../../contextos/NotificacionesContexto";
import type { RolUsuario } from "../../tipos";

const nombres: Record<RolUsuario, string> = {
  asistente: "Asistente",
  organizador: "Organizador",
  staff: "Personal de acceso",
  subdireccion: "Subdirección",
  admin: "Administrador",
};
const inicioRol: Record<RolUsuario, string> = {
  asistente: "/eventos",
  organizador: "/organizador",
  staff: "/staff",
  subdireccion: "/subdireccion",
  admin: "/admin",
};
const panelRol: Record<RolUsuario, string> = {
  asistente: "Cartelera",
  organizador: "Mis eventos y solicitudes",
  staff: "Control de acceso",
  subdireccion: "Solicitudes",
  admin: "Administración",
};

export const BarraSuperior: React.FC<{
  rutaActual: string;
  navegarA: (ruta: string) => void;
}> = ({ rutaActual, navegarA }) => {
  const {
    usuarioActual,
    estaAutenticado,
    rolActivo,
    cambiarRolActivo,
    todosLosUsuarios,
    cambiarUsuario,
    cerrarSesion,
  } = useAutenticacion();
  const { reiniciarDatosIniciales } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [movilAbierto, setMovilAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMenuAbierto(false);
    setMovilAbierto(false);
  }, [rutaActual]);
  useEffect(() => {
    const cerrar = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node))
        setMenuAbierto(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setMenuAbierto(false);
        setMovilAbierto(false);
      }
    };
    document.addEventListener("pointerdown", cerrar);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", cerrar);
      document.removeEventListener("keydown", tecla);
    };
  }, []);
  const ir = (ruta: string) => {
    setMenuAbierto(false);
    setMovilAbierto(false);
    navegarA(ruta);
  };
  const elegirRol = (rol: RolUsuario) => {
    cambiarRolActivo(rol);
    ir(inicioRol[rol]);
  };
  const enlaces = [
    { nombre: "Cartelera", ruta: "/eventos" },
    ...(estaAutenticado
      ? [{ nombre: "Mis boletos", ruta: "/mis-reservaciones" }]
      : []),
    ...(estaAutenticado && rolActivo !== "asistente"
      ? [{ nombre: panelRol[rolActivo], ruta: inicioRol[rolActivo] }]
      : []),
    ...(estaAutenticado && rolActivo === "asistente"
      ? [{ nombre: "Mis solicitudes", ruta: "/mis-solicitudes" }]
      : []),
  ];
  const activo = (ruta: string) =>
    ruta === "/eventos"
      ? rutaActual === "/" || rutaActual.startsWith("/eventos")
      : rutaActual.startsWith(ruta);
  const puedeOrganizar = usuarioActual?.roles.some((rol) =>
    ["organizador", "subdireccion", "admin"].includes(rol),
  );
  const claseEnlace = (ruta: string) =>
    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
    (activo(ruta)
      ? "bg-[#7a132b]/7 text-[#7a132b]"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950");
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex min-h-18 items-center justify-between gap-3 py-3">
          <button
            onClick={() => ir("/eventos")}
            className="shrink-0 whitespace-nowrap text-xl font-extrabold tracking-tight text-[#7a132b]"
            aria-label="Ticket Trade, ir a cartelera"
          >
            Ticket Trade
          </button>
          <nav
            aria-label="Navegación principal"
            className="hidden min-w-0 flex-1 justify-center gap-1 lg:flex"
          >
            {enlaces.map((enlace) => (
              <button
                key={enlace.ruta}
                onClick={() => ir(enlace.ruta)}
                aria-current={activo(enlace.ruta) ? "page" : undefined}
                className={claseEnlace(enlace.ruta)}
              >
                {enlace.nombre}
              </button>
            ))}
            {puedeOrganizar && rolActivo !== "asistente" && (
              <button
                onClick={() => ir("/distribucion")}
                className={claseEnlace("/distribucion")}
              >
                Distribución de espacios
              </button>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setMovilAbierto(!movilAbierto)}
              aria-label={
                movilAbierto ? "Cerrar navegación" : "Abrir navegación"
              }
              aria-expanded={movilAbierto}
              className="rounded-lg border p-2.5 lg:hidden"
            >
              {movilAbierto ? <X size={19} /> : <Menu size={19} />}
            </button>
            {estaAutenticado && usuarioActual ? (
              <div ref={contenedor} className="relative">
                <button
                  onClick={() => setMenuAbierto(!menuAbierto)}
                  aria-expanded={menuAbierto}
                  aria-controls="menu-cuenta"
                  className="flex max-w-[48vw] items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-left hover:bg-neutral-50"
                >
                  <UserRound size={18} className="shrink-0 text-[#7a132b]" />
                  <span className="min-w-0">
                    <span className="block max-w-44 truncate text-sm font-semibold">
                      {usuarioActual.nombre}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {nombres[rolActivo]}
                    </span>
                  </span>
                  <ChevronDown size={15} className="shrink-0" />
                </button>
                {menuAbierto && (
                  <div
                    id="menu-cuenta"
                    className="absolute right-0 top-full mt-2 max-h-[75vh] w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl"
                  >
                    {usuarioActual.roles.length > 1 && (
                      <label className="mb-3 block px-2 text-sm font-semibold">
                        Perfil de trabajo
                        <select
                          aria-label="Perfil de trabajo"
                          value={rolActivo}
                          onChange={(e) =>
                            elegirRol(e.target.value as RolUsuario)
                          }
                          className="mt-2 w-full rounded-lg border bg-neutral-50 p-2 text-sm"
                        >
                          {usuarioActual.roles.map((rol) => (
                            <option key={rol} value={rol}>
                              {nombres[rol]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                      onClick={() => ir("/perfil")}
                    >
                      Mi perfil
                    </button>
                    <button
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                      onClick={() => ir("/recuperar-password")}
                    >
                      Recuperar contraseña
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        cerrarSesion();
                        ir("/login");
                      }}
                    >
                      <LogOut size={16} />
                      Cerrar sesión
                    </button>
                    {modoDemostracionActivo() && (
                      <details className="mt-3 border-t pt-3">
                        <summary className="cursor-pointer px-2 py-1 text-sm font-semibold text-neutral-600">
                          Demostración y cuentas de prueba
                        </summary>
                        <div className="mt-2 space-y-1">
                          {todosLosUsuarios.map((usuario) => (
                            <button
                              key={usuario.id}
                              onClick={() => {
                                cambiarUsuario(usuario.id);
                                ir(inicioRol[usuario.rolActivo]);
                                mostrarNotificacion(
                                  "Cuenta de demostración",
                                  usuario.nombre,
                                  "informacion",
                                );
                              }}
                              className={
                                "block w-full rounded-lg px-3 py-2 text-left text-sm " +
                                (usuario.id === usuarioActual.id
                                  ? "bg-neutral-100 font-semibold"
                                  : "hover:bg-neutral-50")
                              }
                            >
                              {usuario.nombre}
                              <span className="block text-xs text-neutral-500">
                                {usuario.afiliacion}
                              </span>
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "¿Restaurar los datos de prueba de este navegador? Se reemplazarán los cambios locales de demostración.",
                                )
                              ) {
                                reiniciarDatosIniciales();
                                mostrarNotificacion(
                                  "Datos restaurados",
                                  "Se cargaron los datos de demostración.",
                                  "informacion",
                                );
                                setMenuAbierto(false);
                              }
                            }}
                            className="mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
                          >
                            <RotateCcw size={15} />
                            Restaurar datos de prueba
                          </button>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => ir("/login")}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#7a132b]"
                >
                  <LogIn size={17} />
                  <span className="hidden sm:inline">Iniciar sesión</span>
                </button>
                <button
                  onClick={() => ir("/registro")}
                  className="rounded-lg bg-[#7a132b] px-3 py-2 text-sm font-bold text-white"
                >
                  Crear cuenta
                </button>
              </div>
            )}
          </div>
        </div>
        {movilAbierto && (
          <nav
            aria-label="Navegación móvil"
            className="grid gap-1 border-t py-3 sm:grid-cols-2 lg:hidden"
          >
            {enlaces.map((enlace) => (
              <button
                key={enlace.ruta}
                onClick={() => ir(enlace.ruta)}
                className={claseEnlace(enlace.ruta) + " text-left"}
              >
                {enlace.nombre}
              </button>
            ))}
            {puedeOrganizar && rolActivo !== "asistente" && (
              <button
                onClick={() => ir("/distribucion")}
                className={claseEnlace("/distribucion") + " text-left"}
              >
                Distribución de espacios
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
