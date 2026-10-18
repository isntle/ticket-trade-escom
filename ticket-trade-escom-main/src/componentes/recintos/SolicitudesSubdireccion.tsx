import React, { useState } from "react";
import {
  CalendarDays,
  MapPin,
  History,
  Search,
  Image as Imagen,
  AlertTriangle,
} from "lucide-react";
import { useDatos } from "../../contextos/DatosContexto";
import { InsigniaEstado } from "../ui/InsigniaEstado";
import {
  inicioEnMexico,
  esFechaUrgente,
  versionSolicitud,
  ZONA_HORARIA,
} from "../../dominio/solicitudes";
import type { SolicitudEvento } from "../../tipos";

export function SolicitudesSubdireccion({
  navigate,
}: {
  navigate: (ruta: string) => void;
}) {
  const { listaSolicitudes, listaRecintos, listaEventos } = useDatos();
  const cartel = (s: SolicitudEvento) =>
    s.urlImagen || listaEventos.find((e) => e.idSolicitud === s.id)?.urlImagen;
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const comparar = (a: SolicitudEvento, b: SolicitudEvento) =>
    Date.parse(a.fechaEnvioInicial || a.fechaCreacion) -
    Date.parse(b.fechaEnvioInicial || b.fechaCreacion);
  const visibles = listaSolicitudes.filter(
    (s) =>
      s.estado !== "borrador" &&
      `${s.tituloEvento} ${s.nombreSolicitante} ${s.id}`
        .toLocaleLowerCase("es")
        .includes(busqueda.toLocaleLowerCase("es")) &&
      (filtro === "todos" || s.estado === filtro),
  );
  const pendientes = visibles
    .filter((s) => ["en_revision", "requiere_correccion"].includes(s.estado))
    .sort(comparar);
  const historial = visibles
    .filter((s) => !["en_revision", "requiere_correccion"].includes(s.estado))
    .sort((a, b) => -comparar(a, b));
  const tarjeta = (s: SolicitudEvento) => (
    <article
      key={s.id}
      className="grid gap-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-[100px_minmax(0,1fr)] sm:p-6"
    >
      {cartel(s) && /^(https?:\/\/|data:image\/)/.test(cartel(s)!) ? (
        <img
          src={cartel(s)}
          alt={`Cartel de ${s.tituloEvento}`}
          className="h-24 w-full rounded-xl bg-neutral-100 object-contain sm:h-28"
        />
      ) : (
        <div
          className="hidden h-28 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 sm:flex"
          aria-label="Sin cartel adjunto"
        >
          <Imagen size={27} />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 items-center">
              <InsigniaEstado estado={s.estado} />
              {s.esExcepcional && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.fechasSolicitadas.some((dia) => esFechaUrgente(dia)) ? "bg-amber-100 text-amber-900" : "bg-neutral-100 text-neutral-700"}`}
                >
                  <AlertTriangle size={13} />
                  {s.fechasSolicitadas.some((dia) => esFechaUrgente(dia))
                    ? "Urgente"
                    : "Extraordinaria"}
                </span>
              )}
              <span className="text-xs text-neutral-500">
                Versión {versionSolicitud(s)}
              </span>
            </div>
            <h3 className="text-lg font-bold leading-snug">{s.tituloEvento}</h3>
            <p className="mt-1 text-sm text-neutral-600">
              {s.nombreSolicitante} · {s.afiliacionSolicitante}
            </p>
          </div>
          <button
            onClick={() => navigate(`/subdireccion/solicitudes/${s.id}`)}
            className="shrink-0 rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#630f23]"
          >
            Ver detalle
          </button>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600">
          {s.descripcionEvento}
        </p>
        {s.estado === "en_revision" &&
          s.fechasSolicitadas.some(
            (dia) => inicioEnMexico(dia.fecha, dia.horaInicio) <= Date.now(),
          ) && (
            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              La fecha solicitada ya comenzó o pasó. No se puede autorizar con
              esa programación.
            </p>
          )}
        <ul className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
          {s.fechasSolicitadas.map((dia, i) => (
            <li key={dia.id} className="rounded-xl bg-neutral-50 p-3">
              <p className="flex items-center gap-2 font-semibold">
                <CalendarDays size={15} />
                {dia.nombreDia || `Día ${i + 1}`} · {dia.fecha}
              </p>
              <p className="mt-1 text-neutral-600">
                {dia.horaInicio}–{dia.horaFin} h
              </p>
              <p className="mt-1 flex items-center gap-2 text-neutral-600">
                <MapPin size={14} />
                {listaRecintos.find((r) => r.id === dia.idRecinto)?.nombre ||
                  "Recinto no disponible"}
              </p>
            </li>
          ))}
        </ul>
        {s.esExcepcional && (
          <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
            <strong>Motivo de urgencia:</strong>{" "}
            {s.justificacionExcepcional || "Sin justificación registrada."}
          </p>
        )}
        {s.observacionesCorreccion && (
          <p className="mt-3 text-sm text-amber-800">
            <strong>Correcciones solicitadas:</strong>{" "}
            {s.observacionesCorreccion}
          </p>
        )}
        {s.motivoRechazo && (
          <p className="mt-3 text-sm text-rose-700">
            <strong>Motivo del rechazo:</strong> {s.motivoRechazo}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-xs text-neutral-500">
          <span>{s.asistenciaEstimada} personas</span>
          <span className="inline-flex items-center gap-1">
            <History size={13} />
            {s.historialVersiones?.length || 0} cambios registrados
          </span>
          <span>
            Envío:{" "}
            {new Date(s.fechaEnvioInicial || s.fechaCreacion).toLocaleString(
              "es-MX",
              {
                timeZone: ZONA_HORARIA,
                dateStyle: "medium",
                timeStyle: "short",
              },
            )}
          </span>
        </div>
      </div>
    </article>
  );
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar solicitud</span>
          <Search
            className="absolute left-3 top-3 text-neutral-400"
            size={18}
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por evento, solicitante o folio"
            className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar estado de solicitud</span>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-full rounded-xl border bg-white px-3 py-2.5 text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="en_revision">En revisión</option>
            <option value="requiere_correccion">Por corregir</option>
            <option value="autorizada">Autorizadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </label>
      </div>
      <section>
        <h2 className="text-xl font-bold">
          Solicitudes pendientes ({pendientes.length})
        </h2>
        <p className="mt-1 mb-5 text-sm leading-6 text-neutral-600">
          Abre el detalle para revisar la información, el cartel, los contactos
          y las versiones antes de resolver.
        </p>
        <div className="space-y-4">
          {pendientes.length ? (
            pendientes.map(tarjeta)
          ) : (
            <p className="rounded-xl border border-dashed p-7 text-sm text-neutral-500">
              No hay solicitudes pendientes que coincidan con tu búsqueda.
            </p>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-5 text-xl font-bold">
          Historial de solicitudes ({historial.length})
        </h2>
        <div className="space-y-4">
          {historial.length ? (
            historial.map(tarjeta)
          ) : (
            <p className="rounded-xl border border-dashed p-7 text-sm text-neutral-500">
              No hay solicitudes resueltas que coincidan con tu búsqueda.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
