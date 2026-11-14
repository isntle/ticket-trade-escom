import test from 'node:test';import assert from 'node:assert/strict';
import {clavePresentacionValida,crearCookiePresentacion,presentacionAutorizada} from '../backend/modulos/identidad/presentacion';
import {seleccionarBaseDatos,modoBaseDatos,nombreCookieSesion} from '../backend/bd/pool';
test('Presentación compartida exige clave privada, firma válida y conserva la sesión real',()=>{
 const nombres=['TT_DEMO','TT_DEMO_COMPARTIDA','TT_PRESENTACION_CLAVE'];const prev=nombres.map(n=>process.env[n]);
 try{
 Object.assign(process.env,{TT_DEMO:'1',TT_DEMO_COMPARTIDA:'1',TT_PRESENTACION_CLAVE:'clave-aleatoria-de-ensayo-privado'});
 assert.equal(clavePresentacionValida('Password123!'),false);assert.equal(clavePresentacionValida(process.env.TT_PRESENTACION_CLAVE),true);
 assert.equal(presentacionAutorizada({cookies:{}}),false);
 const cookie=crearCookiePresentacion();assert.equal(presentacionAutorizada({cookies:{tt_presentacion:cookie}}),true);
 assert.equal(presentacionAutorizada({cookies:{tt_presentacion:cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a')}}),false);
 let llamada=false;
 seleccionarBaseDatos({get:()=> '1',method:'GET',path:'/eventos',query:{}} as any,{} as any,()=>{llamada=true;assert.equal(modoBaseDatos(),'real');assert.equal(nombreCookieSesion(),'tt_sesion_id');});assert.equal(llamada,true);
 process.env.TT_DEMO_COMPARTIDA='0';assert.equal(presentacionAutorizada({cookies:{tt_presentacion:cookie}}),false);
 }finally{nombres.forEach((n,i)=>{if(prev[i]===undefined)delete process.env[n];else process.env[n]=prev[i];});}
});
