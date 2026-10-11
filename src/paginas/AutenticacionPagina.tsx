import React, { useState } from 'react';
import { AlertCircle, Lock, LogIn, Mail } from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';

interface PropiedadesAutenticacion {
  view?: 'login' | 'registro' | 'recuperar';
  navigate: (ruta: string) => void;
}

/**
 * Pantalla de inicio de sesión.
 * Registro, recuperación y edición de perfil pertenecen a entregas posteriores.
 */
export const AutenticacionPagina: React.FC<PropiedadesAutenticacion> = ({ navigate }) => {
  const { iniciarSesion, todosLosUsuarios } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const [correo, setCorreo] = useState('rsilva@ipn.mx');
  const [password, setPassword] = useState('Password123!');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarError, setMostrarError] = useState(false);

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    const exito = iniciarSesion(correo.trim(), password);

    if (exito) {
      setMostrarError(false);
      mostrarNotificacion('Acceso concedido', `Bienvenido a Ticket Trade, ${correo}`, 'exito');
      navigate('/eventos');
      return;
    }

    setMostrarError(true);
    mostrarNotificacion('Error de autenticación', 'Correo o contraseña incorrectos.', 'error');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm">
        <div className="text-center mb-7">
          <span className="text-2xl font-black tracking-tight text-[#7a132b]">Ticket Trade</span>
          <p className="text-xs text-neutral-500 mt-1">Inicio de sesión institucional ESCOM — IPN</p>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4 text-xs">
          <div>
            <label className="flex items-center gap-1 font-semibold text-neutral-700 mb-1" htmlFor="correo-login">
              <Mail className="w-3.5 h-3.5" /> Correo electrónico
            </label>
            <input
              id="correo-login"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl"
              placeholder="usuario@ipn.mx"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 font-semibold text-neutral-700 mb-1" htmlFor="password-login">
              <Lock className="w-3.5 h-3.5" /> Contraseña
            </label>
            <div className="relative">
              <input
                id="password-login"
                type={mostrarPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-20 bg-neutral-50 border border-neutral-300 rounded-xl"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500 hover:text-neutral-800"
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {mostrarError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Verifica tu correo y contraseña e inténtalo de nuevo.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs inline-flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Iniciar sesión
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-100 text-xs">
          <span className="text-neutral-500 block mb-2 font-medium">Cuentas de prueba:</span>
          <div className="space-y-1">
            {todosLosUsuarios.map((usuario) => (
              <button
                key={usuario.id}
                type="button"
                onClick={() => {
                  setCorreo(usuario.correo);
                  setPassword('Password123!');
                  setMostrarError(false);
                }}
                className="w-full text-left p-1.5 rounded hover:bg-neutral-50 flex justify-between items-center text-[11px]"
              >
                <span className="font-semibold text-neutral-800">{usuario.nombre}</span>
                <span className="font-mono text-neutral-400">{usuario.correo}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-neutral-400 mt-3">Demo local: las cuentas usan la contraseña Password123!.</p>
        </div>
      </div>
    </div>
  );
};
