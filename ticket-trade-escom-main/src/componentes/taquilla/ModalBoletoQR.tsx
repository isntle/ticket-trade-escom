import React from 'react';
import { Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BoletoDigital } from '../../tipos';

interface PropiedadesModalBoletoQR {
  boleto: (BoletoDigital & { nombreDia?: string }) | null;
  alCerrar: () => void;
}

export const ModalBoletoQR: React.FC<PropiedadesModalBoletoQR> = ({ boleto, alCerrar }) => {
  if (!boleto) return null;

  const codigoQrVal = boleto.codigoQr;
  const tituloEventoVal = boleto.tituloEvento;
  const asientoVal = boleto.etiquetaAsiento || 'Acceso general';
  const titularVal = boleto.nombreUsuario;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-xl border border-neutral-200 relative overflow-hidden">
        <button
          type="button"
          onClick={alCerrar}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7a132b]">Check-in · IU-CI03 · Mi boleto</span>
        <h3 className="mt-1 font-bold text-lg text-neutral-900">Pase Digital de Acceso ESCOM IPN</h3>
        <p className="text-xs text-neutral-500 mb-4">Presenta este código ante el lector del Staff en la entrada del recinto</p>

        <div className="space-y-4 text-center">
          <div className="p-5 bg-white border-2 border-dashed border-neutral-300 rounded-3xl max-w-xs mx-auto shadow-inner">
            <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-widest block uppercase mb-3">
              TICKET TRADE · PASE OFICIAL
            </span>

            {/* El QR se genera localmente; el identificador manual permanece disponible sin red. */}
            <div className="w-44 h-44 bg-white p-2 rounded-2xl border border-neutral-200 mx-auto flex items-center justify-center shadow-xs overflow-hidden">
              <QRCodeSVG value={codigoQrVal} size={160} level="M" includeMargin title={`Código QR ${codigoQrVal}`} />
            </div>

            <div className="mt-3 text-left">
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                Identificador para captura manual
              </span>
              <div className="font-mono text-xs font-extrabold tracking-widest text-[#7a132b] break-all">
                {codigoQrVal}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-200 text-left text-xs space-y-1">
              <div className="font-bold text-neutral-900 text-sm line-clamp-1">{tituloEventoVal}</div>
              <div className="text-neutral-600 flex justify-between gap-3">
                <span>Día:</span>
                <span className="font-medium text-neutral-900 text-right">{boleto.nombreDia || 'Día del evento'} · {boleto.fechaEvento}</span>
              </div>
              <div className="text-neutral-600 flex justify-between gap-3">
                <span>Horario:</span>
                <span className="font-medium text-neutral-900 text-right">{boleto.horaEvento}</span>
              </div>
              <div className="text-neutral-600 flex justify-between gap-3">
                <span>Recinto:</span>
                <span className="font-medium text-neutral-900 text-right">{boleto.nombreRecinto}</span>
              </div>
              <div className="text-neutral-600 flex justify-between gap-3">
                <span>Lugar:</span>
                <span className="font-mono font-black text-[#7a132b]">{asientoVal}</span>
              </div>
              <div className="text-neutral-600 flex justify-between gap-3">
                <span>Titular:</span>
                <span className="font-medium text-neutral-900 text-right">{titularVal}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-2.5 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Boleto</span>
            </button>
            <button
              type="button"
              onClick={alCerrar}
              className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalBoletoQR;
