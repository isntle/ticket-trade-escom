import React, { useState, useMemo } from 'react';
import {
  Layers,
  CheckCircle,
  Eye,
  Copy,
  Save,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Info,
  Building,
  Monitor,
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { MapaAsientos } from '../componentes/asientos/MapaAsientos';
import { ModalComparadorArreglos } from '../componentes/arreglos/ModalComparadorArreglos';
import { CategoriaAsiento, ConfiguracionAsiento, ArregloAsientos, Recinto } from '../tipos';

interface PropiedadesDistribucionAsientos {
  navigate: (ruta: string) => void;
}

export const DistribucionAsientosPagina: React.FC<PropiedadesDistribucionAsientos> = ({
  navigate
}) => {
  const {
    listaRecintos,
    listaEventos,
    listaArreglos,
    actualizarArreglo,
    crearArreglo,
    confirmarVersionFinalArreglo
  } = useDatos();

  const { mostrarNotificacion } = useNotificaciones();
  const { usuarioActual, rolActivo, cambiarRolActivo } = useAutenticacion();

  const puedeGestionar =
    usuarioActual.roles.some((r) => ['organizador', 'subdireccion', 'admin'].includes(r));

  // Protección de rol: los alumnos/asistentes no ven esta herramienta
  if (!puedeGestionar || rolActivo === 'asistente') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Módulo de Gestión Espacial Restringido</h2>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-md mx-auto">
            La configuración y distribución física de recintos (Auditorio, Sala 14 y Laboratorios de Cómputo) está reservada para comités organizadores y autoridades de ESCOM.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate('/eventos')}
              className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Ir a la Cartelera de Eventos
            </button>
            {puedeGestionar && (
              <button
                type="button"
                onClick={() => cambiarRolActivo('organizador')}
                className="boton-primario px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cambiar a perspectiva de Organizador
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Recinto seleccionado en la pestaña (por defecto: Auditorio Principal)
  const [idRecintoSeleccionado, setIdRecintoSeleccionado] = useState<string>('rec-auditorio');

  const recintoActivo =
    listaRecintos.find((r) => r.id === idRecintoSeleccionado) || listaRecintos[0];

  // Arreglos pertenecientes a este recinto
  const arreglosDelRecinto = useMemo(() => {
    return listaArreglos.filter((a) => a.idRecinto === idRecintoSeleccionado);
  }, [listaArreglos, idRecintoSeleccionado]);

  // Arreglo activo seleccionado
  const [idArregloSeleccionado, setIdArregloSeleccionado] = useState<string>('');

  const arregloActivo: ArregloAsientos | undefined = useMemo(() => {
    if (idArregloSeleccionado) {
      const encontrado = arreglosDelRecinto.find((a) => a.id === idArregloSeleccionado);
      if (encontrado) return encontrado;
    }
    return arreglosDelRecinto[0];
  }, [arreglosDelRecinto, idArregloSeleccionado]);

  // Herramienta de butaca activa
  const [herramientaActiva, setHerramientaActiva] = useState<
    CategoriaAsiento | 'bloquear' | 'eliminar'
  >('vip');

  const [modalComparadorAbierto, setModalComparadorAbierto] = useState(false);

  // Manejo de clic interactivo en una butaca o estación
  const manejarClicAsiento = (asiento: ConfiguracionAsiento) => {
    if (!arregloActivo) return;

    const asientosActualizados = arregloActivo.asientos.map((a) => {
      if (a.id === asiento.id) {
        if (herramientaActiva === 'bloquear') {
          return { ...a, estaBloqueado: !a.estaBloqueado };
        }
        if (herramientaActiva === 'eliminar') {
          if (!recintoActivo.permiteEliminarAsientos) {
            mostrarNotificacion(
              'Auditorio Fijo',
              'El Auditorio Principal y Laboratorios tienen mobiliario fijo; no se suprimen lugares físicos.',
              'advertencia'
            );
            return a;
          }
          return { ...a, estaEliminado: !a.estaEliminado };
        }
        return {
          ...a,
          categoria: herramientaActiva,
          estaBloqueado: false
        };
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
  };

  // Asignar fila completa como categoría seleccionada
  const asignarFilaCompleta = (fila: string, categoria: CategoriaAsiento | 'bloquear') => {
    if (!arregloActivo) return;

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
      `Toda la Fila/Mesa ${fila} fue configurada exitosamente.`,
      'exito'
    );
  };

  // Guardar y confirmar formalmente como Versión Oficial
  const marcarComoOficial = () => {
    if (!arregloActivo) return;
    confirmarVersionFinalArreglo(arregloActivo.idFechaEvento, arregloActivo.id);
    mostrarNotificacion(
      'Distribución Oficial Confirmada (1:1)',
      `La distribución de lugares para "${recintoActivo.nombre}" ha sido confirmada formalmente. Permanece editable en cualquier momento.`,
      'exito'
    );
  };

  // Duplicar como nuevo borrador para experimentar
  const duplicarBorrador = () => {
    if (!arregloActivo) return;
    const nuevo = crearArreglo({
      idFechaEvento: arregloActivo.idFechaEvento,
      idRecinto: recintoActivo.id,
      nombre: `${arregloActivo.nombre} (Borrador Alternativo)`,
      etiquetaVersion: `v${arreglosDelRecinto.length + 1}.0-borrador`,
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
    setIdArregloSeleccionado(nuevo.id);
    mostrarNotificacion('Nuevo borrador creado', `Se ha generado una copia editable para ${recintoActivo.nombre}`, 'exito');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Encabezado Principal */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
              Subsistema 02 · Espacios Físicos ESCOM
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              ✓ Edición Siempre Habilitada
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Distribución y Asignación de Butacas por Recinto
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-3xl">
            Edita de forma interactiva la disposición de lugares del Auditorio Principal, la Sala 14 modular
            y los Laboratorios de Cómputo. Asigna butacas VIP, lugares para comité organizador, staff de apoyo o bloqueos logísticos.
          </p>
        </div>

        {/* Acciones Globales */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {arreglosDelRecinto.length > 1 && (
            <button
              type="button"
              onClick={() => setModalComparadorAbierto(true)}
              className="px-3.5 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-600" />
              <span>Comparar Versiones</span>
            </button>
          )}

          <button
            type="button"
            onClick={duplicarBorrador}
            className="px-3.5 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-600" />
            <span>Duplicar Borrador</span>
          </button>

          <button
            type="button"
            onClick={marcarComoOficial}
            className="boton-primario px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Confirmar como Versión Oficial (1:1)</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Selección de Recinto */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-2 mb-6 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {listaRecintos.map((recinto) => {
            const activo = recinto.id === idRecintoSeleccionado;
            return (
              <button
                key={recinto.id}
                type="button"
                onClick={() => {
                  setIdRecintoSeleccionado(recinto.id);
                  setIdArregloSeleccionado('');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activo
                    ? 'bg-[#7a132b] text-white shadow-xs'
                    : 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {recinto.tipo === 'auditorio' ? (
                  <Building className="w-4 h-4" />
                ) : recinto.tipo === 'laboratorio' ? (
                  <Monitor className="w-4 h-4" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                <span>{recinto.nombre}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activo ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {recinto.capacidad} cupos
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de Arreglos y Métricas del Recinto Activo */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Selector de Variante */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
          <label className="block text-xs font-bold text-neutral-800 mb-1.5">
            Distribución Activa:
          </label>
          <select
            value={arregloActivo?.id || ''}
            onChange={(e) => setIdArregloSeleccionado(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-[#7a132b]"
          >
            {arreglosDelRecinto.map((arr) => (
              <option key={arr.id} value={arr.id}>
                {arr.nombre} ({arr.estado === 'version_final' ? 'Oficial 1:1' : 'Borrador'})
              </option>
            ))}
          </select>

          <div className="mt-3 text-[11px] text-neutral-500">
            <span className="font-semibold text-neutral-700">Estado: </span>
            {arregloActivo?.estado === 'version_final' ? (
              <span className="text-emerald-700 font-bold">Oficial Confirmado (Editable)</span>
            ) : (
              <span className="text-amber-700 font-bold">Modo Borrador</span>
            )}
          </div>
        </div>

        {/* Métricas de Asientos en Vivo */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 text-center shadow-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Total Lugares</span>
            <div className="text-xl font-extrabold text-neutral-900 mt-0.5">
              {arregloActivo?.totalAsientos || 0}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 text-center shadow-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Asistente General</span>
            <div className="text-xl font-extrabold text-neutral-900 mt-0.5">
              {arregloActivo?.asientosAsistente || 0}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 text-center shadow-xs">
            <span className="text-[10px] uppercase font-bold text-amber-600">★ VIP Invitados</span>
            <div className="text-xl font-extrabold text-amber-700 mt-0.5">
              {arregloActivo?.asientosVip || 0}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 text-center shadow-xs">
            <span className="text-[10px] uppercase font-bold text-indigo-600">Comité / Staff</span>
            <div className="text-xl font-extrabold text-indigo-700 mt-0.5">
              {(arregloActivo?.asientosOrganizador || 0) + (arregloActivo?.asientosStaff || 0)}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 text-center shadow-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Bloqueados</span>
            <div className="text-xl font-extrabold text-neutral-500 mt-0.5">
              {arregloActivo?.asientosBloqueados || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Herramientas de Edición Interactiva */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-neutral-900">Herramienta de asignación:</span>
          <span className="text-neutral-500 text-[11px]">
            (Selecciona una herramienta y haz clic sobre cualquier butaca para reconfigurarla)
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

          {recintoActivo.permiteEliminarAsientos && (
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

      {/* Accesos Rápidos de Asignación por Fila */}
      <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-neutral-600 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#7a132b]" />
          <span>Acciones rápidas por fila completa:</span>
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => asignarFilaCompleta('A', 'vip')}
            className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-amber-300 text-amber-900 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Fila A → Toda VIP
          </button>
          <button
            type="button"
            onClick={() => asignarFilaCompleta('B', 'organizador')}
            className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-indigo-300 text-indigo-900 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Fila B → Todo Comité
          </button>
          <button
            type="button"
            onClick={() => asignarFilaCompleta('K', 'bloquear')}
            className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Fila K → Bloquear Logística
          </button>
        </div>
      </div>

      {/* Mapa Visual de Asientos */}
      {arregloActivo ? (
        <MapaAsientos
          asientos={arregloActivo.asientos}
          modo="editor"
          tipoRecinto={recintoActivo.tipo}
          alSeleccionarAsiento={manejarClicAsiento}
          permiteEliminar={recintoActivo.permiteEliminarAsientos}
        />
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
          <p className="text-neutral-500 text-sm">No hay distribución cargada para este recinto.</p>
        </div>
      )}

      {/* Modal Comparador */}
      {modalComparadorAbierto && arreglosDelRecinto.length > 1 && (
        <ModalComparadorArreglos
          estaAbierto={modalComparadorAbierto}
          alCerrar={() => setModalComparadorAbierto(false)}
          arregloA={arreglosDelRecinto[0]}
          arregloB={arreglosDelRecinto[1] || arreglosDelRecinto[0]}
          recinto={recintoActivo}
        />
      )}
    </div>
  );
};
