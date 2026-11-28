import crypto from "node:crypto";
import type { PoolClient } from "pg";
import nodemailer from "nodemailer";
import { configuracionSmtp } from "./configuracion.js";
import { conTransaccion, modoBaseDatos } from "../../bd/pool.js";
import { cifrar, descifrar, origenCorreo, escapar } from "./seguridad.js";
import { leerBoleto, generarPdfBoleto } from "./boleto.js";
import { plantillaToken, plantillaBoleto, plantillaAviso } from "./plantillas.js";
export function correoHabilitado() {
  return process.env.TT_CORREO_ACTIVO === "1" && modoBaseDatos() !== "demo";
}
export async function encolarCorreo(
  c: PoolClient,
  cuenta: string,
  clave: string,
  contenido: { tipo: string; idPase?: string; [clave: string]: unknown },
) {
  if (!correoHabilitado()) return false;
  origenCorreo();
  await c.query(
    `INSERT INTO infra.correo_salida(id,clave,id_cuenta,contenido,id_pase) VALUES($1,$2,$3,$4,$5) ON CONFLICT(clave) DO NOTHING`,
    [
      crypto.randomUUID(),
      clave,
      cuenta,
      cifrar(contenido),
      contenido.idPase || null,
    ],
  );
  return true;
}
export function transporteCorreo() {
  return nodemailer.createTransport(configuracionSmtp());
}
export async function procesarCorreos(
  limite = 10,
  transporte?: Pick<ReturnType<typeof transporteCorreo>, "sendMail">,
) {
  if (!correoHabilitado()) return { procesados: 0 };
  if (transporte) return enviarLote(limite, transporte);
  const lote = nodemailer.createTransport({
    ...configuracionSmtp(),
    pool: true,
    maxConnections: 1,
  });
  try {
    return await enviarLote(limite, lote);
  } finally {
    lote.close();
  }
}

async function enviarLote(
  limite: number,
  smtp: Pick<ReturnType<typeof transporteCorreo>, "sendMail">,
) {
  const limiteTiempo=Date.now()+40000;
  let procesados = 0;
  for (let i = 0; i < limite && Date.now()<limiteTiempo; i++) {
    const job = await conTransaccion(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(14920261113::bigint)");
      const limiteDiario = Number(process.env.TT_CORREO_LIMITE_DIARIO || 80);
      if (!Number.isInteger(limiteDiario) || limiteDiario < 1)
        throw Error("TT_CORREO_LIMITE_DIARIO inválido.");
      const usados = (
        await c.query(
          `SELECT coalesce(sum(intentos),0)::int n FROM infra.correo_salida WHERE actualizada_en >= date_trunc('day',now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City'`,
        )
      ).rows[0].n;
      if (usados >= limiteDiario) return null;
      const j = (
        await c.query(
          `SELECT * FROM infra.correo_salida WHERE estado='pendiente' AND siguiente_en<=now() ORDER BY creada_en FOR UPDATE SKIP LOCKED LIMIT 1`,
        )
      ).rows[0];
      if (j)
        await c.query(
          `UPDATE infra.correo_salida SET estado='enviando',intentos=intentos+1,actualizada_en=now() WHERE id=$1`,
          [j.id],
        );
      return j;
    });
    if (!job) break;
    let enviado = false;
    try {
      const d = descifrar(job.contenido);
      let to: string,
        subject: string,
        text: string,
        html: string,
        attachments: any[] = [];
      if (d.tipo === "token") {
        const valido = await conTransaccion(
          async (c) =>
            (
              await c.query(
                `SELECT 1 FROM ticket_trade."TokenCuenta" WHERE token_hash=$1 AND utilizado_en IS NULL AND vence_en>now()`,
                [crypto.createHash("sha256").update(d.token).digest("hex")],
              )
            ).rowCount,
        );
        if (!valido) {
          await finalizar(job.id, "omitido", "TOKEN_NO_VIGENTE");
          continue;
        }
        to = d.correo;
        subject =
          d.proposito === "Recuperación de contraseña"
            ? "Recupera tu contraseña de Ticket Trade"
            : "Confirma tu correo de Ticket Trade";
        const u = new URL(
          d.proposito === "Recuperación de contraseña"
            ? "/recuperar-password"
            : "/confirmar-correo",
          origenCorreo(),
        );
        u.searchParams.set("token", d.token);
        u.searchParams.set("correo", to);
        if (modoBaseDatos() === "demo") u.searchParams.set("demo", "1");
        const nombre =
          (await conTransaccion(
            async (c) =>
              (
                await c.query(
                  `SELECT concat_ws(' ',nombres,primer_apellido) nombre FROM ticket_trade."Cuenta" WHERE id_cuenta=$1`,
                  [job.id_cuenta],
                )
              ).rows[0]?.nombre,
          )) || "tu cuenta";
        ({ subject, text, html } = plantillaToken(
          nombre,
          d.proposito === "Recuperación de contraseña",
          u.href,
        ));
      } else if (d.tipo === "boleto") {
        const b = await conTransaccion((c) =>
          leerBoleto(c, d.idPase, job.id_cuenta),
        );
        const archivo = await generarPdfBoleto(b);
        to = b.correo;
        ({ subject, text, html } = plantillaBoleto(
          b,
          new URL("/mis-reservaciones", origenCorreo()).href,
        ));
        attachments = [
          {
            filename: "boleto-tickettrade.pdf",
            content: archivo.pdf,
            contentType: "application/pdf",
          },
          {
            filename: "qr.png",
            content: archivo.png,
            contentType: "image/png",
            cid: "qr-tickettrade",
          },
        ];
      } else if (d.tipo === "aviso") {
        const u = await conTransaccion(
          async (c) =>
            (
              await c.query(
                `SELECT correo,correo_confirmado_en,concat_ws(' ',nombres,primer_apellido) nombre FROM ticket_trade."Cuenta" WHERE id_cuenta=$1`,
                [job.id_cuenta],
              )
            ).rows[0],
        );
        if (!u?.correo_confirmado_en) {
          await finalizar(job.id, "omitido", "CORREO_NO_CONFIRMADO");
          continue;
        }
        if (
          typeof d.ruta !== "string" ||
          !d.ruta.startsWith("/") ||
          d.ruta.startsWith("//") ||
          d.ruta.includes("\\")
        )
          throw Error("Ruta inválida");
        to = u.correo;
        ({ subject, text, html } = plantillaAviso(
          u.nombre,
          d.titulo,
          d.detalle,
          new URL(d.ruta, origenCorreo()).href,
        ));
      } else throw Error("Tipo inválido");
      const inicioEnvio = Date.now();
      const r = await smtp.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html,
        attachments,
        messageId: `<tt.${job.id}@${(/@([^<>\s]+)>?$/.exec(process.env.SMTP_FROM || '')?.[1] || 'localhost').toLowerCase()}>`,
        headers: { 'Auto-Submitted': 'auto-generated' },
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!r.accepted?.length)
        throw Object.assign(Error("No aceptado"), { responseCode: 550 });
      enviado = true;
      const smtpMs = Date.now() - inicioEnvio;
      await finalizar(job.id, "aceptado", undefined, r.messageId);
      console.info("Correo aceptado por SMTP", {
        tipo: d.tipo,
        esperaMs: Math.max(0, inicioEnvio - new Date(job.creada_en).getTime()),
        smtpMs,
      });
    } catch (e: any) {
      // SMTP no garantiza idempotencia: timeout/caída tras DATA puede haber entregado.
      const temporal =
        !enviado &&
        Number(e.responseCode) >= 400 &&
        Number(e.responseCode) < 500;
      const definitivo = !enviado && Number(e.responseCode) >= 500;
      await conTransaccion((c) =>
        c.query(
          `UPDATE infra.correo_salida SET estado=$2,codigo_resultado=$3,siguiente_en=now()+interval '5 minutes',actualizada_en=now() WHERE id=$1`,
          [
            job.id,
            temporal && job.intentos < 4
              ? "pendiente"
              : definitivo || temporal
                ? "fallido"
                : "incierto",
            temporal
              ? "SMTP_TEMPORAL"
              : definitivo
                ? "SMTP_RECHAZADO"
                : "REVISAR_ENTREGA",
          ],
        ),
      );
    }
    procesados++;
  }
  return { procesados };
}
async function finalizar(
  id: string,
  estado: string,
  codigo?: string,
  referencia?: string,
) {
  await conTransaccion((c) =>
    c.query(
      `UPDATE infra.correo_salida SET estado=$2,codigo_resultado=$3,referencia_proveedor=$4,actualizada_en=now() WHERE id=$1`,
      [id, estado, codigo || null, referencia || null],
    ),
  );
}
