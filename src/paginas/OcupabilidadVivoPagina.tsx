import React, { useState } from 'react';
import { ArrowLeft, Users, CheckCircle, Clock, MapPin, RefreshCw } from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { MapaAsientos } from '../componentes/asientos/MapaAsientos';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';

interface PropiedadesOcupabilidadVivo {
  navigate: (ruta: string) => void;
  initialEventId?: string;
  initialDateId?: string;
}

export const OcupabilidadVivoPagina: React.FC<PropiedadesOcupabilidadVivo> = ({
  navigate,
  initialEventId,
  initialDateId
}) => {
  const { listaEventos, listaArreglos, listaBoletos, listaReservaciones, listaRecintos } = useDatos();

  // Seleccionar evento y fecha
  const eventosPublicados = listaEventos.filter((e) => e.estado === 'publicado');

  const [idEventoSeleccionado, setIdEventoSeleccionado] = useState<string>(() => {
    return initialEventId || eventosPublicados[0]?.id || '';
  });

  const eventoSeleccionado = listaEventos.find((e) => e.id === idEventoSeleccionado) || eventosPublicados[0];

  const [idFechaSeleccionada, setIdFechaSeleccionada] = useState<string>(() => {
    return initialDateId || eventoSeleccionado?.fechas[0]?.id || '';
  });

  const fechaSeleccionada = eventoSeleccionado?.fechas.find((f) => f.id === idFechaSeleccionada) || eventoSeleccionado?.fechas[0];
  const recinto = listaRecintos.find((r) => r.id === fechaSeleccionada?.idRecinto);

  const arregloFinal = listaArreglos.find(
    (a) => a.idFechaEvento === fechaSeleccionada?.id && a.estado === 'version_final'
  ) || listaArreglos.find((a) => a.idFechaEvento === fechaSeleccionada?.id);

  if (!eventoSeleccionado || !fechaSeleccionada || !arregloFinal) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="No hay datos de ocupación disponibles"
          descripcion="Selecciona un evento publicado con versión final de asientos confirmada."
          textoAccion="Volver al escáner"
          alHacerAccion={() => navigate('/staff')}
        />
      </div>
    );
  }

  // Boletos de esta fecha que ya hicieron check-in
  const boletosCheckIn = listaBoletos.filter(
    (b) => b.idFechaEvento === fechaSeleccionada.id && b.estado === 'utilizado'
  );

  // Mapear IDs de asientos con check-in
  const idsAsientosCheckIn: string[] = [];
  boletosCheckIn.forEach((b) => {
    if (b.etiquetaAsiento) {
      const asientoEncontrado = arregloFinal.asientos.find((a) => a.etiqueta === b.etiquetaAsiento);
      if (asientoEncontrado) idsAsientosCheckIn.push(asientoEncontrado.id);
    }
  });

  // Asientos reservados para esta fecha
  const idsAsientosReservados = listaReservaciones
    .filter((r) => r.idFechaEvento === fechaSeleccionada.id && r.estado === 'confirmada' && r.idAsiento)
    .map((r) => r.idAsiento!);

  const porcentajeOcupacion = arregloFinal.totalAsientos > 0
    ? Math.round((idsAsientosCheckIn.length / arregloFinal.totalAsientos) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate('/staff')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al escáner de entrada</span>
      </button>

      {/* Cabecera del Monitor */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
            Monitor de Control en Puerta
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5">
            Ocupabilidad de Sala en Tiempo Real
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Recinto: <span className="font-semibold text-neutral-800">{recinto?.nombre}</span> · Sesión: <span className="font-semibold text-neutral-800">{fechaSeleccionada.fecha}</span>
          </p>
        </div>

        {/* Selectores de Evento y Fecha */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={idEventoSeleccionado}
            onChange={(e) => {
              setIdEventoSeleccionado(e.target.value);
              const ev = listaEventos.find((evItem) => evItem.id === e.target.value);
              if (ev?.fechas[0]) setIdFechaSeleccionada(ev.fechas[0].id);
            }}
            className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none"
          >
            {eventosPublicados.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.titulo}
              </option>
            ))}
          </select>

          {eventoSeleccionado.fechas.length > 1 && (
            <select
              value={idFechaSeleccionada}
              onChange={(e) => setIdFechaSeleccionada(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none"
            >
              {eventoSeleccionado.fechas.map((f, i) => (
                <option key={f.id} value={f.id}>
                  Día {i + 1}: {f.fecha}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas de Acceso en Vivo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Asistentes en Sala
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{idsAsientosCheckIn.length}</div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">{porcentajeOcupacion}% de aforo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
            Boletos Reservados
          </span>
          <div className="text-2xl font-black text-sky-700 mt-1">{idsAsientosReservados.length}</div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Confirmados en taquilla</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
            Por Llegar
          </span>
          <div className="text-2xl font-black text-neutral-800 mt-1">
            {Math.max(0, idsAsientosReservados.length - idsAsientosCheckIn.length)}
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">En camino al recinto</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Capacidad Total
          </span>
          <div className="text-2xl font-black text-neutral-900 mt-1">{arregloFinal.totalAsientos}</div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Butacas activas</span>
        </div>
      </div>

      {/* Componente del Mapa en Modo Ocupación */}
      <MapaAsientos
        asientos={arregloFinal.asientos}
        modo="ocupacion"
        idsAsientosCheckIn={idsAsientosCheckIn}
        idsAsientosReservados={idsAsientosReservados}
        permiteEliminar={recinto?.permiteEliminarAsientos}
      />
    </div>
  );
};
