import type { ArregloAsientos, BoletoDigital, CategoriaAsiento, EntradaListaEspera, Evento, Recinto, RegistroEscaneo, Reservacion, Usuario } from '../tipos';
import { lugaresDelRecinto } from './distribucionSolicitud';
import { aforoActividad, modalidadActividad } from './actividades';
import { inicioEnMexico } from './solicitudes';
import { puedeModificarEvento } from './cambiosEvento';

export interface EstadoCambioRecinto {
  evento: Evento; recintos: Recinto[]; arreglos: ArregloAsientos[];
  reservas: Reservacion[]; boletos: BoletoDigital[]; espera: EntradaListaEspera[]; escaneos: RegistroEscaneo[];
}
export interface CorrespondenciaLugar { origen: string; destino: string }
export interface PeticionCambioRecinto {
  idEvento: string; idActividad: string; idRecinto: string; aforo: number; motivo: string;
  idArreglo: string; correspondencias?: CorrespondenciaLugar[];
}
export interface PropuestaCambioRecinto {
  peticion: PeticionCambioRecinto; firma: string; recintoAnterior: string; recintoNuevo: string;
  aforoAnterior: number; aforoNuevo: number; compromisos: number; reduccion: boolean;
  lugares: Array<{origen:string; etiquetaAnterior:string; destino:string; etiquetaNueva:string; categoria:CategoriaAsiento; titulares:string}>;
  destinos: Array<{id:string; etiqueta:string}>;
}
function exigir(condicion: unknown, mensaje: string): asserts condicion { if (!condicion) throw new Error(mensaje); }
export function firmaCambioRecinto(e: EstadoCambioRecinto, id: string) {
  const deActividad = (a: {idFechaEvento:string}) => a.idFechaEvento === id;
  return JSON.stringify([e.evento,e.recintos,e.arreglos.filter(deActividad),e.reservas.filter(deActividad),e.boletos.filter(deActividad),e.espera.filter(deActividad),e.escaneos.filter(deActividad)]);
}
/** Revisa una correspondencia; no modifica ni aparta lugares hasta confirmar. */
export function proyectarCambioRecinto(e: EstadoCambioRecinto, p: PeticionCambioRecinto, actor: Usuario | null, ahora=Date.now()) {
  exigir(puedeModificarEvento(actor,e.evento),'Solo el Organizador propietario o Subdirección pueden cambiar el recinto.');
  exigir(e.evento.id===p.idEvento && ['publicado','configuracion'].includes(e.evento.estado),'El evento no admite cambios de recinto.');
  const actividad=e.evento.fechas.find(a=>a.id===p.idActividad);
  exigir(actividad && !actividad.cancelada && inicioEnMexico(actividad.fecha,actividad.horaInicio)>ahora,'La actividad debe ser futura y no estar cancelada.');
  const boletos=e.boletos.filter(b=>b.idFechaEvento===actividad.id && b.estado!=='cancelado');
  exigir(!boletos.some(b=>b.estado==='utilizado'||b.fechaCheckIn) && !e.escaneos.some(s=>s.idFechaEvento===actividad.id&&s.resultado==='exito'),'La actividad ya tiene entradas registradas.');
  const destino=e.recintos.find(r=>r.id===p.idRecinto && r.activo!==false);
  exigir(destino && destino.id!==actividad.idRecinto,'Elige otro recinto activo.');
  exigir(p.motivo.trim(),'Indica el motivo del cambio de recinto.');
  exigir(p.idArreglo && !e.arreglos.some(a=>a.id===p.idArreglo),'La nueva distribución necesita un identificador propio. Vuelve a revisar la propuesta.');
  const aforoAnterior=aforoActividad(actividad,e.evento.aforoMaximo) || e.recintos.find(r=>r.id===actividad.idRecinto)?.capacidad || 0;
  exigir(Number.isInteger(p.aforo)&&p.aforo>0&&p.aforo<=destino.capacidad&&p.aforo<=aforoAnterior,'El aforo debe caber en el destino y no superar el aprobado.');
  const controlado=modalidadActividad(actividad,e.evento.modalidadAsistencia)==='controlado';
  exigir(destino.tipo!=='laboratorio'||controlado,'Los laboratorios requieren acceso controlado.');
  const reservas=e.reservas.filter(r=>r.idFechaEvento===actividad.id&&(r.estado==='confirmada'||r.estado==='apartado_temporal'&&(r.tiempoExpiracionApartado||0)>ahora));
  const ofertas=e.espera.filter(o=>o.idFechaEvento===actividad.id&&o.estado==='notificado'&&(o.fechaExpiracionOferta||0)>ahora);
  const anterior=e.arreglos.find(a=>a.id===actividad.idArregloFinal&&a.idFechaEvento===actividad.id&&a.estado==='version_final') || e.arreglos.find(a=>a.idFechaEvento===actividad.id&&a.estado==='version_final');
  exigir(!controlado||anterior,'La actividad necesita su distribución final de origen para conservar los lugares.');
  const origenes=anterior?.asientos || [];
  const reclamados=new Map<string,{titular:string;nombre:string;categoria:CategoriaAsiento}>();
  const cupos=new Map<string,CategoriaAsiento>();
  const categoriaDe=(id?:string,etiqueta?:string):CategoriaAsiento=>origenes.find(a=>id?a.id===id:a.etiqueta===etiqueta)?.categoria || "asistente";
  function reclamar(id:string|undefined,etiqueta:string|undefined,titular:string,nombre:string,categoria?:CategoriaAsiento){
    if(!id&&!etiqueta)return;
    const asiento=id?origenes.find(a=>a.id===id):origenes.find(a=>a.etiqueta===etiqueta);
    exigir(asiento&&!asiento.estaBloqueado&&!asiento.estaEliminado,'Un lugar comprometido no coincide con la distribución de origen.');
    exigir(!categoria||categoria===asiento.categoria,'La categoría de un boleto especial no coincide con su lugar.');
    const previo=reclamados.get(asiento.id);
    exigir(!previo||previo.titular===titular,'El mismo lugar está comprometido para personas distintas. Revisa los datos antes de cambiar.');
    reclamados.set(asiento.id,{titular,nombre,categoria:asiento.categoria});
  }
  for(const r of reservas){cupos.set(r.id,categoriaDe(r.idAsiento,r.etiquetaAsiento));reclamar(r.idAsiento,r.etiquetaAsiento,r.idUsuario,r.nombreUsuario);}
  for(const b of boletos){
    const r=reservas.find(r=>r.id===b.idReservacion);
    exigir(b.esEspecial||r,'Un boleto vigente no tiene su reservación activa. Revisa sus compromisos.');
    cupos.set(r?.id||b.id,b.esEspecial?b.tipoEspecial||"asistente":categoriaDe(r?.idAsiento,b.etiquetaAsiento));
    reclamar(r?.idAsiento,b.etiquetaAsiento,b.idUsuario||b.id,b.nombreUsuario,b.esEspecial?b.tipoEspecial:undefined);
  }
  for(const o of ofertas){cupos.set(reservas.some(r=>r.id===o.idReservacionOferta)?o.idReservacionOferta!:o.id,categoriaDe(o.idAsientoOferta,o.etiquetaAsientoOferta));reclamar(o.idAsientoOferta,o.etiquetaAsientoOferta,o.idUsuario,o.nombreUsuario);}
  exigir(cupos.size<=p.aforo,'La reducción de aforo dejaría fuera reservas, apartados, ofertas o boletos especiales.');
  const asientos=controlado?lugaresDelRecinto(destino).map(a=>({...a,categoria:'asistente' as CategoriaAsiento})):[];
  const disponibles=asientos.filter(a=>!a.estaBloqueado&&!a.estaEliminado);
  exigir(!controlado||disponibles.length>=p.aforo,'El destino no cuenta con suficientes lugares físicos.');
  const elegidos=p.correspondencias;
  exigir(!elegidos||(elegidos.length===reclamados.size&&new Set(elegidos.map(c=>c.origen)).size===reclamados.size&&elegidos.every(c=>reclamados.has(c.origen))),'La correspondencia debe incluir una vez cada lugar comprometido.');
  const usados=new Set<string>();
  const lugares=[...reclamados].map(([origen,datos],i)=>{
    const id=elegidos?.find(c=>c.origen===origen)?.destino || (!elegidos?disponibles[i]?.id:undefined);
    const nuevo=disponibles.find(a=>a.id===id);
    exigir(nuevo&&!usados.has(nuevo.id),'Asigna un lugar de destino distinto y válido a cada compromiso.');
    usados.add(nuevo.id);nuevo.categoria=datos.categoria;
    return {origen,etiquetaAnterior:origenes.find(a=>a.id===origen)!.etiqueta,destino:nuevo.id,etiquetaNueva:nuevo.etiqueta,categoria:datos.categoria,titulares:datos.nombre};
  });
  // Conserva las plazas especiales, también las que aún no tienen boleto.
  for(const categoria of ['vip','organizador','staff'] as const){
    const total=origenes.filter(a=>a.categoria===categoria&&!a.estaBloqueado&&!a.estaEliminado).length;
    let faltan=total-lugares.filter(l=>l.categoria===categoria).length;
    for(const a of disponibles){if(faltan>0&&!usados.has(a.id)){a.categoria=categoria;usados.add(a.id);faltan--;}}
    exigir(faltan<=0,'El destino no conserva las plazas especiales de la distribución aprobada.');
  }
  const especiales=disponibles.filter(a=>a.categoria!=='asistente').length;
  const generales=[...cupos.values()].filter(c=>c==='asistente').length;
  exigir(!controlado||p.aforo>=especiales+generales,'El aforo reducido no conserva las plazas especiales y los compromisos generales.');
  let habilitados=usados.size;
  for(const a of disponibles){if(!usados.has(a.id)){if(habilitados<p.aforo)habilitados++;else a.estaBloqueado=true;}}
  const nuevaActividad={...actividad,idRecinto:destino.id,asistenciaEstimada:p.aforo,suspendida:false,idBloqueoSuspension:undefined,idArregloFinal:controlado?p.idArreglo:undefined,esFinalConfirmado:true};
  const fecha=new Date(ahora).toISOString();
  const arreglo:ArregloAsientos|undefined=controlado?{id:p.idArreglo,idFechaEvento:actividad.id,idRecinto:destino.id,nombre:'Distribución por cambio de recinto',etiquetaVersion:'Cambio confirmado',estado:'version_final',asientos,totalAsientos:asientos.filter(a=>!a.estaEliminado).length,asientosAsistente:asientos.filter(a=>!a.estaEliminado&&!a.estaBloqueado&&a.categoria==='asistente').length,asientosVip:asientos.filter(a=>!a.estaEliminado&&!a.estaBloqueado&&a.categoria==='vip').length,asientosOrganizador:asientos.filter(a=>!a.estaEliminado&&!a.estaBloqueado&&a.categoria==='organizador').length,asientosStaff:asientos.filter(a=>!a.estaEliminado&&!a.estaBloqueado&&a.categoria==='staff').length,asientosBloqueados:asientos.filter(a=>!a.estaEliminado&&a.estaBloqueado).length,asientosSinAsignar:0,fechaCreacion:fecha,fechaConfirmacionFinal:fecha}:undefined;
  function lugarNuevo(id?:string,etiqueta?:string){return lugares.find(l=>id?l.origen===id:l.etiquetaAnterior===etiqueta);}
  const reservasNuevas=e.reservas.map(r=>reservas.includes(r)?{...r,...(lugarNuevo(r.idAsiento,r.etiquetaAsiento)?{idAsiento:lugarNuevo(r.idAsiento,r.etiquetaAsiento)!.destino,etiquetaAsiento:lugarNuevo(r.idAsiento,r.etiquetaAsiento)!.etiquetaNueva}:{})}:r);
  const boletosNuevos=e.boletos.map(b=>boletos.includes(b)?{...b,nombreRecinto:destino.nombre,...(lugarNuevo(undefined,b.etiquetaAsiento)?{etiquetaAsiento:lugarNuevo(undefined,b.etiquetaAsiento)!.etiquetaNueva}:{})}:b);
  const esperaNueva=e.espera.map(o=>ofertas.includes(o)?{...o,...(lugarNuevo(o.idAsientoOferta,o.etiquetaAsientoOferta)?{idAsientoOferta:lugarNuevo(o.idAsientoOferta,o.etiquetaAsientoOferta)!.destino,etiquetaAsientoOferta:lugarNuevo(o.idAsientoOferta,o.etiquetaAsientoOferta)!.etiquetaNueva}:{})}:o);
  const propuesta:PropuestaCambioRecinto={peticion:{...p,correspondencias:lugares.map(l=>({origen:l.origen,destino:l.destino}))},firma:firmaCambioRecinto(e,actividad.id),recintoAnterior:e.recintos.find(r=>r.id===actividad.idRecinto)?.nombre||actividad.idRecinto,recintoNuevo:destino.nombre,aforoAnterior,aforoNuevo:p.aforo,compromisos:cupos.size,reduccion:p.aforo<aforoAnterior,lugares,destinos:disponibles.map(a=>({id:a.id,etiqueta:a.etiqueta}))};
  return {propuesta,actividad:nuevaActividad,arreglo,reservas:reservasNuevas,boletos:boletosNuevos,espera:esperaNueva};
}
