import React from 'react';
import { ArregloAsientos, Recinto } from '../../tipos';
import { VentanaModal } from '../ui/VentanaModal';
import { MapaAsientos } from '../asientos/MapaAsientos';

interface PropiedadesModalComparadorArreglos {
  estaAbierto: boolean;
  alCerrar: () => void;
  arregloA: ArregloAsientos;
  arregloB: ArregloAsientos;
  recinto: Recinto;
}

export const ModalComparadorArreglos: React.FC<PropiedadesModalComparadorArreglos> = ({
  estaAbierto,
  alCerrar,
  arregloA,
  arregloB,
  recinto
}) => {
  return (
    <VentanaModal
      estaAbierto={estaAbierto}
      alCerrar={alCerrar}
      titulo="Comparador Visual de Arreglos de Asientos"
      subtitulo={`Comparación lado a lado para ${recinto.nombre}`}
      anchoMaximo="5xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Versión A */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{arregloA.nombre}</h4>
                <p className="text-xs text-neutral-500 font-mono">{arregloA.etiquetaVersion}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-700 capitalize">
                {arregloA.estado}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4 text-center text-xs">
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">Total</div>
                <div className="font-bold text-neutral-900">{arregloA.totalAsientos}</div>
              </div>
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">Asistentes</div>
                <div className="font-bold text-neutral-900">{arregloA.asientosAsistente}</div>
              </div>
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">VIP</div>
                <div className="font-bold text-amber-700">{arregloA.asientosVip}</div>
              </div>
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">Bloqueados</div>
                <div className="font-bold text-neutral-500">{arregloA.asientosBloqueados}</div>
              </div>
            </div>

            <div className="scale-90 origin-top">
              <MapaAsientos
                asientos={arregloA.asientos}
                modo="solo_lectura"
                permiteEliminar={recinto.permiteEliminarAsientos}
              />
            </div>
          </div>

          {/* Versión B */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{arregloB.nombre}</h4>
                <p className="text-xs text-neutral-500 font-mono">{arregloB.etiquetaVersion}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-700 capitalize">
                {arregloB.estado}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4 text-center text-xs">
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">Total</div>
                <div className="font-bold text-neutral-900">{arregloB.totalAsientos}</div>
              </div>
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">Asistentes</div>
                <div className="font-bold text-neutral-900">{arregloB.asientosAsistente}</div>
              </div>
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">VIP</div>
                <div className="font-bold text-amber-700">{arregloB.asientosVip}</div>
              </div>
              <div className="p-2 bg-white rounded border border-neutral-200">
                <div className="text-[10px] text-neutral-400">Bloqueados</div>
                <div className="font-bold text-neutral-500">{arregloB.asientosBloqueados}</div>
              </div>
            </div>

            <div className="scale-90 origin-top">
              <MapaAsientos
                asientos={arregloB.asientos}
                modo="solo_lectura"
                permiteEliminar={recinto.permiteEliminarAsientos}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={alCerrar}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold"
          >
            Cerrar comparador
          </button>
        </div>
      </div>
    </VentanaModal>
  );
};
