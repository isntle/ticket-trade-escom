import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Layers,
  Ban,
  Star,
  Users,
  Eye,
  SlidersHorizontal,
  Info,
  Building,
  Monitor,
  Sparkles,
  ShieldAlert,
  Save,
  RotateCcw
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { MapaAsientos } from '../componentes/asientos/MapaAsientos';
import { ModalComparadorArreglos } from '../componentes/arreglos/ModalComparadorArreglos';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { CategoriaAsiento, ConfiguracionAsiento, ArregloAsientos } from '../tipos';

interface PropiedadesEditorArreglos {
  eventId: string;
  dateId: string;
  navigate: (ruta: string) => void;
}

export const EditorArreglosPagina: React.FC<PropiedadesEditorArreglos> = ({
  eventId,
  dateId,
  navigate
}) => {
  const {
    listaEventos,
    listaRecintos,
    listaArreglos,
    crearArreglo,
    actualizarArreglo,
    confirmarVersionFinalArreglo
  } = useDatos();

  const { mostrarNotificacion } = useNotificaciones();

  const evento = listaEventos.find((e) => e.id === eventId);
  const fecha = evento?.fechas.find((f) => f.id === dateId);
  const recinto = listaRecintos.find((r) => r.id === fecha?.idRecinto);

  // Arreglos de esta fecha
  const arreglosFecha = listaArreglos.filter((a) => a.idFechaEvento === dateId);

  const [idArregloActivo, setIdArregloActivo] = useState<string>(() => {
    return arreglosFecha[0]?.id || '';
  });

  const arregloActivo = arreglosFecha.find((a) => a.id === idArregloActivo) || arreglosFecha[0];

  // Herramienta seleccionada para aplicar a las butacas
  const [herramientaActiva, setHerramientaActiva] = useState<
    CategoriaAsiento | 'bloquear' | 'eliminar'
  >('vip');

  const [modalComparadorAbierto, setModalComparadorAbierto] = useState(false);

  if (!evento || !fecha || !recinto || !arregloActivo) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Arreglo de asientos no encontrado"
          descripcion="No existen borradores de distribución de asientos para este día del evento."
          textoAccion="Volver al evento"
          alHacerAccion={() => navigate(`/organizador/eventos/${eventId}`)}
        />
      </div>
    );
  }

  // Aplicar acción al hacer clic en un asiento del mapa (100% interactivo)
  const manejarClicAsiento = (asiento: ConfiguracionAsiento) => {
    const asientosActualizados = arregloActivo.asientos.map((a) => {
      if (a.id === asiento.id) {
        if (herramientaActiva === 'bloquear') {
          return { ...a, estaBloqueado: !a.estaBloqueado };
        }
        if (herramientaActiva === 'eliminar') {
          if (!recinto.permiteEliminarAsientos) {
            mostrarNotificacion(
              'Mobiliario Fijo',
              `El ${recinto.nombre} cuenta con plazas fijas; no se permite suprimir lugares físicos.`,
              'advertencia'
            );
            return a;
          }
          return { ...a, estaEliminado: !a.estaEliminado };
        }
        return { ...a, categoria: herramientaActiva, estaBloqueado: false };
      }
      return a;
    });

    // Recalcular métricas
    const total = asientosActualizados.filter((a) => !a.estaEliminado).length;
    const asistentes = asientosActualizados.filter(
      (a) => a.categoria === 'asistente' && !a.estaEliminado && !a.estaBloqueado
    ).length;
    const vips = asientosActualizados.filter((a) => a.categoria === 'vip' && !a.estaEliminado).length;
    const organizadores = asientosActualizados.filter(
      (a) => a.categoria === 'organizador' && !a.estaEliminado
    ).length;
    const staffs = asientosActualizados.filter(
      (a) => a.categoria === 'staff' && !a.estaEliminado
    ).length;
    const bloqueados = asientosActualizados.filter(
      (a) => a.estaBloqueado && !a.estaEliminado
    ).length;

    actualizarArreglo(arregloActivo.id, {
      asientos: asientosActualizados,
      totalAsientos: total,
      asientosAsistente: asistentes,
      asientosVip: vips,
      asientosOrganizador: organizadores,
      asientosStaff: staffs,
      asientosBloqueados: bloqueados
    });
  };

  // Asignar fila completa
  const asignarFilaCompleta = (fila: string, categoria: CategoriaAsiento | 'bloquear') => {
    const asientosActualizados = arregloActivo.asientos.map((a) => {
      if (a.fila === fila) {
        if (categoria === 'bloquear') {
          return { ...a, estaBloqueado: true };
        }
        return { ...a, categoria, estaBloqueado: false };
      }
      return a;
    });

    const total = asientosActualizados.filter((a) => !a.estaEliminado).length;
    const asistentes = asientosActualizados.filter(
      (a) => a.categoria === 'asistente' && !a.estaEliminado && !a.estaBloqueado
    ).length;
    const vips = asientosActualizados.filter((a) => a.categoria === 'vip' && !a.estaEliminado).length;
    const organizadores = asientosActualizados.filter(
      (a) => a.categoria === 'organizador' && !a.estaEliminado
    ).length;
    const staffs = asientosActualizados.filter(
      (a) => a.categoria === 'staff' && !a.estaEliminado
    ).length;
    const bloqueados = asientosActualizados.filter(
      (a) => a.estaBloqueado && !a.estaEliminado
    ).length;

    actualizarArreglo(arregloActivo.id, {
      asientos: asientosActualizados,
      totalAsientos: total,
      asientosAsistente: asistentes,
      asientosVip: vips,
      asientosOrganizador: organizadores,
      asientosStaff: staffs,
      asientosBloqueados: bloqueados
    });

    mostrarNotificacion(
      'Fila actualizada',
      `Toda la Fila/Mesa ${fila} fue configurada con éxito.`,
      'exito'
    );
  };

  // Crear una nueva versión borrador a partir de la actual
  const duplicarComoNuevoBorrador = () => {
    const nuevo = crearArreglo({
      idFechaEvento: fecha.id,
      idRecinto: recinto.id,
      nombre: `Borrador ${arreglosFecha.length + 1}`,
      etiquetaVersion: `v1.${arreglosFecha.length}-borrador`,
      estado: 'borrador',
      asientos: JSON.parse(JSON.stringify(arregloActivo.asientos)),
      totalAsientos: arregloActivo.totalAsientos,
      asientosAsistente: arregloActivo.asientosAsistente,
      asientosVip: arregloActivo.asientosVip,
      asientosOrganizador: arregloActivo.asientosOrganizador,
      asientosStaff: arregloActivo.asientosStaff,
      asientosBloqueados: arregloActivo.asientosBloqueados,
      asientosSinAsignar: 0
    });

    setIdArregloActivo(nuevo.id);
    mostrarNotificacion('Nuevo borrador creado', `Se ha generado ${nuevo.nombre}`, 'exito');
  };

  // Confirmar formalmente como Versión Final (1:1)
  const fijarComoVersionFinal = () => {
    confirmarVersionFinalArreglo(fecha.id, arregloActivo.id);
    mostrarNotificacion(
      'Distribución Oficial Confirmada (1:1)',
      `El arreglo "${arregloActivo.nombre}" ha sido confirmado como oficial para la fecha ${fecha.fecha}. Permanece editable en todo momento.`,
      'exito'
    );
  };

  // Cálculo del porcentaje de ocupación habilitada para asistentes
  const porcentajeAsistentes = Math.round(
    (arregloActivo.asientosAsistente / (arregloActivo.totalAsientos || 1)) * 100
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Botón Volver con contexto del evento */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate(`/organizador/eventos/${eventId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la configuración del evento: {evento.titulo}</span>
        </button>

        <div className="text-xs text-neutral-400 font-mono">
          Recinto: <span className="font-semibold text-neutral-700">{recinto.nombre}</span> · Sesión: <span className="font-semibold text-neutral-700">{fecha.fecha}</span>
        </div>
      </div>

      {/* Cabecera del Editor Hero */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="font-mono text-neutral-400">{fecha.fecha}</span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span className="font-semibold text-[#7a132b]">{recinto.nombre}</span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span
              className={`font-semibold ${
                arregloActivo.estado === 'version_final'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {arregloActivo.estado === 'version_final'
                ? '✓ Distribución Oficial Confirmada'
                : 'Borrador en Edición'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            {arregloActivo.nombre}
          </h1>
        </div>

        {/* Acciones Superiores de Versión */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {arreglosFecha.length > 1 && (
            <button
              type="button"
              onClick={() => setModalComparadorAbierto(true)}
              className="px-3.5 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-500" />
              <span>Comparar Versiones</span>
            </button>
          )}

          <button
            type="button"
            onClick={duplicarComoNuevoBorrador}
            className="px-3.5 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-500" />
            <span>Duplicar Borrador</span>
          </button>

          <button
            type="button"
            onClick={fijarComoVersionFinal}
            className="boton-primario px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              {arregloActivo.estado === 'version_final'
                ? 'Guardar Distribución Oficial'
                : 'Confirmar como Versión Oficial (1:1)'}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Herramientas de Asignación Espacial */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-neutral-900">Herramienta de asignación activa:</span>
          <span className="text-neutral-500 text-[11px]">
            (Selecciona y haz clic en cualquier lugar para aplicarla)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setHerramientaActiva('asistente')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
              herramientaActiva === 'asistente'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Asistente General
          </button>

          <button
            type="button"
            onClick={() => setHerramientaActiva('vip')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
              herramientaActiva === 'vip'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
            }`}
          >
            ★ Asignar VIP
          </button>

          <button
            type="button"
            onClick={() => setHerramientaActiva('organizador')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
              herramientaActiva === 'organizador'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200'
            }`}
          >
            Comité Organizador
          </button>

          <button
            type="button"
            onClick={() => setHerramientaActiva('staff')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
              herramientaActiva === 'staff'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-100 text-purple-900 hover:bg-purple-200'
            }`}
          >
            Staff Técnico
          </button>

          <button
            type="button"
            onClick={() => setHerramientaActiva('bloquear')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
              herramientaActiva === 'bloquear'
                ? 'bg-neutral-600 text-white shadow-xs'
                : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
            }`}
          >
            Bloquear Butaca
          </button>

          {recinto.permiteEliminarAsientos && (
            <button
              type="button"
              onClick={() => setHerramientaActiva('eliminar')}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
                herramientaActiva === 'eliminar'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-100 text-rose-900 hover:bg-rose-200'
              }`}
            >
              Suprimir Módulo (Sala 14)
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAYOUT PRINCIPAL HERO: CANVAS CENTRAL (8 COLS) + INSPECTOR LATERAL (4 COLS)*/}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Espacial Central */}
        <div className="lg:col-span-8 space-y-4">
          <MapaAsientos
            asientos={arregloActivo.asientos}
            modo="editor"
            tipoRecinto={recinto.tipo}
            alSeleccionarAsiento={manejarClicAsiento}
            permiteEliminar={recinto.permiteEliminarAsientos}
          />
        </div>

        {/* Inspector Lateral de Distribución */}
        <div className="lg:col-span-4 space-y-5">
          {/* Panel de Resumen de Aforo */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Inspector de Aforo y Métricas
            </h3>

            {/* Barra de progreso de aforo para asistentes */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-neutral-500">Capacidad para Público</span>
                <span className="font-bold text-neutral-900">
                  {arregloActivo.asientosAsistente} de {arregloActivo.totalAsientos} ({porcentajeAsistentes}%)
                </span>
              </div>
              <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-[#7a132b] h-full transition-all duration-300"
                  style={{ width: `${porcentajeAsistentes}%` }}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (arregloActivo.asientosVip / (arregloActivo.totalAsientos || 1)) * 100
                    )}%`
                  }}
                />
                <div
                  className="bg-neutral-300 h-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (arregloActivo.asientosBloqueados / (arregloActivo.totalAsientos || 1)) * 100
                    )}%`
                  }}
                />
              </div>
            </div>

            {/* Desglose numérico por rol */}
            <div className="divide-y divide-neutral-100 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-neutral-900" />
                  Asistentes Generales
                </span>
                <span className="font-mono font-bold text-neutral-900">
                  {arregloActivo.asientosAsistente}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                  Invitados VIP
                </span>
                <span className="font-mono font-bold text-amber-700">
                  {arregloActivo.asientosVip}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                  Comité Organizador
                </span>
                <span className="font-mono font-bold text-indigo-700">
                  {arregloActivo.asientosOrganizador}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
                  Staff de Apoyo
                </span>
                <span className="font-mono font-bold text-purple-700">
                  {arregloActivo.asientosStaff}
                </span>
              </div>

              <div className="py-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-neutral-300" />
                  Lugares Bloqueados
                </span>
                <span className="font-mono font-bold text-neutral-500">
                  {arregloActivo.asientosBloqueados}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas por Fila Completa */}
          <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 space-y-3 text-xs">
            <span className="font-bold text-neutral-800 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#7a132b]" />
              <span>Configuración rápida por fila completa:</span>
            </span>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => asignarFilaCompleta('A', 'vip')}
                className="w-full py-1.5 px-3 bg-white border border-neutral-200 hover:border-amber-300 text-amber-900 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Fila A / Mesa Frontal → Toda VIP</span>
                <Star className="w-3.5 h-3.5 text-amber-500" />
              </button>

              <button
                type="button"
                onClick={() => asignarFilaCompleta('B', 'organizador')}
                className="w-full py-1.5 px-3 bg-white border border-neutral-200 hover:border-indigo-300 text-indigo-900 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Fila B → Comité Organizador</span>
                <Users className="w-3.5 h-3.5 text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={() => asignarFilaCompleta('K', 'bloquear')}
                className="w-full py-1.5 px-3 bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-700 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Fila K / Posterior → Bloquear Logística</span>
                <Ban className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Versiones / Borradores de esta fecha */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Versiones ({arreglosFecha.length})
              </span>
              <button
                type="button"
                onClick={duplicarComoNuevoBorrador}
                className="text-xs font-semibold text-[#7a132b] hover:underline cursor-pointer"
              >
                + Nuevo
              </button>
            </div>

            <div className="space-y-2">
              {arreglosFecha.map((arr) => {
                const esActivo = arr.id === arregloActivo.id;
                return (
                  <div
                    key={arr.id}
                    onClick={() => setIdArregloActivo(arr.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      esActivo
                        ? 'border-[#7a132b] bg-[#7a132b]/5 ring-1 ring-[#7a132b]/20'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-neutral-900">{arr.nombre}</span>
                      <span className="font-mono text-[10px] text-neutral-500 font-semibold">
                        {arr.etiquetaVersion}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{arr.totalAsientos} plazas ({arr.asientosVip} VIP)</span>
                      <span className={arr.estado === 'version_final' ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                        {arr.estado === 'version_final' ? 'Oficial 1:1' : 'Borrador'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Comparador */}
      {modalComparadorAbierto && arreglosFecha.length > 1 && (
        <ModalComparadorArreglos
          estaAbierto={modalComparadorAbierto}
          alCerrar={() => setModalComparadorAbierto(false)}
          arregloA={arreglosFecha[0]}
          arregloB={arreglosFecha[1] || arreglosFecha[0]}
          recinto={recinto}
        />
      )}
    </div>
  );
};
