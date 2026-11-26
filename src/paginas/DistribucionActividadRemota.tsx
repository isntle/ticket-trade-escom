import { BotonRegresar } from "../componentes/ui/BotonRegresar";
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
const boton = 'rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50';

export function DistribucionActividadRemota({ eventId, dateId, navigate }: { eventId: string; dateId: string; navigate: (ruta: string) => void }) {
  const { usuarioActual, rolActivo } = useAutenticacion();
  const { listaEventos, listaRecintos } = useDatos();
  const [distribucion, setDistribucion] = useState<Distribucion>();
  const [pendientes, setPendientes] = useState<Record<string, Categoria>>({});
  const [categoria, setCategoria] = useState<Categoria>('vip');
  const [ocupado, setOcupado] = useState(false);
  const [lectura, setLectura] = useState(0);
  const [requiereConsulta, setRequiereConsulta] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const evento = listaEventos.find(item => item.id === eventId);
  const actividad = evento?.fechas.find(item => item.id === dateId);
  const tieneAcceso = evento && actividad && usuarioActual &&
    ['organizador', 'subdireccion', 'admin'].includes(rolActivo) &&
    (evento.idOrganizador === usuarioActual.id || usuarioActual.roles.includes('subdireccion')) &&
    modalidadActividad(actividad, evento.modalidadAsistencia) === 'controlado';
  const ruta = tieneAcceso
    ? `/organizacion/eventos/${encodeURIComponent(eventId)}/actividades/${encodeURIComponent(dateId)}/distribucion`
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
  const laboratorio = recinto?.tipo === 'laboratorio';
  const numeros = numerarLugaresFisicos(lugares, laboratorio);
  const motivosNoEditables = new Map<string, string>();
  const mapa = lugares.map<ConfiguracionAsiento>((lugar, indice) => {
    const valor = pendientes[lugar.idLugarRecinto] ?? lugar.categoria;
    const motivo = lugar.ocupado ? 'Tiene un apartado o una reserva' : lugar.fueraDeServicio
      ? 'Fuera de servicio' : !distribucion?.editable ? 'Actividad en solo lectura' : '';
    if (motivo) motivosNoEditables.set(lugar.idLugarRecinto, motivo);
    return {
      id: lugar.idLugarRecinto,
      etiqueta: lugar.codigo,
      fila: lugar.fila || 'A',
      numero: numeros[indice],
      ...(laboratorio ? { equipoComputo: lugar.codigo } : {}),
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
    <section className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <BotonRegresar destino="Volver al evento" alVolver={() => navigate(`/organizador/eventos/${eventId}`)} />
      <header className="rounded-2xl border border-neutral-200 border-t-4 border-t-[#7a132b] bg-white p-5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Distribución de lugares</h1>
        {tieneAcceso && <div className="mt-2 space-y-1">
          <p className="font-semibold text-neutral-900">{evento.titulo}</p>
          <p className="text-sm text-neutral-600">{etiquetaActividad(actividad, listaRecintos, evento.fechas.indexOf(actividad))}</p>
        </div>}
        {!ruta && <p className="mt-2 text-sm text-neutral-600">Esta actividad no admite lugares asignados o tu perfil no puede consultarla.</p>}
      </header>
      {ocupado && <p role="status">Procesando distribución…</p>}
      {aviso && <p role="status" className="text-emerald-800">{aviso}</p>}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
          <p role="alert" className="text-sm text-neutral-800">{error}</p>
          {ruta && requiereConsulta && <button type="button" className={boton} disabled={ocupado}
            onClick={() => { setAviso(''); setLectura(n => n + 1); }}>Actualizar distribución</button>}
        </div>
      )}
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
    </section>
  );
}
