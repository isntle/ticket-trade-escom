import { useEffect, useRef, useState } from "react";
import { guardarListaSiVigente } from "../dominio/almacenamiento";

/** Sincroniza pestañas y evita que una copia antigua reemplace la lista guardada. */
export function useListaLocal<T>(clave: string, inicial: () => T[]) {
  const version = useRef<string | null | undefined>(undefined);
  if (version.current === undefined)
    version.current = localStorage.getItem(clave);
  const [lista, setLista] = useState(inicial);
  useEffect(() => {
    const r = guardarListaSiVigente(
      localStorage,
      clave,
      lista,
      version.current ?? null,
    );
    if (r.exito) {
      version.current = r.guardado;
      return;
    }
    if (r.guardado !== null) {
      try {
        const actual = JSON.parse(r.guardado);
        if (Array.isArray(actual))
          setLista((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(actual)) {
              version.current = r.guardado;
              return prev;
            }
            return actual;
          });
      } catch {
        /* No se sustituye una lista válida por contenido ilegible. */
      }
    }
  }, [clave, lista]);
  useEffect(() => {
    const sincronizar = (evento: StorageEvent) => {
      if (evento.key !== clave) return;
      try {
        const guardado = localStorage.getItem(clave);
        if (guardado === null) return;
        const actual = JSON.parse(guardado);
        if (!Array.isArray(actual)) return;
        setLista((prev) => {
          if (JSON.stringify(prev) === guardado) {
            version.current = guardado;
            return prev;
          }
          return actual;
        });
      } catch {
        /* Las operaciones críticas rechazan el almacenamiento ilegible. */
      }
    };
    window.addEventListener("storage", sincronizar);
    return () => window.removeEventListener("storage", sincronizar);
  }, [clave]);
  return [lista, setLista] as const;
}
