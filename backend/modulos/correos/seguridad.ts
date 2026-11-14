import crypto from "node:crypto";
export function claveCorreo() {
  const k = Buffer.from(process.env.TT_CORREO_CLAVE || "", "base64");
  if (k.length !== 32)
    throw new Error(
      "Configura TT_CORREO_CLAVE con 32 bytes aleatorios en base64.",
    );
  return k;
}
export function cifrar(d: unknown) {
  const iv = crypto.randomBytes(12),
    c = crypto.createCipheriv("aes-256-gcm", claveCorreo(), iv);
  const bytes = Buffer.concat([c.update(JSON.stringify(d), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), bytes].map((x) => x.toString("base64")).join(".");
}
export function descifrar(s: string): any {
  const [iv, tag, bytes] = s.split(".").map((x) => Buffer.from(x, "base64"));
  const c = crypto.createDecipheriv("aes-256-gcm", claveCorreo(), iv);
  c.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([c.update(bytes), c.final()]).toString("utf8"),
  );
}
export function origenCorreo() {
  const u = new URL(process.env.APP_ORIGIN || "http://localhost:3000");
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    throw Error("APP_ORIGIN inválido.");
  if (
    u.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
  )
    throw Error("Los enlaces externos requieren HTTPS.");
  return u.origin;
}
export const escapar = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
