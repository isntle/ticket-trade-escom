import React, { useState } from 'react';
import { ArrowLeft, UserCheck, Shield } from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';

interface PropiedadesAutenticacion {
  view?: 'login' | 'registro' | 'recuperar';
  navigate: (ruta: string) => void;
}

export const AutenticacionPagina: React.FC<PropiedadesAutenticacion> = ({
  view = 'login',
  navigate
}) => {
  const { iniciarSesion, todosLosUsuarios } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [correo, setCorreo] = useState('rsilva@ipn.mx');

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    const exito = iniciarSesion(correo.trim());
    if (exito) {
      mostrarNotificacion('Bienvenido', `Sesión iniciada con ${correo}`, 'exito');
      navigate('/eventos');
    } else {
      mostrarNotificacion(
        'Usuario no encontrado',
        'Prueba seleccionando una de las cuentas institucionales registradas',
        'error'
      );
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm">
        <div className="text-center mb-6">
          <span
            className="text-2xl font-black tracking-tight"
            style={{ color: 'var(--color-guinda)' }}
          >
            Ticket Trade
          </span>
          <p className="text-xs text-neutral-500 mt-1">Acceso Institucional ESCOM — IPN</p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Correo Institucional (@ipn.mx)
            </label>
            <input
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-100 text-xs">
          <span className="text-neutral-500 block mb-2 font-medium">Cuentas de prueba disponibles:</span>
          <div className="space-y-1">
            {todosLosUsuarios.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setCorreo(u.correo)}
                className="w-full text-left p-1.5 rounded hover:bg-neutral-50 flex justify-between items-center text-[11px]"
              >
                <span className="font-semibold text-neutral-800">{u.nombre}</span>
                <span className="font-mono text-neutral-400">{u.correo}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
