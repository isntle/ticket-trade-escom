import React, { useState } from 'react';
import {
  UserCheck,
  Shield,
  Upload,
  FileText,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Lock,
  Mail,
  Building,
  KeyRound,
  IdCard,
  Briefcase
} from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useDatos } from '../contextos/DatosContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { TipoAfiliacion } from '../tipos';
import {
  validarBoletaIPN,
  validarNumeroEmpleadoIPN,
  validarContrasena,
  MATRIZ_PERMISOS_ROLES
} from '../utilidades/validaciones';

interface PropiedadesPerfilUsuario {
  navigate: (ruta: string) => void;
}

export const PerfilUsuarioPagina: React.FC<PropiedadesPerfilUsuario> = ({ navigate }) => {
  const {
    usuarioActual,
    actualizarPerfil,
    solicitarPermisoOrganizador,
    cerrarSesion
  } = useAutenticacion();
  const { listaEventos } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();

  if (!usuarioActual) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm">
          <p className="text-sm text-neutral-600 mb-4">No hay ninguna sesión activa.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 rounded-xl bg-[#7a132b] text-white text-xs font-bold"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  const [modoEdicion, setModoEdicion] = useState(false);
  const [nombre, setNombre] = useState(usuarioActual.nombre);
  const [afiliacion, setAfiliacion] = useState<TipoAfiliacion>(usuarioActual.afiliacion);
  const [identificador, setIdentificador] = useState(
    usuarioActual.boleta || usuarioActual.numeroEmpleado || usuarioActual.nombreOrganizacion || ''
  );
  const [puesto, setPuesto] = useState(usuarioActual.puestoContacto || '');
  const [telefono, setTelefono] = useState(usuarioActual.telefonoContacto || '');
  const [nombreDocumento, setNombreDocumento] = useState(usuarioActual.nombreDocumento || '');

  // Cambio de contraseña
  const [mostrarCambioPass, setMostrarCambioPass] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');

  // Eventos asociados al Staff si el usuario tiene rol 'staff'
  const eventosAsignados = listaEventos.filter((e) =>
    usuarioActual.eventosAsignadosStaff?.includes(e.id)
  );

  const manejarGuardarPerfil = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones por tipo de afiliación
    if (afiliacion === 'alumno') {
      const val = validarBoletaIPN(identificador);
      if (!val.esValido) {
        mostrarNotificacion('Boleta inválida', val.mensaje || '', 'error');
        return;
      }
    } else if (afiliacion === 'profesor' || afiliacion === 'administrativo' || afiliacion === 'pae') {
      const val = validarNumeroEmpleadoIPN(identificador);
      if (!val.esValido) {
        mostrarNotificacion('Identificador inválido', val.mensaje || '', 'error');
        return;
      }
    }

    const res = actualizarPerfil(usuarioActual.id, {
      nombre: nombre.trim(),
      afiliacion,
      boleta: afiliacion === 'alumno' ? identificador.trim() : undefined,
      numeroEmpleado:
        afiliacion === 'profesor' || afiliacion === 'administrativo' || afiliacion === 'pae'
          ? identificador.trim()
          : undefined,
      nombreOrganizacion: afiliacion === 'externo' ? identificador.trim() : undefined,
      puestoContacto: puesto.trim(),
      telefonoContacto: telefono.trim(),
      nombreDocumento: nombreDocumento.trim()
    });

    if (res.exito) {
      mostrarNotificacion('Perfil Actualizado', res.mensaje, 'exito');
      setModoEdicion(false);
    } else {
      mostrarNotificacion('Error', res.mensaje, 'error');
    }
  };

  const manejarCambiarPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (usuarioActual.password && passwordActual !== usuarioActual.password) {
      mostrarNotificacion('Error', 'La contraseña actual no es correcta.', 'error');
      return;
    }

    const val = validarContrasena(nuevoPassword);
    if (!val.esValido) {
      mostrarNotificacion('Seguridad', val.mensaje || '', 'error');
      return;
    }

    actualizarPerfil(usuarioActual.id, { password: nuevoPassword });
    mostrarNotificacion('Contraseña Cambiada', 'Tu nueva clave de acceso ha sido guardada.', 'exito');
    setPasswordActual('');
    setNuevoPassword('');
    setMostrarCambioPass(false);
  };

  const manejarAcreditacionOrganizador = () => {
    const res = solicitarPermisoOrganizador(
      afiliacion,
      identificador.trim(),
      nombreDocumento.trim() || 'credencial_ipn_comprobante.pdf'
    );
    if (res.exito) {
      mostrarNotificacion('Capacidad Habilitada', res.mensaje, 'exito');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate('/eventos')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la cartelera</span>
        </button>

        <button
          type="button"
          onClick={() => {
            cerrarSesion();
            mostrarNotificacion('Sesión Cerrada', 'Has cerrado tu sesión exitosamente.', 'informacion');
            navigate('/login');
          }}
          className="text-xs text-rose-700 hover:text-rose-900 font-semibold px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Tarjeta de Cabecera del Perfil */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7a132b] to-[#500c1c] text-white flex items-center justify-center font-black text-2xl shadow-sm">
              {usuarioActual.nombre.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900">
                  {usuarioActual.nombre}
                </h1>
                {usuarioActual.esVerificado && (
                  <span className="p-0.5 rounded-full bg-emerald-100 text-emerald-700" title="Cuenta verificada IPN">
                    <CheckCircle className="w-4 h-4" />
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">{usuarioActual.correo}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-bold capitalize">
                  {usuarioActual.afiliacion}
                </span>
                {usuarioActual.boleta && (
                  <span className="font-mono text-[11px] text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                    Boleta: {usuarioActual.boleta}
                  </span>
                )}
                {usuarioActual.numeroEmpleado && (
                  <span className="font-mono text-[11px] text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                    No. Empleado: {usuarioActual.numeroEmpleado}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!modoEdicion ? (
              <button
                type="button"
                onClick={() => setModoEdicion(true)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer"
              >
                Editar Perfil
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModoEdicion(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Roles del Usuario */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Roles y Capacidades Activas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {usuarioActual.roles.map((r) => (
                <span
                  key={r}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 font-bold text-[11px] capitalize"
                >
                  {r === 'asistente' && '🎓 Alumno / Asistente'}
                  {r === 'organizador' && '📋 Comité Organizador'}
                  {r === 'staff' && '📱 Staff de Acceso'}
                  {r === 'subdireccion' && '🏛️ Subdirección SEIS'}
                  {r === 'admin' && '⚙️ Administrador TI'}
                </span>
              ))}
            </div>
          </div>

          {!usuarioActual.roles.includes('organizador') && (
            <button
              type="button"
              onClick={manejarAcreditacionOrganizador}
              className="px-3.5 py-1.5 rounded-xl bg-[#7a132b]/10 text-[#7a132b] hover:bg-[#7a132b]/20 font-bold text-xs transition-colors cursor-pointer"
            >
              + Acreditarme como Organizador
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal: Datos y Edición */}
        <div className="lg:col-span-2 space-y-6">
          {modoEdicion ? (
            <form onSubmit={manejarGuardarPerfil} className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4 text-xs">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                <UserCheck className="w-4 h-4 text-[#7a132b]" />
                <span>Modificar Datos de Cuenta</span>
              </h2>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Afiliación Institucional</label>
                  <select
                    value={afiliacion}
                    onChange={(e) => setAfiliacion(e.target.value as TipoAfiliacion)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl"
                  >
                    <option value="alumno">Alumno ESCOM</option>
                    <option value="profesor">Profesor / Docente</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="pae">Personal de Apoyo (PAE)</option>
                    <option value="externo">Entidad Externa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    {afiliacion === 'alumno' && 'Boleta (10 dígitos) *'}
                    {(afiliacion === 'profesor' || afiliacion === 'administrativo' || afiliacion === 'pae') && 'No. Empleado *'}
                    {afiliacion === 'externo' && 'Organización / Empresa *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              {afiliacion === 'externo' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Puesto de Contacto</label>
                    <input
                      type="text"
                      value={puesto}
                      onChange={(e) => setPuesto(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Documento Probatorio / Comprobante Registrado
                </label>
                <input
                  type="text"
                  placeholder="ej: credencial_ipn_2026.pdf"
                  value={nombreDocumento}
                  onChange={(e) => setNombreDocumento(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModoEdicion(false)}
                  className="px-4 py-2 border rounded-xl text-neutral-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7a132b] text-white rounded-xl font-bold hover:bg-[#620f23] transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4 text-xs">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
                <IdCard className="w-4 h-4 text-[#7a132b]" />
                <span>Expediente de Identidad y Acreditación</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">Afiliación Registrada</span>
                  <span className="text-sm font-bold text-neutral-800 capitalize mt-0.5 block">{usuarioActual.afiliacion}</span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">Identificador Oficial</span>
                  <span className="text-sm font-mono font-bold text-neutral-800 mt-0.5 block">
                    {usuarioActual.boleta || usuarioActual.numeroEmpleado || usuarioActual.nombreOrganizacion || 'No especificado'}
                  </span>
                </div>

                {usuarioActual.nombreOrganizacion && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 col-span-2">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Razón Social Externa</span>
                    <span className="text-xs font-bold text-neutral-800 mt-0.5 block">{usuarioActual.nombreOrganizacion}</span>
                  </div>
                )}

                {usuarioActual.nombreDocumento && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 col-span-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#7a132b]" />
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">Comprobante Adjunto</span>
                        <span className="font-mono text-xs font-medium text-neutral-800">{usuarioActual.nombreDocumento}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Validado</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seguridad y Contraseña */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#7a132b]" />
                <span>Seguridad de la Cuenta</span>
              </h2>
              <button
                type="button"
                onClick={() => setMostrarCambioPass(!mostrarCambioPass)}
                className="text-xs font-bold text-[#7a132b] hover:underline cursor-pointer"
              >
                {mostrarCambioPass ? 'Cerrar' : 'Cambiar Contraseña'}
              </button>
            </div>

            {mostrarCambioPass ? (
              <form onSubmit={manejarCambiarPassword} className="space-y-3 pt-1">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Contraseña Actual *</label>
                  <input
                    type="password"
                    required
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Nueva Contraseña *</label>
                  <input
                    type="password"
                    required
                    placeholder="Mín. 8 caracteres, Mayús y Núm"
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-colors"
                >
                  Actualizar Contraseña
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between text-neutral-500">
                <span>Tu contraseña se encuentra activa y resguardada.</span>
                <span className="text-[11px] font-mono">••••••••••••</span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Lateral: Permisos y Asignaciones de Staff */}
        <div className="space-y-6">
          {/* Si tiene rol de Staff, mostrar eventos asignados */}
          {usuarioActual.roles.includes('staff') && (
            <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-purple-950 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-700" />
                <span>Eventos Asignados al Staff</span>
              </h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Eventos donde este usuario tiene autorización operativa para escanear boletos y controlar puerta.
              </p>

              {eventosAsignados.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {eventosAsignados.map((ev) => (
                    <div key={ev.id} className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col gap-1">
                      <span className="font-bold text-purple-900 text-[11px]">{ev.titulo}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {ev.fechas[0]?.fecha} · {ev.fechas[0]?.horaInicio} hrs
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-neutral-50 rounded-xl text-center text-neutral-400 text-[11px]">
                  No estás asignado a eventos específicos aún.
                </div>
              )}
            </div>
          )}

          {/* Resumen de Matriz de Permisos */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#7a132b]" />
              <span>Matriz de Permisos por Rol</span>
            </h3>

            <div className="space-y-3">
              {MATRIZ_PERMISOS_ROLES.filter((m) => usuarioActual.roles.includes(m.rol)).map((item) => (
                <div key={item.rol} className="border-b border-neutral-100 pb-3 last:border-b-0">
                  <span className="font-bold text-neutral-800 text-[11px] block">{item.nombre}</span>
                  <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">{item.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
