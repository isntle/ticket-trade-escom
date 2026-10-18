import React, { useEffect, useState } from 'react';
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
  Upload,
  Ticket,
  Sparkles
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

  // Mantener la pestaña visible sincronizada con la ruta actual.
  useEffect(() => {
    setPestaña(view);
    if (view !== 'recuperar') {
      setPasoRecuperacion('solicitar');
    }
  }, [view]);

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
      navigate('/login');
    } else {
      mostrarNotificacion('Error de Restablecimiento', res.mensaje, 'error');
    }
  };

  // Acceso con una composición visual propia: identidad institucional a la izquierda
  // y formulario tipo credencial/boleto a la derecha.
  if (pestaña === 'login') {
    return (
      <div className="relative flex min-h-screen items-center overflow-hidden bg-[#f5f3f0] p-2.5 sm:p-4 animate-in fade-in duration-300">
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#7a132b]/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl" />

        <div className="relative grid min-h-[calc(100vh-1.25rem)] w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_18px_55px_rgba(62,32,36,0.12)] sm:min-h-[calc(100vh-2rem)] lg:grid-cols-[0.92fr_1.08fr]">
          <section className="order-2 relative isolate overflow-hidden bg-[#651127] px-7 py-8 text-white sm:px-10 sm:py-11 lg:order-1 lg:min-h-[calc(100vh-2rem)] lg:px-12 lg:py-12">
            <div className="absolute -right-20 top-20 h-64 w-64 rounded-full border border-white/10" />
            <div className="absolute -right-10 top-30 h-44 w-44 rounded-full border border-white/10" />
            <div className="absolute bottom-8 left-8 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_8px_rgba(252,211,77,0.12)]" />

            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner">
                  <Ticket className="h-5 w-5 text-amber-200" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/90">ESCOM · IPN</p>
                  <p className="text-sm font-semibold tracking-tight">Ticket Trade</p>
                </div>
              </div>

              <div className="mt-20 max-w-sm lg:mt-auto lg:mb-auto">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-white/80">
                  <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                  Tu agenda académica, en un solo lugar
                </div>
                <h1 className="max-w-sm text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-5xl">
                  Entra a la experiencia ESCOM.
                </h1>
                <p className="mt-5 max-w-xs text-sm leading-6 text-white/70">
                  Consulta eventos, reserva tu lugar y lleva tus boletos digitales contigo.
                </p>
              </div>

              <div className="mt-12 space-y-3 border-t border-white/15 pt-6 lg:mt-auto">
                {[
                  ['Acceso institucional', 'Una cuenta para toda tu actividad'],
                  ['Boletos digitales', 'Tu entrada siempre disponible'],
                  ['Agenda ESCOM', 'Eventos y recintos organizados']
                ].map(([titulo, descripcion]) => (
                  <div key={titulo} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                    <div>
                      <p className="text-xs font-semibold text-white/95">{titulo}</p>
                      <p className="mt-0.5 text-[11px] text-white/55">{descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="order-1 flex items-center px-7 py-8 sm:px-12 sm:py-11 lg:order-2 lg:px-14 lg:py-14">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a132b]">Acceso seguro</p>
                <h2 className="text-3xl font-black tracking-[-0.035em] text-neutral-950">Iniciar sesión</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">Usa tus credenciales para continuar a Ticket Trade.</p>
              </div>

              <form onSubmit={manejarLogin} className="space-y-5">
                <div>
                  <label htmlFor="correo-login" className="mb-2 block text-xs font-bold text-neutral-700">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Building className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="correo-login"
                      type="email"
                      required
                      placeholder="usuario@ipn.mx"
                      value={correoLogin}
                      onChange={(e) => setCorreoLogin(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 bg-[#fafaf9] py-3 pl-10 pr-3.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#7a132b] focus:bg-white focus:ring-4 focus:ring-[#7a132b]/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password-login" className="text-xs font-bold text-neutral-700">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCorreoRecuperar(correoLogin);
                        setPestaña('recuperar');
                        navigate('/recuperar-password');
                      }}
                      className="text-[11px] font-semibold text-[#7a132b] transition hover:text-[#4e0d20] hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      id="password-login"
                      type={mostrarPasswordLogin ? 'text' : 'password'}
                      required
                      value={passwordLogin}
                      onChange={(e) => setPasswordLogin(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 bg-[#fafaf9] py-3 pl-10 pr-20 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#7a132b] focus:bg-white focus:ring-4 focus:ring-[#7a132b]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPasswordLogin(!mostrarPasswordLogin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-neutral-400 transition hover:text-neutral-800"
                    >
                      {mostrarPasswordLogin ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#7a132b] py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(122,19,43,0.18)] transition hover:-translate-y-0.5 hover:bg-[#630f23] hover:shadow-[0_14px_24px_rgba(122,19,43,0.24)] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/20"
                >
                  <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  Ingresar al sistema
                </button>
              </form>

              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Accesos rápidos</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {todosLosUsuarios.slice(0, 4).map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => {
                      setCorreoLogin(usuario.correo);
                      setPasswordLogin(usuario.password || 'Password123!');
                    }}
                    className="group rounded-xl border border-neutral-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[#7a132b]/40 hover:bg-[#7a132b]/[0.03] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7a132b]/10 text-[10px] font-black text-[#7a132b]">
                        {usuario.nombre.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-neutral-800">{usuario.nombre}</p>
                        <p className="truncate text-[10px] text-neutral-400">{usuario.afiliacion}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-[11px]">
                <span className="text-neutral-500">¿Aún no tienes cuenta?</span>
                <button
                  type="button"
                  onClick={() => {
                    setPestaña('registro');
                    navigate('/registro');
                  }}
                  className="font-bold text-[#7a132b] hover:underline"
                >
                  Crear cuenta
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const pestañaParaFormulario = pestaña as string;

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
              onClick={() => {
                setPestaña('login');
                navigate('/login');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                pestañaParaFormulario === 'login'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPestaña('registro');
                navigate('/registro');
              }}
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
              onClick={() => {
                setPestaña('recuperar');
                navigate('/recuperar-password');
              }}
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
        {pestañaParaFormulario === 'login' && (
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
