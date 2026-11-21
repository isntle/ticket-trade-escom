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
/** Registra el aviso persistente de la campana. `tipo` es la clave de deduplicación. */
export async function registrarAvisoBandeja(
  c: PoolClient,
  aviso: {
    destinatario: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    referencia: string;
  },
) {
  await c.query(
    `INSERT INTO ticket_trade."Notificacion"(id_cuenta_destinataria,tipo,titulo,mensaje,creada_en,referencia_destino)
     SELECT $1,$2,$3,$4,clock_timestamp(),$5
     WHERE NOT EXISTS (SELECT 1 FROM ticket_trade."Notificacion" WHERE id_cuenta_destinataria=$1 AND tipo=$2)`,
    [aviso.destinatario, aviso.tipo, aviso.titulo, aviso.mensaje, aviso.referencia],
  );
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
