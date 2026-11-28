/** Actualiza lecturas en primer plano y al recuperar la conexión. */
export function suscribirActualizacionVisible(actualizar: () => void, intervalo: number) {
  const consultar = () => {
    if (!document.hidden && navigator.onLine) actualizar();
  };
  const reloj = window.setInterval(consultar, intervalo);
  document.addEventListener("visibilitychange", consultar);
  window.addEventListener("online", consultar);
  return () => {
    window.clearInterval(reloj);
    document.removeEventListener("visibilitychange", consultar);
    window.removeEventListener("online", consultar);
  };
}
