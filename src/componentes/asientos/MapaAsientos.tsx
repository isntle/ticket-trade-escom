import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import {
  ZOOM_MAXIMO,
  acercarZoom,
  alejarZoom,
  calcularEscalaAjuste,
  zoomEfectivo,
  zoomMinimo
} from '../../utilidades/zoomMapa';

// En el servidor (pruebas SSR) no hay diseño que medir.
const useEfectoDiseno = typeof window === 'undefined' ? useEffect : useLayoutEffect;

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
  permitirVip?: boolean;
  motivosNoEditables?: ReadonlyMap<string, string>;
  editorDeshabilitado?: boolean;
  ocultarOrganizador?: boolean;
  mostrarLeyendaOcupado?: boolean;
  reservaDeshabilitada?: boolean;
}

export const MapaAsientos: React.FC<PropiedadesMapaAsientos> = ({
  asientos,
  modo = 'asistente',
  tipoRecinto = 'auditorio',
  idAsientoSeleccionado,
  idsAsientosApartados = [],
  idsAsientosReservados = [],
  idsAsientosCheckIn = [],
  motivosNoEditables,
  editorDeshabilitado,
  ocultarOrganizador = false,
  mostrarLeyendaOcupado = false,
  reservaDeshabilitada = false,
  alSeleccionarAsiento,
  permiteEliminar = false,
  permitirVip = true
}) => {
  // Modalidad de escala: 'ajustar' (ajuste compacto para caber en desktop sin scroll) o 'amplio' (tamaño táctil espacioso)
  const [modoAjuste, setModoAjuste] = useState<'ajustar' | 'amplio'>('ajustar');
  // null = ajustar al ancho disponible; un número = zoom elegido por la persona, que se conserva
  // aunque cambie la selección, lleguen datos nuevos o cambie el tamaño de la ventana.
  const [zoomManual, setZoomManual] = useState<number | null>(null);
  const [medidas, setMedidas] = useState({ disponible: 0, ancho: 0, alto: 0 });
  const contenedorScrollRef = useRef<HTMLDivElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);
  // Punto horizontal (proporción 0-1) que debe seguir visible al cambiar el zoom.
  const centroPendienteRef = useRef<number | null>(null);

  // Mide el ancho disponible y el tamaño natural del mapa (sin escala).
  useEfectoDiseno(() => {
    const contenedor = contenedorScrollRef.current;
    const contenido = contenidoRef.current;
    if (!contenedor || !contenido) return;
    const medir = () => {
      const nuevas = {
        disponible: contenedor.clientWidth,
        ancho: contenido.offsetWidth,
        alto: contenido.offsetHeight
      };
      setMedidas((previas) =>
        previas.disponible === nuevas.disponible && previas.ancho === nuevas.ancho && previas.alto === nuevas.alto
          ? previas
          : nuevas
      );
    };
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(contenedor);
    observador.observe(contenido);
    return () => observador.disconnect();
  }, []);

  const medido = medidas.ancho > 0 && medidas.disponible > 0;
  const escalaAjuste = calcularEscalaAjuste(medidas.disponible, medidas.ancho);
  const nivelZoom = zoomEfectivo(zoomManual, escalaAjuste);
  const hayDesbordeHorizontal = medido && Math.round(medidas.ancho * nivelZoom) > medidas.disponible + 1;

  // Tras cambiar el zoom, mantiene a la vista la misma zona del mapa en lugar de saltar al inicio.
  useEfectoDiseno(() => {
    const contenedor = contenedorScrollRef.current;
    const centro = centroPendienteRef.current;
    if (!contenedor || centro === null) return;
    centroPendienteRef.current = null;
    contenedor.scrollLeft = Math.max(0, centro * contenedor.scrollWidth - contenedor.clientWidth / 2);
  }, [nivelZoom, medidas.ancho]);

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
  const totalesBloques = asientos.reduce((total, lugar) => {
    const izquierda = lugar.fila === 'A' ? 3 : lugar.fila === 'B' ? 5 : 6;
    const centro = lugar.fila === 'A' ? 8 : 11;
    const seccion = lugar.seccion || (lugar.numero <= izquierda ? 'izq' : lugar.numero <= izquierda + centro ? 'centro' : 'der');
    if (seccion in total) total[seccion as keyof typeof total]++;
    return total;
  }, {izq: 0, centro: 0, der: 0});

  // Dimensionamiento visual adaptativo de botones
  // En Auditorio 'ajustar': tamaño optimizado (20-24px) para caber al 100% en pantallas medianas y de escritorio sin scrollbar
  const claseTamañoBotonAuditorio =
    modoAjuste === 'amplio'
      ? 'w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 text-[9px] sm:text-[10px]'
      : 'w-5 h-5 text-[8px] sm:text-[8.5px] md:text-[9px]';

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
      ? 'w-[235px]'
      : 'w-[134px] sm:w-[145px] md:w-[152px]';

  const anchoBloqueCentralAuditorio =
    modoAjuste === 'amplio'
      ? 'w-[435px]'
      : 'w-[242px] sm:w-[260px] md:w-[275px]';

  const cambiarZoom = (nuevo: number | null) => {
    const contenedor = contenedorScrollRef.current;
    if (contenedor && contenedor.scrollWidth > 0) {
      centroPendienteRef.current = (contenedor.scrollLeft + contenedor.clientWidth / 2) / contenedor.scrollWidth;
    }
    setZoomManual(nuevo);
  };

  const manejarAumentarZoom = () => cambiarZoom(acercarZoom(nivelZoom));

  const manejarDisminuirZoom = () => cambiarZoom(alejarZoom(nivelZoom, escalaAjuste));

  /** Vuelve a mostrar el mapa completo en el ancho disponible. */
  const manejarAjustarAncho = () => {
    setModoAjuste('ajustar');
    cambiarZoom(null);
  };

  /** El modo amplio usa lugares grandes a tamaño real; volver a "ajustar" encaja el mapa. */
  const manejarAlternarModo = () => {
    if (modoAjuste === 'ajustar') {
      setModoAjuste('amplio');
      cambiarZoom(1);
    } else {
      manejarAjustarAncho();
    }
  };

  const claseControl =
    'p-1 hover:bg-neutral-100 rounded text-neutral-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a132b]';

  const controlesZoom = (
    <>
      <button
        type="button"
        onClick={manejarDisminuirZoom}
        disabled={nivelZoom <= zoomMinimo(escalaAjuste)}
        title="Alejar vista"
        aria-label="Alejar vista del mapa"
        className={claseControl}
      >
        <ZoomOut className="w-3 h-3" aria-hidden="true" />
      </button>
      <span
        aria-live="polite"
        aria-label={`Escala del mapa ${Math.round(nivelZoom * 100)}%${zoomManual === null ? ', ajustada al ancho' : ''}`}
        className="text-[9px] font-mono font-bold text-neutral-500 px-1 min-w-[28px] text-center"
      >
        {Math.round(nivelZoom * 100)}%
      </span>
      <button
        type="button"
        onClick={manejarAumentarZoom}
        disabled={nivelZoom >= ZOOM_MAXIMO}
        title="Acercar vista"
        aria-label="Acercar vista del mapa"
        className={claseControl}
      >
        <ZoomIn className="w-3 h-3" aria-hidden="true" />
      </button>
      {zoomManual !== null && modoAjuste === 'ajustar' && (
        <button
          type="button"
          onClick={manejarAjustarAncho}
          title="Ajustar el mapa al ancho"
          aria-label="Ajustar el mapa al ancho de la pantalla"
          className={`${claseControl} text-[#7a132b]`}
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </>
  );

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
        lugar.categoria === 'staff' ||
        (!permitirVip && lugar.categoria === 'vip');

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
          permitirVip ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 cursor-pointer font-bold' : 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed';
        textoAyuda = `${lugar.etiqueta} — ${permitirVip ? 'Lugar VIP / Invitado de Honor' : 'Reservado para invitados'}`;
      } else if (lugar.categoria === 'organizador' || lugar.categoria === 'staff') {
        estiloBoton =
          esAuditorio ? 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed' : 'bg-indigo-50/70 border-indigo-200 text-indigo-300 cursor-not-allowed';
        textoAyuda = `${lugar.etiqueta} — ${esAuditorio ? 'Reservado para uso interno' : 'Reservado para comité técnico o docente'}`;
      }

      if (reservaDeshabilitada && !noDisponible && !estaSeleccionado) {
        estiloBoton = 'bg-neutral-50 border-neutral-200 text-neutral-500 cursor-not-allowed';
        textoAyuda = `${lugar.etiqueta} — Selección no disponible por el momento`;
      }

      return (
        <button
          type="button"
          disabled={noDisponible || reservaDeshabilitada}
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
    const estaOcupadoEnEditor = idsAsientosReservados.includes(lugar.id);
    let estiloEditor =
      'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-500 hover:shadow-2xs cursor-pointer';
    let textoAyuda = `${lugar.etiqueta} — Asistente General`;

    if (estaOcupadoEnEditor) {
      estiloEditor = 'bg-sky-100 border-sky-400 text-sky-900 font-bold shadow-2xs ring-1 ring-sky-200';
      textoAyuda = `${lugar.etiqueta} — Tiene un apartado o una reserva`;
    } else if (lugar.estaBloqueado) {
      estiloEditor = 'bg-neutral-100 border-neutral-300 text-neutral-400 line-through';
      textoAyuda = `${lugar.etiqueta} — Bloqueada para logística`;
    } else if (lugar.categoria === 'vip') {
      estiloEditor =
        'bg-amber-100 border-amber-400 text-amber-900 font-bold shadow-2xs ring-1 ring-amber-300';
      textoAyuda = `${lugar.etiqueta} — Asignada VIP / Directivo`;
    } else if (lugar.categoria === 'organizador') {
      estiloEditor =
        esAuditorio ? 'bg-neutral-100 border-neutral-400 text-neutral-700 font-bold' : 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold shadow-2xs ring-1 ring-indigo-300';
      textoAyuda = `${lugar.etiqueta} — ${esAuditorio ? 'Reserva interna anterior' : 'Comité Organizador / Docente'}`;
    } else if (lugar.categoria === 'staff') {
      estiloEditor =
        'bg-purple-100 border-purple-400 text-purple-900 font-bold shadow-2xs ring-1 ring-purple-300';
      textoAyuda = `${lugar.etiqueta} — Soporte Técnico / Staff`;
    }

    const motivoNoEditable = motivosNoEditables?.get(lugar.id);
    if (motivoNoEditable) textoAyuda = `${lugar.etiqueta} — ${motivoNoEditable}`;

    return (
      <button
        type="button"
        onClick={() => alSeleccionarAsiento && alSeleccionarAsiento(lugar)}
        disabled={editorDeshabilitado || Boolean(motivoNoEditable)}
        title={textoAyuda}
        className={`relative shrink-0 rounded-md border font-mono flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-all active:scale-95 ${claseTamañoBoton} ${estiloEditor}`}
      >
        {esLaboratorio && (!lugar.estaBloqueado || estaOcupadoEnEditor) && (
          <Monitor className="w-3 h-3 mb-0.5 opacity-60 shrink-0" />
        )}

        {lugar.estaBloqueado && !estaOcupadoEnEditor ? (
          <Ban className="w-3 h-3 text-red-600" />
        ) : (
          <span className="font-bold leading-none">
            {esLaboratorio ? `PC${String(lugar.numero).padStart(2, '0')}` : lugar.numero}
          </span>
        )}

        {/* Punto distintivo de rol */}
        {lugar.categoria === 'vip' && !lugar.estaBloqueado && !estaOcupadoEnEditor && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 border border-white" />
        )}
        {!esAuditorio && !ocultarOrganizador && lugar.categoria === 'organizador' && !lugar.estaBloqueado && !estaOcupadoEnEditor && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-600 border border-white" />
        )}
        {lugar.categoria === 'staff' && !lugar.estaBloqueado && !estaOcupadoEnEditor && (
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
    <div className={`w-full ${esAuditorio ? 'bg-[#f1eeeb]' : 'bg-[#fdfdfc]'} rounded-2xl border border-neutral-200/80 p-3 sm:p-5 shadow-xs overflow-hidden select-none`}>
      {/* ========================================================================= */}
      {/* 1. CABECERA ESPACIAL SEGÚN EL RECINTO (Auditorio, Sala 14 o Laboratorio) */}
      {/* ========================================================================= */}
      {esAuditorio && (
        <div className="max-w-3xl mx-auto mb-5 text-center">
          {/* Escenario Físico del Auditorio con Curvatura y Presídium */}
          <div className="relative mx-auto flex items-start justify-center gap-1 sm:gap-3 mb-3">
            <span aria-label="Salida de emergencia hacia la izquierda" className="shrink-0 mt-1 text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg px-1.5 py-1 text-[8px] sm:text-[9px] font-bold leading-tight flex items-center gap-1"><span aria-hidden="true" className="text-base">←</span><span>SALIDA DE<br />EMERGENCIA</span></span>
            <svg viewBox="0 0 1250 300" role="img" aria-label="Escenario del auditorio" className="w-3/5 max-w-xl h-auto">
              <path d="M 6 6 H 1244 Q 1070 286 625 290 Q 180 286 6 6 Z" fill="#f7f4f3" stroke="#7a132b" strokeWidth="12" />
              <text x="625" y="115" textAnchor="middle" fill="#7a132b" fontSize="48" fontWeight="700" letterSpacing="12">ESCENARIO</text>
            </svg>
            <span aria-label="Salida de emergencia hacia la derecha" className="shrink-0 mt-1 text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg px-1.5 py-1 text-[8px] sm:text-[9px] font-bold leading-tight flex items-center gap-1"><span>SALIDA DE<br />EMERGENCIA</span><span aria-hidden="true" className="text-base">→</span></span>
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 tracking-wider uppercase block">
            {asientos.length} Butacas · {clavesFilasOrdenadas.length} Filas ({clavesFilasOrdenadas[0]} - {clavesFilasOrdenadas.at(-1)}) · 3 Bloques con 2 Pasillos
          </span>

          {/* Marcadores de Bloques según el boceto arquitectónico y selector adaptativo */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
            <div className="bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Bloque Lateral Izq.</span>
              <span className="text-[#7a132b] font-black">{totalesBloques.izq}</span>
            </div>
            <div className="px-2 py-0.5 rounded border border-dashed border-neutral-300 text-[9px] text-neutral-400 bg-neutral-50/50 hidden sm:inline-block">
              Pasillo 1
            </div>
            <div className="bg-neutral-100 border border-neutral-200/80 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <span>Bloque Central</span>
              <span className="text-[#7a132b] font-black">{totalesBloques.centro}</span>
            </div>
            <div className="px-2 py-0.5 rounded border border-dashed border-neutral-300 text-[9px] text-neutral-400 bg-neutral-50/50 hidden sm:inline-block">
              Pasillo 2
            </div>
            <div className="bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Bloque Lateral Der.</span>
              <span className="text-[#7a132b] font-black">{totalesBloques.der}</span>
            </div>

            {/* Selector de modo y zoom */}
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs ml-1 sm:ml-2">
              <button
                type="button"
                onClick={manejarAlternarModo}
                title={
                  modoAjuste === 'ajustar'
                    ? 'Cambiar a tamaño amplio táctil'
                    : 'Ajustar al ancho de la pantalla'
                }
                className="px-2 py-1 rounded text-[9px] font-bold transition-colors flex items-center gap-1 cursor-pointer hover:bg-neutral-100 text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a132b]"
              >
                {modoAjuste === 'ajustar' ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-[#7a132b]" aria-hidden="true" />
                    <span>Modo Amplio</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-[#7a132b]" aria-hidden="true" />
                    <span>Ajustar al Ancho</span>
                  </>
                )}
              </button>

              <div className="h-3.5 w-px bg-neutral-200 mx-0.5" />

              {controlesZoom}
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
          <div className="mt-3 flex justify-center">
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs">
              {controlesZoom}
            </div>
          </div>
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
                {asientos.length} Estaciones de Cómputo · Distribución de los lugares de esta actividad
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold">
              <div className="bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                Zona Norte: <span className="text-[#7a132b]">{mesasNorte.flat().length} PCs</span>
              </div>
              <div className="bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                Isla Central: <span className="text-[#7a132b]">{isla1Sup.length + isla1Inf.length + isla2Sup.length + isla2Inf.length + cabecera.length} PCs</span>
              </div>
              <div className="bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                Zona Sur: <span className="text-[#7a132b]">{mesasSur.flat().length} PCs</span>
              </div>

              {/* Controles de Zoom para Laboratorio */}
              <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-0.5 shadow-2xs">
                {controlesZoom}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de desplazamiento: solo cuando el mapa es más ancho que la pantalla */}
      {hayDesbordeHorizontal && (
        <div className="text-[9px] text-neutral-500 font-medium text-center mb-2 flex items-center justify-center gap-1">
          <span>↔ Desliza para recorrer el mapa · usa ↺ o «Ajustar al Ancho» para verlo completo</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MATRIZ ESPACIAL INTERACTIVA DE LUGARES                                */}
      {/* ========================================================================= */}
      {/* El mapa se mide a tamaño natural y se escala con transform. El marco recibe el
          tamaño ya escalado para que el área desplazable coincida con lo que se ve:
          al acercar no se corta el lado izquierdo y al alejar no queda espacio vacío.
          mx-auto centra el marco cuando cabe y se anula cuando desborda (inicio en X=0). */}
      <div
        ref={contenedorScrollRef}
        className="w-full overflow-x-auto pb-4 overscroll-x-contain"
      >
        <div
          className="relative mx-auto"
          style={medido ? { width: Math.ceil(medidas.ancho * nivelZoom), height: Math.ceil(medidas.alto * nivelZoom) } : undefined}
        >
        <div
          ref={contenidoRef}
          data-escala-mapa={nivelZoom}
          className={`w-max px-2 sm:px-4 ${esAuditorio ? 'pb-7' : ''} ${medido ? 'absolute left-0 top-0 origin-top-left' : 'mx-auto'}`}
          style={medido && nivelZoom !== 1 ? { transform: `scale(${nivelZoom})` } : undefined}
        >
          {/* CASO A: LABORATORIO DE CÓMPUTO */}
          {esLaboratorio ? (
            <div className="p-2 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-6">
                <span className="min-h-36 shrink-0 rotate-180 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1.5 text-center text-xs font-semibold leading-none tracking-wide text-white [writing-mode:vertical-rl]">
                  Pizarrón
                </span>
                {/* Bloque Principal de Mesas e Islas de Cómputo */}
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  {/* 1. FILA NORTE: 5 Módulos Verticales de 2 Equipos */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {mesasNorte.map((mesa, idx) => mesa.length > 0 && (
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
                        <span className="text-[8px] font-mono text-neutral-400 font-semibold">{mesa.length} equipos</span>
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
                        <span className="text-[#7a132b]">{isla1Sup.length} equipos</span>
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
                        <span className="text-[#7a132b]">{isla1Inf.length} equipos</span>
                      </div>
                    </div>

                    {/* Bloque Central 2 (Derecho): Doble fila de 4 equipos */}
                    <div className="flex flex-col gap-1 p-2 rounded-xl bg-neutral-100/70 border border-neutral-200/90 shadow-2xs">
                      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 font-bold px-1">
                        <span>Isla 2 (Superior)</span>
                        <span className="text-[#7a132b]">{isla2Sup.length} equipos</span>
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
                        <span className="text-[#7a132b]">{isla2Inf.length} equipos</span>
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
                      <span className="text-[8px] font-mono text-[#7a132b] font-bold">{cabecera.length} equipos</span>
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
                    {mesasSur.map((mesa, idx) => mesa.length > 0 && (
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
                        <span className="text-[8px] font-mono text-neutral-400 font-semibold">{mesa.length} equipos</span>
                      </div>
                    ))}
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
                      className="flex items-center gap-1 sm:gap-2 transition-transform duration-150 py-0.5 border-b border-neutral-200/80"
                    >
                      {/* Identificador izquierdo de Fila */}
                      <div className="w-8 sm:w-10 shrink-0 text-right pr-1">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neutral-400 whitespace-nowrap">
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
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neutral-400 whitespace-nowrap">
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
              {esAuditorio && (
                <div className="flex items-stretch gap-1 sm:gap-2 mt-1" aria-label="Entradas y equipo técnico">
                  <div className="w-8 sm:w-10 shrink-0" />
                  <div className={`${anchoBloqueLateralAuditorio} shrink-0 border-t border-neutral-200`} />
                  <div className="relative w-2.5 sm:w-3.5 shrink-0 bg-neutral-100/70 rounded-b-sm">
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded border border-neutral-200 bg-white px-1 py-0.5 text-[8px] font-bold text-neutral-500">ENTRADA</span>
                  </div>
                  <div className={`${anchoBloqueCentralAuditorio} shrink-0 min-h-12 rounded-b-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center px-1 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500`}>Equipo técnico</div>
                  <div className="relative w-2.5 sm:w-3.5 shrink-0 bg-neutral-100/70 rounded-b-sm">
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded border border-neutral-200 bg-white px-1 py-0.5 text-[8px] font-bold text-neutral-500">ENTRADA</span>
                  </div>
                  <div className={`${anchoBloqueLateralAuditorio} shrink-0 border-t border-neutral-200`} />
                  <div className="w-8 sm:w-10 shrink-0" />
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SIMBOLOGÍA VISUAL INSTITUCIONAL SIN PILLS RECARGADAS                  */}
      {/* ========================================================================= */}
      <div className={`${esAuditorio ? 'mt-8' : 'mt-4'} pt-3.5 border-t border-neutral-200 flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-xs text-neutral-600`}>
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
              <span>{ocultarOrganizador ? 'Asistente (Libre)' : 'Lugar / Estación Libre'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-amber-400 bg-amber-100" />
              <span className="font-semibold text-amber-900">★ VIP</span>
            </div>
            {!esAuditorio && !ocultarOrganizador && <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-indigo-400 bg-indigo-100" />
              <span className="font-semibold text-indigo-900">Comité / Docente</span>
            </div>}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-purple-400 bg-purple-100" />
              <span className="font-semibold text-purple-900">Staff Técnico</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-neutral-300 bg-neutral-100 line-through" />
              <span>{ocultarOrganizador ? 'Bloqueado / Fuera de servicio' : 'Bloqueado'}</span>
            </div>
            {(mostrarLeyendaOcupado || idsAsientosReservados.length > 0) && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-sky-400 bg-sky-100" />
                <span className="font-semibold text-sky-900">Ocupado (no editable)</span>
              </div>
            )}
            {esSalaModular && permiteEliminar && (
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
