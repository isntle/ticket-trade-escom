import { BotonRegresar } from "../componentes/ui/BotonRegresar";
import { transporteApi } from "../servicios/http";
import { apiActiva } from "../servicios/modoDatos";
import { textoParaUsuario } from '../utilidades/textoParaUsuario.js';
import React from "react";
import { GraduationCap, CalendarDays } from "lucide-react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { verificacionIdentidadVigente } from "../dominio/identidad";
import { volverASeccion } from "../dominio/navegacion";
import type { PeriodoIdentidad } from "../dominio/periodosIdentidad";

const api = transporteApi();
type Opcion = { id: string; nombre: string };
type Catalogo = { academias: (Opcion & { titular?: string })[]; otorgantes: Opcion[] };
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
  const puedeOperar = auth.rolActivo === "admin" && auth.usuarioActual?.roles.includes("admin");
  const [catalogo, setCatalogo] = React.useState<Catalogo>();
  const [idAcademia, setAcademia] = React.useState("");
  const [nombreAcademia, setNombreAcademia] = React.useState("");
  const [idOtorgante, setOtorgante] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  React.useEffect(() => {
    if (!apiActiva || !puedeOperar) return;
    const control = new AbortController();
    void api<Catalogo>("/auth/jefaturas/catalogo", {signal: control.signal})
      .then(setCatalogo).catch((error: Error) => {
        if (!control.signal.aborted) setMensaje(error.message);
      });
    return () => control.abort();
  }, [puedeOperar]);
  const tieneJefatura = (u: (typeof auth.todosLosUsuarios)[number]) =>
    apiActiva ? Boolean(u.tieneJefaturaAcademica) : Boolean(u.puedeAutoaprobar);
  if (!puedeOperar)
    return (
      <section className="p-8">
        Esta gestión corresponde a Administración.
      </section>
    );
  const elegida = auth.todosLosUsuarios.find((u) => u.id === propuesta?.id);
  const docentes = auth.todosLosUsuarios.filter(u => u.afiliacion === "profesor" || tieneJefatura(u));
  const puedeRecibirJefatura = (u: (typeof docentes)[number]) =>
    u.estaActivo && u.afiliacion === "profesor" && u.correoConfirmado === true && verificacionIdentidadVigente(u);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <BotonRegresar destino="Volver a Administración" alVolver={() =>
          navigate(volverASeccion("/admin"))} />
      <header>
        <p className="font-semibold text-[#7a132b]">
          Administración
        </p>
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
          {textoParaUsuario(mensaje)}
        </p>
      )}
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <GraduationCap />
          Jefes de academia
        </h2>
        <p className="text-sm text-neutral-600">
          Puedes nombrar a un docente con cuenta activa, correo confirmado y verificación vigente. Cada academia admite una jefatura.
        </p>
        {!docentes.some(u => !tieneJefatura(u) && puedeRecibirJefatura(u)) && (
          <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">No hay otros docentes que puedan recibir una jefatura por ahora.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {docentes.map((u) => (
              <article
                key={u.id}
                className="rounded-xl border border-neutral-200 p-4"
              >
                <h3 className="font-bold">{u.nombre}</h3>
                <p className="break-all text-sm text-neutral-500">{u.correo}</p>
                <p className="my-3 text-sm">
                  {tieneJefatura(u) ? "Jefe de academia" : "Sin jefatura"} ·{" "}
                  {verificacionIdentidadVigente(u)
                    ? "Identidad verificada"
                    : "Identidad pendiente o vencida"}
                </p>
                <button
                  disabled={!tieneJefatura(u) && !puedeRecibirJefatura(u)}
                  className="rounded-lg bg-[#7a132b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  onClick={() => {
                    setPropuesta({
                      id: u.id,
                      valor: !tieneJefatura(u),
                      version: u.versionIdentidad || 0,
                    });
                    setMotivo("");
                    setAcademia("");
                    setNombreAcademia("");
                    setOtorgante("");
                  }}
                >
                  {tieneJefatura(u) ? "Retirar jefatura" : "Asignar jefatura"}
                </button>
              </article>
            ))}
        </div>
        {propuesta && elegida && (
          <form
            className="space-y-3 rounded-xl bg-amber-50 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (guardando) return;
              setGuardando(true);
              try {
                const r = (await auth.cambiarAutoaprobacion(
                  propuesta.id,
                  propuesta.valor,
                  motivo,
                  propuesta.version,
                  apiActiva && propuesta.valor ? { idOtorgante, ...(idAcademia === "nueva" ? { nombreAcademia } : { idAcademia }) } : undefined,
                ));
                setMensaje(r.mensaje);
                if (r.exito) {
                  setPropuesta(null);
                  if (apiActiva) setCatalogo(await api<Catalogo>("/auth/jefaturas/catalogo"));
                }
              } catch (error) {
                setMensaje(error instanceof Error ? error.message : "No se pudo actualizar la jefatura.");
              } finally {
                setGuardando(false);
              }
            }}
          >
            <h3 className="font-bold">
              {propuesta.valor ? "Asignar" : "Retirar"} jefatura:{" "}
              {elegida.nombre}
            </h3>
            {apiActiva && propuesta.valor && <>
              <label className="block text-sm">Academia
                <select required className={campo} value={idAcademia} onChange={e => setAcademia(e.target.value)}>
                  <option value="">Selecciona una academia</option>
                  {catalogo && <option value="nueva">Registrar una academia</option>}
                  {catalogo?.academias.map(a => <option key={a.id} value={a.id} disabled={Boolean(a.titular)}>{a.nombre}{a.titular ? " · Ocupada" : ""}</option>)}
                </select>
              </label>
              {idAcademia === "nueva" && <label className="block text-sm">Nombre oficial de la academia
                <input required maxLength={120} className={campo} value={nombreAcademia} onChange={e => setNombreAcademia(e.target.value)} />
              </label>}
              <label className="block text-sm">Otorgante institucional de Subdirección
                <select required className={campo} value={idOtorgante} onChange={e => setOtorgante(e.target.value)}>
                  <option value="">Selecciona al otorgante</option>
                  {catalogo?.otorgantes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </label>
            </>}
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
                disabled={guardando}
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
        <p className="text-sm text-neutral-600">
          Las nuevas verificaciones se reciben dentro de los periodos registrados por Administración.
          {" "}<a className="font-semibold text-[#7a132b] underline"
            href="https://www.ipn.mx/assets/files/website/docs/inicio/calendarioipn-escolarizada.pdf"
            target="_blank" rel="noreferrer">Consultar calendario oficial</a>.
        </p>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = (await auth.configurarPeriodosIdentidad(
              periodos,
              versionPeriodos,
            ));
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
              {!apiActiva && (
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
              )}
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
    </div>
  );
}
