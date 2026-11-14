import { ContextoAutenticacion } from "./almacenes";
import React, { useEffect, useRef, useState } from "react";
import type {
  DatosRegistroUsuario,
  TipoAutenticacion,
} from "./AutenticacionContexto";
import { transporteApi, ErrorApi } from "../servicios/http";
import { modoDemostracionActivo } from "../dominio/demostracion";
import type { Usuario, RolUsuario } from "../tipos";
import type { PeriodoIdentidad } from "../dominio/periodosIdentidad";

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
  const [periodos, setPeriodos] = useState<PeriodoIdentidad[]>([]),
    [listo, setListo] = useState(false),
    [error, setError] = useState("");
  const vigente = useRef(true),
    cuentaRef = useRef<string | null>(null);
  async function refrescar() {
    const [sesion, p, demostracion] = await Promise.all([
      api<{ usuario: Usuario }>("/auth/yo").catch((e) => {
        if (e instanceof ErrorApi && e.estado === 401) return null;
        throw e;
      }),
      api<PeriodoIdentidad[]>("/auth/periodos"),
      modoDemostracionActivo()
        ? api<Usuario[]>("/auth/demo")
        : Promise.resolve([]),
    ]);
    const u = sesion?.usuario || null;
    const lista = u?.roles.some((r) => ["admin", "subdireccion"].includes(r))
      ? await api<Usuario[]>("/auth/usuarios")
      : demostracion.length
        ? demostracion
        : u
          ? [u]
          : [];
    if (vigente.current) {
      setUsuario(u);
      setUsuarios(lista.map((u) => ({ ...u, rolActivo: principal(u) })));
      setPeriodos(p);
      const anterior = cuentaRef.current;
      cuentaRef.current = u?.id || null;
      setRol((actual) =>
        u && anterior === u.id && u.roles.includes(actual)
          ? actual
          : u
            ? principal(u)
            : "asistente",
      );
    }
    return u;
  }
  useEffect(() => {
    vigente.current = true;
    void refrescar()
      .then(() => setError(""))
      .catch((e) => setError(e.message))
      .finally(() => setListo(true));
    const actualizacion = window.setInterval(() => {
      void refrescar().catch((e) => setError(e.message));
    }, 15000);
    return () => {
      vigente.current = false;
      window.clearInterval(actualizacion);
    };
  }, []);
  const operacion = async (ruta: string, datos?: unknown) => {
    try {
      const r = await api<any>(ruta, { metodo: "POST", datos: datos || {} });
      await refrescar();
      window.dispatchEvent(new Event("tt:datos-remotos"));
      return {
        exito: true,
        mensaje: r.mensaje || "Cambios guardados.",
        codigoPrueba: r.codigoPrueba,
      };
    } catch (e) {
      return errorDe(e);
    }
  };
  const iniciarSesion = async (correo: string, password?: string) => {
    const r = await operacion("/auth/login", { correo, password });
    if (r.exito) {
      const u = await refrescar();
      if (u) setRol(principal(u));
    }
    return r;
  };
  const noDisponible = () => ({
    exito: false,
    mensaje:
      "Esta operación todavía no está conectada a PostgreSQL. No se guardaron cambios.",
  });
  const acciones: Record<string, unknown> = {
    usuarioActual: usuario,
    estaAutenticado: !!usuario,
    rolActivo: rol,
    todosLosUsuarios: usuarios,
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
      return iniciarSesion(u.correo, "Password123!");
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
    ) =>
      operacion("/auth/expediente", {
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
    cambiarPassword: noDisponible,
    asignarRolesAUsuario: noDisponible,
    asociarStaffAEvento: noDisponible,
    alternarEstadoUsuario: noDisponible,
    reiniciarConfirmacionPrueba: noDisponible,
    solicitarRestriccion: noDisponible,
    actualizarRestriccionSolicitudes: noDisponible,
    cambiarAutoaprobacion: noDisponible,
    configurarPeriodosIdentidad: noDisponible,
    silenciarVerificacion: noDisponible,
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
        <p
          role="alert"
          className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      {children}
    </ContextoAutenticacion.Provider>
  );
}
