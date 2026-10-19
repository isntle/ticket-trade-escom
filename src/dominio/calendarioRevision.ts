import type { SolicitudEvento } from '../tipos';
import { fechaHoyMexico, inicioEnMexico } from './solicitudes';

export interface CalendarioRevision { diasLaborables: number[]; diasInhabiles: string[]; responsable: string; fechaConfiguracion: string }
export const CLAVE_CALENDARIO = 'tt_calendario_revision_v1';
export function validarCalendario(calendario: CalendarioRevision): string | undefined {
  if (!calendario.diasLaborables.length || calendario.diasLaborables.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return 'Selecciona al menos un día laborable válido.';
  if (calendario.diasInhabiles.some(d => !Number.isFinite(inicioEnMexico(d, '12:00')))) return 'Las fechas inhábiles deben tener formato AAAA-MM-DD y existir en el calendario.';
}
export function vencimientoRevision(envio: string, calendario: CalendarioRevision): string {
  const error = validarCalendario(calendario); if (error) throw new Error(error);
  const fecha = new Date(fechaHoyMexico(new Date(envio)) + 'T12:00:00Z');
  let habiles = 0;
  for (let i = 0; i < 3660; i++) {
    fecha.setUTCDate(fecha.getUTCDate() + 1);
    const dia = fecha.toISOString().slice(0, 10);
    if (calendario.diasLaborables.includes(fecha.getUTCDay()) && !calendario.diasInhabiles.includes(dia)) habiles++;
    if (habiles === 2) return new Date(inicioEnMexico(dia, '23:59') + 59000).toISOString();
  }
  throw new Error('No se encontraron dos días hábiles en el calendario configurado.');
}
export function motivoVencimiento(s: SolicitudEvento, ahora = Date.now()): string | undefined {
  if (!['en_revision', 'requiere_correccion'].includes(s.estado)) return;
  if (s.esExcepcional && s.fechasSolicitadas.some(d => inicioEnMexico(d.fecha, d.horaInicio) <= ahora)) return 'Venció la solicitud extraordinaria porque comenzó el día solicitado sin evento vinculado.';
  if (s.estado === 'requiere_correccion') return s.fechaLimiteCorreccion && Date.parse(s.fechaLimiteCorreccion) <= ahora ? 'Venció el plazo de 24 horas naturales para corregir la solicitud.' : undefined;
  if (s.fechaVencimientoRevision && Date.parse(s.fechaVencimientoRevision) <= ahora) return 'Venció el plazo institucional de dos días hábiles sin resolución.';
}
export function pausarRevision(s: SolicitudEvento, ahora = Date.now()) {
  return { tiempoRevisionRestanteMs: s.fechaVencimientoRevision ? Math.max(0, Date.parse(s.fechaVencimientoRevision) - ahora) : undefined, fechaVencimientoRevision: undefined, fechaLimiteCorreccion: new Date(ahora + 86400000).toISOString() };
}
export function reanudarRevision(s: SolicitudEvento, calendario: CalendarioRevision, ahora = Date.now()) {
  if (s.estado === 'requiere_correccion' && s.tiempoRevisionRestanteMs !== undefined) return new Date(ahora + s.tiempoRevisionRestanteMs).toISOString();
  return s.fechaVencimientoRevision || vencimientoRevision(s.fechaEnvioInicial || new Date(ahora).toISOString(), calendario);
}
