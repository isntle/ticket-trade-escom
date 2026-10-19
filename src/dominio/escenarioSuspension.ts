import type { Evento, BloqueoRecinto } from '../tipos';
import { fechaHoyMexico } from './solicitudes';
export function escenarioSuspension(ahora = Date.now()): {evento:Evento;bloqueo:BloqueoRecinto} {
  const fecha=fechaHoyMexico(new Date(ahora+14*86400000));
  const evento:Evento={id:'evt-suspension-demo',idOrganizador:'usr-silva',nombreOrganizador:'M. en C. Roberto Silva',titulo:'Demostración de reprogramación por bloqueo',descripcion:'Caso de prueba para resolver un día suspendido. No corresponde a una solicitud real.',categoria:'Académico',visibilidad:'privado',modalidadAsistencia:'libre',estado:'publicado',ponentes:[],etiquetas:['demostración'],aforoMaximo:20,limitesAprobados:{numeroFechas:1,duracionMinutos:60},fechas:[{id:'fec-suspension-demo',idEvento:'evt-suspension-demo',idRecinto:'rec-sala14',fecha,horaInicio:'15:00',horaFin:'16:00',esFinalConfirmado:true,ponentes:[],nombreDia:'Día 1',suspendida:true,idBloqueoSuspension:'bloq-suspension-demo',estadoInscripciones:'cerradas'}]};
  const bloqueo:BloqueoRecinto={id:'bloq-suspension-demo',idRecinto:'rec-sala14',titulo:'Bloqueo retirado de demostración',motivo:'Mantenimiento de prueba',fechaInicio:fecha,horaInicio:'14:00',fechaFin:fecha,horaFin:'17:00',esIndefinido:false,estado:'cancelado',version:2,creadoPor:'Administración de demostración',fechaCreacion:new Date(ahora).toISOString(),motivoCancelacion:'Terminó el mantenimiento; el Organizador todavía debe resolver la suspensión.'};
  return {evento,bloqueo};
}
