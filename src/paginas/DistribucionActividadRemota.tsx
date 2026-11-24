import React, { useEffect, useState } from 'react';
import { MapaAsientos } from '../componentes/asientos/MapaAsientos';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useDatos } from '../contextos/DatosContexto';
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
const boton = 'rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50';

export function DistribucionActividadRemota() {
  const { usuarioActual, rolActivo } = useAutenticacion();
  const { listaEventos, listaRecintos } = useDatos();
  const [seleccion, setSeleccion] = useState('');
  const [distribucion, setDistribucion] = useState<Distribucion>();
  const [pendientes, setPendientes] = useState<Record<string, Categoria>>({});
  const [categoria, setCategoria] = useState<Categoria>('vip');
  const [ocupado, setOcupado] = useState(false);
  const [lectura, setLectura] = useState(0);
  const [requiereConsulta, setRequiereConsulta] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const opciones = usuarioActual && ['organizador', 'subdireccion', 'admin'].includes(rolActivo)
    ? listaEventos.filter(evento =>
        evento.idOrganizador === usuarioActual.id || usuarioActual.roles.includes('subdireccion')
      ).flatMap(evento => evento.fechas.flatMap((actividad, indice) =>
        modalidadActividad(actividad, evento.modalidadAsistencia) === 'controlado'
          ? [{
              valor: evento.id + '/' + actividad.id,
              etiqueta: evento.titulo + ' · ' + etiquetaActividad(actividad, listaRecintos, indice),
            }]
          : []
      ))
    : [];
  const [evento, actividad] = seleccion.split('/');
  const ruta = opciones.some(opcion => opcion.valor === seleccion)
    ? `/organizacion/eventos/${encodeURIComponent(evento)}/actividades/${encodeURIComponent(actividad)}/distribucion`
    : '';

  useEffect(() => {
    if (!ruta) return;
    const carga = new AbortController();
    setOcupado(true);
    setError('');
    void api<Distribucion>(ruta, { signal: carga.signal }).then(datos => {
      if (carga.signal.aborted) return;
      setDistribucion(datos);
      setPendientes(anteriores => {
        const lugares = new Map(datos.lugares.map(lugar => [lugar.idLugarRecinto, lugar]));
        // Conserva el borrador y exige una acción explícita si un lugar quedó inhabilitado.
        return Object.fromEntries(Object.entries(anteriores).filter(([id, valor]) => lugares.get(id)?.categoria !== valor));
      });
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

  const cambios = Object.entries(pendientes);
  const recinto = listaRecintos.find(r => r.id === distribucion?.idRecinto);
  const lugares = distribucion?.lugares ?? [];
  const motivosNoEditables = new Map<string, string>();
  const mapa = lugares.map<ConfiguracionAsiento>((lugar, indice) => {
    const valor = pendientes[lugar.idLugarRecinto] ?? lugar.categoria;
    const motivo = lugar.ocupado ? 'Tiene un apartado o una reserva' : lugar.fueraDeServicio
      ? 'Fuera de servicio' : !distribucion?.editable ? 'Actividad en solo lectura' : '';
    if (motivo) motivosNoEditables.set(lugar.idLugarRecinto, motivo);
    return {
      id: lugar.idLugarRecinto,
      etiqueta: lugar.codigo,
      fila: lugar.fila ?? '',
      numero: Number(lugar.codigo.match(/\d+$/)?.[0] ?? indice + 1),
      posicionX: lugar.x,
      posicionY: lugar.y,
      categoria: valor === 'bloqueado' ? 'asistente' : valor,
      estaBloqueado: valor === 'bloqueado' || lugar.fueraDeServicio || lugar.ocupado,
    };
  });
  const cambiosImpedidos = cambios.filter(([id]) =>
    !lugares.some(lugar => lugar.idLugarRecinto === id) || motivosNoEditables.has(id)
  );

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
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold">Distribución de espacios</h1>
      <label className="block space-y-1 text-sm font-semibold">
        <span>Evento y actividad</span>
        <select className="block w-full rounded-lg border p-2 disabled:opacity-50"
          value={ruta ? seleccion : ''} disabled={ocupado || cambios.length > 0} onChange={e => {
            setSeleccion(e.target.value);
            setDistribucion(undefined);
            setAviso('');
            setError('');
            setRequiereConsulta(false);
          }}>
          <option value="">Selecciona una actividad con lugares asignados</option>
          {opciones.map(opcion => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
        </select>
      </label>
      {!opciones.length && <p>No hay actividades con lugares asignados disponibles para tu cuenta.</p>}
      {ocupado && <p role="status">Procesando distribución…</p>}
      {aviso && <p role="status" className="text-emerald-800">{aviso}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}
      {ruta && (error || distribucion) && <button type="button" className={boton} disabled={ocupado}
        onClick={() => { setAviso(''); setLectura(n => n + 1); }}>Volver a consultar</button>}
      {ruta && requiereConsulta && <p className="text-sm">Vuelve a consultar y revisa los cambios pendientes antes de guardar.</p>}
      {ruta && distribucion && (
        <section className="space-y-4">
          <p className="text-sm">{recinto?.nombre} · Aforo de la actividad {distribucion.aforo}</p>
          {!distribucion.editable && <p>La actividad está en solo lectura.</p>}
          {distribucion.editable && <label className="block text-sm font-semibold">
            Categoría para asignar
            <select className="ml-2 rounded-lg border p-2" value={categoria} disabled={ocupado || requiereConsulta}
              onChange={e => setCategoria(e.target.value as Categoria)}>
              {Object.entries(categorias).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </label>}
          {cambios.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="font-semibold">Cambios pendientes</p>
              <ul>
                {cambios.map(([id, valor]) => {
                  const lugar = lugares.find(lugar => lugar.idLugarRecinto === id);
                  return <li key={id}>{lugar?.codigo ?? id} · {lugar ? categorias[lugar.categoria] : 'Sin lugar'} → {categorias[valor]}</li>;
                })}
              </ul>
              {!!cambiosImpedidos.length && <p role="alert">Hay lugares pendientes que ya no se pueden editar. Descarta los cambios para continuar.</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={boton + ' bg-[#7a132b] text-white'}
                  disabled={ocupado || requiereConsulta || !distribucion.editable || cambiosImpedidos.length > 0}
                  onClick={() => void guardar()}>Guardar cambios</button>
                <button type="button" className={boton} disabled={ocupado} onClick={() => setPendientes({})}>Descartar cambios</button>
              </div>
            </div>
          )}
          {mapa.length ? (
            <MapaAsientos asientos={mapa} modo="editor" tipoRecinto={recinto?.tipo}
              motivosNoEditables={motivosNoEditables} editorDeshabilitado={ocupado || requiereConsulta}
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
              }} />
          ) : <p>El recinto todavía no tiene lugares configurados.</p>}
        </section>
      )}
    </main>
  );
}
