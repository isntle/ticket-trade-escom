import { useEffect, useSyncExternalStore } from 'react';
import { suscribirActualizacionVisible } from '../servicios/actualizacionVisible.js';
import { useDatos } from './DatosContexto.js';
import type { ConsultaAgenda, EstadoAgenda } from '../servicios/almacenDisponibilidad.js';

const suscribirLocal = () => () => {};
const versionLocal = () => 0;
const listoLocal: EstadoAgenda = { estado: 'listo' };

/** Suscribe las fechas visibles; no consulta todo el mes ni modifica la fecha seleccionada. */
export function useCargarAgendasRecintos(consultas: ConsultaAgenda[]) {
  const { agendaRemota } = useDatos();
  useSyncExternalStore(agendaRemota?.suscribir || suscribirLocal, agendaRemota?.version || versionLocal, agendaRemota?.version || versionLocal);
  const clave = JSON.stringify([...new Set(consultas.map(q => JSON.stringify(q)))].sort());
  useEffect(() => {
    if (!agendaRemota) return;
    const fechas: ConsultaAgenda[] = JSON.parse(clave).map((q: string) => JSON.parse(q));
    const refrescar = () => { fechas.forEach(q => { void agendaRemota.cargar(q); }); };
    refrescar();
    return suscribirActualizacionVisible(refrescar, 15_000);
  }, [agendaRemota, clave]);
  return agendaRemota;
}

export function useDisponibilidadRecintos(fecha: string, idActividadExcluir?: string) {
  const almacen = useCargarAgendasRecintos([{ fecha, ...(idActividadExcluir ? { idActividadExcluir } : {}) }]);
  const consulta = { fecha, idActividadExcluir };
  const estado = almacen?.leer(consulta) || listoLocal;
  return {
    ...estado, remota: Boolean(almacen),
    margen: estado.agenda?.margenSeparacionMinutos ?? 30,
    recargar: () => { void almacen?.cargar(consulta, true); },
  };
}
