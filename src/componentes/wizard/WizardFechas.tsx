import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  Pencil,
  Building2,
  SlidersHorizontal
} from 'lucide-react';
import { CalendarioRecinto } from '../calendario/CalendarioRecinto';
import { ElementoFechaSolicitada, ModalidadAsistencia, Recinto } from '../../tipos';

interface PropiedadesWizardFechas {
  fechas: ElementoFechaSolicitada[];
  listaRecintos: Recinto[];
  cadenaLimite7Dias: string;
  modalidad: ModalidadAsistencia;
  setModalidad: (val: ModalidadAsistencia) => void;
  asistenciaEstimada: number;
  setAsistenciaEstimada: (val: number) => void;
  especificaciones: string;
  setEspecificaciones: (val: string) => void;
  onActualizar: (id: string, campo: keyof ElementoFechaSolicitada, valor: string) => void;
  onAgregar: () => void;
  onEliminar: (id: string) => void;
}

// Pasos dentro de cada día
type Paso = 'fecha' | 'recinto' | 'horario' | 'especificaciones';
const PASOS: Paso[] = ['fecha', 'recinto', 'horario', 'especificaciones'];

const INFO_PASOS: Record<Paso, { etiqueta: string; icono: React.ReactNode }> = {
  fecha: { etiqueta: 'Fecha', icono: <Calendar className="w-3.5 h-3.5" /> },
  recinto: { etiqueta: 'Recinto', icono: <Building2 className="w-3.5 h-3.5" /> },
  horario: { etiqueta: 'Horario', icono: <Clock className="w-3.5 h-3.5" /> },
  especificaciones: { etiqueta: 'Especificaciones', icono: <SlidersHorizontal className="w-3.5 h-3.5" /> }
};



const IndicadorPasos: React.FC<{ pasoActual: Paso }> = ({ pasoActual }) => {
  const indiceActual = PASOS.indexOf(pasoActual);
  return (
    <div className="flex items-center gap-0 mb-3.5">
      {PASOS.map((paso, i) => {
        const completado = i < indiceActual;
        const activo = i === indiceActual;
        return (
          <React.Fragment key={paso}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all text-xs font-bold ${
                  completado
                    ? 'bg-[#7a132b] border-[#7a132b] text-white'
                    : activo
                    ? 'bg-white border-[#7a132b] text-[#7a132b]'
                    : 'bg-white border-neutral-300 text-neutral-400'
                }`}
              >
                {completado ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  activo ? 'text-[#7a132b]' : completado ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                {INFO_PASOS[paso].etiqueta}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 mx-1 transition-all ${
                  i < indiceActual ? 'bg-[#7a132b]' : 'bg-neutral-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};


const TarjetaDiaCompletado: React.FC<{
  fecha: ElementoFechaSolicitada;
  indice: number;
  nombreRecinto: string;
  esMenor7Dias: boolean;
  puedeEliminar: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}> = ({ fecha, indice, nombreRecinto, esMenor7Dias, puedeEliminar, onEditar, onEliminar }) => (
  <div
    className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
      esMenor7Dias
        ? 'border-amber-300 bg-amber-50/60'
        : 'border-emerald-200 bg-emerald-50/50'
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
          esMenor7Dias ? 'bg-amber-100 text-amber-800' : 'bg-[#7a132b] text-white'
        }`}
      >
        {indice + 1}
      </div>
      <div className="space-y-0.5">
        <p className="font-semibold text-neutral-800">{fecha.fecha}</p>
        <p className="text-neutral-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {fecha.horaInicio} – {fecha.horaFin}
          <span className="mx-1 text-neutral-300">·</span>
          <MapPin className="w-3 h-3" />
          {nombreRecinto}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onEditar}
        className="p-1.5 rounded-lg text-neutral-400 hover:text-[#7a132b] hover:bg-white border border-transparent hover:border-neutral-200 transition-all cursor-pointer"
        title="Editar este día"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {puedeEliminar && (
        <button
          type="button"
          onClick={onEliminar}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-rose-200 transition-all cursor-pointer"
          title="Eliminar este día"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);



export const WizardFechas: React.FC<PropiedadesWizardFechas> = ({
  fechas,
  listaRecintos,
  cadenaLimite7Dias,
  modalidad,
  setModalidad,
  asistenciaEstimada,
  setAsistenciaEstimada,
  especificaciones,
  setEspecificaciones,
  onActualizar,
  onAgregar,
  onEliminar
}) => {
  // Índice del día que se está editando ahora mismo (-1 = ninguno)
  const [diaEditando, setDiaEditando] = useState<number>(0);
  // Paso actual dentro del wizard de ese día
  const [pasoActual, setPasoActual] = useState<Paso>('fecha');
  // Días que ya fueron configurados completamente
  const [diasCompletos, setDiasCompletos] = useState<Set<number>>(new Set());

  const fechaActual = fechas[diaEditando];

  // ── Navegar entre pasos ──
  const irAlSiguientePaso = () => {
    const indice = PASOS.indexOf(pasoActual);
    if (indice < PASOS.length - 1) {
      setPasoActual(PASOS[indice + 1]);
    }
  };

  const irAlPasoAnterior = () => {
    const indice = PASOS.indexOf(pasoActual);
    if (indice > 0) {
      setPasoActual(PASOS[indice - 1]);
    }
  };

  // ── Guardar y cerrar el wizard de este día ──
  const guardarDia = () => {
    setDiasCompletos((prev) => new Set(prev).add(diaEditando));
    setDiaEditando(-1);
    setPasoActual('fecha');
  };

  // ── Editar un día ya completado ──
  const editarDia = (indice: number) => {
    setDiasCompletos((prev) => {
      const next = new Set(prev);
      next.delete(indice);
      return next;
    });
    setDiaEditando(indice);
    setPasoActual('fecha');
  };

  // ── Añadir un nuevo día ──
  const agregarNuevoDia = () => {
    onAgregar();
    // El nuevo día queda al final
    const nuevoIndice = fechas.length; // aún no se ha actualizado el array
    setDiaEditando(nuevoIndice);
    setPasoActual('fecha');
  };

  // ── Eliminar día ──
  const eliminarDia = (indice: number) => {
    onEliminar(fechas[indice].id);
    setDiasCompletos((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < indice) next.add(i);
        else if (i > indice) next.add(i - 1);
      });
      return next;
    });
    if (diaEditando === indice) {
      setDiaEditando(-1);
      setPasoActual('fecha');
    } else if (diaEditando > indice) {
      setDiaEditando(diaEditando - 1);
    }
  };

  // ── Validación de paso "Siguiente" ──
  const puedeContinuar = (): boolean => {
    if (!fechaActual) return false;
    if (pasoActual === 'fecha') return !!fechaActual.fecha;
    if (pasoActual === 'recinto') return !!fechaActual.idRecinto;
    if (pasoActual === 'horario')
      return !!fechaActual.horaInicio && !!fechaActual.horaFin && fechaActual.horaFin > fechaActual.horaInicio;
    if (pasoActual === 'especificaciones') return true;
    return false;
  };

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((r) => r.id === idRecinto);
    return r ? r.nombre : '—';
  };


  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7a132b]" />
            Crear una actividad
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Una actividad está conformada por día, recinto, hora de inicio y fin.
            Un evento necesita al menos una actividad.
          </p>
        </div>
        {diaEditando === -1 && (
          <button
            type="button"
            onClick={agregarNuevoDia}
            className="px-3 py-1.5 boton-primario rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Día {fechas.length + 1}</span>
          </button>
        )}
      </div>

      {/* ── Lista de días ya completados ── */}
      {fechas.length > 0 && (
        <div className="space-y-2">
          {fechas.map((f, i) => {
            if (!diasCompletos.has(i) && i !== diaEditando) {
              // Día pendiente de configurar (aún no abierto)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => editarDia(i)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-xs text-neutral-500 hover:border-[#7a132b] hover:text-[#7a132b] transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg border-2 border-dashed border-neutral-300 flex items-center justify-center font-bold text-sm text-neutral-400">
                    {i + 1}
                  </div>
                  <span>Día {i + 1} sin configurar — haz clic para completar</span>
                </button>
              );
            }
            if (diasCompletos.has(i)) {
              return (
                <TarjetaDiaCompletado
                  key={f.id}
                  fecha={f}
                  indice={i}
                  nombreRecinto={obtenerNombreRecinto(f.idRecinto)}
                  esMenor7Dias={!!f.fecha && f.fecha < cadenaLimite7Dias}
                  puedeEliminar={fechas.length > 1}
                  onEditar={() => editarDia(i)}
                  onEliminar={() => eliminarDia(i)}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      {/* ── Panel del wizard (visible cuando hay un día activo) ── */}
      {diaEditando !== -1 && fechaActual && (
        <div className="border border-[#7a132b]/20 rounded-xl overflow-hidden">
          {/* Cabecera del día activo */}
          <div className="bg-[#7a132b] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                Día {diaEditando + 1}
              </span>
              <span className="text-white/80 text-xs">
                {INFO_PASOS[pasoActual].etiqueta}
              </span>
            </div>
            {fechaActual.fecha && (
              <span className="text-white/70 text-[11px] font-mono">{fechaActual.fecha}</span>
            )}
          </div>

          {/* Contenido del wizard */}
          <div className="p-4 sm:p-5">
            <IndicadorPasos pasoActual={pasoActual} />

            {/* ── PASO 1: FECHA ── */}
            {pasoActual === 'fecha' && (
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">
                  Selecciona el día en el calendario. Los días ocupados o bloqueados aparecen marcados.
                </p>
                <CalendarioRecinto
                  idRecinto={fechaActual.idRecinto || listaRecintos[0]?.id || ''}
                  fechaSeleccionada={fechaActual.fecha}
                  alSeleccionarFecha={(f) => onActualizar(fechaActual.id, 'fecha', f)}
                  horaInicio={fechaActual.horaInicio}
                  horaFin={fechaActual.horaFin}
                />
              </div>
            )}

            {/* ── PASO 2: RECINTO ── */}
            {pasoActual === 'recinto' && (
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">
                  Elige el espacio físico para el{' '}
                  <span className="font-semibold text-neutral-700">{fechaActual.fecha}</span>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {listaRecintos.map((r) => {
                    const seleccionado = fechaActual.idRecinto === r.id;
                    const iconoTipo: Record<string, string> = {
                      auditorio: '🎭',
                      sala: '🪑',
                      laboratorio: '🖥️'
                    };
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onActualizar(fechaActual.id, 'idRecinto', r.id)}
                        className={`text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          seleccionado
                            ? 'border-[#7a132b] bg-[#7a132b]/5'
                            : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{iconoTipo[r.tipo] || '🏛️'}</span>
                            <div>
                              <p className={`text-xs font-bold ${seleccionado ? 'text-[#7a132b]' : 'text-neutral-800'}`}>
                                {r.nombre}
                              </p>
                              <p className="text-[10px] text-neutral-500 capitalize">{r.tipo} · {r.capacidad} lugares</p>
                            </div>
                          </div>
                          {seleccionado && (
                            <div className="w-5 h-5 bg-[#7a132b] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-1.5 line-clamp-1">{r.ubicacion}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── PASO 3: HORARIO ── */}
            {pasoActual === 'horario' && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-500">
                  Define el rango de horas para el{' '}
                  <span className="font-semibold text-neutral-700">{fechaActual.fecha}</span> en{' '}
                  <span className="font-semibold text-neutral-700">{obtenerNombreRecinto(fechaActual.idRecinto)}</span>.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-2">
                      Hora de inicio *
                    </label>
                    <input
                      type="time"
                      required
                      value={fechaActual.horaInicio}
                      onChange={(e) => onActualizar(fechaActual.id, 'horaInicio', e.target.value)}
                      className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:border-[#7a132b]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-2">
                      Hora de fin *
                    </label>
                    <input
                      type="time"
                      required
                      value={fechaActual.horaFin}
                      onChange={(e) => onActualizar(fechaActual.id, 'horaFin', e.target.value)}
                      className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:border-[#7a132b]"
                    />
                  </div>
                </div>

                {/* Duración calculada */}
                {fechaActual.horaInicio && fechaActual.horaFin && fechaActual.horaFin > fechaActual.horaInicio && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Duración:{' '}
                      <span className="font-bold">
                        {(() => {
                          const [h1, m1] = fechaActual.horaInicio.split(':').map(Number);
                          const [h2, m2] = fechaActual.horaFin.split(':').map(Number);
                          const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
                          const horas = Math.floor(mins / 60);
                          const minutos = mins % 60;
                          return horas > 0
                            ? `${horas}h${minutos > 0 ? ` ${minutos}min` : ''}`
                            : `${minutos}min`;
                        })()}
                      </span>
                    </span>
                  </div>
                )}

                {/* Advertencia si fin <= inicio */}
                {fechaActual.horaInicio && fechaActual.horaFin && fechaActual.horaFin <= fechaActual.horaInicio && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    <Clock className="w-4 h-4 shrink-0" />
                    La hora de fin debe ser posterior a la de inicio.
                  </div>
                )}
              </div>
            )}

            {/* ── PASO 4: ESPECIFICACIONES ── */}
            {pasoActual === 'especificaciones' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <p className="text-xs text-neutral-500">
                  Configura los detalles de acceso, aforo y requerimientos específicos para el{' '}
                  <span className="font-semibold text-neutral-700">{fechaActual.fecha}</span>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Modalidad de Asistencia *
                    </label>
                    <select
                      value={modalidad}
                      onChange={(e) => setModalidad(e.target.value as ModalidadAsistencia)}
                      className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-xs focus:outline-none focus:border-[#7a132b]"
                    >
                      <option value="controlado">Acceso Controlado (QR con Butaca)</option>
                      <option value="libre">Acceso Libre (Sin boleto)</option>
                      <option value="registro">Registro de Asistencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Aforo Estimado *
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      value={asistenciaEstimada}
                      onChange={(e) => setAsistenciaEstimada(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-xs focus:outline-none focus:border-[#7a132b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Descripción de Especificaciones / Requerimientos
                  </label>
                  <textarea
                    rows={3}
                    value={especificaciones}
                    onChange={(e) => setEspecificaciones(e.target.value)}
                    placeholder="Detalla requerimientos especiales, equipamiento necesario (proyector, audio, micrófonos), logística o necesidades técnicas particulares..."
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-xs focus:outline-none focus:border-[#7a132b]"
                  />
                </div>
              </div>
            )}

            {/* ── Botones de navegación ── */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={irAlPasoAnterior}
                disabled={pasoActual === 'fecha'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              {pasoActual !== 'especificaciones' ? (
                <button
                  type="button"
                  onClick={irAlSiguientePaso}
                  disabled={!puedeContinuar()}
                  className="flex items-center gap-1.5 px-4 py-2 boton-primario rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={guardarDia}
                  disabled={!puedeContinuar()}
                  className="flex items-center gap-1.5 px-4 py-2 boton-primario rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  Guardar Día {diaEditando + 1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
