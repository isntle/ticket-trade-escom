/** API experimental hasta completar los comandos remotos; el despliegue conserva el modo local. */
export const apiActiva = import.meta.env?.VITE_MODO_DATOS === "api";
