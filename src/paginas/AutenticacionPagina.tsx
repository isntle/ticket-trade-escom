import { destinoInternoSeguro } from '../dominio/navegacion';
import { volverA } from '../dominio/navegacion';
import React, { useEffect, useState } from "react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { MarcoAcceso } from "../componentes/layout/MarcoAcceso";
import { modoDemostracionActivo } from "../dominio/demostracion";
import { interfazSolicitada } from "../dominio/pantallasDocumentacion";
import { USUARIOS_INICIALES } from "../datos/datosIniciales";
import type { TipoAfiliacion } from "../tipos";

const campo =
  "mt-2 w-full rounded-xl border border-neutral-300 bg-[#fafaf9] px-3.5 py-3 text-sm outline-none focus:border-[#7a132b] focus:ring-4 focus:ring-[#7a132b]/10";
const boton =
  "rounded-xl bg-[#7a132b] px-5 py-3 text-sm font-bold text-white hover:bg-[#630f23]";
type Vista = "login" | "registro" | "recuperar";
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
  const [mostrar, setMostrar] = useState(false);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("externo");
  const [identificador, setIdentificador] = useState("");
  const [entidad, setEntidad] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
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
    } else setPaso(view === "recuperar" && interfazSolicitada() === "UI-IP-05" ? "token" : "solicitar");
  }, [view]);
  const afiliacion: TipoAfiliacion =
    categoria === "representante" ? "externo" : (categoria as TipoAfiliacion);
  const registrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmacion)
      return setMensaje("Las contraseñas no coinciden.");
    const r = auth.registrarUsuario({
      nombre,
      correo,
      password,
      afiliacion,
      boleta: afiliacion === "alumno" ? identificador : undefined,
      numeroEmpleado: !["alumno", "externo"].includes(afiliacion)
        ? identificador
        : undefined,
      nombreOrganizacion: entidad,
      puestoContacto: cargo,
      telefonoContacto: telefono,
      tipoExterno:
        categoria === "representante" ? "representante" : "asistente",
    });
    setMensaje(r.mensaje);
    if (r.exito) {
      if (r.codigoPrueba)
        sessionStorage.setItem(
          "tt_confirmacion_demo",
          JSON.stringify({ correo, codigo: r.codigoPrueba }),
        );
      navigate("/confirmar-correo?correo=" + encodeURIComponent(correo) + "&continuar=" + encodeURIComponent(destinoInternoSeguro(new URLSearchParams(window.location.search).get("continuar"))));
    }
  };
  return (
    <MarcoAcceso>
      <header className="mb-7">
        <h2 className="text-3xl font-black tracking-tight">
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
              ? "Crea tu cuenta; confirmar el correo y verificar documentos son procesos separados."
              : "Restablece tu contraseña con un enlace de un solo uso."}
        </p>
      </header>
      {mensaje && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          {mensaje}
        </p>
      )}
      {view === "login" && (
        <>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const r = auth.iniciarSesion(correo, password);
              setMensaje(r.mensaje);
              if (r.exito) navigate(destinoInternoSeguro(new URLSearchParams(window.location.search).get("continuar")));
            }}
          >
            <label className="block text-sm font-semibold">
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
            <label className="block text-sm font-semibold">
              Contraseña
              <input
                type={mostrar ? "text" : "password"}
                required
                autoComplete="current-password"
                className={campo}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap justify-between gap-3 text-sm">
              <button type="button" onClick={() => setMostrar(!mostrar)}>
                {mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
              </button>
              <button
                type="button"
                className="text-[#7a132b] underline"
                onClick={() => navigate("/recuperar-password")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <button className={boton + " w-full"}>Iniciar sesión</button>
          </form>
          {modoDemostracionActivo() && (
            <section className="my-6 rounded-2xl bg-[#f5f3f0] p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-500">
                Accesos rápidos
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
                      {{ alumno: "Estudiante", profesor: "Docente", administrativo: "Administrativo", pae: "Personal de apoyo", externo: "Externo" }[u.afiliacion]}
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
          <p className="text-sm text-neutral-600">
            Aviso de datos: se usan para tu cuenta y sus operaciones. No
            adjuntes documentos de identidad aquí. El expediente se presenta por
            separado y solo lo revisa Administración. Usa datos ficticios en
            este prototipo. Contacto: soporte_ti@escom.ipn.mx.
          </p>
          <label className="block text-sm font-semibold">
            Rol
            <select
              className={campo}
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setIdentificador("");
              }}
            >
              <option value="externo">Externo asistente</option>
              <option value="alumno">Estudiante</option>
              <option value="profesor">Docente</option>
              <option value="administrativo">Administrativo</option>
              <option value="pae">Personal de apoyo</option>
              <option value="representante">Representante externo</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Nombre completo
            <input
              required
              className={campo}
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Correo electrónico
            <input
              required
              type="email"
              className={campo}
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </label>
          {afiliacion !== "externo" && (
            <>
              <p className="text-sm text-neutral-500">
                {afiliacion === "alumno"
                  ? "Usa @alumno.ipn.mx. Boleta: diez dígitos o PE/PP y ocho dígitos."
                  : "Usa @ipn.mx. Número de empleado como dato declarado; no se consulta un padrón oficial."}
              </p>
              <label className="block text-sm font-semibold">
                {afiliacion === "alumno"
                  ? "Boleta"
                  : "Número de empleado"}
                <input
                  required
                  className={campo}
                  value={identificador}
                  onChange={(e) =>
                    setIdentificador(e.target.value.toUpperCase())
                  }
                />
              </label>
            </>
          )}
          {categoria === "representante" && (
            <>
              <label className="block text-sm font-semibold">
                Entidad que representas
                <input
                  required
                  className={campo}
                  value={entidad}
                  onChange={(e) => setEntidad(e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold">
                Cargo o relación de representación
                <input
                  required
                  className={campo}
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold">
                Teléfono (opcional)
                <input
                  type="tel"
                  className={campo}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </label>
            </>
          )}
          <label className="block text-sm font-semibold">
            Contraseña
            <input
              required
              type="password"
              autoComplete="new-password"
              className={campo}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <p className="text-xs text-neutral-500">
            Mínimo ocho caracteres, con mayúscula, minúscula y número.
          </p>
          <label className="block text-sm font-semibold">
            Confirmar contraseña
            <input
              required
              type="password"
              autoComplete="new-password"
              className={campo}
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <input required type="checkbox" /> Leí el aviso de uso de datos y
            deseo registrar la cuenta.
          </label>
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
              <label className="block text-sm font-semibold">
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
              <p className="text-sm">
                El enlace vence en 15 minutos. El envío real de correo aún no
                está configurado; en demostración puedes usar un código de
                prueba.
              </p>
              {codigoDemo && (
                <div className="break-all rounded-xl border p-3 text-sm">
                  Código de demostración (no acredita acceso al buzón):{" "}
                  <output className="block select-all font-mono">
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
                      setMensaje("Enlace válido; captura la nueva contraseña.");
                    } else
                      setMensaje("Enlace inválido, vencido o ya utilizado.");
                    return;
                  }
                  if (password !== confirmacion)
                    return setMensaje("Las contraseñas no coinciden.");
                  const r = auth.restablecerPasswordConToken(token, password);
                  setMensaje(r.mensaje);
                  if (r.exito) {
                    setPassword("");
                    setConfirmacion("");
                    setCodigoDemo("");
                    navigate("/login");
                  }
                }}
              >
                <label className="block text-sm font-semibold">
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
                    <label className="block text-sm font-semibold">
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
                    <label className="block text-sm font-semibold">
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
                className="text-sm underline"
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
      <nav className="mt-7 flex flex-wrap gap-4 border-t pt-5 text-sm">
        {view !== "login" && (
          <button onClick={() => navigate(volverA("/login"))}>Regresar</button>
        )}
        {view !== "registro" && (
          <button
            className="font-bold text-[#7a132b]"
            onClick={() => navigate("/registro?continuar="+encodeURIComponent(destinoInternoSeguro(new URLSearchParams(window.location.search).get("continuar"))))}
          >
            Crear cuenta
          </button>
        )}
        <button onClick={() => navigate("/eventos")}>
          Consultar cartelera
        </button>
      </nav>
    </MarcoAcceso>
  );
}
