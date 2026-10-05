import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface PropiedadesVentanaModal {
  estaAbierto: boolean;
  alCerrar: () => void;
  titulo?: string;
  subtitulo?: string;
  children: React.ReactNode;
  anchoMaximo?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl';
}

export const VentanaModal: React.FC<PropiedadesVentanaModal> = ({
  estaAbierto,
  alCerrar,
  titulo,
  subtitulo,
  children,
  anchoMaximo = 'lg'
}) => {
  useEffect(() => {
    const alPresionarEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar();
    };
    if (estaAbierto) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', alPresionarEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', alPresionarEscape);
    };
  }, [estaAbierto, alCerrar]);

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
      />

      {/* Contenido modal */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full ${clasesAncho} overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        {(titulo || subtitulo) && (
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div>
              {titulo && <h3 className="text-base font-bold text-neutral-900">{titulo}</h3>}
              {subtitulo && <p className="text-xs text-neutral-500 mt-0.5">{subtitulo}</p>}
            </div>
            <button
              type="button"
              onClick={alCerrar}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Cerrar ventana modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Cuerpo */}
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
