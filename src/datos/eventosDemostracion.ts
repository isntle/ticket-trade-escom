import type { ArregloAsientos, Evento } from '../tipos';
import { generarAsientosAuditorio } from './datosIniciales';

// Agenda de demostración con fechas fijas: no se desplazan ni se borran al terminar.
// Se conservan los identificadores para no duplicar registros ni sobrescribir ediciones.
const agenda = [
  ['2026-10-26', 'Robótica colaborativa y sistemas autónomos', 'robotica'],
  ['2026-10-28', 'Ciberseguridad aplicada: protege tus aplicaciones', 'ciberseguridad'],
  ['2026-10-30', 'Hackatón de soluciones digitales ESCOM', 'hackathon'],
  ['2026-11-02', 'Simposio de inteligencia artificial y visión por computadora', 'simposio'],
  ['2026-11-04', 'Seguridad de redes y buenas prácticas', null],
  ['2026-11-06', 'Interfaces accesibles para todos', null],
  ['2026-11-09', 'Agentes inteligentes y automatización', null],
  ['2026-11-11', 'Introducción al análisis de vulnerabilidades', null],
  ['2026-11-13', 'Del prototipo a la aplicación', null],
  ['2026-11-16', 'Datos abiertos y aprendizaje automático', null],
  ['2026-11-18', 'Privacidad y protección de datos', null],
  ['2026-11-20', 'Colaboración con Git y código abierto', null],
  ['2026-11-23', 'Robótica y sistemas inteligentes', null],
  ['2026-11-25', 'Respuesta a incidentes informáticos', null],
  ['2026-11-27', 'Arquitectura de aplicaciones web', null],
  ['2026-11-30', 'Visualización de datos para decisiones', null],
  ['2026-12-02', 'Identidad digital y autenticación', null],
  ['2026-12-04', 'Muestra de proyectos de cómputo', null],
] as const;

const titulosAnteriores = [
  'Inteligencia artificial aplicada', 'Protege tus aplicaciones web', 'Diseño de software en equipo',
  'Visión por computadora: de la imagen al dato', 'Seguridad de redes y buenas prácticas', 'Interfaces accesibles para todos',
  'Agentes inteligentes y automatización', 'Introducción al análisis de vulnerabilidades', 'Del prototipo a la aplicación',
  'Datos abiertos y aprendizaje automático', 'Privacidad y protección de datos', 'Colaboración con Git y código abierto',
  'Robótica y sistemas inteligentes', 'Respuesta a incidentes informáticos', 'Arquitectura de aplicaciones web',
  'Visualización de datos para decisiones', 'Identidad digital y autenticación', 'Muestra de proyectos de cómputo',
];

export const EVENTOS_DEMOSTRACION: Evento[] = agenda.map(([fecha, titulo, tema], indice) => {
  const id = `evt-demo-agenda-${fecha}`;
  const controlado = indice % 3 === 0;
  const idRecinto = controlado ? 'rec-auditorio' : 'rec-sala14';
  const idFecha = `fec-demo-agenda-${fecha}`;
  const otrosDias: Evento['fechas'] = indice === 1 ? [{
    id: 'fec-demo-agenda-2026-10-28-d2', idEvento: id, nombreDia: 'Día 2',
    fecha: '2026-10-29', horaInicio: '16:00', horaFin: '18:00', idRecinto: 'rec-auditorio',
    esFinalConfirmado: true, ponentes: ['Equipo académico de demostración'],
    estadoInscripciones: 'abiertas', fechaLimiteInscripciones: '2026-10-29T15:00:00-06:00',
    programa: [
      {hora:'16:00',horaFin:'17:30',titulo:'Presentación de proyectos de seguridad',descripcion:'Exposición de proyectos y conversación sobre prácticas de protección digital.',ponente:'Comité organizador'},
      {hora:'17:30',horaFin:'18:00',titulo:'Conclusiones y preguntas',descripcion:'Cierre del encuentro en el Auditorio Principal.'},
    ],
  }] : [];
  return {
    id, esDemostracion: true, idOrganizador: 'usr-silva', nombreOrganizador: 'M. en C. Roberto Silva',
    titulo, descripcion: `Encuentro académico sobre ${titulo.toLowerCase()}. Consulta las actividades programadas y participa en las sesiones con estudiantes y especialistas del área.`,
    categoria: controlado ? 'Conferencia' : indice % 3 === 1 ? 'Taller' : 'Académico',
    visibilidad: 'publico', modalidadAsistencia: controlado ? 'controlado' : indice % 3 === 1 ? 'registro' : 'libre',
    estado: 'publicado', aforoMaximo: controlado ? 242 : 40,
    urlImagen: tema ? `/imagenes/eventos/${tema}.jpg` : undefined,
    ponentes: ['Comité organizador'], etiquetas: [titulo],
    fechaPublicacion: '2026-10-24T18:00:00-06:00',
    fechas: [{
      id: idFecha, idEvento: id, nombreDia: 'Día 1', fecha, horaInicio: '16:00', horaFin: '18:00',
      idRecinto, idArregloFinal: controlado ? `arr-demo-agenda-${fecha}` : undefined,
      esFinalConfirmado: true, ponentes: ['Comité organizador'],
      estadoInscripciones: 'abiertas', fechaLimiteInscripciones: `${fecha}T15:00:00-06:00`,
      programa: [
        {hora:'16:00',horaFin:'16:15',titulo:'Bienvenida y presentación',descripcion:'Objetivos y dinámica de la jornada.'},
        {hora:'16:15',horaFin:'17:30',titulo,ponente:'Comité organizador',descripcion:'Exposición y conversación sobre el tema del encuentro.'},
        {hora:'17:30',horaFin:'18:00',titulo:'Preguntas y cierre',descripcion:'Intercambio de ideas y conclusiones.'},
      ],
    }, ...otrosDias],
  };
});

export const ARREGLOS_DEMOSTRACION: ArregloAsientos[] = EVENTOS_DEMOSTRACION
  .filter(evento => evento.modalidadAsistencia === 'controlado')
  .map(evento => {
    const dia = evento.fechas[0];
    const asientos = generarAsientosAuditorio();
    return {
      id: dia.idArregloFinal!, idFechaEvento: dia.id, idRecinto: dia.idRecinto,
      nombre: `Distribución de demostración: ${evento.titulo}`, etiquetaVersion: 'v1.0-final', estado:'version_final',
      asientos, totalAsientos: asientos.length,
      asientosAsistente: asientos.filter(a => a.categoria === 'asistente' && !a.estaBloqueado).length,
      asientosVip: asientos.filter(a => a.categoria === 'vip').length,
      asientosOrganizador: asientos.filter(a => a.categoria === 'organizador').length,
      asientosStaff: asientos.filter(a => a.categoria === 'staff').length,
      asientosBloqueados: asientos.filter(a => a.estaBloqueado).length, asientosSinAsignar: 0,
      fechaCreacion:'2026-10-24T18:00:00-06:00', fechaConfirmacionFinal:'2026-10-24T18:00:00-06:00',
    };
  });

/** Añade únicamente registros nuevos; conserva cancelaciones, cambios e historial existentes. */
export function incorporarProgramados<T extends { id: string }>(existentes: T[], programados: T[]): T[] {
  const ids = new Set(existentes.map(registro => registro.id));
  return [...existentes, ...structuredClone(programados.filter(registro => !ids.has(registro.id)))];
}

/** Migra solo las rutas anteriores de los carteles de ejemplo; respeta imágenes subidas por usuarios. */
export function cargarEventosProgramados(existentes: Evento[]): Evento[] {
  return incorporarProgramados(existentes, EVENTOS_DEMOSTRACION).map(evento => {
    const original = EVENTOS_DEMOSTRACION.find(e => e.id === evento.id);
    const indice = original ? EVENTOS_DEMOSTRACION.findIndex(e => e.id === original.id) : -1;
    const tituloAnterior = indice >= 0 ? titulosAnteriores[indice] : undefined;
    const esSemillaAnterior = Boolean(original && evento.esDemostracion && evento.estado === 'publicado'
      && !evento.historialCambios?.length && evento.titulo === tituloAnterior);
    const rutasDeImagenAnterior = new Set([
      '/imagenes/eventos/tecnologia.jpg', '/imagenes/eventos/tecnologia.png',
      '/imagenes/eventos/seguridad.jpg', '/imagenes/eventos/seguridad.png',
      '/imagenes/eventos/software.jpg', '/imagenes/eventos/software.png',
      '/imagenes/eventos/robotica.jpg', '/imagenes/eventos/ciberseguridad.jpg',
      '/imagenes/eventos/hackathon.jpg', '/imagenes/eventos/simposio.jpg',
    ]);
    const actualizarImagen = esSemillaAnterior && original && evento.urlImagen !== original.urlImagen
      && rutasDeImagenAnterior.has(evento.urlImagen ?? '');
    const actualizado = esSemillaAnterior && original
      ? {
          ...evento,
          titulo: original.titulo,
          descripcion: original.descripcion,
          ponentes: original.ponentes,
          etiquetas: original.etiquetas,
          fechas: evento.fechas.map((dia, i) => {
            const diaOriginal = original.fechas[i];
            if (!diaOriginal) return dia;
            const programaConTextoDeDemo = dia.programa?.some(item => item.descripcion?.includes('demostración'));
            return programaConTextoDeDemo
              ? { ...dia, programa: diaOriginal.programa, ponentes: diaOriginal.ponentes }
              : dia;
          }),
          ...(actualizarImagen ? { urlImagen: original.urlImagen } : {}),
        }
      : evento;
    // Añade el segundo día solo a la semilla sin editar; nunca modifica un evento del usuario.
    const semillaSinEditar = original && actualizado.esDemostracion && actualizado.estado === 'publicado'
      && !actualizado.historialCambios?.length && actualizado.titulo === original.titulo
      && actualizado.fechas.length === 1 && original.fechas.length === 2
      && JSON.stringify(actualizado.fechas[0]) === JSON.stringify(original.fechas[0]);
    return semillaSinEditar ? { ...actualizado, fechas: [...actualizado.fechas, ...structuredClone(original.fechas.slice(1))] } : actualizado;
  });
}
