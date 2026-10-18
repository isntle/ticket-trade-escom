import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { InsigniaEstadoTaquilla } from './InsigniaEstadoTaquilla';
import { obtenerMensaje } from '../../dominio/mensajes';

export type VarianteBannerOferta = 'vigente' | 'vencida' | 'superposicion';

interface PropiedadesBannerOfertaEspera {
  variante: VarianteBannerOferta;
  alAceptar: () => void;
  alRechazar: () => void;
  alVolverAIngresar?: () => void;
  oferta: {
    dia: string;
    fechaHoraLimite: string;
    tiempoRestante: string;
    actividadTraslape?: string;
    inicioTraslape?: string;
    finTraslape?: string;
  };
}

export const BannerOfertaEspera: React.FC<PropiedadesBannerOfertaEspera> = ({
  variante,
  alAceptar,
  alRechazar,
  alVolverAIngresar,
  oferta
}) => {
  const msgVencida = obtenerMensaje('ERR-MT-11');
  const msgVigente = obtenerMensaje('INF-MT-02', {
    día: oferta.dia,
    'fecha y hora límite': oferta.fechaHoraLimite
  });
  const msgEmpalme = obtenerMensaje('ERR-MT-07', {
    actividad: oferta.actividadTraslape || 'Otra actividad',
    inicio: oferta.inicioTraslape || '09:00',
    fin: oferta.finTraslape || '11:00'
  });

  if (variante === 'vencida') {
    return (
      <div role="alert" className="mb-6 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <InsigniaEstadoTaquilla estado="vencida" />
            <p className="leading-relaxed">{msgVencida.descripcion}</p>
          </div>
        </div>
        {alVolverAIngresar && (
          <button
            type="button"
            onClick={alVolverAIngresar}
            className="shrink-0 px-4 py-2 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            Volver a ingresar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 overflow-hidden">
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 text-xs text-indigo-950">
          <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <InsigniaEstadoTaquilla estado="oferta_vigente" />
            <p className="leading-relaxed">{msgVigente.descripcion}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center px-3 py-1.5 rounded-xl bg-white border border-indigo-200">
            <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">Tiempo restante</div>
            <div className="text-lg font-mono font-extrabold text-indigo-900 leading-none mt-0.5">
              {oferta.tiempoRestante}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={alRechazar}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold border border-gray-300 cursor-pointer transition-colors"
            >
              Rechazar
            </button>
            <button
              type="button"
              onClick={alAceptar}
              className="px-4 py-2 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>

      {variante === 'superposicion' && (
        <div role="alert" className="px-4 py-3 bg-rose-50 border-t border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{msgEmpalme.descripcion}</p>
        </div>
      )}
    </div>
  );
};
