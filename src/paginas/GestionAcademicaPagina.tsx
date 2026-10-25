import React from "react";
import { ArrowLeft, GraduationCap, CalendarDays } from "lucide-react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { verificacionIdentidadVigente } from "../dominio/identidad";
import { volverA } from "../dominio/navegacion";
import type { PeriodoIdentidad } from "../dominio/periodosIdentidad";

const campo = "mt-1 w-full rounded-xl border border-neutral-200 bg-white p-3";
export function GestionAcademicaPagina({
  navigate,
}: {
  navigate: (ruta: string) => void;
}) {
  const auth = useAutenticacion();
  const [periodos, setPeriodos] = React.useState<PeriodoIdentidad[]>(
    auth.periodosIdentidad,
  );
  const [versionPeriodos, setVersionPeriodos] = React.useState(
    JSON.stringify(auth.periodosIdentidad),
  );
  const [mensaje, setMensaje] = React.useState("");
  const [propuesta, setPropuesta] = React.useState<{
    id: string;
    valor: boolean;
    version: number;
  } | null>(null);
  const [motivo, setMotivo] = React.useState("");
  if (
    auth.rolActivo !== "subdireccion" ||
    !auth.usuarioActual?.roles.includes("subdireccion")
  )
    return (
      <section className="p-8">
        Esta gestión corresponde a Subdirección.
      </section>
    );
  const elegida = auth.todosLosUsuarios.find((u) => u.id === propuesta?.id);
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate(volverA("/subdireccion"))}
        className="flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} />
        Regresar
      </button>
      <header>
        <p className="font-semibold text-[#7a132b]">Subdirección</p>
        <h1 className="text-3xl font-bold">
          Jefes de academia y periodos escolares
        </h1>
        <p className="mt-2 text-neutral-600">
          Gestiona las jefaturas y el calendario que determina la vigencia de
          las verificaciones.
        </p>
      </header>
      {mensaje && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-950">
          {mensaje}
        </p>
      )}
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <GraduationCap />
          Jefes de academia
        </h2>
        <p className="text-sm text-neutral-600">
          Las solicitudes ordinarias de un jefe de academia se autorizan al
          enviarse si cumplen disponibilidad, capacidad, distribución y
          anticipación. Las urgentes siguen requiriendo revisión de
          Subdirección.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {auth.todosLosUsuarios
            .filter((u) => u.afiliacion === "profesor" || u.puedeAutoaprobar)
            .map((u) => (
              <article
                key={u.id}
                className="rounded-xl border border-neutral-200 p-4"
              >
                <h3 className="font-bold">{u.nombre}</h3>
                <p className="break-all text-sm text-neutral-500">{u.correo}</p>
                <p className="my-3 text-sm">
                  {u.puedeAutoaprobar ? "Jefe de academia" : "Sin jefatura"} ·{" "}
                  {verificacionIdentidadVigente(u)
                    ? "Identidad verificada"
                    : "Identidad pendiente o vencida"}
                </p>
                <button
                  disabled={
                    !u.puedeAutoaprobar &&
                    (!u.estaActivo ||
                      u.afiliacion !== "profesor" ||
                      !verificacionIdentidadVigente(u) ||
                      u.correoConfirmado !== true)
                  }
                  className="rounded-lg bg-[#7a132b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  onClick={() => {
                    setPropuesta({
                      id: u.id,
                      valor: !u.puedeAutoaprobar,
                      version: u.versionIdentidad || 0,
                    });
                    setMotivo("");
                  }}
                >
                  {u.puedeAutoaprobar ? "Retirar jefatura" : "Asignar jefatura"}
                </button>
              </article>
            ))}
        </div>
        {propuesta && elegida && (
          <form
            className="space-y-3 rounded-xl bg-amber-50 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const r = auth.cambiarAutoaprobacion(
                propuesta.id,
                propuesta.valor,
                motivo,
                propuesta.version,
              );
              setMensaje(r.mensaje);
              if (r.exito) setPropuesta(null);
            }}
          >
            <h3 className="font-bold">
              {propuesta.valor ? "Asignar" : "Retirar"} jefatura:{" "}
              {elegida.nombre}
            </h3>
            <label className="block text-sm">
              Motivo
              <textarea
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className={campo}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-[#7a132b] px-4 py-2 text-white"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setPropuesta(null)}
                className="rounded-lg border border-neutral-200 px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <CalendarDays />
          Periodos de verificación
        </h2>
        <p className="text-sm text-neutral-600">
          Registra las fechas exactas del calendario académico aplicable a
          ESCOM. No se calcula una vigencia de seis meses desde cada aprobación.
          Tres rechazos dentro del periodo suspenden nuevos envíos hasta el
          siguiente.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const r = auth.configurarPeriodosIdentidad(
              periodos,
              versionPeriodos,
            );
            setMensaje(r.mensaje);
            if (r.exito) setVersionPeriodos(JSON.stringify(periodos));
          }}
        >
          {periodos.map((p, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2"
            >
              <label className="text-sm">
                Periodo
                <input
                  required
                  className={campo}
                  value={p.id}
                  onChange={(e) =>
                    setPeriodos(
                      periodos.map((n, j) =>
                        j === i ? { ...n, id: e.target.value } : n,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                Referencia del calendario
                <input
                  required
                  className={campo}
                  value={p.fuente}
                  placeholder="Documento o enlace oficial"
                  onChange={(e) =>
                    setPeriodos(
                      periodos.map((n, j) =>
                        j === i ? { ...n, fuente: e.target.value } : n,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                Inicio
                <input
                  required
                  type="date"
                  className={campo}
                  value={p.inicio}
                  onChange={(e) =>
                    setPeriodos(
                      periodos.map((n, j) =>
                        j === i ? { ...n, inicio: e.target.value } : n,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                Fin
                <input
                  required
                  type="date"
                  className={campo}
                  value={p.fin}
                  onChange={(e) =>
                    setPeriodos(
                      periodos.map((n, j) =>
                        j === i ? { ...n, fin: e.target.value } : n,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg border border-neutral-200 px-4 py-2"
              onClick={() =>
                setPeriodos([
                  ...periodos,
                  { id: "", inicio: "", fin: "", fuente: "" },
                ])
              }
            >
              Añadir periodo
            </button>
            <button
              type="button"
              className="rounded-lg border border-neutral-200 px-4 py-2"
              onClick={() => {
                setPeriodos(auth.periodosIdentidad);
                setVersionPeriodos(JSON.stringify(auth.periodosIdentidad));
                setMensaje("Periodos recargados.");
              }}
            >
              Recargar periodos
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#7a132b] px-4 py-2 text-white"
            >
              Guardar periodos
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
