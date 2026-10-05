import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, RolUsuario, TipoAfiliacion } from '../tipos';
import { USUARIOS_INICIALES } from '../datos/datosIniciales';

interface ContextoAutenticacionTipo {
  usuarioActual: Usuario;
  rolActivo: RolUsuario;
  cambiarRolActivo: (rol: RolUsuario) => void;
  cambiarUsuario: (idUsuario: string) => void;
  todosLosUsuarios: Usuario[];
  tieneRol: (rol: RolUsuario) => boolean;
  iniciarSesion: (correo: string) => boolean;
  cerrarSesion: () => void;
  actualizarPerfil: (datos: Partial<Usuario>) => void;
  solicitarPermisoOrganizador: (
    afiliacion: TipoAfiliacion,
    identificador: string,
    nombreDocumento: string
  ) => void;
}

const ContextoAutenticacion = createContext<ContextoAutenticacionTipo | undefined>(undefined);

const CLAVE_ALMACEN_USUARIO = 'tt_id_usuario_actual';
const CLAVE_ALMACEN_ROL = 'tt_rol_activo';
const CLAVE_ALMACEN_DATOS_USUARIOS = 'tt_usuarios_sistema';

export const ProveedorAutenticacion: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const guardado = localStorage.getItem(CLAVE_ALMACEN_DATOS_USUARIOS);
    return guardado ? JSON.parse(guardado) : USUARIOS_INICIALES;
  });

  const [idUsuarioActual, setIdUsuarioActual] = useState<string>(() => {
    return localStorage.getItem(CLAVE_ALMACEN_USUARIO) || 'usr-silva'; // Inicia como el Prof. Silva para demostración
  });

  const usuarioActual = usuarios.find((u) => u.id === idUsuarioActual) || usuarios[0];

  const [rolActivo, setRolActivoEstado] = useState<RolUsuario>(() => {
    const rolGuardado = localStorage.getItem(CLAVE_ALMACEN_ROL) as RolUsuario;
    if (rolGuardado && usuarioActual.roles.includes(rolGuardado)) {
      return rolGuardado;
    }
    return usuarioActual.rolActivo || usuarioActual.roles[0];
  });

  // Sincronizar en almacenamiento local
  useEffect(() => {
    localStorage.setItem(CLAVE_ALMACEN_USUARIO, idUsuarioActual);
  }, [idUsuarioActual]);

  useEffect(() => {
    localStorage.setItem(CLAVE_ALMACEN_ROL, rolActivo);
  }, [rolActivo]);

  useEffect(() => {
    localStorage.setItem(CLAVE_ALMACEN_DATOS_USUARIOS, JSON.stringify(usuarios));
  }, [usuarios]);

  const cambiarRolActivo = (nuevoRol: RolUsuario) => {
    if (usuarioActual.roles.includes(nuevoRol)) {
      setRolActivoEstado(nuevoRol);
    }
  };

  const cambiarUsuario = (idUsuario: string) => {
    const usuario = usuarios.find((u) => u.id === idUsuario);
    if (usuario) {
      setIdUsuarioActual(usuario.id);
      setRolActivoEstado(usuario.rolActivo || usuario.roles[0]);
    }
  };

  const tieneRol = (rol: RolUsuario): boolean => {
    return usuarioActual.roles.includes(rol);
  };

  const iniciarSesion = (correo: string): boolean => {
    const encontrado = usuarios.find((u) => u.correo.toLowerCase() === correo.toLowerCase());
    if (encontrado) {
      cambiarUsuario(encontrado.id);
      return true;
    }
    return false;
  };

  const cerrarSesion = () => {
    cambiarUsuario('usr-carlos');
    setRolActivoEstado('asistente');
  };

  const actualizarPerfil = (datos: Partial<Usuario>) => {
    setUsuarios((previo) =>
      previo.map((u) => (u.id === usuarioActual.id ? { ...u, ...datos } : u))
    );
  };

  const solicitarPermisoOrganizador = (
    afiliacion: TipoAfiliacion,
    identificador: string,
    nombreDocumento: string
  ) => {
    setUsuarios((previo) =>
      previo.map((u) => {
        if (u.id === usuarioActual.id) {
          const nuevosRoles: RolUsuario[] = u.roles.includes('organizador')
            ? u.roles
            : [...u.roles, 'organizador'];
          return {
            ...u,
            afiliacion,
            roles: nuevosRoles,
            nombreDocumento,
            ...(afiliacion === 'alumno' ? { boleta: identificador } : {}),
            ...(afiliacion === 'profesor' ? { numeroEmpleado: identificador } : {}),
            ...(afiliacion === 'externo' ? { nombreOrganizacion: identificador } : {})
          };
        }
        return u;
      })
    );
    setRolActivoEstado('organizador');
  };

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuarioActual,
        rolActivo,
        cambiarRolActivo,
        cambiarUsuario,
        todosLosUsuarios: usuarios,
        tieneRol,
        iniciarSesion,
        cerrarSesion,
        actualizarPerfil,
        solicitarPermisoOrganizador
      }}
    >
      {children}
    </ContextoAutenticacion.Provider>
  );
};

export const useAutenticacion = () => {
  const contexto = useContext(ContextoAutenticacion);
  if (!contexto) {
    throw new Error('useAutenticacion debe ser utilizado dentro de un ProveedorAutenticacion');
  }
  return contexto;
};
