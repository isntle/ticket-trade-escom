import { useEffect, useState } from "react";
import { cargarImagenConEnlace, imagenRequiereEnlace } from "../../servicios/archivos";

export function useImagenEvento(url: string | undefined, evento?: string, intento = 0) {
  const protegida = imagenRequiereEnlace(url, evento);
  const clave = protegida ? JSON.stringify([evento, url, intento]) : "";
  const [resultado, setResultado] = useState<{ clave: string; url?: string; error?: boolean }>();
  useEffect(() => {
    if (!clave || !url || !evento) return;
    const control = new AbortController();
    let local: string | undefined;
    void cargarImagenConEnlace(url, evento, control.signal).then((blob) => {
      if (control.signal.aborted) return;
      local = URL.createObjectURL(blob);
      setResultado({ clave, url: local });
    }).catch(() => {
      if (!control.signal.aborted) setResultado({ clave, error: true });
    });
    return () => {
      control.abort();
      if (local) URL.revokeObjectURL(local);
    };
  }, [clave, url, evento]);
  if (!protegida) return { url, error: false };
  return resultado?.clave === clave ? resultado : { url: undefined, error: false };
}
