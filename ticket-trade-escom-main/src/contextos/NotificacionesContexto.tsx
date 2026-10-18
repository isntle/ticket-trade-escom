import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type TipoNotificacion = 'exito' | 'advertencia' | 'error' | 'informacion';

export interface ElementoNotificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  duracionMs?: number;
}

interface ContextoNotificacionesTipo {
  mostrarNotificacion: (
    titulo: string,
    mensaje: string,
    tipo?: TipoNotificacion,
    duracionMs?: number
  ) => void;
  eliminarNotificacion: (id: string) => void;
}

const ContextoNotificaciones = createContext<ContextoNotificacionesTipo | undefined>(undefined);

export const ProveedorNotificaciones: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificaciones, setNotificaciones] = useState<ElementoNotificacion[]>([]);

  const eliminarNotificacion = useCallback((id: string) => {
    setNotificaciones((previas) => previas.filter((n) => n.id !== id));
  }, []);

  const mostrarNotificacion = useCallback(
    (
      titulo: string,
      mensaje: string,
      tipo: TipoNotificacion = 'informacion',
      duracionMs: number = 4000
    ) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const nueva: ElementoNotificacion = { id, titulo, mensaje, tipo, duracionMs };

      setNotificaciones((previas) => [...previas, nueva]);

      if (duracionMs > 0) {
        setTimeout(() => {
          eliminarNotificacion(id);
        }, duracionMs);
      }
    },
    [eliminarNotificacion]
  );

  return (
    <ContextoNotificaciones.Provider value={{ mostrarNotificacion, eliminarNotificacion }}>
      {children}

      {/* Contenedor de notificaciones flotantes (esquina superior derecha) */}
      <aside
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {notificaciones.map((notif) => {
          let estiloBorde = 'border-blue-200 bg-blue-50 text-blue-900';
          let icono = <Info className="w-5 h-5 text-blue-600 shrink-0" />;

          if (notif.tipo === 'exito') {
            estiloBorde = 'border-emerald-200 bg-emerald-50 text-emerald-900';
            icono = <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />;
          } else if (notif.tipo === 'advertencia') {
            estiloBorde = 'border-amber-200 bg-amber-50 text-amber-900';
            icono = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
          } else if (notif.tipo === 'error') {
            estiloBorde = 'border-rose-200 bg-rose-50 text-rose-900';
            icono = <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
          }

          return (
            <div
              key={notif.id}
              role="alert"
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 transition-all duration-200 ${estiloBorde}`}
            >
              {icono}
              <div className="flex-1 text-xs">
                <div className="font-bold text-sm leading-tight mb-0.5">{notif.titulo}</div>
                <div className="text-neutral-700 leading-snug">{notif.mensaje}</div>
              </div>
              <button
                type="button"
                onClick={() => eliminarNotificacion(notif.id)}
                className="text-neutral-400 hover:text-neutral-700 p-1 -mr-1 -mt-1 cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </aside>
    </ContextoNotificaciones.Provider>
  );
};

export const useNotificaciones = () => {
  const contexto = useContext(ContextoNotificaciones);
  if (!contexto) {
    throw new Error('useNotificaciones debe ser utilizado dentro de un ProveedorNotificaciones');
  }
  return contexto;
};
