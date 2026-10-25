import type { Usuario } from "../tipos";

export interface PeriodoIdentidad {
  id: string;
  inicio: string;
  fin: string;
  fuente: string;
}
export const CLAVE_PERIODOS_IDENTIDAD = "tt_periodos_identidad_v1";
export function validarPeriodosIdentidad(
  periodos: PeriodoIdentidad[],
): string | undefined {
  const ordenados = [...periodos].sort((a, b) =>
    a.inicio.localeCompare(b.inicio),
  );
  if (!ordenados.length) return "Registra al menos un periodo académico.";
  for (let i = 0; i < ordenados.length; i++) {
    const p = ordenados[i];
    if (
      typeof p.id !== "string" ||
      typeof p.fuente !== "string" ||
      !p.id.trim() ||
      !p.fuente.trim() ||
      ![p.inicio, p.fin].every(
        (d) =>
          typeof d === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(d) &&
          Number.isFinite(Date.parse(d + "T12:00:00Z")) &&
          new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d,
      ) ||
      p.fin < p.inicio
    )
      return "Revisa el nombre, las fechas y la referencia del calendario.";
    if (
      ordenados.some((otro, j) => j !== i && otro.id === p.id) ||
      (i > 0 && p.inicio <= ordenados[i - 1].fin)
    )
      return "Los periodos no deben duplicarse ni traslaparse.";
  }
}
export function leerPeriodosIdentidad(): PeriodoIdentidad[] {
  try {
    const p = JSON.parse(
      localStorage.getItem(CLAVE_PERIODOS_IDENTIDAD) || "[]",
    );
    return Array.isArray(p) && !validarPeriodosIdentidad(p) ? p : [];
  } catch {
    return [];
  }
}
export function periodoIdentidadActual(
  periodos: PeriodoIdentidad[],
  ahora = Date.now(),
) {
  return periodos.find(
    (p) =>
      Date.parse(p.inicio + "T00:00:00-06:00") <= ahora &&
      ahora <= Date.parse(p.fin + "T23:59:59.999-06:00"),
  );
}
export function rechazosPeriodo(cuenta: Usuario, periodo: PeriodoIdentidad) {
  return (cuenta.historialExpediente || []).filter(
    (h) =>
      h.estado === "rechazado" &&
      Date.parse(h.fecha) >= Date.parse(periodo.inicio + "T00:00:00-06:00") &&
      Date.parse(h.fecha) <= Date.parse(periodo.fin + "T23:59:59.999-06:00"),
  ).length;
}
export function impedimentoVerificacion(
  cuenta: Usuario,
  periodos: PeriodoIdentidad[],
  ahora = Date.now(),
): string | undefined {
  if (
    cuenta.verificacionSilenciadaHasta &&
    Date.parse(cuenta.verificacionSilenciadaHasta + "T23:59:59-06:00") >= ahora
  )
    return (
      "Los nuevos envíos de verificación están suspendidos hasta " +
      cuenta.verificacionSilenciadaHasta +
      ". " +
      (cuenta.motivoSilencioVerificacion || "")
    );
  const periodo = periodoIdentidadActual(periodos, ahora);
  if (!periodo)
    return "Subdirección debe configurar el periodo académico vigente antes de recibir verificaciones.";
  if (rechazosPeriodo(cuenta, periodo) >= 3)
    return (
      "Tuviste tres rechazos en el periodo " +
      periodo.id +
      ". Podrás solicitar la verificación en el siguiente periodo. Tu inicio de sesión sigue habilitado."
    );
}
