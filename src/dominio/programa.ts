import type { ActividadPrograma, ElementoFechaSolicitada, Evento, SolicitudEvento } from '../tipos';

export function validarPrograma(
  dia: { horaInicio: string; horaFin: string; programa?: ActividadPrograma[]; nombreDia?: string },
): string | undefined {
  const actividades = [...(dia.programa || [])].sort((a, b) => a.hora.localeCompare(b.hora));
  for (const [indice, actividad] of actividades.entries()) {
    const etiqueta = `${dia.nombreDia || 'Día'} · actividad ${indice + 1}`;
    if (!actividad.titulo.trim()) return `${etiqueta}: escribe el título de la actividad.`;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(actividad.hora)) return `${etiqueta}: indica una hora válida.`;
    if (actividad.hora < dia.horaInicio || actividad.hora >= dia.horaFin)
      return `${etiqueta}: la actividad debe comenzar dentro del horario del día.`;
    if (actividad.horaFin && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(actividad.horaFin) || actividad.horaFin <= actividad.hora || actividad.horaFin > dia.horaFin))
      return `${etiqueta}: el término debe ser posterior al inicio y no superar el horario del día.`;
    const siguiente = actividades[indice + 1];
    if (siguiente && (siguiente.hora === actividad.hora || (actividad.horaFin && actividad.horaFin > siguiente.hora)))
      return `${etiqueta}: las actividades del mismo día no pueden superponerse.`;
  }
}

export function ordenarPrograma(programa?: ActividadPrograma[]): ActividadPrograma[] {
  return (programa || []).map((actividad) => ({
    ...actividad,
    titulo: actividad.titulo.trim(),
    ponente: actividad.ponente?.trim() || undefined,
    descripcion: actividad.descripcion?.trim() || undefined,
  })).sort((a, b) => a.hora.localeCompare(b.hora));
}

export function convertirDiasSolicitud(solicitud: SolicitudEvento, idEvento: string): Evento['fechas'] {
  return solicitud.fechasSolicitadas.map((dia: ElementoFechaSolicitada, indice) => {
    const programa = ordenarPrograma(dia.programa);
    return {
      id: `fec-${idEvento}-${indice + 1}`,
      idEvento,
      fecha: dia.fecha,
      horaInicio: dia.horaInicio,
      horaFin: dia.horaFin,
      idRecinto: dia.idRecinto,
      nombreDia: dia.nombreDia || `Día ${indice + 1}`,
      programa: programa.length ? programa : dia.actividadOPrograma?.trim()
        ? [{ hora: dia.horaInicio, titulo: 'Programa del día', descripcion: dia.actividadOPrograma.trim() }]
        : [],
      ponentes: [...new Set(programa.map((actividad) => actividad.ponente).filter((ponente): ponente is string => Boolean(ponente)))],
      esFinalConfirmado: false,
    };
  });
}
