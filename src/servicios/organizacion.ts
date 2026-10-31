import type { useDatos } from '../contextos/DatosContexto';
/** Puerto de comandos: el adaptador remoto debe mantener entradas, resultados y control de versión. */
export type OperacionesOrganizacion = Pick<ReturnType<typeof useDatos>, 'crearSolicitud' | 'guardarBorradorSolicitud' | 'actualizarSolicitud'>;
export type ServicioOrganizacion = {
  [K in keyof OperacionesOrganizacion]: (...args: Parameters<OperacionesOrganizacion[K]>) => Promise<ReturnType<OperacionesOrganizacion[K]>>;
};
/** Adaptador actual. Las pantallas ya esperan respuestas asíncronas sin conocer el almacenamiento. */
export function servicioOrganizacionLocal(operaciones: OperacionesOrganizacion): ServicioOrganizacion {
  return {
    crearSolicitud: async (...args) => operaciones.crearSolicitud(...args),
    guardarBorradorSolicitud: async (...args) => operaciones.guardarBorradorSolicitud(...args),
    actualizarSolicitud: async (...args) => operaciones.actualizarSolicitud(...args),
  };
}
