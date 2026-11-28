import { BotonRegresar } from '../componentes/ui/BotonRegresar';
import React, { useEffect, useState } from 'react';
import { MapaAsientos } from '../componentes/asientos/MapaAsientos';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useDatos } from '../contextos/DatosContexto';
import { numerarLugaresFisicos } from '../dominio/numeracionLugares';
import { modalidadActividad } from '../dominio/actividades';
import { etiquetaActividad } from '../dominio/taquilla';
import { ErrorApi, transporteApi } from '../servicios/http';
import type { ConfiguracionAsiento } from '../tipos';

const api = transporteApi();
const categorias = { asistente: 'Asistente', vip: 'VIP', staff: 'Staff', bloqueado: 'Bloqueado' } as const;
type Categoria = keyof typeof categorias;
type Lugar = {
  idLugarRecinto: string;
  codigo: string;
  fila: string | null;
  x: number;
  y: number;
  categoria: Categoria;
  fueraDeServicio: boolean;
  ocupado: boolean;
};
type Distribucion = {
  idRecinto: string;
  editable: boolean;
  aforo: number;
  version: string;
  lugares: Lugar[];
};
const boton = 'rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed';

/** Conserva los cambios locales tras recargar después de un 409 y descarta solo los que ya coinciden con el servidor. */
export function conciliarPendientesDistribucion(
  anteriores: Record<string, Categoria>,
  lugaresActuales: Pick<Lugar, 'idLugarRecinto' | 'categoria'>[],
): Record<string, Categoria> {
  const porId = new Map(lugaresActuales.map(lugar => [lugar.idLugarRecinto, lugar]));
  return Object.fromEntries(
    Object.entries(anteriores).filter(([id, valor]) => porId.get(id)?.categoria !== valor),
  );
}

export function evaluarMapaDistribucion(
  distribucion: Pick<Distribucion, 'editable' | 'lugares'> | undefined,
  pendientes: Record<string, Categoria>,
  laboratorio = false,
) {
  const lugares = distribucion?.lugares ?? [];
  const numeros = numerarLugaresFisicos(lugares, laboratorio);
  const motivosNoEditables = new Map<string, string>();
  const idsOcupados: string[] = [];
  const conteos = { asistente: 0, vip: 0, staff: 0, bloqueado: 0, ocupados: 0 };
  const mapa = lugares.map<ConfiguracionAsiento>((lugar, indice) => {
    const valor = pendientes[lugar.idLugarRecinto] ?? lugar.categoria;
    const motivo = lugar.ocupado ? 'Tiene un apartado o una reserva' : lugar.fueraDeServicio
      ? 'Fuera de servicio' : !distribucion?.editable ? 'Actividad en solo lectura' : '';
    if (motivo) motivosNoEditables.set(lugar.idLugarRecinto, motivo);
    if (lugar.ocupado) {
      idsOcupados.push(lugar.idLugarRecinto);
      conteos.ocupados++;
    }
    if (lugar.fueraDeServicio || valor === 'bloqueado') conteos.bloqueado++;
    else conteos[valor]++;
    return {
      id: lugar.idLugarRecinto,
      etiqueta: lugar.codigo,
      fila: lugar.fila || 'A',
      numero: numeros[indice],
      ...(laboratorio ? { equipoComputo: lugar.codigo } : {}),
      posicionX: lugar.x,
      posicionY: lugar.y,
      categoria: valor === 'bloqueado' ? 'asistente' : valor,
      estaBloqueado: valor === 'bloqueado' || lugar.fueraDeServicio,
    };
  });
  const cambios = Object.entries(pendientes);
  const cambiosImpedidos = cambios.filter(([id]) =>
    !lugares.some(lugar => lugar.idLugarRecinto === id) || motivosNoEditables.has(id),
  );
  return { lugares, mapa, motivosNoEditables, idsOcupados, conteos, cambios, cambiosImpedidos };
}

export interface PropiedadesDistribucionRemota {
  eventId?: string;
  dateId?: string;
  navigate?: (ruta: string) => void;
}

export function DistribucionActividadRemota({
  eventId,
  dateId,
  navigate,
}: PropiedadesDistribucionRemota) {
  const { usuarioActual, rolActivo } = useAutenticacion();
  const { listaEventos, listaRecintos } = useDatos();
  const claveInicial = eventId && dateId ? `${eventId}/${dateId}` : '';
  const [seleccion, setSeleccion] = useState(claveInicial);
  const [distribucion, setDistribucion] = useState<Distribucion>();
  const [pendientes, setPendientes] = useState<Record<string, Categoria>>({});
  const [categoria, setCategoria] = useState<Categoria>('vip');
  const [ocupado, setOcupado] = useState(false);
  const [lectura, setLectura] = useState(0);
  const [requiereConsulta, setRequiereConsulta] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!claveInicial) return;
    setSeleccion(claveInicial);
    setDistribucion(undefined);
    setPendientes({});
    setAviso('');
    setError('');
    setRequiereConsulta(false);
  }, [claveInicial]);

  const opciones = usuarioActual && ['organizador', 'subdireccion', 'admin'].includes(rolActivo)
    ? listaEventos.filter(ev =>
        ev.idOrganizador === usuarioActual.id || usuarioActual.roles.includes('subdireccion'),
      ).flatMap(ev => ev.fechas.flatMap((act, indice) =>
        modalidadActividad(act, ev.modalidadAsistencia) === 'controlado'
          ? [{
              valor: ev.id + '/' + act.id,
              etiqueta: ev.titulo + ' · ' + etiquetaActividad(act, listaRecintos, indice),
            }]
          : [],
      ))
    : [];

  const [idEventoActivo, idActividadActiva] = seleccion.split('/');
  const eventoActual = listaEventos.find(item => item.id === (idEventoActivo || eventId));
  const actividadActual = eventoActual?.fechas.find(item => item.id === (idActividadActiva || dateId));
  const puedeConsultar = Boolean(
    eventoActual && usuarioActual &&
    ['organizador', 'subdireccion', 'admin'].includes(rolActivo) &&
    (eventoActual.idOrganizador === usuarioActual.id || usuarioActual.roles.includes('subdireccion')),
  );
  const tieneAcceso = Boolean(
    puedeConsultar && actividadActual &&
    modalidadActividad(actividadActual, eventoActual!.modalidadAsistencia) === 'controlado',
  );
  const ruta = seleccion && opciones.some(opcion => opcion.valor === seleccion)
    ? `/organizacion/eventos/${encodeURIComponent(idEventoActivo)}/actividades/${encodeURIComponent(idActividadActiva)}/distribucion`
    : '';

  const mensajeSinAcceso = (() => {
    if (!eventId || !dateId || ruta) return '';
    if (!usuarioActual) return 'Inicia sesión para consultar o editar la distribución de esta actividad.';
    if (!eventoActual) return 'El evento ya no está disponible en este panel.';
    if (!puedeConsultar) return 'Solo el organizador responsable o Subdirección pueden administrar la distribución de esta actividad.';
    if (!actividadActual) return 'La actividad no está disponible en este evento. Vuelve al evento y elige otra actividad.';
    return 'Esta actividad no utiliza lugares asignados; solo las actividades con reservación con lugar asignado tienen distribución editable.';
  })();

  useEffect(() => {
    if (!ruta) return;
    const carga = new AbortController();
    setOcupado(true);
    setError('');
    void api<Distribucion>(ruta, { signal: carga.signal }).then(datos => {
      if (carga.signal.aborted) return;
      setDistribucion(datos);
      setPendientes(anteriores => conciliarPendientesDistribucion(anteriores, datos.lugares));
      setRequiereConsulta(false);
    }).catch((fallo: Error) => {
      if (!carga.signal.aborted) {
        setError(fallo.message);
        setRequiereConsulta(true);
      }
    }).finally(() => {
      if (!carga.signal.aborted) setOcupado(false);
    });
    return () => carga.abort();
  }, [ruta, lectura]);

  const recinto = listaRecintos.find(r => r.id === distribucion?.idRecinto);
  const laboratorio = recinto?.tipo === 'laboratorio';
  const {
    lugares,
    mapa,
    motivosNoEditables,
    idsOcupados,
    conteos,
    cambios,
    cambiosImpedidos,
  } = evaluarMapaDistribucion(distribucion, pendientes, laboratorio);

  async function guardar() {
    if (!ruta || ocupado || !distribucion?.editable || requiereConsulta || !cambios.length || cambiosImpedidos.length) return;
    setOcupado(true);
    setAviso('');
    setError('');
    try {
      const datos = await api<Distribucion>(ruta, {
        metodo: 'PATCH',
        datos: {
          version: distribucion.version,
          cambios: cambios.map(([idLugarRecinto, categoria]) => ({ idLugarRecinto, categoria })),
        },
      });
      setDistribucion(datos);
      setPendientes({});
      setAviso('Distribución guardada.');
      window.dispatchEvent(new Event('tt:datos-remotos'));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar la distribución.');
      if (!(fallo instanceof ErrorApi) || fallo.estado !== 422) setRequiereConsulta(true);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      {eventId && navigate && (
        <BotonRegresar destino="Volver al evento" alVolver={() => navigate(`/organizador/eventos/${eventId}`)} />
      )}
      <header className="rounded-2xl border border-neutral-200 border-t-4 border-t-[#7a132b] bg-white p-5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Distribución de lugares</h1>
        {tieneAcceso && eventoActual && actividadActual && (
          <div className="mt-2 space-y-1">
            <p className="font-semibold text-neutral-900">{eventoActual.titulo}</p>
            <p className="text-sm text-neutral-600">{etiquetaActividad(actividadActual, listaRecintos, eventoActual.fechas.indexOf(actividadActual))}</p>
          </div>
        )}
        {mensajeSinAcceso && (
          <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            {mensajeSinAcceso}
          </p>
        )}
      </header>
      {!claveInicial && <label className="block space-y-1 text-sm font-semibold">
        <span>Evento y actividad</span>
        <select className="block w-full rounded-lg border bg-white p-2 disabled:opacity-50"
          value={ruta ? seleccion : ''} disabled={ocupado || cambios.length > 0} onChange={e => {
            const nuevoValor = e.target.value;
            setSeleccion(nuevoValor);
            setDistribucion(undefined);
            setAviso('');
            setError('');
            setRequiereConsulta(false);
          }}>
          <option value="">Selecciona una actividad con lugares asignados</option>
          {opciones.map(opcion => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
        </select>
      </label>}
      {!opciones.length && !mensajeSinAcceso && <p>No hay actividades con lugares asignados disponibles para tu cuenta.</p>}
      {ocupado && <p role="status">Procesando distribución…</p>}
      {aviso && <p role="status" className="text-emerald-800">{aviso}</p>}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p role="alert" className="text-sm text-rose-900">{error}</p>
          {ruta && requiereConsulta && (
            <button type="button" className={boton + ' bg-white'} disabled={ocupado}
              onClick={() => { setAviso(''); setLectura(n => n + 1); }}>Actualizar distribución</button>
          )}
        </div>
      )}
      {ruta && requiereConsulta && <p className="text-sm text-neutral-700">Actualiza la distribución y revisa los cambios pendientes antes de guardar.</p>}
      {ruta && distribucion && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-neutral-700">{recinto?.nombre} · Aforo de la actividad {distribucion.aforo}</p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700">Asistente: {conteos.asistente}</span>
              <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-900">VIP: {conteos.vip}</span>
              <span className="rounded-md border border-purple-300 bg-purple-50 px-2.5 py-1 text-purple-900">Staff: {conteos.staff}</span>
              <span className="rounded-md border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-neutral-700">Bloqueado: {conteos.bloqueado}</span>
              {conteos.ocupados > 0 && (
                <span className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-sky-900">Ocupados (protegidos): {conteos.ocupados}</span>
              )}
            </div>
          </div>
          {!distribucion.editable && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              La actividad está en solo lectura. No se pueden modificar lugares en actividades canceladas, pasadas, suspendidas o con bloqueo vigente.
            </p>
          )}
          {distribucion.editable && <label className="block text-sm font-semibold">
            Categoría para asignar
            <select className="ml-2 rounded-lg border bg-white p-2" value={categoria} disabled={ocupado || requiereConsulta}
              onChange={e => setCategoria(e.target.value as Categoria)}>
              {Object.entries(categorias).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </label>}
          {cambios.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-white p-3 text-sm">
              <p className="font-semibold">Cambios pendientes ({cambios.length})</p>
              <ul className="space-y-1">
                {cambios.map(([id, valor]) => {
                  const lugar = lugares.find(item => item.idLugarRecinto === id);
                  const impedimento = motivosNoEditables.get(id);
                  return (
                    <li key={id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {lugar?.codigo ?? id} · {lugar ? categorias[lugar.categoria] : 'Sin lugar'} → {categorias[valor]}
                        {impedimento && <span className="ml-2 font-semibold text-rose-700">({impedimento})</span>}
                      </span>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => setPendientes(prev => {
                          const siguiente = { ...prev };
                          delete siguiente[id];
                          return siguiente;
                        })}
                        className="text-xs font-semibold text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50 cursor-pointer"
                      >
                        Quitar
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!!cambiosImpedidos.length && (
                <p role="alert" className="text-rose-800 font-medium">
                  Hay lugares pendientes que ya no se pueden editar. Quita los lugares impedidos o descarta los cambios para continuar.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={boton + ' bg-[#7a132b] text-white'}
                  disabled={ocupado || requiereConsulta || !distribucion.editable || cambiosImpedidos.length > 0}
                  onClick={() => void guardar()}>Guardar cambios</button>
                {!!cambiosImpedidos.length && (
                  <button
                    type="button"
                    className={boton + ' border-amber-300 bg-amber-50 text-amber-950'}
                    disabled={ocupado}
                    onClick={() => setPendientes(prev => {
                      const impedidos = new Set(cambiosImpedidos.map(([id]) => id));
                      return Object.fromEntries(Object.entries(prev).filter(([id]) => !impedidos.has(id)));
                    })}
                  >
                    Quitar no editables
                  </button>
                )}
                <button type="button" className={boton} disabled={ocupado} onClick={() => setPendientes({})}>Descartar cambios</button>
              </div>
            </div>
          )}
          {mapa.length ? (
            <MapaAsientos
              asientos={mapa}
              modo="editor"
              tipoRecinto={recinto?.tipo}
              idsAsientosReservados={idsOcupados}
              motivosNoEditables={motivosNoEditables}
              editorDeshabilitado={ocupado || requiereConsulta || !distribucion.editable}
              ocultarOrganizador
              mostrarLeyendaOcupado
              alSeleccionarAsiento={asiento => {
                const lugar = lugares.find(fila => fila.idLugarRecinto === asiento.id);
                if (!lugar || motivosNoEditables.has(asiento.id) || ocupado || requiereConsulta) return;
                setAviso('');
                setPendientes(previos => {
                  const siguiente = { ...previos };
                  if (lugar.categoria === categoria) delete siguiente[asiento.id];
                  else siguiente[asiento.id] = categoria;
                  return siguiente;
                });
              }}
            />
          ) : <p>El recinto todavía no tiene lugares configurados.</p>}
        </section>
      )}
    </section>
  );
}
