import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Play,
  ScanLine,
  ShieldCheck,
  Ticket,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAutenticacion } from '../../contextos/AutenticacionContexto';
import { useNotificaciones } from '../../contextos/NotificacionesContexto';

interface PropiedadesExploradorCasosUso {
  navegarA: (ruta: string) => void;
}

type IdSubequipo = 'identidad' | 'organizacion' | 'taquilla' | 'checkin';

interface CasoDeUso {
  id: string;
  nombre: string;
  actor: string;
  interfaz: string;
  descripcion: string;
  ruta: string;
}

interface Subequipo {
  id: IdSubequipo;
  nombre: string;
  resumen: string;
  icono: LucideIcon;
  color: string;
  casos: CasoDeUso[];
}

const SUBEQUIPOS: Subequipo[] = [
  {
    id: 'identidad',
    nombre: 'Identidad y perfiles',
    resumen: 'Cuentas, acreditaciones, acceso y permisos institucionales.',
    icono: ShieldCheck,
    color: 'text-[#7a132b] bg-[#7a132b]/10 border-[#7a132b]/20',
    casos: [
      {
        id: 'CU-AUT-01',
        nombre: 'Iniciar sesión',
        actor: 'Usuario registrado',
        interfaz: 'UI-01 · Inicio de Sesión Institucional',
        descripcion: 'El usuario captura sus credenciales institucionales y accede al sistema según sus permisos.',
        ruta: '/login'
      },
      {
        id: 'CU-AUT-02',
        nombre: 'Registrar usuario',
        actor: 'Alumno, profesor o externo',
        interfaz: 'UI-02 · Registro y Acreditación',
        descripcion: 'El visitante crea una cuenta y proporciona la información necesaria para identificar su afiliación.',
        ruta: '/registro'
      },
      {
        id: 'CU-AUT-03',
        nombre: 'Acreditar perfil',
        actor: 'Usuario registrado',
        interfaz: 'UI-02 · Registro y Acreditación',
        descripcion: 'El usuario consulta y completa los datos de su perfil institucional para solicitar facultades adicionales.',
        ruta: '/perfil'
      },
      {
        id: 'CU-AUT-04',
        nombre: 'Recuperar contraseña',
        actor: 'Usuario registrado',
        interfaz: 'UI-03 · Recuperación de Acceso',
        descripcion: 'El usuario solicita recuperar su acceso y establece una nueva contraseña mediante el flujo de verificación.',
        ruta: '/recuperar-password'
      },
      {
        id: 'CU-ADM-01',
        nombre: 'Administrar cuentas y roles',
        actor: 'Administrador TI',
        interfaz: 'UI-70 · Administración Técnica de Usuarios',
        descripcion: 'El administrador consulta cuentas, asigna roles, activa o suspende usuarios y relaciona Staff con eventos.',
        ruta: '/admin'
      }
    ]
  },
  {
    id: 'organizacion',
    nombre: 'Organización y recintos',
    resumen: 'Solicitudes, dictámenes, agenda, recintos y distribución de lugares.',
    icono: Building2,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    casos: [
      {
        id: 'CU-ORG-01',
        nombre: 'Solicitar evento y recinto',
        actor: 'Organizador',
        interfaz: 'UI-20 · Solicitud Formal de Evento',
        descripcion: 'El organizador registra la información general del evento y solicita fechas, horarios y recintos.',
        ruta: '/solicitar-evento'
      },
      {
        id: 'CU-ORG-02',
        nombre: 'Consultar estado de solicitud',
        actor: 'Organizador o Subdirección',
        interfaz: 'UI-21 · Detalle y Dictamen de Solicitud',
        descripcion: 'El actor consulta el avance, los datos enviados y el dictamen asociado a una solicitud.',
        ruta: '/organizador/solicitudes/sol-simposio-ia'
      },
      {
        id: 'CU-ORG-03',
        nombre: 'Gestionar eventos propios',
        actor: 'Organizador',
        interfaz: 'UI-30 · Panel de Organización',
        descripcion: 'El organizador consulta sus eventos y entra a las herramientas de configuración y distribución.',
        ruta: '/organizador'
      },
      {
        id: 'CU-ORG-04',
        nombre: 'Configurar evento',
        actor: 'Organizador',
        interfaz: 'UI-31 · Configuración y Checklist de Evento',
        descripcion: 'El organizador revisa fechas, recintos y requisitos antes de publicar su evento.',
        ruta: '/organizador/eventos/evt-taller-devops-config'
      },
      {
        id: 'CU-ORG-05',
        nombre: 'Diseñar distribución de lugares',
        actor: 'Organizador',
        interfaz: 'UI-35 · Editor de Distribución de Lugares',
        descripcion: 'El organizador configura la distribución del recinto y clasifica los lugares para su evento.',
        ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos'
      },
      {
        id: 'CU-ORG-06',
        nombre: 'Comparar distribuciones',
        actor: 'Organizador',
        interfaz: 'UI-36 · Comparador Visual de Arreglos',
        descripcion: 'El organizador compara dos versiones de una distribución antes de conservar la versión elegida.',
        ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos'
      },
      {
        id: 'CU-SUB-01',
        nombre: 'Dictaminar solicitudes',
        actor: 'Subdirección',
        interfaz: 'UI-50 · Bandeja de Dictamen de Subdirección',
        descripcion: 'Subdirección revisa solicitudes y registra una autorización o rechazo con el motivo correspondiente.',
        ruta: '/subdireccion'
      },
      {
        id: 'CU-SUB-02',
        nombre: 'Consultar agenda multi-recinto',
        actor: 'Subdirección u Organizador',
        interfaz: 'UI-51 · Agenda Multi-Recinto de Ocupación',
        descripcion: 'El actor consulta la disponibilidad cruzada de fechas y recintos para detectar conflictos.',
        ruta: '/subdireccion?tab=agenda'
      },
      {
        id: 'CU-SUB-03',
        nombre: 'Administrar bloqueos',
        actor: 'Subdirección',
        interfaz: 'UI-52 · Gestión de Bloqueos Extraordinarios',
        descripcion: 'Subdirección registra o consulta bloqueos temporales de los recintos institucionales.',
        ruta: '/subdireccion?tab=bloqueos'
      },
      {
        id: 'CU-SUB-04',
        nombre: 'Crear evento oficial directo',
        actor: 'Subdirección',
        interfaz: 'UI-53 · Creación Directa de Evento Oficial',
        descripcion: 'Subdirección registra un evento oficial sin pasar por una solicitud ordinaria.',
        ruta: '/subdireccion?tab=evento_directo'
      }
    ]
  },
  {
    id: 'taquilla',
    nombre: 'Motor de taquilla',
    resumen: 'Cartelera, detalle de eventos, reservaciones y boletos digitales.',
    icono: Ticket,
    color: 'text-amber-800 bg-amber-50 border-amber-200',
    casos: [
      {
        id: 'CU-TAQ-01',
        nombre: 'Consultar cartelera',
        actor: 'Asistente o comunidad',
        interfaz: 'UI-10 · Cartelera General de Eventos',
        descripcion: 'El asistente consulta los eventos publicados y utiliza filtros para encontrar una actividad.',
        ruta: '/eventos'
      },
      {
        id: 'CU-TAQ-02',
        nombre: 'Ver detalle de evento',
        actor: 'Asistente u Organizador',
        interfaz: 'UI-11 · Ficha Técnica del Evento',
        descripcion: 'El usuario revisa descripción, ponentes, fechas, horarios, recinto y programa del evento.',
        ruta: '/eventos/evt-simposio-ia'
      },
      {
        id: 'CU-TAQ-03',
        nombre: 'Apartar y reservar lugar',
        actor: 'Asistente',
        interfaz: 'UI-40 · Taquilla y Selección de Lugar',
        descripcion: 'El asistente selecciona un lugar, cuenta con un apartado temporal y confirma su reservación.',
        ruta: '/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1'
      },
      {
        id: 'CU-TAQ-04',
        nombre: 'Consultar y cancelar boletos',
        actor: 'Asistente',
        interfaz: 'UI-41 · Mis Boletos Digitales',
        descripcion: 'El asistente consulta sus boletos digitales, visualiza el código QR y puede cancelar una reservación propia.',
        ruta: '/mis-reservaciones'
      }
    ]
  },
  {
    id: 'checkin',
    nombre: 'Check-in',
    resumen: 'Validación de boletos y seguimiento de ocupabilidad durante el evento.',
    icono: ScanLine,
    color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    casos: [
      {
        id: 'CU-STF-01',
        nombre: 'Controlar acceso en puerta',
        actor: 'Staff de acceso',
        interfaz: 'UI-60 · Escáner de Acceso Mobile-First',
        descripcion: 'El Staff valida el código QR y recibe el resultado de acceso válido, cancelado o reutilizado.',
        ruta: '/staff'
      },
      {
        id: 'CU-STF-02',
        nombre: 'Monitorear ocupabilidad en tiempo real',
        actor: 'Staff u Organizador',
        interfaz: 'UI-61 · Monitor de Ocupabilidad en Vivo',
        descripcion: 'El actor consulta el estado de ocupación del recinto durante el desarrollo del evento.',
        ruta: '/staff/ocupacion?eventId=evt-simposio-ia&dateId=fec-simposio-d1'
      }
    ]
  }
];

const ESCENARIOS = [
  { id: 'A', titulo: 'Registro y acreditación', descripcion: 'Formulario con validaciones para alumnos, profesores, administrativos y externos.', ruta: '/perfil', usuario: 'usr-carlos', rol: 'asistente' as const },
  { id: 'B', titulo: 'Solicitud excepcional', descripcion: 'Solicitud con una fecha menor a siete días y justificación para Subdirección.', ruta: '/solicitar-evento', usuario: 'usr-silva', rol: 'organizador' as const },
  { id: 'C', titulo: 'Dictamen de Subdirección', descripcion: 'Bandeja de revisión, autorización y bloqueo de recintos.', ruta: '/subdireccion', usuario: 'usr-subdireccion', rol: 'subdireccion' as const },
  { id: 'D', titulo: 'Editor de distribuciones', descripcion: 'Diseño de lugares y comparación de versiones del arreglo.', ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos', usuario: 'usr-silva', rol: 'organizador' as const },
  { id: 'E', titulo: 'Taquilla digital', descripcion: 'Selección de lugar y apartado temporal de diez minutos.', ruta: '/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1', usuario: 'usr-carlos', rol: 'asistente' as const },
  { id: 'F', titulo: 'Control de acceso', descripcion: 'Escaneo de QR y alerta de boleto reutilizado.', ruta: '/staff', usuario: 'usr-andrea', rol: 'staff' as const },
  { id: 'G', titulo: 'Ocupabilidad en vivo', descripcion: 'Mapa de lugares ocupados, reservados y libres.', ruta: '/staff/ocupacion?eventId=evt-simposio-ia&dateId=fec-simposio-d1', usuario: 'usr-andrea', rol: 'staff' as const }
];

export const ExploradorCasosUso: React.FC<PropiedadesExploradorCasosUso> = ({ navegarA }) => {
  const [estaAbierto, setEstaAbierto] = useState(false);
  const [vista, setVista] = useState<'casos' | 'escenarios'>('casos');
  const [subequipoActivo, setSubequipoActivo] = useState<IdSubequipo>('identidad');
  const [casoActivo, setCasoActivo] = useState<string | null>('CU-AUT-01');
  const [escenarioActivo, setEscenarioActivo] = useState<string | null>(null);
  const { cambiarUsuario, cambiarRolActivo } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const equipo = useMemo(
    () => SUBEQUIPOS.find((item) => item.id === subequipoActivo) || SUBEQUIPOS[0],
    [subequipoActivo]
  );
  const casoSeleccionado = equipo.casos.find((caso) => caso.id === casoActivo) || equipo.casos[0];
  const IconoEquipo = equipo.icono;

  const seleccionarSubequipo = (id: IdSubequipo) => {
    const siguiente = SUBEQUIPOS.find((item) => item.id === id) || SUBEQUIPOS[0];
    setSubequipoActivo(id);
    setCasoActivo(siguiente.casos[0].id);
  };

  const abrirPantalla = (caso: CasoDeUso) => {
    setCasoActivo(caso.id);
    navegarA(caso.ruta);
  };

  const ejecutarEscenario = (escenario: (typeof ESCENARIOS)[number]) => {
    setEscenarioActivo(escenario.id);
    cambiarUsuario(escenario.usuario);
    cambiarRolActivo(escenario.rol);
    navegarA(escenario.ruta);
    mostrarNotificacion('Escenario activado', escenario.titulo, 'informacion');
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 no-print">
      {!estaAbierto ? (
        <button
          type="button"
          onClick={() => setEstaAbierto(true)}
          className="group flex items-center gap-2.5 rounded-2xl border border-[#7a132b]/20 bg-white px-3.5 py-2.5 text-left shadow-[0_12px_35px_rgba(34,24,24,0.14)] transition hover:-translate-y-0.5 hover:border-[#7a132b]/40 hover:shadow-[0_16px_38px_rgba(34,24,24,0.18)] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/15"
          aria-label="Abrir explorador de casos de uso"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7a132b] text-white">
            <BookOpen className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a132b]">Documentación</span>
            <span className="block text-xs font-semibold text-neutral-800">Casos de uso</span>
          </span>
        </button>
      ) : (
        <div className="w-[min(94vw,650px)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_65px_rgba(34,24,24,0.2)]">
          <div className="flex items-center justify-between bg-[#651127] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <BookOpen className="h-4 w-4 text-amber-200" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200">Ticket Trade · ADS</p>
                <h2 className="truncate text-sm font-bold">Explorador de casos de uso</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEstaAbierto(false)}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Cerrar explorador"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex border-b border-neutral-200 bg-neutral-50 p-1.5">
            <button
              type="button"
              onClick={() => setVista('casos')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${vista === 'casos' ? 'bg-white text-[#7a132b] shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Casos de uso
            </button>
            <button
              type="button"
              onClick={() => setVista('escenarios')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${vista === 'escenarios' ? 'bg-white text-[#7a132b] shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              <Play className="h-3.5 w-3.5" /> Escenarios de demo
            </button>
          </div>

          {vista === 'casos' ? (
            <div className="grid max-h-[72vh] min-h-[430px] grid-cols-1 sm:grid-cols-[190px_1fr]">
              <aside className="border-b border-neutral-200 bg-[#fafaf9] p-2.5 sm:border-b-0 sm:border-r">
                <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Subequipos</p>
                <div className="space-y-1">
                  {SUBEQUIPOS.map((subequipo) => {
                    const Icono = subequipo.icono;
                    const activo = subequipo.id === subequipoActivo;
                    return (
                      <button
                        type="button"
                        key={subequipo.id}
                        onClick={() => seleccionarSubequipo(subequipo.id)}
                        className={`flex w-full items-center gap-2 rounded-xl p-2 text-left transition ${activo ? 'bg-white shadow-sm ring-1 ring-neutral-200' : 'hover:bg-white/70'}`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${subequipo.color}`}>
                          <Icono className="h-3.5 w-3.5" />
                        </span>
                        <span className={`text-[11px] font-bold leading-tight ${activo ? 'text-neutral-900' : 'text-neutral-500'}`}>{subequipo.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-w-0 overflow-y-auto p-3 sm:p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${equipo.color}`}>
                    <IconoEquipo className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-neutral-900">{equipo.nombre}</h3>
                    <p className="mt-0.5 text-xs leading-5 text-neutral-500">{equipo.resumen}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {equipo.casos.map((caso) => {
                    const activo = caso.id === casoSeleccionado.id;
                    return (
                      <div key={caso.id} className={`rounded-xl border transition ${activo ? 'border-[#7a132b]/35 bg-[#7a132b]/[0.035]' : 'border-neutral-200 bg-white'}`}>
                        <button
                          type="button"
                          onClick={() => setCasoActivo(caso.id)}
                          className="flex w-full items-start justify-between gap-3 p-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#7a132b]/20"
                        >
                          <span className="min-w-0">
                            <span className="mb-1 flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-[#7a132b]">{caso.id}</span>
                              <span className="text-xs font-bold text-neutral-900">{caso.nombre}</span>
                            </span>
                            <span className="block text-[11px] leading-4 text-neutral-500">{caso.interfaz}</span>
                          </span>
                          {activo ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-[#7a132b]" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />}
                        </button>
                        {activo && (
                          <div className="border-t border-neutral-200/80 px-3 pb-3 pt-2.5">
                            <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                              <div className="rounded-lg bg-white px-2.5 py-2"><span className="block font-bold text-neutral-400">Actor</span><span className="text-neutral-700">{caso.actor}</span></div>
                              <div className="rounded-lg bg-white px-2.5 py-2"><span className="block font-bold text-neutral-400">Pantalla relacionada</span><span className="text-neutral-700">{caso.interfaz}</span></div>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-neutral-600">{caso.descripcion}</p>
                            <button
                              type="button"
                              onClick={() => abrirPantalla(caso)}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#7a132b] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#620f23] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/15"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Ver pantalla relacionada
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="max-h-[72vh] overflow-y-auto p-3 sm:p-4">
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <div className="flex items-center gap-2 font-bold"><HelpCircle className="h-4 w-4" /> Escenarios de demostración</div>
                <p className="mt-1 text-amber-800/80">Estos accesos preparan datos de prueba para recorrer la aplicación. La documentación de casos de uso se encuentra en la pestaña anterior.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ESCENARIOS.map((escenario) => (
                  <button
                    type="button"
                    key={escenario.id}
                    onClick={() => ejecutarEscenario(escenario)}
                    className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#7a132b]/35 hover:shadow-sm ${escenarioActivo === escenario.id ? 'border-[#7a132b]/40 bg-[#7a132b]/[0.04]' : 'border-neutral-200 bg-white'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7a132b] text-[10px] font-black text-white">{escenario.id}</span><span className="text-xs font-bold text-neutral-900">{escenario.titulo}</span></span>
                      <Play className="h-3.5 w-3.5 shrink-0 text-[#7a132b]" />
                    </span>
                    <span className="mt-2 block text-[11px] leading-4 text-neutral-500">{escenario.descripcion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const GuiaDemostracion = ExploradorCasosUso;
