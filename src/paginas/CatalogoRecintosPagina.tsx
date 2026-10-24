import React, { useState } from "react";
import { ArrowLeft, Building2, MapPin, Users } from "lucide-react";
import { useDatos } from "../contextos/DatosContexto";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { CalendarioRecinto } from "../componentes/calendario/CalendarioRecinto";
import { fechaHoyMexico } from "../dominio/solicitudes";

export function CatalogoRecintosPagina({
  navigate,
}: {
  navigate: (ruta: string) => void;
}) {
  const { listaRecintos } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const [idSeleccionado, setIdSeleccionado] = useState("");
  const [fecha, setFecha] = useState(fechaHoyMexico());
  const recintos = listaRecintos.filter(
    (r) => usuarioActual?.roles.includes("admin") || r.activo !== false,
  );
  const seleccionado =
    recintos.find((r) => r.id === idSeleccionado) || recintos[0];
  if (
    !usuarioActual ||
    (!usuarioActual.esVerificado &&
      !usuarioActual.roles.some((r) => r === "admin" || r === "subdireccion"))
  )
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold">
          Catálogo para solicitantes verificados
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          Inicia sesión con una cuenta habilitada para solicitar eventos.
        </p>
        <button
          onClick={() => navigate("/perfil")}
          className="mt-5 rounded-xl border px-4 py-2 text-sm"
        >
          Consultar mi perfil
        </button>
      </div>
    );
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate("/organizador")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600"
      >
        <ArrowLeft size={16} />
        Volver a mis eventos y solicitudes
      </button>
      <header className="mb-7">
        <h1 className="text-3xl font-extrabold">Recintos disponibles</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Consulta ubicación, capacidad y horarios antes de preparar tu
          solicitud. Consultar un espacio no lo reserva.
        </p>
      </header>
      <div className="grid gap-7 lg:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)]">
        <nav aria-label="Catálogo de recintos" className="space-y-3">
          {recintos.map((r) => (
            <button
              key={r.id}
              aria-pressed={seleccionado?.id === r.id}
              onClick={() => setIdSeleccionado(r.id)}
              className={`w-full rounded-2xl border p-5 text-left ${seleccionado?.id === r.id ? "border-[#7a132b] bg-[#7a132b]/5" : "border-neutral-200 bg-white"}`}
            >
              <Building2 size={20} className="mb-3 text-[#7a132b]" />
              <span className="block font-bold">{r.nombre}</span>
              <span className="mt-2 block text-sm text-neutral-600">
                {r.capacidad} personas · {r.tipo}
              </span>
              <span className="mt-1 block text-sm text-neutral-500">
                {r.ubicacion}
              </span>
            </button>
          ))}
        </nav>
        {seleccionado ? (
          <section data-interfaz="UI.15" tabIndex={-1} className="min-w-0 scroll-mt-24 space-y-5">
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-2xl font-bold">{seleccionado.nombre}</h2>
              <p className="mt-3 text-sm leading-7 text-neutral-600">
                {seleccionado.descripcion}
              </p>
              <p className="mt-4 flex gap-2 text-sm">
                <Users size={17} />
                {seleccionado.capacidad} personas de capacidad física
              </p>
              <p className="mt-3 flex gap-2 text-sm">
                <MapPin size={17} />
                {seleccionado.ubicacion}
              </p>
              <h3 className="mt-5 font-bold">Cómo llegar</h3>
              <p className="mt-2 text-sm leading-6">
                {seleccionado.indicaciones ||
                  "No hay indicaciones registradas."}
              </p>
              <h3 className="mt-5 font-bold">Equipamiento</h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-7">
                {seleccionado.equipamiento.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3 className="mt-5 font-bold">Modalidades</h3>
              <p className="mt-2 text-sm leading-6">
                {seleccionado.tipo === "laboratorio"
                  ? "Solo aforo controlado. No admite entrada libre."
                  : "La modalidad y el aforo se comprueban al preparar la solicitud."}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="font-bold">Galería</h3>
              <p className="mt-2 text-sm text-neutral-600">
                No hay imágenes registradas en la galería.
              </p>
              <h3 className="mt-5 font-bold">Reglas de uso</h3>
              <p className="mt-2 text-sm text-neutral-600">
                No hay reglas adicionales registradas en este catálogo.
              </p>
            </div>
            <CalendarioRecinto
              idRecinto={seleccionado.id}
              fechaSeleccionada={fecha}
              alSeleccionarFecha={setFecha}
              soloFechasFuturas
            />
            <button
              disabled={seleccionado.activo === false}
              onClick={() =>
                navigate("/solicitar-evento?recinto=" + seleccionado.id)
              }
              className="rounded-xl bg-[#7a132b] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {seleccionado.activo === false
                ? "Recinto inactivo"
                : "Preparar solicitud en este recinto"}
            </button>
          </section>
        ) : (
          <p>No hay recintos activos.</p>
        )}
      </div>
    </div>
  );
}
