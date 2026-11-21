import { useEffect, useState } from "react";
import { transporteApi } from "../../servicios/http";

const api = transporteApi();

export function AvisoCupo({ actividad, agotado }: { actividad: string; agotado: boolean }) {
  const [activo, setActivo] = useState<boolean>();
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const ruta = "/taquilla/actividades/" + encodeURIComponent(actividad) + "/aviso-cupo";

  useEffect(() => {
    const control = new AbortController();
    void api<{ activo: boolean }>(ruta, { signal: control.signal }).then(res => setActivo(res.activo)).catch(() => {
      if (!control.signal.aborted) setMensaje("No se pudo consultar el aviso de cupo.");
    });
    return () => control.abort();
  }, [ruta]);

  if (!agotado && !activo && !mensaje) return null;
  const cambiar = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const res = await api<{ activo: boolean }>(ruta, { metodo: activo ? "DELETE" : "POST" });
      setActivo(res.activo);
      setMensaje(!activo && !res.activo ? "Ya hay cupo. Consulta la disponibilidad del mapa." : "");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudo cambiar el aviso.");
    } finally {
      setGuardando(false);
    }
  };
  return <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 text-sm">
    {activo !== undefined && (agotado || activo) && <button type="button" disabled={guardando}
      className="rounded-lg border border-[#7a132b] px-3 py-2 font-semibold text-[#7a132b] disabled:opacity-50"
      onClick={() => void cambiar()}>
      {activo ? "Cancelar aviso de cupo" : "Avísame si se libera cupo"}
    </button>}
    {activo && <p className="mt-2">Te avisaremos por correo si se libera cupo. El aviso no reserva lugar.</p>}
    {mensaje && <p role="status" className="mt-2">{mensaje}</p>}
  </div>;
}
