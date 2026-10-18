/** Escritura local con restauración ante errores; no sustituye una transacción de servidor. */
export function guardarLoteLocal(almacen: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, valores: Record<string, unknown>): { exito: boolean; error?: string } {
  const anteriores = new Map<string, string | null>();
  try {
    const entradas = Object.entries(valores).map(([clave, valor]) => [clave, JSON.stringify(valor)] as const);
    for (const [clave] of entradas) anteriores.set(clave, almacen.getItem(clave));
    for (const [clave, valor] of entradas) almacen.setItem(clave, valor);
    return { exito: true };
  } catch {
    try {
      for (const [clave, valor] of anteriores) {
        if (valor === null) almacen.removeItem(clave);
        else if (almacen.getItem(clave) !== valor) almacen.setItem(clave, valor);
      }
    } catch {
      return { exito: false, error: 'No se pudo guardar ni restaurar todo el almacenamiento. Recarga y revisa el estado antes de repetir la operación.' };
    }
    return { exito: false, error: 'No se pudo guardar. Libera espacio del navegador; tus cambios siguen en el formulario y no se confirmó la operación.' };
  }
}
