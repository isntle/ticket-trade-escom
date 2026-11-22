/** Escala del mapa de asientos: ajuste al ancho al abrir y zoom manual. */
export const ZOOM_MAXIMO = 2;
export const ZOOM_MINIMO_MANUAL = 0.7;
export const PASO_ZOOM = 0.15;
/** Límites del ajuste automático: reconocible en pantallas chicas y sin exagerar en monitores anchos. */
export const ESCALA_MINIMA_AJUSTE = 0.3;
export const ESCALA_MAXIMA_AJUSTE = 1.5;

const redondear = (valor: number) => Number(valor.toFixed(2));

/**
 * Escala con la que el mapa completo ocupa el ancho disponible: reduce en móvil
 * y amplía en escritorio (hasta ESCALA_MAXIMA_AJUSTE). Se redondea hacia abajo
 * para no provocar desplazamiento horizontal por decimales.
 */
export function calcularEscalaAjuste(anchoDisponible: number, anchoNatural: number): number {
  if (!(anchoDisponible > 0) || !(anchoNatural > 0)) return 1;
  const escala = Math.floor((anchoDisponible / anchoNatural) * 100) / 100;
  return Math.max(ESCALA_MINIMA_AJUSTE, Math.min(ESCALA_MAXIMA_AJUSTE, escala));
}

/** El mínimo manual baja hasta la escala de ajuste cuando el mapa es más ancho que la pantalla. */
export const zoomMinimo = (escalaAjuste: number) => Math.min(ZOOM_MINIMO_MANUAL, escalaAjuste);

export const acercarZoom = (actual: number) => Math.min(redondear(actual + PASO_ZOOM), ZOOM_MAXIMO);

export const alejarZoom = (actual: number, escalaAjuste: number) =>
  Math.max(redondear(actual - PASO_ZOOM), zoomMinimo(escalaAjuste));

/** Zoom efectivo: el elegido por la persona se conserva; si no hay, se usa el ajuste al ancho. */
export const zoomEfectivo = (zoomManual: number | null, escalaAjuste: number) =>
  zoomManual ?? escalaAjuste;
