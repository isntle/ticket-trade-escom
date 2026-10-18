import React from 'react';
import { Inbox } from 'lucide-react';

interface PropiedadesEstadoVacio {
  icono?: React.ReactNode;
  titulo: string;
  descripcion: string;
  textoAccion?: string;
  alHacerAccion?: () => void;
}

export const EstadoVacio: React.FC<PropiedadesEstadoVacio> = ({
  icono,
  titulo,
  descripcion,
  textoAccion,
  alHacerAccion
}) => {
  return (
    <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
        {icono || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-bold text-neutral-800">{titulo}</h3>
      <p className="text-xs text-neutral-500 max-w-sm mt-1">{descripcion}</p>
      {textoAccion && alHacerAccion && (
        <button
          type="button"
          onClick={alHacerAccion}
          className="mt-4 px-4 py-2 rounded-lg bg-[#7a132b] hover:bg-[#630f23] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          {textoAccion}
        </button>
      )}
    </div>
  );
};
