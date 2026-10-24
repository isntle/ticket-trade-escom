/** Cada acceso abre una interfaz existente; las confirmaciones no ejecutan operaciones. */
export interface PantallaDocumentada { id: string; nombre: string; ruta: string }
interface CasoDocumentado { id: string; interfaz: string; ruta?: string }

const interfacesOrganizacion: Record<string, [string, string]> = {
  'UI.01': ['Mis eventos', '/organizador'],
  'UI.02': ['Mis solicitudes', '/mis-solicitudes'],
  'UI.03': ['Solicitud de evento', '/solicitar-evento'],
  'UI.04': ['Editar solicitud', '/solicitar-evento'],
  'UI.05': ['Confirmar cancelación de solicitud', '/organizador'],
  'UI.06': ['Solicitudes de Subdirección', '/subdireccion?tab=solicitudes'],
  'UI.07': ['Distribución de lugares', '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos'],
  'UI.08': ['Revisar envío de solicitud', '/solicitar-evento'],
  'UI.09': ['Bloqueos de recintos', '/subdireccion?tab=bloqueos'],
  'UI.10': ['Formulario de bloqueo', '/subdireccion?tab=bloqueos'],
  'UI.11': ['Revisión de afectaciones', '/subdireccion?tab=bloqueos'],
  'UI.12': ['Detalle e historial del bloqueo', '/subdireccion?tab=bloqueos'],
  'UI.14': ['Catálogo de recintos', '/recintos'],
  'UI.15': ['Detalle y calendario del recinto', '/recintos'],
  'UI.16': ['Expediente de solicitud', '/organizador'],
  'UI.17': ['Crear evento institucional', '/subdireccion?tab=evento_directo'],
  'UI.18': ['Administración de recintos', '/admin/recintos'],
  'UI.19': ['Ocupaciones internas', '/admin/ocupaciones'],
  'UI.20': ['Configuración del evento', '/organizador/eventos/evt-simposio-ia'],
  'UI.21': ['Cambios y confirmaciones del evento', '/organizador/eventos/evt-simposio-ia'],
  'UI.22': ['Constancia operativa', '/organizador/eventos/evt-simposio-ia'],
};
const interfacesIdentidad: Record<string, [string, string]> = {
  'UI-IP-04': ['Solicitar recuperación', '/recuperar-password'],
  'UI-IP-05': ['Validar enlace de recuperación', '/recuperar-password'],
  'UI-IP-06': ['Seguridad de mi cuenta', '/perfil'],
  'UI-IP-09': ['Listado de expedientes', '/admin/expedientes'],
  'UI-IP-10': ['Detalle de expediente', '/admin/expedientes'],
  'UI-IP-11': ['Restricciones de solicitudes', '/admin/restricciones'],
  'UI-IP-12': ['Gestión de roles', '/admin'],
};
export function rutaDeInterfaz(ruta: string, interfaz: string, caso: string): string {
  const url = new URL(ruta, 'http://ticket-trade.local');
  url.searchParams.set('interfaz', interfaz);
  url.searchParams.set('caso', caso);
  return url.pathname + url.search;
}
export function pantallasDelCaso(caso: CasoDocumentado): PantallaDocumentada[] {
  const ids = [...new Set(caso.interfaz.match(/UI-IP-\d+|UI\.\d+|UI-\d+|IU-CI\d+/g) || [])];
  return ids.map(id => {
    let nombre = caso.interfaz.split(' · ')[1] || id;
    let ruta = caso.ruta || '/eventos';
    if (caso.id.startsWith('CU-OR-')) {
      [nombre, ruta] = interfacesOrganizacion[id];
      if (id === 'UI.03' && caso.id === 'CU-OR-06.2') ruta += '?tipo=extraordinaria';
      if (id === 'UI.07' && caso.id === 'CU-OR-05') ruta = '/solicitar-evento?distribucion=1';
      if (id === 'UI.21') nombre = ({
        'CU-OR-12':'Excepción de anticipación','CU-OR-19':'Revisar información del evento',
        'CU-OR-20':'Reprogramar el día','CU-OR-21':'Cambiar recinto',
        'CU-OR-22':'Confirmar retiro del día','CU-OR-23':'Confirmar cancelación del evento',
        'CU-OR-24':'Confirmar cancelación del día','CU-OR-25':'Resolver día suspendido',
      } as Record<string,string>)[caso.id] || nombre;
    } else if (interfacesIdentidad[id]) {
      [nombre, ruta] = interfacesIdentidad[id];
    } else if (caso.id === 'CU-MT-01') {
      [nombre, ruta] = id === 'UI-10' ? ['Cartelera', '/eventos'] : ['Ficha del evento', '/eventos/evt-simposio-ia'];
    }
    return { id, nombre, ruta: rutaDeInterfaz(ruta, id, caso.id) };
  });
}
/** Solo lectura del destino de demostración; no concede permisos. */
export function interfazSolicitada(): string | null {
  return typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('interfaz');
}
