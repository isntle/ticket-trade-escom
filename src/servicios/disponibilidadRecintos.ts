import type { OcupacionAgenda } from "../tipos/index.js";
import { transporteApi } from "./http.js";

export interface ActividadDisponibilidad {
  id: string;
  idRecinto: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}
export interface OcupacionDisponibilidad extends OcupacionAgenda {
  informativa: boolean;
  fuente: "evento" | "bloqueo" | "clase" | "propuesta";
  /** Una previsión no acredita por sí sola el cierre efectivo del bloqueo. */
  finPrevisto?: string;
  /** Solo se afirma cuando existe fecha de registro/modificación auditable. */
  posteriorAlEnvio?: boolean;
}
export interface FranjaLibre { horaInicio: string; horaFin: string }
export interface AgendaDisponibilidad {
  fecha: string;
  consultadoEn: string;
  zonaHoraria: "America/Mexico_City";
  margenSeparacionMinutos: number;
  recintos: Array<{
    id: string;
    nombre: string;
    ocupaciones: OcupacionDisponibilidad[];
    franjasLibres: FranjaLibre[];
  }>;
}
export interface RevisionActividadDisponibilidad extends ActividadDisponibilidad {
  disponible: boolean;
  conflictos: OcupacionDisponibilidad[];
  advertencias: OcupacionDisponibilidad[];
}
export interface RevisionDisponibilidad {
  consultadoEn: string;
  margenSeparacionMinutos: number;
  actividades: RevisionActividadDisponibilidad[];
}
export interface ContextoDisponibilidad {
  idSolicitud?: string;
  idActividadExcluir?: string;
}
export interface AlternativaDisponibilidad extends ActividadDisponibilidad {
  nombreRecinto: string;
  advertencias: OcupacionDisponibilidad[];
}
export interface RevisionDisponibilidadSolicitud extends RevisionDisponibilidad {
  idSolicitud: string;
  versionSolicitud: number;
  actividades: Array<RevisionActividadDisponibilidad & {
    nombreActividad: string;
    nombreRecinto: string;
    alternativas: AlternativaDisponibilidad[];
  }>;
}
/** Puerto reutilizable por captura y reprogramación. Consultar no reserva el recinto. */
export function crearServicioDisponibilidad(api = transporteApi()) {
  return {
    revisarSolicitud(idSolicitud: string, signal?: AbortSignal) {
      return api<RevisionDisponibilidadSolicitud>(`/organizacion/solicitudes/${encodeURIComponent(idSolicitud)}/disponibilidad`, { signal });
    },
    consultarAgenda(consulta: { fecha: string; idRecinto?: string; idActividadExcluir?: string }, signal?: AbortSignal) {
      const parametros = new URLSearchParams({ fecha: consulta.fecha });
      if (consulta.idRecinto) parametros.set("idRecinto", consulta.idRecinto);
      if (consulta.idActividadExcluir) parametros.set("idActividadExcluir", consulta.idActividadExcluir);
      return api<AgendaDisponibilidad>("/organizacion/disponibilidad/agenda?" + parametros, { signal });
    },
    revisar(actividades: ActividadDisponibilidad[], contexto: ContextoDisponibilidad = {}, signal?: AbortSignal) {
      return api<RevisionDisponibilidad>("/organizacion/disponibilidad/revision", {
        metodo: "POST", datos: { actividades, ...contexto }, signal,
      });
    },
  };
}
