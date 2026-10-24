import React, { useEffect, useState } from "react";
import { interfazSolicitada } from "../dominio/pantallasDocumentacion";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useDatos } from "../contextos/DatosContexto";
import type { DocumentoIdentidad, Usuario } from "../tipos";
import {
  validarExpedienteIdentidad,
  restriccionIdentidadVigente,
} from "../dominio/identidad";
import {
  guardarDocumentoIdentidad,
  leerDocumentoIdentidad,
} from "../utilidades/documentosIdentidad";

type Vista = "expediente" | "revision" | "restricciones" | "staff";
type Decision = "aprobado" | "rechazado" | "requiere_correccion" | "revocado";
const boton =
  "rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-40";
const primario =
  "rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40";
const campo =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-sm";
const estado = (s?: string) => (s || "sin_enviar").replaceAll("_", " ");

export function GestionIdentidadPagina({
  vista,
  navigate,
}: {
  vista: Vista;
  navigate: (ruta: string) => void;
}) {
  const auth = useAutenticacion();
  const { usuarioActual: cuenta, todosLosUsuarios: usuarios, rolActivo } = auth;
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
  const [vigencia, setVigencia] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [relacionadas, setRelacionadas] = useState("");
  const [accion, setAccion] = useState<"aplicar" | "levantar">("aplicar");
  const [eventoId, setEventoId] = useState("");
  const [filtro, setFiltro] = useState("");
  const [documento, setDocumento] = useState<{
    url: string;
    nombre: string;
  } | null>(null);
  const admin = !!cuenta?.roles.includes("admin") && rolActivo === "admin";
  const subdireccion =
    !!cuenta?.roles.includes("subdireccion") && rolActivo === "subdireccion";
  const organizador =
    !!cuenta?.roles.includes("organizador") && rolActivo === "organizador";
  const elegida = usuarios.find((u) => u.id === seleccion?.id);
  const eventos = listaEventos.filter(
    (e) => admin || e.idOrganizador === cuenta?.id,
  );
  const evento = eventos.find((e) => e.id === eventoId);
  useEffect(() => {
    setArchivos(cuenta?.archivosExpediente || []);
    setRevision(null);
    const ejemplo = vista === "revision" && admin && interfazSolicitada() === "UI-IP-10"
      ? usuarios.find(u => (u.estadoExpediente && u.estadoExpediente !== "sin_enviar") || u.esVerificado) : undefined;
    setSeleccion(ejemplo ? {id:ejemplo.id,version:ejemplo.versionIdentidad || 0} : null);
    setMensaje("");
    setDocumento(null);
  }, [cuenta?.id, vista]);
  useEffect(
    () => () => {
      if (documento) URL.revokeObjectURL(documento.url);
    },
    [documento],
  );
  useEffect(() => {
    if (!cuenta || (!admin && vista === "revision")) setDocumento(null);
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
    if (!cuenta || (cuenta.id !== titular.id && !admin))
      return setMensaje("No tienes permiso para consultar este documento.");
    try {
      setDocumento({
        url: URL.createObjectURL(await leerDocumentoIdentidad(archivo.id)),
        nombre: archivo.nombre,
      });
    } catch (e) {
      setMensaje((e as Error).message);
    }
  };
  const elegir = (u: Usuario) => {
    setSeleccion({ id: u.id, version: u.versionIdentidad || 0 });
    setDecision(null);
    setMotivo("");
    setMensaje("");
    setDocumento(null);
  };
  const agregar = async (files: File[]) => {
    if (files.length + archivos.length > 5)
      return setMensaje("Máximo cinco PDF por expediente.");
    setOcupado(true);
    setRevision(null);
    try {
      const nuevos: DocumentoIdentidad[] = [];
      for (const file of files) {
        const id = crypto.randomUUID();
        await guardarDocumentoIdentidad(id, file);
        nuevos.push({
          id,
          nombre: file.name,
          tamano: file.size,
          tipo:
            cuenta?.afiliacion === "alumno"
              ? "constancia"
              : cuenta?.afiliacion === "externo"
                ? "existencia"
                : "adscripcion",
          fechaEmision: "",
        });
      }
      setArchivos((prev) => [...prev, ...nuevos]);
      setMensaje(
        "PDF guardados en este navegador; completa sus datos y revisa antes de enviar.",
      );
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
  const listadoArchivos = (u: Usuario, lista = u.archivosExpediente || []) =>
    lista.length ? (
      <ul className="space-y-2">
        {lista.map((a) => (
          <li key={a.id} className="rounded-xl bg-neutral-50 p-3 text-sm">
            <button
              className="break-all font-bold text-[#7a132b] underline"
              onClick={() => abrirDocumento(a, u)}
            >
              {a.nombre}
            </button>
            <p>
              {a.tipo} · Emisión: {a.fechaEmision} · Vigencia:{" "}
              {a.vigenteHasta || "Revisión manual"}{" "}
              {a.periodo && " · Periodo: " + a.periodo}
            </p>
          </li>
        ))}
      </ul>
    ) : (
      <p>No hay PDF disponibles en esta versión local.</p>
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
    (vista === "revision" && !admin) ||
    (vista === "restricciones" && !admin && !subdireccion) ||
    (vista === "staff" && !admin && !organizador)
  )
    return (
      <section className="p-8">
        <h1 className="text-2xl font-bold">
          No tienes permiso para esta operación
        </h1>
        <p>Cambia al perfil autorizado desde el menú de cuenta.</p>
        <button className={boton} onClick={() => navigate("/perfil")}>
          Volver al perfil
        </button>
      </section>
    );
  const titulo =
    vista === "expediente"
      ? "Mi expediente"
      : vista === "revision"
        ? "Revisión de expedientes"
        : vista === "staff"
          ? "Personal de acceso de mis eventos"
          : "Restricciones para solicitar eventos";
  return (
    <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <button
        className="flex items-center gap-2 text-sm"
        onClick={() => navigate("/perfil")}
      >
        <ArrowLeft size={16} /> Volver a mi perfil
      </button>
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
          {mensaje}
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
          {cuenta.motivoExpediente && (
            <p>Observaciones: {cuenta.motivoExpediente}</p>
          )}
          <p className="text-sm">
            Aviso de datos: solo el titular y Administración pueden consultar
            estos documentos para revisar la habilitación para solicitar
            eventos. Usa únicamente documentos ficticios en este prototipo. No
            se consultan padrones oficiales. Responsable de la demostración:
            soporte_ti@escom.ipn.mx.
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
                Administración está revisando esta versión. No se puede reenviar
                mientras esté en revisión.
              </p>
              {listadoArchivos(cuenta)}
            </>
          ) : (
            <>
              <p className="text-sm">
                Estudiante: constancia del periodo actual. Personal: comprobante
                de adscripción y RFC o número de empleado declarado.
                Representante externo: entidad, cargo, documento de existencia y
                representación vigente. Las evidencias de adscripción y
                representación deben tener hasta seis meses, salvo otra vigencia
                expresa.
              </p>
              <label className="block text-sm font-bold">
                Adjuntar documentos PDF (hasta cinco; 10 MiB por archivo)
                <input
                  disabled={ocupado}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  className={campo}
                  onChange={(e) => {
                    void agregar(Array.from(e.target.files || []));
                    e.target.value = "";
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
                        <option value="constancia">
                          Constancia de estudios
                        </option>
                        <option value="adscripcion">
                          Comprobante de adscripción
                        </option>
                        <option value="existencia">
                          Existencia de la entidad
                        </option>
                        <option value="representacion">Representación</option>
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
                    {a.tipo === "constancia" && (
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
                    <button
                      className={boton}
                      onClick={() => abrirDocumento(a, cuenta)}
                    >
                      Ver PDF
                    </button>
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
                    Administración revisará la versión {revision}. Enviar no
                    concede aprobación ni roles.
                  </p>
                  <button className={boton} onClick={() => setRevision(null)}>
                    Regresar a editar
                  </button>
                  <button
                    disabled={ocupado}
                    className={primario}
                    onClick={() =>
                      resultado(
                        auth.enviarExpediente(cuenta.id, archivos, revision),
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
                    const fallo = validarExpedienteIdentidad(cuenta, archivos);
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
            Archivos conservados en este navegador. El almacenamiento privado
            compartido y la entrega real de correo requieren servidor.
          </p>
          <h2 className="font-bold">Historial del expediente</h2>
          {cuenta.historialExpediente?.map((h, i) => (
            <div key={i} className="rounded-xl border p-3 text-sm">
              <p>
                {estado(h.estado)} · {h.responsable} ·{" "}
                {new Date(h.fecha).toLocaleString("es-MX")} · {h.motivo}
              </p>
              {h.archivos && listadoArchivos(cuenta, h.archivos)}
            </div>
          ))}
        </article>
      )}
      {vista === "revision" && (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <label className="block text-sm">
              Buscar expediente
              <input
                className={campo}
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </label>
            {usuarios
              .filter(
                (u) =>
                  (u.estadoExpediente && u.estadoExpediente !== "sin_enviar") ||
                  u.esVerificado,
              )
              .filter((u) =>
                (u.nombre + u.correo)
                  .toLowerCase()
                  .includes(filtro.toLowerCase()),
              )
              .map((u) => (
                <button
                  key={u.id}
                  className="block w-full rounded-2xl border bg-white p-4 text-left"
                  onClick={() => elegir(u)}
                >
                  <strong>{u.nombre}</strong>
                  <p className="text-sm">
                    {estado(u.estadoExpediente)} · Ver detalle
                  </p>
                </button>
              ))}
          </div>
          {elegida ? (
            <article className="space-y-4 rounded-3xl border bg-white p-5">
              <h2 className="text-xl font-bold">{elegida.nombre}</h2>
              <p className="break-all text-sm">
                {elegida.correo} · {elegida.afiliacion}
              </p>
              <p>
                {elegida.boleta || elegida.rfc || elegida.numeroEmpleado}{" "}
                {elegida.nombreOrganizacion} {elegida.puestoContacto}
              </p>
              <p>
                Versión {seleccion?.version} ·{" "}
                {estado(elegida.estadoExpediente)}
              </p>
              {listadoArchivos(elegida)}
              <p className="text-sm">
                Comprueba manualmente nombre, adscripción, representación,
                periodo y vigencia. Aprobar no concede autoaprobación ni acceso
                a eventos ajenos.
              </p>
              <div className="flex flex-wrap gap-2">
                {(elegida.estadoExpediente === "en_revision"
                  ? [
                      ["aprobado", "Aprobar expediente"],
                      ["requiere_correccion", "Solicitar corrección"],
                      ["rechazado", "Rechazar"],
                    ]
                  : elegida.esVerificado
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
              {decision && (
                <div className="space-y-3 rounded-xl border border-amber-200 p-4">
                  <h3 className="font-bold">Confirmar: {estado(decision)}</h3>
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
                        className={campo}
                        value={vigencia}
                        onChange={(e) => setVigencia(e.target.value)}
                      />
                    </label>
                  )}
                  <p className="text-sm">
                    Se conservarán eventos y reservaciones existentes.
                  </p>
                  <button
                    className={primario}
                    onClick={() =>
                      resultado(
                        auth.dictaminarExpediente(
                          elegida.id,
                          decision,
                          motivo,
                          seleccion!.version,
                          vigencia,
                        ),
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
                    {estado(h.estado)} · {h.responsable} · {h.fecha} ·{" "}
                    {h.motivo}
                  </p>
                  {h.archivos && listadoArchivos(elegida, h.archivos)}
                </div>
              ))}
            </article>
          ) : (
            <p className="rounded-3xl border bg-white p-6">
              Selecciona un expediente para consultar sus documentos y
              decisiones.
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
                  onClick={() =>
                    resultado(
                      auth.solicitarRestriccion(
                        elegida.id,
                        accion,
                        motivo,
                        relacionadas,
                      ),
                    )
                  }
                >
                  Enviar petición a Administración
                </button>
              ) : (
                <button
                  className={primario}
                  onClick={() =>
                    resultado(
                      auth.actualizarRestriccionSolicitudes(
                        elegida.id,
                        accion === "aplicar" ? hasta : "",
                        motivo,
                        desde,
                        undefined,
                        true,
                        seleccion!.version,
                      ),
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
                        onClick={() =>
                          resultado(
                            auth.actualizarRestriccionSolicitudes(
                              elegida.id,
                              p.accion === "aplicar" ? hasta : "",
                              motivo,
                              desde,
                              p.id,
                              true,
                              seleccion!.version,
                            ),
                          )
                        }
                      >
                        Aceptar petición
                      </button>
                      <button
                        className={boton}
                        onClick={() =>
                          resultado(
                            auth.actualizarRestriccionSolicitudes(
                              elegida.id,
                              "",
                              motivo,
                              undefined,
                              p.id,
                              false,
                              seleccion!.version,
                            ),
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
                    onClick={() =>
                      resultado(
                        auth.asociarStaffAEvento(
                          u.id,
                          evento.id,
                          !u.eventosAsignadosStaff?.includes(evento.id),
                        ),
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
        <section className="space-y-3 rounded-2xl border bg-white p-4">
          <div className="flex justify-between gap-3">
            <h2 className="break-all font-bold">{documento.nombre}</h2>
            <button className={boton} onClick={() => setDocumento(null)}>
              Cerrar PDF
            </button>
          </div>
          <iframe
            title={documento.nombre}
            src={documento.url}
            className="h-[65vh] w-full rounded-xl border"
          />
          <a
            className="text-sm underline"
            href={documento.url}
            download={documento.nombre}
          >
            Descargar documento de prueba
          </a>
        </section>
      )}
    </section>
  );
}
