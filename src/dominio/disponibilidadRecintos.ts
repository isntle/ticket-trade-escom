import type {
  ActividadDisponibilidad, FranjaLibre, OcupacionDisponibilidad, RevisionActividadDisponibilidad,
} from "../servicios/disponibilidadRecintos.js";

/** Margen vigente de TT020. No duplicarlo como una preferencia del navegador. */
export const MARGEN_SEPARACION_RECINTOS = 30;
export const minutosRecinto = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3));
export const horaRecinto = (minutos: number) => `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
export function fechaRecintoValida(fecha: unknown): fecha is string {
  return typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !fecha.startsWith("0000-") &&
    Number.isFinite(Date.parse(fecha + "T12:00:00Z")) &&
    new Date(fecha + "T12:00:00Z").toISOString().slice(0, 10) === fecha;
}
export function horarioRecintoValido(inicio: unknown, fin: unknown): boolean {
  const hora = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return typeof inicio === "string" && typeof fin === "string" && hora.test(inicio) && hora.test(fin) && inicio < fin && fin <= "21:00";
}
const margenOcupacion = (ocupacion: OcupacionDisponibilidad, margen: number) =>
  ocupacion.fuente === "evento" || ocupacion.fuente === "propuesta" ? margen : 0;

/** Intervalos [inicio, fin). Las clases se muestran, pero no restan franjas utilizables. */
export function franjasLibresRecinto(ocupaciones: readonly OcupacionDisponibilidad[], margen: number): FranjaLibre[] {
  const intervalos = ocupaciones.filter((o) => !o.informativa).map((o) => [
    Math.max(0, minutosRecinto(o.horaInicio) - margenOcupacion(o, margen)),
    Math.min(21 * 60, minutosRecinto(o.horaFin) + margenOcupacion(o, margen)),
  ]).filter(([inicio, fin]) => inicio < fin).sort((a, b) => a[0] - b[0]);
  const libres: FranjaLibre[] = [];
  let cursor = 0;
  for (const [inicio, fin] of intervalos) {
    if (inicio > cursor) libres.push({ horaInicio: horaRecinto(cursor), horaFin: horaRecinto(inicio) });
    cursor = Math.max(cursor, fin);
  }
  if (cursor < 21 * 60) libres.push({ horaInicio: horaRecinto(cursor), horaFin: "21:00" });
  return libres;
}
export function revisarFranjaRecinto(
  actividad: ActividadDisponibilidad,
  ocupaciones: readonly OcupacionDisponibilidad[],
  margen: number,
): RevisionActividadDisponibilidad {
  const coincidencias = ocupaciones.filter((o) => {
    if (o.idRecinto !== actividad.idRecinto || o.fecha !== actividad.fecha) return false;
    const separacion = o.informativa ? 0 : margenOcupacion(o, margen);
    return minutosRecinto(actividad.horaInicio) < minutosRecinto(o.horaFin) + separacion &&
      minutosRecinto(o.horaInicio) < minutosRecinto(actividad.horaFin) + separacion;
  });
  const conflictos = coincidencias.filter((o) => !o.informativa);
  return { ...actividad, disponible: !conflictos.length, conflictos, advertencias: coincidencias.filter((o) => o.informativa) };
}
