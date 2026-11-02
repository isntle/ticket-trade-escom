import type {useDatos} from '../contextos/DatosContexto';
/** Contrato de UI: la API debe reconstruir estas proyecciones a partir del modelo ER. */
type Datos = ReturnType<typeof useDatos>;
export const consultasOrganizacion = ['verificarDisponibilidadRecinto','obtenerOcupacionesRecinto','obtenerAgendaMultiRecinto','obtenerListaDeVerificacion','revisarCambioRecinto','revisarBloqueoInstitucional'] as const;
export const comandosOrganizacion = ['crearSolicitud','guardarBorradorSolicitud','actualizarSolicitud','dictaminarSolicitud','devolverSolicitud','cancelarSolicitud','atenderSolicitudExtraordinaria','crearEventoInstitucionalDirecto','actualizarEvento','publicarEvento','cancelarUnidadEvento','agregarFechaEvento','eliminarFechaEvento','confirmarCambioRecinto','guardarBloqueoInstitucional','cancelarBloqueoInstitucional','guardarRecinto','crearOcupacionInterna','cancelarOcupacionInterna','crearArreglo','actualizarArreglo','confirmarVersionFinalArreglo','eliminarArreglo','guardarCalendarioRevision'] as const;
export type NombreOperacionB = typeof consultasOrganizacion[number] | typeof comandosOrganizacion[number];
export type OperacionesB = Pick<Datos,NombreOperacionB>;
export type PuertoOrganizacion = {[K in NombreOperacionB]: (...args: Parameters<OperacionesB[K]>) => Promise<ReturnType<OperacionesB[K]>>};
export type LecturaOrganizacion = Pick<Datos,'listaSolicitudes'|'listaEventos'|'listaRecintos'|'listaArreglos'|'listaBloqueos'|'listaOcupacionesInternas'|'listaClasesRegulares'|'calendarioRevision'>;
export interface ServicioConsultasB { leer(signal?: AbortSignal): Promise<LecturaOrganizacion> }
/** Recibe un lector para que cada consulta use el contexto vigente, no una captura inicial. */
export function adaptarOrganizacionLocal(leer:()=>OperacionesB & LecturaOrganizacion): PuertoOrganizacion & ServicioConsultasB {
 const puerto: Record<string,unknown> = {};
 for (const nombre of [...consultasOrganizacion,...comandosOrganizacion]) {
  puerto[nombre] = async (...args: unknown[]) => {
   const datos=leer();
   return (datos[nombre] as (...args: unknown[])=>unknown)(...args);
  };
 }
 return Object.assign(puerto,{leer:async(signal?:AbortSignal)=>{
  signal?.throwIfAborted(); const d=leer();
  return {listaSolicitudes:d.listaSolicitudes,listaEventos:d.listaEventos,listaRecintos:d.listaRecintos,listaArreglos:d.listaArreglos,listaBloqueos:d.listaBloqueos,listaOcupacionesInternas:d.listaOcupacionesInternas,listaClasesRegulares:d.listaClasesRegulares,calendarioRevision:d.calendarioRevision};
 }}) as unknown as PuertoOrganizacion & ServicioConsultasB;
}
/** BIGINT de PostgreSQL viaja como texto: no convertir a Number ni cambiar IDs locales. */
export function identificadorPostgres(valor:unknown):string {
 if(typeof valor!=='string'||!/^\d+$/.test(valor)||BigInt(valor)<=0n||BigInt(valor)>9223372036854775807n) throw new Error('El identificador PostgreSQL debe ser un bigint positivo enviado como texto.');
 return valor;
}
const estadosSolicitud = {Borrador:'borrador','En revisión':'en_revision','Requiere corrección':'requiere_correccion',Aprobada:'autorizada',Rechazada:'rechazada',Cancelada:'cancelada'} as const;
export function estadoSolicitudDesdeCatalogo(nombre:string) {
 if(!Object.prototype.hasOwnProperty.call(estadosSolicitud,nombre)) throw new Error(`Estado de solicitud no reconocido: ${nombre}`);
 return estadosSolicitud[nombre as keyof typeof estadosSolicitud];
}
