import { destinoInternoSeguro } from '../dominio/navegacion';
import { volverA } from '../dominio/navegacion';
import React, { useState } from "react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { MarcoAcceso } from "../componentes/layout/MarcoAcceso";
import { modoDemostracionActivo } from "../dominio/demostracion";
const campo = "mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm";
const boton =
  "rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold";
export function ConfirmacionCorreoPagina({
  navigate,
}: {
  navigate: (ruta: string) => void;
}) {
  const auth = useAutenticacion(),
    parametros = new URLSearchParams(window.location.search);
  const [token, setToken] = useState(parametros.get("token") || "");
  const [correo, setCorreo] = useState(
    parametros.get("correo") ||
      auth.usuarioActual?.correoPendiente ||
      auth.usuarioActual?.correo ||
      "",
  );
  const [mensaje, setMensaje] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [codigo, setCodigo] = useState(() => {
    if (!modoDemostracionActivo()) return "";
    try {
      const dato = JSON.parse(
        sessionStorage.getItem("tt_confirmacion_demo") || "null",
      );
      return dato?.correo.toLowerCase() === correo.toLowerCase()
        ? dato.codigo
        : "";
    } catch {
      return "";
    }
  });
  return (
    <MarcoAcceso>
      <h2 className="text-3xl font-black">Confirmar correo electrónico</h2>
      <p className="my-4 text-sm leading-6">
        Confirma tu correo con el enlace recibido. Esto no equivale a
        verificación documental ni concede facultades para organizar eventos.
      </p>
      <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm">
        El envío real todavía no está conectado. En demostración puedes probar
        el recorrido con un código; no acredita acceso a un buzón real.
      </p>
      {mensaje && (
        <p role="status" className="my-4 text-sm">
          {mensaje}
        </p>
      )}
      {confirmado ? (
        <>
          <p className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
            Correo confirmado correctamente.
          </p>
          <button
            className={boton + " mt-4"}
            onClick={() => navigate(auth.usuarioActual ? destinoInternoSeguro(parametros.get("continuar")) : "/login?continuar="+encodeURIComponent(destinoInternoSeguro(parametros.get("continuar"))))}
          >
            {auth.usuarioActual ? "Continuar" : "Iniciar sesión"}
          </button>
        </>
      ) : (
        <>
          {codigo && (
            <p className="my-4 break-all rounded-xl border p-4 text-sm">
              Código de demostración (24 horas, un solo uso):{" "}
              <output className="block select-all font-mono">{codigo}</output>
            </p>
          )}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const r = auth.confirmarCorreo(token);
              setMensaje(r.mensaje);
              if (r.exito) {
                setConfirmado(true);
                setToken("");
                setCodigo("");
                sessionStorage.removeItem("tt_confirmacion_demo");
              }
            }}
          >
            <label className="block text-sm font-semibold">
              Código de confirmación
              <input
                required
                className={campo}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
            <button className={boton + " bg-[#7a132b] text-white"}>
              Confirmar correo
            </button>
          </form>
          <form
            className="mt-6 space-y-4 border-t pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              const r = auth.reenviarConfirmacionCorreo(correo);
              setMensaje(r.mensaje);
              setCodigo(r.codigoPrueba || "");
            }}
          >
            <label className="block text-sm">
              Correo pendiente o nuevo correo
              <input
                type="email"
                required
                className={campo}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </label>
            <button className={boton}>Solicitar nuevo enlace</button>
            <p className="text-xs text-neutral-500">
              Máximo un enlace por minuto y cinco por hora.
            </p>
          </form>
        </>
      )}
      <nav className="mt-6 flex flex-wrap gap-4 border-t pt-5 text-sm">
        <button onClick={() => navigate(volverA("/login"))}>Regresar</button>
        {auth.usuarioActual && (
          <button onClick={() => navigate("/perfil")}>Mi perfil</button>
        )}
        <button onClick={() => navigate("/eventos")}>
          Consultar cartelera
        </button>
      </nav>
      {modoDemostracionActivo() &&
        auth.usuarioActual?.id === "usr-estudiante-sin-confirmar" &&
        auth.usuarioActual.correoConfirmado && (
          <button
            className={boton + " mt-4"}
            onClick={() => {
              auth.reiniciarConfirmacionPrueba();
              setConfirmado(false);
            }}
          >
            Reiniciar prueba de correo de Lucía
          </button>
        )}
    </MarcoAcceso>
  );
}
