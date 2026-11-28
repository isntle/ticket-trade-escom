import { useCallback, useEffect, useRef, useState } from "react";
import { modoDemostracionActivo } from "../dominio/demostracion";
import { ErrorApi, transporteApi } from "../servicios/http";
import { apiActiva } from "../servicios/modoDatos";

type Escaneo = { codigo: string; idActividad: string };
const api = transporteApi();

function leer(clave: string): Escaneo[] {
  return JSON.parse(sessionStorage.getItem(clave) || "[]") as Escaneo[];
}

export function useEscaneosPendientes(idUsuario?: string) {
  const clave = apiActiva && idUsuario
    ? `tt:escaneos:${modoDemostracionActivo() ? "demo" : "normal"}:${idUsuario}`
    : "";
  const [cantidad, setCantidad] = useState(0);
  const [aviso, setAviso] = useState("");
  const sincronizando = useRef(false);
  const sesion = useRef(clave);
  sesion.current = clave;

  const guardar = (codigo: string, idActividad: string) => {
    if (!clave) return false;
    try {
      const cola = leer(clave);
      if (cola.some(e => e.codigo === codigo && e.idActividad === idActividad)) return true;
      if (cola.length >= 100) return false;
      const siguiente = [...cola, { codigo, idActividad }];
      sessionStorage.setItem(clave, JSON.stringify(siguiente));
      setCantidad(siguiente.length);
      return true;
    } catch {
      return false;
    }
  };

  const sincronizar = useCallback(async () => {
    if (!clave || !navigator.onLine || sincronizando.current) return;
    sincronizando.current = true;
    let aceptados = 0;
    const rechazados: string[] = [];
    try {
      while (sesion.current === clave && navigator.onLine) {
        const [escaneo] = leer(clave);
        if (!escaneo) break;
        try {
          await api("/taquilla/checkin", { metodo: "POST", datos: { ...escaneo, idOperadorEsperado: idUsuario }, signal: AbortSignal.timeout(12000) });
          aceptados++;
        } catch (error) {
          if (!(error instanceof ErrorApi) || error.estado === 0 || error.estado === 401 || error.estado >= 500) break;
          rechazados.push(error.message);
        }
        const cola = leer(clave).slice(1);
        sessionStorage.setItem(clave, JSON.stringify(cola));
        if (sesion.current === clave) setCantidad(cola.length);
      }
      if (sesion.current === clave) {
        const restantes = leer(clave).length;
        if (aceptados || rechazados.length) {
          setAviso(`${aceptados} registrados, ${rechazados.length} rechazados.${rechazados.length ? " " + [...new Set(rechazados)].join(" ") : ""}`);
          window.dispatchEvent(new Event("tt:datos-remotos"));
        } else if (restantes) {
          setAviso("La cola sigue pendiente. Verifica tu sesión y vuelve a sincronizar.");
        }
      }
    } catch {
      if (sesion.current === clave) setAviso("No se pudo consultar la cola en este navegador.");
    } finally {
      sincronizando.current = false;
    }
  }, [clave, idUsuario]);

  useEffect(() => {
    setAviso("");
    try { setCantidad(clave ? leer(clave).length : 0); }
    catch { setCantidad(0); }
    void sincronizar();
    window.addEventListener("online", sincronizar);
    return () => window.removeEventListener("online", sincronizar);
  }, [clave, sincronizar]);

  return { cantidad, aviso, guardar, sincronizar, habilitado: Boolean(clave) };
}
