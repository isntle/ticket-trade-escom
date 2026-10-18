import React, { useState } from 'react';
import { Play, ChevronUp, ChevronDown, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAutenticacion } from '../../contextos/AutenticacionContexto';
import { useNotificaciones } from '../../contextos/NotificacionesContexto';

interface PropiedadesGuiaEvaluacionDocente {
  navegarA: (ruta: string) => void;
}

export const GuiaEvaluacionDocente: React.FC<PropiedadesGuiaEvaluacionDocente> = ({ navegarA }) => {
  const [estaAbierto, setEstaAbierto] = useState(false);
  const [escenarioActivo, setEscenarioActivo] = useState<string | null>(null);

  const { cambiarUsuario, cambiarRolActivo } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const escenarios = [
    {
      id: 'A',
      titulo: 'Escenario A: Registro de Usuario y Acreditación',
      descripcion: 'Formulario con validaciones por rol: Alumno (boleta 10 dígitos), Profesor (número de empleado), Administrativo o Externo (razón social).',
      configurar: () => {
        cambiarUsuario('usr-carlos');
        cambiarRolActivo('asistente');
        navegarA('/perfil');
        mostrarNotificacion('Escenario A Activado', 'Formulario de Acreditación Institucional', 'informacion');
      }
    },
    {
      id: 'B',
      titulo: 'Escenario B: Solicitud de Evento y Regla de Anticipación',
      descripcion: 'Registro de fecha con menos de 7 días. El sistema detecta la urgencia y exige justificación excepcional para Subdirección.',
      configurar: () => {
        cambiarUsuario('usr-silva');
        cambiarRolActivo('organizador');
        navegarA('/solicitar-evento');
        mostrarNotificacion('Escenario B Activado', 'Solicitud con prueba de Regla de Anticipación (< 7 días)', 'informacion');
      }
    },
    {
      id: 'C',
      titulo: 'Escenario C: Dictamen de Subdirección y Creación Directa',
      descripcion: 'Bandeja de dictamen con motivos obligatorios, gestión de bloqueos de recinto y registro de eventos oficiales directos.',
      configurar: () => {
        cambiarUsuario('usr-subdireccion');
        cambiarRolActivo('subdireccion');
        navegarA('/subdireccion');
        mostrarNotificacion('Escenario C Activado', 'Panel operativo de Subdirección', 'informacion');
      }
    },
    {
      id: 'D',
      titulo: 'Escenario D: Editor de Arreglos y Versión Final 1:1',
      descripcion: 'Diseño de butacas (Asistente, VIP, Bloqueado), comparación de borradores y checklist previo a publicación.',
      configurar: () => {
        cambiarUsuario('usr-silva');
        cambiarRolActivo('organizador');
        navegarA('/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos');
        mostrarNotificacion('Escenario D Activado', 'Editor de Arreglos de Asientos', 'informacion');
      }
    },
    {
      id: 'E',
      titulo: 'Escenario E: Taquilla Digital sin Cobro (Apartado 10 min)',
      descripcion: 'Selección de butaca interactiva, temporizador de apartado de 10 minutos y confirmación directa de boleto.',
      configurar: () => {
        cambiarUsuario('usr-carlos');
        cambiarRolActivo('asistente');
        navegarA('/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1');
        mostrarNotificacion('Escenario E Activado', 'Taquilla y mapa interactivo con cronómetro', 'informacion');
      }
    },
    {
      id: 'F',
      titulo: 'Escenario F: Control de Acceso (Check-In) y Alerta de Duplicidad',
      descripcion: 'Escáner QR para Staff con alertas visuales: válido, cancelado y alerta crítica de "Boleto ya utilizado".',
      configurar: () => {
        cambiarUsuario('usr-andrea');
        cambiarRolActivo('staff');
        navegarA('/staff');
        mostrarNotificacion('Escenario F Activado', 'Control de acceso móvil para Staff', 'informacion');
      }
    },
    {
      id: 'G',
      titulo: 'Escenario G: Monitor de Ocupabilidad en Vivo',
      descripcion: 'Mapa de butacas en tiempo real diferenciando ocupados con ingreso confirmado, reservados en camino, VIPs y libres.',
      configurar: () => {
        cambiarUsuario('usr-andrea');
        cambiarRolActivo('staff');
        navegarA('/staff/ocupacion?eventId=evt-simposio-ia&dateId=fec-simposio-d1');
        mostrarNotificacion('Escenario G Activado', 'Monitor de Ocupabilidad en Vivo', 'informacion');
      }
    }
  ];

  const ejecutarEscenario = (esc: typeof escenarios[0]) => {
    setEscenarioActivo(esc.id);
    esc.configurar();
  };

  return (
    <div className="fixed bottom-3 left-4 z-40 no-print">
      <div className="bg-white border border-neutral-300 rounded-xl shadow-xl overflow-hidden transition-all duration-200">
        {/* Barra superior desplegable */}
        <div
          onClick={() => setEstaAbierto(!estaAbierto)}
          className="flex items-center justify-between px-3.5 py-2 bg-neutral-900 text-white cursor-pointer select-none hover:bg-neutral-800 transition-colors gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Guía de Evaluación Docente</span>
            {escenarioActivo && (
              <span className="bg-[#7a132b] text-[10px] px-1.5 py-0.5 rounded font-mono">
                {escenarioActivo}
              </span>
            )}
          </div>
          <button className="text-neutral-400 hover:text-white p-0.5">
            {estaAbierto ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Panel con lista de escenarios */}
        {estaAbierto && (
          <div className="p-3 w-80 sm:w-96 max-h-[70vh] overflow-y-auto divide-y divide-neutral-100 text-xs">
            <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-200 mb-2">
              <span className="text-[10px] font-bold text-[#7a132b] uppercase tracking-wider block">
                Entregable Sprint 3: Identidad y Perfiles
              </span>
              <div className="grid grid-cols-2 gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => navegarA('/login')}
                  className="px-2 py-1 bg-white border border-neutral-300 rounded text-[10px] font-medium text-neutral-700 hover:bg-neutral-100 text-left truncate"
                >
                  🔑 Login / Cierre
                </button>
                <button
                  type="button"
                  onClick={() => navegarA('/registro')}
                  className="px-2 py-1 bg-white border border-neutral-300 rounded text-[10px] font-medium text-neutral-700 hover:bg-neutral-100 text-left truncate"
                >
                  📝 Registro IPN/Ext
                </button>
                <button
                  type="button"
                  onClick={() => navegarA('/recuperar-password')}
                  className="px-2 py-1 bg-white border border-neutral-300 rounded text-[10px] font-medium text-neutral-700 hover:bg-neutral-100 text-left truncate"
                >
                  🔄 Recuperar Clave
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cambiarUsuario('usr-admin');
                    cambiarRolActivo('admin');
                    navegarA('/admin');
                  }}
                  className="px-2 py-1 bg-white border border-neutral-300 rounded text-[10px] font-medium text-neutral-700 hover:bg-neutral-100 text-left truncate"
                >
                  ⚙️ Roles & Staff Eventos
                </button>
              </div>
            </div>

            <div className="pb-2 text-[11px] text-neutral-500">
              Selecciona uno de los 7 escenarios de evaluación especificados para la entrega de Análisis y Diseño de Sistemas:
            </div>
            {escenarios.map((esc) => (
              <div key={esc.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-900">{esc.titulo}</span>
                  <button
                    onClick={() => ejecutarEscenario(esc)}
                    className="flex items-center gap-1 px-2 py-1 bg-[#7a132b] hover:bg-[#630f23] text-white rounded font-medium text-[11px] transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Iniciar</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-600 leading-snug">{esc.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
