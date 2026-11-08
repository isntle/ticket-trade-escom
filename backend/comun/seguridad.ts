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
export const origenSeguro: RequestHandler = (req, res, next) => {
  const origen = req.get("origin");
  // Los navegadores envían Origin en las escrituras; las pruebas/CLI sin cookies pueden omitirlo.
  if (
    req.get("sec-fetch-site") === "cross-site" ||
    (origen && origen !== process.env.APP_ORIGIN)
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
