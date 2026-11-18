/** El fragmento nunca se envía en la solicitud HTTP inicial. El acceso dura la pestaña. */
export function tokenEnlacePrivado(idEvento: string): string | undefined {
  const clave = `tt_enlace_privado:${idEvento}`;
  const url = new URL(window.location.href);
  const fragmento = new URLSearchParams(url.hash.slice(1));
  const recibido = fragmento.get('key') || url.searchParams.get('key');
  try {
    if (recibido) sessionStorage.setItem(clave, recibido);
    if (recibido) {
      fragmento.delete('key');
      url.searchParams.delete('key');
      url.hash = fragmento.toString();
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    return recibido || sessionStorage.getItem(clave) || undefined;
  } catch {
    return recibido || undefined;
  }
}
