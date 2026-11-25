const PREFIJO_REGRESO = '@regresar:';
export const volverA = (alternativa: string) => PREFIJO_REGRESO + destinoInternoSeguro(alternativa);
/** Conserva el historial cuando el origen corresponde al destino visible. */
export function volverASeccion(destino: string, origen: unknown = typeof window === 'undefined' ? undefined : window.history.state?.origenTT): string {
  const ruta = destinoInternoSeguro(destino);
  const anterior = destinoInternoSeguro(origen, '');
  if (!anterior) return ruta;

  const objetivo = new URL(ruta, 'https://tickettrade.local');
  const previo = new URL(anterior, objetivo.origin);
  if (previo.pathname !== objetivo.pathname || (objetivo.hash && previo.hash !== objetivo.hash)) return ruta;
  for (const [clave, valor] of objetivo.searchParams) {
    if (previo.searchParams.get(clave) !== valor) return ruta;
  }
  return volverA(ruta);
}

export const esRegreso = (ruta: string) => ruta.startsWith(PREFIJO_REGRESO);
export const alternativaRegreso = (ruta: string) => destinoInternoSeguro(ruta.slice(PREFIJO_REGRESO.length));

export function destinoInternoSeguro(ruta: unknown, alternativa = '/eventos'): string {
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//') || /[\\\u0000-\u001f]/.test(ruta)) return alternativa;
  try {
    const url = new URL(ruta, 'https://tickettrade.local');
    return url.origin === 'https://tickettrade.local' ? url.pathname + url.search + url.hash : alternativa;
  } catch { return alternativa; }
}

export function destinoTrasLogin(continuar: unknown, roles: readonly string[] = []): string {
  const panel = roles.includes('admin') ? '/admin'
    : roles.includes('subdireccion') ? '/subdireccion'
    : roles.includes('organizador') ? '/organizador'
    : roles.includes('staff') ? '/staff/checkin'
    : '/eventos';
  const destino = destinoInternoSeguro(continuar, panel);
  if (['/login', '/registro', '/confirmar-correo', '/recuperar-password', '/restablecer-password']
    .includes(destino.split(/[?#]/)[0])) return panel;
  return destino;
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
