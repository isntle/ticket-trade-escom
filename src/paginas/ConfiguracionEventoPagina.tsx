import React from 'react';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  Layers,
  Send,
  Eye,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';

interface PropiedadesConfiguracionEvento {
  eventId: string;
  navigate: (ruta: string) => void;
}

export const ConfiguracionEventoPagina: React.FC<PropiedadesConfiguracionEvento> = ({
  eventId,
  navigate
}) => {
  const { listaEventos, listaRecintos, obtenerListaDeVerificacion, publicarEvento } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();

  const evento = listaEventos.find((e) => e.id === eventId);
  const checklist = obtenerListaDeVerificacion(eventId);

  if (!evento) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Evento no encontrado"
          descripcion="El evento que intentas configurar no existe en la base de datos."
          textoAccion="Volver al panel"
          alHacerAccion={() => navigate('/organizador')}
        />
      </div>
    );
  }

  const obtenerNombreRecinto = (idRecinto: string) => {
    const r = listaRecintos.find((rec) => rec.id === idRecinto);
    return r ? r.nombre : 'Recinto no asignado';
  };

  const manejarPublicar = () => {
    const res = publicarEvento(evento.id);
    if (res.exito) {
      mostrarNotificacion(
        '¡Evento publicado oficialmente!',
        'El evento y su taquilla digital ya están disponibles en la cartelera general de ESCOM.',
        'exito'
      );
      navigate(`/eventos/${evento.id}`);
    } else {
      mostrarNotificacion('No se puede publicar', res.error || '', 'error');
    }
  };

  const esPublicado = evento.estado === 'publicado';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => navigate('/organizador')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Mis Eventos</span>
      </button>

      {/* Cabecera del Evento */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="font-mono text-neutral-400 font-bold uppercase">ID: {evento.id}</span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <InsigniaEstado estado={evento.estado} />
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span className="font-semibold text-neutral-700 capitalize">
              Modalidad: {evento.modalidadAsistencia}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            {evento.titulo}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl line-clamp-2">
            {evento.descripcion}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/eventos/${evento.id}`)}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-500" />
            <span>Ver Cartelera Pública</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BANNER HERO: ESTADO DE PREPARACIÓN PARA PUBLICAR                          */}
      {/* ========================================================================= */}
      {esPublicado ? (
        <div className="mb-8 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-emerald-900">
                Evento Publicado Oficialmente en Cartelera
              </h3>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                La taquilla digital está habilitada. Los alumnos y la comunidad politécnica pueden registrar su asistencia y reservar butacas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/eventos/${evento.id}`)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
          >
            Ver Evento en Cartelera →
          </button>
        </div>
      ) : (
        <div
          className={`mb-8 p-6 rounded-2xl border text-xs shadow-xs transition-all ${
            checklist.puedePublicar
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Fase de Preparación Normativa
                </span>
                {checklist.puedePublicar ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                    ✓ Listo para Publicar
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                    {checklist.elementosPendientes.length} Requisito(s) Pendiente(s)
                  </span>
                )}
              </div>
              <h2 className="text-base font-extrabold text-neutral-900">
                {checklist.puedePublicar
                  ? 'Todo está listo: La propuesta cumple con los requisitos normativos'
                  : 'Preparación de Evento Previo a Publicación en Cartelera'}
              </h2>
              <p className="text-neutral-500 text-xs max-w-2xl">
                {checklist.puedePublicar
                  ? 'Cada jornada cuenta con recinto autorizado y versión final (1:1) confirmada de lugares. Puedes abrir taquilla inmediatamente.'
                  : 'Revisa que cada sesión tenga su recinto asignado y su arreglo de lugares formalmente confirmado.'}
              </p>
            </div>

            {/* Botón de Publicación */}
            <div>
              <button
                type="button"
                disabled={!checklist.puedePublicar}
                onClick={manejarPublicar}
                className={`px-6 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  checklist.puedePublicar
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Publicar Evento en Cartelera</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUERPO PRINCIPAL: JORNADAS (IZQUIERDA) + CHECKLIST DETALLADO (DERECHA)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Jornadas y Configuración de Butacas (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Jornadas Programadas y Arreglos de Lugares (1:1)
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Para eventos con acceso controlado, cada fecha debe tener su distribución de butacas o estaciones confirmada.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {evento.fechas.map((fecha, i) => {
                const nombreRecinto = obtenerNombreRecinto(fecha.idRecinto);
                const tieneArregloConfirmado = Boolean(fecha.esFinalConfirmado);

                return (
                  <div
                    key={fecha.id}
                    className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 text-sm">
                          Jornada {i + 1}: {fecha.fecha}
                        </span>
                        {tieneArregloConfirmado ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Versión Oficial Lista</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Arreglo Pendiente</span>
                          </span>
                        )}
                      </div>

                      <div className="text-neutral-600 flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold text-neutral-800">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          {nombreRecinto}
                        </span>
                        <span aria-hidden="true" className="text-neutral-300">·</span>
                        <span className="flex items-center gap-1 font-mono text-neutral-500">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {fecha.horaInicio} - {fecha.horaFin} hrs
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/organizador/eventos/${evento.id}/fechas/${fecha.id}/arreglos`
                        )
                      }
                      className="px-4 py-2.5 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{tieneArregloConfirmado ? 'Revisar / Modificar Butacas' : 'Diseñar Butacas'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Checklist Detallado de Publicación (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7a132b]" />
              <span>Lista de Verificación (Checklist)</span>
            </h3>

            <div className="space-y-3 divide-y divide-neutral-100">
              {/* 1. Dictamen Subdirección */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.solicitudAutorizada ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Dictamen de Subdirección</div>
                  <div className="text-neutral-500 text-[11px]">
                    {checklist.solicitudAutorizada ? 'Autorizado formalmente' : 'Pendiente de dictamen'}
                  </div>
                </div>
              </div>

              {/* 2. Información General */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.informacionGeneralCompleta ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Información General Completa</div>
                  <div className="text-neutral-500 text-[11px]">
                    {checklist.informacionGeneralCompleta ? 'Título, descripción y ponentes registrados' : 'Faltan datos informativos'}
                  </div>
                </div>
              </div>

              {/* 3. Fechas y Recintos */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.todasLasFechasTienenRecinto ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Asignación de Recintos</div>
                  <div className="text-neutral-500 text-[11px]">
                    {checklist.todasLasFechasTienenRecinto ? 'Todos los días cuentan con espacio físico' : 'Días sin recinto asignado'}
                  </div>
                </div>
              </div>

              {/* 4. Arreglos Confirmados (1:1) */}
              <div className="pt-2 flex items-start gap-2.5">
                {checklist.todasLasFechasTienenVersionFinal ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900">Distribución de Asientos (1:1)</div>
                  <div className="text-neutral-500 text-[11px]">
                    {checklist.todasLasFechasTienenVersionFinal
                      ? 'Versión oficial confirmada en cada sesión'
                      : 'Faltan fechas por confirmar su distribución'}
                  </div>
                </div>
              </div>
            </div>

            {/* Elementos Pendientes si existen */}
            {checklist.elementosPendientes && checklist.elementosPendientes.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px] space-y-1">
                <span className="font-bold block text-amber-900">Pendiente para Publicar:</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {checklist.elementosPendientes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
