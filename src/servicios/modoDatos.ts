/** El modo local se elige explícitamente; nunca sustituye un fallo del servidor. */
const localExplicito =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("modo") === "local";
if (typeof window !== "undefined") {
  const eleccion = new URLSearchParams(window.location.search).get("modo");
  if (eleccion === "local")
    sessionStorage.setItem("tt_modo_local_explicito", "1");
  if (eleccion === "api") sessionStorage.removeItem("tt_modo_local_explicito");
}
export const apiActiva =
  !!import.meta.env &&
  import.meta.env.VITE_MODO_DATOS === "api" &&
  !localExplicito &&
  !(
    typeof window !== "undefined" &&
    sessionStorage.getItem("tt_modo_local_explicito") === "1"
  );
