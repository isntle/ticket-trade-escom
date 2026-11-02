/** Transporte único: sesión por cookie, sin reintentos automáticos de escrituras. */
export class ErrorApi extends Error {
  constructor(public estado: number, public codigo: string, mensaje: string, public campos?: Record<string, string>) { super(mensaje); }
}
export function transporteApi(base = '/api', ejecutar: typeof fetch = fetch) {
  return async function solicitar<T>(ruta: string, opciones: { metodo?: string; datos?: unknown; signal?: AbortSignal; idPeticion?: string } = {}): Promise<T> {
    const respuesta = await ejecutar(base + ruta, {
      method: opciones.metodo || 'GET', credentials: 'same-origin', signal: opciones.signal,
      headers: { Accept: 'application/json', ...(opciones.datos !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(opciones.idPeticion ? { 'Idempotency-Key': opciones.idPeticion } : {}) },
      body: opciones.datos === undefined ? undefined : JSON.stringify(opciones.datos),
    });
    let cuerpo: any;
    try { cuerpo = await respuesta.json(); } catch { throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', 'El servidor no devolvió una respuesta válida.'); }
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo.error?.codigo || 'ERROR_API', cuerpo.error?.mensaje || 'No se pudo completar la operación.', cuerpo.error?.campos);
    if (!cuerpo || !Object.prototype.hasOwnProperty.call(cuerpo, 'datos')) throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', 'Faltan los datos de la respuesta.');
    return cuerpo.datos as T;
  };
}
