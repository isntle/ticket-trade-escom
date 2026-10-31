import { aforoActividad } from '../dominio/actividades';
import { volverA } from '../dominio/navegacion';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, CheckCircle, Clock, MapPin, RefreshCw } from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { MapaAsientos } from '../componentes/asientos/MapaAsientos';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { obtenerContextoOcupacion } from '../dominio/ocupacion';

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
  const { usuarioActual } = useAutenticacion();

  // Seleccionar evento y fecha
  const contextoInicial = obtenerContextoOcupacion(listaEventos, usuarioActual, initialEventId, initialDateId);

  const [idEventoSeleccionado, setIdEventoSeleccionado] = useState<string>(() => {
    return initialEventId || contextoInicial.evento?.id || '';
  });


  const [idFechaSeleccionada, setIdFechaSeleccionada] = useState<string>(() => {
    return initialDateId || contextoInicial.fecha?.id || '';
  });
  const { eventosPermitidos, evento: eventoSeleccionado, fecha: fechaSeleccionada } = obtenerContextoOcupacion(listaEventos, usuarioActual, idEventoSeleccionado, idFechaSeleccionada);

  // Sincronizar los parámetros de la ruta con los selectores cuando el monitor
  // se abre desde otro caso de uso sin desmontar la página.
  useEffect(() => {
    const contexto = obtenerContextoOcupacion(listaEventos, usuarioActual, initialEventId, initialDateId);
    const eventoInicial = initialEventId || contexto.evento?.id || '';
    const fechaInicial = initialDateId || contexto.fecha?.id || '';

    setIdEventoSeleccionado((actual) => (actual === eventoInicial ? actual : eventoInicial));
    setIdFechaSeleccionada((actual) => (actual === fechaInicial ? actual : fechaInicial));
  }, [initialEventId, initialDateId, listaEventos, usuarioActual]);
  const recinto = listaRecintos.find((r) => r.id === fechaSeleccionada?.idRecinto);

  const arregloFinal = listaArreglos.find(
    (a) => a.idFechaEvento === fechaSeleccionada?.id && a.estado === 'version_final'
  );

  if (!eventoSeleccionado || !fechaSeleccionada) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo={!eventoSeleccionado ? 'Evento no disponible para tu cuenta' : !fechaSeleccionada ? 'Día no disponible' : 'Sin distribución final confirmada'}
          descripcion={!eventoSeleccionado ? 'Consulta únicamente tus eventos o los asignados a tu cuenta de personal de acceso.' : !fechaSeleccionada ? 'El día solicitado no pertenece al evento seleccionado.' : 'La ocupación requiere una distribución final de lugares para ese día.'}
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
      const asientoEncontrado = arregloFinal?.asientos.find((a) => a.etiqueta === b.etiquetaAsiento);
      if (asientoEncontrado) idsAsientosCheckIn.push(asientoEncontrado.id);
    }
  });

  // Asientos reservados para esta fecha
  const idsAsientosReservados = listaReservaciones
    .filter((r) => r.idFechaEvento === fechaSeleccionada.id && r.estado === 'confirmada' && r.idAsiento)
    .map((r) => r.idAsiento!);

  const totalIngresados = new Set(boletosCheckIn.map(b => b.idUsuario || b.idReservacion || b.id)).size;
  const totalReservados = new Set(listaBoletos.filter(b => b.idFechaEvento === fechaSeleccionada.id && (b.estado === 'valido' || b.estado === 'utilizado')).map(b => b.idUsuario || b.idReservacion || b.id)).size;
  const aforo = aforoActividad(fechaSeleccionada,eventoSeleccionado.aforoMaximo) ?? arregloFinal?.totalAsientos ?? recinto?.capacidad ?? 0;
  const porcentajeOcupacion = aforo > 0
    ? Math.round((totalIngresados / aforo) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate(volverA('/staff'))}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /><span>Regresar</span></button>

      {/* Cabecera del Monitor */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
            Monitor de Control en Puerta
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5">
            Ocupación de lugares
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Recinto: <span className="font-semibold text-neutral-800">{recinto?.nombre}</span> · Día: <span className="font-semibold text-neutral-800">{fechaSeleccionada.fecha}</span>
          </p>
        </div>

        {/* Selectores de Evento y Fecha */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Evento para consultar ocupación"
            value={eventoSeleccionado.id}
            onChange={(e) => {
              const ev = eventosPermitidos.find(item => item.id === e.target.value);
              if (!ev) return;
              setIdEventoSeleccionado(ev.id);
              setIdFechaSeleccionada(ev.fechas[0]?.id || '');
              navigate('/staff/ocupacion?eventId=' + encodeURIComponent(ev.id) + '&dateId=' + encodeURIComponent(ev.fechas[0]?.id || ''));
            }}
            className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none"
          >
            {eventosPermitidos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.titulo}
              </option>
            ))}
          </select>

          {eventoSeleccionado.fechas.length > 1 && (
            <select
              aria-label="Día para consultar ocupación"
              value={idFechaSeleccionada}
              onChange={(e) => {
                if (!eventoSeleccionado.fechas.some(dia => dia.id === e.target.value)) return;
                setIdFechaSeleccionada(e.target.value);
                navigate('/staff/ocupacion?eventId=' + encodeURIComponent(eventoSeleccionado.id) + '&dateId=' + encodeURIComponent(e.target.value));
              }}
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
          <div className="text-2xl font-black text-emerald-700 mt-1">{totalIngresados}</div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">{porcentajeOcupacion}% de aforo</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
            Boletos Reservados
          </span>
          <div className="text-2xl font-black text-sky-700 mt-1">{totalReservados}</div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Confirmados en taquilla</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
            Por Llegar
          </span>
          <div className="text-2xl font-black text-neutral-800 mt-1">
            {Math.max(0, totalReservados - totalIngresados)}
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Reservados sin entrada registrada</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Capacidad Total
          </span>
          <div className="text-2xl font-black text-neutral-900 mt-1">{aforo}</div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">Cupo de la actividad</span>
        </div>
      </div>

      {/* Componente del Mapa en Modo Ocupación */}
      {arregloFinal ? <MapaAsientos
        asientos={arregloFinal.asientos}
        modo="ocupacion"
        idsAsientosCheckIn={idsAsientosCheckIn}
        idsAsientosReservados={idsAsientosReservados}
        permiteEliminar={recinto?.permiteEliminarAsientos}
      /> : <p className="rounded-xl bg-neutral-50 p-4 text-neutral-700">El conteo incluye accesos sin butaca. No hay una distribución final para mostrar el mapa de esta actividad.</p>}
    </div>
  );
};
