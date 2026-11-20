/** Transporte único: sesión por cookie, sin reintentos automáticos de escrituras. */
import { modoDemostracionActivo } from '../dominio/demostracion.js';
import { textoParaUsuario } from '../utilidades/textoParaUsuario.js';
export const cabecerasModo = (): Record<string,string> => modoDemostracionActivo() ? { 'X-TicketTrade-Demo': '1' } : {};
export class ErrorApi extends Error {
  constructor(public estado: number, public codigo: string, mensaje: string, public campos?: Record<string, string>) { super(textoParaUsuario(mensaje)); }
}
export function transporteApi(base = '/api', ejecutar: typeof fetch = fetch) {
  return async function solicitar<T>(ruta: string, opciones: { metodo?: string; datos?: unknown; signal?: AbortSignal; idPeticion?: string } = {}): Promise<T> {
    const metodo = opciones.metodo || 'GET';
    const body = opciones.datos === undefined ? undefined : JSON.stringify(opciones.datos);
    let respuesta: Response;
    try {
      respuesta = await ejecutar(base + ruta, {
        method: metodo, credentials: 'same-origin', signal: opciones.signal,
        headers: { Accept: 'application/json', ...cabecerasModo(), ...(opciones.datos !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(opciones.idPeticion ? { 'Idempotency-Key': opciones.idPeticion } : {}) },
        body,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ErrorApi(0, 'TIEMPO_RED', 'La consulta tardó demasiado. Vuelve a consultar cuando se restablezca la conexión.');
      }
      if (opciones.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      const mensaje = metodo.toUpperCase() === 'GET'
        ? 'No se pudo conectar con Ticket Trade. Comprueba tu conexión y vuelve a consultar.'
        : 'Se perdió la conexión. Consulta el resultado antes de repetir la operación.';
      throw new ErrorApi(0, 'ERROR_RED', mensaje);
    }
    let cuerpo: any;
    try { cuerpo = await respuesta.json(); } catch { throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', 'El servidor no devolvió una respuesta válida.'); }
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo?.error?.codigo || 'ERROR_API', cuerpo?.error?.mensaje || 'No se pudo completar la operación.', cuerpo?.error?.campos);
    if (!cuerpo || !Object.prototype.hasOwnProperty.call(cuerpo, 'datos')) throw new ErrorApi(respuesta.status, 'RESPUESTA_INVALIDA', 'Faltan los datos de la respuesta.');
    return cuerpo.datos as T;
  };
}
