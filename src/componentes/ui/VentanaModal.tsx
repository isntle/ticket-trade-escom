import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { textoParaUsuario } from '../../utilidades/textoParaUsuario';

interface PropiedadesVentanaModal {
  estaAbierto: boolean;
  alCerrar: () => void;
  titulo?: string;
  subtitulo?: string;
  children: React.ReactNode;
  anchoMaximo?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl';
}

const SELECTOR_ENFOCABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'object', 'embed',
  '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Ventanas abiertas, de la más antigua a la más reciente: solo la superior responde al teclado. */
const pilaVentanas: symbol[] = [];
let overflowOriginal = '';

const elementosEnfocables = (contenedor: HTMLElement) =>
  Array.from(contenedor.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE))
    .filter((el) => el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0);

export const VentanaModal: React.FC<PropiedadesVentanaModal> = ({
  estaAbierto,
  alCerrar,
  titulo,
  subtitulo,
  children,
  anchoMaximo = 'lg'
}) => {
  const idBase = useId();
  const idTitulo = `${idBase}-titulo`;
  const idSubtitulo = `${idBase}-subtitulo`;
  const panelRef = useRef<HTMLDivElement>(null);
  // La función de cierre puede cambiar en cada render; se guarda para no reiniciar el foco.
  const alCerrarRef = useRef(alCerrar);
  alCerrarRef.current = alCerrar;

  useEffect(() => {
    if (!estaAbierto) return;
    const identificador = Symbol('ventana');
    pilaVentanas.push(identificador);
    const esSuperior = () => pilaVentanas[pilaVentanas.length - 1] === identificador;
    const origen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (pilaVentanas.length === 1) overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Respeta un autoFocus del contenido; si no hay, el foco entra a la ventana.
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (!esSuperior()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        alCerrarRef.current();
        return;
      }
      const actual = panelRef.current;
      if (e.key !== 'Tab' || !actual) return;
      // Mantiene Tab y Mayús+Tab dentro de la ventana.
      const enfocables = elementosEnfocables(actual);
      if (enfocables.length === 0) {
        e.preventDefault();
        actual.focus();
        return;
      }
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || activo === actual || !actual.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (activo === ultimo || !actual.contains(activo))) {
        e.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener('keydown', alTeclear);

    // Si el foco se pierde (p. ej. al salir de un visor incrustado o al desaparecer
    // el botón enfocado), vuelve a la ventana en lugar de quedar en la página de fondo.
    let temporizador = 0;
    const alPerderFoco = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        const actual = panelRef.current;
        if (!actual || !actual.isConnected || !esSuperior()) return;
        const activo = document.activeElement;
        if (!activo || activo === document.body || !actual.contains(activo)) actual.focus();
      }, 0);
    };
    panel?.addEventListener('focusout', alPerderFoco);

    return () => {
      window.clearTimeout(temporizador);
      panel?.removeEventListener('focusout', alPerderFoco);
      window.removeEventListener('keydown', alTeclear);
      const posicion = pilaVentanas.indexOf(identificador);
      if (posicion >= 0) pilaVentanas.splice(posicion, 1);
      if (pilaVentanas.length === 0) document.body.style.overflow = overflowOriginal;
      // Al cerrar, el foco vuelve al control que abrió la ventana si sigue en la página.
      if (origen && origen.isConnected) window.setTimeout(() => origen.focus(), 0);
    };
  }, [estaAbierto]);

  if (!estaAbierto) return null;

  const clasesAncho = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  }[anchoMaximo];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Fondo difuminado */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
        onClick={alCerrar}
        aria-hidden="true"
      />

      {/* Contenido modal */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? idTitulo : undefined}
        aria-describedby={subtitulo ? idSubtitulo : undefined}
        tabIndex={-1}
        className={`relative bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full ${clasesAncho} overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 outline-none`}
      >
        {(titulo || subtitulo) && (
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 bg-neutral-50/50">
            <div className="min-w-0">
              {titulo && <h3 id={idTitulo} className="text-base font-bold text-neutral-900 break-words">{textoParaUsuario(titulo)}</h3>}
              {subtitulo && <p id={idSubtitulo} className="text-xs text-neutral-500 mt-0.5 break-words">{textoParaUsuario(subtitulo)}</p>}
            </div>
            <button
              type="button"
              onClick={alCerrar}
              className="shrink-0 p-1 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a132b] focus-visible:ring-offset-2"
              aria-label="Cerrar ventana modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Cuerpo */}
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
