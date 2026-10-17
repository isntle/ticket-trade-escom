/** Activa herramientas académicas solo en local o en una sesión de demostración explícita. */
export function modoDemostracionActivo(): boolean {
  if (typeof window === "undefined") return false;
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get("demo") === "1")
    sessionStorage.setItem("tt_modo_demostracion", "1");
  if (parametros.get("demo") === "0")
    sessionStorage.removeItem("tt_modo_demostracion");
  return (
    ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
    sessionStorage.getItem("tt_modo_demostracion") === "1"
  );
}
