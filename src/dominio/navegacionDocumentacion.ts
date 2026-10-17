import type { Evento } from "../tipos";
import { inicioEnMexico } from "./solicitudes";

/** Selecciona recursos de prueba existentes; nunca crea eventos para justificar un enlace. */
export function resolverRutaDocumentacion(
  caso: { id: string; ruta?: string },
  eventos: Evento[],
  ahora = new Date(),
): string | undefined {
  if (
    !caso.id.startsWith("CU-OR-") ||
    !caso.ruta?.startsWith("/organizador/eventos/")
  )
    return caso.ruta;
  const propios = eventos.filter(
    (evento) =>
      evento.idOrganizador === "usr-silva" && evento.estado !== "cancelado",
  );
  const futuros = propios.filter((evento) =>
    evento.fechas.some(
      (fecha) =>
        !fecha.cancelada &&
        inicioEnMexico(fecha.fecha, fecha.horaInicio) > ahora.getTime(),
    ),
  );
  if (caso.ruta.includes("/arreglos")) {
    const evento =
      futuros.find((item) => item.id === "evt-taller-devops-config") ||
      futuros[0];
    const fecha = evento?.fechas.find(
      (dia) =>
        !dia.cancelada &&
        inicioEnMexico(dia.fecha, dia.horaInicio) > ahora.getTime(),
    );
    return evento && fecha
      ? `/organizador/eventos/${evento.id}/fechas/${fecha.id}/arreglos`
      : "/organizador";
  }
  const evento =
    futuros.find((item) => item.estado === "publicado") || futuros[0];
  return evento ? `/organizador/eventos/${evento.id}` : "/organizador";
}
