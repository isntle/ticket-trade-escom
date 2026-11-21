import { transporteApi } from './http.js';
import type { ContextoDatosTipo, ResultadoBloqueo, RevisionBloqueo } from '../contextos/DatosContexto.js';

/** Una escritura solo se anuncia después de una confirmación explícita del servidor. */
export function crearServicioConfiguracionRecintos(solicitar = transporteApi(), refrescar = async () => {}) {
  const mensaje = (e: unknown) => e instanceof Error ? e.message : 'No se pudo completar la operación.';
  const escribir = async (ruta: string, metodo: string, datos: unknown): Promise<ResultadoBloqueo> => {
    try {
      const guardado = await solicitar<ResultadoBloqueo>(ruta, { metodo, datos });
      if (guardado.exito !== true) return { exito: false, error: guardado.error || 'El servidor no confirmó el guardado.' };
      try { await refrescar(); }
      catch { return { ...guardado, advertencia: 'El servidor confirmó el guardado, pero no se pudo actualizar la lista. Vuelve a consultar antes de realizar otra operación.' }; }
      return guardado;
    } catch (e) { return { exito: false, error: mensaje(e) }; }
  };
  return {
    guardarCalendarioRevision: (datos: Parameters<ContextoDatosTipo['guardarCalendarioRevision']>[0]) =>
      escribir('/organizacion/calendario', 'PUT', { diasLaborables: datos.diasLaborables, diasInhabiles: datos.diasInhabiles, version: datos.version ?? 0 }),
    revisarBloqueoInstitucional: async (propuesta: Parameters<ContextoDatosTipo['revisarBloqueoInstitucional']>[0], id?: string): Promise<RevisionBloqueo> => {
      try {
        const revision = await solicitar<RevisionBloqueo>('/organizacion/bloqueos/revision', { metodo: 'POST', datos: { propuesta, id } });
        if (!revision.firma || !Array.isArray(revision.afectados)) return { error: revision.error || 'El servidor no confirmó la revisión de afectaciones.' };
        return revision;
      } catch (e) { return { error: mensaje(e) }; }
    },
    guardarBloqueoInstitucional: (propuesta: Parameters<ContextoDatosTipo['guardarBloqueoInstitucional']>[0], id?: string, version?: number, firma?: string) =>
      escribir('/organizacion/bloqueos' + (id ? '/' + encodeURIComponent(id) : ''), id ? 'PATCH' : 'POST', { propuesta, version, firma }),
    cancelarBloqueoInstitucional: (id: string, motivo: string, version?: number) =>
      escribir('/organizacion/bloqueos/' + encodeURIComponent(id) + '/cancelacion', 'POST', { motivo, version }),
  };
}
