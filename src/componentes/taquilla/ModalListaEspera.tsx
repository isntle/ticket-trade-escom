import React from 'react';
import { Hourglass, Info, AlertTriangle, X } from 'lucide-react';
import { obtenerMensaje } from '../../dominio/mensajes';

export type VarianteModalListaEspera = 'confirmar_ingreso' | 'cupo_disponible' | 'retiro';

interface PropiedadesModalListaEspera {
  estaAbierto: boolean;
  variante: VarianteModalListaEspera;
  evento: string;
  dia: string;
  horario: string;
  alCerrar: () => void;
  alConfirmar: () => void;
}

export const ModalListaEspera: React.FC<PropiedadesModalListaEspera> = ({
  estaAbierto,
  variante,
  evento,
  dia,
  horario,
  alCerrar,
  alConfirmar
}) => {
  if (!estaAbierto) return null;

  const msgCupoDisp = obtenerMensaje('INF-MT-05');
  const msgRetiro = obtenerMensaje('AV-MT-02', { día: dia });

  const resumen = (
    <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
      <div className="font-bold text-neutral-900 text-sm">{evento}</div>
      <div className="text-neutral-600">
        Día: <span className="font-semibold text-neutral-800">{dia}</span>
      </div>
      <div className="text-neutral-600">
        Horario: <span className="font-semibold text-neutral-800">{horario}</span>
      </div>
    </div>
  );

  const botonSecundario =
    'px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer';
  const botonPrimario =
    'px-4 py-2 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors';
  const botonPeligro =
    'px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors';

  let titulo = 'Ingresar a la lista de espera';
  let subtitulo = 'Te avisaremos si se libera un lugar';

  if (variante === 'cupo_disponible') {
    titulo = 'Hay lugares disponibles';
    subtitulo = 'No necesitas ingresar a la lista de espera';
  } else if (variante === 'retiro') {
    titulo = 'Retirarme de la lista de espera';
    subtitulo = 'Esta acción te quita de la cola';
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 relative">
        <button
          onClick={alCerrar}
          className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-lg text-neutral-900">{titulo}</h3>
        <p className="text-xs text-neutral-500 mb-4">{subtitulo}</p>

        {variante === 'cupo_disponible' && (
          <div className="space-y-4 text-xs">
            {resumen}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{msgCupoDisp.descripcion}</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={alCerrar} className={botonSecundario}>
                Cerrar
              </button>
              <button type="button" onClick={alConfirmar} className={botonPrimario}>
                Ir a reservar
              </button>
            </div>
          </div>
        )}

        {variante === 'retiro' && (
          <div className="space-y-4 text-xs">
            {resumen}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{msgRetiro.descripcion}</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={alCerrar} className={botonSecundario}>
                Conservar mi lugar
              </button>
              <button type="button" onClick={alConfirmar} className={botonPeligro}>
                Retirarme
              </button>
            </div>
          </div>
        )}

        {variante === 'confirmar_ingreso' && (
          <div className="space-y-4 text-xs">
            {resumen}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-700">
              <Hourglass className="w-4 h-4 text-[#7a132b] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                El cupo de este día está agotado. Si ingresas, ocuparás el último lugar de la lista y recibirás un
                aviso en la aplicación cuando se te ofrezca un lugar.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={alCerrar} className={botonSecundario}>
                Cancelar
              </button>
              <button type="button" onClick={alConfirmar} className={botonPrimario}>
                Confirmar ingreso
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
