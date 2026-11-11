import { cabecerasModo } from "./http";
import { modoDemostracionActivo } from "../dominio/demostracion";
export const urlArchivo = (id: string) =>
  `/api/archivos/${id}${modoDemostracionActivo() ? "?demo=1" : ""}`;
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
