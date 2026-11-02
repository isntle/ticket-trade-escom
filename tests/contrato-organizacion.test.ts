import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptarOrganizacionLocal,identificadorPostgres,estadoSolicitudDesdeCatalogo,type OperacionesB,type LecturaOrganizacion} from '../src/servicios/contratoOrganizacion';
test('bigint se conserva sin pérdida y estados desconocidos no se publican por defecto',()=>{
 assert.equal(identificadorPostgres('9223372036854775807'),'9223372036854775807');
 for(const id of [9007199254740992,'0','-1','9223372036854775808','usr-local']) assert.throws(()=>identificadorPostgres(id));
 assert.equal(estadoSolicitudDesdeCatalogo('Aprobada'),'autorizada');assert.throws(()=>estadoSolicitudDesdeCatalogo('Publicada'));
});
test('el puerto consulta datos vigentes, conserva versión y propaga errores sin ejecutar dos veces',async()=>{
 let version=1, llamadas=0;const error=new Error('Versión desactualizada');
 const datos={listaSolicitudes:[],actualizarSolicitud:(_id:string,_c:unknown,_r:boolean,v:number)=>{llamadas++;if(v!==version)throw error;return {exito:true};}} as unknown as OperacionesB & LecturaOrganizacion;
 const servicio=adaptarOrganizacionLocal(()=>datos);
 version=2;await assert.rejects(servicio.actualizarSolicitud('s',{},true,1),error);assert.equal(llamadas,1);
 datos.listaSolicitudes=[{id:'nueva'}] as LecturaOrganizacion['listaSolicitudes'];assert.equal((await servicio.leer()).listaSolicitudes[0].id,'nueva');
 const abort=new AbortController();abort.abort();await assert.rejects(servicio.leer(abort.signal));
});

test('adaptador remoto usa rutas acordadas, preserva versión y no reintenta conflictos',async()=>{
 const {adaptarOrganizacionRemota}=await import('../src/servicios/organizacionRemota');
 let llamadas=0;
 const rutas={actualizarSolicitud:(id:string,cambios:unknown,reenviar:boolean,versionEsperada:number)=>({ruta:'/solicitudes/'+id,metodo:'PATCH',datos:{cambios,reenviar,versionEsperada}})} as import('../src/servicios/organizacionRemota').ContratoRutasB;
 const remoto=adaptarOrganizacionRemota(rutas,'/organizacion',async(ruta,opciones)=>{
  llamadas++;assert.equal(ruta,'/solicitudes/9007199254740993');assert.equal((opciones!.datos as {versionEsperada:number}).versionEsperada,7);assert.ok(opciones!.idPeticion);throw new Error('Conflicto');
 });
 await assert.rejects(remoto.actualizarSolicitud('9007199254740993',{},true,7),/Conflicto/);assert.equal(llamadas,1);
});
