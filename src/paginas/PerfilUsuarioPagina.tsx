import { volverA } from '../dominio/navegacion';
import React, { useState } from "react";
import { UserRound, Mail, ShieldCheck, KeyRound, Bell, CheckCircle2, Clock3, ChevronDown, LogOut, CalendarDays, Ticket, Building2, ScanLine, GraduationCap } from "lucide-react";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useDatos } from "../contextos/DatosContexto";
import { MATRIZ_PERMISOS_ROLES } from "../utilidades/validaciones";

const campo = "mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#7a132b]/50 focus:ring-2 focus:ring-[#7a132b]/10";
const boton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#7a132b]/15 bg-[#7a132b]/5 px-4 py-2.5 text-sm font-semibold text-[#7a132b] transition-colors hover:bg-[#7a132b]/10 focus-visible:outline-2 focus-visible:outline-[#7a132b]";
const iconosRol = { asistente: Ticket, organizador: CalendarDays, staff: ScanLine, subdireccion: Building2, admin: ShieldCheck };
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
    <section className="perfil-cuidado mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <button type="button" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900" onClick={()=>navigate(volverA("/eventos"))}>Regresar</button>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="mb-1 text-sm font-semibold text-[#7a132b]">Tu cuenta en Ticket Trade</p><h1 className="text-3xl font-black tracking-tight">Mi perfil</h1></div>
        <button
          className={boton}
          onClick={() => {
            auth.cerrarSesion();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />Cerrar sesión
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
      <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200/70">
        <div className="flex flex-wrap items-center gap-5 bg-[#651127] px-6 py-7 text-white sm:px-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold" aria-hidden="true">{u.nombre.replace(/^(M\. en C\.|Dra?\.|Ing\.|Lic\.)\s*/i, '').split(' ').filter(Boolean).slice(0, 2).map(parte => parte[0]).join('')}</div>
          <div className="min-w-0 flex-1"><h2 className="text-2xl font-bold tracking-tight">{u.nombre}</h2><p className="mt-2 flex items-center gap-2 break-all text-sm text-white/75"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{u.correo}</p></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm"><GraduationCap className="h-4 w-4" aria-hidden="true" />{u.afiliacion === 'alumno' ? 'Estudiante' : u.afiliacion === 'profesor' ? 'Docente' : u.afiliacion === 'externo' ? 'Comunidad externa' : 'Comunidad IPN'}</span>
        </div>
        <div className="space-y-5 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-neutral-50 p-4"><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-500"><Mail className="h-4 w-4 text-[#7a132b]" aria-hidden="true" />Correo de la cuenta</p>
        <p className="flex items-center gap-2 text-sm font-bold text-neutral-800">{u.correoConfirmado ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />}{u.correoConfirmado ? 'Correo confirmado' : 'Confirmación pendiente'}</p>
        <p className="mt-2 text-sm text-neutral-500">{u.boleta ? `Boleta: ${u.boleta}` : u.numeroEmpleado ? `Identificador: ${u.numeroEmpleado}` : 'Sin identificador institucional'}</p></div>
        <div className="rounded-2xl bg-neutral-50 p-4"><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-500"><ShieldCheck className="h-4 w-4 text-[#7a132b]" aria-hidden="true" />Verificación de identidad</p><p className="text-sm font-bold text-neutral-800">{u.esVerificado ? 'Identidad verificada' : (u.estadoExpediente || 'Sin solicitar').replaceAll('_', ' ')}</p><p className="mt-2 text-sm text-neutral-500">{u.verificacionHasta ? `Vigente hasta ${u.verificacionHasta}` : u.esVerificado ? 'Tu expediente de identidad está aprobado.' : 'Consulta tu expediente para revisar los requisitos.'}</p></div></div>
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
        </div>
      </article>
      <div className="grid items-start gap-6 lg:grid-cols-2">
      <article className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/70 sm:p-7">
        <h2 className="flex items-center gap-3 text-lg font-bold"><span className="rounded-xl bg-[#7a132b]/5 p-2.5 text-[#7a132b]"><Mail className="h-5 w-5" aria-hidden="true" /></span>Cambiar correo electrónico</h2><p className="text-sm leading-relaxed text-neutral-500">Tu correo actual sigue activo hasta que confirmes la nueva dirección.</p>
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
      <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/70 sm:p-7">
        <h2 data-interfaz="UI-IP-06" tabIndex={-1} className="mb-4 flex scroll-mt-24 items-center gap-3 text-lg font-bold"><span className="rounded-xl bg-[#7a132b]/5 p-2.5 text-[#7a132b]"><KeyRound className="h-5 w-5" aria-hidden="true" /></span>Seguridad</h2>
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
      </div>
      <article className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/70 sm:p-7">
        <h2 className="flex items-center gap-3 text-xl font-bold"><ShieldCheck className="h-6 w-6 text-[#7a132b]" aria-hidden="true" />Roles y accesos</h2>
        <p className="text-sm text-neutral-500">Estos son tus accesos asignados. El perfil activo se muestra resaltado.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{MATRIZ_PERMISOS_ROLES.filter(r => u.roles.includes(r.rol)).map(r => {
          const Icono = iconosRol[r.rol as keyof typeof iconosRol] || UserRound;
          const activo = rolActivo === r.rol;
          return <section key={r.rol} className={`rounded-2xl p-5 ${activo ? 'bg-[#7a132b]/5 ring-1 ring-[#7a132b]/20' : 'bg-neutral-50'}`}>
            <div className="flex items-center justify-between gap-2"><Icono className="h-6 w-6 text-[#7a132b]" aria-hidden="true" />{activo && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#7a132b]">Activo</span>}</div>
            <h3 className="mt-4 font-bold">{r.nombre}</h3><p className="mt-2 text-sm leading-relaxed text-neutral-500">{r.descripcion}</p>
            <details className="group mt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#7a132b]">Ver permisos<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary><ul className="mt-3 space-y-2">{r.permisos.map(permiso => <li key={permiso} className="flex gap-2 text-xs leading-relaxed text-neutral-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7a132b]" aria-hidden="true" />{permiso}</li>)}</ul></details>
          </section>;
        })}</div>
        <div className="flex flex-wrap gap-3">
          {rolActivo === "admin" && (
            <>
              <button
                className={boton}
                onClick={() => navigate("/admin/expedientes")}
              >
                Consultar y revocar verificaciones
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
            <><button className={boton} onClick={()=>navigate("/subdireccion/verificaciones")}>Solicitudes de verificación</button><button className={boton} onClick={()=>navigate("/subdireccion/jefes-academia")}>Jefes de academia y periodos</button><button
              className={boton}
              onClick={() => navigate("/subdireccion/restricciones")}
            >
              Solicitar restricción o levantamiento
            </button></>
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
      <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/70 sm:p-7">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Bell className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-lg font-bold">Avisos de mi cuenta</h2><p className="mt-1 text-sm text-neutral-500">Cambios y notificaciones sobre tu identidad y tus accesos.</p></div></div>
        {u.avisosIdentidad?.length ? <ol className="space-y-4">{[...u.avisosIdentidad].reverse().map((aviso, i) => <li key={i} className="flex gap-4 rounded-xl bg-neutral-50 p-4"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7a132b]" aria-hidden="true" /><div><p className="text-sm leading-relaxed text-neutral-700">{aviso.mensaje}</p><time className="mt-2 block text-xs text-neutral-400" dateTime={aviso.fecha}>{new Date(aviso.fecha).toLocaleString('es-MX')}</time></div></li>)}</ol> : <div className="flex items-center gap-4 rounded-xl bg-emerald-50/60 p-5"><CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden="true" /><div><p className="font-semibold text-emerald-900">Estás al día</p><p className="mt-1 text-sm text-emerald-800">No tienes avisos nuevos sobre tu cuenta.</p></div></div>}
        <p className="mt-4 text-xs text-neutral-400">Los avisos se conservan en este navegador. El envío de correo está previsto para una siguiente etapa.</p>
      </article>
    </section>
  );
}
