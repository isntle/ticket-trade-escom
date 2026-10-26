import type { FechaEvento } from '../tipos';
import { nombreActividad } from './actividades';

/**
 * Presentación de actividades en Check-in. Solo da formato: no modifica la regla de
 * ingreso, los permisos ni la validación de boletos. "Día" agrupa actividades por fecha;
 * cada actividad se identifica por su id, nombre, horario y recinto.
 */

/** Redacción única de la ventana de ingreso (compartida con la validación del lector). */
export const REGLA_INGRESO_ACTIVIDAD = 'El acceso se habilita 30 minutos antes del inicio y cierra al terminar la actividad.';

type ActividadVisible = Pick<FechaEvento, 'fecha' | 'horaInicio' | 'horaFin'> & Partial<Pick<FechaEvento, 'nombreActividad' | 'nombreDia'>>;

/** Fecha legible a partir de 'AAAA-MM-DD', sin desfase por zona horaria del navegador. */
export function fechaLegible(fechaIso?: string): string {
  if (!fechaIso || !/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) return fechaIso || 'Fecha por confirmar';
  return new Date(`${fechaIso}T12:00:00Z`).toLocaleDateString('es-MX', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Hora oficial del sistema (America/Mexico_City) de un instante en milisegundos. */
export const horaOficial = (instante: number): string =>
  new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instante));

export const horarioActividad = (actividad: Pick<FechaEvento, 'horaInicio' | 'horaFin'>): string =>
  `${actividad.horaInicio}–${actividad.horaFin} h`;

/** «sáb, 24 oct 2026 · 09:00–15:00 h · Laboratorio 3» */
export const describirActividad = (actividad: ActividadVisible, nombreRecinto?: string): string =>
  [fechaLegible(actividad.fecha), horarioActividad(actividad), nombreRecinto || 'Recinto por confirmar'].join(' · ');

/** Texto de una opción de actividad dentro de su día: nombre, horario y recinto. */
export const etiquetaOpcionActividad = (actividad: ActividadVisible, indice: number, nombreRecinto?: string): string =>
  `${nombreActividad(actividad, indice)} · ${horarioActividad(actividad)} · ${nombreRecinto || 'Recinto por confirmar'}`;

export interface GrupoDiaActividades<T> {
  fecha: string;
  etiqueta: string;
  actividades: Array<{ actividad: T; indice: number }>;
}

/** Agrupa las actividades por fecha, en el orden en que aparecen; conserva el índice original. */
export function agruparActividadesPorDia<T extends Pick<FechaEvento, 'fecha'>>(actividades: T[]): GrupoDiaActividades<T>[] {
  const grupos: GrupoDiaActividades<T>[] = [];
  actividades.forEach((actividad, indice) => {
    let grupo = grupos.find((item) => item.fecha === actividad.fecha);
    if (!grupo) {
      grupo = { fecha: actividad.fecha, etiqueta: `Día ${grupos.length + 1} · ${fechaLegible(actividad.fecha)}`, actividades: [] };
      grupos.push(grupo);
    }
    grupo.actividades.push({ actividad, indice });
  });
  return grupos;
}

/** Un registro de acceso pertenece a la selección solo si coinciden los identificadores. */
export const coincideConSeleccion = (
  registro: { idEvento: string; idFechaEvento: string },
  idEvento: string,
  idActividad: string,
): boolean =>
  (idEvento === 'todos' || registro.idEvento === idEvento) &&
  (idActividad === 'todos' || registro.idFechaEvento === idActividad);
