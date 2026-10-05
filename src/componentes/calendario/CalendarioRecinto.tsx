import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Ban, Clock, CheckCircle } from 'lucide-react';
import { useDatos } from '../../contextos/DatosContexto';

interface PropiedadesCalendarioRecinto {
  idRecinto: string;
  fechaSeleccionada?: string;
  alSeleccionarFecha?: (fecha: string) => void;
  horaInicio?: string;
  horaFin?: string;
}

export const CalendarioRecinto: React.FC<PropiedadesCalendarioRecinto> = ({
  idRecinto,
  fechaSeleccionada,
  alSeleccionarFecha,
  horaInicio = '09:00',
  horaFin = '13:00'
}) => {
  const { listaEventos, listaBloqueos } = useDatos();

  // Fecha base para el calendario: octubre 2026
  const [añoActual, setAñoActual] = useState(2026);
  const [mesActual, setMesActual] = useState(9); // Octubre (índice 9 en JavaScript)

  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Calcular días en el mes
  const primerDiaMes = new Date(añoActual, mesActual, 1).getDay();
  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();

  const mesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAñoActual(añoActual - 1);
    } else {
      setMesActual(mesActual - 1);
    }
  };

  const mesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAñoActual(añoActual + 1);
    } else {
      setMesActual(mesActual + 1);
    }
  };

  // Obtener estado de un día específico
  const obtenerEstadoDia = (dia: number) => {
    const cadenaMes = String(mesActual + 1).padStart(2, '0');
    const cadenaDia = String(dia).padStart(2, '0');
    const cadenaFecha = `${añoActual}-${cadenaMes}-${cadenaDia}`;

    // Revisar si hay bloqueo de Subdirección
    const bloqueos = listaBloqueos.filter((b) => {
      if (b.idRecinto !== idRecinto) return false;
      if (b.esIndefinido && cadenaFecha >= b.fechaInicio) return true;
      const fin = b.fechaFin || b.fechaInicio;
      return cadenaFecha >= b.fechaInicio && cadenaFecha <= fin;
    });

    if (bloqueos.length > 0) {
      return {
        tipo: 'bloqueo' as const,
        titulo: bloqueos[0].titulo,
        elementos: bloqueos.map((b) => `Bloqueo oficial: ${b.titulo}`)
      };
    }

    // Revisar si hay eventos programados en este recinto
    const eventos = listaEventos.filter((e) =>
      e.fechas.some((f) => f.idRecinto === idRecinto && f.fecha === cadenaFecha)
    );

    if (eventos.length > 0) {
      return {
        tipo: 'evento' as const,
        titulo: eventos[0].titulo,
        elementos: eventos.map((e) => `Evento: ${e.titulo}`)
      };
    }

    return { tipo: 'libre' as const, elementos: [] };
  };

  // Cuadrícula de días
  const celdasCalendario = [];
  for (let i = 0; i < primerDiaMes; i++) {
    celdasCalendario.push(<div key={`vacio-${i}`} className="h-10 sm:h-12" />);
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const cadenaMes = String(mesActual + 1).padStart(2, '0');
    const cadenaDia = String(dia).padStart(2, '0');
    const fechaActualCadena = `${añoActual}-${cadenaMes}-${cadenaDia}`;
    const estaSeleccionado = fechaSeleccionada === fechaActualCadena;
    const infoDia = obtenerEstadoDia(dia);

    let estiloFondo = 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800';
    let insignia = null;

    if (estaSeleccionado) {
      estiloFondo = 'bg-[#7a132b] text-white border-[#7a132b] font-bold shadow-xs';
    } else if (infoDia.tipo === 'bloqueo') {
      estiloFondo = 'bg-rose-50 border-rose-200 text-rose-900';
      insignia = <Ban className="w-3 h-3 text-rose-500" />;
    } else if (infoDia.tipo === 'evento') {
      estiloFondo = 'bg-amber-50 border-amber-200 text-amber-900';
      insignia = <Clock className="w-3 h-3 text-amber-600" />;
    }

    celdasCalendario.push(
      <button
        key={`dia-${dia}`}
        type="button"
        onClick={() => alSeleccionarFecha && alSeleccionarFecha(fechaActualCadena)}
        className={`h-10 sm:h-12 border rounded-lg p-1 flex flex-col justify-between items-center transition-all cursor-pointer text-xs ${estiloFondo}`}
        title={`${fechaActualCadena} ${infoDia.tipo !== 'libre' ? `(${infoDia.tipo})` : '(Libre)'}`}
      >
        <span className="font-mono text-xs">{dia}</span>
        {insignia}
      </button>
    );
  }

  const infoDiaSeleccionado = fechaSeleccionada
    ? obtenerEstadoDia(parseInt(fechaSeleccionada.split('-')[2], 10))
    : null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs">
      {/* Cabecera del Mes */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
          {nombresMeses[mesActual]} {añoActual}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={mesAnterior}
            className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={mesSiguiente}
            className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Días de la Semana */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-neutral-400 uppercase mb-1">
        {diasSemana.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Cuadrícula de Fechas */}
      <div className="grid grid-cols-7 gap-1">{celdasCalendario}</div>

      {/* Leyenda */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-white border border-neutral-300" />
          <span>Libre / Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Ocupado por evento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Ban className="w-3 h-3 text-rose-600" />
          <span>Bloqueo Subdirección</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#7a132b]" />
          <span>Selección actual</span>
        </div>
      </div>

      {/* Detalle de la fecha seleccionada */}
      {fechaSeleccionada && infoDiaSeleccionado && (
        <div className="mt-3 p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs">
          <div className="font-semibold text-neutral-900 flex items-center justify-between">
            <span>Fecha seleccionada: {fechaSeleccionada}</span>
            <span
              className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${
                infoDiaSeleccionado.tipo === 'libre'
                  ? 'bg-emerald-100 text-emerald-800'
                  : infoDiaSeleccionado.tipo === 'evento'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {infoDiaSeleccionado.tipo}
            </span>
          </div>
          {infoDiaSeleccionado.elementos.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-neutral-600">
              {infoDiaSeleccionado.elementos.map((elem, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-neutral-400">·</span>
                  <span>{elem}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-emerald-700 font-medium">
              ✓ Sin ocupaciones programadas. Recinto completamente disponible.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
