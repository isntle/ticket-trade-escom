import type { BloqueoRecinto, Evento, FechaEvento, Usuario } from '../tipos';
import { afectaBloqueo } from './bloqueos';
import { obtenerMensaje } from './mensajes';
import { destinoInternoSeguro } from './navegacion';
import { estadoInscripcionesActividad, limiteInscripcionesActividad } from './taquilla';

/** Reglas compartidas por la ficha, la taquilla y la confirmación local. */
export function impedimentoActividad(evento: Evento, actividad: FechaEvento, bloqueos: BloqueoRecinto[], ahora = Date.now()): string | undefined {
  if (evento.estado !== 'publicado' && evento.estado !== 'en_curso') return 'El evento no está disponible para inscripciones.';
  if (actividad.cancelada) return 'La actividad está CANCELADA.';
  if (actividad.suspendida || bloqueos.some(b => afectaBloqueo(b, actividad))) return 'La actividad está SUSPENDIDA.';
  const limite = limiteInscripcionesActividad(actividad);
  if (estadoInscripcionesActividad(actividad, evento.estado) !== 'abiertas' || !Number.isFinite(limite) || limite <= ahora)
    return obtenerMensaje('ERR-MT-02').descripcion;
}

export function impedimentoParticipante(evento: Evento, usuario: Usuario | null): string | undefined {
  if (!usuario?.estaActivo) return obtenerMensaje('ERR-TR-01').descripcion;
  if (usuario.correoConfirmado !== true) return obtenerMensaje('ERR-IP-04').descripcion;
  if (evento.publicoPermitido?.length && !usuario.roles.some(rol => evento.publicoPermitido!.includes(rol)))
    return obtenerMensaje('ERR-MT-01', { 'público permitido': evento.publicoPermitido.join(', ') }).descripcion;
}

export function rutaDetalleEvento(idEvento: string, clave?: string): string {
  const consulta = new URLSearchParams();
  if (clave) consulta.set('key', clave);
  return `/eventos/${encodeURIComponent(idEvento)}${consulta.size ? '?' + consulta : ''}`;
}

/** dateId siempre identifica FechaEvento; los índices de programa no son reservables. */
export function rutaReservaActividad(idEvento: string, idActividad: string, clave?: string): string {
  const consulta = new URLSearchParams({ dateId: idActividad });
  if (clave) consulta.set('key', clave);
  return `/eventos/${encodeURIComponent(idEvento)}/reservar?${consulta}`;
}

export const rutaAccesoConRegreso = (acceso: '/login' | '/confirmar-correo', destino: string): string =>
  `${acceso}?continuar=${encodeURIComponent(destinoInternoSeguro(destino))}`;
