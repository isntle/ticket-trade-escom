import { ContextoAutenticacion } from "./almacenes.js";
import React, { useEffect, useRef, useState } from "react";
import type {
  DatosRegistroUsuario,
  TipoAutenticacion,
} from "./AutenticacionContexto.js";
import { suscribirActualizacionVisible } from "../servicios/actualizacionVisible.js";
import { transporteApi, ErrorApi, esFalloTemporal } from "../servicios/http.js";
import { modoDemostracionActivo } from "../dominio/demostracion.js";
import type { Usuario, RolUsuario } from "../tipos/index.js";
import type { PeriodoIdentidad } from "../dominio/periodosIdentidad.js";

const api = transporteApi();
const principal = (u: Usuario): RolUsuario =>
  (["admin", "subdireccion", "organizador", "staff"].find((r) =>
    u.roles.includes(r as RolUsuario),
  ) as RolUsuario) || "asistente";
const errorDe = (e: unknown) => ({
  exito: false,
  mensaje:
    e instanceof Error ? e.message : "No se pudo completar la operación.",
});
export function ProveedorAutenticacionRemota({
  children,
}: {
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null),
    [usuarios, setUsuarios] = useState<Usuario[]>([]),
    [rol, setRol] = useState<RolUsuario>("asistente");
  const [usuariosPresentacion,setUsuariosPresentacion]=useState<Usuario[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoIdentidad[]>([]),
    [listo, setListo] = useState(false),
    [error, setError] = useState("");
  const vigente = useRef(true);
  const cuentaRef = useRef<string | null>(null);
  const secuencia = useRef(0);
  const lecturasActivas = useRef(0);
  const ultimaLectura = useRef(0);
  const sesionConsultada = useRef(false);
  const fallosLectura = useRef(0);

  async function refrescar() {
    const orden = ++secuencia.current;
    const esVigente = () => vigente.current && orden === secuencia.current;
    const opciones = { signal: AbortSignal.timeout(15_000) };
    lecturasActivas.current++;
    try {
      const sesion = await api<{ usuario: Usuario }>("/auth/yo", opciones).catch((e) => {
        if (e instanceof ErrorApi && e.estado === 401) return null;
        throw e;
      });
      const u = sesion?.usuario ?? null;
      if (!esVigente()) return u;

      const anterior = cuentaRef.current;
      const nuevaCuenta = u?.id ?? null;
      cuentaRef.current = nuevaCuenta;
      setUsuario(u);
      if (anterior !== nuevaCuenta || !u?.roles.some(r => r === "admin" || r === "subdireccion")) {
        setUsuarios(u ? [u] : []);
      }
      setRol(actual => u && anterior === u.id && u.roles.includes(actual)
        ? actual : u ? principal(u) : "asistente");
      ultimaLectura.current = Date.now();
      sesionConsultada.current = true;
      fallosLectura.current = 0;
      setError("");
      setListo(true);

      // La agenda y la sesión pueden seguir operando si falla un catálogo auxiliar.
      const [periodosLeidos, demo, directorio] = await Promise.allSettled([
        api<PeriodoIdentidad[]>("/auth/periodos", opciones),
        modoDemostracionActivo() ? api<Usuario[]>("/auth/demo", opciones) : Promise.resolve([]),
        u?.roles.some(r => r === "admin" || r === "subdireccion")
          ? api<Usuario[]>("/auth/usuarios", opciones) : Promise.resolve(u ? [u] : []),
      ]);
      if (esVigente()) {
        if (periodosLeidos.status === "fulfilled") setPeriodos(periodosLeidos.value);
        if (demo.status === "fulfilled") setUsuariosPresentacion(demo.value);
        if (directorio.status === "fulfilled") {
          setUsuarios(directorio.value.map(persona => ({ ...persona, rolActivo: principal(persona) })));
        }
      }
      return u;
    } finally {
      lecturasActivas.current--;
    }
  }

  const consultarSesion = () => {
    const consulta = refrescar();
    const orden = secuencia.current;
    void consulta.catch((e: unknown) => {
      if (!vigente.current || orden !== secuencia.current) return;
      if (!sesionConsultada.current || !esFalloTemporal(e) || ++fallosLectura.current >= 2) {
        setError(errorDe(e).mensaje);
      }
    }).finally(() => { if (vigente.current) setListo(true); });
  };

  useEffect(() => {
    vigente.current = true;
    consultarSesion();
    const detener = suscribirActualizacionVisible(() => {
      if (!lecturasActivas.current && Date.now() - ultimaLectura.current >= 15_000) consultarSesion();
    }, 30_000);
    return () => {
      vigente.current = false;
      secuencia.current++;
      detener();
    };
  }, []);
  const operacion = async (ruta: string, datos?: unknown) => {
    try {
      const r = await api<any>(ruta, { metodo: "POST", datos: datos || {} });
      if (ruta === "/auth/expediente" && r.usuario?.id === cuentaRef.current && vigente.current) {
        // La escritura ya se confirmó. La siguiente lectura periódica actualiza el resto.
        setUsuario(r.usuario as Usuario);
      } else if (ruta === "/auth/login" || ruta === "/auth/logout") {
        const cuenta = ruta === "/auth/logout" ? null : r.usuario as Usuario;
        secuencia.current++;
        cuentaRef.current = cuenta?.id ?? null;
        setUsuario(cuenta);
        setUsuarios(cuenta ? [{ ...cuenta, rolActivo: principal(cuenta) }] : []);
        setRol(cuenta ? principal(cuenta) : "asistente");
        setError("");
        consultarSesion();
      } else {
        await refrescar().catch(() => {});
      }
      window.dispatchEvent(new Event("tt:datos-remotos"));
      return {
        exito: true,
        mensaje: r.mensaje || "Cambios guardados.",
        codigoPrueba: r.codigoPrueba,
        roles: (r.usuario as Usuario | undefined)?.roles,
      };
    } catch (e) {
      return errorDe(e);
    }
  };
  const iniciarSesion = async (correo: string, password?: string) => {
    const r = await operacion("/auth/login", { correo, password });
    return r;
  };
  const noDisponible = () => ({
    exito: false,
    mensaje:
      "Esta función aún no está disponible. No se guardaron cambios.",
  });
  const acciones: Record<string, unknown> = {
    usuarioActual: usuario,
    estaAutenticado: !!usuario,
    rolActivo: rol,
    todosLosUsuarios: usuarios,
    usuariosPresentacion,
    periodosIdentidad: periodos,
    refrescarUsuarios: refrescar,
    cambiarRolActivo: (r: RolUsuario) => {
      if (usuario?.roles.includes(r)) setRol(r);
    },
    tieneRol: (r: RolUsuario) => !!usuario?.roles.includes(r),
    iniciarSesion,
    iniciarSesionConUsuario: (u: Usuario) => {
      setUsuario(u);
      setUsuarios((prev) => [u, ...prev.filter((x) => x.id !== u.id)]);
      setRol(u.rolActivo);
      window.dispatchEvent(new Event("tt:datos-remotos"));
    },
    cerrarSesion: async () => {
      const r = await operacion("/auth/logout");
      if (r.exito) {
        setUsuario(null);
        setRol("asistente");
      } else setError(r.mensaje);
      return r;
    },
    cambiarUsuario: async (id: string) => {
      if (!modoDemostracionActivo()) return noDisponible();
      const u = usuarios.find((u) => u.id === id);
      if (!u) return noDisponible();
      return iniciarSesion(u.correo, u.password || "Password123!");
    },
    registrarUsuario: async (
      d: DatosRegistroUsuario & {
        nombres?: string;
        primerApellido?: string;
        segundoApellido?: string;
      },
    ) => {
      const partes = d.nombre.trim().split(/\s+/);
      return operacion("/auth/registro", {
        nombres: d.nombres || partes.slice(0, -1).join(" ") || partes[0],
        primerApellido: d.primerApellido || partes.at(-1),
        segundoApellido: d.segundoApellido || "",
        correo: d.correo,
        password: d.password,
        boleta: d.boleta,
        rfc: d.rfc || d.numeroEmpleado,
        rol:
          d.afiliacion === "alumno"
            ? "Estudiante"
            : d.afiliacion === "externo"
              ? "Externo"
              : "Empleado del IPN",
      });
    },
    confirmarCorreo: (token: string) =>
      operacion("/auth/confirmar-correo", { token }),
    reenviarConfirmacionCorreo: (correo: string) =>
      operacion("/auth/reenviar-confirmacion", { correo }),
    solicitarConfirmacionCorreo: () =>
      operacion("/auth/reenviar-confirmacion", { correo: usuario?.correo }),
    solicitarRecuperacionPassword: (correo: string) =>
      operacion("/auth/recuperacion", { correo }),
    esTokenRecuperacionValido: (token: string) => /^[a-f0-9]{64}$/.test(token),
    restablecerPasswordConToken: (token: string, password: string) =>
      operacion("/auth/restablecer-password", { token, password }),
    enviarExpediente: (
      _id: string,
      documentos: unknown[],
      _version: number,
      motivoSolicitud: string,
    ) => operacion("/auth/expediente", {
        documentos,
        motivoSolicitud,
        ...(usuario?.afiliacion === "profesor"
          ? { numeroEmpleado: usuario.numeroEmpleado }
          : usuario?.afiliacion === "externo"
            ? {
                nombreEntidad: usuario.nombreOrganizacion,
                cargo: usuario.puestoContacto,
              }
            : {}),
      }),
    dictaminarExpediente: async (
      id: string,
      decision: string,
      motivo: string,
      _version?: number,
      _vigencia?: string,
      idSolicitud?: string,
    ) => {
      if (!["aprobado", "rechazado", "requiere_correccion"].includes(decision))
        return noDisponible();
      const u = usuarios.find((u) => u.id === id);
      return operacion(
        "/auth/expedientes/" +
          (idSolicitud || u?.idSolicitudVerificacion) +
          "/resolucion",
        {
          decision:
            decision === "aprobado"
              ? "Aprobada"
              : decision === "requiere_correccion"
                ? "Requiere corrección"
                : "Rechazada",
          motivo,
        },
      );
    },
    actualizarPerfil: (_id: string, datos: Partial<Usuario>) =>
      operacion("/auth/perfil", { ...datos }),
    solicitarCambioCorreo: noDisponible,
    cambiarPassword: async (
      actual: string,
      nueva: string,
      confirmacion: string,
    ) => {
      if (nueva !== confirmacion)
        return { exito: false, mensaje: "Las contraseñas nuevas no coinciden." };
      try {
        const r = await api<{ exito: boolean; mensaje: string }>(
          "/auth/cambiar-password",
          {
            metodo: "POST",
            datos: { passwordActual: actual, passwordNueva: nueva },
          },
        );
        if (r.exito) {
          setUsuario(null);
          setRol("asistente");
          setUsuarios([]);
          cuentaRef.current = null;
        }
        return {
          exito: !!r.exito,
          mensaje: r.mensaje || "No se pudo completar la operación.",
        };
      } catch (e) {
        return errorDe(e);
      }
    },
    asignarRolesAUsuario: noDisponible,
    asociarStaffAEvento: (id: string, evento: string, asociar: boolean) =>
      operacion(`/auth/staff/${encodeURIComponent(evento)}/${encodeURIComponent(id)}`, { asociar }),
    alternarEstadoUsuario: async (id: string, motivo?: string) => {
      if (!usuario?.roles.includes("admin") || rol !== "admin") {
        return {
          exito: false,
          mensaje: "Solo Administración puede modificar el estado de una cuenta.",
        };
      }
      if (id === usuario.id) {
        return {
          exito: false,
          mensaje: "No puedes suspender tu propia cuenta.",
        };
      }
      const objetivo = usuarios.find(u => u.id === id);
      if (!objetivo) return { exito: false, mensaje: "Cuenta no encontrada." };
      return operacion(`/auth/usuarios/${encodeURIComponent(id)}/estado`, { motivo, activo: !objetivo.estaActivo });
    },
    reiniciarConfirmacionPrueba: noDisponible,
    solicitarRestriccion: (id: string, accion: "aplicar" | "levantar", motivo: string, solicitudes: string) =>
      operacion(`/auth/usuarios/${encodeURIComponent(id)}/restricciones/peticiones`, { accion, motivo, solicitudes }),
    actualizarRestriccionSolicitudes: (id: string, hasta: string, motivo: string, desde?: string, peticionId?: string, aceptar = true) =>
      operacion(`/auth/usuarios/${encodeURIComponent(id)}/restricciones/resolucion`, { desde, hasta, motivo, peticionId, aceptar }),
    cambiarAutoaprobacion: async (
      id: string,
      valor: boolean,
      motivo = "",
      _version?: number,
      nombramiento?: { idAcademia?: string; nombreAcademia?: string; idOtorgante: string },
    ) => {
      if (!usuario?.roles.includes("admin")) {
        return {
          exito: false,
          mensaje: "No tienes permiso para gestionar jefaturas de academia.",
        };
      }
      return operacion(`/auth/usuarios/${encodeURIComponent(id)}/jefatura`, {
        valor,
        motivo,
        ...nombramiento,
      });
    },
    configurarPeriodosIdentidad: async (
      periodos: PeriodoIdentidad[],
      versionEsperada?: string,
    ) => {
      if (!usuario?.roles.includes("admin")) {
        return {
          exito: false,
          mensaje: "No tienes permiso para configurar periodos escolares.",
        };
      }
      return operacion("/auth/periodos", {
        periodos,
        versionEsperada,
      });
    },
    silenciarVerificacion: () => ({
      exito: false,
      mensaje:
        "La pausa de envíos de verificación no tiene persistencia en la base de datos remota. Función no disponible en modo conectado.",
    }),
  };
  if (!listo)
    return (
      <p role="status" className="p-10 text-center text-sm text-neutral-500">
        Consultando tu sesión…
      </p>
    );
  return (
    <ContextoAutenticacion.Provider
      value={acciones as unknown as TipoAutenticacion}
    >
      {error && (
        <div role="status" className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p>{sesionConsultada.current ? "No se pudo actualizar la sesión. Se conserva la vista actual." : error}</p>
          <button type="button" className="font-semibold underline" onClick={consultarSesion}>Volver a consultar</button>
        </div>
      )}
      {children}
    </ContextoAutenticacion.Provider>
  );
}
