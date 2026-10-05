import React, { useState } from 'react';
import {
  UserCheck,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  Calendar,
  Ticket as IconoBoleto,
  Menu,
  X
} from 'lucide-react';
import { useAutenticacion } from '../../contextos/AutenticacionContexto';
import { useDatos } from '../../contextos/DatosContexto';
import { useNotificaciones } from '../../contextos/NotificacionesContexto';
import { RolUsuario } from '../../tipos';

interface PropiedadesBarraSuperior {
  rutaActual: string;
  navegarA: (ruta: string) => void;
}

export const BarraSuperior: React.FC<PropiedadesBarraSuperior> = ({ rutaActual, navegarA }) => {
  const {
    usuarioActual,
    rolActivo,
    cambiarRolActivo,
    todosLosUsuarios,
    cambiarUsuario
  } = useAutenticacion();

  const { reiniciarDatosIniciales } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();

  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  const etiquetasRoles: Record<RolUsuario, { nombre: string; color: string; icono: string }> = {
    asistente: { nombre: 'Asistente', color: 'bg-blue-50 text-blue-800 border-blue-200', icono: '🎓' },
    organizador: { nombre: 'Organizador', color: 'bg-indigo-50 text-indigo-800 border-indigo-200', icono: '📋' },
    staff: { nombre: 'Staff de Acceso', color: 'bg-purple-50 text-purple-800 border-purple-200', icono: '📱' },
    subdireccion: { nombre: 'Subdirección', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icono: '🏛️' },
    admin: { nombre: 'Administrador TI', color: 'bg-rose-50 text-rose-800 border-rose-200', icono: '⚙️' }
  };

  const alCambiarRol = (nuevoRol: RolUsuario) => {
    cambiarRolActivo(nuevoRol);
    mostrarNotificacion(
      'Perspectiva cambiada',
      `Ahora estás interactuando con la capacidad de ${etiquetasRoles[nuevoRol].nombre}`,
      'informacion'
    );

    // Navegación automática según la perspectiva elegida
    if (nuevoRol === 'asistente') navegarA('/eventos');
    else if (nuevoRol === 'organizador') navegarA('/organizador');
    else if (nuevoRol === 'subdireccion') navegarA('/subdireccion');
    else if (nuevoRol === 'staff') navegarA('/staff');
    else if (nuevoRol === 'admin') navegarA('/admin');
  };

  const alCambiarUsuario = (idUsuario: string) => {
    cambiarUsuario(idUsuario);
    setMenuUsuarioAbierto(false);
    const seleccionado = todosLosUsuarios.find((u) => u.id === idUsuario);
    mostrarNotificacion(
      'Usuario cambiado',
      `Sesión activa como ${seleccionado?.nombre}`,
      'exito'
    );
  };

  const alReiniciarDatos = () => {
    reiniciarDatosIniciales();
    mostrarNotificacion(
      'Datos restaurados',
      'La base de datos institucional volvió a su estado inicial de prueba',
      'informacion'
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zona 1: Logo en tipografía destacada y color guinda (sin ícono de TT) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navegarA('/eventos')}
              className="flex items-center gap-2 text-left group cursor-pointer"
            >
              <span
                className="text-xl font-extrabold tracking-tight transition-opacity hover:opacity-90"
                style={{ color: 'var(--color-guinda)' }}
              >
                Ticket Trade
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold text-neutral-500 border-l border-neutral-300 pl-2">
                ESCOM IPN
              </span>
            </button>
          </div>

          {/* Zona 2: Enlaces de Navegación según permisos del usuario */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => navegarA('/eventos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                rutaActual.startsWith('/eventos') || rutaActual === '/'
                  ? 'text-[#7a132b] bg-[#7a132b]/5'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Cartelera
            </button>

            <button
              onClick={() => navegarA('/mis-reservaciones')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                rutaActual.startsWith('/mis-reservaciones')
                  ? 'text-[#7a132b] bg-[#7a132b]/5'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Mis Boletos
            </button>

            {/* Opciones operativas para Organizadores, Subdirección y Administradores */}
            {usuarioActual.roles.some((r) => ['organizador', 'subdireccion', 'admin'].includes(r)) && rolActivo !== 'asistente' && (
              <button
                onClick={() => navegarA('/distribucion')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  rutaActual.startsWith('/distribucion') || rutaActual.startsWith('/arreglos')
                    ? 'text-[#7a132b] bg-[#7a132b]/5'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#7a132b]" />
                <span>Distribución de Espacios</span>
              </button>
            )}

            {usuarioActual.roles.includes('organizador') && rolActivo !== 'asistente' && (
              <button
                onClick={() => {
                  cambiarRolActivo('organizador');
                  navegarA('/organizador');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  rutaActual.startsWith('/organizador')
                    ? 'text-[#7a132b] bg-[#7a132b]/5'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                Organización
              </button>
            )}

            {usuarioActual.roles.includes('subdireccion') && (
              <button
                onClick={() => {
                  cambiarRolActivo('subdireccion');
                  navegarA('/subdireccion');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  rutaActual.startsWith('/subdireccion')
                    ? 'text-[#7a132b] bg-[#7a132b]/5'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                Subdirección
              </button>
            )}

            {usuarioActual.roles.includes('staff') && (
              <button
                onClick={() => {
                  cambiarRolActivo('staff');
                  navegarA('/staff');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  rutaActual.startsWith('/staff')
                    ? 'text-[#7a132b] bg-[#7a132b]/5'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                Control Acceso
              </button>
            )}

            {usuarioActual.roles.includes('admin') && (
              <button
                onClick={() => {
                  cambiarRolActivo('admin');
                  navegarA('/admin');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  rutaActual.startsWith('/admin')
                    ? 'text-[#7a132b] bg-[#7a132b]/5'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                Administración
              </button>
            )}
          </nav>

          {/* Zona 3: Selector de Rol y Perfil de Usuario */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Selector de Perspectivas del Usuario */}
            <div className="hidden sm:flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
              {usuarioActual.roles.map((rol) => {
                const activo = rolActivo === rol;
                return (
                  <button
                    key={rol}
                    type="button"
                    onClick={() => alCambiarRol(rol)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      activo
                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <span className="mr-1">{etiquetasRoles[rol].icono}</span>
                    <span className="capitalize">{rol}</span>
                  </button>
                );
              })}
            </div>

              {/* Menú de Usuario (sin icono circular) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <div className="text-left">
                    <div className="text-xs font-semibold text-neutral-900 leading-tight">
                      {usuarioActual.nombre}
                    </div>
                    <div className="text-[10px] text-neutral-500 capitalize leading-none">
                      {usuarioActual.afiliacion}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-1" />
                </button>

              {menuUsuarioAbierto && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-neutral-100">
                    <p className="text-xs font-bold text-neutral-900">{usuarioActual.nombre}</p>
                    <p className="text-[11px] text-neutral-500">{usuarioActual.correo}</p>
                    {usuarioActual.boleta && (
                      <p className="text-[11px] text-neutral-600 font-mono mt-0.5">Boleta: {usuarioActual.boleta}</p>
                    )}
                    {usuarioActual.numeroEmpleado && (
                      <p className="text-[11px] text-neutral-600 font-mono mt-0.5">No. Empleado: {usuarioActual.numeroEmpleado}</p>
                    )}
                  </div>

                  {/* Cambiar cuenta institucional de prueba */}
                  <div className="px-3 py-2 border-b border-neutral-100">
                    <div className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase mb-1.5 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>Cambiar cuenta de prueba</span>
                    </div>
                    <div className="space-y-1">
                      {todosLosUsuarios.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => alCambiarUsuario(u.id)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                            u.id === usuarioActual.id
                              ? 'bg-[#7a132b]/10 text-[#7a132b] font-semibold'
                              : 'hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          <span className="truncate">{u.nombre}</span>
                          <span className="text-[10px] text-neutral-400 capitalize">{u.afiliacion}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        setMenuUsuarioAbierto(false);
                        navegarA('/perfil');
                      }}
                      className="w-full text-left px-3 py-2 rounded text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      Acreditación de Perfil
                    </button>
                    <button
                      onClick={() => {
                        setMenuUsuarioAbierto(false);
                        alReiniciarDatos();
                      }}
                      className="w-full text-left px-3 py-2 rounded text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reiniciar datos iniciales</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón de Menú Móvil */}
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
                className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              >
                {menuMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {menuMovilAbierto && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <button
            onClick={() => {
              navegarA('/eventos');
              setMenuMovilAbierto(false);
            }}
            className="w-full text-left px-3 py-2 rounded text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cartelera de Eventos
          </button>
          <button
            onClick={() => {
              navegarA('/mis-reservaciones');
              setMenuMovilAbierto(false);
            }}
            className="w-full text-left px-3 py-2 rounded text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Mis Boletos Digitales
          </button>
          {usuarioActual.roles.some((r) => ['organizador', 'subdireccion', 'admin'].includes(r)) && rolActivo !== 'asistente' && (
            <button
              onClick={() => {
                navegarA('/distribucion');
                setMenuMovilAbierto(false);
              }}
              className="w-full text-left px-3 py-2 rounded text-sm font-medium text-[#7a132b] hover:bg-neutral-50 flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-[#7a132b]" />
              <span>Distribución de Espacios</span>
            </button>
          )}
          {usuarioActual.roles.includes('organizador') && (
            <button
              onClick={() => {
                cambiarRolActivo('organizador');
                navegarA('/organizador');
                setMenuMovilAbierto(false);
              }}
              className="w-full text-left px-3 py-2 rounded text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Panel de Organización
            </button>
          )}
          {usuarioActual.roles.includes('subdireccion') && (
            <button
              onClick={() => {
                cambiarRolActivo('subdireccion');
                navegarA('/subdireccion');
                setMenuMovilAbierto(false);
              }}
              className="w-full text-left px-3 py-2 rounded text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Dictamen Subdirección
            </button>
          )}
          {usuarioActual.roles.includes('staff') && (
            <button
              onClick={() => {
                cambiarRolActivo('staff');
                navegarA('/staff');
                setMenuMovilAbierto(false);
              }}
              className="w-full text-left px-3 py-2 rounded text-sm font-medium text-purple-700 hover:bg-purple-50"
            >
              Control de Acceso (Staff)
            </button>
          )}
        </div>
      )}
    </header>
  );
};
