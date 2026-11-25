import { SimboloTicketTrade } from "./SimboloTicketTrade";
import { afiliacionLegible } from "../../utilidades/afiliacion";
import { verificacionIdentidadVigente } from '../../dominio/identidad';
import { modoDemostracionActivo } from "../../dominio/demostracion";
import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ArrowUpRight,
  Check,
  BadgeCheck,
  Bell,
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
  const {
    reiniciarDatosIniciales,
    listaNotificaciones = [],
    marcarNotificacionLeida,
  } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [movilAbierto, setMovilAbierto] = useState(false);
  const [panelNotificaciones, setPanelNotificaciones] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const botonNotificaciones = useRef<HTMLButtonElement>(null);
  const [avisoEnProceso, setAvisoEnProceso] = useState<string>();
  const [errorAviso, setErrorAviso] = useState<{ id: string; mensaje: string }>();
  const marcarAviso = async (id: string) => {
    if (!marcarNotificacionLeida || avisoEnProceso) return;
    setAvisoEnProceso(id);
    setErrorAviso(undefined);
    try {
      const resultado = await marcarNotificacionLeida(id);
      if (resultado && !resultado.exito)
        setErrorAviso({ id, mensaje: resultado.error || "No se pudo marcar el aviso. Inténtalo de nuevo." });
    } catch {
      setErrorAviso({ id, mensaje: "No se pudo marcar el aviso. Inténtalo de nuevo." });
    } finally {
      setAvisoEnProceso(undefined);
    }
  };
  const contenedorNotificaciones = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMenuAbierto(false);
    setMovilAbierto(false);
    setPanelNotificaciones(false);
  }, [rutaActual]);
  useEffect(() => {
    const cerrar = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node))
        setMenuAbierto(false);
      if (!contenedorNotificaciones.current?.contains(evento.target as Node))
        setPanelNotificaciones(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        if (contenedorNotificaciones.current?.contains(document.activeElement))
          botonNotificaciones.current?.focus();
        setMenuAbierto(false);
        setMovilAbierto(false);
        setPanelNotificaciones(false);
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
    setPanelNotificaciones(false);
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
  const noLeidas = listaNotificaciones.filter((n) => !n.leida).length;
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
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-lg font-extrabold tracking-tight text-[#7a132b] sm:gap-2 sm:text-xl"
            aria-label="Ticket Trade, ir a cartelera"
          >
            <SimboloTicketTrade className="h-5 w-5 shrink-0 sm:h-6 sm:w-7" />
            <span>Ticket Trade</span>
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
          </nav>
          <div className="flex min-w-0 items-center gap-2">
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
            {estaAutenticado && usuarioActual && (
              <div ref={contenedorNotificaciones} className="relative">
                <button
                  ref={botonNotificaciones}
                  type="button"
                  onClick={() => setPanelNotificaciones(!panelNotificaciones)}
                  aria-label={
                    noLeidas
                      ? `Notificaciones, ${noLeidas} sin leer`
                      : "Notificaciones"
                  }
                  aria-expanded={panelNotificaciones}
                  aria-controls="panel-notificaciones"
                  className="relative grid size-11 place-items-center rounded-xl border border-neutral-200 bg-white text-[#7a132b] hover:bg-[#7a132b]/5 aria-expanded:bg-[#7a132b]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b]"
                >
                  <Bell size={19} />
                  {noLeidas > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7a132b] px-1 text-[11px] font-bold text-white">
                      {noLeidas > 99 ? "99+" : noLeidas}
                    </span>
                  )}
                </button>
                {panelNotificaciones && (
                  <div
                    id="panel-notificaciones"
                    role="region"
                    aria-labelledby="titulo-notificaciones"
                    className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[min(68dvh,34rem)] overflow-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[25rem]"
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 py-3">
                      <div>
                        <h2 id="titulo-notificaciones" className="text-base font-bold text-neutral-900">Notificaciones</h2>
                        <p className="text-xs text-neutral-600">{noLeidas} sin leer</p>
                      </div>
                      <button type="button" aria-label="Cerrar notificaciones"
                        className="grid size-10 place-items-center rounded-xl text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-[#7a132b]"
                        onClick={() => { setPanelNotificaciones(false); botonNotificaciones.current?.focus(); }}>
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>
                    {listaNotificaciones.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-neutral-600">No tienes notificaciones.</p>
                    ) : (
                      <ul className="divide-y divide-neutral-100">
                        {listaNotificaciones.map(n => (
                          <li key={n.id} className={`border-l-[3px] px-4 py-3 ${n.leida ? "border-transparent" : "border-[#7a132b] bg-[#7a132b]/5"}`}>
                            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                              <p className="min-w-0 break-words text-sm font-semibold text-neutral-900">{n.titulo}</p>
                              {!n.leida && <span className="text-xs font-semibold text-[#7a132b]">Sin leer</span>}
                            </div>
                            <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-neutral-700">{n.mensaje}</p>
                            <p className="mt-1 text-xs text-neutral-600">{new Date(n.fecha).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4">
                              {n.enlace && <button type="button" onClick={() => n.enlace && ir(n.enlace)}
                                className="inline-flex min-h-10 items-center gap-1 rounded text-sm font-semibold text-[#7a132b] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#7a132b]">
                                Ir al trámite <ArrowUpRight size={14} aria-hidden="true" />
                              </button>}
                              {!n.leida && marcarNotificacionLeida && <button type="button" disabled={!!avisoEnProceso}
                                onClick={() => void marcarAviso(n.id)}
                                className="inline-flex min-h-10 items-center gap-1 rounded text-sm font-medium text-neutral-700 hover:underline focus-visible:outline-2 focus-visible:outline-[#7a132b] disabled:opacity-60">
                                <Check size={15} aria-hidden="true" />{avisoEnProceso === n.id ? "Marcando…" : "Marcar como leída"}
                              </button>}
                            </div>
                            {errorAviso?.id === n.id && <p role="alert" className="mt-1 text-sm text-rose-800">{errorAviso.mensaje}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            {estaAutenticado && usuarioActual ? (
              <div ref={contenedor} className="relative">
                <button
                  onClick={() => setMenuAbierto(!menuAbierto)}
                  aria-expanded={menuAbierto}
                  aria-controls="menu-cuenta"
                  aria-label={`Mi cuenta, ${usuarioActual.nombre}`}
                  className="flex size-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-2 text-left hover:bg-neutral-50 sm:h-auto sm:min-h-11 sm:w-auto sm:max-w-[26vw] sm:justify-start sm:px-3 sm:py-2"
                >
                  <UserRound size={18} className="shrink-0 text-[#7a132b]" />
                  <span className="hidden min-w-0 sm:block">
                    <span className="block max-w-44 truncate text-sm font-semibold">
                      {usuarioActual.nombre}
                    </span>
                    {verificacionIdentidadVigente(usuarioActual)&&<span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-sky-700" title="Identidad verificada vigente"><BadgeCheck size={15} aria-hidden="true"/>Verificado</span>}
                    <span className="block text-xs text-neutral-500">
                      {usuarioActual.roles.includes("admin") ? "Administración" : usuarioActual.roles.includes("subdireccion") ? "Subdirección" : afiliacionLegible(usuarioActual.afiliacion)}
                    </span>
                  </span>
                  <ChevronDown size={15} className="hidden shrink-0 sm:block" aria-hidden="true" />
                </button>
                {menuAbierto && (
                  <div
                    id="menu-cuenta"
                    className="absolute right-0 top-full mt-2 max-h-[75vh] w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl"
                  >
                    <div className="mb-3 border-b border-neutral-200 px-2 pb-3 sm:hidden">
                      <p className="break-words text-sm font-semibold text-neutral-900">{usuarioActual.nombre}</p>
                      {verificacionIdentidadVigente(usuarioActual) && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-sky-700"><BadgeCheck size={15} aria-hidden="true" /> Verificado</p>}
                    </div>
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
                      onClick={async () => {
                        (await cerrarSesion());
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
                              onClick={async () => {
                                (await cambiarUsuario(usuario.id));
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
                              {verificacionIdentidadVigente(usuario) && <span className="flex items-center gap-1 text-xs font-semibold text-sky-700"><BadgeCheck size={14} aria-hidden="true" />Verificado</span>}
                              <span className="block text-xs text-neutral-500">
                                {afiliacionLegible(usuario.afiliacion)}
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
          </nav>
        )}
      </div>
    </header>
  );
};
