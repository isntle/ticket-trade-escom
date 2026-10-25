import { CLAVE_PERIODOS_IDENTIDAD, leerPeriodosIdentidad, validarPeriodosIdentidad, periodoIdentidadActual, impedimentoVerificacion, type PeriodoIdentidad } from "../dominio/periodosIdentidad";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  DocumentoIdentidad,
  Evento,
  RolUsuario,
  TipoAfiliacion,
  Usuario,
} from "../tipos";
import { USUARIOS_INICIALES } from "../datos/datosIniciales";
import { modoDemostracionActivo } from "../dominio/demostracion";
import { guardarLoteLocal } from "../dominio/almacenamiento";
import {
  boletaIdentidadValida,
  generarTokenIdentidad,
  MENSAJE_RECUPERACION,
  MINUTO,
  puedeAsignarStaff,
  sesionIdentidadVigente,
  siguienteFalloIdentidad,
  validarDominioIdentidad,
  validarExpedienteIdentidad,
  verificacionIdentidadVigente,
  type SesionIdentidad,
} from "../dominio/identidad";
import { validarContrasena } from "../utilidades/validaciones";

export interface DatosRegistroUsuario {
  nombre: string;
  correo: string;
  password: string;
  afiliacion: TipoAfiliacion;
  boleta?: string;
  numeroEmpleado?: string;
  rfc?: string;
  nombreOrganizacion?: string;
  puestoContacto?: string;
  telefonoContacto?: string;
  nombreDocumento?: string;
  solicitaOrganizador?: boolean;
  tipoExterno?: "asistente" | "representante";
}
export interface ResultadoOperacionAuth {
  exito: boolean;
  mensaje: string;
  codigoPrueba?: string;
}
type Decision = "aprobado" | "requiere_correccion" | "rechazado" | "revocado";
const CLAVE = "tt_usuarios_sistema_v2",
  CLAVE_SESION = "tt_sesion_identidad_v3";
const bien = (mensaje: string): ResultadoOperacionAuth => ({
  exito: true,
  mensaje,
});
const mal = (mensaje: string): ResultadoOperacionAuth => ({
  exito: false,
  mensaje,
});
function leerUsuarios(): Usuario[] {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE) || "null");
    const cuentas: Usuario[] = Array.isArray(valor)
      ? valor
      : USUARIOS_INICIALES;
    return [
      ...cuentas,
      ...USUARIOS_INICIALES.filter((s) => !cuentas.some((u) => u.id === s.id)),
    ].map((u) =>
      u.esVerificado && !u.estadoExpediente
        ? movimiento(
            { ...u, estadoExpediente: "aprobado" },
            "Configuración de demostración",
            "Habilitación inicial",
            "Cuenta semilla habilitada administrativamente para pruebas; no acredita una revisión documental real.",
          )
        : u,
    );
  } catch {
    return USUARIOS_INICIALES;
  }
}
function leerSesion(): SesionIdentidad | null {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || "null");
  } catch {
    return null;
  }
}
function movimiento(
  u: Usuario,
  actor: string,
  accion: string,
  motivo: string,
): Usuario {
  const fecha = new Date().toISOString();
  return {
    ...u,
    versionIdentidad: (u.versionIdentidad || 0) + 1,
    historialIdentidad: [
      ...(u.historialIdentidad || []),
      { accion, fecha, responsable: actor, motivo },
    ],
    avisosIdentidad: [
      ...(u.avisosIdentidad || []),
      { fecha, mensaje: accion + ": " + motivo },
    ],
  };
}
function usarIdentidad() {
  const [periodosIdentidad,ponerPeriodosIdentidad] = useState(leerPeriodosIdentidad);
  const [usuarios, ponerUsuarios] = useState(leerUsuarios);
  const cuentasRef = useRef(usuarios);
  const [sesion, ponerSesion] = useState<SesionIdentidad | null>(leerSesion);
  const sesionRef = useRef(sesion);
  const [rolActivo, ponerRol] = useState<RolUsuario>(
    () =>
      (localStorage.getItem("tt_rol_activo_v2") as RolUsuario) || "asistente",
  );
  const [ahora, ponerAhora] = useState(Date.now());
  const activa = () => {
    const u = cuentasRef.current.find(
      (c) => c.id === sesionRef.current?.usuario,
    );
    return sesionIdentidadVigente(sesionRef.current, u) ? u! : null;
  };
  const cuentaBruta = usuarios.find((u) => u.id === sesion?.usuario);
  const usuarioActual = sesionIdentidadVigente(sesion, cuentaBruta, ahora)
    ? {
        ...cuentaBruta!,
        esVerificado: verificacionIdentidadVigente(cuentaBruta!, ahora),
      }
    : null;
  const guardar = (nuevas: Usuario[]) => {
    const r = guardarLoteLocal(localStorage, { [CLAVE]: nuevas });
    if (!r.exito) return mal(r.error || "No se pudo guardar.");
    cuentasRef.current = nuevas;
    ponerUsuarios(nuevas);
    return bien("Cambios guardados.");
  };
  const cambiarSesion = (s: SesionIdentidad | null) => {
    try {
      if (s) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s));
      else sessionStorage.removeItem(CLAVE_SESION);
      sesionRef.current = s;
      ponerSesion(s);
      localStorage.removeItem("tt_id_usuario_actual_v2");
      return true;
    } catch {
      return false;
    }
  };
  const entrar = (u: Usuario) => {
    const guardado = guardar(cuentasRef.current);
    if (!guardado.exito) return guardado;
    const t = Date.now();
    if (
      !cambiarSesion({
        id: generarTokenIdentidad(),
        usuario: u.id,
        inicio: t,
        actividad: t,
        version: u.versionCredenciales || 0,
      })
    )
      return mal("No se pudo guardar la sesión.");
    ponerRol(u.roles.includes(u.rolActivo) ? u.rolActivo : u.roles[0]);
    ponerAhora(t);
    return bien("Sesión iniciada.");
  };
  const cerrarSesion = () => {
    cambiarSesion(null);
    ponerRol("asistente");
  };
  useEffect(() => {
    const sincronizar = (e: StorageEvent) => {
      if (e.key === CLAVE_PERIODOS_IDENTIDAD) { ponerPeriodosIdentidad(leerPeriodosIdentidad()); ponerAhora(Date.now()); }
      if (e.key === CLAVE) {
        const nuevas = leerUsuarios();
        cuentasRef.current = nuevas;
        ponerUsuarios(nuevas);
        ponerAhora(Date.now());
      }
    };
    const actividad = () => {
      const s = sesionRef.current;
      if (!activa()) {
        if (s) cambiarSesion(null);
        return;
      }
      if (s && Date.now() - s.actividad > 1000)
        cambiarSesion({ ...s, actividad: Date.now() });
    };
    const intervalo = window.setInterval(() => {
      ponerAhora(Date.now());
      if (sesionRef.current && !activa()) cambiarSesion(null);
    }, 1000);
    window.addEventListener("storage", sincronizar);
    window.addEventListener("pointerdown", actividad);
    window.addEventListener("keydown", actividad);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("storage", sincronizar);
      window.removeEventListener("pointerdown", actividad);
      window.removeEventListener("keydown", actividad);
    };
  }, []);
  useEffect(() => {
    if (usuarioActual && !usuarioActual.roles.includes(rolActivo))
      ponerRol(usuarioActual.roles[0]);
    localStorage.setItem("tt_rol_activo_v2", rolActivo);
  }, [rolActivo, usuarios, sesion?.usuario]);
  const codigoDemo = (token: string) =>
    modoDemostracionActivo() ? token : undefined;
  const puedeAdmin = () =>
    activa()?.roles.includes("admin") && rolActivo === "admin";
  const iniciarSesion = (
    correo: string,
    password?: string,
  ): ResultadoOperacionAuth => {
    const u = cuentasRef.current.find(
      (c) => c.correo.toLowerCase() === correo.trim().toLowerCase(),
    );
    if (!u?.estaActivo) return mal("Correo o contraseña incorrectos.");
    if ((u.bloqueadaLoginHasta || 0) > Date.now())
      return mal(
        "Acceso bloqueado temporalmente. Espera " +
          Math.ceil((u.bloqueadaLoginHasta! - Date.now()) / MINUTO) +
          " minuto(s).",
      );
    if (!password || password !== u.password) {
      const cambio = siguienteFalloIdentidad(u);
      const r = guardar(
        cuentasRef.current.map((c) =>
          c.id === u.id
            ? {
                ...c,
                ...cambio,
                versionCredenciales: cambio.bloqueadaLoginHasta
                  ? (c.versionCredenciales || 0) + 1
                  : c.versionCredenciales,
              }
            : c,
        ),
      );
      return r.exito
        ? mal(
            cambio.bloqueadaLoginHasta
              ? "Acceso bloqueado durante 15 minutos por intentos fallidos."
              : "Correo o contraseña incorrectos.",
          )
        : r;
    }
    const limpia = { ...u, fallosLogin: [], bloqueadaLoginHasta: undefined };
    const r = guardar(
      cuentasRef.current.map((c) => (c.id === u.id ? limpia : c)),
    );
    return r.exito ? entrar(limpia) : r;
  };
  const registrarUsuario = (
    datos: DatosRegistroUsuario,
  ): ResultadoOperacionAuth => {
    const correo = datos.correo.trim().toLowerCase();
    if (
      !datos.nombre.trim() ||
      !validarDominioIdentidad(correo, datos.afiliacion)
    )
      return mal("Revisa nombre, correo y dominio admitido para tu categoría.");
    if (
      cuentasRef.current.some(
        (u) => u.correo === correo || u.correoPendiente === correo,
      )
    )
      return mal("El correo no está disponible.");
    const v = validarContrasena(datos.password);
    if (!v.esValido) return mal(v.mensaje || "Contraseña inválida.");
    if (
      datos.afiliacion === "alumno" &&
      !boletaIdentidadValida(datos.boleta || "")
    )
      return mal("Boleta: diez dígitos o PE/PP seguidos de ocho dígitos.");
    if (
      datos.boleta &&
      cuentasRef.current.some(
        (u) => u.boleta?.toUpperCase() === datos.boleta!.trim().toUpperCase(),
      )
    )
      return mal("Boleta ya registrada.");
    if (
      !["externo", "alumno"].includes(datos.afiliacion) &&
      !datos.numeroEmpleado?.trim()
    )
      return mal("Registra tu número de empleado.");
    if (
      datos.afiliacion === "externo" &&
      datos.tipoExterno === "representante" &&
      (!datos.nombreOrganizacion?.trim() || !datos.puestoContacto?.trim())
    )
      return mal("Indica entidad y relación de representación.");
    const token = generarTokenIdentidad();
    const u: Usuario = {
      ...datos,
      id: "usr-" + crypto.randomUUID(),
      nombre: datos.nombre.trim(),
      correo,
      boleta: datos.boleta?.trim().toUpperCase(),
      roles: ["asistente"],
      rolActivo: "asistente",
      estaActivo: true,
      esVerificado: false,
      correoConfirmado: false,
      estadoExpediente: "sin_enviar",
      fechaRegistro: new Date().toISOString(),
      tokenConfirmacionCorreo: token,
      expiracionConfirmacionCorreo: Date.now() + 24 * 60 * MINUTO,
      historialReenviosCorreo: [Date.now()],
    };
    const r = guardar([...cuentasRef.current, u]);
    return r.exito
      ? {
          ...bien(
            "Cuenta creada. Confirma el correo para continuar. El envío real aún no está configurado.",
          ),
          codigoPrueba: codigoDemo(token),
        }
      : r;
  };
  const reenviarConfirmacionCorreo = (
    correo: string,
  ): ResultadoOperacionAuth => {
    const u = cuentasRef.current.find(
      (c) =>
        (c.correoPendiente || c.correo).toLowerCase() ===
        correo.trim().toLowerCase(),
    );
    const mensaje =
      "Si existe una cuenta pendiente, se registrará su confirmación. El envío real aún no está configurado.";
    if (!u || (u.correoConfirmado && !u.correoPendiente)) return bien(mensaje);
    const t = Date.now(),
      recientes = (u.historialReenviosCorreo || []).filter(
        (f) => t - f < 60 * MINUTO,
      );
    if (recientes.length >= 5 || recientes.some((f) => t - f < MINUTO))
      return mal("Espera un minuto entre enlaces; máximo cinco por hora.");
    const token = generarTokenIdentidad(),
      cambio = u.correoPendiente
        ? { tokenConfirmacionCambioCorreo: token }
        : { tokenConfirmacionCorreo: token };
    const r = guardar(
      cuentasRef.current.map((c) =>
        c.id === u.id
          ? {
              ...c,
              ...cambio,
              expiracionConfirmacionCorreo: t + 24 * 60 * MINUTO,
              historialReenviosCorreo: [...recientes, t],
            }
          : c,
      ),
    );
    return r.exito ? { ...bien(mensaje), codigoPrueba: codigoDemo(token) } : r;
  };
  const solicitarConfirmacionCorreo = () => {
    const u = activa();
    return u
      ? reenviarConfirmacionCorreo(u.correoPendiente || u.correo)
      : mal("Inicia sesión o escribe el correo pendiente.");
  };
  const confirmarCorreo = (codigo: string) => {
    const token = codigo.trim(),
      u = cuentasRef.current.find(
        (c) =>
          !!token &&
          (c.tokenConfirmacionCorreo === token ||
            c.tokenConfirmacionCambioCorreo === token),
      );
    if (
      !u ||
      !u.expiracionConfirmacionCorreo ||
      u.expiracionConfirmacionCorreo <= Date.now()
    )
      return mal("Enlace inválido, vencido o ya utilizado.");
    const cambio =
      u.tokenConfirmacionCambioCorreo === token && !!u.correoPendiente;
    if (
      cambio &&
      cuentasRef.current.some(
        (c) => c.id !== u.id && c.correo === u.correoPendiente,
      )
    )
      return mal("Ese correo ya está registrado.");
    const nueva = movimiento(
      {
        ...u,
        correo: cambio ? u.correoPendiente! : u.correo,
        correoPendiente: undefined,
        tokenConfirmacionCorreo: undefined,
        tokenConfirmacionCambioCorreo: undefined,
        expiracionConfirmacionCorreo: undefined,
        correoConfirmado: true,
        ...(cambio && u.esVerificado
          ? {
              esVerificado: false,
              estadoExpediente: "requiere_correccion" as const,
              motivoExpediente: "Correo modificado; renueva el expediente.",
            }
          : {}),
      },
      u.nombre,
      "Correo confirmado",
      "Confirmación independiente de la verificación documental.",
    );
    return guardar(cuentasRef.current.map((c) => (c.id === u.id ? nueva : c)));
  };
  const solicitarCambioCorreo = (
    id: string,
    nuevo: string,
  ): ResultadoOperacionAuth => {
    const u = activa(),
      correo = nuevo.trim().toLowerCase();
    if (!u || u.id !== id) return mal("Solo puedes cambiar tu propio correo.");
    if (!validarDominioIdentidad(correo, u.afiliacion))
      return mal("Correo o dominio incompatible con tu categoría.");
    if (
      correo === u.correo ||
      cuentasRef.current.some(
        (c) =>
          c.id !== id && (c.correo === correo || c.correoPendiente === correo),
      )
    )
      return mal("Correo no disponible o igual al actual.");
    const recientes = (u.historialReenviosCorreo || []).filter(
      (f) => Date.now() - f < 60 * MINUTO,
    );
    if (recientes.length >= 5 || recientes.some((f) => Date.now() - f < MINUTO))
      return mal("Espera un minuto entre enlaces; máximo cinco por hora.");
    const token = generarTokenIdentidad();
    const r = guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? {
              ...c,
              correoPendiente: correo,
              tokenConfirmacionCambioCorreo: token,
              expiracionConfirmacionCorreo: Date.now() + 24 * 60 * MINUTO,
              historialReenviosCorreo: [...recientes, Date.now()],
            }
          : c,
      ),
    );
    return r.exito
      ? {
          ...bien(
            "Cambio pendiente. Conservas el correo anterior hasta confirmar el nuevo; después deberás renovar la verificación si estaba aprobada.",
          ),
          codigoPrueba: codigoDemo(token),
        }
      : r;
  };
  const solicitarRecuperacionPassword = (
    correo: string,
  ): ResultadoOperacionAuth => {
    const u = cuentasRef.current.find(
      (c) =>
        c.correo === correo.trim().toLowerCase() &&
        c.estaActivo &&
        c.correoConfirmado,
    );
    if (!u) return bien(MENSAJE_RECUPERACION);
    const t = Date.now(),
      recientes = (u.historialRecuperacion || []).filter(
        (f) => t - f < 60 * MINUTO,
      );
    if (recientes.length >= 5 || recientes.some((f) => t - f < MINUTO))
      return bien(MENSAJE_RECUPERACION);
    const token = generarTokenIdentidad(),
      r = guardar(
        cuentasRef.current.map((c) =>
          c.id === u.id
            ? {
                ...c,
                tokenRecuperacion: token,
                tokenExpiracion: t + 15 * MINUTO,
                historialRecuperacion: [...recientes, t],
              }
            : c,
        ),
      );
    return r.exito
      ? { ...bien(MENSAJE_RECUPERACION), codigoPrueba: codigoDemo(token) }
      : r;
  };
  const guardarPassword = (u: Usuario, password: string) => {
    const v = validarContrasena(password);
    if (!v.esValido) return mal(v.mensaje || "Contraseña inválida.");
    const nueva = movimiento(
      {
        ...u,
        password,
        versionCredenciales: (u.versionCredenciales || 0) + 1,
        tokenRecuperacion: undefined,
        tokenExpiracion: undefined,
      },
      u.nombre,
      "Contraseña modificada",
      "Sesiones anteriores invalidadas.",
    );
    const r = guardar(
      cuentasRef.current.map((c) => (c.id === u.id ? nueva : c)),
    );
    if (r.exito && sesionRef.current?.usuario === u.id) cerrarSesion();
    return r;
  };
  const restablecerPasswordConToken = (token: string, password: string) => {
    const u = cuentasRef.current.find(
      (c) => !!token.trim() && c.tokenRecuperacion === token.trim(),
    );
    return !u?.estaActivo ||
      !u.tokenExpiracion ||
      u.tokenExpiracion <= Date.now()
      ? mal("Enlace inválido, vencido o ya utilizado.")
      : guardarPassword(u, password);
  };
  const cambiarPassword = (
    actual: string,
    nueva: string,
    confirmacion: string,
  ) => {
    const u = activa();
    if (!u || !actual || actual !== u.password)
      return mal("Sesión o contraseña actual incorrecta.");
    return nueva !== confirmacion
      ? mal("Las contraseñas nuevas no coinciden.")
      : guardarPassword(u, nueva);
  };
  const actualizarPerfil = (
    id: string,
    datos: Partial<Usuario>,
    version?: number,
  ) => {
    const u = activa();
    if (!u || u.id !== id) return mal("Solo puedes editar tu propio perfil.");
    if (version !== undefined && version !== (u.versionIdentidad || 0))
      return mal("El perfil cambió. Recarga antes de confirmar.");
    if (
      Object.keys(datos).some(
        (k) =>
          ![
            "nombre",
            "nombreOrganizacion",
            "puestoContacto",
            "telefonoContacto",
            "numeroEmpleado",
          ].includes(k),
      )
    )
      return mal(
        "No puedes cambiar roles, credenciales o categoría desde este formulario.",
      );
    if (datos.nombre !== undefined && !datos.nombre.trim())
      return mal("El nombre es obligatorio.");
    const cambio = ["nombre", "nombreOrganizacion", "puestoContacto", "numeroEmpleado"].some(
      (k) =>
        datos[k as keyof Usuario] !== undefined &&
        datos[k as keyof Usuario] !== u[k as keyof Usuario],
    );
    const nueva = movimiento(
      {
        ...u,
        ...datos,
        nombre: datos.nombre?.trim() || u.nombre,
        ...(cambio && u.esVerificado
          ? {
              esVerificado: false,
              estadoExpediente: "requiere_correccion" as const,
              motivoExpediente: "Datos modificados; renueva el expediente.",
            }
          : {}),
      },
      u.nombre,
      "Perfil modificado",
      "Se conservan eventos y reservaciones.",
    );
    return guardar(cuentasRef.current.map((c) => (c.id === id ? nueva : c)));
  };
  const enviarExpediente = (
    id: string,
    archivos: DocumentoIdentidad[],
    version: number,
    motivoSolicitud = "",
  ) => {
    const u = activa();
    if (!u || u.id !== id)
      return mal("Solo puedes enviar tu propio expediente.");
    if (
      version !== (u.versionIdentidad || 0) ||
      u.estadoExpediente === "en_revision"
    )
      return mal("El expediente cambió o ya está en revisión.");
    const impedimento=impedimentoVerificacion(u,leerPeriodosIdentidad());
    if(impedimento)return mal(impedimento);
    if(!motivoSolicitud.trim())return mal("Explica por qué solicitas la verificación.");
    const fallo = validarExpedienteIdentidad(u, archivos);
    if (fallo) return mal(fallo);
    const entrada = {
      estado: "en_revision",
      responsable: u.nombre,
      fecha: new Date().toISOString(),
      motivo: motivoSolicitud.trim(),
      documentos: archivos.map((a) => a.nombre),
      archivos,
    };
    return guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? movimiento(
              {
                ...c,
                motivoSolicitudVerificacion: motivoSolicitud.trim(),
                archivosExpediente: archivos,
                documentosExpediente: entrada.documentos,
                estadoExpediente: "en_revision",
                esVerificado: false,
                motivoExpediente: undefined,
                historialExpediente: [
                  ...(c.historialExpediente || []),
                  entrada,
                ],
              },
              u.nombre,
              "Expediente enviado",
              "Pendiente de revisión por Subdirección.",
            )
          : c,
      ),
    );
  };
  const dictaminarExpediente = (
    id: string,
    decision: Decision,
    motivo: string,
    version: number,
    vigencia?: string,
  ) => {
    const actor = activa(),
      u = cuentasRef.current.find((c) => c.id === id);
    if (!u || (decision === "revocado" ? !puedeAdmin() : !actor?.roles.includes("subdireccion") || rolActivo !== "subdireccion"))
      return mal(decision === "revocado" ? "Solo Administración puede revocar la verificación." : "Solo Subdirección puede revisar las solicitudes de verificación.");
    if (version !== (u.versionIdentidad || 0))
      return mal("El expediente cambió. Actualiza su detalle.");
    if (
      decision === "revocado"
        ? !u.esVerificado
        : u.estadoExpediente !== "en_revision"
    )
      return mal("Estado incompatible con esa decisión.");
    if (!motivo.trim()) return mal("Indica motivo o constancia de revisión.");
    if (
      decision === "aprobado" &&
      (!vigencia || vigencia < new Date().toISOString().slice(0, 10))
    )
      return mal("Indica una vigencia válida para la verificación.");
    const periodo=periodoIdentidadActual(leerPeriodosIdentidad());
    if(decision === "aprobado" && (!periodo || vigencia !== periodo.fin))return mal("La vigencia debe corresponder al fin del periodo académico configurado.");
    const entrada = {
      estado: decision,
      responsable: actor!.nombre,
      fecha: new Date().toISOString(),
      motivo: motivo.trim(),
      documentos: u.documentosExpediente || [],
      archivos: u.archivosExpediente,
    };
    return guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? movimiento(
              {
                ...c,
                estadoExpediente: decision,
                esVerificado: decision === "aprobado",
                verificacionHasta:
                  decision === "aprobado" ? vigencia : undefined,
                periodoVerificado: decision === "aprobado" ? periodo!.id : undefined,
                motivoExpediente: motivo.trim(),
                historialExpediente: [
                  ...(c.historialExpediente || []),
                  entrada,
                ],
              },
              actor!.nombre,
              "Verificación: " + decision,
              motivo.trim(),
            )
          : c,
      ),
    );
  };
  const solicitarRestriccion = (
    id: string,
    accion: "aplicar" | "levantar",
    motivo: string,
    solicitudes: string,
  ) => {
    const actor = activa(),
      u = cuentasRef.current.find((c) => c.id === id);
    if (!actor?.roles.includes("subdireccion") || rolActivo !== "subdireccion")
      return mal("Esta petición corresponde a Subdirección.");
    if (!u || !motivo.trim() || !solicitudes.trim())
      return mal("Selecciona cuenta, motivo y solicitudes relacionadas.");
    if (u.peticionesRestriccion?.some((p) => p.estado === "pendiente"))
      return mal("Ya existe una petición pendiente.");
    const peticion = {
      id: crypto.randomUUID(),
      accion,
      motivo: motivo.trim(),
      solicitudes: solicitudes.trim(),
      responsable: actor.nombre,
      fecha: new Date().toISOString(),
      estado: "pendiente" as const,
    };
    return guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? movimiento(
              {
                ...c,
                peticionesRestriccion: [
                  ...(c.peticionesRestriccion || []),
                  peticion,
                ],
              },
              actor.nombre,
              "Petición registrada",
              motivo.trim(),
            )
          : c,
      ),
    );
  };
  const actualizarRestriccionSolicitudes = (
    id: string,
    hasta: string,
    motivo: string,
    desde?: string,
    peticionId?: string,
    aceptar = true,
    version?: number,
  ) => {
    if (desde?.length === 16) desde += "-06:00";
    if (hasta.length === 16) hasta += "-06:00";
    const u = cuentasRef.current.find((c) => c.id === id),
      actor = activa();
    if (!puedeAdmin() || !u)
      return mal("Solo Administración resuelve restricciones.");
    if (!motivo.trim()) return mal("El motivo es obligatorio.");
    if (version !== undefined && version !== (u.versionIdentidad || 0))
      return mal("La cuenta cambió. Actualiza su detalle.");
    if (
      peticionId &&
      !u.peticionesRestriccion?.some(
        (p) => p.id === peticionId && p.estado === "pendiente",
      )
    )
      return mal("La petición ya fue resuelta.");
    if (
      aceptar &&
      hasta &&
      (!desde ||
        !Number.isFinite(Date.parse(desde)) ||
        !Number.isFinite(Date.parse(hasta)) ||
        Date.parse(hasta) <= Date.parse(desde) ||
        Date.parse(hasta) <= Date.now())
    )
      return mal("El término debe ser futuro y posterior al inicio.");
    const cambio = aceptar
      ? {
          restriccionSolicitudesDesde: hasta ? desde : undefined,
          restriccionSolicitudesHasta: hasta || undefined,
          motivoRestriccion: hasta ? motivo.trim() : undefined,
        }
      : {};
    return guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? movimiento(
              {
                ...c,
                ...cambio,
                peticionesRestriccion: c.peticionesRestriccion?.map((p) =>
                  p.id === peticionId
                    ? {
                        ...p,
                        estado: aceptar ? "aceptada" : "rechazada",
                        resolucion: motivo.trim(),
                      }
                    : p,
                ),
              },
              actor!.nombre,
              aceptar
                ? hasta
                  ? "Restricción aplicada"
                  : "Restricción levantada"
                : "Petición rechazada",
              motivo.trim(),
            )
          : c,
      ),
    );
  };
  const asignarRolesAUsuario = (id: string, roles: RolUsuario[]) => {
    if (!puedeAdmin()) return mal("Solo Administración asigna roles.");
    if (
      !roles.includes("asistente") ||
      roles.some(
        (r) =>
          ![
            "asistente",
            "organizador",
            "staff",
            "subdireccion",
            "admin",
          ].includes(r),
      )
    )
      return mal("Conserva Asistente y selecciona roles válidos.");
    if (id === activa()!.id && !roles.includes("admin"))
      return mal("No puedes retirar tu propio acceso administrativo.");
    return guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? movimiento(
              {
                ...c,
                roles: [...new Set(roles)],
                rolActivo: roles.includes(c.rolActivo)
                  ? c.rolActivo
                  : "asistente",
              },
              activa()!.nombre,
              "Roles modificados",
              roles.join(", "),
            )
          : c,
      ),
    );
  };
  const cambiarAutoaprobacion = (id:string,valor:boolean,motivo="",version?:number) => {
    const actor=activa(),u=cuentasRef.current.find(c=>c.id===id);
    if(!actor?.roles.includes('subdireccion')||rolActivo!=='subdireccion')return mal('Solo Subdirección gestiona a los jefes de academia.');
    if(!u||!motivo.trim())return mal('Selecciona la cuenta e indica el motivo.');
    if(version!==u.versionIdentidad && !(version===0&&!u.versionIdentidad))return mal('La cuenta cambió. Revisa su versión actual.');
    if(valor&&(!u.estaActivo||u.afiliacion!=='profesor'||u.correoConfirmado!==true||!verificacionIdentidadVigente(u)))return mal('La jefatura requiere un docente activo con correo e identidad verificados.');
    return guardar(cuentasRef.current.map(c=>c.id===id?movimiento({...c,puedeAutoaprobar:valor},actor.nombre,valor?'Jefatura de academia asignada':'Jefatura de academia retirada',motivo.trim()):c));
  };
  const configurarPeriodosIdentidad = (periodos:PeriodoIdentidad[],versionEsperada?:string) => {
    if(!activa()?.roles.includes('subdireccion')||rolActivo!=='subdireccion')return mal('Solo Subdirección configura los periodos de verificación.');
    const error=validarPeriodosIdentidad(periodos);if(error)return mal(error);
    const usados=cuentasRef.current.filter(u=>u.periodoVerificado).map(u=>u.periodoVerificado);
    const anteriores=leerPeriodosIdentidad();
    if(versionEsperada!==undefined && versionEsperada!==JSON.stringify(anteriores))return mal("El calendario cambió en otra ventana. Recarga los periodos antes de guardar.");
    if(anteriores.some(p=>(usados.includes(p.id)||cuentasRef.current.some(u=>u.historialExpediente?.some(h=>Date.parse(h.fecha)>=Date.parse(p.inicio+'T00:00:00-06:00')&&Date.parse(h.fecha)<=Date.parse(p.fin+'T23:59:59-06:00'))))&&!periodos.some(n=>JSON.stringify(n)===JSON.stringify(p))))return mal('Conserva los periodos que ya tienen trámites de verificación; añade el siguiente periodo sin alterar el historial.');
    const r=guardarLoteLocal(localStorage,{[CLAVE_PERIODOS_IDENTIDAD]:periodos});
    if(r.exito)ponerPeriodosIdentidad(periodos);
    return r.exito?bien('Periodos guardados.'):mal(r.error!);
  };
  const silenciarVerificacion = (id:string,hasta:string,motivo:string,version:number) => {
    const actor=activa(),u=cuentasRef.current.find(c=>c.id===id);
    if(!actor?.roles.includes('subdireccion')||rolActivo!=='subdireccion')return mal('Solo Subdirección puede suspender nuevos envíos de verificación.');
    if(!u||(u.versionIdentidad||0)!==version||!motivo.trim())return mal('Revisa la versión de la cuenta e indica un motivo.');
    if(hasta&&(!/^\d{4}-\d{2}-\d{2}$/.test(hasta)||!Number.isFinite(Date.parse(hasta))||Date.parse(hasta+'T23:59:59-06:00')<=Date.now()))return mal('Indica una fecha de finalización futura.');
    return guardar(cuentasRef.current.map(c=>c.id===id?movimiento({...c,verificacionSilenciadaHasta:hasta||undefined,motivoSilencioVerificacion:hasta?motivo.trim():undefined},actor.nombre,hasta?'Envíos de verificación suspendidos':'Envíos de verificación habilitados',motivo.trim()):c));
  };
  const asociarStaffAEvento = (
    id: string,
    eventoId: string,
    asociar: boolean,
  ) => {
    let eventos: Evento[];
    try {
      eventos = JSON.parse(
        localStorage.getItem("tt_datos_almacen_escom_v7_eventos") || "[]",
      );
    } catch {
      return mal("No se pudieron consultar los eventos.");
    }
    const actor = activa(),
      evento = eventos.find((e) => e.id === eventoId),
      u = cuentasRef.current.find((c) => c.id === id);
    if (
      !puedeAsignarStaff(actor, evento) ||
      !["admin", "organizador"].includes(rolActivo)
    )
      return mal(
        "Solo Administración o el Organizador del evento puede asignar Staff.",
      );
    if (!u || (asociar && (!u.estaActivo || u.correoConfirmado !== true)))
      return mal("Selecciona una cuenta activa con correo confirmado.");
    return guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? movimiento(
              {
                ...c,
                roles: asociar
                  ? [...new Set<RolUsuario>([...c.roles, "staff"])]
                  : c.roles,
                eventosAsignadosStaff: asociar
                  ? [...new Set([...(c.eventosAsignadosStaff || []), eventoId])]
                  : (c.eventosAsignadosStaff || []).filter(
                      (e) => e !== eventoId,
                    ),
              },
              actor!.nombre,
              asociar ? "Staff asignado" : "Staff retirado",
              evento!.titulo,
            )
          : c,
      ),
    );
  };
  const alternarEstadoUsuario = (id: string) => {
    if (!puedeAdmin() || id === activa()!.id)
      return mal("Operación administrativa no permitida.");
    return guardar(
      cuentasRef.current.map((c) =>
        c.id === id
          ? movimiento(
              {
                ...c,
                estaActivo: !c.estaActivo,
                versionCredenciales: (c.versionCredenciales || 0) + 1,
              },
              activa()!.nombre,
              "Estado de cuenta modificado",
              c.estaActivo ? "Suspendida." : "Activada.",
            )
          : c,
      ),
    );
  };
  const reiniciarConfirmacionPrueba = () => {
    const u = activa();
    if (modoDemostracionActivo() && u?.id === "usr-estudiante-sin-confirmar")
      guardar(
        cuentasRef.current.map((c) =>
          c.id === u.id ? { ...c, correoConfirmado: false } : c,
        ),
      );
  };
  return {
    usuarioActual,
    estaAutenticado: !!usuarioActual,
    rolActivo,
    todosLosUsuarios: usuarios,
    refrescarUsuarios: () => {
      const nuevas = leerUsuarios();
      cuentasRef.current = nuevas;
      ponerUsuarios(nuevas);
    },
    cambiarRolActivo: (rol: RolUsuario) => {
      if (activa()?.roles.includes(rol)) ponerRol(rol);
    },
    cambiarUsuario: (id: string) => {
      const u = cuentasRef.current.find((c) => c.id === id);
      if (modoDemostracionActivo() && u?.estaActivo) entrar(u);
    },
    tieneRol: (rol: RolUsuario) => !!activa()?.roles.includes(rol),
    iniciarSesion,
    cerrarSesion,
    registrarUsuario,
    solicitarRecuperacionPassword,
    esTokenRecuperacionValido: (token: string) =>
      cuentasRef.current.some(
        (u) =>
          !!token.trim() &&
          u.estaActivo &&
          u.tokenRecuperacion === token.trim() &&
          (u.tokenExpiracion || 0) > Date.now(),
      ),
    restablecerPasswordConToken,
    cambiarPassword,
    actualizarPerfil,
    asignarRolesAUsuario,
    asociarStaffAEvento,
    alternarEstadoUsuario,
    confirmarCorreo,
    solicitarCambioCorreo,
    reenviarConfirmacionCorreo,
    solicitarConfirmacionCorreo,
    reiniciarConfirmacionPrueba,
    enviarExpediente,
    dictaminarExpediente,
    solicitarRestriccion,
    actualizarRestriccionSolicitudes,
    cambiarAutoaprobacion,
    configurarPeriodosIdentidad,
    periodosIdentidad,
    silenciarVerificacion,
  };
}
const ContextoAutenticacion = createContext<
  ReturnType<typeof usarIdentidad> | undefined
>(undefined);
export const ProveedorAutenticacion: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ContextoAutenticacion.Provider value={usarIdentidad()}>
    {children}
  </ContextoAutenticacion.Provider>
);
export function useAutenticacion() {
  const c = useContext(ContextoAutenticacion);
  if (!c) throw new Error("Falta ProveedorAutenticacion.");
  return c;
}
