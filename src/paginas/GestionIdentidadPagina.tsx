import { textoParaUsuario } from '../utilidades/textoParaUsuario.js';
import { impedimentoVerificacion, intentosPeriodo, periodoIdentidadActual, rechazosPeriodo } from "../dominio/periodosIdentidad";
import { volverA } from '../dominio/navegacion';
import { apiActiva } from '../servicios/modoDatos';
import React, { useEffect, useState } from "react";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useDatos } from "../contextos/DatosContexto";
import type { DocumentoIdentidad, Usuario } from "../tipos";
import {
  validarExpedienteIdentidad,
  restriccionIdentidadVigente,
} from "../dominio/identidad";
import { guardarDocumentoIdentidad } from "../utilidades/documentosIdentidad";
import { BotonVerDocumento, VisorDocumentoIdentidad, etiquetaTipoDocumento } from "../componentes/identidad/VisorDocumentoIdentidad";

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
  const agregar = async (files: File[]) => {
    if (!files.length) return;
    if (files.length + archivos.length > limiteDocumentos)
      return setMensaje(`Tu perfil requiere ${limiteDocumentos} documento(s) PDF. Retira el anterior para reemplazarlo.`);
    setOcupado(true);
    setMensaje('Cargando PDF…');
    setRevision(null);
    try {
      const nuevos: DocumentoIdentidad[] = [];
      for (const file of files) {
        const id = await guardarDocumentoIdentidad(crypto.randomUUID(), file);
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
      setArchivos((prev) => [...prev, ...nuevos]);
      setMensaje(apiActiva ? 'PDF guardados en el servidor. Completa sus datos y envía el expediente a Subdirección.' : 'PDF guardados en este navegador; completa sus datos y revisa antes de enviar.');
    } catch (e) {
      setMensaje((e as Error).message);
    } finally {
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
    return Number.isNaN(fecha.getTime())
      ? valor
      : fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
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
  const titulo =
    vista === "expediente"
      ? "Mi expediente"
      : vista === "revision"
        ? admin ? "Verificaciones y revocaciones" : "Solicitudes de verificación"
        : vista === "staff"
          ? "Personal de acceso de mis eventos"
          : "Restricciones para solicitar eventos";
  return (
    <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <button
        type="button"
        className={boton + " inline-flex min-h-10 items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#7a132b]"}
        onClick={() => navigate(volverA(regreso))}
      >
        <ArrowLeft size={16} /><span>Regresar</span></button>
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
          <p>
            Estado:{" "}
            <strong className="capitalize">
              {estado(cuenta.estadoExpediente)}
            </strong>{" "}
            · Versión {cuenta.versionIdentidad || 0}
            {cuenta.verificacionHasta &&
              " · Válido hasta " + cuenta.verificacionHasta}
          </p>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm"><strong>{cuenta.nombre}</strong><p>{cuenta.correo} · {cuenta.afiliacion}</p><p>{cuenta.boleta ? 'Boleta: '+cuenta.boleta : cuenta.afiliacion==='externo' ? [cuenta.nombreOrganizacion,cuenta.puestoContacto].filter(Boolean).join(' · ') : 'Número de empleado: '+(cuenta.numeroEmpleado||'Pendiente')}</p><button className="mt-2 font-semibold text-[#7a132b] underline" onClick={()=>navigate('/perfil')}>Revisar datos de mi perfil</button>{periodoIdentidadActual(auth.periodosIdentidad)&&<p className="mt-2">Periodo {periodoIdentidadActual(auth.periodosIdentidad)!.id} · Envíos: {intentosPeriodo(cuenta,periodoIdentidadActual(auth.periodosIdentidad)!)} de 3 · Rechazos: {rechazosPeriodo(cuenta,periodoIdentidadActual(auth.periodosIdentidad)!)}</p>}</div>
          {cuenta.afiliacion==='profesor' && <form className="rounded-xl bg-neutral-50 p-4" onSubmit={async e=>{e.preventDefault();const datos=new FormData(e.currentTarget);resultado((await auth.actualizarPerfil(cuenta.id,{numeroEmpleado:String(datos.get('numeroEmpleado')||'').trim()},cuenta.versionIdentidad||0)));}}><label className="block text-sm font-semibold">Número de empleado<input name="numeroEmpleado" required defaultValue={cuenta.numeroEmpleado||''} className={campo}/></label><button type="submit" className={boton+" mt-3"}>Guardar número de empleado</button></form>}
          {cuenta.afiliacion==='externo' && <form className="rounded-xl bg-neutral-50 p-4" onSubmit={async e=>{e.preventDefault();const datos=new FormData(e.currentTarget);resultado((await auth.actualizarPerfil(cuenta.id,{nombreOrganizacion:String(datos.get('nombreOrganizacion')||'').trim(),puestoContacto:String(datos.get('puestoContacto')||'').trim()},cuenta.versionIdentidad||0)));}}><label className="block text-sm font-semibold">Entidad<input name="nombreOrganizacion" required defaultValue={cuenta.nombreOrganizacion||''} className={campo}/></label><label className="mt-3 block text-sm font-semibold">Cargo o relación de representación<input name="puestoContacto" required defaultValue={cuenta.puestoContacto||''} className={campo}/></label><button type="submit" className={boton+" mt-3"}>Guardar datos de la entidad</button></form>}
          {cuenta.estadoExpediente === "requiere_correccion" && (
            <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
              Subdirección solicitó una corrección. Retira el documento rechazado, adjunta el nuevo PDF y reenvía el expediente.
            </p>
          )}
          {cuenta.motivoExpediente && (
            <p>Observaciones: {cuenta.motivoExpediente}</p>
          )}
          <p className="text-sm">
            Aviso de datos: solo el titular, Subdirección y Administración pueden consultar
            estos documentos para revisar la habilitación para solicitar
            eventos. Usa únicamente documentos ficticios en este prototipo. No
            se consultan padrones oficiales.
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
              <p>
                Subdirección está revisando esta versión. No se puede reenviar
                mientras esté en revisión.
              </p>
              {listadoArchivos(cuenta)}
            </>
          ) : (
            <>
              <p className="text-sm">
                Estudiante: constancia o comprobante de horario del periodo actual. Personal: comprobante
                de adscripción y número de empleado declarado.
                Representante externo: entidad, cargo, documento de existencia y
                representación vigente. Las evidencias de adscripción y
                representación deben tener hasta seis meses, salvo otra vigencia
                expresa.
              </p>
              <label className="block text-sm font-bold">¿Por qué solicitas la verificación?<textarea required className={campo} value={motivoSolicitud} onChange={e=>{setMotivoSolicitud(e.target.value);setRevision(null);}}/></label>
              {impedimentoVerificacion(cuenta,auth.periodosIdentidad)&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-sm">{impedimentoVerificacion(cuenta,auth.periodosIdentidad)}</p>}
              <label className="block text-sm font-bold">
                Adjuntar documentos PDF ({limiteDocumentos} por expediente; 10 MiB por archivo)
                <input
                  disabled={ocupado}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  className={campo}
                  onChange={async (e) => {
                    const entrada = e.currentTarget;
                    await agregar(Array.from(entrada.files || []));
                    entrada.value = "";
                  }}
                />
              </label>
              {archivos.map((a) => (
                <div key={a.id} className="space-y-3 rounded-2xl border p-4">
                  <p className="break-all font-semibold">{a.nombre}</p>
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
                      onClick={() => {
                        setArchivos(archivos.filter((f) => f.id !== a.id));
                        setRevision(null);
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
              {revision !== null && (
                <div className="space-y-3 border-t pt-4">
                  <h2 className="font-bold">
                    Revisar expediente antes del envío
                  </h2>
                  {listadoArchivos(cuenta, archivos)}
                  <p>
                    Subdirección revisará la versión {revision}. Enviar no
                    concede aprobación ni roles.
                  </p>
                  <button className={boton} onClick={() => setRevision(null)}>
                    Regresar a editar
                  </button>
                  <button
                    disabled={ocupado}
                    className={primario}
                    onClick={async () =>
                      resultado(
                        (await auth.enviarExpediente(cuenta.id, archivos, revision,motivoSolicitud)),
                      )
                    }
                  >
                    Enviar a revisión
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  className={boton}
                  disabled={ocupado}
                  onClick={() => {
                    const fallo = impedimentoVerificacion(cuenta,auth.periodosIdentidad) || (!motivoSolicitud.trim()?"Explica por qué solicitas la verificación.":undefined) || validarExpedienteIdentidad(cuenta, archivos);
                    if (fallo) setMensaje(fallo);
                    else {
                      setRevision(cuenta.versionIdentidad || 0);
                      setMensaje(
                        "Comprueba documentos y datos antes de confirmar.",
                      );
                    }
                  }}
                >
                  Revisar expediente
                </button>
                <button
                  className={boton}
                  onClick={() => {
                    setArchivos(cuenta.archivosExpediente || []);
                    setRevision(null);
                  }}
                >
                  Cancelar envío
                </button>
              </div>
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
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700">{estadoLegible(u.estadoExpediente || (u.esVerificado ? "aprobado" : undefined))}</span>
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
              <p className="break-all text-sm">
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
              <p>
                Versión {seleccion?.version} ·{" "}
                {estadoLegible(elegida.estadoExpediente || (elegida.esVerificado ? "aprobado" : undefined))}
              </p>
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
                      ["aprobado", "Aprobar expediente"],
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
                  <p>
                    {estadoLegible(h.estado)} · {h.responsable} · {h.fecha} ·{" "}
                    {h.motivo}
                  </p>
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
        <article className="space-y-4 rounded-3xl border bg-white p-5">
          {apiActiva && (
            <p
              role="note"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <strong>Dependencia pendiente:</strong> el alta y retiro de Staff
              desde la interfaz aún no está conectado a PostgreSQL. Las
              asignaciones vigentes en <code>StaffEvento</code> se respetan en
              el servidor sin simular cambios locales.
            </p>
          )}
          <p>
            Asigna cuentas activas con correo confirmado a tus eventos. Retirar
            una asignación impide nuevas operaciones sobre ese evento y conserva
            su historial. Ser portador de un boleto Staff no concede este
            permiso.
          </p>
          <label className="block text-sm">
            Evento
            <select
              className={campo}
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
            >
              <option value="">Selecciona un evento</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titulo}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Buscar cuenta
            <input
              className={campo}
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </label>
          {evento &&
            usuarios
              .filter(
                (u) =>
                  u.estaActivo &&
                  u.correoConfirmado &&
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
                    onClick={async () =>
                      resultado(
                        (await auth.asociarStaffAEvento(
                          u.id,
                          evento.id,
                          !u.eventosAsignadosStaff?.includes(evento.id),
                        )),
                      )
                    }
                  >
                    {u.eventosAsignadosStaff?.includes(evento.id)
                      ? "Retirar Staff"
                      : "Asignar Staff"}
                  </button>
                </div>
              ))}
        </article>
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
