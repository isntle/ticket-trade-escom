import React from 'react';
import { Eye } from 'lucide-react';

export interface OpcionEstadoDemostracion {
  id: string;
  etiqueta: string;
}

interface PropiedadesSelectorEstadosDemostracion {
  titulo: string;
  opciones: OpcionEstadoDemostracion[];
  valor: string;
  alCambiar: (id: string) => void;
}

export const SelectorEstadosDemostracion: React.FC<PropiedadesSelectorEstadosDemostracion> = ({
  titulo,
  opciones,
  valor,
  alCambiar
}) => {
  return (
    <div className="mb-6 p-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
      <div className="flex items-center gap-2 mb-2.5">
        <Eye className="w-4 h-4 text-[#7a132b]" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
          Modo demostración · {titulo}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const activa = opcion.id === valor;
          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => alCambiar(opcion.id)}
              aria-pressed={activa}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                activa
                  ? 'bg-[#7a132b] border-[#7a132b] text-white'
                  : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-neutral-500 mt-2">
        Vista de maqueta: los estados mostrados son de ejemplo y no modifican datos reales.
      </p>
    </div>
  );
};