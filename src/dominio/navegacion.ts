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
