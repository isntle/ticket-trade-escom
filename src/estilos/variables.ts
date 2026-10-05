/**
 * ===================================================================
 * VARIABLES DE ESTILO Y TOKENS DE DISEÑO — TICKET TRADE ESCOM IPN
 * ===================================================================
 * Centraliza los nombres de variables CSS, paleta de colores y clases
 * para que ningún componente tenga colores "quemados" (hardcodeados)
 * ni definiciones dispersas.
 */

export const variablesEstilo = {
  // Colores principales
  colorGuinda: 'var(--color-guinda)',
  colorGuindaOscuro: 'var(--color-guinda-oscuro)',
  colorGuindaClaro: 'var(--color-guinda-claro)',
  colorGuindaBorde: 'var(--color-guinda-borde)',

  // Fondos y superficies
  colorFondoApp: 'var(--color-fondo-app)',
  colorFondoTarjeta: 'var(--color-fondo-tarjeta)',
  colorFondoSutil: 'var(--color-fondo-sutil)',

  // Bordes
  colorBordeSuave: 'var(--color-borde-suave)',
  colorBordeFirme: 'var(--color-borde-firme)',

  // Textos
  colorTextoPrincipal: 'var(--color-texto-principal)',
  colorTextoSecundario: 'var(--color-texto-secundario)',
  colorTextoAtenuado: 'var(--color-texto-atenuado)',

  // Estados
  colorExito: 'var(--color-exito)',
  colorExitoFondo: 'var(--color-exito-fondo)',
  colorAdvertencia: 'var(--color-advertencia)',
  colorAdvertenciaFondo: 'var(--color-advertencia-fondo)',
  colorPeligro: 'var(--color-peligro)',
  colorPeligroFondo: 'var(--color-peligro-fondo)',

  // Categorías de asientos
  colorAsientoDisponible: 'var(--color-asiento-disponible)',
  colorAsientoSeleccionado: 'var(--color-asiento-seleccionado)',
  colorAsientoReservado: 'var(--color-asiento-reservado)',
  colorAsientoVip: 'var(--color-asiento-vip)',
  colorAsientoOrganizador: 'var(--color-asiento-organizador)',
  colorAsientoStaff: 'var(--color-asiento-staff)',
  colorAsientoBloqueado: 'var(--color-asiento-bloqueado)',
} as const;

/**
 * Clases de estilo predefinidas para componentes
 */
export const clasesEstilo = {
  botonPrimario:
    'boton-primario px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5',
  botonSecundario:
    'boton-secundario px-4 py-2 text-xs font-medium cursor-pointer inline-flex items-center justify-center gap-1.5',
  tarjeta:
    'tarjeta-institucional p-5',
  insigniaBase:
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-medium tracking-tight whitespace-nowrap',
  entradaTexto:
    'w-full px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7a132b]/20 focus:border-[#7a132b] transition-all',
  etiquetaCampo:
    'block text-xs font-semibold text-neutral-700 mb-1',
};
