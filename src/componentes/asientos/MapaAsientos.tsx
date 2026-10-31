import React, { useState, useRef } from 'react';
import {
  Ban,
  Check,
  Star,
  Monitor,
  Laptop,
  Users,
  Shield,
  Layers,
  Sparkles,
  Cpu,
  Tv,
  Plus,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { ConfiguracionAsiento, CategoriaAsiento, TipoRecinto } from '../../tipos';

interface PropiedadesMapaAsientos {
  asientos: ConfiguracionAsiento[];
  modo?: 'editor' | 'asistente' | 'ocupacion' | 'solo_lectura';
  tipoRecinto?: TipoRecinto | string;
  idAsientoSeleccionado?: string;
  idsAsientosApartados?: string[];
  idsAsientosReservados?: string[];
  idsAsientosCheckIn?: string[];
  alSeleccionarAsiento?: (asiento: ConfiguracionAsiento) => void;
  alCambiarCategoriaAsiento?: (idAsiento: string, nuevaCategoria: CategoriaAsiento) => void;
  alAlternarBloqueoAsiento?: (idAsiento: string) => void;
  alEliminarAsientoModular?: (idAsiento: string) => void;
  permiteEliminar?: boolean; // Sala 14: true (modular), Auditorio/Lab: false
}

export const MapaAsientos: React.FC<PropiedadesMapaAsientos> = ({
  asientos,
  modo = 'asistente',
  tipoRecinto = 'auditorio',
  idAsientoSeleccionado,
  idsAsientosApartados = [],
  idsAsientosReservados = [],
  idsAsientosCheckIn = [],
  alSeleccionarAsiento,
  permiteEliminar = false
}) => {
  // Modalidad de escala: 'ajustar' (ajuste compacto para caber en desktop sin scroll) o 'amplio' (tamaño táctil espacioso)
  const [modoAjuste, setModoAjuste] = useState<'ajustar' | 'amplio'>('ajustar');
  const [nivelZoom, setNivelZoom] = useState<number>(1);
  const contenedorScrollRef = useRef<HTMLDivElement>(null);

  // Detectar tipología espacial del recinto
  const esLaboratorio =
    tipoRecinto === 'laboratorio' ||
    asientos.some(
      (a) => a.equipoComputo || a.id.includes('lab') || a.id.includes('estacion')
    );

  const esSalaModular = tipoRecinto === 'sala' || permiteEliminar;
  const esAuditorio = !esLaboratorio && !esSalaModular;

  // Agrupar los lugares por fila o mesa
  const filasAgrupadas = asientos.reduce<Record<string, ConfiguracionAsiento[]>>((acc, asiento) => {
    if (!acc[asiento.fila]) {
      acc[asiento.fila] = [];
    }
    acc[asiento.fila].push(asiento);
    return acc;
  }, {});

  // Ordenar cada fila por número correlativo
  Object.keys(filasAgrupadas).forEach((claveFila) => {
    filasAgrupadas[claveFila].sort((a, b) => a.numero - b.numero);
  });

  const clavesFilasOrdenadas = Object.keys(filasAgrupadas).sort();

  // Dimensionamiento visual adaptativo de botones
  // En Auditorio 'ajustar': tamaño optimizado (20-24px) para caber al 100% en pantallas medianas y de escritorio sin scrollbar
  const claseTamañoBotonAuditorio =
    modoAjuste === 'amplio'
      ? 'w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 text-[9px] sm:text-[10px]'
      : 'w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-[8px] sm:text-[8.5px] md:text-[9px]';

  const claseTamañoBotonLab = 'w-8 h-8 sm:w-9 sm:h-9 text-[9px] sm:text-[10px]';
  const claseTamañoBotonSala = 'w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 text-xs';

  const claseTamañoBoton = esLaboratorio
    ? claseTamañoBotonLab
    : esAuditorio
    ? claseTamañoBotonAuditorio
    : claseTamañoBotonSala;

  // Anchos calculados para los bloques de asientos del Auditorio
  const anchoBloqueLateralAuditorio =
    modoAjuste === 'amplio'
      ? 'w-[195px] sm:w-[215px]'
      : 'w-[134px] sm:w-[145px] md:w-[152px]';

  const anchoBloqueCentralAuditorio =
    modoAjuste === 'amplio'
      ? 'w-[355px] sm:w-[385px]'
      : 'w-[242px] sm:w-[260px] md:w-[275px]';

  const manejarAumentarZoom = () => {
    setNivelZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 1.35));
  };

  const manejarDisminuirZoom = () => {
    setNivelZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.7));
  };

  const manejarRestablecerZoom = () => {
    setNivelZoom(1);
    if (contenedorScrollRef.current) {
      contenedorScrollRef.current.scrollLeft = 0;
    }
  };

  // Renderizador unitario de lugar según el modo operativo
  const renderizarElementoLugar = (lugar: ConfiguracionAsiento) => {
    // 1. Módulo modular suprimido (en Sala 14)
    if (lugar.estaEliminado) {
      return (
        <div
          onClick={() => modo === 'editor' && alSeleccionarAsiento && alSeleccionarAsiento(lugar)}
          title={`Espacio modular suprimido (${lugar.etiqueta}). Haz clic en el editor para reincorporar.`}
          className={`${claseTamañoBoton} shrink-0 rounded-md border border-dashed border-neutral-200 bg-neutral-50/40 flex items-center justify-center text-[10px] text-neutral-300 font-mono transition-all ${
            modo === 'editor'
              ? 'hover:border-[#7a132b] hover:bg-neutral-100 hover:text-neutral-600 cursor-pointer'
              : ''
          }`}
        >
          {modo === 'editor' ? <Plus className="w-3 h-3 text-neutral-400" /> : '·'}
        </div>
      );
    }

    // 2. Modo Asistente (Taquilla y Reserva)
    if (modo === 'asistente') {
      const estaSeleccionado = idAsientoSeleccionado === lugar.id;
      const estaApartado = idsAsientosApartados.includes(lugar.id);
      const estaReservado = idsAsientosReservados.includes(lugar.id);
      const noDisponible =
        lugar.estaBloqueado ||
        estaApartado ||
        estaReservado ||
        lugar.categoria === 'organizador' ||
        lugar.categoria === 'staff';

      let estiloBoton =
        'bg-white border-neutral-300 text-neutral-800 hover:border-[#7a132b] hover:shadow-2xs cursor-pointer';
      let textoAyuda = `${lugar.etiqueta} — Libre para reservar`;

      if (estaSeleccionado) {
        estiloBoton =
          'bg-[#7a132b] border-[#7a132b] text-white font-extrabold shadow-xs scale-105 ring-2 ring-[#7a132b]/25';
        textoAyuda = `${lugar.etiqueta} — Tu lugar seleccionado`;
      } else if (lugar.estaBloqueado) {
        estiloBoton =
          'bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed line-through opacity-70';
        textoAyuda = `${lugar.etiqueta} — Inhabilitado por mantenimiento o logística`;
      } else if (estaReservado) {
        estiloBoton =
          'bg-neutral-200 border-neutral-300 text-neutral-400 cursor-not-allowed opacity-80';
        textoAyuda = `${lugar.etiqueta} — Ocupado por otro asistente`;
      } else if (estaApartado) {
        estiloBoton =
          'bg-amber-100 border-amber-300 text-amber-800 animate-pulse cursor-not-allowed';
        textoAyuda = `${lugar.etiqueta} — En apartado temporal (2 min)`;
      } else if (lugar.categoria === 'vip') {
        estiloBoton =
          'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 cursor-pointer font-bold';
        textoAyuda = `${lugar.etiqueta} — Lugar VIP / Invitado de Honor`;
      } else if (lugar.categoria === 'organizador' || lugar.categoria === 'staff') {
        estiloBoton =
          'bg-indigo-50/70 border-indigo-200 text-indigo-300 cursor-not-allowed';
        textoAyuda = `${lugar.etiqueta} — Reservado para comité técnico o docente`;
      }

      return (
        <button
          type="button"
          disabled={noDisponible}
          onClick={() => alSeleccionarAsiento && alSeleccionarAsiento(lugar)}
          title={textoAyuda}
          className={`relative shrink-0 rounded-md border font-mono flex flex-col items-center justify-center transition-all ${claseTamañoBoton} ${estiloBoton}`}
        >
          {esLaboratorio && !estaSeleccionado && (
            <Monitor className="w-3 h-3 mb-0.5 opacity-60 shrink-0" />
          )}
          {estaSeleccionado ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <span className="font-bold leading-none">
              {esLaboratorio ? `PC${String(lugar.numero).padStart(2, '0')}` : lugar.numero}
            </span>
          )}
        </button>
      );
    }

    // 3. Modo Ocupación en Vivo (Control de Acceso / Staff)
    if (modo === 'ocupacion') {
      const tieneIngresoVerificado = idsAsientosCheckIn.includes(lugar.id);
      const estaReservado = idsAsientosReservados.includes(lugar.id);
      const estaBloqueado = lugar.estaBloqueado;

      let estiloInsignia = 'bg-white border-neutral-300 text-neutral-500';
      let textoAyuda = `${lugar.etiqueta} — Libre`;

      if (tieneIngresoVerificado) {
        estiloInsignia = 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs';
        textoAyuda = `${lugar.etiqueta} — Presente en sala`;
      } else if (estaReservado) {
        estiloInsignia = 'bg-sky-100 border-sky-300 text-sky-800 font-semibold';
        textoAyuda = `${lugar.etiqueta} — Boleto emitido`;
      } else if (estaBloqueado) {
        estiloInsignia = 'bg-neutral-100 border-neutral-200 text-neutral-300 line-through';
        textoAyuda = `${lugar.etiqueta} — Inhabilitado`;
      }

      return (
        <div
          title={textoAyuda}
          className={`shrink-0 rounded-md border font-mono flex flex-col items-center justify-center ${claseTamañoBoton} ${estiloInsignia}`}
        >
          {tieneIngresoVerificado ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : esLaboratorio ? (
            <>
              <Monitor className="w-3 h-3 mb-0.5 opacity-60 shrink-0" />
              <span className="text-[9px] font-bold">PC{String(lugar.numero).padStart(2, '0')}</span>
            </>
          ) : (
            lugar.numero
          )}
        </div>
      );
    }

    // 4. Modo Editor de Arreglos (Organizador y Subdirección)
    let estiloEditor =
      'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-500 hover:shadow-2xs cursor-pointer';
    let textoAyuda = `${lugar.etiqueta} — Asistente General`;

    if (lugar.estaBloqueado) {
      estiloEditor = 'bg-neutral-100 border-neutral-300 text-neutral-400 line-through';
      textoAyuda = `${lugar.etiqueta} — Bloqueada para logística`;
    } else if (lugar.categoria === 'vip') {
      estiloEditor =
        'bg-amber-100 border-amber-400 text-amber-900 font-bold shadow-2xs ring-1 ring-amber-300';
      textoAyuda = `${lugar.etiqueta} — Asignada VIP / Directivo`;
    } else if (lugar.categoria === 'organizador') {
      estiloEditor =
        'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold shadow-2xs ring-1 ring-indigo-300';
      textoAyuda = `${lugar.etiqueta} — Comité Organizador / Docente`;
    } else if (lugar.categoria === 'staff') {
      estiloEditor =
        'bg-purple-100 border-purple-400 text-purple-900 font-bold shadow-2xs ring-1 ring-purple-300';
      textoAyuda = `${lugar.etiqueta} — Soporte Técnico / Staff`;
    }

    return (
      <button
        type="button"
        onClick={() => alSeleccionarAsiento && alSeleccionarAsiento(lugar)}
        title={textoAyuda}
        className={`relative shrink-0 rounded-md border font-mono flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 ${claseTamañoBoton} ${estiloEditor}`}
      >
        {esLaboratorio && !lugar.estaBloqueado && (
          <Monitor className="w-3 h-3 mb-0.5 opacity-60 shrink-0" />
        )}

        {lugar.estaBloqueado ? (
          <Ban className="w-3 h-3 text-neutral-400" />
        ) : (
          <span className="font-bold leading-none">
            {esLaboratorio ? `PC${String(lugar.numero).padStart(2, '0')}` : lugar.numero}
          </span>
        )}

        {/* Punto distintivo de rol */}
        {lugar.categoria === 'vip' && !lugar.estaBloqueado && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 border border-white" />
        )}
        {lugar.categoria === 'organizador' && !lugar.estaBloqueado && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-600 border border-white" />
        )}
        {lugar.categoria === 'staff' && !lugar.estaBloqueado && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-600 border border-white" />
        )}
      </button>
    );
  };

  // Preparación de conjuntos para el Laboratorio de Cómputo (38 equipos según boceto ESCOM)
  const estacionesNorte = [1, 2, 3, 4, 5].map((m) =>
    asientos.filter((a) => a.fila === `N${m}` || a.etiqueta.includes(`N${m}`))
  );
  const mesasNorte = estacionesNorte.every((m) => m.length > 0)
    ? estacionesNorte
    : [
        asientos.slice(0, 2),
        asientos.slice(2, 4),
        asientos.slice(4, 6),
        asientos.slice(6, 8),
        asientos.slice(8, 10)
      ];

  const isla1SupRaw = asientos.filter((a) => a.fila === 'C1-A');
  const isla1InfRaw = asientos.filter((a) => a.fila === 'C1-B');
  const isla2SupRaw = asientos.filter((a) => a.fila === 'C2-A');
  const isla2InfRaw = asientos.filter((a) => a.fila === 'C2-B');
  const cabeceraRaw = asientos.filter((a) => a.fila === 'C3');

  const isla1Sup = isla1SupRaw.length === 4 ? isla1SupRaw : asientos.slice(10, 14);
  const isla1Inf = isla1InfRaw.length === 4 ? isla1InfRaw : asientos.slice(14, 18);
  const isla2Sup = isla2SupRaw.length === 4 ? isla2SupRaw : asientos.slice(18, 22);
  const isla2Inf = isla2InfRaw.length === 4 ? isla2InfRaw : asientos.slice(22, 26);
  const cabecera = cabeceraRaw.length === 2 ? cabeceraRaw : asientos.slice(26, 28);

  const estacionesSur = [1, 2, 3, 4, 5].map((m) =>
    asientos.filter((a) => a.fila === `S${m}` || a.etiqueta.includes(`S${m}`))
  );
  const mesasSur = estacionesSur.every((m) => m.length > 0)
    ? estacionesSur
    : [
        asientos.slice(28, 30),
        asientos.slice(30, 32),
        asientos.slice(32, 34),
        asientos.slice(34, 36),
        asientos.slice(36, 38)
      ];

  return (
    <div className="w-full bg-[#fdfdfc] rounded-2xl border border-neutral-200/80 p-3 sm:p-5 shadow-xs overflow-hidden select-none">
      {/* ========================================================================= */}
      {/* 1. CABECERA ESPACIAL SEGÚN EL RECINTO (Auditorio, Sala 14 o Laboratorio) */}
      {/* ========================================================================= */}
      {esAuditorio && (
        <div className="max-w-3xl mx-auto mb-5 text-center">
          {/* Escenario Físico del Auditorio con Curvatura y Presídium */}
          <div className="relative mx-auto w-4/5 max-w-xl mb-2">
            <div className="h-9 sm:h-10 bg-linear-to-b from-neutral-800 to-neutral-900 rounded-t-3xl border-t border-x border-neutral-700 shadow-md flex items-center justify-center px-4">
              <span className="text-[10px] font-mono tracking-widest text-neutral-300 font-bold uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ESCENARIO PRINCIPAL / PANTALLA PANORÁMICA AUDITORIO ESCOM
              </span>
            </div>
            {/* Tarima de presídium */}
            <div className="h-1.5 sm:h-2 w-3/5 mx-auto bg-[#7a132b] rounded-b-md shadow-xs opacity-90" />
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 tracking-wider uppercase block">
            Aforo Oficial: 242 Butacas Escalonadas · 11 Filas (A - K) · 3 Bloques con 2 Pasillos
          </span>

          {/* Marcadores de Bloques según el boceto arquitectónico y selector adaptativo */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
            <div className="bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Bloque Lateral Izq.</span>
              <span className="text-[#7a132b] font-black">62</span>
            </div>
            <div className="px-2 py-0.5 rounded border border-dashed border-neutral-300 text-[9px] text-neutral-400 bg-neutral-50/50 hidden sm:inline-block">
              Pasillo 1
            </div>
            <div className="bg-neutral-100 border border-neutral-200/80 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <span>Bloque Central</span>
              <span className="text-[#7a132b] font-black">118</span>
            </div>
            <div className="px-2 py-0.5 rounded border border-dashed border-neutral-300 text-[9px] text-neutral-400 bg-neutral-50/50 hidden sm:inline-block">
              Pasillo 2
            </div>
            <div className="bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Bloque Lateral Der.</span>
              <span className="text-[#7a132b] font-black">62</span>
            </div>

            {/* Selector de modo y zoom */}
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs ml-1 sm:ml-2">
              <button
                type="button"
                onClick={() => setModoAjuste(modoAjuste === 'ajustar' ? 'amplio' : 'ajustar')}
                title={
                  modoAjuste === 'ajustar'
                    ? 'Cambiar a tamaño amplio táctil'
                    : 'Ajustar al ancho de la pantalla'
                }
                className="px-2 py-1 rounded text-[9px] font-bold transition-colors flex items-center gap-1 cursor-pointer hover:bg-neutral-100 text-neutral-700"
              >
                {modoAjuste === 'ajustar' ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-[#7a132b]" />
                    <span>Modo Amplio</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-[#7a132b]" />
                    <span>Ajustar al Ancho</span>
                  </>
                )}
              </button>

              <div className="h-3.5 w-px bg-neutral-200 mx-0.5" />

              <button
                type="button"
                onClick={manejarDisminuirZoom}
                title="Alejar vista"
                className="p-1 hover:bg-neutral-100 rounded text-neutral-600 cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>

              <span className="text-[9px] font-mono font-bold text-neutral-500 px-1 min-w-[28px] text-center">
                {Math.round(nivelZoom * 100)}%
              </span>

              <button
                type="button"
                onClick={manejarAumentarZoom}
                title="Acercar vista"
                className="p-1 hover:bg-neutral-100 rounded text-neutral-600 cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>

              {nivelZoom !== 1 && (
                <button
                  type="button"
                  onClick={manejarRestablecerZoom}
                  title="Restablecer escala al 100%"
                  className="p-1 hover:bg-neutral-100 rounded text-[#7a132b] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {esSalaModular && (
        <div className="max-w-xl mx-auto mb-5 text-center">
          <div className="relative mx-auto w-3/4 max-w-md mb-2">
            <div className="h-8 bg-neutral-100 rounded-xl border border-neutral-300 border-dashed flex items-center justify-center px-4 shadow-2xs">
              <span className="text-[10px] font-mono tracking-wider text-neutral-700 font-bold uppercase flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-[#7a132b]" />
                MESA DE PRESÍDIUM Y PANTALLA INTERACTIVA (SALA 14)
              </span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 tracking-wider uppercase">
            Configuración Modular Flexible · Las mesas y plazas pueden reconfigurarse o suprimirse
          </span>
        </div>
      )}

      {esLaboratorio && (
        <div className="max-w-4xl mx-auto mb-5 text-center">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 pb-3 mb-2">
            <div className="text-left">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#7a132b]" />
                Distribución Oficial de Laboratorio de Cómputo
              </span>
              <span className="text-[10px] text-neutral-500 block">
                38 Estaciones de Cómputo · 10 Norte, 18 Centro, 10 Sur · Pizarrón y Estrado Docente a la derecha de PC-28
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold">
              <div className="bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                Zona Norte: <span className="text-[#7a132b]">10 PCs</span>
              </div>
              <div className="bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                Isla Central: <span className="text-[#7a132b]">18 PCs</span>
              </div>
              <div className="bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                Zona Sur: <span className="text-[#7a132b]">10 PCs</span>
              </div>

              {/* Controles de Zoom para Laboratorio */}
              <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={manejarDisminuirZoom}
                  title="Alejar vista"
                  className="p-1 hover:bg-neutral-100 rounded text-neutral-600 cursor-pointer"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="text-[9px] font-mono font-bold text-neutral-500 px-1">
                  {Math.round(nivelZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={manejarAumentarZoom}
                  title="Acercar vista"
                  className="p-1 hover:bg-neutral-100 rounded text-neutral-600 cursor-pointer"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                {nivelZoom !== 1 && (
                  <button
                    type="button"
                    onClick={manejarRestablecerZoom}
                    title="Restablecer escala al 100%"
                    className="p-1 hover:bg-neutral-100 rounded text-[#7a132b] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de desplazamiento horizontal en pantallas móviles */}
      <div className="sm:hidden text-[9px] text-neutral-400 font-medium text-center mb-2 flex items-center justify-center gap-1">
        <span>↔ Desliza horizontalmente para explorar el recinto completo</span>
      </div>

      {/* ========================================================================= */}
      {/* 2. MATRIZ ESPACIAL INTERACTIVA DE LUGARES                                */}
      {/* ========================================================================= */}
      {/* REGLA ARQUITECTÓNICA CLAVE:
          El contenedor exterior utiliza overflow-x-auto.
          El contenedor interior usa 'min-w-max w-fit mx-auto':
          1. En pantallas grandes (PC): mx-auto centra perfectamente el recinto si el contenedor es más amplio.
          2. En pantallas pequeñas (Móvil): los márgenes automáticos colapsan a 0 en desbordamiento,
             asegurando que el contenido comience EXACTAMENTE en X=0.
             ¡Esto elimina de raíz el corte izquierdo y permite desplazarse fluidamente en ambas direcciones! */}
      <div
        ref={contenedorScrollRef}
        className="w-full overflow-x-auto pb-4 overscroll-x-contain scroll-smooth"
      >
        <div
          className="min-w-max w-fit mx-auto px-2 sm:px-4 transition-transform duration-150 origin-top"
          style={{ transform: nivelZoom !== 1 ? `scale(${nivelZoom})` : undefined }}
        >
          {/* CASO A: LABORATORIO DE CÓMPUTO SEGÚN BOCETO CON PIZARRÓN A LA DERECHA DE PC-28 */}
          {esLaboratorio ? (
            <div className="p-2 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-6">
                {/* Bloque Principal de Mesas e Islas de Cómputo */}
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  {/* 1. FILA NORTE: 5 Módulos Verticales de 2 Equipos */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {mesasNorte.map((mesa, idx) => (
                      <div
                        key={`mesa-norte-${idx}`}
                        className="flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-xl bg-neutral-50/90 border border-neutral-200/80 shadow-2xs hover:border-[#7a132b]/40 transition-colors"
                      >
                        <span className="text-[9px] font-mono font-bold text-neutral-400">
                          Mesa N{idx + 1}
                        </span>
                        <div className="flex flex-col gap-1 sm:gap-1.5">
                          {mesa.map((estacion) => (
                            <React.Fragment key={estacion.id}>
                              {renderizarElementoLugar(estacion)}
                            </React.Fragment>
                          ))}
                        </div>
                        <span className="text-[8px] font-mono text-neutral-400 font-semibold">2 equipos</span>
                      </div>
                    ))}
                  </div>

                  {/* Pasillo Norte */}
                  <div className="w-full flex items-center justify-center gap-2">
                    <div className="h-px w-full border-t border-dashed border-neutral-300" />
                    <span className="text-[8px] font-mono tracking-widest text-neutral-400 uppercase shrink-0 px-2 bg-neutral-50/60 rounded">
                      PASILLO DE CIRCULACIÓN NORTE
                    </span>
                    <div className="h-px w-full border-t border-dashed border-neutral-300" />
                  </div>

                  {/* 2. ISLA CENTRAL: Dos Bloques Dobles de 4+4 + Cabecera de 2 */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {/* Bloque Central 1 (Izquierdo): Doble fila de 4 equipos */}
                    <div className="flex flex-col gap-1 p-2 rounded-xl bg-neutral-100/70 border border-neutral-200/90 shadow-2xs">
                      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 font-bold px-1">
                        <span>Isla 1 (Superior)</span>
                        <span className="text-[#7a132b]">4 equipos</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {isla1Sup.map((estacion) => (
                          <React.Fragment key={estacion.id}>
                            {renderizarElementoLugar(estacion)}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="h-1 bg-neutral-200 rounded-full w-full opacity-60" />
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {isla1Inf.map((estacion) => (
                          <React.Fragment key={estacion.id}>
                            {renderizarElementoLugar(estacion)}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 font-bold px-1">
                        <span>Isla 1 (Inferior)</span>
                        <span className="text-[#7a132b]">4 equipos</span>
                      </div>
                    </div>

                    {/* Bloque Central 2 (Derecho): Doble fila de 4 equipos */}
                    <div className="flex flex-col gap-1 p-2 rounded-xl bg-neutral-100/70 border border-neutral-200/90 shadow-2xs">
                      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 font-bold px-1">
                        <span>Isla 2 (Superior)</span>
                        <span className="text-[#7a132b]">4 equipos</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {isla2Sup.map((estacion) => (
                          <React.Fragment key={estacion.id}>
                            {renderizarElementoLugar(estacion)}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="h-1 bg-neutral-200 rounded-full w-full opacity-60" />
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {isla2Inf.map((estacion) => (
                          <React.Fragment key={estacion.id}>
                            {renderizarElementoLugar(estacion)}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 font-bold px-1">
                        <span>Isla 2 (Inferior)</span>
                        <span className="text-[#7a132b]">4 equipos</span>
                      </div>
                    </div>

                    {/* Cabecera Lateral Derecha (2 equipos verticales: PC-27 y PC-28) */}
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-50/70 border border-amber-300 shadow-2xs">
                      <span className="text-[9px] font-mono font-bold text-amber-900">
                        Cabecera
                      </span>
                      <div className="flex flex-col gap-1 sm:gap-1.5">
                        {cabecera.map((estacion) => (
                          <React.Fragment key={estacion.id}>
                            {renderizarElementoLugar(estacion)}
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="text-[8px] font-mono text-[#7a132b] font-bold">2 equipos</span>
                    </div>
                  </div>

                  {/* Pasillo Sur */}
                  <div className="w-full flex items-center justify-center gap-2">
                    <div className="h-px w-full border-t border-dashed border-neutral-300" />
                    <span className="text-[8px] font-mono tracking-widest text-neutral-400 uppercase shrink-0 px-2 bg-neutral-50/60 rounded">
                      PASILLO DE CIRCULACIÓN SUR
                    </span>
                    <div className="h-px w-full border-t border-dashed border-neutral-300" />
                  </div>

                  {/* 3. FILA SUR: 5 Módulos Verticales de 2 Equipos */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {mesasSur.map((mesa, idx) => (
                      <div
                        key={`mesa-sur-${idx}`}
                        className="flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-xl bg-neutral-50/90 border border-neutral-200/80 shadow-2xs hover:border-[#7a132b]/40 transition-colors"
                      >
                        <span className="text-[9px] font-mono font-bold text-neutral-400">
                          Mesa S{idx + 1}
                        </span>
                        <div className="flex flex-col gap-1 sm:gap-1.5">
                          {mesa.map((estacion) => (
                            <React.Fragment key={estacion.id}>
                              {renderizarElementoLugar(estacion)}
                            </React.Fragment>
                          ))}
                        </div>
                        <span className="text-[8px] font-mono text-neutral-400 font-semibold">2 equipos</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Muro Frontal: Pizarrón Blanco y Estrado Docente ubicado exactamente a la derecha de PC-28 */}
                <div className="flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl bg-neutral-900 border-2 border-neutral-800 text-white shadow-md w-32 sm:w-40 shrink-0 self-stretch min-h-[300px]">
                  {/* Pizarrón / Pantalla */}
                  <div className="w-full flex flex-col items-center text-center">
                    <span className="text-[9px] font-mono tracking-wider font-bold text-emerald-400 uppercase flex items-center gap-1.5 mb-1.5">
                      <Tv className="w-3.5 h-3.5" />
                      PIZARRÓN & PROYECCIÓN
                    </span>
                    <div className="w-full h-24 sm:h-28 bg-neutral-800 rounded-xl border border-neutral-700 flex flex-col items-center justify-center p-2 text-center shadow-inner">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mb-1" />
                      <span className="text-[9px] font-mono font-bold text-neutral-200 uppercase leading-snug">
                        PANTALLA DE PROYECCIÓN 4K
                      </span>
                      <span className="text-[8px] font-mono text-neutral-400 mt-0.5">Pizarrón Blanco Frontal</span>
                    </div>
                  </div>

                  {/* Línea divisoria */}
                  <div className="h-px w-4/5 bg-neutral-700/80 my-2" />

                  {/* Estrado del Docente */}
                  <div className="w-full flex flex-col items-center text-center bg-neutral-800/80 p-2 rounded-xl border border-neutral-700/60">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white uppercase">
                      <Cpu className="w-3.5 h-3.5 text-[#7a132b]" />
                      <span>ESTRADO DOCENTE</span>
                    </div>
                    <span className="text-[8px] font-mono text-neutral-400 mt-1 leading-tight">
                      A la derecha de Cabecera (PC-28)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CASO B: AUDITORIO (3 BLOQUES Y 2 PASILLOS) O SALA 14 (MODULAR) */
            <div className="flex flex-col items-center">
              {clavesFilasOrdenadas.map((claveFila) => {
                const lugaresFila = filasAgrupadas[claveFila];
                const totalEnFila = lugaresFila.length;

                // Auditorio: Separación arquitectónica exacta en 3 bloques con 2 pasillos
                if (esAuditorio) {
                  const cantIzqFila = claveFila === 'A' ? 3 : claveFila === 'B' ? 5 : 6;
                  const cantCentroFila = claveFila === 'A' ? 8 : 11;

                  const lugaresIzq = lugaresFila.filter(
                    (l) => l.seccion === 'izq' || (!l.seccion && l.numero <= cantIzqFila)
                  );
                  const lugaresCentro = lugaresFila.filter(
                    (l) =>
                      l.seccion === 'centro' ||
                      (!l.seccion &&
                        l.numero > cantIzqFila &&
                        l.numero <= cantIzqFila + cantCentroFila)
                  );
                  const lugaresDer = lugaresFila.filter(
                    (l) =>
                      l.seccion === 'der' ||
                      (!l.seccion && l.numero > cantIzqFila + cantCentroFila)
                  );

                  return (
                    <div
                      key={claveFila}
                      className="flex items-center gap-1 sm:gap-2 transition-transform duration-150 py-0.5"
                    >
                      {/* Identificador izquierdo de Fila */}
                      <div className="w-8 sm:w-10 shrink-0 text-right pr-1">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neutral-400">
                          Fila {claveFila}
                        </span>
                      </div>

                      {/* 1. Bloque Lateral Izquierdo (Trapecio Izquierdo: máx 6 plazas) */}
                      <div className={`flex items-center justify-end gap-0.5 sm:gap-1 ${anchoBloqueLateralAuditorio} shrink-0`}>
                        {lugaresIzq.map((lugar) => (
                          <React.Fragment key={lugar.id}>
                            {renderizarElementoLugar(lugar)}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Pasillo Lateral Izquierdo */}
                      <div className="w-2.5 sm:w-3.5 flex flex-col items-center justify-center shrink-0">
                        <div className="h-5 sm:h-6 w-px border-r border-dashed border-neutral-300" />
                      </div>

                      {/* 2. Bloque Central (Frente al presídium: máx 11 plazas) */}
                      <div className={`flex items-center justify-center gap-0.5 sm:gap-1 ${anchoBloqueCentralAuditorio} px-1 sm:px-1.5 py-0.5 rounded-lg bg-neutral-50/70 border border-neutral-200/50 shrink-0`}>
                        {lugaresCentro.map((lugar) => (
                          <React.Fragment key={lugar.id}>
                            {renderizarElementoLugar(lugar)}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Pasillo Lateral Derecho */}
                      <div className="w-2.5 sm:w-3.5 flex flex-col items-center justify-center shrink-0">
                        <div className="h-5 sm:h-6 w-px border-r border-dashed border-neutral-300" />
                      </div>

                      {/* 3. Bloque Lateral Derecho (Trapecio Derecho: máx 6 plazas) */}
                      <div className={`flex items-center justify-start gap-0.5 sm:gap-1 ${anchoBloqueLateralAuditorio} shrink-0`}>
                        {lugaresDer.map((lugar) => (
                          <React.Fragment key={lugar.id}>
                            {renderizarElementoLugar(lugar)}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Identificador derecho de Fila */}
                      <div className="w-8 sm:w-10 shrink-0 text-left pl-1">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neutral-400">
                          Fila {claveFila}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Sala 14 (Modular y flexible)
                const mitad = Math.floor(totalEnFila / 2);

                return (
                  <div
                    key={claveFila}
                    className="flex items-center gap-2.5 transition-transform duration-150 py-1"
                  >
                    {/* Identificador izquierdo */}
                    <div className="w-12 sm:w-14 shrink-0 text-right pr-2">
                      <span className="text-[11px] font-mono font-bold text-neutral-400">
                        Fila {claveFila}
                      </span>
                    </div>

                    {/* Contenedor de Lugares */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 p-1.5 rounded-lg bg-neutral-50/50">
                      {lugaresFila.map((lugar, indice) => {
                        const mostrarPasilloCentral = indice === mitad - 1 && totalEnFila > 6;

                        return (
                          <React.Fragment key={lugar.id}>
                            {renderizarElementoLugar(lugar)}
                            {mostrarPasilloCentral && (
                              <div className="w-5 sm:w-8 flex items-center justify-center">
                                <span className="text-[9px] font-mono text-neutral-300">PASILLO</span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Identificador derecho */}
                    <div className="w-12 sm:w-14 shrink-0 text-left pl-2">
                      <span className="text-[11px] font-mono font-bold text-neutral-400">
                        Fila {claveFila}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SIMBOLOGÍA VISUAL INSTITUCIONAL SIN PILLS RECARGADAS                  */}
      {/* ========================================================================= */}
      <div className="mt-4 pt-3.5 border-t border-neutral-100 flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-xs text-neutral-600">
        {modo === 'asistente' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-neutral-300 bg-white" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#7a132b]" />
              <span className="font-semibold text-neutral-900">Tu selección</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-amber-300 bg-amber-50" />
              <span>VIP / Especial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-neutral-200 border border-neutral-300" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-neutral-100 border border-neutral-200 text-neutral-400 text-center text-[8px] leading-3">
                ✕
              </span>
              <span>Bloqueado</span>
            </div>
          </>
        )}

        {modo === 'editor' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-neutral-300 bg-white" />
              <span>Lugar / Estación Libre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-amber-400 bg-amber-100" />
              <span className="font-semibold text-amber-900">★ VIP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-indigo-400 bg-indigo-100" />
              <span className="font-semibold text-indigo-900">Comité / Docente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-purple-400 bg-purple-100" />
              <span className="font-semibold text-purple-900">Staff Técnico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-neutral-300 bg-neutral-100 line-through" />
              <span>Bloqueado</span>
            </div>
            {esSalaModular && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-dashed border-neutral-300 bg-neutral-50/50" />
                <span>Módulo Suprimido</span>
              </div>
            )}
          </>
        )}

        {modo === 'ocupacion' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600" />
              <span className="font-semibold text-emerald-900">Presente en Sala</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-sky-300 bg-sky-100" />
              <span>Boleto Emitido (En camino)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-neutral-300 bg-white" />
              <span>Libre</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
