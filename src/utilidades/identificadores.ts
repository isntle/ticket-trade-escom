/** Identificador aleatorio opaco de 128 bits para codificar en el QR. */
export const generarIdentificadorQr = (): string => {
  const aleatorios = new Uint8Array(16);
  globalThis.crypto.getRandomValues(aleatorios);
  return Array.from(aleatorios, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
};
