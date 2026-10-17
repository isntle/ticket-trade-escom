import React, { useState } from "react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { modoDemostracionActivo } from "../dominio/demostracion";

export function ConfirmacionCorreoPagina({
  navigate,
}: {
  navigate: (ruta: string) => void;
}) {
  const {
    usuarioActual,
    solicitarConfirmacionCorreo,
    confirmarCorreo,
    reiniciarConfirmacionPrueba,
  } = useAutenticacion();
  const [codigo, setCodigo] = useState("");
  const [codigoPrueba, setCodigoPrueba] = useState("");
  const [mensaje, setMensaje] = useState("");
  return (
    <div className="min-h-screen bg-[#f5f3f0] px-4 py-12">
      <section className="mx-auto max-w-lg rounded-3xl border bg-white p-7 shadow-sm">
        <p className="font-bold text-[#7a132b]">Ticket Trade</p>
        <h1 className="mt-4 text-2xl font-bold">
          Confirmar correo electrónico
        </h1>
      {!modoDemostracionActivo() && <button onClick={() => navigate('/confirmar-correo?demo=1')} className="mt-4 rounded-xl border px-4 py-3 text-sm font-semibold">Activar demostración de correo</button>}
        {!usuarioActual ? (
          <button
            onClick={() => navigate("/login")}
            className="mt-5 rounded-xl border px-4 py-3"
          >
            Iniciar sesión
          </button>
        ) : usuarioActual.correoConfirmado === true ? (
          <>
            <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-900">
              Tu correo ya está confirmado.
            </p>
            <button
              onClick={() => navigate("/eventos")}
              className="mt-5 rounded-xl bg-[#7a132b] px-4 py-3 text-white"
            >
              Ver eventos
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6">
              Confirma el acceso a <strong>{usuarioActual.correo}</strong> para
              reservar y participar. Puedes consultar la cartelera mientras
              tanto.
            </p>
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6">
              Demostración: todavía no se envían correos reales. El código de
              prueba aparece aquí; permite probar el recorrido, pero no
              demuestra acceso a tu buzón.
            </p>
            <button
              onClick={() => {
                const r = solicitarConfirmacionCorreo();
                setMensaje(r.mensaje);
                setCodigoPrueba(r.codigoPrueba || "");
                setCodigo("");
              }}
              className="mt-4 rounded-xl border px-4 py-3 font-semibold"
            >
              Solicitar código de confirmación
            </button>
            {codigoPrueba && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm">
                <p>
                  Código de prueba · válido durante 24 horas mientras esta
                  sesión permanezca abierta
                </p>
                <output className="mt-2 block break-all select-all font-mono">
                  {codigoPrueba}
                </output>
              </div>
            )}
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const r = confirmarCorreo(codigo);
                setMensaje(r.mensaje);
                if (r.exito) {
                  setCodigo("");
                  setCodigoPrueba("");
                }
              }}
            >
              <label className="block text-sm font-semibold">
                Código de confirmación
                <input
                  required
                  autoComplete="one-time-code"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <button className="rounded-xl bg-[#7a132b] px-4 py-3 font-semibold text-white">
                Confirmar correo
              </button>
            </form>
          </>
        )}
        {mensaje && (
          <p role="status" className="mt-4 text-sm leading-6">
            {mensaje}
          </p>
        )}
        {modoDemostracionActivo() &&
          usuarioActual?.id === "usr-estudiante-sin-confirmar" &&
          usuarioActual.correoConfirmado === true && (
            <button
              onClick={() => {
                reiniciarConfirmacionPrueba();
                setMensaje(
                  "La cuenta de prueba vuelve a tener el correo pendiente.",
                );
              }}
              className="mt-5 block rounded-xl border px-4 py-2 text-sm"
            >
              Reiniciar prueba de correo de Lucía
            </button>
          )}
        <button
          onClick={() => navigate("/perfil")}
          className="mt-6 text-sm underline"
        >
          Volver a mi perfil
        </button>
      </section>
    </div>
  );
}
