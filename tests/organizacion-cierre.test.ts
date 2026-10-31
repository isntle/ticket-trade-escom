import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {ProveedorDatos,useDatos} from '../src/contextos/DatosContexto';
import {ProveedorAutenticacion} from '../src/contextos/AutenticacionContexto';
import {USUARIOS_INICIALES,RECINTOS_INICIALES,EVENTOS_INICIALES,SOLICITUDES_INICIALES} from '../src/datos/datosIniciales';
import {CLAVE_CALENDARIO,vencimientoRevision,pausarRevision,reanudarRevision,motivoVencimiento,validarCalendario} from '../src/dominio/calendarioRevision';
import {lugaresDelRecinto,validarDistribuciones} from '../src/dominio/distribucionSolicitud';
import {afectaBloqueo,revisarBloqueo} from '../src/dominio/bloqueos';
import {trasladarPrograma,validarLimitesEvento} from '../src/dominio/cambiosEvento';
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
function contexto(id='usr-fernando',eventos=[evento],reservas?:unknown[],cuentas=USUARIOS_INICIALES){
  const local=new Almacen(),sesion=new Almacen();
  const cuenta=USUARIOS_INICIALES.find(u=>u.roles.includes('admin'))!;
  const usuario=cuentas.find(u=>u.id===id)||cuenta;
  Object.assign(globalThis,{localStorage:local,sessionStorage:sesion,window:{location:{search:'',hostname:'localhost'}}});
  local.setItem('tt_usuarios_sistema_v2',JSON.stringify(cuentas));local.setItem('tt_rol_activo_v2',usuario.rolActivo);
  sesion.setItem('tt_sesion_identidad_v3',JSON.stringify({id:'prueba',usuario:usuario.id,inicio:Date.now(),actividad:Date.now(),version:usuario.versionCredenciales||0}));
  const prefijo='tt_datos_almacen_escom_v7_';
  local.setItem(CLAVE_CALENDARIO,JSON.stringify(calendario));
  if(reservas)local.setItem(prefijo+'reservaciones',JSON.stringify(reservas));
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
  assert.match(html,/Configurar distribución/);
  assert.match(html,/Nombre de la actividad/);
  assert.match(html,/Ir al paso 1: Fecha/);
  assert.match(html,/Ir al paso 4: Acceso y detalles/);
  assert.match(html,/Tipo de acceso/);
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
test('el evento programado se reutiliza con su distribución sin crear ni desplazar eventos',(t)=>{
  t.mock.method(Date,'now',()=>Date.parse('2026-10-24T18:00:00-06:00'));
  const c=contexto('usr-silva',[]);
  const resultado=c.datos.prepararEventoDemostracion();
  assert.equal(resultado.exito,true,resultado.error);
  assert.equal(resultado.evento!.estado,'publicado');
  const dia=resultado.evento!.fechas[0];
  assert.equal(dia.esFinalConfirmado,true);
  assert.ok(new Date(dia.fecha+'T09:00:00-06:00').getTime()>Date.now());
  assert.ok(c.datos.listaArreglos.some(a=>a.id===dia.idArregloFinal));
  assert.equal(c.datos.listaEventos.filter(e=>e.esDemostracion).length,18);
  assert.deepEqual(c.leer('eventos'),[]); // Reutilizar no escribe otro evento ni cambia sus fechas.
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

test('autorizar actividades paralelas conserva categoría, itinerario y distribuciones independientes',()=>{
  const c=contexto('usr-subdireccion');
  const libre={...dia,id:'actividad-abierta',fecha:'2030-02-01',idRecinto:'rec-auditorio',nombreActividad:'Conferencias',modalidadAsistencia:'libre',asistenciaEstimada:80};
  const controlada={...dia,id:'actividad-competencia',fecha:'2030-02-01',nombreActividad:'Competencia',modalidadAsistencia:'controlado',asistenciaEstimada:20,distribucion:lugaresDelRecinto(recinto),distribucionConfirmada:true};
  const s={...SOLICITUDES_INICIALES[0],id:'sol-actividades-paralelas',idSolicitante:'usr-silva',categoria:'Hackatón',estado:'en_revision',esExcepcional:false,modalidadAsistencia:'libre',asistenciaEstimada:80,fechasSolicitadas:[libre,controlada],itinerarios:[{fecha:'2030-02-01',nombreArchivo:'programa.png',urlImagen:'data:image/png;base64,YQ=='}]};
  c.local.setItem(c.prefijo+'solicitudes',JSON.stringify([s]));
  const r=c.datos.dictaminarSolicitud(s.id,'autorizada',undefined,undefined,s.version||1);
  assert.equal(r.exito,true,r.error);
  const creado=c.leer('eventos').find((e:{idSolicitud:string})=>e.idSolicitud===s.id);
  assert.equal(creado.categoria,'Hackatón');assert.deepEqual(creado.itinerarios,s.itinerarios);
  assert.equal(creado.fechas.length,2);assert.equal(new Set(creado.fechas.map((f:{fecha:string})=>f.fecha)).size,1);
  assert.equal(creado.fechas[0].modalidadAsistencia,'libre');assert.equal(creado.fechas[0].idArregloFinal,undefined);
  assert.equal(creado.fechas[1].modalidadAsistencia,'controlado');assert.equal(creado.fechas[1].asistenciaEstimada,20);
  assert.ok(c.leer('arreglos').find((a:{id:string})=>a.id===creado.fechas[1].idArregloFinal));
});

test('un cruce dentro de la solicitud impide autorizar sin guardar un evento parcial',()=>{
  const c=contexto('usr-subdireccion');
  const a={...dia,id:'a',fecha:'2030-02-01',nombreActividad:'Primera',modalidadAsistencia:'libre',asistenciaEstimada:20};
  const s={...SOLICITUDES_INICIALES[0],id:'sol-cruce-interno',estado:'en_revision',esExcepcional:false,modalidadAsistencia:'libre',fechasSolicitadas:[a,{...a,id:'b',nombreActividad:'Segunda'}]};
  c.local.setItem(c.prefijo+'solicitudes',JSON.stringify([s]));
  const antes=c.local.getItem(c.prefijo+'eventos');
  const r=c.datos.dictaminarSolicitud(s.id,'autorizada',undefined,undefined,s.version||1);
  assert.equal(r.exito,false);assert.match(r.error||'',/mismo recinto/);
  assert.equal(c.local.getItem(c.prefijo+'eventos'),antes);
  assert.equal(c.leer('solicitudes')[0].estado,'en_revision');
});

test('reservar respeta el aforo de la actividad aunque el evento tenga otro acceso y capacidad',()=>{
  const d={...dia,id:'actividad-aforo',modalidadAsistencia:'controlado' as const,asistenciaEstimada:1};
  const e={...evento,modalidadAsistencia:'libre' as const,aforoMaximo:100,fechas:[d]};
  const c=contexto('usr-silva',[e],[{id:'res-existente',idEvento:e.id,idFechaEvento:d.id,idAsiento:'A-1',idUsuario:'otra-persona',estado:'confirmada'}]);
  const r=c.datos.apartarAsiento(e.id,d.id,'A-2','A-2','usr-silva','Nombre de prueba','prueba@example.test');
  assert.equal(r.exito,false);assert.match(r.error||'',/aforo aprobado de esta actividad/);
});

test('la comprobación final detecta una ocupación guardada después de abrir la pantalla',()=>{
  const c=contexto('usr-subdireccion',[]);
  assert.equal(c.datos.verificarDisponibilidadRecinto(recinto.id,dia.fecha,'10:00','12:00').disponible,true);
  c.local.setItem(c.prefijo+'eventos',JSON.stringify([evento]));
  assert.equal(c.datos.verificarDisponibilidadRecinto(recinto.id,dia.fecha,'10:00','12:00',undefined,true).disponible,false);
  const s={...SOLICITUDES_INICIALES[0],id:'sol-ocupacion-reciente',estado:'en_revision',esExcepcional:false,modalidadAsistencia:'libre',asistenciaEstimada:20,fechasSolicitadas:[{...dia,nombreActividad:'Nueva propuesta',modalidadAsistencia:'libre',asistenciaEstimada:20}]};
  c.local.setItem(c.prefijo+'solicitudes',JSON.stringify([s]));
  const r=c.datos.dictaminarSolicitud(s.id,'autorizada',undefined,undefined,s.version||1);
  assert.equal(r.exito,false);assert.match(r.error||'',/Conflicto/);
  assert.equal(c.leer('solicitudes')[0].estado,'en_revision');
  assert.equal(c.leer('eventos').length,1);
});

test('reprogramar sincroniza boletos vigentes sin cambiar QR ni afectar otras actividades',()=>{
  const otra={...dia,id:'fec-otra',fecha:'2030-01-26'};
  const e={...evento,fechas:[dia,otra]};
  const c=contexto('usr-silva',[e]);
  const boleto={id:'boleto',idEvento:e.id,idFechaEvento:dia.id,estado:'valido',codigoQr:'qr-estable',fechaEvento:dia.fecha,horaEvento:'10:00 - 12:00',nombreRecinto:recinto.nombre};
  const cancelado={...boleto,id:'cancelado',estado:'cancelado',motivoInvalidacion:'Motivo anterior'};
  const hermano={...boleto,id:'hermano',idFechaEvento:otra.id,fechaEvento:otra.fecha};
  c.local.setItem(c.prefijo+'boletos',JSON.stringify([boleto,cancelado,hermano]));
  const r=c.datos.actualizarEvento(e.id,{fechas:[{...dia,horaInicio:'13:00',horaFin:'15:00'},otra]},JSON.stringify(e));
  assert.equal(r.exito,true,r.error);
  const boletos=c.leer('boletos');
  assert.equal(boletos[0].horaEvento,'13:00 - 15:00');
  assert.equal(boletos[0].codigoQr,boleto.codigoQr);
  assert.deepEqual(boletos[1],cancelado);
  assert.deepEqual(boletos[2],hermano);
});

test('cancelar una actividad conserva las demás y la última cancelación cierra el evento',()=>{
  const otra={...dia,id:'fec-otra',fecha:'2030-01-26'};
  const e={...evento,fechas:[dia,otra]};
  const c=contexto('usr-silva',[e]);
  c.local.setItem(c.prefijo+'boletos',JSON.stringify([{id:'cancelado',idEvento:e.id,idFechaEvento:dia.id,estado:'cancelado',motivoInvalidacion:'Motivo original'}]));
  let r=c.datos.cancelarUnidadEvento(e.id,dia.id,'Primera cancelación',false,JSON.stringify(e));
  assert.equal(r.exito,true,r.error);
  const vigente=c.leer('eventos')[0];
  assert.equal(vigente.estado,e.estado);
  assert.deepEqual(vigente.fechas[1],otra);
  assert.equal(c.leer('boletos')[0].motivoInvalidacion,'Motivo original');
  r=c.datos.cancelarUnidadEvento(e.id,otra.id,'Última cancelación',false,JSON.stringify(vigente));
  assert.equal(r.exito,true,r.error);
  assert.equal(c.leer('eventos')[0].estado,'cancelado');
});

test('un boleto utilizado impide reprogramar o cancelar aunque falte su bitácora de escaneo',()=>{
  const c=contexto('usr-silva');
  c.local.setItem(c.prefijo+'boletos',JSON.stringify([{id:'utilizado',idEvento:evento.id,idFechaEvento:dia.id,estado:'utilizado'}]));
  assert.equal(c.datos.actualizarEvento(evento.id,{fechas:[{...dia,horaInicio:'13:00',horaFin:'15:00'}]},JSON.stringify(evento)).exito,false);
  assert.equal(c.datos.cancelarUnidadEvento(evento.id,dia.id,'Prueba',false,JSON.stringify(evento)).exito,false);
  assert.deepEqual(c.leer('eventos')[0],JSON.parse(JSON.stringify(evento)));
});

test('si falla guardar los boletos se restaura también la programación del evento',()=>{
  const c=contexto('usr-silva');
  const anteriores=c.local.getItem(c.prefijo+'eventos');
  const guardar=c.local.setItem.bind(c.local);
  c.local.setItem=(clave,valor)=>{if(clave===c.prefijo+'boletos')throw new Error('Cuota agotada');guardar(clave,valor);};
  const r=c.datos.actualizarEvento(evento.id,{fechas:[{...dia,horaInicio:'13:00',horaFin:'15:00'}]},JSON.stringify(evento));
  assert.equal(r.exito,false);
  assert.equal(c.local.getItem(c.prefijo+'eventos'),anteriores);
});

test('una entrada registrada desde otra ventana impide reprogramar con estado local obsoleto',()=>{
  const c=contexto('usr-silva');
  c.local.setItem(c.prefijo+'escaneos',JSON.stringify([{id:'entrada-nueva',idFechaEvento:dia.id,resultado:'exito'}]));
  const r=c.datos.actualizarEvento(evento.id,{fechas:[{...dia,horaInicio:'13:00',horaFin:'15:00'}]},JSON.stringify(evento));
  assert.equal(r.exito,false);
  assert.equal(c.leer('eventos')[0].fechas[0].horaInicio,dia.horaInicio);
});

test('la solicitud de un jefe se autoriza conjuntamente y conserva cartel, categoría e itinerarios',()=>{
  const cuentas=USUARIOS_INICIALES.map(u=>u.id==='usr-silva'?{...u,puedeAutoaprobar:true}:u);
  const c=contexto('usr-silva',[],undefined,cuentas);
  const programa=[{hora:'10:00',titulo:'Actividad de prueba',ponente:'Ponente',descripcion:'Contenido'}];
  const datos={...SOLICITUDES_INICIALES[0],idSolicitante:'usr-silva',nombreSolicitante:'Silva',correoSolicitante:'silva@ipn.mx',esExcepcional:false,categoria:'Taller' as const,urlImagen:'data:image/png;base64,imagen',itinerarios:[{fecha:dia.fecha,nombreArchivo:'itinerario.png',urlImagen:'data:image/png;base64,itinerario'}],modalidadAsistencia:'controlado' as const,asistenciaEstimada:20,fechasSolicitadas:[{...dia,nombreActividad:'Taller principal',descripcionActividad:'Descripción',programa,distribucion:lugaresDelRecinto(recinto),distribucionConfirmada:true}]};
  const s=c.datos.crearSolicitud(datos);
  assert.equal(s.estado,'autorizada');
  const publicado=c.leer('eventos').find((e:typeof evento)=>e.idSolicitud===s.id);
  assert.equal(publicado.urlImagen,datos.urlImagen);
  assert.equal(publicado.categoria,datos.categoria);
  assert.deepEqual(publicado.itinerarios,datos.itinerarios);
  assert.equal(publicado.fechas[0].nombreActividad,'Taller principal');
  assert.deepEqual(publicado.fechas[0].programa,programa);
  assert.equal(c.leer('solicitudes').find((n:{id:string})=>n.id===s.id).estado,'autorizada');
});

test('una jefatura retirada desde otra ventana no autoriza solicitudes con el perfil anterior',()=>{
  const cuentas=USUARIOS_INICIALES.map(u=>u.id==='usr-silva'?{...u,puedeAutoaprobar:true}:u);
  const c=contexto('usr-silva',[],undefined,cuentas);
  c.local.setItem('tt_usuarios_sistema_v2',JSON.stringify(cuentas.map(u=>({...u,puedeAutoaprobar:false}))));
  const datos={...SOLICITUDES_INICIALES[0],idSolicitante:'usr-silva',esExcepcional:false,modalidadAsistencia:'controlado' as const,asistenciaEstimada:20,fechasSolicitadas:[{...dia,distribucion:lugaresDelRecinto(recinto),distribucionConfirmada:true}]};
  assert.throws(()=>c.datos.crearSolicitud(datos),/Subdirección/);
  assert.equal(c.leer('solicitudes'),null);
  assert.deepEqual(c.leer('eventos'),[]);
});

 test('reprogramar desplaza el programa sin perder ponentes ni alterar el original',()=>{
  const original={...dia,programa:[{hora:'10:00',horaFin:'10:30',titulo:'Apertura',ponente:'Ponente de prueba'}]};
  const ajustado=trasladarPrograma(original,'13:00')!;
  assert.equal(ajustado[0].hora,'13:00');assert.equal(ajustado[0].horaFin,'13:30');
  assert.equal(ajustado[0].ponente,original.programa[0].ponente);
  assert.equal(original.programa[0].hora,'10:00');
  assert.throws(()=>trasladarPrograma({...original,programa:[{...original.programa[0],hora:'11:00',horaFin:'12:00'}]},'23:30'),/fuera del día/);
 });

test('confirmar dos actividades emite el mismo QR y rechaza confirmar dos veces el apartado',(t)=>{
  t.mock.method(Date,'now',()=>Date.parse('2030-01-24T12:00:00-06:00'));
  const otra={...dia,id:'fec-otra',fecha:'2030-01-26'};
  const c=contexto('usr-carlos',[{...evento,fechas:[dia,otra]}]);
  const base={idEvento:evento.id,idUsuario:'usr-carlos',nombreUsuario:'Carlos de prueba',correoUsuario:'prueba@example.test',estado:'apartado_temporal',tiempoExpiracionApartado:Date.now()+120000,fechaCreacion:new Date().toISOString()};
  c.local.setItem(c.prefijo+'reservaciones',JSON.stringify([{...base,id:'r1',idFechaEvento:dia.id,idAsiento:'A-1',etiquetaAsiento:'A1'},{...base,id:'r2',idFechaEvento:otra.id,idAsiento:'A-2',etiquetaAsiento:'A2'}]));
  c.local.setItem(c.prefijo+'boletos','[]');
  const primero=c.datos.confirmarReservacion('r1');assert.equal(primero.exito,true,primero.error);
  const segundo=c.datos.confirmarReservacion('r2');assert.equal(segundo.exito,true,segundo.error);
  assert.equal(primero.boleto!.codigoQr,segundo.boleto!.codigoQr);
  assert.notEqual(primero.boleto!.id,segundo.boleto!.id);
  assert.equal(c.datos.confirmarReservacion('r1').exito,false);
  assert.equal(c.leer('boletos').length,2);
});

test('escanear el mismo pase en dos actividades conserva controles independientes y evita duplicados',(t)=>{
 let ahora=Date.parse('2030-01-25T10:30:00-06:00');t.mock.method(Date,'now',()=>ahora);
 const otra={...dia,id:'fec-otra',horaInicio:'13:00',horaFin:'15:00'};
 const c=contexto('usr-silva',[{...evento,fechas:[dia,otra]}]);
 const qr='TT-'+'A'.repeat(32);
 const base={idEvento:evento.id,idUsuario:'usr-carlos',nombreUsuario:'Carlos de prueba',correoUsuario:'prueba@example.test',codigoQr:qr,estado:'valido',fechaEmision:'2029-01-01T00:00:00Z'};
 c.local.setItem(c.prefijo+'boletos',JSON.stringify([{...base,id:'b1',idReservacion:'r1',idFechaEvento:dia.id},{...base,id:'b2',idReservacion:'r2',idFechaEvento:otra.id,codigoQr:'TT-'+'B'.repeat(32)}]));
 c.local.setItem(c.prefijo+'reservaciones',JSON.stringify([{id:'r1',idEvento:evento.id,idFechaEvento:dia.id,idUsuario:'usr-carlos',estado:'confirmada'},{id:'r2',idEvento:evento.id,idFechaEvento:otra.id,idUsuario:'usr-carlos',estado:'confirmada'}]));
 const operador=USUARIOS_INICIALES.find(u=>u.id==='usr-silva')!;
 const primero=c.datos.procesarCheckIn(qr,operador.nombre,dia.id,operador,evento.id);
 assert.equal(primero.exito,true,primero.mensaje);
 assert.equal(c.leer('boletos')[1].estado,'valido');
 assert.equal(c.datos.procesarCheckIn(qr,operador.nombre,dia.id,operador,evento.id).resultado,'ya_utilizado');
 ahora=Date.parse('2030-01-25T13:30:00-06:00');
 assert.equal(c.datos.procesarCheckIn(qr,operador.nombre,otra.id,operador,evento.id).exito,true);
 assert.equal(c.leer('boletos').filter((b:{estado:string})=>b.estado==='utilizado').length,2);
 assert.equal(c.leer('escaneos').filter((r:{resultado:string})=>r.resultado==='exito').length,2);
});

test('un fallo al guardar la bitácora no consume el acceso del pase',(t)=>{
 t.mock.method(Date,'now',()=>Date.parse('2030-01-25T10:30:00-06:00'));
 const c=contexto('usr-silva');const qr='TT-'+'C'.repeat(32);
 const boleto={id:'b1',idEvento:evento.id,idFechaEvento:dia.id,idUsuario:'invitado',codigoQr:qr,estado:'valido',esEspecial:true};
 c.local.setItem(c.prefijo+'boletos',JSON.stringify([boleto]));
 const guardar=c.local.setItem.bind(c.local);c.local.setItem=(clave,valor)=>{if(clave===c.prefijo+'escaneos')throw new Error('Cuota agotada');guardar(clave,valor);};
 const operador=USUARIOS_INICIALES.find(u=>u.id==='usr-silva')!;
 assert.equal(c.datos.procesarCheckIn(qr,operador.nombre,dia.id,operador,evento.id).exito,false);
 assert.deepEqual(c.leer('boletos'),[boleto]);
 assert.deepEqual(c.leer('escaneos'),[]);
});

 test('el apartado queda guardado antes de devolver su identificador y se confirma sin esperar un efecto',(t)=>{
  t.mock.method(Date,'now',()=>Date.parse('2030-01-23T12:00:00-06:00'));
  const c=contexto('usr-carlos');
  const res=c.datos.apartarAsiento(evento.id,dia.id,'asiento-prueba','A-1','usr-carlos','Carlos de prueba','prueba@example.test');
  assert.equal(res.exito,true,res.error);
  assert.ok(c.leer('reservaciones').some((r:{id:string})=>r.id===res.reservacion!.id));
  const confirmado=c.datos.confirmarReservacion(res.reservacion!.id);
  assert.equal(confirmado.exito,true,confirmado.error);
  assert.equal(c.leer('reservaciones').find((r:{id:string})=>r.id===res.reservacion!.id).estado,'confirmada');
 });

 test('el lector no revela titulares de otro evento ni acepta operadores ajenos',(t)=>{
  t.mock.method(Date,'now',()=>Date.parse('2030-01-25T10:30:00-06:00'));
  const c=contexto('usr-silva');const qr='TT-'+'D'.repeat(32);
  c.local.setItem(c.prefijo+'boletos',JSON.stringify([{id:'ajeno',idEvento:'evento-ajeno',idFechaEvento:'actividad-ajena',idUsuario:'otra-persona',nombreUsuario:'Nombre privado de prueba',codigoQr:qr,estado:'valido'}]));
  const operador=USUARIOS_INICIALES.find(u=>u.id==='usr-silva')!;
  const r=c.datos.procesarCheckIn(qr,operador.nombre,dia.id,operador,evento.id);
  assert.equal(r.exito,false);assert.equal(r.boleto,undefined);assert.equal(r.resultado,'fecha_invalida');
  assert.ok(!JSON.stringify(c.leer('escaneos')).includes('Nombre privado de prueba'));
  const ajeno=USUARIOS_INICIALES.find(u=>u.roles.includes('staff'))!;
  const sinPermiso=c.datos.procesarCheckIn(qr,ajeno.nombre,dia.id,ajeno,evento.id);
  assert.equal(sinPermiso.resultado,'no_autorizado');
 });

function contextoTraslado() {
  const asientos=lugaresDelRecinto(recinto).map((a,i)=>({...a,categoria:i===1?'vip' as const:'asistente' as const}));
  const fecha={...dia,modalidadAsistencia:'controlado' as const,asistenciaEstimada:20,idArregloFinal:'arr-traslado'};
  const e={...evento,modalidadAsistencia:'controlado' as const,fechas:[fecha,{...fecha,id:'otra-actividad',fecha:'2030-02-01',idArregloFinal:undefined}]};
  const reservas=[0,1].map(i=>({id:'res-traslado-'+i,idEvento:e.id,idFechaEvento:fecha.id,idUsuario:'titular-'+i,nombreUsuario:'Titular '+i,correoUsuario:'titular'+i+'@example.test',idAsiento:asientos[i].id,etiquetaAsiento:asientos[i].etiqueta,estado:'confirmada',fechaCreacion:'2026-10-01T12:00:00Z'}));
  const c=contexto('usr-silva',[e],reservas);
  c.local.setItem(c.prefijo+'arreglos',JSON.stringify([{id:'arr-traslado',idFechaEvento:fecha.id,idRecinto:recinto.id,nombre:'Origen',etiquetaVersion:'v1',estado:'version_final',asientos,totalAsientos:37,asientosAsistente:36,asientosVip:1,asientosOrganizador:0,asientosStaff:0,asientosBloqueados:0,asientosSinAsignar:0,fechaCreacion:'2026-10-01T12:00:00Z'}]));
  const boletos=reservas.map((r,i)=>({id:'bol-traslado-'+i,idReservacion:r.id,idEvento:e.id,idFechaEvento:fecha.id,idUsuario:r.idUsuario,nombreUsuario:r.nombreUsuario,correoUsuario:r.correoUsuario,tituloEvento:e.titulo,fechaEvento:fecha.fecha,horaEvento:'10:00 - 12:00',nombreRecinto:recinto.nombre,etiquetaAsiento:r.etiquetaAsiento,codigoQr:'TT-'+String(i+1).repeat(32),estado:'valido',fechaEmision:'2026-10-01T12:00:00Z'}));
  c.local.setItem(c.prefijo+'boletos',JSON.stringify(boletos));c.local.setItem(c.prefijo+'espera','[]');
  const peticion={idEvento:e.id,idActividad:fecha.id,idRecinto:'rec-auditorio',aforo:20,motivo:'Cambio solicitado por logística'};
  return {...c,e,fecha,reservas,boletos,peticion};
}
test('cambiar recinto conserva QR, categorías, reservas, actividad ajena e historial',()=>{
  const c=contextoTraslado();
  const revision=c.datos.revisarCambioRecinto(c.peticion);assert.equal(revision.exito,true,revision.error);
  assert.equal(revision.propuesta!.lugares.length,2);
  const resultado=c.datos.confirmarCambioRecinto(revision.propuesta!,false);assert.equal(resultado.exito,true,resultado.error);
  const e=c.leer('eventos')[0];assert.equal(e.fechas[0].idRecinto,'rec-auditorio');assert.deepEqual(e.fechas[1],JSON.parse(JSON.stringify(c.e.fechas[1])));
  assert.equal(e.fechas[0].fecha,c.fecha.fecha);assert.equal(e.fechas[0].horaInicio,c.fecha.horaInicio);
  assert.deepEqual(c.leer('boletos').map((b:any)=>[b.id,b.codigoQr,b.idUsuario]),c.boletos.map(b=>[b.id,b.codigoQr,b.idUsuario]));
  const nuevo=c.leer('arreglos').find((a:any)=>a.id===e.fechas[0].idArregloFinal);
  assert.equal(nuevo.asientosVip,1);assert.equal(nuevo.idRecinto,'rec-auditorio');
  for(const r of c.leer('reservaciones')){assert.ok(nuevo.asientos.some((a:any)=>a.id===r.idAsiento&&a.etiqueta===r.etiquetaAsiento));}
  assert.equal(e.historialCambios.at(-1).resultadoNotificacion.estado,'no_configurada');
  assert.equal(c.leer('arreglos').find((a:any)=>a.id==='arr-traslado').estado,'bloqueado');
});
test('cambio de recinto rechaza correspondencias duplicadas, incompletas y entradas nuevas',()=>{
  for(const variante of ['duplicada','incompleta','entrada']){
    const c=contextoTraslado();const p=c.datos.revisarCambioRecinto(c.peticion).propuesta!;
    if(variante==='duplicada')p.peticion.correspondencias![1].destino=p.peticion.correspondencias![0].destino;
    if(variante==='incompleta')p.peticion.correspondencias!.pop();
    if(variante==='entrada')c.local.setItem(c.prefijo+'escaneos',JSON.stringify([{id:'entrada-nueva',idFechaEvento:c.fecha.id,idEvento:c.e.id,resultado:'exito'}]));
    const antes=JSON.stringify([...c.local.datos]);const r=c.datos.confirmarCambioRecinto(p,false);
    assert.equal(r.exito,false,variante);assert.equal(JSON.stringify([...c.local.datos]),antes);
  }
});
test('reducir aforo exige confirmación y conserva todas las plazas comprometidas',()=>{
  const c=contextoTraslado();const p=c.datos.revisarCambioRecinto({...c.peticion,aforo:2}).propuesta!;
  assert.ok(p);assert.equal(p.reduccion,true);assert.equal(c.datos.confirmarCambioRecinto(p,false).exito,false);
  assert.equal(c.datos.confirmarCambioRecinto(p,true).exito,true);assert.equal(c.leer('eventos')[0].fechas[0].asistenciaEstimada,2);
  const d=contextoTraslado();assert.equal(d.datos.revisarCambioRecinto({...d.peticion,aforo:1}).exito,false);
});
test('cambio de recinto conserva apartados, ofertas de espera y sus vencimientos',()=>{
  const c=contextoTraslado();const asientos=lugaresDelRecinto(recinto);
  const temporal={...c.reservas[0],id:'res-temporal',idUsuario:'espera-usuario',idAsiento:asientos[2].id,etiquetaAsiento:asientos[2].etiqueta,estado:'apartado_temporal',tiempoExpiracionApartado:Date.now()+120000};
  c.local.setItem(c.prefijo+'reservaciones',JSON.stringify([...c.reservas,temporal]));
  const oferta={id:'oferta-vigente',idEvento:c.e.id,idFechaEvento:c.fecha.id,idUsuario:temporal.idUsuario,nombreUsuario:'En espera',correoUsuario:'espera@example.test',estado:'notificado',idReservacionOferta:temporal.id,idAsientoOferta:temporal.idAsiento,etiquetaAsientoOferta:temporal.etiquetaAsiento,fechaExpiracionOferta:Date.now()+600000};
  c.local.setItem(c.prefijo+'espera',JSON.stringify([oferta]));
  const p=c.datos.revisarCambioRecinto(c.peticion);assert.equal(p.exito,true,p.error);assert.equal(p.propuesta!.compromisos,3);
  assert.equal(c.datos.confirmarCambioRecinto(p.propuesta!,false).exito,true);
  const r=c.leer('reservaciones').find((r:any)=>r.id===temporal.id);const o=c.leer('espera')[0];
  assert.equal(o.idAsientoOferta,r.idAsiento);assert.equal(o.fechaExpiracionOferta,oferta.fechaExpiracionOferta);assert.equal(r.tiempoExpiracionApartado,temporal.tiempoExpiracionApartado);
});
test('si falla guardar el cambio de recinto se restauran las cinco colecciones',()=>{
  const c=contextoTraslado();const p=c.datos.revisarCambioRecinto(c.peticion).propuesta!;const antes=JSON.stringify([...c.local.datos]);
  const guardar=c.local.setItem.bind(c.local);let fallo=false;c.local.setItem=(k,v)=>{if(k===c.prefijo+'espera'&&!fallo){fallo=true;throw Error('Cuota');}guardar(k,v);};
  assert.equal(c.datos.confirmarCambioRecinto(p,false).exito,false);assert.equal(JSON.stringify([...c.local.datos]),antes);
});
test('destino ocupado, permisos retirados y reservas concurrentes impiden confirmar un traslado',()=>{
  for(const variante of ['ocupado','permiso','reserva']){
    const c=contextoTraslado();const p=c.datos.revisarCambioRecinto(c.peticion).propuesta!;
    if(variante==='ocupado')c.local.setItem(c.prefijo+'bloqueos',JSON.stringify([{id:'bloqueo-nuevo',idRecinto:c.peticion.idRecinto,titulo:'Ocupado',fechaInicio:c.fecha.fecha,fechaFin:c.fecha.fecha,horaInicio:'09:00',horaFin:'13:00',estado:'activo'}]));
    if(variante==='permiso')c.local.setItem('tt_usuarios_sistema_v2',JSON.stringify(USUARIOS_INICIALES.map(u=>u.id==='usr-silva'?{...u,estaActivo:false}:u)));
    if(variante==='reserva')c.local.setItem(c.prefijo+'reservaciones',JSON.stringify([...c.reservas,{...c.reservas[0],id:'concurrente',idAsiento:undefined,etiquetaAsiento:undefined}]));
    const antes=JSON.stringify([...c.local.datos]);const r=c.datos.confirmarCambioRecinto(p,false);assert.equal(r.exito,false,variante);assert.equal(JSON.stringify([...c.local.datos]),antes);
  }
});
test('el mismo QR se valida después del traslado con su nuevo lugar y recinto',()=>{
  const c=contextoTraslado();const p=c.datos.revisarCambioRecinto(c.peticion).propuesta!;
  assert.equal(c.datos.confirmarCambioRecinto(p,false).exito,true);
  const original=Date.now;Date.now=()=>Date.parse(c.fecha.fecha+'T10:05:00-06:00');
  try{
    const r=c.datos.procesarCheckIn(c.boletos[0].codigoQr,'Organizador',c.fecha.id,USUARIOS_INICIALES.find(u=>u.id==='usr-silva'),c.e.id);
    assert.equal(r.exito,true,r.mensaje);assert.equal(r.boleto?.codigoQr,c.boletos[0].codigoQr);assert.equal(r.boleto?.nombreRecinto,RECINTOS_INICIALES.find(r=>r.id===c.peticion.idRecinto)!.nombre);
    assert.equal(c.leer('boletos').find((b:any)=>b.id===c.boletos[1].id).estado,'valido');
  }finally{Date.now=original;}
});
test('el traslado conserva una acreditación especial y su categoría sin inventar una reservación',()=>{
  const c=contextoTraslado();const arreglo=c.leer('arreglos')[0];const asiento=arreglo.asientos[3];asiento.categoria='staff';arreglo.asientosStaff=1;c.local.setItem(c.prefijo+'arreglos',JSON.stringify([arreglo]));
  const especial={...c.boletos[0],id:'bol-especial-traslado',idReservacion:'sin-reserva-especial',idUsuario:'usr-staff',esEspecial:true,tipoEspecial:'staff',etiquetaAsiento:asiento.etiqueta,codigoQr:'TT-'+ 'A'.repeat(32)};
  c.local.setItem(c.prefijo+'boletos',JSON.stringify([...c.boletos,especial]));
  const r=c.datos.revisarCambioRecinto(c.peticion);assert.equal(r.exito,true,r.error);assert.equal(r.propuesta!.compromisos,3);
  assert.equal(c.datos.confirmarCambioRecinto(r.propuesta!,false).exito,true);
  const b=c.leer('boletos').find((b:any)=>b.id===especial.id);assert.equal(b.codigoQr,especial.codigoQr);assert.equal(b.tipoEspecial,'staff');
  const nuevo=c.leer('arreglos').find((a:any)=>a.estado==='version_final');assert.equal(nuevo.asientos.find((a:any)=>a.etiqueta===b.etiquetaAsiento).categoria,'staff');
});

test('confirmación revalida reservas recientes contra otra actividad sin emitir boleto',(t)=>{
  t.mock.method(Date,'now',()=>Date.parse('2030-01-24T12:00:00-06:00'));
  const segunda={...dia,id:'fec-cruce',horaInicio:'11:00',horaFin:'13:00'};
  const c=contexto('usr-carlos',[{...evento,fechas:[dia,segunda]}]);
  const apartado={id:'apartado-cruce',idUsuario:'usr-carlos',idEvento:evento.id,idFechaEvento:dia.id,estado:'apartado_temporal',tiempoExpiracionApartado:Date.now()+120000};
  c.local.setItem(c.prefijo+'reservaciones',JSON.stringify([apartado,{...apartado,id:'confirmada-reciente',idFechaEvento:segunda.id,estado:'confirmada'}]));
  const boletosAntes=c.local.getItem(c.prefijo+'boletos');
  const resultado=c.datos.confirmarReservacion(apartado.id);
  assert.equal(resultado.exito,false);assert.match(resultado.error!,/ERR-MT-07/);
  assert.equal(c.local.getItem(c.prefijo+'boletos'),boletosAntes);
});
