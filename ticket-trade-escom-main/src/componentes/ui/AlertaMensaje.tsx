import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface PropiedadesAlertaMensaje {
  tipo?: 'informacion' | 'exito' | 'advertencia' | 'error';
  titulo?: string;
  mensaje: string | React.ReactNode;
  alCerrar?: () => void;
  className?: string;
}

export const AlertaMensaje: React.FC<PropiedadesAlertaMensaje> = ({
  tipo = 'informacion',
  titulo,
  mensaje,
  alCerrar,
  className = ''
}) => {
  const estilos = {
    informacion: {
      fondo: 'bg-blue-50 border-blue-200 text-blue-900',
      icono: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
    },
    exito: {
      fondo: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icono: <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
    },
    advertencia: {
      fondo: 'bg-amber-50 border-amber-200 text-amber-900',
      icono: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
    },
    error: {
      fondo: 'bg-rose-50 border-rose-200 text-rose-900',
      icono: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
    }
  }[tipo];

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${estilos.fondo} ${className}`}
    >
      {estilos.icono}
      <div className="flex-1">
        {titulo && <div className="font-bold text-sm mb-0.5">{titulo}</div>}
        <div className="leading-relaxed opacity-90">{mensaje}</div>
      </div>
      {alCerrar && (
        <button
          type="button"
          onClick={alCerrar}
          className="text-neutral-400 hover:text-neutral-700 p-1"
          aria-label="Cerrar alerta"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
