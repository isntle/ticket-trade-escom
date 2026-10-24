import React, { useState } from "react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useDatos } from "../contextos/DatosContexto";
import { MATRIZ_PERMISOS_ROLES } from "../utilidades/validaciones";

const campo = "mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm";
const boton =
  "rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold";
export function PerfilUsuarioPagina({
  navigate,
}: {
  navigate: (ruta: string) => void;
}) {
  const auth = useAutenticacion();
  const { usuarioActual: u, rolActivo } = auth;
  const { listaEventos } = useDatos();
  const [edicion, setEdicion] = useState(false);
  const [nombre, setNombre] = useState("");
  const [entidad, setEntidad] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [version, setVersion] = useState(0);
  const [revisar, setRevisar] = useState(false);
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [confirmarCorreo, setConfirmarCorreo] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [mensaje, setMensaje] = useState("");
  if (!u)
    return (
      <section className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-bold">No hay una sesión activa</h1>
        <button className={boton} onClick={() => navigate("/login")}>
          Iniciar sesión
        </button>
      </section>
    );
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Mi perfil</h1>
        <button
          className={boton}
          onClick={() => {
            auth.cerrarSesion();
            navigate("/login");
          }}
        >
          Cerrar sesión
        </button>
      </header>
      {mensaje && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          {mensaje}
        </p>
      )}
      <article className="space-y-4 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">{u.nombre}</h2>
        <p className="break-all">
          {u.correo}{" "}
          {u.correoConfirmado ? "· Confirmado" : "· Pendiente de confirmación"}
        </p>
        <p className="text-sm">
          Categoría declarada: {u.afiliacion}.{" "}
          {u.boleta && "Boleta: " + u.boleta}{" "}
          {u.numeroEmpleado && "Identificador declarado: " + u.numeroEmpleado}
        </p>
        <p className="text-sm">
          Verificación documental:{" "}
          {u.esVerificado
            ? "Aprobada"
            : (u.estadoExpediente || "Sin solicitar").replaceAll("_", " ")}{" "}
          {u.verificacionHasta && " · Vigente hasta " + u.verificacionHasta}
        </p>
        <p className="text-sm text-neutral-600">
          Aviso de datos: tus datos y documentos se usan para gestionar la
          cuenta y sus permisos; no se publican en la cartelera. Usa datos
          ficticios durante la demostración. Contacto: soporte_ti@escom.ipn.mx.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className={boton} onClick={() => navigate("/mi-expediente")}>
            {u.esVerificado
              ? "Consultar o renovar expediente"
              : "Mi expediente"}
          </button>
          {!u.correoConfirmado && (
            <button
              className={boton}
              onClick={() => navigate("/confirmar-correo")}
            >
              Confirmar correo
            </button>
          )}
          <button
            className={boton}
            onClick={() => {
              setNombre(u.nombre);
              setEntidad(u.nombreOrganizacion || "");
              setCargo(u.puestoContacto || "");
              setTelefono(u.telefonoContacto || "");
              setVersion(u.versionIdentidad || 0);
              setEdicion(true);
              setRevisar(false);
            }}
          >
            Editar nombre y contacto
          </button>
        </div>
        {edicion && (
          <form
            className="space-y-4 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!revisar) {
                if (!nombre.trim())
                  return setMensaje("El nombre es obligatorio.");
                setRevisar(true);
                return;
              }
              const r = auth.actualizarPerfil(
                u.id,
                {
                  nombre: nombre.trim(),
                  telefonoContacto: telefono.trim(),
                  ...(u.afiliacion === "externo"
                    ? {
                        nombreOrganizacion: entidad.trim(),
                        puestoContacto: cargo.trim(),
                      }
                    : {}),
                },
                version,
              );
              setMensaje(r.mensaje);
              if (r.exito) {
                setEdicion(false);
                setRevisar(false);
              }
            }}
          >
            <label className="block text-sm">
              Nombre completo
              <input
                required
                readOnly={revisar}
                className={campo}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
            {u.afiliacion === "externo" && (
              <>
                <label className="block text-sm">
                  Entidad (si deseas solicitar eventos)
                  <input
                    readOnly={revisar}
                    className={campo}
                    value={entidad}
                    onChange={(e) => setEntidad(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Cargo o relación de representación
                  <input
                    readOnly={revisar}
                    className={campo}
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                  />
                </label>
              </>
            )}
            <label className="block text-sm">
              Teléfono de contacto (opcional)
              <input
                readOnly={revisar}
                type="tel"
                className={campo}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </label>
            {revisar && (
              <p className="rounded-xl bg-amber-50 p-4 text-sm">
                {u.esVerificado
                  ? "Cambiar nombre, entidad o relación exige renovar la verificación. Se conservarán tus eventos y reservaciones."
                  : "Confirma los datos antes de guardarlos."}{" "}
                La categoría y los identificadores institucionales no se
                modifican en este formulario.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button className={boton}>
                {revisar ? "Confirmar modificación" : "Revisar cambios"}
              </button>
              {revisar && (
                <button
                  type="button"
                  className={boton}
                  onClick={() => setRevisar(false)}
                >
                  Regresar a editar
                </button>
              )}
              <button
                type="button"
                className={boton}
                onClick={() => {
                  setEdicion(false);
                  setRevisar(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </article>
      <article className="space-y-4 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Cambiar correo electrónico</h2>
        {u.correoPendiente && (
          <p className="break-all text-sm">
            Nuevo correo pendiente: {u.correoPendiente}. El correo actual
            continúa vigente.
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirmarCorreo) {
              setConfirmarCorreo(true);
              return;
            }
            const r = auth.solicitarCambioCorreo(u.id, correo);
            setMensaje(r.mensaje);
            setCodigo(r.codigoPrueba || "");
            if (r.exito) {
              setConfirmarCorreo(false);
              setCorreo("");
            }
          }}
        >
          <label className="block text-sm">
            Nuevo correo
            <input
              required
              type="email"
              className={campo}
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                setConfirmarCorreo(false);
              }}
            />
          </label>
          {confirmarCorreo && (
            <p className="rounded-xl bg-amber-50 p-4 text-sm">
              El correo actual no cambia hasta confirmar el nuevo. Si estabas
              verificado, necesitarás una nueva revisión después de confirmarlo.
              ¿Deseas solicitar el cambio?
            </p>
          )}
          <button className={boton}>
            {confirmarCorreo
              ? "Confirmar solicitud de cambio"
              : "Revisar cambio de correo"}
          </button>
          {confirmarCorreo && (
            <button
              type="button"
              className={boton}
              onClick={() => setConfirmarCorreo(false)}
            >
              Cancelar
            </button>
          )}
        </form>
        {codigo && (
          <p className="break-all text-sm">
            Código de demostración:{" "}
            <output className="select-all font-mono">{codigo}</output>
          </p>
        )}
        {(codigo || u.correoPendiente) && (
          <button
            className={boton}
            onClick={() => navigate("/confirmar-correo")}
          >
            Confirmar el nuevo correo
          </button>
        )}
      </article>
      <article className="rounded-3xl border bg-white p-6">
        <h2 data-interfaz="UI-IP-06" tabIndex={-1} className="mb-4 scroll-mt-24 text-xl font-bold">Seguridad</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const r = auth.cambiarPassword(actual, nueva, repetida);
            setMensaje(r.mensaje);
            if (r.exito) {
              setActual("");
              setNueva("");
              setRepetida("");
              navigate("/login");
            }
          }}
        >
          <label className="block text-sm">
            Contraseña actual
            <input
              required
              autoComplete="current-password"
              type="password"
              className={campo}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Nueva contraseña
            <input
              required
              autoComplete="new-password"
              type="password"
              className={campo}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Confirmar nueva contraseña
            <input
              required
              autoComplete="new-password"
              type="password"
              className={campo}
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
            />
          </label>
          <p className="text-sm">
            Al guardar se invalidarán las sesiones anteriores y deberás iniciar
            sesión nuevamente.
          </p>
          <button className={boton}>Guardar contraseña</button>
        </form>
      </article>
      <article className="space-y-3 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Roles y accesos</h2>
        <p className="text-sm">
          Perfil activo: {rolActivo}. Roles asignados: {u.roles.join(", ")}.
        </p>
        {MATRIZ_PERMISOS_ROLES.filter((r) => u.roles.includes(r.rol)).map(
          (r) => (
            <details key={r.rol}>
              <summary>{r.nombre}</summary>
              <p className="text-sm">{r.descripcion}</p>
              <ul className="list-disc pl-5 text-sm">
                {r.permisos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          ),
        )}
        <div className="flex flex-wrap gap-3">
          {rolActivo === "admin" && (
            <>
              <button
                className={boton}
                onClick={() => navigate("/admin/expedientes")}
              >
                Revisar expedientes
              </button>
              <button
                className={boton}
                onClick={() => navigate("/admin/restricciones")}
              >
                Resolver restricciones
              </button>
              <button className={boton} onClick={() => navigate("/admin")}>
                Administrar roles
              </button>
            </>
          )}
          {rolActivo === "subdireccion" && (
            <button
              className={boton}
              onClick={() => navigate("/subdireccion/restricciones")}
            >
              Solicitar restricción o levantamiento
            </button>
          )}
          {["organizador", "admin"].includes(rolActivo) && (
            <button
              className={boton}
              onClick={() => navigate("/organizador/staff")}
            >
              Asignar personal de acceso
            </button>
          )}
        </div>
        {u.eventosAsignadosStaff?.length ? (
          <>
            <h3 className="font-semibold">Eventos asignados como Staff</h3>
            {listaEventos
              .filter((e) => u.eventosAsignadosStaff?.includes(e.id))
              .map((e) => (
                <p className="text-sm" key={e.id}>
                  {e.titulo}
                </p>
              ))}
          </>
        ) : null}
      </article>
      <article className="space-y-3 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-bold">Avisos de mi cuenta</h2>
        {u.avisosIdentidad?.length ? (
          [...u.avisosIdentidad].reverse().map((a, i) => (
            <p key={i} className="border-t pt-3 text-sm">
              {new Date(a.fecha).toLocaleString("es-MX")} · {a.mensaje}
            </p>
          ))
        ) : (
          <p className="text-sm">No hay avisos nuevos.</p>
        )}
        <p className="text-xs text-neutral-500">
          Los avisos son locales; el envío real de correo aún no está
          configurado.
        </p>
      </article>
    </section>
  );
}
