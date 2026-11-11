import type { RequestHandler } from "express";
import { modoBaseDatos } from "../bd/pool";

export function fallo(mensaje: string, estado = 422): never {
  throw Object.assign(new Error(mensaje), { estado });
}
export function idEntero(valor: unknown): string {
  if (
    typeof valor !== "string" ||
    !/^[1-9]\d{0,18}$/.test(valor) ||
    BigInt(valor) > 9223372036854775807n
  )
    fallo("Identificador inválido.");
  return valor;
}
export function texto(valor: unknown, nombre: string, maximo = 2000): string {
  if (typeof valor !== "string" || !valor.trim() || valor.length > maximo)
    fallo(`Revisa ${nombre}.`);
  return valor.trim();
}
export const ruta =
  (accion: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(accion(req, res, next)).catch(next);
  };
export const demoHabilitada = () =>
  process.env.TT_DEMO === "1" && modoBaseDatos() === "demo";
export const mostrarCodigos = () =>
  demoHabilitada() || process.env.TT_MOSTRAR_CODIGOS === "1";
