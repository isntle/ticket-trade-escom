import type { BloqueoRecinto, Evento, OcupacionInterna, Recinto, RegistroEscaneo } from '../tipos';
import { inicioEnMexico } from './solicitudes';
export type PropuestaBloqueo = Omit<BloqueoRecinto,'id'|'fechaCreacion'>;
export const recintosBloqueados = (b: PropuestaBloqueo, recintos: Recinto[]) => b.idRecinto==='todos'?recintos.map(r=>r.id):b.idsRecintos?.length?b.idsRecintos:[b.idRecinto];
export function afectaBloqueo(b: PropuestaBloqueo, d: Evento['fechas'][number]): boolean {
  if(b.estado==='cancelado' || !(b.idRecinto==='todos'||b.idRecinto===d.idRecinto||b.idsRecintos?.includes(d.idRecinto))) return false;
  const inicio=inicioEnMexico(b.fechaInicio,b.horaInicio);
  const fin=b.esIndefinido?Infinity:inicioEnMexico(b.fechaFin||b.fechaInicio,b.horaFin||'23:59');
  return inicio < inicioEnMexico(d.fecha,d.horaFin) && fin > inicioEnMexico(d.fecha,d.horaInicio);
}
export function revisarBloqueo(b:PropuestaBloqueo, eventos:Evento[], recintos:Recinto[], ocupaciones:OcupacionInterna[], bloqueos:BloqueoRecinto[], escaneos:RegistroEscaneo[], id?:string, ahora=Date.now()) {
  const inicio=inicioEnMexico(b.fechaInicio,b.horaInicio), fin=b.esIndefinido?Infinity:inicioEnMexico(b.fechaFin||b.fechaInicio,b.horaFin||'');
  if(!b.titulo.trim()||!b.motivo.trim()) throw new Error('Indica título y motivo institucional.');
  if(!Number.isFinite(inicio)||inicio<=ahora) throw new Error('ERR-OR-02 · El bloqueo debe iniciar en una fecha y hora futuras.');
  if((!b.esIndefinido&&!Number.isFinite(fin))||fin<=inicio) throw new Error('ERR-OR-01 · El término debe ser posterior al inicio.');
  const ids=recintosBloqueados(b,recintos);
  if(!ids.length||ids.some(id=>!recintos.some(r=>r.id===id&&r.activo!==false))) throw new Error('Selecciona recintos activos.');
  if(bloqueos.some(otro=>otro.id!==id&&otro.estado!=='cancelado'&&recintosBloqueados(otro,recintos).some(r=>ids.includes(r))&&inicio<(otro.esIndefinido?Infinity:inicioEnMexico(otro.fechaFin||otro.fechaInicio,otro.horaFin||'23:59'))&&fin>inicioEnMexico(otro.fechaInicio,otro.horaInicio))) throw new Error('ERR-OR-10 · El periodo coincide con otro bloqueo vigente.');
  for(const o of ocupaciones.filter(o=>o.estado==='activa'&&ids.includes(o.idRecinto))) {
    const primero=Math.max(inicio,inicioEnMexico(o.fechaInicio,o.horaInicio));
    const ultimo=Math.min(fin,inicioEnMexico(o.fechaFin,o.horaFin));
    if(primero>=ultimo) continue;
    const dia=new Date(o.fechaInicio+'T12:00:00Z');
    for(let i=0;i<3660&&dia.toISOString().slice(0,10)<=o.fechaFin;i++,dia.setUTCDate(dia.getUTCDate()+1)) {
      if(afectaBloqueo(b,{...o,id:'',idEvento:'',fecha:dia.toISOString().slice(0,10),esFinalConfirmado:false,ponentes:[]})) throw new Error('ERR-OR-10 · Existe una actividad interna incompatible: '+o.titulo);
    }
  }
  const afectados=eventos.filter(e=>e.estado!=='cancelado').flatMap(e=>e.fechas.filter(d=>!d.cancelada&&afectaBloqueo(b,d)).map(d=>({idEvento:e.id,idFecha:d.id,titulo:e.titulo,dia:d,organizador:e.nombreOrganizador})));
  if(afectados.some(a=>inicioEnMexico(a.dia.fecha,a.dia.horaInicio)<=ahora||escaneos.some(r=>r.idFechaEvento===a.idFecha&&r.resultado==='exito'))) throw new Error('ERR-OR-16 · No se pueden desplazar días iniciados o con entradas registradas.');
  return {afectados, firma:JSON.stringify({b,eventos,ocupaciones,bloqueos,escaneos})};
}
