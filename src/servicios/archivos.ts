import { tokenEnlacePrivado } from "./enlacePrivado.js";
import { cabecerasModo } from "./http.js";
import { modoDemostracionActivo } from "../dominio/demostracion.js";
export const urlArchivo = (id: string) =>
  `/api/archivos/${id}${modoDemostracionActivo() ? "?demo=1" : ""}`;
export function imagenRequiereEnlace(url: string | undefined, evento: string | undefined): boolean {
  return Boolean(evento && url && /^\/api\/archivos\/[1-9]\d*(?:\?demo=1)?$/.test(url));
}

export async function cargarImagenConEnlace(url: string, evento: string, signal: AbortSignal) {
  const id = /^\/api\/archivos\/([1-9]\d*)(?:\?demo=1)?$/.exec(url)?.[1];
  const token = tokenEnlacePrivado(evento);
  if (!id || !token || !/^[1-9]\d*$/.test(evento))
    throw new Error("El enlace del archivo no está disponible.");
  const res = await fetch(`/api/archivos/eventos/${evento}/${id}`, {
    credentials: "same-origin",
    signal,
    headers: { ...cabecerasModo(), "X-TicketTrade-Enlace": token },
  });
  if (!res.ok || !["image/jpeg", "image/png"].includes(res.headers.get("content-type") ?? ""))
    throw new Error("No se pudo abrir la imagen con este enlace.");
  return res.blob();
}

export async function subirArchivo(archivo: Blob, nombre: string) {
  const res = await fetch(
    "/api/archivos?nombre=" + encodeURIComponent(nombre),
    {
      method: "POST",
      credentials: "same-origin",
      headers: { ...cabecerasModo(), "Content-Type": archivo.type },
      body: archivo,
    },
  );
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.error?.mensaje || "No se pudo guardar el archivo.");
  return { ...json.datos, url: urlArchivo(json.datos.id) } as {
    id: string;
    nombre: string;
    url: string;
    tamano: number;
  };
}
export async function guardarArchivoRemoto(
  url: string | undefined,
  nombre = "documento.pdf",
) {
  if (!url) return null;
  const existente = /^\/api\/archivos\/(\d+)/.exec(url);
  if (existente) return existente[1];
  if (!url.startsWith("data:")) return null;
  const blob = await (await fetch(url)).blob();
  return (
    await subirArchivo(blob, nombre)
  ).id;
}
export async function guardarCartelRemoto(
  url: string | undefined,
  nombre = "cartel.jpg",
) {
  if (!url) return null;
  const existente = /^\/api\/archivos\/(\d+)/.exec(url);
  if (existente) return existente[1];
  if (!url.startsWith("data:image/"))
    throw new Error("Adjunta un cartel propio para enviar el evento.");
  const blob = await (await fetch(url)).blob();
  return (
    await subirArchivo(
      blob,
      nombre.replace(/\.[^.]+$/, "") +
        (blob.type === "image/png" ? ".png" : ".jpg"),
    )
  ).id;
}
