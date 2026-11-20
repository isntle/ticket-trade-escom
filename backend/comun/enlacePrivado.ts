import { timingSafeEqual } from 'node:crypto';

/** Un enlace ausente o revocado nunca autoriza, aunque ambos valores sean nulos. */
export function tokenPrivadoValido(recibido: unknown, almacenado: unknown): boolean {
  if (typeof recibido !== 'string' || typeof almacenado !== 'string' || !recibido || !almacenado || recibido.length > 256 || almacenado.length > 256) return false;
  const a = Buffer.from(recibido), b = Buffer.from(almacenado);
  return a.length === b.length && timingSafeEqual(a, b);
}
