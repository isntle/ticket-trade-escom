/** Los lugares del catálogo llegan ordenados por fila y posición horizontal. */
export function numerarLugaresFisicos(lugares: readonly { fila: string | null }[], laboratorio: boolean): number[] {
  const porFila = new Map<string, number>();
  return lugares.map((lugar, indice) => {
    if (laboratorio) return indice + 1;
    const fila = lugar.fila || 'A';
    const numero = (porFila.get(fila) ?? 0) + 1;
    porFila.set(fila, numero);
    return numero;
  });
}
