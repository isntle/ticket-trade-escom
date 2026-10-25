import type { ArregloAsientos, ConfiguracionAsiento, ElementoFechaSolicitada, Recinto, SolicitudEvento } from '../tipos';
import { aforoActividad, modalidadActividad, nombreActividad } from './actividades';
import { generarAsientosAuditorio, generarAsientosSala14, generarEstacionesLaboratorio } from '../datos/datosIniciales';

export function lugaresDelRecinto(r: Recinto): ConfiguracionAsiento[] {
  const lugares = r.tipo === 'auditorio' ? generarAsientosAuditorio() : r.tipo === 'laboratorio' ? generarEstacionesLaboratorio(r.codigo) : generarAsientosSala14();
  return lugares.slice(0, r.capacidad);
}
export function validarDistribuciones(s: Pick<SolicitudEvento, 'modalidadAsistencia' | 'fechasSolicitadas' | 'asistenciaEstimada'>, recintos: Recinto[]): string | undefined {
  for (const [i,d] of s.fechasSolicitadas.entries()) {
    if (modalidadActividad(d, s.modalidadAsistencia) !== 'controlado') continue;
    const etiqueta = nombreActividad(d, i);
    const r = recintos.find(r => r.id === d.idRecinto);
    if (!r || !d.distribucionConfirmada || !d.distribucion?.length) return `${etiqueta}: configura y confirma la distribución antes de enviar la solicitud.`;
    const originales = new Set(lugaresDelRecinto(r).map(a => a.id));
    if (d.distribucion.length !== originales.size || new Set(d.distribucion.map(a => a.id)).size !== originales.size || d.distribucion.some(a => !originales.has(a.id) || !['asistente','vip','organizador','staff'].includes(a.categoria) || (a.estaEliminado && !r.permiteEliminarAsientos))) return `${etiqueta}: la distribución no corresponde al recinto seleccionado.`;
    if (d.distribucion.filter(a => !a.estaEliminado && !a.estaBloqueado).length < (aforoActividad(d, s.asistenciaEstimada) || 0)) return `${etiqueta}: el aforo solicitado supera los lugares habilitados de la distribución.`;
  }
}
export function arregloDesdeSolicitud(d: ElementoFechaSolicitada, idFechaEvento: string): ArregloAsientos {
  const asientos = structuredClone(d.distribucion || []);
  const activos = asientos.filter(a => !a.estaEliminado && !a.estaBloqueado);
  return { id: `arr-${idFechaEvento}-aprobado`, idFechaEvento, idRecinto: d.idRecinto, nombre: 'Distribución aprobada con la solicitud', etiquetaVersion: 'v1-final', estado: 'version_final', asientos,
    totalAsientos: asientos.filter(a => !a.estaEliminado).length, asientosAsistente: activos.filter(a => a.categoria === 'asistente').length, asientosVip: activos.filter(a => a.categoria === 'vip').length,
    asientosOrganizador: activos.filter(a => a.categoria === 'organizador').length, asientosStaff: activos.filter(a => a.categoria === 'staff').length, asientosBloqueados: asientos.filter(a => !a.estaEliminado && a.estaBloqueado).length, asientosSinAsignar: 0, fechaCreacion: new Date().toISOString(), fechaConfirmacionFinal: new Date().toISOString() };
}
