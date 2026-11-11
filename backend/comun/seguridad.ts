import crypto from "node:crypto";
import { promisify } from "node:util";
import type { RequestHandler } from "express";
const derivar = promisify(crypto.scrypt);
export async function hashContrasena(password: string): Promise<string> {
  const sal = crypto.randomBytes(16).toString("hex");
  const hash = (await derivar(password, sal, 64)) as Buffer;
  return `scrypt:${sal}:${hash.toString("hex")}`;
}
export async function verificarContrasena(
  password: unknown,
  almacenado: unknown,
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    password.length > 1024 ||
    typeof almacenado !== "string"
  )
    return false;
  const partes = almacenado.split(":");
  if (
    partes.length !== 3 ||
    partes[0] !== "scrypt" ||
    !/^[a-f0-9]{32}$/.test(partes[1]) ||
    !/^[a-f0-9]{128}$/.test(partes[2])
  )
    return false;
  const calculado = (await derivar(password, partes[1], 64)) as Buffer;
  return crypto.timingSafeEqual(Buffer.from(partes[2], "hex"), calculado);
}
export const huella = (valor: string) =>
  crypto.createHash("sha256").update(valor).digest("hex");
export function origenPermitido(origen: string, configurado = process.env.APP_ORIGIN, produccion = process.env.NODE_ENV === "production") {
  if (origen === configurado) return true;
  if (produccion || !configurado) return false;
  try {
    const recibido = new URL(origen), esperado = new URL(configurado);
    const locales = new Set(["localhost", "127.0.0.1"]);
    return recibido.origin === origen && esperado.origin === configurado &&
      locales.has(recibido.hostname) && locales.has(esperado.hostname) &&
      recibido.protocol === esperado.protocol && recibido.port === esperado.port;
  } catch { return false; }
}
export const origenSeguro: RequestHandler = (req, res, next) => {
  const origen = req.get("origin");
  // Los navegadores envían Origin en las escrituras; las pruebas/CLI sin cookies pueden omitirlo.
  if (
    req.get("sec-fetch-site") === "cross-site" ||
    (origen && !origenPermitido(origen))
  ) {
    res
      .status(403)
      .json({
        error: {
          codigo: "ORIGEN_NO_PERMITIDO",
          mensaje: "Origen no permitido.",
        },
      });
    return;
  }
  next();
};
