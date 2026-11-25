import { textoParaUsuario } from '../../utilidades/textoParaUsuario.js';
import React from "react";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { VentanaModal } from "../ui/VentanaModal";
import { useAutenticacion } from "../../contextos/AutenticacionContexto";
import { useDisponibilidadRecintos } from "../../contextos/useDisponibilidadRecintos";
import { revisarFranjaRecinto } from "../../dominio/disponibilidadRecintos";
import { transporteApi } from "../../servicios/http";
import { apiActiva } from "../../servicios/modoDatos";
import { useDatos } from "../../contextos/DatosContexto";
import { aforoActividad, nombreActividad } from "../../dominio/actividades";
import type { PropuestaCambioRecinto } from "../../dominio/cambioRecinto";
import type { Evento } from "../../tipos";

const api = transporteApi();
type SolicitudRecinto = { id: string; propuesta: PropuestaCambioRecinto };

export function CambioRecintoActividad({
  evento,
  idActividad,
  alCerrar,
}: {
  evento: Evento;
  idActividad: string;
  alCerrar: () => void;
}) {
  const { listaRecintos, revisarCambioRecinto, confirmarCambioRecinto, obtenerOcupacionesRecinto, actualizarEstadoTaquilla } = useDatos();
  const { rolActivo } = useAutenticacion();
  const esRevisor = rolActivo === "subdireccion";
  const actividad = evento.fechas.find((a) => a.id === idActividad)!;
  const aforoActual = aforoActividad(actividad, evento.aforoMaximo) || 0;
  const [idRecinto, setRecinto] = React.useState("");
  const agenda = useDisponibilidadRecintos(actividad.fecha, idActividad);
  const consultarOcupaciones = (recinto: string) => agenda.remota
    ? agenda.agenda?.recintos.find(r => r.id === recinto)?.ocupaciones || []
    : obtenerOcupacionesRecinto(recinto, actividad.fecha);
  const ocupaciones = consultarOcupaciones(idRecinto);
  const revisionAgenda = revisarFranjaRecinto(
    { id: idActividad, idRecinto, fecha: actividad.fecha, horaInicio: actividad.horaInicio, horaFin: actividad.horaFin },
    ocupaciones.map(o => ({ ...o, fuente: o.tipo === "clase" || o.tipo === "bloqueo" ? o.tipo : "evento", informativa: o.tipo === "clase" })),
    agenda.margen,
  );
  const rutaRecinto = `/organizacion/eventos/${evento.id}/recinto`;
  const [pendiente, setPendiente] = React.useState<SolicitudRecinto | null>(null);
  const [consulta, setConsulta] = React.useState(apiActiva ? "cargando" : "lista");
  React.useEffect(() => {
    if (!apiActiva) return;
    const controlador = new AbortController();
    void api<{ pendiente: SolicitudRecinto | null }>(`${rutaRecinto}/pendiente?actividad=${idActividad}`, { signal: controlador.signal })
      .then(datos => { setPendiente(datos.pendiente); setConsulta("lista"); })
      .catch(() => { if (!controlador.signal.aborted) setConsulta("error"); });
    return () => controlador.abort();
  }, [rutaRecinto, idActividad]);
  const [aforo, setAforo] = React.useState(aforoActual);
  const [motivo, setMotivo] = React.useState("");
  const [propuesta, setPropuesta] =
    React.useState<PropuestaCambioRecinto | null>(null);
  const [reduccion, setReduccion] = React.useState(false);
  const [revisado, setRevisado] = React.useState(false);
  const [mensaje, setMensaje] = React.useState("");
  const [confirmado, setConfirmado] = React.useState(false);
  const ocupado = React.useRef(false);
  const [guardando, setGuardando] = React.useState(false);
  const ejecutar = async (accion: () => Promise<void>) => {
    if (ocupado.current) return;
    ocupado.current = true;
    setGuardando(true);
    try {
      await accion();
    } catch {
      setMensaje(
        "No se pudo completar la operación. Consulta los datos vigentes antes de intentarlo otra vez.",
      );
    } finally {
      ocupado.current = false;
      setGuardando(false);
    }
  };
  const campo =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm";
  return (
    <VentanaModal
      estaAbierto
      alCerrar={alCerrar}
      titulo="Cambiar recinto"
      subtitulo={nombreActividad(actividad, evento.fechas.indexOf(actividad))}
      anchoMaximo="4xl"
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-neutral-50 p-4 text-sm">
          <strong>
            {actividad.fecha} · {actividad.horaInicio}–{actividad.horaFin}
          </strong>
          <p className="mt-1 text-neutral-600">{listaRecintos.find(r => r.id === actividad.idRecinto)?.nombre}</p>
        </div>
        {mensaje && (
          <p
            role="status"
            className={`rounded-xl p-4 text-sm ${confirmado ? "bg-neutral-50 text-neutral-900" : "bg-rose-50 text-rose-900"}`}
          >
            {textoParaUsuario(mensaje)}
          </p>
        )}
        {consulta === "cargando" && <p role="status">Consultando solicitudes…</p>}
        {consulta === "error" && <p role="alert">No se pudo consultar. Cierra la ventana y vuelve a intentarlo.</p>}
        {pendiente && !confirmado && (
          <section className="space-y-3">
            <h3 className="font-bold">Cambio pendiente de aprobación</h3>
            <p className="text-sm">{pendiente.propuesta.recintoAnterior} → {pendiente.propuesta.recintoNuevo}</p>
            <p className="text-sm"><strong>Aforo propuesto</strong> {pendiente.propuesta.aforoNuevo} · {pendiente.propuesta.compromisos} compromisos</p>
            <p className="text-sm break-words">{pendiente.propuesta.peticion.motivo}</p>
            {pendiente.propuesta.lugares.length > 0 && (
              <details className="rounded-lg border border-neutral-200 p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Lugares reasignados</summary>
                <ul className="mt-2 space-y-1">{pendiente.propuesta.lugares.map(l => (
                  <li key={l.origen}>{l.etiquetaAnterior} → {l.etiquetaNueva}</li>
                ))}</ul>
              </details>
            )}
            {esRevisor && (
              <div className="flex flex-wrap gap-3">
                {(["aprobar", "rechazar"] as const).map(decision => (
                  <button key={decision} type="button" disabled={guardando}
                    className={`rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40 ${decision === "aprobar" ? "bg-[#7a132b] text-white" : "border border-neutral-200"}`}
                    onClick={() => ejecutar(async () => {
                      setMensaje("");
                      try {
                        await api(rutaRecinto, { metodo: "POST", datos: { idSolicitud: pendiente.id, decision } });
                      } catch (error) {
                        setMensaje(error instanceof Error ? error.message : "No se pudo resolver la solicitud.");
                        return;
                      }
                      setConfirmado(true);
                      setMensaje(decision === "aprobar" ? "Cambio de recinto aprobado." : "Cambio de recinto rechazado.");
                      await actualizarEstadoTaquilla?.();
                    })}>
                    {decision === "aprobar" ? "Aprobar cambio" : "Rechazar solicitud"}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        {!confirmado && !propuesta && !pendiente && consulta === "lista" && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await ejecutar(async () => {
                setMensaje("");
                const r = await revisarCambioRecinto({
                  idEvento: evento.id,
                  idActividad,
                  idRecinto,
                  aforo,
                  motivo,
                });
                if (r.propuesta) {
                  setPropuesta(r.propuesta);
                  setReduccion(false);
                  setRevisado(false);
                } else
                  setMensaje(
                    r.error || "No se pudo consultar la compatibilidad.",
                  );
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Recinto de destino
                <select
                  required
                  className={campo}
                  value={idRecinto}
                  onChange={(e) => {
                    setRecinto(e.target.value);
                    setAforo(
                      Math.min(
                        aforoActual,
                        listaRecintos.find((r) => r.id === e.target.value)
                          ?.capacidad || aforoActual,
                      ),
                    );
                  }}
                >
                  <option value="">Selecciona un recinto</option>
                  {listaRecintos
                    .filter(
                      (r) => r.activo !== false && r.id !== actividad.idRecinto,
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} · capacidad {r.capacidad}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Aforo propuesto
                <input
                  required
                  type="number"
                  min={1}
                  max={aforoActual}
                  value={aforo}
                  onChange={(e) => setAforo(Number(e.target.value))}
                  className={campo}
                />
                <span className="mt-1 block text-xs font-normal text-neutral-500">
                  Aforo actual {aforoActual}
                </span>
              </label>
            </div>
            {idRecinto && <section aria-label="Agenda del recinto" className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
              <h3 className="font-bold">Ocupaciones del día</h3>
              {agenda.estado === "error" ? (
                <p className="mt-1">No se pudo actualizar la agenda. <button type="button" className="underline" onClick={agenda.recargar}>Volver a consultar</button></p>
              ) : agenda.remota && !agenda.agenda ? (
                <p className="mt-1" role="status">Consultando la agenda…</p>
              ) : ocupaciones.length ? (
                <ul className="mt-2 divide-y divide-neutral-200">
                  {ocupaciones.map(o => <li key={o.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                    <span className="shrink-0 tabular-nums text-neutral-600">{o.horaInicio}–{o.horaFin}</span>
                    <span>{o.titulo}</span>
                    {revisionAgenda.conflictos.some(c => c.id === o.id) && <strong className="text-[#7a132b]">Coincide con esta actividad</strong>}
                  </li>)}
                </ul>
              ) : <p className="mt-1 text-neutral-600">Sin ocupaciones registradas.</p>}
            </section>}
            <label className="block text-sm font-semibold">
              Motivo del cambio
              <textarea
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className={campo}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                disabled={guardando || Boolean(idRecinto && !revisionAgenda.disponible)}
                aria-busy={guardando}
                type="submit"
              >
                Revisar compatibilidad
              </button>
              <button
                type="button"
                onClick={alCerrar}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
        {!confirmado && propuesta && (
          <section
            className="space-y-4"
            aria-label="Revisión de correspondencia de lugares"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 p-4">
                <span className="text-xs text-neutral-500">Recinto actual</span>
                <strong className="block">{propuesta.recintoAnterior}</strong>
                <span className="text-sm">Aforo {propuesta.aforoAnterior}</span>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <span className="text-xs text-neutral-600">
                  Recinto propuesto
                </span>
                <strong className="block">{propuesta.recintoNuevo}</strong>
                <span className="text-sm">
                  Aforo {propuesta.aforoNuevo} · {propuesta.compromisos}{" "}
                  compromisos conservados
                </span>
              </div>
            </div>
            {propuesta.lugares.length > 0 && <p className="text-sm text-neutral-600">Asigna un destino distinto a cada lugar comprometido.</p>}
            <div className="space-y-2">
              {propuesta.lugares.map((l) => (
                <div
                  key={l.origen}
                  className="grid gap-3 rounded-xl bg-neutral-50 p-3 sm:grid-cols-2"
                >
                  <div className="min-w-0 text-sm">
                    <strong>
                      {l.etiquetaAnterior} · {l.categoria}
                    </strong>
                    <span className="block break-words text-neutral-600">
                      {l.titulares}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <ArrowRight size={16} />
                    <span className="sr-only">
                      Nuevo lugar para {l.etiquetaAnterior}
                    </span>
                    <select
                      aria-label={`Nuevo lugar para ${l.etiquetaAnterior}`}
                      className={campo}
                      value={l.destino}
                      onChange={(e) => {
                        const destino = propuesta.destinos.find(
                          (d) => d.id === e.target.value,
                        )!;
                        setRevisado(false);
                        setPropuesta({
                          ...propuesta,
                          lugares: propuesta.lugares.map((x) =>
                            x.origen === l.origen
                              ? {
                                  ...x,
                                  destino: destino.id,
                                  etiquetaNueva: destino.etiqueta,
                                }
                              : x,
                          ),
                          peticion: {
                            ...propuesta.peticion,
                            correspondencias:
                              propuesta.peticion.correspondencias!.map((x) =>
                                x.origen === l.origen
                                  ? { ...x, destino: destino.id }
                                  : x,
                              ),
                          },
                        });
                      }}
                    >
                      {propuesta.destinos.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.etiqueta}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>
            {propuesta.reduccion && (
              <label className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={reduccion}
                  onChange={(e) => setReduccion(e.target.checked)}
                />
                Acepto reducir el aforo de {propuesta.aforoAnterior} a {propuesta.aforoNuevo}.
              </label>
            )}
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={revisado}
                onChange={(e) => setRevisado(e.target.checked)}
              />
              <span>
                Revisé la propuesta y los lugares asignados.
              </span>
            </label>
            {apiActiva && !esRevisor && <p className="text-sm text-neutral-600">El recinto cambia después de que Subdirección lo apruebe.</p>}
            <div className="flex flex-wrap gap-3">
              <button
                disabled={
                  guardando || !revisado || (propuesta.reduccion && !reduccion)
                }
                className="flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                onClick={() =>
                  ejecutar(async () => {
                    const r = await confirmarCambioRecinto(
                      propuesta,
                      reduccion,
                    );
                    setMensaje(
                      r.exito
                        ? r.pendiente ? "Solicitud enviada a Subdirección." : "Recinto actualizado. Los boletos conservan su QR."
                        : r.error || "No se pudo confirmar.",
                    );
                    if (r.exito) setConfirmado(true);
                  })
                }
              >
                <ShieldCheck size={17} />
                {apiActiva && !esRevisor ? "Enviar a Subdirección" : "Confirmar cambio"}
              </button>
              <button
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                onClick={() => {
                  setPropuesta(null);
                  setMensaje("");
                }}
              >
                Editar propuesta
              </button>
            </div>
          </section>
        )}
        {confirmado && (
          <button
            onClick={alCerrar}
            className="flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-3 text-sm font-bold text-white"
          >
            <MapPin size={17} />
            Volver al evento
          </button>
        )}
      </div>
    </VentanaModal>
  );
}
