import { crearServicioDisponibilidad, type AgendaDisponibilidad } from './disponibilidadRecintos.js';
import { fechaRecintoValida, horarioRecintoValido, revisarFranjaRecinto } from '../dominio/disponibilidadRecintos.js';
import type { ResultadoDisponibilidadRecinto } from '../tipos/index.js';

export interface ConsultaAgenda { fecha: string; idActividadExcluir?: string }
export interface EstadoAgenda {
  estado: 'inicial' | 'cargando' | 'listo' | 'error';
  agenda?: AgendaDisponibilidad;
  error?: string;
}
const inicial: EstadoAgenda = { estado: 'inicial' };
const clave = (q: ConsultaAgenda) => JSON.stringify([q.fecha, q.idActividadExcluir || '']);

/** Caché de lecturas por sesión. La revisión previa a una escritura siempre va al servidor. */
export function crearAlmacenDisponibilidad(servicio = crearServicioDisponibilidad(), ahora = Date.now) {
  const estados = new Map<string, EstadoAgenda>();
  const pendientes = new Map<string, { controlador: AbortController; promesa: Promise<void> }>();
  const vigencias = new Map<string, number>();
  const oyentes = new Set<() => void>();
  let version = 0;
  const notificar = () => { version++; oyentes.forEach(f => f()); };
  const leer = (q: ConsultaAgenda): EstadoAgenda => estados.get(clave(q)) || inicial;
  const cargar = (q: ConsultaAgenda, forzar = false): Promise<void> => {
    if (!fechaRecintoValida(q.fecha)) return Promise.resolve();
    const k = clave(q), enCurso = pendientes.get(k);
    if (enCurso) return enCurso.promesa;
    if (!forzar && leer(q).estado === 'listo' && ahora() - (vigencias.get(k) ?? 0) < 15000) return Promise.resolve();
    const controlador = new AbortController();
    estados.set(k, { estado: 'cargando', agenda: leer(q).agenda });
    const promesa = Promise.resolve().then(() => servicio.consultarAgenda(q, controlador.signal)).then(agenda => {
      if (controlador.signal.aborted) return;
      estados.set(k, { estado: 'listo', agenda }); vigencias.set(k, ahora());
    }).catch(error => {
      if (controlador.signal.aborted) return;
      estados.set(k, { estado: 'error', error: error instanceof Error ? error.message : 'No se pudo consultar la agenda.' });
    }).finally(() => {
      if (pendientes.get(k)?.controlador !== controlador) return;
      pendientes.delete(k); notificar();
    });
    pendientes.set(k, { controlador, promesa }); notificar();
    return promesa;
  };
  return {
    leer, cargar,
    revisar: servicio.revisar,
    version: () => version,
    suscribir(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f); }; },
    limpiar() {
      pendientes.forEach(p => p.controlador.abort()); pendientes.clear(); estados.clear(); vigencias.clear(); notificar();
    },
    verificar(idRecinto: string, fecha: string, horaInicio: string, horaFin: string, idActividadExcluir?: string): ResultadoDisponibilidadRecinto {
      const s = leer({ fecha, idActividadExcluir });
      if (s.estado !== 'listo' || !s.agenda) return {
        disponible: false, estadoConsulta: s.estado,
        motivo: s.estado === 'error' ? s.error : 'Consultando la disponibilidad actual del servidor…',
      };
      if (!horarioRecintoValido(horaInicio, horaFin)) return { disponible: false, estadoConsulta: 'listo', motivo: 'Revisa el horario: debe terminar a más tardar a las 21:00.' };
      const recinto = s.agenda.recintos.find(r => r.id === idRecinto);
      if (!recinto) return { disponible: false, estadoConsulta: 'listo', motivo: 'El recinto no está disponible para esta consulta.' };
      const revision = revisarFranjaRecinto({ id: '', idRecinto, fecha, horaInicio, horaFin }, recinto.ocupaciones, s.agenda.margenSeparacionMinutos);
      const conflicto = revision.conflictos[0], clase = revision.advertencias[0];
      return {
        disponible: revision.disponible, estadoConsulta: 'listo', advertencias: revision.advertencias,
        tipoConflicto: conflicto?.tipo || (clase ? 'clase' : undefined),
        tituloConflicto: conflicto?.titulo || clase?.titulo,
        motivo: conflicto ? `${conflicto.titulo} · ${conflicto.horaInicio}–${conflicto.horaFin}. Revisa también el margen de separación de ${s.agenda.margenSeparacionMinutos} minutos entre actividades.`
          : clase ? 'Hay un horario académico informativo. Subdirección debe revisar la coincidencia; la clase no impide automáticamente la solicitud.' : undefined,
      };
    },
  };
}
export type AlmacenDisponibilidad = ReturnType<typeof crearAlmacenDisponibilidad>;
