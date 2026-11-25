import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { textoParaUsuario } from '../utilidades/textoParaUsuario';

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
      const nueva: ElementoNotificacion = { id, titulo: textoParaUsuario(titulo), mensaje: textoParaUsuario(mensaje), tipo, duracionMs };

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
        className="fixed inset-x-3 bottom-4 z-[60] flex flex-col gap-2 pointer-events-none sm:inset-x-auto sm:right-4 sm:w-96"
      >
        {notificaciones.map((notif) => {
          let estiloBorde = 'border-l-[#7a132b]';
          let icono = <Info className="w-5 h-5 text-[#7a132b] shrink-0" />;

          if (notif.tipo === 'exito') {
            estiloBorde = 'border-l-emerald-600';
            icono = <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />;
          } else if (notif.tipo === 'advertencia') {
            estiloBorde = 'border-l-amber-600';
            icono = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
          } else if (notif.tipo === 'error') {
            estiloBorde = 'border-l-rose-600';
            icono = <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
          }

          return (
            <div
              key={notif.id}
              role={notif.tipo === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto p-3 rounded-xl border border-neutral-200 border-l-4 bg-white text-neutral-900 shadow-lg flex items-start gap-3 ${estiloBorde}`}
            >
              {icono}
              <div className="min-w-0 flex-1 break-words text-sm">
                <div className="font-bold text-sm leading-tight mb-0.5">{notif.titulo}</div>
                <div className="text-neutral-700 leading-snug">{notif.mensaje}</div>
              </div>
              <button
                type="button"
                onClick={() => eliminarNotificacion(notif.id)}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-[#7a132b]"
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
