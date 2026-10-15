import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { obtenerMensaje } from '../../dominio/mensajes';

interface PropiedadesModalCancelarReservacion {
  boleto: any | null;
  alConservar: () => void;
  alConfirmar: (boleto: any) => void;
}

export const ModalCancelarReservacion: React.FC<PropiedadesModalCancelarReservacion> = ({
  boleto,
  alConservar,
  alConfirmar
}) => {
  if (!boleto) return null;

  const advertencia = obtenerMensaje('AV-MT-01');
  const tituloEvento = boleto.tituloEvento || 'Evento Institucional';
  const nombreSesion = boleto.nombreSesion || boleto.fechaEvento || 'Sesión Académica';
  const horarioStr = boleto.horaInicio && boleto.horaFin
    ? `${boleto.fechaEvento} · ${boleto.horaInicio} a ${boleto.horaFin} hrs`
    : boleto.fechaEvento || 'Fecha asignada';
  const asientoStr = boleto.etiquetaAsiento || boleto.asiento || 'Acceso general';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 relative">
        <button
          onClick={alConservar}
          className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-lg text-neutral-900 mb-1">Cancelar reservación</h3>
        <p className="text-xs text-neutral-500 mb-4">Revisa los datos antes de confirmar</p>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <div className="font-bold text-neutral-900 text-sm leading-snug">{tituloEvento}</div>
            <div className="text-neutral-600">
              Sesión: <span className="font-semibold text-neutral-800">{nombreSesion}</span>
            </div>
            <div className="text-neutral-600">
              Horario: <span className="font-semibold text-neutral-800">{horarioStr}</span>
            </div>
            <div className="text-neutral-600">
              Asiento: <span className="font-mono font-bold text-[#7a132b]">{asientoStr}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{advertencia.descripcion}</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={alConservar}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold border border-gray-300 cursor-pointer transition-colors"
            >
              Conservar reservación
            </button>
            <button
              type="button"
              onClick={() => alConfirmar(boleto)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              Cancelar reservación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};