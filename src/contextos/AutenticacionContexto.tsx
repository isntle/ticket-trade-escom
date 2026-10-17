import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, RolUsuario, TipoAfiliacion } from '../tipos';
import { USUARIOS_INICIALES } from '../datos/datosIniciales';
import { modoDemostracionActivo } from '../dominio/demostracion';
import {
  validarCorreoInstitucional,
  validarBoletaIPN,
  validarNumeroEmpleadoIPN,
  validarContrasena
} from '../utilidades/validaciones';

export interface DatosRegistroUsuario {
  nombre: string;
  correo: string;
  password: string;
  afiliacion: TipoAfiliacion;
  boleta?: string;
  numeroEmpleado?: string;
  nombreOrganizacion?: string;
  puestoContacto?: string;
  telefonoContacto?: string;
  nombreDocumento?: string;
  solicitaOrganizador?: boolean;
}

export interface ResultadoOperacionAuth {
  exito: boolean;
  mensaje: string;
}

interface ContextoAutenticacionTipo {
  usuarioActual: Usuario | null;
  estaAutenticado: boolean;
  rolActivo: RolUsuario;
  todosLosUsuarios: Usuario[];
  cambiarRolActivo: (rol: RolUsuario) => void;
  cambiarUsuario: (idUsuario: string) => void;
  tieneRol: (rol: RolUsuario) => boolean;
  iniciarSesion: (correo: string, password?: string) => ResultadoOperacionAuth;
  cerrarSesion: () => void;
  registrarUsuario: (datos: DatosRegistroUsuario) => ResultadoOperacionAuth;
  solicitarRecuperacionPassword: (correo: string) => ResultadoOperacionAuth;
  restablecerPasswordConToken: (token: string, nuevoPassword: string) => ResultadoOperacionAuth;
  actualizarPerfil: (idUsuario: string, datos: Partial<Usuario>) => ResultadoOperacionAuth;
  solicitarPermisoOrganizador: (
    afiliacion: TipoAfiliacion,
    identificador: string,
    nombreDocumento: string
  ) => ResultadoOperacionAuth;
  asignarRolesAUsuario: (idUsuario: string, roles: RolUsuario[]) => ResultadoOperacionAuth;
  asociarStaffAEvento: (idUsuario: string, idEvento: string, asociar: boolean) => ResultadoOperacionAuth;
  alternarEstadoUsuario: (idUsuario: string) => ResultadoOperacionAuth;
  solicitarConfirmacionCorreo: () => ResultadoOperacionAuth & { codigoPrueba?: string };
  confirmarCorreo: (codigo: string) => ResultadoOperacionAuth;
  reiniciarConfirmacionPrueba: () => void;
}

const ContextoAutenticacion = createContext<ContextoAutenticacionTipo | undefined>(undefined);

const CLAVE_ALMACEN_USUARIO = 'tt_id_usuario_actual_v2';
const CLAVE_ALMACEN_ROL = 'tt_rol_activo_v2';
const CLAVE_ALMACEN_DATOS_USUARIOS = 'tt_usuarios_sistema_v2';

export const ProveedorAutenticacion: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const guardado = localStorage.getItem(CLAVE_ALMACEN_DATOS_USUARIOS);
    if (guardado) {
      try {
        const cuentas: Usuario[] = JSON.parse(guardado);
        const nueva = USUARIOS_INICIALES.find(u => u.id === 'usr-estudiante-sin-confirmar')!;
        return cuentas.some(u => u.id === nueva.id) ? cuentas : [...cuentas, nueva];
      } catch {
        return USUARIOS_INICIALES;
      }
    }
    return USUARIOS_INICIALES;
  });

  const [idUsuarioActual, setIdUsuarioActual] = useState<string | null>(() => {
    return localStorage.getItem(CLAVE_ALMACEN_USUARIO) || 'usr-silva';
  });

  const usuarioActual = usuarios.find((u) => u.id === idUsuarioActual) || null;
  const [confirmacion, setConfirmacion] = useState<{ id: string; correo: string; codigo: string; vence: number } | null>(null);
  const solicitarConfirmacionCorreo = () => {
    if (!usuarioActual || usuarioActual.correoConfirmado === true)
      return { exito: false, mensaje: 'Inicia sesión con la cuenta que necesita confirmar su correo.' };
    if (!modoDemostracionActivo())
      return { exito: false, mensaje: 'El envío de correo todavía no está conectado. La confirmación puede probarse en el modo de demostración.' };
    const codigo = Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
    setConfirmacion({ id: usuarioActual.id, correo: usuarioActual.correo, codigo, vence: Date.now() + 24 * 60 * 60 * 1000 });
    return { exito: true, mensaje: 'Código de prueba generado. Cópialo en el formulario para completar el recorrido.', codigoPrueba: codigo };
  };
  const confirmarCorreo = (codigo: string): ResultadoOperacionAuth => {
    if (!confirmacion || confirmacion.id !== usuarioActual?.id || confirmacion.correo !== usuarioActual.correo || confirmacion.vence <= Date.now() || codigo.trim().toUpperCase() !== confirmacion.codigo)
      return { exito: false, mensaje: 'El código no es válido o venció. Solicita uno nuevo.' };
    setUsuarios(previas => previas.map(u => u.id === usuarioActual.id ? { ...u, correoConfirmado: true } : u));
    setConfirmacion(null);
    return { exito: true, mensaje: 'Correo confirmado. La verificación documental se tramita por separado.' };
  };
  const reiniciarConfirmacionPrueba = () => {
    if (!modoDemostracionActivo() || usuarioActual?.id !== 'usr-estudiante-sin-confirmar') return;
    setUsuarios(previas => previas.map(u => u.id === usuarioActual.id ? { ...u, correoConfirmado: false } : u));
    setConfirmacion(null);
  };
  const estaAutenticado = usuarioActual !== null;

  const [rolActivo, setRolActivoEstado] = useState<RolUsuario>(() => {
    const rolGuardado = localStorage.getItem(CLAVE_ALMACEN_ROL) as RolUsuario;
    const u = usuarios.find((item) => item.id === (localStorage.getItem(CLAVE_ALMACEN_USUARIO) || 'usr-silva'));
    if (u && rolGuardado && u.roles.includes(rolGuardado)) {
      return rolGuardado;
    }
    return u?.rolActivo || u?.roles[0] || 'asistente';
  });

  // Sincronizar en almacenamiento local
  useEffect(() => {
    if (idUsuarioActual) {
      localStorage.setItem(CLAVE_ALMACEN_USUARIO, idUsuarioActual);
    } else {
      localStorage.removeItem(CLAVE_ALMACEN_USUARIO);
    }
  }, [idUsuarioActual]);

  useEffect(() => {
    localStorage.setItem(CLAVE_ALMACEN_ROL, rolActivo);
  }, [rolActivo]);

  useEffect(() => {
    localStorage.setItem(CLAVE_ALMACEN_DATOS_USUARIOS, JSON.stringify(usuarios));
  }, [usuarios]);

  const cambiarRolActivo = (nuevoRol: RolUsuario) => {
    if (usuarioActual && usuarioActual.roles.includes(nuevoRol)) {
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
    if (!usuarioActual) return false;
    return usuarioActual.roles.includes(rol);
  };

  /**
   * Inicio de sesión con correo y contraseña opcional (para soporte rápido en demo y estricto en formulario)
   */
  const iniciarSesion = (correo: string, password?: string): ResultadoOperacionAuth => {
    const correoLimpio = correo.trim().toLowerCase();
    const encontrado = usuarios.find((u) => u.correo.toLowerCase() === correoLimpio);

    if (!encontrado) {
      return {
        exito: false,
        mensaje: 'No se encontró ninguna cuenta registrada con este correo electrónico.'
      };
    }

    if (!encontrado.estaActivo) {
      return {
        exito: false,
        mensaje: 'Esta cuenta ha sido desactivada administrativamente por TI. Contacta a soporte_ti@escom.ipn.mx.'
      };
    }

    // Si se proporciona contraseña, validarla
    if (password && encontrado.password) {
      if (password !== encontrado.password) {
        return {
          exito: false,
          mensaje: 'Contraseña incorrecta. Verifica tus datos o usa la recuperación de contraseña.'
        };
      }
    }

    setIdUsuarioActual(encontrado.id);
    const rolPorDefecto = encontrado.rolActivo || encontrado.roles[0] || 'asistente';
    setRolActivoEstado(rolPorDefecto);

    return {
      exito: true,
      mensaje: `Bienvenido de nuevo, ${encontrado.nombre}.`
    };
  };

  /**
   * Cierre de sesión formal
   */
  const cerrarSesion = () => {
    setIdUsuarioActual(null);
    setRolActivoEstado('asistente');
  };

  /**
   * Registro integral de usuarios internos (IPN) y externos
   */
  const registrarUsuario = (datos: DatosRegistroUsuario): ResultadoOperacionAuth => {
    const correoLimpio = datos.correo.trim().toLowerCase();

    // 1. Validar que el correo no esté registrado
    const yaExiste = usuarios.some((u) => u.correo.toLowerCase() === correoLimpio);
    if (yaExiste) {
      return {
        exito: false,
        mensaje: 'El correo electrónico ya se encuentra registrado en Ticket Trade ESCOM.'
      };
    }

    // 2. Validar contraseña
    const resPass = validarContrasena(datos.password);
    if (!resPass.esValido) {
      return {
        exito: false,
        mensaje: resPass.mensaje || 'Contraseña inválida.'
      };
    }

    // 3. Validaciones de comunidad ESCOM / IPN
    const infoCorreo = validarCorreoInstitucional(correoLimpio);

    if (datos.afiliacion === 'alumno') {
      if (!infoCorreo.esAlumno && !infoCorreo.esIPN) {
        return {
          exito: false,
          mensaje: 'Para registrarte como alumno debes utilizar tu correo institucional de alumno (@alumno.ipn.mx).'
        };
      }
      if (!datos.boleta) {
        return { exito: false, mensaje: 'La boleta es requerida para alumnos.' };
      }
      const valBoleta = validarBoletaIPN(datos.boleta);
      if (!valBoleta.esValido) {
        return { exito: false, mensaje: valBoleta.mensaje || 'Boleta inválida.' };
      }
      // Validar boleta única
      if (usuarios.some((u) => u.boleta === datos.boleta?.trim())) {
        return { exito: false, mensaje: 'El número de boleta ya está asociado a otra cuenta.' };
      }
    } else if (datos.afiliacion === 'profesor' || datos.afiliacion === 'administrativo' || datos.afiliacion === 'pae') {
      if (!infoCorreo.esPersonal && !infoCorreo.esIPN) {
        return {
          exito: false,
          mensaje: 'Para personal docente o administrativo debes utilizar tu correo institucional (@ipn.mx o @escom.ipn.mx).'
        };
      }
      if (!datos.numeroEmpleado) {
        return { exito: false, mensaje: 'El número de empleado es requerido para personal del IPN.' };
      }
      const valEmp = validarNumeroEmpleadoIPN(datos.numeroEmpleado);
      if (!valEmp.esValido) {
        return { exito: false, mensaje: valEmp.mensaje || 'Número de empleado inválido.' };
      }
    } else if (datos.afiliacion === 'externo') {
      if (!datos.nombreOrganizacion?.trim()) {
        return {
          exito: false,
          mensaje: 'Los usuarios externos deben registrar la razón social de su empresa, institución o fundación.'
        };
      }
    }

    // 4. Asignar roles iniciales
    const rolesIniciales: RolUsuario[] = ['asistente'];
    if (datos.solicitaOrganizador) {
      rolesIniciales.push('organizador');
    }

    const nuevoId = `usr-${Date.now().toString(36)}`;
    const nuevoUsuario: Usuario = {
      id: nuevoId,
      nombre: datos.nombre.trim(),
      correo: correoLimpio,
      password: datos.password,
      afiliacion: datos.afiliacion,
      roles: rolesIniciales,
      rolActivo: datos.solicitaOrganizador ? 'organizador' : 'asistente',
      boleta: datos.boleta?.trim(),
      numeroEmpleado: datos.numeroEmpleado?.trim(),
      nombreOrganizacion: datos.nombreOrganizacion?.trim(),
      puestoContacto: datos.puestoContacto?.trim(),
      telefonoContacto: datos.telefonoContacto?.trim(),
      nombreDocumento: datos.nombreDocumento?.trim(),
      estaActivo: true,
      esVerificado: true,
      correoConfirmado: false,
      fechaRegistro: new Date().toISOString()
    };

    setUsuarios((previos) => [nuevoUsuario, ...previos]);
    setIdUsuarioActual(nuevoUsuario.id);
    setRolActivoEstado(nuevoUsuario.rolActivo);

    return {
      exito: true,
      mensaje: `Registro completado con éxito. Sesión iniciada como ${nuevoUsuario.nombre}.`
    };
  };

  /**
   * Solicitud de recuperación de contraseña con token simulado
   */
  const solicitarRecuperacionPassword = (correo: string): ResultadoOperacionAuth => {
    const correoLimpio = correo.trim().toLowerCase();
    const u = usuarios.find((item) => item.correo.toLowerCase() === correoLimpio);

    if (!u) {
      return {
        exito: false,
        mensaje: 'No existe ninguna cuenta registrada con el correo ingresado.'
      };
    }

    const token = `tok-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiracion = Date.now() + 1000 * 60 * 30; // 30 minutos

    setUsuarios((previos) =>
      previos.map((item) =>
        item.id === u.id
          ? { ...item, tokenRecuperacion: token, tokenExpiracion: expiracion }
          : item
      )
    );

    return {
      exito: true,
      mensaje: `Código de recuperación temporal generado: "${token}". Úsalo para definir tu nueva contraseña.`
    };
  };

  /**
   * Restablecimiento de contraseña mediante token
   */
  const restablecerPasswordConToken = (token: string, nuevoPassword: string): ResultadoOperacionAuth => {
    const tokenLimpio = token.trim().toUpperCase();
    const u = usuarios.find(
      (item) => item.tokenRecuperacion?.toUpperCase() === tokenLimpio
    );

    if (!u) {
      return {
        exito: false,
        mensaje: 'El código de recuperación ingresado no es válido.'
      };
    }

    if (u.tokenExpiracion && Date.now() > u.tokenExpiracion) {
      return {
        exito: false,
        mensaje: 'El código de recuperación ha expirado. Solicita uno nuevo.'
      };
    }

    const valPass = validarContrasena(nuevoPassword);
    if (!valPass.esValido) {
      return {
        exito: false,
        mensaje: valPass.mensaje || 'Contraseña no cumple los criterios de seguridad.'
      };
    }

    setUsuarios((previos) =>
      previos.map((item) =>
        item.id === u.id
          ? {
              ...item,
              password: nuevoPassword,
              tokenRecuperacion: undefined,
              tokenExpiracion: undefined
            }
          : item
      )
    );

    return {
      exito: true,
      mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva clave.'
    };
  };

  /**
   * Actualización y edición de perfil de usuario
   */
  const actualizarPerfil = (idUsuario: string, datos: Partial<Usuario>): ResultadoOperacionAuth => {
    const existe = usuarios.find((u) => u.id === idUsuario);
    if (!existe) {
      return { exito: false, mensaje: 'Usuario no encontrado.' };
    }

    setUsuarios((previo) =>
      previo.map((u) => (u.id === idUsuario ? { ...u, ...datos } : u))
    );

    return {
      exito: true,
      mensaje: 'Perfil de usuario actualizado exitosamente.'
    };
  };

  /**
   * Solicitud de acreditación como Organizador
   */
  const solicitarPermisoOrganizador = (
    afiliacion: TipoAfiliacion,
    identificador: string,
    nombreDocumento: string
  ): ResultadoOperacionAuth => {
    if (!usuarioActual) {
      return { exito: false, mensaje: 'Debes iniciar sesión para acreditarte.' };
    }

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

    return {
      exito: true,
      mensaje: 'Acreditación completada. Capacidad de Organizador activada.'
    };
  };

  /**
   * Configuración de roles y permisos desde Administración
   */
  const asignarRolesAUsuario = (idUsuario: string, nuevosRoles: RolUsuario[]): ResultadoOperacionAuth => {
    if (nuevosRoles.length === 0) {
      return { exito: false, mensaje: 'El usuario debe conservar al menos el rol de Asistente.' };
    }

    setUsuarios((previos) =>
      previos.map((u) => {
        if (u.id === idUsuario) {
          const rolActivoValido = nuevosRoles.includes(u.rolActivo) ? u.rolActivo : nuevosRoles[0];
          return {
            ...u,
            roles: nuevosRoles,
            rolActivo: rolActivoValido
          };
        }
        return u;
      })
    );

    return {
      exito: true,
      mensaje: 'Roles y permisos del usuario actualizados.'
    };
  };

  /**
   * Asociar o desasociar un miembro del Staff a un evento específico
   */
  const asociarStaffAEvento = (idUsuario: string, idEvento: string, asociar: boolean): ResultadoOperacionAuth => {
    const u = usuarios.find((item) => item.id === idUsuario);
    if (!u) {
      return { exito: false, mensaje: 'Usuario no encontrado.' };
    }

    const eventosActuales = u.eventosAsignadosStaff || [];
    let nuevosEventos: string[];

    if (asociar) {
      nuevosEventos = Array.from(new Set([...eventosActuales, idEvento]));
    } else {
      nuevosEventos = eventosActuales.filter((id) => id !== idEvento);
    }

    setUsuarios((previos) =>
      previos.map((item) =>
        item.id === idUsuario
          ? { ...item, eventosAsignadosStaff: nuevosEventos }
          : item
      )
    );

    return {
      exito: true,
      mensaje: asociar
        ? 'Personal de Staff asignado exitosamente al evento.'
        : 'Asignación de Staff retirada para este evento.'
    };
  };

  /**
   * Activar / suspender usuario
   */
  const alternarEstadoUsuario = (idUsuario: string): ResultadoOperacionAuth => {
    const u = usuarios.find((item) => item.id === idUsuario);
    if (!u) return { exito: false, mensaje: 'Usuario no encontrado.' };

    const nuevoEstado = !u.estaActivo;
    setUsuarios((previos) =>
      previos.map((item) =>
        item.id === idUsuario ? { ...item, estaActivo: nuevoEstado } : item
      )
    );

    return {
      exito: true,
      mensaje: nuevoEstado
        ? `La cuenta de ${u.nombre} ha sido activada.`
        : `La cuenta de ${u.nombre} ha sido suspendida.`
    };
  };

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuarioActual,
        estaAutenticado,
        rolActivo,
        cambiarRolActivo,
        cambiarUsuario,
        todosLosUsuarios: usuarios,
        tieneRol,
        iniciarSesion,
        cerrarSesion,
        registrarUsuario,
        solicitarRecuperacionPassword,
        restablecerPasswordConToken,
        actualizarPerfil,
        solicitarPermisoOrganizador,
        asignarRolesAUsuario,
        asociarStaffAEvento,
        alternarEstadoUsuario,
        solicitarConfirmacionCorreo,
        confirmarCorreo,
        reiniciarConfirmacionPrueba
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
