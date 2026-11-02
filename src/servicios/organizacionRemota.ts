import {comandosOrganizacion,consultasOrganizacion,type OperacionesB,type NombreOperacionB,type PuertoOrganizacion,type LecturaOrganizacion,type ServicioConsultasB} from './contratoOrganizacion';
import {transporteApi} from './http';
/** Rutas y serialización se acuerdan con backend; no se adivinan a partir de tablas. */
export type ContratoRutasB = {[K in NombreOperacionB]: (...args:Parameters<OperacionesB[K]>)=>{ruta:string;metodo:'GET'|'POST'|'PATCH'|'DELETE';datos?:unknown}};
export function adaptarOrganizacionRemota(rutas:ContratoRutasB,rutaLectura:string,solicitar=transporteApi()):PuertoOrganizacion & ServicioConsultasB {
 const puerto:Record<string,unknown>={};
 for(const nombre of [...consultasOrganizacion,...comandosOrganizacion]){
  puerto[nombre]=async(...args:unknown[])=>{
   const peticion=(rutas[nombre] as (...args:unknown[])=>ReturnType<ContratoRutasB[NombreOperacionB]>)(...args);
   const escritura=(comandosOrganizacion as readonly string[]).includes(nombre);
   if(!peticion.ruta.startsWith('/')||peticion.ruta.startsWith('//'))throw new Error('La ruta debe ser relativa a la API acordada.');
   if(escritura&&peticion.metodo==='GET')throw new Error('Un comando no puede enviarse mediante GET.');
   return solicitar(peticion.ruta,{...peticion,idPeticion:escritura?crypto.randomUUID():undefined});
  };
 }
 return Object.assign(puerto,{leer:(signal?:AbortSignal)=>solicitar<LecturaOrganizacion>(rutaLectura,{signal})}) as unknown as PuertoOrganizacion & ServicioConsultasB;
}
