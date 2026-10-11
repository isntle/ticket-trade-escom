import React, { useState } from 'react';
import {
  Monitor,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  BookOpen,
  AlertTriangle,
  Building,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { useDatos } from '../../contextos/DatosContexto';
import { Recinto, OcupacionAgenda } from '../../tipos';
import { VentanaModal } from '../ui/VentanaModal';

interface PropiedadesVisorDisponibilidadRecintos {
  fechaSeleccionada?: string;
  alSeleccionarRecinto?: (idRecinto: string) => void;
  recintoActivoId?: string;
}

export const VisorDisponibilidadRecintos: React.FC<PropiedadesVisorDisponibilidadRecintos> = ({
  fechaSeleccionada = '2026-10-15',
  alSeleccionarRecinto,
  recintoActivoId
}) => {
  const { listaRecintos, obtenerOcupacionesRecinto } = useDatos();

  // Fecha de consulta seleccionada
  const [fechaConsulta, setFechaConsulta] = useState(fechaSeleccionada);
  const [horaInicioConsulta, setHoraInicioConsulta] = useState('10:00');
  const [horaFinConsulta, setHoraFinConsulta] = useState('13:00');

  // Popover / Detalle de ocupación seleccionada
  const [ocupacionDetalle, setOcupacionDetalle] = useState<{
    item: OcupacionAgenda;
    recinto: Recinto;
  } | null>(null);

  // Escala horaria del día ESCOM (08:00 a 20:00 = 12 horas)
  const horasDelDia = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  // Separar recintos oficiales
  const recintosOficiales = listaRecintos.filter(
    (r) => r.id !== 'rec-lab-computo-3' // omitir alias duplicado
  );

  // Convertir formato "HH:MM" a valor numérico en horas (ej: "09:30" => 9.5)
  const convertirHoraADecimal = (hora: string) => {
    const [h, m] = hora.split(':').map(Number);
    return h + (m || 0) / 60;
  };

  // Evaluar conflicto en el horario de consulta
  const evaluarEstadoEnHorario = (idRecinto: string) => {
    const ocupaciones = obtenerOcupacionesRecinto(idRecinto, fechaConsulta);
    const conflicto = ocupaciones.find(
      (o) => horaInicioConsulta < o.horaFin && horaFinConsulta > o.horaInicio
    );

    if (conflicto) {
      return {
        disponible: false,
        ocupacion: conflicto,
        etiqueta:
          conflicto.tipo === 'clase'
            ? 'Clase Regular'
            : conflicto.tipo === 'bloqueo'
            ? 'Mantenimiento'
            : 'Evento Autorizado',
        detalle: `${conflicto.titulo} (${conflicto.horaInicio} - ${conflicto.horaFin})`
      };
    }

    return {
      disponible: true,
      etiqueta: 'Disponible',
      detalle: 'Espacio libre y compatible en el horario consultado'
    };
  };

  // Fechas de prueba rápidas para facilitar la evaluación
  const fechasRapidas = [
    { fecha: '2026-10-15', label: '15 Oct (Simposio IA)' },
    { fecha: '2026-10-16', label: '16 Oct (Día 2)' },
    { fecha: '2026-10-20', label: '20 Oct (Feria Empleo)' },
    { fecha: '2026-10-22', label: '22 Oct (Taller DevOps)' },
    { fecha: '2026-10-24', label: '24 Oct (Hackathon Lab 3)' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
      {/* ========================================================================= */}
      {/* 1. CABECERA OPERACIONAL CON SELECTOR Y FECHAS RÁPIDAS                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
              Agenda Institucional de Espacios Físicos
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              Timeline Operacional ESCOM
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            Matriz Horaria Multi-Recinto (08:00 a 20:00 hrs)
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cotejo en tiempo real de eventos autorizados, clases curriculares en laboratorios y bloqueos de mantenimiento.
          </p>
        </div>

        {/* Controles de Selección de Fecha y Rango Horario */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <input
              type="date"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              className="bg-transparent font-bold text-neutral-900 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <input
              type="time"
              value={horaInicioConsulta}
              onChange={(e) => setHoraInicioConsulta(e.target.value)}
              className="bg-transparent font-medium text-neutral-800 text-xs focus:outline-none"
            />
            <span className="text-neutral-400 text-xs">a</span>
            <input
              type="time"
              value={horaFinConsulta}
              onChange={(e) => setHoraFinConsulta(e.target.value)}
              className="bg-transparent font-medium text-neutral-800 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Píldoras de Acceso Rápido a Fechas de Demostración */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0">
          Fechas Clave:
        </span>
        {fechasRapidas.map((item) => (
          <button
            key={item.fecha}
            type="button"
            onClick={() => setFechaConsulta(item.fecha)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              fechaConsulta === item.fecha
                ? 'bg-[#7a132b] text-white shadow-2xs font-bold'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 2. TIMELINE HORIZONTAL DE RECINTOS (GANTT DE OCUPACIÓN)                  */}
      {/* ========================================================================= */}
      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50/30">
        {/* Cabecera del Timeline (Regla de Horas 08:00 - 20:00) */}
        <div className="grid grid-cols-12 border-b border-neutral-200 bg-neutral-100/80 text-[10px] font-mono text-neutral-500 text-center py-2">
          <div className="col-span-3 text-left pl-4 font-bold text-neutral-700 tracking-wider uppercase">
            Recinto ESCOM
          </div>
          <div className="col-span-9 grid grid-cols-12 pr-4 text-neutral-500">
            {horasDelDia.slice(0, 12).map((h) => (
              <span key={h} className="border-l border-neutral-200/80 first:border-0">
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>

        {/* Pistas Horizontales por Cada Recinto */}
        <div className="divide-y divide-neutral-200">
          {recintosOficiales.map((recinto) => {
            const ocupaciones = obtenerOcupacionesRecinto(recinto.id, fechaConsulta);
            const esSeleccionado = recintoActivoId === recinto.id;

            return (
              <div
                key={recinto.id}
                className={`grid grid-cols-12 items-center py-3.5 transition-colors ${
                  esSeleccionado ? 'bg-[#7a132b]/5' : 'hover:bg-neutral-50/70'
                }`}
              >
                {/* Etiqueta del Recinto */}
                <div
                  onClick={() => alSeleccionarRecinto && alSeleccionarRecinto(recinto.id)}
                  className="col-span-3 pl-4 pr-2 cursor-pointer"
                >
                  <div className="font-bold text-xs text-neutral-900 hover:text-[#7a132b] flex items-center gap-1.5 transition-colors">
                    {recinto.tipo === 'auditorio' ? (
                      <Building className="w-3.5 h-3.5 text-[#7a132b] shrink-0" />
                    ) : recinto.tipo === 'laboratorio' ? (
                      <Monitor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span className="truncate">{recinto.nombre}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    {recinto.capacidad} cupos · {recinto.ubicacion}
                  </div>
                </div>

                {/* Área de la Línea de Tiempo (08:00 a 20:00 = 12 horas) */}
                <div className="col-span-9 relative h-10 mr-4 bg-white rounded-xl border border-neutral-200/80 shadow-2xs overflow-hidden flex items-center">
                  {/* Líneas guía verticales para cada hora */}
                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="border-r border-neutral-100 h-full" />
                    ))}
                  </div>

                  {/* Bloques de Ocupación Reales */}
                  {ocupaciones.map((ocu) => {
                    const inicioDec = Math.max(8, convertirHoraADecimal(ocu.horaInicio));
                    const finDec = Math.min(20, convertirHoraADecimal(ocu.horaFin));
                    const duracion = Math.max(0.5, finDec - inicioDec);

                    const posIzquierda = ((inicioDec - 8) / 12) * 100;
                    const ancho = (duracion / 12) * 100;

                    let estiloFondo = 'bg-neutral-800 text-white border-neutral-900';
                    let etiquetaTipo = 'Evento';

                    if (ocu.tipo === 'clase') {
                      estiloFondo = 'bg-slate-700 text-white border-slate-800';
                      etiquetaTipo = 'Clase';
                    } else if (ocu.tipo === 'bloqueo') {
                      estiloFondo =
                        'bg-amber-600 text-white border-amber-700 repeating-linear-gradient';
                      etiquetaTipo = 'Mantenimiento';
                    } else if (ocu.tipo === 'actividad_institucional') {
                      estiloFondo = 'bg-[#7a132b] text-white border-[#5a0d1f]';
                      etiquetaTipo = 'Institucional';
                    }

                    return (
                      <div
                        key={ocu.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOcupacionDetalle({ item: ocu, recinto });
                        }}
                        style={{
                          left: `${posIzquierda}%`,
                          width: `${ancho}%`
                        }}
                        title={`${ocu.titulo} (${ocu.horaInicio} - ${ocu.horaFin})`}
                        className={`absolute h-7 rounded-lg border text-[10px] font-semibold px-2 flex items-center justify-between overflow-hidden shadow-2xs cursor-pointer hover:brightness-110 transition-transform active:scale-98 ${estiloFondo}`}
                      >
                        <span className="truncate font-sans tracking-tight">
                          {ocu.tipo === 'clase' ? ocu.titulo.replace('Clase: ', '') : ocu.titulo}
                        </span>
                        <span className="text-[9px] font-mono opacity-80 shrink-0 ml-1">
                          {ocu.horaInicio}
                        </span>
                      </div>
                    );
                  })}

                  {/* Indicador de libre si no hay eventos */}
                  {ocupaciones.length === 0 && (
                    <span className="text-[10px] text-neutral-300 font-mono pl-4 italic">
                      Completamente disponible durante todo el día
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SIMBOLOGÍA VISUAL DEL TIMELINE                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 border-t border-neutral-100 text-neutral-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-neutral-800" />
            <span className="font-medium text-neutral-800">Eventos Oficiales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-700" />
            <span className="font-medium text-neutral-800">Clases Curriculares (Labs)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-600" />
            <span className="font-medium text-neutral-800">Bloqueos de Mantenimiento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#7a132b]" />
            <span className="font-medium text-neutral-800">Actividades Rectoría / Subdirección</span>
          </div>
        </div>

        <div className="text-[11px] text-neutral-400 font-mono">
          Regla: 30 minutos de amortiguamiento entre sesiones consecutivas
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL DETALLE DE OCUPACIÓN AL HACER CLIC EN UN BLOQUE                 */}
      {/* ========================================================================= */}
      {ocupacionDetalle && (
        <VentanaModal
          estaAbierto={Boolean(ocupacionDetalle)}
          alCerrar={() => setOcupacionDetalle(null)}
          titulo={ocupacionDetalle.item.titulo}
          subtitulo={`Registro de ocupación en ${ocupacionDetalle.recinto.nombre}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Fecha de Ejecución
                </span>
                <span className="font-mono font-bold text-neutral-900 text-sm">
                  {ocupacionDetalle.item.fecha}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Horario de Reserva
                </span>
                <span className="font-mono font-bold text-neutral-900 text-sm">
                  {ocupacionDetalle.item.horaInicio} a {ocupacionDetalle.item.horaFin} hrs
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Tipo de Ocupación
                </span>
                <span className="capitalize font-semibold text-neutral-800">
                  {ocupacionDetalle.item.tipo}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Responsable
                </span>
                <span className="font-semibold text-neutral-800">
                  {ocupacionDetalle.item.responsable || 'Administración de ESCOM'}
                </span>
              </div>
            </div>

            {ocupacionDetalle.item.descripcion && (
              <div className="p-3 rounded-xl bg-white border border-neutral-200 text-neutral-700 leading-relaxed">
                <span className="font-bold text-neutral-900 block mb-1">Descripción:</span>
                {ocupacionDetalle.item.descripcion}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setOcupacionDetalle(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold cursor-pointer hover:bg-neutral-800"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </VentanaModal>
      )}
    </div>
  );
};
