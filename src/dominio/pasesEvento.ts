import type { BoletoDigital } from "../tipos";

export interface PaseEvento {
  idEvento: string;
  idUsuario: string;
  codigoQr: string;
  accesos: BoletoDigital[];
}
const codigoValido = (codigo: string) => /^TT-[A-F0-9]{32}$/i.test(codigo);
/** El primer identificador emitido permanece estable aunque se cancele su actividad. */
export function codigoQrDelEvento(
  boletos: BoletoDigital[],
  idEvento: string,
  idUsuario: string,
): string | undefined {
  if (!idUsuario) return undefined;
  return boletos
    .filter(
      (b) =>
        b.idEvento === idEvento &&
        b.idUsuario === idUsuario &&
        codigoValido(b.codigoQr),
    )
    .sort(
      (a, b) =>
        a.fechaEmision.localeCompare(b.fechaEmision) ||
        a.id.localeCompare(b.id),
    )[0]?.codigoQr;
}
export function agruparPasesEvento(boletos: BoletoDigital[]): PaseEvento[] {
  const grupos = new Map<string, BoletoDigital[]>();
  for (const boleto of boletos) {
    // Las acreditaciones especiales ya tienen un titular individual; nunca se agrupan por correo.
    const clave = JSON.stringify([
      boleto.idEvento,
      boleto.idUsuario || boleto.id,
    ]);
    grupos.set(clave, [...(grupos.get(clave) || []), boleto]);
  }
  return [...grupos.values()].map((accesos) => ({
    idEvento: accesos[0].idEvento,
    idUsuario: accesos[0].idUsuario,
    codigoQr:
      codigoQrDelEvento(accesos, accesos[0].idEvento, accesos[0].idUsuario) ||
      accesos[0].codigoQr,
    accesos: [...new Set(accesos.map((a) => a.idFechaEvento))]
      .map((id) => {
        const entradas = accesos
          .filter((a) => a.idFechaEvento === id)
          .sort(
            (a, b) =>
              b.fechaEmision.localeCompare(a.fechaEmision) ||
              b.id.localeCompare(a.id),
          );
        return (
          entradas.find((a) => a.estado === "utilizado") ||
          entradas.find((a) => a.estado === "valido") ||
          entradas[0]
        );
      })
      .sort(
        (a, b) =>
          a.fechaEvento.localeCompare(b.fechaEvento) ||
          a.horaEvento.localeCompare(b.horaEvento) ||
          a.id.localeCompare(b.id),
      ),
  }));
}
/** Los códigos anteriores son alias del mismo titular; no conceden actividades no reservadas. */
export function accesoDelPase(
  boletos: BoletoDigital[],
  codigo: string,
  idEvento: string,
  idActividad: string,
): BoletoDigital | undefined {
  const coincidentes = boletos.filter(
    (b) => b.codigoQr.toUpperCase() === codigo.trim().toUpperCase(),
  );
  if (!coincidentes.length || coincidentes.some((b) => b.idEvento !== idEvento))
    return undefined;
  const titulares = new Set(coincidentes.map((b) => b.idUsuario || b.id));
  if (titulares.size !== 1) return undefined;
  const titular = coincidentes[0].idUsuario;
  const accesos = boletos.filter(
    (b) =>
      b.idEvento === idEvento &&
      b.idFechaEvento === idActividad &&
      (titular
        ? b.idUsuario === titular
        : coincidentes.some((c) => c.id === b.id)),
  );
  // Ante datos duplicados, una entrada ya consumida no puede habilitar un segundo acceso.
  return (
    accesos.find((b) => b.estado === "utilizado") ||
    accesos.find((b) => b.estado === "valido") ||
    accesos[0]
  );
}

/** No altera la evidencia de emisión: una actividad pasada deja de ser un acceso pendiente. */
export function accesoPendienteDelEvento(
  boleto: BoletoDigital,
  evento: import("../tipos").Evento | undefined,
  ahora = Date.now(),
): boolean {
  if (boleto.estado !== "valido" || !evento || evento.estado !== "publicado")
    return false;
  const actividad = evento.fechas.find((a) => a.id === boleto.idFechaEvento);
  if (!actividad || actividad.cancelada) return false;
  const fin = Date.parse(`${actividad.fecha}T${actividad.horaFin}:00-06:00`);
  return Number.isFinite(fin) && ahora < fin;
}
