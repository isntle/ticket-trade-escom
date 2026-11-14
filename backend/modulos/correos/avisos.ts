import type { PoolClient } from "pg";
import { encolarCorreo, correoHabilitado } from "./servicio.js";
/** Solo para comandos autorizados de servidor; jamás aceptar destinatario/ruta de una petición pública. */
export async function encolarAviso(
  c: PoolClient,
  cuenta: string,
  clave: string,
  titulo: string,
  detalle: string,
  ruta: string,
) {
  if (!correoHabilitado()) return;
  if (!ruta.startsWith("/") || ruta.startsWith("//") || ruta.includes("\\"))
    throw Error("Ruta de aviso inválida.");
  const u = (
    await c.query(
      'SELECT correo_confirmado_en FROM ticket_trade."Cuenta" WHERE id_cuenta=$1',
      [cuenta],
    )
  ).rows[0];
  if (u?.correo_confirmado_en)
    await encolarCorreo(c, cuenta, clave, {
      tipo: "aviso",
      titulo,
      detalle,
      ruta,
    });
}
/** Enganche para 150: llamar tras validar/guardar un cambio, dentro de su transacción. */
export async function avisarParticipantes(
  c: PoolClient,
  evento: string,
  revision: string,
  titulo: string,
  detalle: string,
) {
  const personas = (
    await c.query(
      `SELECT DISTINCT b.id_cuenta::text id FROM ticket_trade."BoletoEvento" b JOIN ticket_trade."Reservacion" r USING(id_boleto_evento) JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion) WHERE b.id_evento=$1 AND er.nombre='Confirmada'`,
      [evento],
    )
  ).rows;
  for (const p of personas)
    await encolarAviso(
      c,
      p.id,
      `evento:${evento}:${revision}:${p.id}`,
      titulo,
      detalle,
      "/mis-reservaciones",
    );
}
