import { filtrarPorTituloYEstado, ordenarEventosOrganizador, nombreEstadoOrganizador } from "../dominio/filtrosOrganizador";
import { fechaLegible } from "../dominio/presentacionActividad";
import { modalidadActividad } from "../dominio/actividades";
import { BotonRegresar } from "../componentes/ui/BotonRegresar";
import { transporteApi } from "../servicios/http.js";
import { textoParaUsuario } from '../utilidades/textoParaUsuario.js';
import { impedimentoVerificacion, intentosPeriodo, periodoIdentidadActual, rechazosPeriodo } from "../dominio/periodosIdentidad";
import { volverA, volverASeccion } from '../dominio/navegacion';
import { apiActiva } from '../servicios/modoDatos';
import React, { useEffect, useRef, useState } from "react";
import {
  UploadCloud, FileCheck2, CircleCheck, Clock3, AlertTriangle,
  XCircle, ShieldOff, CircleHelp
} from "lucide-react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useDatos } from "../contextos/DatosContexto";
import type { DocumentoIdentidad, Usuario } from "../tipos";
import {
  validarExpedienteIdentidad,
  restriccionIdentidadVigente,
} from "../dominio/identidad";
import { guardarDocumentoIdentidad } from "../utilidades/documentosIdentidad";
import { BotonVerDocumento, VisorDocumentoIdentidad, etiquetaTipoDocumento } from "../componentes/identidad/VisorDocumentoIdentidad";

const apiStaff = transporteApi();
type CuentaStaff = Pick<Usuario, "id" | "nombre" | "correo" | "estaActivo" | "correoConfirmado" | "eventosAsignadosStaff">;

type Vista = "expediente" | "revision" | "restricciones" | "staff";
type Decision = "aprobado" | "rechazado" | "requiere_correccion" | "revocado";
const boton =
  "rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-40";
const primario =
  "rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const campo =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-sm";
const estado = (s?: string) => (s || "sin_enviar").replaceAll("_", " ");
const ETIQUETAS_ESTADO: Record<string, string> = {
  sin_enviar: "Sin enviar",
  en_revision: "En revisión",
  requiere_correccion: "Corrección solicitada",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  revocado: "Verificación revocada",
};
const estadoLegible = (s?: string) => ETIQUETAS_ESTADO[s || "sin_enviar"] || estado(s);
const PRESENTACION_ESTADO = {
  sin_enviar: { clase: "border-neutral-300 bg-neutral-100 text-neutral-700", Icono: CircleHelp },
  en_revision: { clase: "border-sky-200 bg-sky-50 text-sky-800", Icono: Clock3 },
  requiere_correccion: { clase: "border-amber-300 bg-amber-50 text-amber-900", Icono: AlertTriangle },
  aprobado: { clase: "border-emerald-200 bg-emerald-50 text-emerald-800", Icono: CircleCheck },
  rechazado: { clase: "border-rose-200 bg-rose-50 text-rose-800", Icono: XCircle },
  revocado: { clase: "border-orange-200 bg-orange-50 text-orange-800", Icono: ShieldOff },
} as const;
const InsigniaEstado = ({ valor }: { valor?: string }) => {
  const { clase, Icono } = PRESENTACION_ESTADO[valor as keyof typeof PRESENTACION_ESTADO]
    || PRESENTACION_ESTADO.sin_enviar;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${clase}`}>
      <Icono size={14} aria-hidden />
      {estadoLegible(valor)}
    </span>
  );
};
const afiliacionLegible = (afiliacion: Usuario["afiliacion"]) => ({
  alumno: "Estudiante",
  profesor: "Docente",
  administrativo: "Administrativo",
  pae: "Personal de apoyo",
  externo: "Externo",
}[afiliacion]);
const ESTADOS_RESUELTOS = new Set([
  "aprobado",
  "rechazado",
  "requiere_correccion",
  "revocado",
]);

export function GestionIdentidadPagina({
  vista,
  navigate,
}: {
  vista: Vista;
  navigate: (ruta: string) => void;
}) {
  const auth = useAutenticacion();
  const { usuarioActual: cuenta, todosLosUsuarios: usuarios, rolActivo } = auth;
  const limiteDocumentos = cuenta?.afiliacion === 'externo' ? 2 : 1;
  const tiposDocumento: Array<[DocumentoIdentidad["tipo"], string]> =
    cuenta?.afiliacion === "alumno"
      ? [["constancia", "Constancia de estudios"], ["horario", "Comprobante de horario"]]
      : cuenta?.afiliacion === "externo"
        ? [["existencia", "Acta constitutiva o documento equivalente"], ["representacion", "Poder o nombramiento de representación"]]
        : [["adscripcion", "Comprobante de adscripción"]];
  const { listaEventos } = useDatos();
  const [archivos, setArchivos] = useState<DocumentoIdentidad[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const operacionExpediente = useRef(false);
  const tituloRevision = useRef<HTMLHeadingElement>(null);
  const [errorExpediente, setErrorExpediente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [seleccion, setSeleccion] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [motivo, setMotivo] = useState("");
  const [vigencia, setVigencia] = useState(periodoIdentidadActual(auth.periodosIdentidad)?.fin || "");
  const [motivoSolicitud,setMotivoSolicitud] = useState(cuenta?.motivoSolicitudVerificacion || "");
  const [silencioHasta,setSilencioHasta] = useState("");
  const [motivoSilencio,setMotivoSilencio] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [relacionadas, setRelacionadas] = useState("");
  const [accion, setAccion] = useState<"aplicar" | "levantar">("aplicar");
  const [eventoId, setEventoId] = useState("");
  const [buscarEventoStaff, setBuscarEventoStaff] = useState("");
  const [filtro, setFiltro] = useState("");
  const [apartado, setApartado] = useState<"pendientes" | "historial">("pendientes");
  const [cargandoListado, setCargandoListado] = useState(false);
  const [errorListado, setErrorListado] = useState("");
  // Documento abierto en la vista previa; el visor obtiene el PDF con la sesión vigente.
  const [documento, setDocumento] = useState<{
    archivo: DocumentoIdentidad;
    titular: Usuario;
  } | null>(null);
  const admin = !!cuenta?.roles.includes("admin") && rolActivo === "admin";
  const subdireccion =
    !!cuenta?.roles.includes("subdireccion") && rolActivo === "subdireccion";
  const regreso = vista === "expediente" ? "/perfil"
    : admin ? "/admin"
    : subdireccion ? "/subdireccion"
    : vista === "staff" ? "/organizador"
    : "/perfil";
  const organizador =
    !!cuenta?.roles.includes("organizador") && rolActivo === "organizador";
  const elegida = usuarios.find((u) => u.id === seleccion?.id);
  const eventos = listaEventos.filter(
    (e) => admin || e.idOrganizador === cuenta?.id,
  );
  const evento = eventos.find((e) => e.id === eventoId);
  const eventosStaff = vista === "staff"
    ? ordenarEventosOrganizador(filtrarPorTituloYEstado(eventos, e => e.titulo, buscarEventoStaff, "TODOS"))
    : [];
  const [staffRemoto, setStaffRemoto] = useState<{ evento: string; cuentas: CuentaStaff[] }>();
  const [revisionStaff, setRevisionStaff] = useState(0);
  const [errorStaff, setErrorStaff] = useState("");
  const [ocupadoStaff, setOcupadoStaff] = useState(false);
  useEffect(() => {
    if (!apiActiva || vista !== "staff" || !eventoId || (!admin && !organizador)) return;
    const abortar = new AbortController();
    setErrorStaff("");
    void apiStaff<CuentaStaff[]>(`/auth/staff/${encodeURIComponent(eventoId)}`, { signal: abortar.signal })
      .then(cuentas => { if (!abortar.signal.aborted) setStaffRemoto({ evento: eventoId, cuentas }); })
      .catch(error => { if (!abortar.signal.aborted) setErrorStaff(textoParaUsuario(error.message)); });
    return () => abortar.abort();
  }, [vista, eventoId, admin, organizador, revisionStaff, cuenta?.id]);
  const cuentasStaff = apiActiva
    ? (staffRemoto?.evento === eventoId ? staffRemoto.cuentas : [])
    : usuarios;
  useEffect(() => {
    setArchivos(cuenta?.archivosExpediente || []);
    setMotivoSolicitud(cuenta?.motivoSolicitudVerificacion || "");
    setRevision(null);
    setSeleccion(null);
    setApartado("pendientes");
    setMensaje("");
    setDocumento(null);

    if (vista !== "revision" || (!admin && !subdireccion)) {
      setCargandoListado(false);
      setErrorListado("");
      return;
    }

    let vigente = true;
    setCargandoListado(true);
    setErrorListado("");
    Promise.resolve()
      .then(() => auth.refrescarUsuarios())
      .then(() => {
        if (vigente) setCargandoListado(false);
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        setErrorListado(error instanceof Error ? error.message : "No se pudo cargar la bandeja de expedientes.");
        setCargandoListado(false);
      });
    return () => {
      vigente = false;
    };
  }, [cuenta?.id, vista, rolActivo]);
  useEffect(() => {
    if (!cuenta || (!admin && !subdireccion && vista === "revision")) setDocumento(null);
  }, [cuenta?.id, rolActivo, vista]);
  const resultado = (r: { exito: boolean; mensaje: string }) => {
    setMensaje(r.mensaje);
    if (r.exito) {
      setRevision(null);
      setDecision(null);
      setSeleccion(null);
    }
  };
  const abrirDocumento = async (
    archivo: DocumentoIdentidad,
    titular: Usuario,
  ) => {
    if (!cuenta || (cuenta.id !== titular.id && !admin && !subdireccion))
      return setMensaje("No tienes permiso para consultar este documento.");
    setDocumento({ archivo, titular });
  };
  const elegir = (u: Usuario) => {
    setSeleccion({ id: u.id, version: u.versionIdentidad || 0 });
    setDecision(null);
    setMotivo("");
    setMensaje("");
    setDocumento(null);
  };
  const reintentarCargaUsuarios = async () => {
    setCargandoListado(true);
    setErrorListado("");
    try {
      await auth.refrescarUsuarios();
    } catch (error) {
      setErrorListado(error instanceof Error ? error.message : "No se pudo cargar la bandeja de expedientes.");
    } finally {
      setCargandoListado(false);
    }
  };
  const usuariosUnicos = Array.from(new Map(usuarios.map((u) => [u.id, u])).values());
  const expedientesPendientes = usuariosUnicos.filter((u) => u.estadoExpediente === "en_revision");
  const expedientesHistorial = usuariosUnicos.filter((u) =>
    u.estadoExpediente !== "en_revision" && (
      ESTADOS_RESUELTOS.has(u.estadoExpediente || "") ||
      !!u.esVerificado ||
      !!u.historialExpediente?.some((h) => ESTADOS_RESUELTOS.has(h.estado))
    ),
  );
  const expedientesVisibles = (apartado === "pendientes" ? expedientesPendientes : expedientesHistorial).filter((u) =>
    (u.nombre + u.correo).toLocaleLowerCase().includes(filtro.trim().toLocaleLowerCase()),
  );
  useEffect(() => {
    if (revision !== null) tituloRevision.current?.focus();
  }, [revision]);
  const agregar = async (files: File[]) => {
    if (!files.length || operacionExpediente.current) return;
    setErrorExpediente("");
    if (files.length + archivos.length > limiteDocumentos)
      return setErrorExpediente(`El expediente admite hasta ${limiteDocumentos} PDF. Quita un archivo antes de añadir el reemplazo.`);
    operacionExpediente.current = true;
    setOcupado(true);
    setMensaje('Cargando PDF…');
    setRevision(null);
    const nuevos: DocumentoIdentidad[] = [];
    const errores: string[] = [];
    try {
      for (const file of files) {
        let id: string;
        try {
          id = await guardarDocumentoIdentidad(crypto.randomUUID(), file);
        } catch (error) {
          errores.push(file.name + ": " + (error instanceof Error ? error.message : "No se pudo cargar. Inténtalo de nuevo."));
          continue;
        }
        const usados = new Set([...archivos, ...nuevos].map((a) => a.tipo));
        nuevos.push({
          id,
          nombre: file.name,
          tamano: file.size,
          tipo:
            cuenta?.afiliacion === "alumno"
              ? "constancia"
              : cuenta?.afiliacion === "externo"
                ? usados.has("existencia") ? "representacion" : "existencia"
                : "adscripcion",
          fechaEmision: "",
        });
      }
      if (nuevos.length) setArchivos(prev => [...prev, ...nuevos]);
      setMensaje(nuevos.length ? "PDF adjunto. Revisa los datos antes de enviar." : "");
      setErrorExpediente(errores.join("\n"));
    } finally {
      operacionExpediente.current = false;
      setOcupado(false);
    }
  };
  const enviarExpediente = async () => {
    if (!cuenta || revision === null || operacionExpediente.current) return;
    operacionExpediente.current = true;
    setOcupado(true);
    setErrorExpediente("");
    try {
      const respuesta = await auth.enviarExpediente(cuenta.id, archivos, revision, motivoSolicitud.trim());
      if (!respuesta.exito) {
        setErrorExpediente(respuesta.mensaje || "No se pudo enviar el expediente. Inténtalo de nuevo.");
        return;
      }
      setRevision(null);
      setMensaje("");
    } catch (error) {
      setErrorExpediente(error instanceof Error ? error.message : "No se pudo confirmar el envío.");
    } finally {
      operacionExpediente.current = false;
      setOcupado(false);
    }
  };
  const cambiarArchivo = (id: string, datos: Partial<DocumentoIdentidad>) => {
    setRevision(null);
    setArchivos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...datos } : a)),
    );
  };
  const fechaLegible = (valor?: string) => {
    if (!valor) return "Fecha no registrada";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor);
    return fecha.toLocaleDateString("es-MX", {
      day: "2-digit", month: "long", year: "numeric",
      timeZone: soloFecha ? "UTC" : "America/Mexico_City",
    });
  };

  const listadoArchivos = (
    u: Usuario,
    lista = u.archivosExpediente || [],
    titulo = "Documentos actuales",
    estadoVersion: string | undefined = u.estadoExpediente,
    fechaVersion?: string,
  ) => (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-neutral-900">{titulo}</h3>
        <span className="text-sm font-medium text-neutral-600">
          {lista.length} {lista.length === 1 ? "documento" : "documentos"}
        </span>
      </div>
      {lista.length ? (
        <ul className="space-y-2">
          {lista.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="break-all text-sm font-semibold text-neutral-900">{a.nombre}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                  <span><strong className="font-semibold text-neutral-700">Tipo:</strong> {etiquetaTipoDocumento(a.tipo)}</span>
                  <span><strong className="font-semibold text-neutral-700">Emisión:</strong> {fechaLegible(a.fechaEmision)}</span>
                  {fechaVersion && <span><strong className="font-semibold text-neutral-700">Versión:</strong> {fechaLegible(fechaVersion)}</span>}
                  {a.vigenteHasta && <span><strong className="font-semibold text-neutral-700">Vigencia:</strong> {fechaLegible(a.vigenteHasta)}</span>}
                  {a.periodo && <span><strong className="font-semibold text-neutral-700">Periodo:</strong> {a.periodo}</span>}
                </div>
                <p className="text-sm font-medium text-neutral-700">
                  Estado del expediente: {estadoLegible(estadoVersion)}
                </p>
              </div>
              <BotonVerDocumento archivo={a} onClick={() => abrirDocumento(a, u)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
          No hay documentos registrados en esta versión del expediente.
        </p>
      )}
    </section>
  );
  if (!cuenta)
    return (
      <section className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">Inicia sesión para continuar</h1>
        <button className={primario} onClick={() => navigate("/login")}>
          Iniciar sesión
        </button>
      </section>
    );
  if (
    (vista === "revision" && !admin && !subdireccion) ||
    (vista === "restricciones" && !admin && !subdireccion) ||
    (vista === "staff" && !admin && !organizador)
  )
    return (
      <section className="p-8">
        <h1 className="text-2xl font-bold">
          No tienes permiso para esta operación
        </h1>
        <p>Cambia al perfil autorizado desde el menú de cuenta.</p>
        <button className={boton} onClick={() => navigate(volverA("/perfil"))}>
          Volver al perfil
        </button>
      </section>
    );
  const impedimentoEnvio = impedimentoVerificacion(cuenta, auth.periodosIdentidad);
  const titulo =
    vista === "expediente"
      ? "Mi expediente"
      : vista === "revision"
        ? admin ? "Verificaciones y revocaciones" : "Solicitudes de verificación"
        : vista === "staff"
          ? (admin ? "Personal de acceso por evento" : "Personal de acceso de mis eventos")
          : "Restricciones para solicitar eventos";
  return (
    <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <BotonRegresar destino={vista === "expediente" ? "Volver a mi perfil" : admin ? "Volver a Administración" : subdireccion ? "Volver a Subdirección" : vista === "staff" ? "Volver a mis eventos y solicitudes" : "Volver a mi perfil"} alVolver={() => navigate(volverASeccion(regreso))} />
      <header>
        <FileCheck2 className="mb-3 text-[#7a132b]" />
        <p className="text-xs font-bold uppercase text-[#7a132b]">
          Identidad y perfiles
        </p>
        <h1 className="text-3xl font-black">{titulo}</h1>
      </header>
      {mensaje && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          {textoParaUsuario(mensaje)}
        </p>
      )}
      {vista === "expediente" && (
        <article className="space-y-5 rounded-3xl border bg-white p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">Estado:</span>
            <InsigniaEstado valor={cuenta.estadoExpediente || (cuenta.esVerificado ? "aprobado" : undefined)} />
            <span className="text-neutral-600">Versión {cuenta.versionIdentidad || 0}</span>
            {cuenta.verificacionHasta && <span className="text-neutral-600">Válido hasta {fechaLegible(cuenta.verificacionHasta)}</span>}
          </div>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm"><strong>{cuenta.nombre}</strong><p>{cuenta.correo} · {cuenta.afiliacion}</p><p>{cuenta.boleta ? 'Boleta: '+cuenta.boleta : cuenta.afiliacion==='externo' ? [cuenta.nombreOrganizacion,cuenta.puestoContacto].filter(Boolean).join(' · ') : 'Número de empleado: '+(cuenta.numeroEmpleado||'Pendiente')}</p><button className="mt-2 font-semibold text-[#7a132b] underline" onClick={()=>navigate('/perfil')}>Revisar datos de mi perfil</button>{periodoIdentidadActual(auth.periodosIdentidad)&&<p className="mt-2">Periodo {periodoIdentidadActual(auth.periodosIdentidad)!.id} · Envíos: {intentosPeriodo(cuenta,periodoIdentidadActual(auth.periodosIdentidad)!)} de 3 · Rechazos: {rechazosPeriodo(cuenta,periodoIdentidadActual(auth.periodosIdentidad)!)}</p>}</div>
          {cuenta.afiliacion==='profesor' && <form className="rounded-xl bg-neutral-50 p-4" onSubmit={async e=>{e.preventDefault();const datos=new FormData(e.currentTarget);resultado((await auth.actualizarPerfil(cuenta.id,{numeroEmpleado:String(datos.get('numeroEmpleado')||'').trim()},cuenta.versionIdentidad||0)));}}><label className="block text-sm font-semibold">Número de empleado<input name="numeroEmpleado" required defaultValue={cuenta.numeroEmpleado||''} className={campo}/></label><button type="submit" className={boton+" mt-3"}>Guardar número de empleado</button></form>}
          {cuenta.afiliacion==='externo' && <form className="rounded-xl bg-neutral-50 p-4" onSubmit={async e=>{e.preventDefault();const datos=new FormData(e.currentTarget);resultado((await auth.actualizarPerfil(cuenta.id,{nombreOrganizacion:String(datos.get('nombreOrganizacion')||'').trim(),puestoContacto:String(datos.get('puestoContacto')||'').trim()},cuenta.versionIdentidad||0)));}}><label className="block text-sm font-semibold">Entidad<input name="nombreOrganizacion" required defaultValue={cuenta.nombreOrganizacion||''} className={campo}/></label><label className="mt-3 block text-sm font-semibold">Cargo o relación de representación<input name="puestoContacto" required defaultValue={cuenta.puestoContacto||''} className={campo}/></label><button type="submit" className={boton+" mt-3"}>Guardar datos de la entidad</button></form>}
          {(cuenta.estadoExpediente === "requiere_correccion" || cuenta.estadoExpediente === "rechazado") && (
            <section role="status" className={`space-y-2 rounded-xl border p-4 text-sm ${cuenta.estadoExpediente === "rechazado" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
              <div className="flex items-center gap-2 font-bold">
                <InsigniaEstado valor={cuenta.estadoExpediente} />
                <span>{cuenta.estadoExpediente === "rechazado" ? "Motivo del rechazo" : "Motivo de la corrección"}</span>
              </div>
              <p>{cuenta.motivoExpediente || "El servidor no registró un motivo para esta decisión."}</p>
              {!impedimentoEnvio && (
                <p><strong>Siguiente paso:</strong>{" "}
                  {cuenta.correoConfirmado !== true
                    ? "Confirma tu correo para poder enviar el expediente."
                    : cuenta.estadoExpediente === "requiere_correccion"
                      ? "Revisa la observación, reemplaza el documento indicado y vuelve a enviar el expediente completo."
                      : "Revisa la observación y prepara una nueva solicitud con la documentación corregida."}
                </p>
              )}
            </section>
          )}
          {cuenta.motivoExpediente && !["requiere_correccion", "rechazado"].includes(cuenta.estadoExpediente || "") && (
            <p className="text-sm"><strong>Observaciones:</strong> {cuenta.motivoExpediente}</p>
          )}
          <p className="text-sm">
            Solo tú, Subdirección y Administración pueden consultar estos documentos para evaluar tu verificación. En cuentas de prueba, usa documentos ficticios.
          </p>
          {cuenta.correoConfirmado !== true ? (
            <button
              className={primario}
              onClick={() => navigate("/confirmar-correo")}
            >
              Confirmar mi correo primero
            </button>
          ) : cuenta.estadoExpediente === "en_revision" ? (
            <>
              <section role="status" className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <CircleCheck size={20} className="shrink-0" aria-hidden="true" />
                <div><h2 className="font-bold">Expediente recibido</h2><p>Subdirección está revisando tus documentos. Consulta el resultado aquí.</p></div>
              </section>
              {listadoArchivos(cuenta)}
            </>
          ) : (
            <>
              {impedimentoEnvio && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm">{impedimentoEnvio}</p>}
              {errorExpediente && <p role="alert" className="whitespace-pre-line break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{textoParaUsuario(errorExpediente)}</p>}
              {revision === null && <>
              <p className="text-sm">
                Estudiante: constancia o comprobante de horario del periodo actual. Personal: comprobante
                de adscripción y número de empleado declarado.
                Representante externo: entidad, cargo, documento de existencia y
                representación vigente. Las evidencias de adscripción y
                representación deben tener hasta seis meses, salvo otra vigencia
                expresa.
              </p>
              <label className="block text-sm font-bold">¿Por qué solicitas la verificación?<textarea required className={campo} value={motivoSolicitud} onChange={e=>{setMotivoSolicitud(e.target.value);setRevision(null);}}/></label>
              <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[#7a132b]/40 bg-[#7a132b]/5 p-4 text-sm focus-within:ring-2 focus-within:ring-[#7a132b]">
                <UploadCloud size={24} className="text-[#7a132b]" aria-hidden="true" />
                <span className="min-w-0 flex-1"><span className="block font-bold">Adjuntar PDF</span><span className="text-neutral-700">{archivos.length} de {limiteDocumentos} archivos. Hasta 10 MiB por PDF.</span></span>
                <input
                  disabled={ocupado}
                  type="file"
                  multiple={limiteDocumentos > 1}
                  accept=".pdf,application/pdf"
                  className="max-w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-[#7a132b] file:px-3 file:py-2 file:font-semibold file:text-white"
                  onChange={async (e) => {
                    const entrada = e.currentTarget;
                    await agregar(Array.from(entrada.files || []));
                    entrada.value = "";
                  }}
                />
              </label>
              {archivos.map((a) => (
                <div key={a.id} className="space-y-3 rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-all font-semibold">{a.nombre}</p>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">Adjunto</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Tipo de documento
                      <select
                        className={campo}
                        value={a.tipo}
                        onChange={(e) =>
                          cambiarArchivo(a.id, {
                            tipo: e.target.value as DocumentoIdentidad["tipo"],
                          })
                        }
                      >
                        {tiposDocumento.map(([valor, etiqueta]) => (
                          <option key={valor} value={valor}>
                            {etiqueta}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      Fecha de emisión
                      <input
                        type="date"
                        className={campo}
                        value={a.fechaEmision}
                        onChange={(e) =>
                          cambiarArchivo(a.id, { fechaEmision: e.target.value })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      Vigente hasta (si lo indica el documento)
                      <input
                        type="date"
                        className={campo}
                        value={a.vigenteHasta || ""}
                        onChange={(e) =>
                          cambiarArchivo(a.id, { vigenteHasta: e.target.value })
                        }
                      />
                    </label>
                    {["constancia","horario"].includes(a.tipo) && (
                      <div className="text-sm">
                        <label className="block">
                          Periodo escolar
                          <input
                            className={campo}
                            value={a.periodo || ""}
                            onChange={(e) =>
                              cambiarArchivo(a.id, { periodo: e.target.value })
                            }
                          />
                        </label>
                        <label className="mt-2 block">
                          <input
                            type="checkbox"
                            checked={a.periodoActual || false}
                            onChange={(e) =>
                              cambiarArchivo(a.id, {
                                periodoActual: e.target.checked,
                              })
                            }
                          />{" "}
                          Declaro que corresponde al periodo actual
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <BotonVerDocumento archivo={a} onClick={() => abrirDocumento(a, cuenta)} />
                    <button
                      className={boton}
                      disabled={ocupado}
                      onClick={() => {
                        setArchivos(archivos.filter((f) => f.id !== a.id));
                        setRevision(null);
                      }}
                    >
                      Quitar PDF
                    </button>
                  </div>
                </div>
              ))}
              </>}
              {revision !== null && (
                <section className="space-y-4 rounded-2xl border border-[#7a132b]/20 bg-[#7a132b]/[0.03] p-4">
                  <h2 ref={tituloRevision} tabIndex={-1} className="text-lg font-bold">
                    Revisa antes de enviar
                  </h2>
                  {listadoArchivos(cuenta, archivos)}
                  <p className="break-words text-sm"><strong>Motivo de la solicitud.</strong> {motivoSolicitud}</p>
                  <p className="text-sm text-neutral-700">Al enviar, Subdirección recibirá tu expediente para revisión.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={ocupado} className={boton} onClick={() => setRevision(null)}>Volver a editar</button>
                    <button type="button" disabled={ocupado} className={primario} onClick={() => void enviarExpediente()}>
                      {ocupado ? "Enviando…" : "Enviar a Subdirección"}
                    </button>
                  </div>
                </section>
              )}
              {revision === null && (
              <div className="flex flex-wrap gap-3">
                <button
                  className={boton}
                  disabled={ocupado}
                  onClick={() => {
                    const fallo = impedimentoVerificacion(cuenta,auth.periodosIdentidad) || (!motivoSolicitud.trim()?"Explica por qué solicitas la verificación.":undefined) || validarExpedienteIdentidad(cuenta, archivos);
                    setErrorExpediente(fallo || "");
                    if (!fallo) {
                      setMensaje("");
                      setRevision(cuenta.versionIdentidad || 0);
                    }
                  }}
                >
                  Revisar expediente
                </button>
                <button
                  className={boton}
                  disabled={ocupado}
                  onClick={() => {
                    setErrorExpediente("");
                    setMensaje("");
                    setArchivos(cuenta.archivosExpediente || []);
                    setRevision(null);
                  }}
                >
                  Restaurar adjuntos
                </button>
              </div>
              )}
            </>
          )}
          <p className="text-xs text-neutral-500">
            {apiActiva ? 'Tus documentos se guardan de forma privada. Envía el expediente para que Subdirección lo revise.' : 'Archivos conservados en este navegador. El almacenamiento privado compartido y la entrega real de correo requieren servidor.'}
          </p>
          {new URLSearchParams(window.location.search).get('continuar')==='/solicitar-evento' && <button className={primario} onClick={()=>navigate('/solicitar-evento')}>{cuenta.esVerificado?'Continuar con mi solicitud de evento':'Volver a solicitar evento'}</button>}
          <h2 className="font-bold">Historial del expediente</h2>
          {cuenta.historialExpediente?.map((h, i) => (
            <div key={i} className="rounded-xl border p-3 text-sm">
              <p>
                {estadoLegible(h.estado)} · {h.responsable} ·{" "}
                {new Date(h.fecha).toLocaleString("es-MX")} · {h.motivo}
              </p>
              {h.archivos && listadoArchivos(cuenta, h.archivos, "Documentos anteriores", h.estado, h.fecha)}
            </div>
          ))}
        </article>
      )}
      {vista === "revision" && subdireccion && !periodoIdentidadActual(auth.periodosIdentidad) && <p className="rounded-xl bg-amber-50 p-4 text-sm">Solicita a Administración que configure un periodo académico para poder aprobar verificaciones.</p>}
      {vista === "revision" && (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <label className="block text-sm">
              Buscar expediente
              <input
                className={campo}
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Nombre o correo"
              />
            </label>
            <div className="grid grid-cols-2 gap-2" aria-label="Apartados de expedientes">
              <button
                type="button"
                aria-pressed={apartado === "pendientes"}
                className={apartado === "pendientes" ? primario : boton}
                onClick={() => {
                  setApartado("pendientes");
                  setSeleccion(null);
                  setDecision(null);
                  setDocumento(null);
                }}
              >
                Pendientes ({expedientesPendientes.length})
              </button>
              <button
                type="button"
                aria-pressed={apartado === "historial"}
                className={apartado === "historial" ? primario : boton}
                onClick={() => {
                  setApartado("historial");
                  setSeleccion(null);
                  setDecision(null);
                  setDocumento(null);
                }}
              >
                Historial ({expedientesHistorial.length})
              </button>
            </div>
            {cargandoListado ? (
              <p role="status" className="rounded-2xl border bg-white p-5 text-sm text-neutral-600">
                Cargando expedientes de la bandeja…
              </p>
            ) : errorListado ? (
              <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <p>No fue posible cargar los expedientes. {textoParaUsuario(errorListado)}</p>
                <button type="button" className={boton} onClick={reintentarCargaUsuarios}>
                  Reintentar carga
                </button>
              </div>
            ) : expedientesVisibles.length ? expedientesVisibles.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="block w-full rounded-2xl border bg-white p-4 text-left transition hover:border-[#7a132b] hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b]"
                  onClick={() => elegir(u)}
                >
                  <strong className="block">{u.nombre}</strong>
                  <span className="mt-1 block break-all text-xs text-neutral-500">{u.correo}</span>
                  <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{afiliacionLegible(u.afiliacion)}</span>
                    <InsigniaEstado valor={u.estadoExpediente || (u.esVerificado ? "aprobado" : undefined)} />
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-[#7a132b] underline">Ver expediente</span>
                </button>
              )) : (
                <p className="rounded-2xl border bg-white p-5 text-sm text-neutral-600">
                  {filtro.trim()
                    ? "No se encontraron expedientes que coincidan con la búsqueda."
                    : apartado === "pendientes"
                      ? "No hay expedientes pendientes de revisión. Los expedientes resueltos se consultan en Historial."
                      : "Todavía no hay expedientes resueltos en el historial."}
                </p>
            )}
          </div>
          {elegida ? (
            <article className="space-y-4 rounded-3xl border bg-white p-5">
              <h2 className="text-xl font-bold">{elegida.nombre}</h2>
              <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-800">
              <p className="break-words">
                {elegida.correo} · {afiliacionLegible(elegida.afiliacion)}
              </p>
              <p>
                {elegida.afiliacion === "alumno"
                  ? "Boleta: " + (elegida.boleta || "No registrada")
                  : elegida.afiliacion === "profesor"
                    ? "Número de empleado: " + (elegida.numeroEmpleado || "No registrado") + (elegida.rfc ? " · RFC: " + elegida.rfc : "")
                    : elegida.afiliacion === "externo"
                      ? "Entidad: " + (elegida.nombreOrganizacion || "No registrada") + " · Cargo: " + (elegida.puestoContacto || "No registrado")
                      : "RFC: " + (elegida.rfc || "No registrado")}
              </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-neutral-600">Versión {seleccion?.version}</span>
                <InsigniaEstado valor={elegida.estadoExpediente || (elegida.esVerificado ? "aprobado" : undefined)} />
              </div>
              {["requiere_correccion", "rechazado"].includes(elegida.estadoExpediente || "") && (
                <div className={`space-y-1 rounded-xl border p-3 text-sm ${elegida.estadoExpediente === "rechazado" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
                  <p className="font-semibold">{elegida.estadoExpediente === "rechazado" ? "Motivo del rechazo" : "Motivo de la corrección solicitada"}</p>
                  <p>{elegida.motivoExpediente || "No se registró un motivo en los datos recibidos del servidor."}</p>
                  <p><strong>Acción:</strong> {elegida.estadoExpediente === "requiere_correccion" ? "El titular puede corregir los documentos y reenviar cuando la validación del servidor lo permita." : "El titular debe consultar las condiciones del periodo para saber si puede presentar una nueva solicitud."}</p>
                </div>
              )}
              <p><strong>Motivo de la solicitud:</strong> {elegida.motivoSolicitudVerificacion || "No registrado en el expediente anterior"}</p>
              {listadoArchivos(elegida, elegida.archivosExpediente || [], "Documentos actuales", elegida.estadoExpediente)}
              <p className="text-sm">
                Comprueba manualmente nombre, adscripción, representación,
                periodo y vigencia. Aprobar no concede autoaprobación ni acceso
                a eventos ajenos.
              </p>
              <div className="flex flex-wrap gap-2">
                {(elegida.id !== cuenta.id && elegida.estadoExpediente === "en_revision" && subdireccion
                  ? [
                      ["aprobado", "Aprobar"],
                      ["requiere_correccion", "Solicitar corrección"],
                      ["rechazado", "Rechazar"],
                    ]
                  : elegida.esVerificado && admin
                    ? [["revocado", "Revocar verificación"]]
                    : []
                ).map(([d, texto]) => (
                  <button
                    key={d}
                    className={boton}
                    onClick={() => setDecision(d as Decision)}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              {!apiActiva && subdireccion && <form className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4" onSubmit={async e=>{e.preventDefault();resultado((await auth.silenciarVerificacion(elegida.id,silencioHasta,motivoSilencio,seleccion!.version)));}}><h3 className="font-bold">Pausar nuevos envíos de verificación</h3><p className="text-sm">No bloquea la cuenta, las reservas ni el inicio de sesión. Deja la fecha vacía para levantar una pausa anterior.</p>{elegida.verificacionSilenciadaHasta&&<p className="text-sm">Pausa hasta {elegida.verificacionSilenciadaHasta}: {elegida.motivoSilencioVerificacion}</p>}<label className="block text-sm">Hasta<input type="date" value={silencioHasta} onChange={e=>setSilencioHasta(e.target.value)} className={campo}/></label><label className="block text-sm">Motivo<textarea required value={motivoSilencio} onChange={e=>setMotivoSilencio(e.target.value)} className={campo}/></label><button type="submit" className={boton}>Confirmar pausa o habilitación</button></form>}
              {decision && (
                <div className="space-y-3 rounded-xl border border-amber-200 p-4">
                  <h3 className="font-bold">Confirmar: {estadoLegible(decision)}</h3>
                  <label className="block text-sm">
                    Motivo o constancia de revisión
                    <textarea
                      required
                      className={campo}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                  </label>
                  {decision === "aprobado" && (
                    <label className="block text-sm">
                      Verificación vigente hasta
                      <input
                        type="date"
                        readOnly
                        className={campo}
                        value={periodoIdentidadActual(auth.periodosIdentidad)?.fin || vigencia}
                        onChange={(e) => setVigencia(e.target.value)}
                      />
                    </label>
                  )}
                  <p className="text-sm">
                    Se conservarán eventos y reservaciones existentes.
                  </p>
                  <button
                    className={primario}
                    onClick={async () =>
                      resultado(
                        (await auth.dictaminarExpediente(
                          elegida.id,
                          decision,
                          motivo,
                          seleccion!.version,
                          periodoIdentidadActual(auth.periodosIdentidad)?.fin || vigencia,
                          elegida.idSolicitudVerificacion,
                        )),
                      )
                    }
                  >
                    Confirmar decisión
                  </button>
                  <button className={boton} onClick={() => setDecision(null)}>
                    Cancelar
                  </button>
                </div>
              )}
              <h3 className="font-bold">Historial y versiones revisadas</h3>
              {elegida.historialExpediente?.map((h, i) => (
                <div key={i} className="border-t pt-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <InsigniaEstado valor={h.estado} />
                    <span className="text-neutral-600">{h.responsable} · {fechaLegible(h.fecha)}</span>
                  </div>
                  <p className="mt-1"><strong>Motivo:</strong> {h.motivo || "Sin motivo registrado"}</p>
                  {h.archivos && listadoArchivos(elegida, h.archivos, "Documentos anteriores", h.estado, h.fecha)}
                </div>
              ))}
            </article>
          ) : (
            <p className="rounded-3xl border bg-white p-6 text-sm text-neutral-600">
              Selecciona un expediente de {apartado === "pendientes" ? "Pendientes" : "Historial"} para consultar sus documentos y decisiones.
            </p>
          )}
        </div>
      )}
      {vista === "restricciones" && (
        <article className="space-y-4 rounded-3xl border bg-white p-5">
          <p>
            {admin
              ? "Resuelve peticiones o aplica y levanta restricciones con motivo y periodo."
              : "Solicita a Administración una restricción o su levantamiento. La petición no bloquea directamente a la cuenta."}{" "}
            Una restricción solo impide nuevas solicitudes; no cierra sesiones
            ni cancela eventos o reservaciones.
          </p>
          <label className="block text-sm">
            Cuenta
            <select
              className={campo}
              value={seleccion?.id || ""}
              onChange={(e) => {
                const u = usuarios.find((c) => c.id === e.target.value);
                if (u) elegir(u);
              }}
            >
              <option value="">Selecciona una cuenta</option>
              {usuarios
                .filter(
                  (u) =>
                    u.esVerificado ||
                    u.peticionesRestriccion?.length ||
                    u.restriccionSolicitudesHasta,
                )
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </label>
          {elegida && (
            <>
              <p>
                Estado:{" "}
                {restriccionIdentidadVigente(elegida)
                  ? "Restricción vigente"
                  : "Sin restricción vigente"}{" "}
                · {elegida.restriccionSolicitudesDesde} —{" "}
                {elegida.restriccionSolicitudesHasta}
              </p>
              <label className="block text-sm">
                Acción
                <select
                  className={campo}
                  value={accion}
                  onChange={(e) =>
                    setAccion(e.target.value as "aplicar" | "levantar")
                  }
                >
                  <option value="aplicar">Aplicar restricción</option>
                  <option value="levantar">Levantar anticipadamente</option>
                </select>
              </label>
              <label className="block text-sm">
                Motivo
                <textarea
                  className={campo}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </label>
              {subdireccion && (
                <label className="block text-sm">
                  Solicitudes relacionadas
                  <input
                    className={campo}
                    value={relacionadas}
                    onChange={(e) => setRelacionadas(e.target.value)}
                  />
                </label>
              )}
              {admin && accion === "aplicar" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Inicio
                    <input
                      className={campo}
                      type="datetime-local"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Término
                    <input
                      className={campo}
                      type="datetime-local"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                    />
                  </label>
                </div>
              )}
              <p className="text-sm">
                Al confirmar solo cambia la capacidad de crear nuevas
                solicitudes; la restricción deja de surtir efecto al vencer.
              </p>
              {subdireccion ? (
                <button
                  className={primario}
                  onClick={async () =>
                    resultado(
                      (await auth.solicitarRestriccion(
                        elegida.id,
                        accion,
                        motivo,
                        relacionadas,
                      )),
                    )
                  }
                >
                  Enviar petición a Administración
                </button>
              ) : (
                <button
                  className={primario}
                  onClick={async () =>
                    resultado(
                      (await auth.actualizarRestriccionSolicitudes(
                        elegida.id,
                        accion === "aplicar" ? hasta : "",
                        motivo,
                        desde,
                        undefined,
                        true,
                        seleccion!.version,
                      )),
                    )
                  }
                >
                  Confirmar{" "}
                  {accion === "aplicar" ? "restricción" : "levantamiento"}
                </button>
              )}
              {elegida.peticionesRestriccion?.map((p) => (
                <div key={p.id} className="space-y-2 border-t pt-3 text-sm">
                  <p>
                    {p.accion} · {p.estado} · {p.responsable} · {p.fecha}
                  </p>
                  <p>
                    {p.motivo} · Solicitudes: {p.solicitudes} · {p.resolucion}
                  </p>
                  {admin && p.estado === "pendiente" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={boton}
                        onClick={async () =>
                          resultado(
                            (await auth.actualizarRestriccionSolicitudes(
                              elegida.id,
                              p.accion === "aplicar" ? hasta : "",
                              motivo,
                              desde,
                              p.id,
                              true,
                              seleccion!.version,
                            )),
                          )
                        }
                      >
                        Aceptar petición
                      </button>
                      <button
                        className={boton}
                        onClick={async () =>
                          resultado(
                            (await auth.actualizarRestriccionSolicitudes(
                              elegida.id,
                              "",
                              motivo,
                              undefined,
                              p.id,
                              false,
                              seleccion!.version,
                            )),
                          )
                        }
                      >
                        Rechazar petición
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <h2 className="font-bold">Historial</h2>
              {elegida.historialIdentidad?.map((h, i) => (
                <p key={i} className="text-sm">
                  {h.accion} · {h.responsable} · {h.fecha} · {h.motivo}
                </p>
              ))}
            </>
          )}
        </article>
      )}
      {vista === "staff" && (
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="min-w-0 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
            <h2 className="font-bold">Elige un evento</h2>
            <label className="block text-sm font-semibold">Buscar evento
              <input type="search" className={campo} value={buscarEventoStaff} onChange={e => setBuscarEventoStaff(e.target.value)} />
            </label>
            <div className="max-h-[28rem] space-y-1.5 overflow-y-auto px-1 pb-1" aria-label="Eventos para asignar personal">
              {eventosStaff
                .map(({ evento: opcion, actividadPrincipal }) => (
                  <button key={opcion.id} type="button" aria-pressed={opcion.id === eventoId}
                    onClick={() => { setEventoId(opcion.id); setFiltro(""); }}
                    className="block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-[#7a132b] aria-pressed:border-[#7a132b] aria-pressed:bg-[#7a132b]/5">
                    <strong className="block">{opcion.titulo}</strong>
                    <span className="mt-1 block text-xs text-neutral-600">
                      {actividadPrincipal ? `${fechaLegible(actividadPrincipal.fecha)} · ` : ""}{nombreEstadoOrganizador(opcion.estado)}
                    </span>
                  </button>
                ))}
              {!eventosStaff.length &&
                <p className="py-2 text-sm text-neutral-600">No hay eventos para esta búsqueda.</p>}
            </div>
          </section>
          <section className="min-w-0 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
            <h2 className="font-bold">Personal de acceso</h2>
            {!evento && <p className="text-sm text-neutral-600">Elige un evento para consultar o cambiar las asignaciones.</p>}
            {evento && <>
              <p className="text-sm font-semibold">{evento.titulo}</p>
              <p className="text-sm text-neutral-600">{apiActiva
                ? "Para asignar el permiso, la cuenta debe tener el correo confirmado y haber aceptado la invitación del evento."
                : "Puedes asignar cuentas activas con correo confirmado."}</p>
              {evento.fechas.every(f => modalidadActividad(f, evento.modalidadAsistencia) === 'libre') &&
                <p className="text-sm text-neutral-600">Este evento no tiene actividades que requieran validar un boleto.</p>}
              <label className="block text-sm font-semibold">Buscar cuenta
                <input type="search" className={campo} value={filtro} onChange={e => setFiltro(e.target.value)} />
              </label>
            </>}
          {errorStaff && <p role="alert">{errorStaff}</p>}
          {evento && apiActiva && !errorStaff && staffRemoto?.evento !== evento.id && <p role="status">Consultando personal de acceso…</p>}
          {evento && apiActiva && staffRemoto?.evento === evento.id && cuentasStaff.length === 0 &&
            <p>No hay invitaciones aceptadas ni permisos asignados para este evento.</p>}
          {evento &&
            cuentasStaff
              .filter(
                (u) =>
                  (u.eventosAsignadosStaff?.includes(evento.id) || (u.estaActivo && u.correoConfirmado)) &&
                  (u.nombre + u.correo)
                    .toLowerCase()
                    .includes(filtro.toLowerCase()),
              )
              .map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div>
                    <strong>{u.nombre}</strong>
                    <p className="text-sm">{u.correo}</p>
                  </div>
                  <button
                    className={boton}
                    disabled={ocupadoStaff || Boolean(errorStaff)}
                    onClick={async () => {
                      setOcupadoStaff(true);
                      try {
                        const res = await auth.asociarStaffAEvento(u.id, evento.id, !u.eventosAsignadosStaff?.includes(evento.id));
                        resultado(res);
                        if (apiActiva) {
                          setStaffRemoto(undefined);
                          setRevisionStaff(n => n + 1);
                        }
                      } finally {
                        setOcupadoStaff(false);
                      }
                    }}
                  >
                    {u.eventosAsignadosStaff?.includes(evento.id)
                      ? "Retirar permiso"
                      : "Asignar permiso"}
                  </button>
                </div>
              ))}
          </section>
        </div>
      )}
      {documento && (
        <VisorDocumentoIdentidad
          archivo={documento.archivo}
          titular={documento.titular.nombre}
          puedeDescargar={cuenta.id === documento.titular.id || admin || subdireccion}
          alCerrar={() => setDocumento(null)}
        />
      )}
    </section>
  );
}
