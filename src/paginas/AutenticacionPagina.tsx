import React, { useState } from 'react';
import {
  ArrowLeft,
  UserCheck,
  Shield,
  KeyRound,
  UserPlus,
  LogIn,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Building,
  GraduationCap,
  Briefcase,
  Upload
} from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { TipoAfiliacion } from '../tipos';
import {
  validarCorreoInstitucional,
  validarBoletaIPN,
  validarNumeroEmpleadoIPN,
  validarContrasena
} from '../utilidades/validaciones';

interface PropiedadesAutenticacion {
  view?: 'login' | 'registro' | 'recuperar';
  navigate: (ruta: string) => void;
}

export const AutenticacionPagina: React.FC<PropiedadesAutenticacion> = ({
  view = 'login',
  navigate
}) => {
  const {
    iniciarSesion,
    registrarUsuario,
    solicitarRecuperacionPassword,
    restablecerPasswordConToken,
    todosLosUsuarios
  } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  // Pestaña actual: 'login' | 'registro' | 'recuperar'
  const [pestaña, setPestaña] = useState<'login' | 'registro' | 'recuperar'>(view);

  // Estados para Login
  const [correoLogin, setCorreoLogin] = useState('rsilva@ipn.mx');
  const [passwordLogin, setPasswordLogin] = useState('Password123!');
  const [mostrarPasswordLogin, setMostrarPasswordLogin] = useState(false);

  // Estados para Registro
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [correoRegistro, setCorreoRegistro] = useState('');
  const [passwordRegistro, setPasswordRegistro] = useState('');
  const [afiliacionRegistro, setAfiliacionRegistro] = useState<TipoAfiliacion>('alumno');
  const [boletaRegistro, setBoletaRegistro] = useState('');
  const [empleadoRegistro, setEmpleadoRegistro] = useState('');
  const [organizacionRegistro, setOrganizacionRegistro] = useState('');
  const [puestoRegistro, setPuestoRegistro] = useState('');
  const [telefonoRegistro, setTelefonoRegistro] = useState('');
  const [documentoRegistro, setDocumentoRegistro] = useState('');
  const [solicitaOrganizador, setSolicitaOrganizador] = useState(false);

  // Estados para Recuperación
  const [pasoRecuperacion, setPasoRecuperacion] = useState<'solicitar' | 'restablecer'>('solicitar');
  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [tokenRecuperar, setTokenRecuperar] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');

  // Info detectada automáticamente del correo ingresado en registro
  const infoCorreoRegistro = validarCorreoInstitucional(correoRegistro);

  // ==========================================
  // MANEJADORES
  // ==========================================

  const manejarLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = iniciarSesion(correoLogin, passwordLogin);
    if (res.exito) {
      mostrarNotificacion('Acceso Concedido', res.mensaje, 'exito');
      navigate('/eventos');
    } else {
      mostrarNotificacion('Error de Autenticación', res.mensaje, 'error');
    }
  };

  const manejarRegistro = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar contraseña
    const resPass = validarContrasena(passwordRegistro);
    if (!resPass.esValido) {
      mostrarNotificacion('Seguridad de Contraseña', resPass.mensaje || '', 'error');
      return;
    }

    const res = registrarUsuario({
      nombre: nombreRegistro,
      correo: correoRegistro,
      password: passwordRegistro,
      afiliacion: afiliacionRegistro,
      boleta: afiliacionRegistro === 'alumno' ? boletaRegistro : undefined,
      numeroEmpleado:
        afiliacionRegistro === 'profesor' || afiliacionRegistro === 'administrativo' || afiliacionRegistro === 'pae'
          ? empleadoRegistro
          : undefined,
      nombreOrganizacion: afiliacionRegistro === 'externo' ? organizacionRegistro : undefined,
      puestoContacto: afiliacionRegistro === 'externo' ? puestoRegistro : undefined,
      telefonoContacto: afiliacionRegistro === 'externo' ? telefonoRegistro : undefined,
      nombreDocumento: documentoRegistro || undefined,
      solicitaOrganizador
    });

    if (res.exito) {
      mostrarNotificacion('Cuenta Creada', res.mensaje, 'exito');
      navigate('/eventos');
    } else {
      mostrarNotificacion('Error en Registro', res.mensaje, 'error');
    }
  };

  const manejarSolicitarToken = (e: React.FormEvent) => {
    e.preventDefault();
    const res = solicitarRecuperacionPassword(correoRecuperar);
    if (res.exito) {
      mostrarNotificacion('Código Generado', res.mensaje, 'informacion');
      setPasoRecuperacion('restablecer');
    } else {
      mostrarNotificacion('Error', res.mensaje, 'error');
    }
  };

  const manejarRestablecerPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const res = restablecerPasswordConToken(tokenRecuperar, nuevoPassword);
    if (res.exito) {
      mostrarNotificacion('Contraseña Actualizada', res.mensaje, 'exito');
      setPestaña('login');
      setCorreoLogin(correoRecuperar);
      setPasswordLogin(nuevoPassword);
      setPasoRecuperacion('solicitar');
    } else {
      mostrarNotificacion('Error de Restablecimiento', res.mensaje, 'error');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 sm:py-14 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-10 shadow-sm">
        {/* Encabezado Institucional */}
        <div className="text-center mb-8">
          <span
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ color: 'var(--color-guinda)' }}
          >
            Ticket Trade
          </span>
          <p className="text-xs text-neutral-500 mt-1 font-medium">
            Módulo Oficial de Identidad y Accesos — ESCOM IPN
          </p>

          {/* Navegación por pestañas */}
          <div className="flex bg-neutral-100 p-1 rounded-xl mt-6 border border-neutral-200">
            <button
              type="button"
              onClick={() => setPestaña('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                pestaña === 'login'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => setPestaña('registro')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                pestaña === 'registro'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registro</span>
            </button>
            <button
              type="button"
              onClick={() => setPestaña('recuperar')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                pestaña === 'recuperar'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Recuperar</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: INICIO DE SESIÓN                                              */}
        {/* ========================================================================= */}
        {pestaña === 'login' && (
          <div className="space-y-6">
            <form onSubmit={manejarLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Correo Electrónico Institucional o Externo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@ipn.mx o alumno@alumno.ipn.mx"
                  value={correoLogin}
                  onChange={(e) => setCorreoLogin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:border-[#7a132b] focus:ring-1 focus:ring-[#7a132b] transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-neutral-700">Contraseña *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCorreoRecuperar(correoLogin);
                      setPestaña('recuperar');
                    }}
                    className="text-[#7a132b] hover:underline text-[11px] font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={mostrarPasswordLogin ? 'text' : 'password'}
                    required
                    value={passwordLogin}
                    onChange={(e) => setPasswordLogin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl pr-16 focus:border-[#7a132b] focus:ring-1 focus:ring-[#7a132b] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPasswordLogin(!mostrarPasswordLogin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-neutral-500 hover:text-neutral-800"
                  >
                    {mostrarPasswordLogin ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-2 text-sm mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </button>
            </form>

            {/* Acceso Rápido con Cuentas Semilla Oficiales (Demostración) */}
            <div className="pt-4 border-t border-neutral-100 text-xs">
              <span className="text-neutral-500 block mb-2 font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#7a132b]" />
                <span>Cuentas de prueba preconfiguradas (Clic para autocompletar):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {todosLosUsuarios.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setCorreoLogin(u.correo);
                      setPasswordLogin(u.password || 'Password123!');
                    }}
                    className="text-left p-2 rounded-xl border border-neutral-200 hover:border-[#7a132b] hover:bg-neutral-50 flex flex-col justify-between text-[11px] transition-colors"
                  >
                    <div className="font-bold text-neutral-800 truncate">{u.nombre}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-neutral-500 text-[10px]">{u.correo}</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[9px] capitalize font-medium">
                        {u.afiliacion}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: REGISTRO DE USUARIOS INTERNOS Y EXTERNOS                     */}
        {/* ========================================================================= */}
        {pestaña === 'registro' && (
          <form onSubmit={manejarRegistro} className="space-y-4 text-xs">
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 mb-2">
              <h3 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5 mb-1">
                <Shield className="w-4 h-4 text-[#7a132b]" />
                <span>Identificación Institucional ESCOM</span>
              </h3>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Los alumnos deben registrarse con correo <code className="font-mono text-neutral-800">@alumno.ipn.mx</code> y
                su boleta de 10 dígitos. Los docentes y administrativos deben usar <code className="font-mono text-neutral-800">@ipn.mx</code>.
                Los asistentes externos pueden usar su correo personal o corporativo.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                placeholder="ej: Lic. Javier Estrada Gómez"
                value={nombreRegistro}
                onChange={(e) => setNombreRegistro(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl focus:border-[#7a132b]"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                placeholder="ej: festradag@alumno.ipn.mx"
                value={correoRegistro}
                onChange={(e) => {
                  const val = e.target.value;
                  setCorreoRegistro(val);
                  // Autoseleccionar afiliación según dominio ingresado
                  if (val.includes('@alumno.ipn.mx')) {
                    setAfiliacionRegistro('alumno');
                  } else if (val.includes('@ipn.mx') || val.includes('@escom.ipn.mx')) {
                    setAfiliacionRegistro('profesor');
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl focus:border-[#7a132b]"
              />
              {infoCorreoRegistro.esIPN ? (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Dominio politécnico verificado ({infoCorreoRegistro.dominio})</span>
                </span>
              ) : correoRegistro && (
                <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Registrándose como usuario externo / visitante</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Tipo de Afiliación *
                </label>
                <select
                  value={afiliacionRegistro}
                  onChange={(e) => setAfiliacionRegistro(e.target.value as TipoAfiliacion)}
                  className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl focus:border-[#7a132b]"
                >
                  <option value="alumno">Alumno ESCOM</option>
                  <option value="profesor">Profesor / Docente</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="pae">Personal de Apoyo (PAE)</option>
                  <option value="externo">Externo / Entidad Externa</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Contraseña de Acceso *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mín. 8 caracteres, Mayús y Núm"
                  value={passwordRegistro}
                  onChange={(e) => setPasswordRegistro(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl focus:border-[#7a132b]"
                />
              </div>
            </div>

            {/* Campos Condicionales según Afiliación */}
            {afiliacionRegistro === 'alumno' && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Número de Boleta IPN (10 dígitos) *
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  placeholder="ej: 2024630812"
                  value={boletaRegistro}
                  onChange={(e) => setBoletaRegistro(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl font-mono text-xs tracking-wider focus:border-[#7a132b]"
                />
              </div>
            )}

            {(afiliacionRegistro === 'profesor' ||
              afiliacionRegistro === 'administrativo' ||
              afiliacionRegistro === 'pae') && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Número de Empleado Institucional *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: EMP-99120 o 84210"
                  value={empleadoRegistro}
                  onChange={(e) => setEmpleadoRegistro(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl font-mono text-xs focus:border-[#7a132b]"
                />
              </div>
            )}

            {afiliacionRegistro === 'externo' && (
              <div className="space-y-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Nombre de la Empresa o Institución Externa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Intel México / Fundación Softek"
                    value={organizacionRegistro}
                    onChange={(e) => setOrganizacionRegistro(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Cargo / Puesto</label>
                    <input
                      type="text"
                      placeholder="ej: Gerente de Talento"
                      value={puestoRegistro}
                      onChange={(e) => setPuestoRegistro(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      placeholder="55-1234-5678"
                      value={telefonoRegistro}
                      onChange={(e) => setTelefonoRegistro(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Checkbox para solicitar capacidad de Organizador */}
            <div className="p-3 bg-[#7a132b]/5 rounded-xl border border-[#7a132b]/20 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="solicita-org"
                checked={solicitaOrganizador}
                onChange={(e) => setSolicitaOrganizador(e.target.checked)}
                className="mt-0.5 rounded text-[#7a132b] focus:ring-[#7a132b]"
              />
              <label htmlFor="solicita-org" className="text-xs text-neutral-800 cursor-pointer">
                <span className="font-bold text-[#7a132b] block">
                  Habilitar perfil de Comité Organizador
                </span>
                <span>
                  Permite redactar solicitudes formales de eventos a Subdirección y diseñar arreglos de lugares.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-2 text-sm mt-3"
            >
              <UserPlus className="w-4 h-4" />
              <span>Completar Registro de Usuario</span>
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: RECUPERACIÓN DE CONTRASEÑA                                     */}
        {/* ========================================================================= */}
        {pestaña === 'recuperar' && (
          <div className="space-y-5 text-xs">
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
              <h3 className="font-bold text-neutral-900 text-xs flex items-center gap-1.5 mb-1">
                <KeyRound className="w-4 h-4 text-[#7a132b]" />
                <span>Restablecimiento Seguro de Contraseña</span>
              </h3>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Ingresa tu correo registrado para generar un token de verificación institucional y
                definir una nueva contraseña de acceso.
              </p>
            </div>

            {pasoRecuperacion === 'solicitar' ? (
              <form onSubmit={manejarSolicitarToken} className="space-y-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Correo Electrónico Registrado *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ej: cmendezv@alumno.ipn.mx"
                    value={correoRecuperar}
                    onChange={(e) => setCorreoRecuperar(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:border-[#7a132b]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Generar Código de Recuperación
                </button>
              </form>
            ) : (
              <form onSubmit={manejarRestablecerPassword} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px]">
                  <strong>Código enviado:</strong> Revisa el token generado para el correo <u>{correoRecuperar}</u>.
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Código / Token de Verificación *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: TOK-A1B2C3"
                    value={tokenRecuperar}
                    onChange={(e) => setTokenRecuperar(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-sm tracking-wider uppercase focus:border-[#7a132b]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mín. 8 caracteres, Mayús y Núm"
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:border-[#7a132b]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPasoRecuperacion('solicitar')}
                    className="flex-1 py-2.5 border border-neutral-300 rounded-xl text-neutral-700 font-semibold hover:bg-neutral-50"
                  >
                    Volver a solicitar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#7a132b] hover:bg-[#630f23] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Guardar Contraseña
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
