import {test} from 'node:test';
import assert from 'node:assert/strict';
import {servicioOrganizacionLocal,type OperacionesOrganizacion} from '../src/servicios/organizacion';
test('el puerto asíncrono conserva argumentos, errores y resultados del adaptador',async()=>{
 const error=new Error('La solicitud cambió');let recibido:unknown[]=[];
 const operaciones={crearSolicitud:(...args:unknown[])=>{recibido=args;return {id:'s'};},guardarBorradorSolicitud:()=>{throw error;},actualizarSolicitud:()=>({exito:false,error:error.message})} as unknown as OperacionesOrganizacion;
 const servicio=servicioOrganizacionLocal(operaciones);
 const dato={} as Parameters<OperacionesOrganizacion['crearSolicitud']>[0];
 assert.equal((await servicio.crearSolicitud(dato)).id,'s');assert.deepEqual(recibido,[dato]);
 await assert.rejects(servicio.guardarBorradorSolicitud(dato),error);
 assert.equal((await servicio.actualizarSolicitud('s',{},true,2)).exito,false);
});
