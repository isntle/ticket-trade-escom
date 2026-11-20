import type { TipoAfiliacion } from "../tipos";

/** Agrupa afiliaciones heredadas seg?n las categor?as de registro de PostgreSQL. */
export function afiliacionLegible(afiliacion: TipoAfiliacion): string {
  if (afiliacion === "alumno") return "Estudiante";
  if (afiliacion === "externo") return "Externo";
  return "Empleado del IPN";
}
