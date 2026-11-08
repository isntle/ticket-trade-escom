import { validarDominioIdentidad } from "../dominio/identidad";
import { destinoInternoSeguro } from "../dominio/navegacion";
import { volverA } from "../dominio/navegacion";
import React, { useEffect, useState } from "react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { MarcoAcceso } from "../componentes/layout/MarcoAcceso";
import { modoDemostracionActivo } from "../dominio/demostracion";
import { interfazSolicitada } from "../dominio/pantallasDocumentacion";
import { USUARIOS_INICIALES } from "../datos/datosIniciales";
import type { TipoAfiliacion } from "../tipos";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

const campo =
  "mt-2 w-full rounded-xl border border-neutral-300 bg-[#fafaf9] px-3.5 py-3 text-sm outline-none focus:border-[#7a132b] focus:ring-4 focus:ring-[#7a132b]/10";
const boton =
  "rounded-xl bg-[#7a132b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#630f23] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/20";

type Vista = "login" | "registro" | "recuperar";
type RolFormulario = "alumno" | "externo" | "trabajador";

export function AutenticacionPagina({
  view = "login",
  navigate,
}: {
  view?: Vista;
  navigate: (ruta: string) => void;
}) {
  const auth = useAutenticacion();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrar, setMostrar] = useState(false);

  // Registro segmentado
  const [categoria, setCategoria] = useState<RolFormulario>("alumno");
  const [rolEmpleado, setRolEmpleado] = useState<"profesor" | "administrativo" | "pae">("profesor");
  const [tipoExterno, setTipoExterno] = useState<"asistente" | "representante">("asistente");
  const [entidad, setEntidad] = useState("");
  const [cargo, setCargo] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [verPrivacidadDetalle, setVerPrivacidadDetalle] = useState(false);

  const [token, setToken] = useState(
    new URLSearchParams(window.location.search).get("token") || "",
  );
  const [paso, setPaso] = useState<"solicitar" | "token" | "nueva">(
    "solicitar",
  );
  const [mensaje, setMensaje] = useState("");
  const [codigoDemo, setCodigoDemo] = useState("");

  useEffect(() => {
    setMensaje("");
    setCodigoDemo("");
    setPassword("");
    setConfirmacion("");
    const enlace = new URLSearchParams(window.location.search).get("token");
    if (view === "recuperar" && enlace) {
      setToken(enlace);
      setPaso("token");
    } else {
      setPaso(
        view === "recuperar" && interfazSolicitada() === "UI-IP-05"
          ? "token"
          : "solicitar",
      );
    }
  }, [view]);

  const afiliacion: TipoAfiliacion =
    categoria === "trabajador" ? rolEmpleado : categoria;

  const registrar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !apellidoPaterno.trim()) {
      return setMensaje(
        "Ingresa tu nombre y primer apellido.",
      );
    }

    if (password !== confirmacion) {
      return setMensaje("Las contraseñas no coinciden.");
    }

    if (!aceptaPrivacidad) {
      return setMensaje(
        "Debes aceptar el aviso de privacidad para registrar la cuenta.",
      );
    }

    const c = correo.trim().toLowerCase();
    if (!validarDominioIdentidad(c, afiliacion)) {
      return setMensaje(categoria === "externo" ? "Ingresa un correo electrónico válido." : categoria === "alumno" ? "Usa tu correo @alumno.ipn.mx. No modificaremos la dirección que captures." : "Usa tu correo @ipn.mx.");
    }
    const nombreCompleto = [nombre, apellidoPaterno, apellidoMaterno].map(p=>p.trim()).filter(Boolean).join(" ");
    const correoParaRegistro = c;

    const r = auth.registrarUsuario({
      nombre: nombreCompleto,
      correo: correoParaRegistro,
      password,
      afiliacion,
      tipoExterno: categoria === "externo" ? tipoExterno : undefined,
      nombreOrganizacion: categoria === "externo" && tipoExterno === "representante" ? entidad.trim() : undefined,
      puestoContacto: categoria === "externo" && tipoExterno === "representante" ? cargo.trim() : undefined,
      boleta:
        categoria === "alumno"
          ? identificador.trim().toUpperCase()
          : undefined,
      numeroEmpleado:
        categoria === "trabajador"
          ? identificador.trim().toUpperCase()
          : undefined,
    });

    setMensaje(r.mensaje);
    if (r.exito) {
      if (r.codigoPrueba) {
        sessionStorage.setItem(
          "tt_confirmacion_demo",
          JSON.stringify({ correo: correoParaRegistro, codigo: r.codigoPrueba }),
        );
      }
      navigate(
        "/confirmar-correo?correo=" +
          encodeURIComponent(correoParaRegistro) +
          "&continuar=" +
          encodeURIComponent(
            destinoInternoSeguro(
              new URLSearchParams(window.location.search).get("continuar"),
            ),
          ),
      );
    }
  };

  return (
    <MarcoAcceso>
      {/* Botones de navegación en la parte superior derecha */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => navigate("/eventos")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7a132b]/20 sm:text-sm"
        >
          <Calendar className="h-4 w-4 text-[#7a132b]" />
          <span>Consultar cartelera</span>
        </button>

        {view === "login" ? (
          <button
            type="button"
            onClick={() =>
              navigate(
                "/registro?continuar=" +
                  encodeURIComponent(
                    destinoInternoSeguro(
                      new URLSearchParams(window.location.search).get(
                        "continuar",
                      ),
                    ),
                  ),
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a132b] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#630f23] focus:outline-none focus:ring-2 focus:ring-[#7a132b]/20 sm:text-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Crear cuenta</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/login?continuar=" + encodeURIComponent(destinoInternoSeguro(new URLSearchParams(window.location.search).get("continuar"))))}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7a132b] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#630f23] focus:outline-none focus:ring-2 focus:ring-[#7a132b]/20 sm:text-sm"
          >
            <LogIn className="h-4 w-4" />
            <span>Iniciar sesión</span>
          </button>
        )}
      </div>

      <header className="mb-7">
        <h2 className="text-3xl font-black tracking-tight text-neutral-900">
          {view === "login"
            ? "Iniciar sesión"
            : view === "registro"
              ? "Crear cuenta"
              : "Recuperar acceso"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {view === "login"
            ? "Usa tus credenciales para continuar a Ticket Trade."
            : view === "registro"
              ? "Crea tu cuenta para acceder a eventos."
              : "Restablece tu contraseña con un enlace de un solo uso."}
        </p>
      </header>

      {mensaje && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
        >
          {mensaje}
        </p>
      )}

      {view === "login" && (
        <>
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ correo, password }),
                  credentials: 'same-origin',
                });
                const cuerpo = await res.json();
                if (res.ok && cuerpo?.datos?.usuario) {
                  auth.iniciarSesionConUsuario(cuerpo.datos.usuario);
                  navigate(
                    destinoInternoSeguro(
                      new URLSearchParams(window.location.search).get("continuar")
                    )
                  );
                  return;
                } else if (!res.ok && cuerpo?.error?.mensaje) {
                  setMensaje(cuerpo.error.mensaje);
                  return;
                }
              } catch {
                // Respaldo local si la API remota está inactiva
              }
              const r = auth.iniciarSesion(correo, password);
              setMensaje(r.mensaje);
              if (r.exito) {
                navigate(
                  destinoInternoSeguro(
                    new URLSearchParams(window.location.search).get(
                      "continuar",
                    ),
                  ),
                );
              }
            }}
          >
            <label className="block text-sm font-semibold text-neutral-800">
              Correo electrónico
              <input
                type="email"
                required
                autoComplete="username"
                className={campo}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-neutral-800">
              Contraseña
              <div className="relative">
                <input
                  type={mostrar ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={campo + " pr-10"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMostrar(!mostrar)}
                  className="absolute right-3.5 top-5 text-neutral-400 transition hover:text-neutral-700"
                  aria-label={
                    mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {mostrar ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <button
                type="button"
                className="text-neutral-500 hover:text-neutral-800"
                onClick={() => setMostrar(!mostrar)}
              >
                {mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
              </button>
              <button
                type="button"
                className="font-medium text-[#7a132b] underline hover:text-[#630f23]"
                onClick={() => navigate("/recuperar-password?continuar=" + encodeURIComponent(destinoInternoSeguro(new URLSearchParams(window.location.search).get("continuar"))))}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <button className={boton + " w-full"}>Iniciar sesión</button>
          </form>

          {modoDemostracionActivo() && (
            <section className="my-6 rounded-2xl bg-[#f5f3f0] p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-500">
                Accesos rápidos de prueba
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {USUARIOS_INICIALES.map((u) => (
                  <button
                    key={u.id}
                    className="group min-w-0 rounded-xl border border-transparent bg-white p-3 text-left shadow-sm transition-colors hover:border-[#7a132b]/25 hover:bg-[#7a132b]/5 focus-visible:outline-2 focus-visible:outline-[#7a132b]"
                    onClick={() => {
                      setCorreo(u.correo);
                      setPassword(u.password || "");
                    }}
                  >
                    <span className="block truncate text-sm font-bold text-neutral-800 group-hover:text-[#7a132b]">
                      {u.nombre}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {{
                        alumno: "Estudiante",
                        profesor: "Docente",
                        administrativo: "Administrativo",
                        pae: "Personal de apoyo",
                        externo: "Externo",
                      }[u.afiliacion] || u.afiliacion}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {view === "registro" && (
        <form className="space-y-4" onSubmit={registrar}>
          {/* Rol limitado a Estudiante, Externo y Trabajador del IPN */}
          <label className="block text-sm font-semibold text-neutral-800">
            Rol
            <select
              className={campo}
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value as RolFormulario);
                setIdentificador("");
              }}
            >
              <option value="alumno">Estudiante</option>
              <option value="externo">Externo</option>
              <option value="trabajador">Trabajador del IPN</option>
            </select>
          </label>

          {categoria === "trabajador" && <label className="block text-sm font-semibold text-neutral-800">Tipo de trabajador<select className={campo} value={rolEmpleado} onChange={e=>setRolEmpleado(e.target.value as typeof rolEmpleado)}><option value="profesor">Docente</option><option value="administrativo">Administrativo</option><option value="pae">Personal de apoyo</option></select></label>}
          {categoria === "externo" && <><label className="block text-sm font-semibold text-neutral-800">Tipo de participación<select className={campo} value={tipoExterno} onChange={e=>setTipoExterno(e.target.value as typeof tipoExterno)}><option value="asistente">Asistente externo</option><option value="representante">Representante de una entidad</option></select></label>{tipoExterno === "representante" && <><label className="block text-sm font-semibold text-neutral-800">Entidad que representas<input required className={campo} value={entidad} onChange={e=>setEntidad(e.target.value)}/></label><label className="block text-sm font-semibold text-neutral-800">Cargo o relación de representación<input required className={campo} value={cargo} onChange={e=>setCargo(e.target.value)}/></label></>}</>}

          {/* Nombre partido en nombre, apellido paterno y apellido materno */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-neutral-800">
              Nombre(s)
              <input
                required
                type="text"
                className={campo}
                autoComplete="given-name"
                placeholder="Ej. Juan"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-neutral-800">
              Apellido paterno
              <input
                required
                type="text"
                className={campo}
                autoComplete="family-name"
                placeholder="Ej. Pérez"
                value={apellidoPaterno}
                onChange={(e) => setApellidoPaterno(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-neutral-800">
              Apellido materno (opcional)
              <input
                type="text"
                className={campo}
                autoComplete="off"
                placeholder="Ej. García"
                value={apellidoMaterno}
                onChange={(e) => setApellidoMaterno(e.target.value)}
              />
            </label>
          </div>

          {/* Correo electrónico */}
          <div>
            <label className="block text-sm font-semibold text-neutral-800">
              {categoria === "externo"
                ? "Correo electrónico"
                : "Correo institucional"}
              <input
                required
                type="email"
                className={campo}
                autoComplete="email"
                placeholder={
                  categoria === "externo"
                    ? "tu-correo@ejemplo.com"
                    : categoria === "alumno" ? "usuario@alumno.ipn.mx" : "usuario@ipn.mx"
                }
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </label>
            {categoria !== "externo" && (
              <p className="mt-1 text-xs text-neutral-500">
                Usa tu correo con formato institucional{" "}
                <span className="font-semibold text-neutral-700">{categoria === "alumno" ? "@alumno.ipn.mx" : "@ipn.mx"}</span>
              </p>
            )}
          </div>

          {/* Boleta para estudiante */}
          {categoria === "alumno" && (
            <div>
              <label className="block text-sm font-semibold text-neutral-800">
                Boleta
                <input
                  required
                  type="text"
                  className={campo}
                  placeholder="boleta de 10 dígitos"
                  value={identificador}
                  onChange={(e) =>
                    setIdentificador(e.target.value.toUpperCase())
                  }
                />
              </label>
              <p className="mt-1 text-xs text-neutral-500">
                Diez dígitos o prefijo PE/PP seguido de ocho dígitos.
              </p>
            </div>
          )}

          {/* Número de empleado para trabajador del IPN */}
          {categoria === "trabajador" && (
            <div>
              <label className="block text-sm font-semibold text-neutral-800">
                Número de empleado
                <input
                  required
                  type="text"
                  className={campo}
                  
                  value={identificador}
                  onChange={(e) =>
                    setIdentificador(e.target.value.toUpperCase())
                  }
                />
              </label>
              <p className="mt-1 text-xs text-neutral-500">
                Número de empleado registrado en el IPN.
              </p>
            </div>
          )}

          {/* Contraseña y confirmación */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-neutral-800">
                Contraseña
                <div className="relative">
                  <input
                    required
                    type={mostrar ? "text" : "password"}
                    autoComplete="new-password"
                    className={campo + " pr-10"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar(!mostrar)}
                    className="absolute right-3.5 top-5 text-neutral-400 transition hover:text-neutral-700"
                    aria-label={
                      mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {mostrar ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              <p className="mt-1 text-xs text-neutral-500">
                Mínimo ocho caracteres, con mayúscula, minúscula y número.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-800">
                Confirmar contraseña
                <input
                  required
                  type={mostrar ? "text" : "password"}
                  autoComplete="new-password"
                  className={campo}
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Espacio para el Aviso de Privacidad */}
          <div className="rounded-2xl border border-neutral-200 bg-[#fafaf9] p-4 text-xs leading-relaxed text-neutral-600">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-800">
                <ShieldCheck className="h-4 w-4 text-[#7a132b]" />
                <span>Aviso de Privacidad</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setVerPrivacidadDetalle(!verPrivacidadDetalle)
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#7a132b] hover:underline"
              >
                {verPrivacidadDetalle ? "Ocultar detalles" : "Leer completo"}
                {verPrivacidadDetalle ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="text-neutral-600">
              Ticket Trade es el responsable del tratamiento de los datos personales
              solicitados. Estos datos se utilizarán para gestionar tu cuenta,
              verificar tu adscripción a la comunidad politécnica o condición de
              visitante externo, y emitir tus boletos de acceso a eventos.
            </p>
            {verPrivacidadDetalle && (
              <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3 text-[11px] text-neutral-500">
                <p>
                  <strong>Finalidad del tratamiento:</strong> Creación y
                  administración de perfil de usuario, emisión de boletos
                  digitales con código QR, control de aforo y comunicación de
                  avisos o incidencias de los eventos organizados.
                </p>
                <p>
                  
                  
                </p>
                <p>
                  <strong>Transferencias:</strong> La información sobre los servicios de almacenamiento y envío deberá corresponder al aviso institucional aprobado antes de su puesta en producción.
                </p>
              </div>
            )}
            <label className="mt-3.5 flex cursor-pointer select-none items-start gap-2.5 font-medium text-neutral-800">
              <input
                type="checkbox"
                required
                checked={aceptaPrivacidad}
                onChange={(e) => setAceptaPrivacidad(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#7a132b] focus:ring-[#7a132b]"
              />
              <span>
                He leído y acepto el Aviso de Privacidad y el tratamiento de mis
                datos personales.
              </span>
            </label>
          </div>

          <button className={boton + " w-full"}>Registrar cuenta</button>
        </form>
      )}

      {view === "recuperar" && (
        <section className="space-y-5">
          {paso === "solicitar" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const r = auth.solicitarRecuperacionPassword(correo);
                setMensaje(r.mensaje);
                setCodigoDemo(r.codigoPrueba || "");
                if (r.exito) setPaso("token");
              }}
            >
              <label className="block text-sm font-semibold text-neutral-800">
                Correo registrado
                <input
                  required
                  type="email"
                  className={campo}
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
              </label>
              <button className={boton}>Solicitar enlace</button>
            </form>
          ) : (
            <>
              <p className="text-sm text-neutral-600">
                El enlace vence en 15 minutos. El envío real de correo aún no
                está configurado; en demostración puedes usar un código de
                prueba.
              </p>
              {codigoDemo && (
                <div className="break-all rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
                  Código de demostración (no acredita acceso al buzón):{" "}
                  <output className="block select-all font-mono font-bold text-[#7a132b]">
                    {codigoDemo}
                  </output>
                </div>
              )}
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (paso === "token") {
                    if (auth.esTokenRecuperacionValido(token)) {
                      setPaso("nueva");
                      setMensaje(
                        "Enlace válido; captura la nueva contraseña.",
                      );
                    } else {
                      setMensaje("Enlace inválido, vencido o ya utilizado.");
                    }
                    return;
                  }
                  if (password !== confirmacion) {
                    return setMensaje("Las contraseñas no coinciden.");
                  }
                  const r = auth.restablecerPasswordConToken(token, password);
                  setMensaje(r.mensaje);
                  if (r.exito) {
                    setPassword("");
                    setConfirmacion("");
                    setCodigoDemo("");
                    navigate("/login?continuar=" + encodeURIComponent(destinoInternoSeguro(new URLSearchParams(window.location.search).get("continuar"))));
                  }
                }}
              >
                <label className="block text-sm font-semibold text-neutral-800">
                  Código del enlace
                  <input
                    required
                    className={campo}
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setPaso("token");
                    }}
                  />
                </label>
                {paso === "nueva" && (
                  <>
                    <label className="block text-sm font-semibold text-neutral-800">
                      Nueva contraseña
                      <input
                        required
                        type="password"
                        autoComplete="new-password"
                        className={campo}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-neutral-800">
                      Confirmar nueva contraseña
                      <input
                        required
                        type="password"
                        autoComplete="new-password"
                        className={campo}
                        value={confirmacion}
                        onChange={(e) => setConfirmacion(e.target.value)}
                      />
                    </label>
                  </>
                )}
                <button className={boton}>
                  {paso === "token"
                    ? "Validar enlace"
                    : "Restablecer contraseña"}
                </button>
              </form>
              <button
                className="text-sm font-medium text-[#7a132b] underline hover:text-[#630f23]"
                onClick={() => {
                  setPaso("solicitar");
                  setCodigoDemo("");
                }}
              >
                Solicitar otro enlace
              </button>
            </>
          )}
        </section>
      )}
    </MarcoAcceso>
  );
}
