import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {ProveedorDatos,useDatos} from '../src/contextos/DatosContexto';
import {ProveedorAutenticacion} from '../src/contextos/AutenticacionContexto';
import {USUARIOS_INICIALES,RECINTOS_INICIALES,EVENTOS_INICIALES,SOLICITUDES_INICIALES} from '../src/datos/datosIniciales';
import {vencimientoRevision,pausarRevision,reanudarRevision,motivoVencimiento,validarCalendario} from '../src/dominio/calendarioRevision';
import {lugaresDelRecinto,validarDistribuciones} from '../src/dominio/distribucionSolicitud';
import {afectaBloqueo,revisarBloqueo} from '../src/dominio/bloqueos';
import {validarLimitesEvento} from '../src/dominio/cambiosEvento';
import {escenarioSuspension} from '../src/dominio/escenarioSuspension';
import {resolverRutaDocumentacion} from '../src/dominio/navegacionDocumentacion';
import {SUBEQUIPOS} from '../src/componentes/demostracion/ExploradorCasosUso';
import {CalendarioRecinto} from '../src/componentes/calendario/CalendarioRecinto';
import {DiaSolicitud} from '../src/componentes/recintos/DiaSolicitud';
const calendario={diasLaborables:[1,2,3,4,5],diasInhabiles:['2030-01-21'],responsable:'Administración de prueba',fechaConfiguracion:'2030-01-01T12:00:00Z'};
const recinto=RECINTOS_INICIALES.find(r=>r.id==='rec-sala14')!;
const dia={id:'fec-prueba',idEvento:'evt-prueba',idRecinto:recinto.id,fecha:'2030-01-25',horaInicio:'10:00',horaFin:'12:00',ponentes:[],esFinalConfirmado:true};
const evento={...EVENTOS_INICIALES[0],id:'evt-prueba',idSolicitud:undefined,idOrganizador:'usr-silva',fechas:[dia],aforoMaximo:20};
const propuesta={idRecinto:recinto.id,titulo:'Mantenimiento de prueba',motivo:'Prueba de afectaciones',fechaInicio:dia.fecha,horaInicio:'09:00',fechaFin:dia.fecha,horaFin:'13:00',esIndefinido:false,creadoPor:'Administración'};
test('revisión vence al fin del segundo día hábil posterior, omitiendo festivos y fin de semana',()=>{
  assert.equal(vencimientoRevision('2030-01-18T19:00:00Z',calendario),'2030-01-24T05:59:59.000Z');
  assert.ok(validarCalendario({...calendario,diasLaborables:[]}));
  assert.ok(validarCalendario({...calendario,diasInhabiles:['2030-02-30']}));
});
test('devolver pausa el tiempo restante; reenviar no concede dos días nuevos',()=>{
  const ahora=Date.parse('2030-01-22T18:00:00Z');
  const s={...SOLICITUDES_INICIALES[0],estado:'en_revision' as const,esExcepcional:false,fechaVencimientoRevision:new Date(ahora+3600000).toISOString()};
  const devuelta={...s,...pausarRevision(s,ahora),estado:'requiere_correccion' as const};
  assert.equal(devuelta.tiempoRevisionRestanteMs,3600000);
  assert.equal(reanudarRevision(devuelta,calendario,ahora+7200000),new Date(ahora+10800000).toISOString());
  assert.match(motivoVencimiento(devuelta,ahora+86400000)!,/24 horas/);
  assert.match(motivoVencimiento(s,ahora+3600000)!,/dos días/);
});
test('distribución previa exige confirmación, capacidad y lugares del recinto correcto',()=>{
  const s={modalidadAsistencia:'controlado' as const,asistenciaEstimada:20,fechasSolicitadas:[{...dia}]};
  assert.match(validarDistribuciones(s,[recinto])!,/confirma/);
  const distribucion=lugaresDelRecinto(recinto);
  assert.equal(validarDistribuciones({...s,fechasSolicitadas:[{...dia,distribucion,distribucionConfirmada:true}]},[recinto]),undefined);
  assert.ok(validarDistribuciones({...s,fechasSolicitadas:[{...dia,distribucion:distribucion.map(a=>({...a,estaBloqueado:true})),distribucionConfirmada:true}]},[recinto]));
  assert.ok(validarDistribuciones({...s,fechasSolicitadas:[{...dia,distribucion:[...distribucion,distribucion[0]],distribucionConfirmada:true}]},[recinto]));
});
test('bloqueos usan intervalos semiabiertos y detectan eventos, entradas y otros bloqueos',()=>{
  assert.equal(afectaBloqueo({...propuesta,horaFin:'10:00'},dia),false);
  assert.equal(afectaBloqueo({...propuesta,estado:'cancelado'},dia),false);
  const r=revisarBloqueo(propuesta,[evento],[recinto],[],[],[],undefined,Date.parse('2030-01-01'));
  assert.equal(r.afectados[0].idFecha,dia.id);
  assert.throws(()=>revisarBloqueo(propuesta,[evento],[recinto],[],[],[{idFechaEvento:dia.id,resultado:'exito'} as never],undefined,Date.parse('2030-01-01')),/ERR-OR-16/);
  assert.throws(()=>revisarBloqueo(propuesta,[],[recinto],[],[{...propuesta,id:'otro',fechaCreacion:'2030-01-01'}],[],undefined,Date.parse('2030-01-01')),/ERR-OR-10/);
});
test('los límites originalmente aprobados no aumentan al editar o retirar días',()=>{
  assert.match(validarLimitesEvento(evento,[{...dia,horaFin:'13:00'}])!,/solicitud nueva/);
  assert.match(validarLimitesEvento(evento,[dia,{...dia,id:'otra'}])!,/solicitud nueva/);
});
test('CU-OR-25 abre un día suspendido real de prueba y conserva la suspensión tras retirar el bloqueo',()=>{
  const d=escenarioSuspension(Date.parse('2030-01-01'));
  assert.equal(d.bloqueo.estado,'cancelado');assert.equal(d.evento.fechas[0].suspendida,true);
  assert.equal(resolverRutaDocumentacion({id:'CU-OR-25',ruta:'/organizador/eventos/otro'},[d.evento],new Date('2030-01-01')),'/organizador/eventos/'+d.evento.id);
});
test('el catálogo usa las referencias corregidas del Word y el CU-OR-05 comienza antes del envío',()=>{
  const b=SUBEQUIPOS.find(e=>e.id==='organizacion')!.casos;
  assert.equal(b.find(c=>c.id==='CU-OR-05')!.ruta,'/solicitar-evento?distribucion=1');
  assert.match(b.find(c=>c.id==='CU-OR-04')!.interfaz,/UI.14.*UI.15/);
  assert.match(b.find(c=>c.id==='CU-OR-03')!.interfaz,/UI.06.*UI.16/);
  assert.ok(b.every(c=>!c.interfaz.includes('UI-ORG-')));
});
class Almacen {datos=new Map<string,string>();getItem(k:string){return this.datos.get(k)??null;}setItem(k:string,v:string){this.datos.set(k,v);}removeItem(k:string){this.datos.delete(k);}}
function contexto(id='usr-fernando',eventos=[evento]){
  const local=new Almacen(),sesion=new Almacen();
  const cuenta=USUARIOS_INICIALES.find(u=>u.roles.includes('admin'))!;
  const usuario=USUARIOS_INICIALES.find(u=>u.id===id)||cuenta;
  Object.assign(globalThis,{localStorage:local,sessionStorage:sesion,window:{location:{search:'',hostname:'localhost'}}});
  local.setItem('tt_usuarios_sistema_v2',JSON.stringify(USUARIOS_INICIALES));local.setItem('tt_rol_activo_v2',usuario.rolActivo);
  sesion.setItem('tt_sesion_identidad_v3',JSON.stringify({id:'prueba',usuario:usuario.id,inicio:Date.now(),actividad:Date.now(),version:usuario.versionCredenciales||0}));
  const prefijo='tt_datos_almacen_escom_v7_';
  local.setItem(prefijo+'eventos',JSON.stringify(eventos));local.setItem(prefijo+'bloqueos','[]');local.setItem(prefijo+'ocupaciones_internas','[]');local.setItem(prefijo+'escaneos','[]');
  let datos:ReturnType<typeof useDatos>;
  function Capturar(){datos=useDatos();return null;}
  renderToString(React.createElement(ProveedorAutenticacion,null,React.createElement(ProveedorDatos,null,React.createElement(Capturar))));
  return {local,prefijo,datos:datos!,leer:(clave:string)=>JSON.parse(local.getItem(prefijo+clave)||'null')};
}
test('registro, revisión de versión y cancelación de bloqueo conservan suspensión sin destruir historial',()=>{
  const c=contexto();
  const r=c.datos.revisarBloqueoInstitucional(propuesta);assert.equal(r.error,undefined);
  assert.equal(c.datos.guardarBloqueoInstitucional(propuesta,undefined,undefined,'firma-incorrecta').exito,false);
  const guardado=c.datos.guardarBloqueoInstitucional(propuesta,undefined,undefined,r.firma);assert.equal(guardado.exito,true,guardado.error);
  assert.equal(c.leer('eventos')[0].fechas[0].suspendida,true);
  assert.equal(c.datos.cancelarBloqueoInstitucional(guardado.id!,'',guardado.version).exito,false);
  assert.equal(c.datos.cancelarBloqueoInstitucional(guardado.id!,'Finalizó mantenimiento',guardado.version).exito,true);
  assert.equal(c.leer('bloqueos')[0].estado,'cancelado');assert.equal(c.leer('bloqueos')[0].historial.length,2);
  assert.equal(c.leer('eventos')[0].fechas[0].suspendida,true);
});
test('calendario no anuncia disponibilidad cuando el margen de desalojo entra en conflicto',()=>{
  contexto('usr-silva');
  const html=renderToString(React.createElement(ProveedorAutenticacion,null,React.createElement(ProveedorDatos,null,
    React.createElement(CalendarioRecinto,{idRecinto:recinto.id,fechaSeleccionada:dia.fecha,horaInicio:'12:15',horaFin:'13:00'}))));
  assert.match(html,/Conflicto con evento/);
  assert.doesNotMatch(html,/Sin conflictos registrados para el horario consultado/);
});
test('consulta de disponibilidad cambia con el recinto y el horario, respetando los 30 minutos',()=>{
  const c=contexto('usr-silva');
  assert.equal(c.datos.verificarDisponibilidadRecinto(recinto.id,dia.fecha,'12:15','13:00').disponible,false);
  assert.equal(c.datos.verificarDisponibilidadRecinto(recinto.id,dia.fecha,'12:30','13:30').disponible,true);
  assert.equal(c.datos.verificarDisponibilidadRecinto('rec-auditorio',dia.fecha,'10:00','12:00').disponible,true);
});
test('formulario por pasos conserva el acceso directo a programa y distribución desde documentación',()=>{
  contexto('usr-silva');
  window.location.search='?distribucion=1';
  const html=renderToString(React.createElement(ProveedorAutenticacion,null,React.createElement(ProveedorDatos,null,
    React.createElement(DiaSolicitud,{dia:{...dia,nombreDia:'Día 1'},indice:0,modalidad:'controlado',aforo:20,puedeEliminar:false,alCambiar:()=>{},alEliminar:()=>{}}))));
  assert.match(html,/Configurar distribución del/);
  assert.match(html,/Programa del/);
  assert.match(html,/Ir al paso 1: Fecha/);
  assert.match(html,/Ir al paso 4: Programa y lugares/);
  assert.match(html,/Se revisan eventos, clases, actividades internas y bloqueos registrados/);
});
test('solicitante sin permiso administrativo no registra bloqueos ni configura calendario',()=>{
  const c=contexto('usr-silva');
  assert.ok(c.datos.revisarBloqueoInstitucional(propuesta).error);
  assert.equal(c.datos.guardarCalendarioRevision(calendario).exito,false);
});
test('aprobar publica conjuntamente el evento y la distribución capturada, sin perder el cartel',()=>{
  const c=contexto('usr-subdireccion');
  const s={...SOLICITUDES_INICIALES[0],id:'sol-cierre',idSolicitante:'usr-silva',estado:'en_revision',esExcepcional:false,asistenciaEstimada:20,urlImagen:'data:image/png;base64,prueba',fechasSolicitadas:[{...dia,fecha:'2030-02-01',distribucion:lugaresDelRecinto(recinto),distribucionConfirmada:true}]};
  c.local.setItem(c.prefijo+'solicitudes',JSON.stringify([s]));
  const r=c.datos.dictaminarSolicitud(s.id,'autorizada',undefined,undefined,s.version||1);assert.equal(r.exito,true,r.error);
  const e=c.leer('eventos').find((e:typeof evento)=>e.idSolicitud===s.id);
  assert.equal(e.estado,'publicado');assert.equal(e.urlImagen,s.urlImagen);assert.equal(e.fechas[0].esFinalConfirmado,true);
  assert.ok(c.leer('arreglos').find((a:{id:string})=>a.id===e.fechas[0].idArregloFinal));
});
test('cancelación invalida también boletos especiales y registra al organizador como destinatario',()=>{
  const c=contexto('usr-subdireccion');
  c.local.setItem(c.prefijo+'boletos',JSON.stringify([{id:'especial',idEvento:evento.id,idFechaEvento:dia.id,tipo:'especial',estado:'valido',correoUsuario:'invitado@example.test'}]));
  c.local.setItem(c.prefijo+'reservaciones',JSON.stringify([{id:'reserva',idEvento:evento.id,idFechaEvento:dia.id,estado:'confirmada',correoUsuario:'asistente@example.test'}]));
  c.local.setItem(c.prefijo+'espera',JSON.stringify([{id:'espera',idEvento:evento.id,idFechaEvento:dia.id,estado:'notificado'}]));
  const r=c.datos.cancelarUnidadEvento(evento.id,dia.id,'Cancelación de prueba',false,JSON.stringify(evento));
  assert.equal(r.exito,true,r.error);
  assert.equal(c.leer('boletos')[0].estado,'cancelado');
  assert.equal(c.leer('reservaciones')[0].estado,'cancelada');
  assert.equal(c.leer('espera')[0].estado,'cancelado');
  const aviso=c.leer('eventos')[0].historialCambios[0].resultadoNotificacion;
  assert.ok(aviso.destinatarios.includes(USUARIOS_INICIALES.find(u=>u.id===evento.idOrganizador)!.correo));
  assert.equal(aviso.estado,'no_configurada');
});
test('una versión obsoleta no cancela días ni modifica boletos',()=>{
  const c=contexto('usr-silva');
  assert.equal(c.datos.cancelarUnidadEvento(evento.id,dia.id,'Prueba',false,'version-anterior').exito,false);
  assert.equal(c.leer('eventos')[0].fechas[0].cancelada,undefined);
});
test('el ejemplo de corrección caducado no impide abrir un expediente vigente en demostración',()=>{
  const c=contexto('usr-silva');
  c.local.setItem(c.prefijo+'solicitudes','[]');
  const resultado=c.datos.prepararSolicitudDemostracion('requiere_correccion');
  assert.equal(resultado.exito,true,resultado.error);
  const solicitud=c.leer('solicitudes').find((s:{id:string})=>s.id===resultado.id);
  assert.equal(motivoVencimiento(solicitud),undefined);
  assert.equal(solicitud.estado,'requiere_correccion');
  assert.equal(solicitud.fechasSolicitadas[0].distribucionConfirmada,true);
  assert.equal(c.datos.prepararSolicitudDemostracion('requiere_correccion').id,resultado.id);
});
test('el evento de demostración queda vigente con su distribución sin cambiar eventos existentes',()=>{
  const c=contexto('usr-silva',[]);
  const resultado=c.datos.prepararEventoDemostracion();
  assert.equal(resultado.exito,true,resultado.error);
  assert.equal(resultado.evento!.estado,'publicado');
  const dia=resultado.evento!.fechas[0];
  assert.equal(dia.esFinalConfirmado,true);
  assert.ok(new Date(dia.fecha+'T09:00:00-06:00').getTime()>Date.now());
  assert.ok(c.leer('arreglos').some((a:{id:string})=>a.id===dia.idArregloFinal));
  assert.equal(c.leer('eventos').length,1);
});
test('la demostración reutiliza el evento vigente y no está disponible sin modo demo',()=>{
  const c=contexto('usr-silva');
  assert.equal(c.datos.prepararEventoDemostracion().evento!.id,evento.id);
  Object.assign(window.location,{hostname:'tickett3.vercel.app'});
  assert.equal(c.datos.prepararEventoDemostracion().exito,false);
});
test('la revisión de envío parte de un borrador válido, sin enviarlo automáticamente',()=>{
  const c=contexto('usr-silva');
  c.local.setItem(c.prefijo+'solicitudes','[]');
  const r=c.datos.prepararSolicitudDemostracion('borrador',true);
  assert.equal(r.exito,true,r.error);
  const s=c.leer('solicitudes')[0];
  assert.equal(s.estado,'borrador');assert.equal(s.fechaEnvioInicial,undefined);
  assert.equal(s.esExcepcional,true);
  assert.equal(validarDistribuciones(s,RECINTOS_INICIALES),undefined);
});
