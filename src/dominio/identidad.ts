import { leerPeriodosIdentidad, periodoIdentidadActual } from "./periodosIdentidad";
import type {
  DocumentoIdentidad,
  Evento,
  TipoAfiliacion,
  Usuario,
} from "../tipos";

export const MINUTO = 60_000;
export const MENSAJE_RECUPERACION =
  "Si existe una cuenta habilitada con correo confirmado, recibirá instrucciones para recuperar el acceso.";
export const generarTokenIdentidad = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
export function validarDominioIdentidad(
  correo: string,
  afiliacion: TipoAfiliacion,
) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return false;
  const dominio = correo.toLowerCase().split("@")[1];
  return (
    afiliacion === "externo" ||
    dominio === (afiliacion === "alumno" ? "alumno.ipn.mx" : "ipn.mx")
  );
}
export const boletaIdentidadValida = (boleta: string) =>
  /^(\d{10}|(?:PE|PP)\d{8})$/.test(boleta.trim().toUpperCase());
export function siguienteFalloIdentidad(cuenta: Usuario, ahora = Date.now()) {
  const fallosLogin = [
    ...(cuenta.fallosLogin || []).filter((t) => ahora - t < 15 * MINUTO),
    ahora,
  ];
  return {
    fallosLogin,
    bloqueadaLoginHasta:
      fallosLogin.length >= 5 ? ahora + 15 * MINUTO : undefined,
  };
}
export function puedeAsignarStaff(actor: Usuario | null, evento?: Evento) {
  return (
    !!actor?.estaActivo &&
    !!evento &&
    (actor.roles.includes("admin") ||
      (actor.roles.includes("organizador") &&
        evento.idOrganizador === actor.id))
  );
}
export function restriccionIdentidadVigente(
  cuenta: Usuario,
  ahora = Date.now(),
) {
  const inicio = cuenta.restriccionSolicitudesDesde
    ? Date.parse(cuenta.restriccionSolicitudesDesde)
    : 0;
  const fin = cuenta.restriccionSolicitudesHasta
    ? Date.parse(
        cuenta.restriccionSolicitudesHasta.length === 10
          ? `${cuenta.restriccionSolicitudesHasta}T23:59:59-06:00`
          : cuenta.restriccionSolicitudesHasta,
      )
    : 0;
  return inicio <= ahora && ahora < fin;
}
export function verificacionIdentidadVigente(
  cuenta: Usuario,
  ahora = Date.now(),
) {
  return (
    cuenta.esVerificado === true &&
    (!cuenta.periodoVerificado || periodoIdentidadActual(leerPeriodosIdentidad(),ahora)?.id === cuenta.periodoVerificado) &&
    (!cuenta.verificacionHasta ||
      ahora < Date.parse(`${cuenta.verificacionHasta}T23:59:59-06:00`))
  );
}
export function validarExpedienteIdentidad(
  cuenta: Usuario,
  archivos: DocumentoIdentidad[],
  ahora = new Date(),
): string | undefined {
  if (cuenta.correoConfirmado !== true) return "Confirma primero tu correo.";
  if (!archivos.length || archivos.length > 5)
    return "Adjunta entre uno y cinco documentos PDF.";
  const requeridos =
    cuenta.afiliacion === "alumno"
      ? []
      : cuenta.afiliacion === "externo"
        ? ["existencia", "representacion"]
        : ["adscripcion"];
  if (cuenta.afiliacion === "alumno" && !archivos.some(a=>["constancia","horario"].includes(a.tipo))) return "Adjunta una constancia de estudios o comprobante de horario vigente.";
  if (requeridos.some((tipo) => !archivos.some((a) => a.tipo === tipo)))
    return `Faltan documentos: ${requeridos.join(", ")}.`;
  if (
    cuenta.afiliacion === "externo" &&
    (!cuenta.nombreOrganizacion?.trim() || !cuenta.puestoContacto?.trim())
  )
    return "Registra la entidad y tu relación o cargo de representación.";
  if (
    cuenta.afiliacion !== "externo" &&
    cuenta.afiliacion !== "alumno" &&
    !cuenta.numeroEmpleado?.trim()
  )
    return "Registra tu número de empleado.";
  const hoy = ahora.toISOString().slice(0, 10);
  const seisMeses = new Date(ahora);
  seisMeses.setMonth(seisMeses.getMonth() - 6);
  for (const a of archivos) {
    if (
      !a.id ||
      !/\.pdf$/i.test(a.nombre) ||
      a.tamano <= 0 ||
      a.tamano > 10 * 1024 * 1024
    )
      return "Usa PDF de hasta 10 MiB por archivo.";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(a.fechaEmision) ||
      !Number.isFinite(Date.parse(a.fechaEmision)) ||
      a.fechaEmision > hoy
    )
      return "Indica una fecha de emisión válida, no futura.";
    if (
      a.vigenteHasta &&
      (a.vigenteHasta < hoy || a.vigenteHasta < a.fechaEmision)
    )
      return "Un documento está vencido o su vigencia es inválida.";
    if (["constancia","horario"].includes(a.tipo) && (!a.periodo?.trim() || !a.periodoActual))
      return "Declara el periodo escolar y confirma que la constancia o el horario corresponde al periodo actual; Subdirección revisará su correspondencia.";
    if (
      ["adscripcion", "representacion"].includes(a.tipo) &&
      !a.vigenteHasta &&
      a.fechaEmision < seisMeses.toISOString().slice(0, 10)
    )
      return "La evidencia de adscripción o representación supera seis meses y no declara otra vigencia.";
  }
}

export interface SesionIdentidad {
  id: string;
  usuario: string;
  inicio: number;
  actividad: number;
  version: number;
}
export function sesionIdentidadVigente(
  sesion: SesionIdentidad | null,
  cuenta?: Usuario,
  ahora = Date.now(),
) {
  return (
    !!sesion &&
    !!cuenta?.estaActivo &&
    cuenta.id === sesion.usuario &&
    sesion.version === (cuenta.versionCredenciales || 0) &&
    ahora - sesion.inicio < 12 * 60 * MINUTO &&
    ahora - sesion.actividad < 60 * MINUTO &&
    (!cuenta.bloqueadaLoginHasta || cuenta.bloqueadaLoginHasta <= ahora)
  );
}
