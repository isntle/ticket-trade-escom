import type { ActividadDisponibilidad, AgendaDisponibilidad, AlternativaDisponibilidad, OcupacionDisponibilidad } from '../servicios/disponibilidadRecintos.js';
import { franjasLibresRecinto, horaRecinto, minutosRecinto, revisarFranjaRecinto } from './disponibilidadRecintos.js';

/** Opciones independientes: conservan duración/fecha y no modifican ni apartan la propuesta. */
export function alternativasDisponibilidad(
  actividad: ActividadDisponibilidad,
  otras: ActividadDisponibilidad[],
  agenda: AgendaDisponibilidad,
  capacidades: Map<string, number>,
  aforo: number,
  ahora = Date.now(),
): AlternativaDisponibilidad[] {
  const duracion = minutosRecinto(actividad.horaFin) - minutosRecinto(actividad.horaInicio);
  if (duracion <= 0 || agenda.fecha !== actividad.fecha) return [];
  const opciones: AlternativaDisponibilidad[] = [];
  for (const recinto of agenda.recintos) {
    if ((capacidades.get(recinto.id) ?? 0) < aforo) continue;
    const propias: OcupacionDisponibilidad[] = otras.filter(a => a.id !== actividad.id && a.fecha === actividad.fecha && a.idRecinto === recinto.id)
      .map(a => ({ ...a, tipo: 'evento', fuente: 'propuesta', informativa: false, titulo: 'Otra actividad de la solicitud', nombreRecinto: recinto.nombre }));
    const ocupaciones = [...recinto.ocupaciones, ...propias];
    const inicios = new Set<number>([minutosRecinto(actividad.horaInicio)]);
    for (const franja of franjasLibresRecinto(ocupaciones, agenda.margenSeparacionMinutos)) {
      const primero = Math.max(420, minutosRecinto(franja.horaInicio));
      const ultimo = minutosRecinto(franja.horaFin) - duracion;
      // Incluir el límite exacto permite aprovechar huecos que empiezan fuera de la media hora.
      if (primero <= ultimo) inicios.add(primero);
      for (let i = Math.ceil(primero / 30) * 30; i <= ultimo; i += 30) inicios.add(i);
    }
    const candidatas: AlternativaDisponibilidad[] = [];
    for (const inicio of inicios) {
      const horaInicio = horaRecinto(inicio), horaFin = horaRecinto(inicio + duracion);
      if (inicio < 420 || inicio + duracion > 1260 || Date.parse(`${actividad.fecha}T${horaInicio}:00-06:00`) <= ahora) continue;
      if (recinto.id === actividad.idRecinto && horaInicio === actividad.horaInicio) continue;
      const propuesta = { ...actividad, idRecinto: recinto.id, horaInicio, horaFin };
      const revision = revisarFranjaRecinto(propuesta, ocupaciones, agenda.margenSeparacionMinutos);
      if (revision.disponible) candidatas.push({ ...propuesta, nombreRecinto: recinto.nombre, advertencias: revision.advertencias });
    }
    candidatas.sort((a, b) => Math.abs(minutosRecinto(a.horaInicio) - minutosRecinto(actividad.horaInicio)) - Math.abs(minutosRecinto(b.horaInicio) - minutosRecinto(actividad.horaInicio)) || a.horaInicio.localeCompare(b.horaInicio));
    opciones.push(...candidatas.slice(0, 2));
  }
  opciones.sort((a, b) => Number(b.idRecinto === actividad.idRecinto) - Number(a.idRecinto === actividad.idRecinto) ||
    Math.abs(minutosRecinto(a.horaInicio) - minutosRecinto(actividad.horaInicio)) - Math.abs(minutosRecinto(b.horaInicio) - minutosRecinto(actividad.horaInicio)) || a.nombreRecinto.localeCompare(b.nombreRecinto));
  const seleccion: AlternativaDisponibilidad[] = [];
  const recintosMostrados = new Set<string>();
  // Conservar opciones de horario y dar prioridad a recintos distintos antes de repetirlos.
  for (const opcion of opciones) {
    if (opcion.idRecinto !== actividad.idRecinto && recintosMostrados.has(opcion.idRecinto)) continue;
    seleccion.push(opcion);
    recintosMostrados.add(opcion.idRecinto);
    if (seleccion.length === 4) return seleccion;
  }
  return [...seleccion, ...opciones.filter(o => !seleccion.includes(o))].slice(0, 4);
}
