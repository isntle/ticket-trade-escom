/** Las claves de análisis se conservan en el dominio; la interfaz muestra su explicación. */
export function textoParaUsuario(texto: string): string {
  const prefijo = /^(?:(?:UI(?:[.-](?:[A-Z]+-)?)\d+(?:\.\d+)?|IU-CI\d+|(?:ERR|INF|MSG|CU)-[A-Z]+-?\d+(?:\.\d+)?|TT\d{3})\s*[·:–—-]\s*)+/;
  return texto.trim().replace(prefijo, '');
}
