const PREFIJO_REGRESO = '@regresar:';
export const volverA = (alternativa: string) => PREFIJO_REGRESO + destinoInternoSeguro(alternativa);
export const esRegreso = (ruta: string) => ruta.startsWith(PREFIJO_REGRESO);
export const alternativaRegreso = (ruta: string) => destinoInternoSeguro(ruta.slice(PREFIJO_REGRESO.length));

export function destinoInternoSeguro(ruta: unknown, alternativa = '/eventos'): string {
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//') || /[\\\u0000-\u001f]/.test(ruta)) return alternativa;
  try {
    const url = new URL(ruta, 'https://tickettrade.local');
    return url.origin === 'https://tickettrade.local' ? url.pathname + url.search + url.hash : alternativa;
  } catch { return alternativa; }
}

export function regresarAlOrigen(alternativa: () => void) {
  const origen = window.history.state?.origenTT;
  if (origen && destinoInternoSeguro(origen,'') && origen !== window.location.pathname + window.location.search) window.history.back();
  else alternativa();
}

/**
 * Actualiza parámetros de la URL actual sin crear una entrada nueva en el historial.
 * Conserva el estado de navegación (origen y desplazamiento) y los demás parámetros.
 */
export function reemplazarParametrosUrl(parametros: Record<string, string | undefined>) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor) url.searchParams.set(clave, valor);
    else url.searchParams.delete(clave);
  }
  const destino = url.pathname + url.search + url.hash;
  if (destino !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.replaceState(window.history.state, '', destino);
  }
}
