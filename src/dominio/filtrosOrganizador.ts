import { inicioEnMexico } from "./solicitudes.js";
import type { Evento, SolicitudEvento } from "../tipos/index.js";

/** La búsqueda ignora mayúsculas y acentos; recibe únicamente registros propios. */
export function filtrarPorTituloYEstado<T extends { estado: string }>(
  registros: T[],
  titulo: (registro: T) => string,
  busqueda: string,
  estado: string,
): T[] {
  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const termino = normalizar(busqueda);
  return registros.filter(
    (registro) =>
      normalizar(titulo(registro)).includes(termino) &&
      (estado === "TODOS" || registro.estado === estado),
  );
}
export function nombreEstadoOrganizador(estado: string): string {
  const nombres: Record<string, string> = {
    borrador: "Borrador",
    configuracion: "En configuración",
    publicado: "Publicado",
    en_curso: "En curso",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
    en_revision: "En revisión",
    requiere_correccion: "Por corregir",
    autorizada: "Autorizada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
  };
  return nombres[estado] || estado.replace(/_/g, " ");
}

const sinFecha = Number.NEGATIVE_INFINITY;
const instante = (fecha?: string) => {
  const valor = fecha ? Date.parse(fecha) : NaN;
  return Number.isFinite(valor) ? valor : sinFecha;
};

/** Las actividades vigentes o próximas van antes que el historial. */
export function ordenarEventosOrganizador<T extends Pick<Evento, "estado" | "fechas" | "fechaPublicacion">>(
  eventos: readonly T[],
  ahora = Date.now(),
) {
  return eventos.map(evento => {
    const activas = evento.fechas.filter(fecha => !fecha.cancelada);
    const fechas = (activas.length ? activas : evento.fechas).map(actividad => {
      const inicio = inicioEnMexico(actividad.fecha, actividad.horaInicio);
      const fin = inicioEnMexico(actividad.fecha, actividad.horaFin);
      return { actividad, inicio, fin: Number.isFinite(fin) ? fin : inicio };
    }).filter(fecha => Number.isFinite(fecha.inicio));
    const siguiente = evento.estado !== "cancelado" && evento.estado !== "finalizado"
      ? fechas.filter(f => !f.actividad.cancelada && f.fin >= ahora).sort((a, b) => a.inicio - b.inicio)[0]
      : undefined;
    const ultima = fechas.sort((a, b) => b.fin - a.fin)[0];
    return {
      evento,
      actividadPrincipal: (siguiente || ultima)?.actividad,
      proximo: Boolean(siguiente),
      prioridad: siguiente?.inicio ?? ultima?.fin ?? instante(evento.fechaPublicacion),
    };
  }).sort((a, b) => {
    if (a.proximo !== b.proximo) return a.proximo ? -1 : 1;
    if (a.prioridad === b.prioridad) return 0;
    return a.proximo ? a.prioridad - b.prioridad : b.prioridad - a.prioridad;
  });
}

/** La fecha del envío inicial prevalece sobre las actualizaciones de seguimiento. */
export function ordenarSolicitudesRecientes<T extends Pick<SolicitudEvento, "fechaCreacion" | "fechaEnvioInicial">>(
  solicitudes: readonly T[],
): T[] {
  const fecha = (s: T) => {
    const envio = instante(s.fechaEnvioInicial);
    return envio === sinFecha ? instante(s.fechaCreacion) : envio;
  };
  return [...solicitudes].sort((a, b) => fecha(b) - fecha(a));
}
