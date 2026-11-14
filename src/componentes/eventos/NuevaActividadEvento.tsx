import React from "react";
import { Plus } from "lucide-react";
import { useDatos } from "../../contextos/DatosContexto";
import { VentanaModal } from "../ui/VentanaModal";
import type { Evento } from "../../tipos";
export function NuevaActividadEvento({ evento }: { evento: Evento }) {
  const { listaRecintos, agregarFechaEvento } = useDatos();
  const [abierto, setAbierto] = React.useState(false),
    [guardando, setGuardando] = React.useState(false),
    [error, setError] = React.useState("");
  const bloqueo = React.useRef(false);
  const campo =
    "mt-1 block w-full rounded-xl border border-neutral-200 bg-white p-3";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setAbierto(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white"
      >
        <Plus size={18} />
        Autorizar nueva actividad
      </button>
      <VentanaModal
        estaAbierto={abierto}
        alCerrar={() => {
          if (!guardando) setAbierto(false);
        }}
        titulo="Añadir actividad al evento"
        anchoMaximo="2xl"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (bloqueo.current) return;
            const f = new FormData(e.currentTarget);
            bloqueo.current = true;
            setGuardando(true);
            setError("");
            try {
              const r = await (agregarFechaEvento as any)(evento.id, {
                nombreActividad: f.get("nombre"),
                descripcionActividad: f.get("descripcion"),
                fecha: f.get("fecha"),
                horaInicio: f.get("inicio"),
                horaFin: f.get("fin"),
                idRecinto: f.get("recinto"),
                modalidadAsistencia: f.get("acceso"),
                asistenciaEstimada: Number(f.get("aforo")),
                motivo: f.get("motivo"),
              });
              if (r?.exito === false)
                setError(r.error || "No se pudo guardar.");
              else setAbierto(false);
            } catch {
              setError(
                "Revisa la conexión y consulta el evento antes de intentarlo nuevamente.",
              );
            } finally {
              bloqueo.current = false;
              setGuardando(false);
            }
          }}
        >
          <p className="text-sm text-neutral-600">
            Esta acción de Subdirección amplía la programación autorizada. El
            servidor comprobará disponibilidad, capacidad y lugares.
          </p>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">
              {error}
            </p>
          )}
          <label className="block text-sm font-semibold">
            Nombre de la actividad
            <input name="nombre" required maxLength={300} className={campo} />
          </label>
          <label className="block text-sm font-semibold">
            Descripción
            <textarea name="descripcion" required className={campo} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">
              Fecha
              <input name="fecha" type="date" required className={campo} />
            </label>
            <label className="text-sm font-semibold">
              Inicio
              <input
                name="inicio"
                type="time"
                min="07:00"
                max="21:00"
                required
                className={campo}
              />
            </label>
            <label className="text-sm font-semibold">
              Término
              <input
                name="fin"
                type="time"
                min="07:00"
                max="21:00"
                required
                className={campo}
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Recinto
            <select name="recinto" required className={campo}>
              <option value="">Selecciona un recinto</option>
              {listaRecintos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} · {r.capacidad} lugares
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Acceso
              <select name="acceso" className={campo}>
                <option value="registro">Registro sin asiento</option>
                <option value="controlado">Reservación con lugar</option>
                <option value="libre">Entrada libre</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Aforo
              <input
                name="aforo"
                type="number"
                min={1}
                required
                className={campo}
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Motivo de la autorización
            <textarea
              name="motivo"
              required
              maxLength={2000}
              className={campo}
            />
          </label>
          <button
            disabled={guardando}
            aria-busy={guardando}
            className="rounded-xl bg-[#7a132b] px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Autorizar y guardar actividad"}
          </button>
        </form>
      </VentanaModal>
    </>
  );
}
