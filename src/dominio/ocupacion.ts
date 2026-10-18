import type { Evento, Usuario } from '../tipos';

export function puedeConsultarOcupacion(usuario: Usuario | null, evento: Evento): boolean {
  if (!usuario?.estaActivo) return false;
  return usuario.roles.includes('admin') ||
    (usuario.roles.includes('organizador') && evento.idOrganizador === usuario.id) ||
    (usuario.roles.includes('staff') && Boolean(usuario.eventosAsignadosStaff?.includes(evento.id)));
}

export function obtenerContextoOcupacion(eventos: Evento[], usuario: Usuario | null, idEvento?: string, idFecha?: string) {
  const eventosPermitidos = eventos.filter(evento => evento.estado === 'publicado' && puedeConsultarOcupacion(usuario, evento));
  const evento = idEvento ? eventosPermitidos.find(item => item.id === idEvento) : eventosPermitidos[0];
  const fecha = idFecha ? evento?.fechas.find(item => item.id === idFecha) : evento?.fechas[0];
  return { eventosPermitidos, evento, fecha };
}
