import React from 'react';
import { Users, Shield, Check, X, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { RolUsuario } from '../tipos';

interface PropiedadesAdministracionUsuarios {
  navigate: (ruta: string) => void;
}

export const AdministracionUsuariosPagina: React.FC<PropiedadesAdministracionUsuarios> = ({
  navigate
}) => {
  const { todosLosUsuarios, actualizarPerfil, usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button
        type="button"
        onClick={() => navigate('/eventos')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la cartelera</span>
      </button>

      <div className="mb-8">
        <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
          Módulo Técnico y de Soporte TI
        </span>
        <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
          Administración de Cuentas y Permisos
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Control de acceso y asignación de capacidades para la comunidad académica de ESCOM.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">Afiliación</th>
                <th className="px-5 py-3.5">Identificador Oficial</th>
                <th className="px-5 py-3.5">Roles Asignados</th>
                <th className="px-5 py-3.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {todosLosUsuarios.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-neutral-900">{u.nombre}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">{u.correo}</div>
                  </td>
                  <td className="px-5 py-3.5 capitalize font-medium text-neutral-700">
                    {u.afiliacion}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-neutral-600">
                    {u.boleta || u.numeroEmpleado || u.nombreOrganizacion || 'N/A'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-semibold text-[10px] capitalize"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                      <Check className="w-3.5 h-3.5" />
                      <span>Activo</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
