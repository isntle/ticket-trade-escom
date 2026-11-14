import crypto from 'node:crypto';
import type {Request} from 'express';
const cookie='tt_presentacion';
export const presentacionCompartida=()=>process.env.TT_DEMO==='1'&&process.env.TT_DEMO_COMPARTIDA==='1';
const firma=(valor:string)=>crypto.createHmac('sha256',process.env.TT_PRESENTACION_CLAVE||'').update(valor).digest('hex');
export function clavePresentacionValida(valor:unknown){
 const clave=process.env.TT_PRESENTACION_CLAVE;
 if(!presentacionCompartida()||!clave||clave.length<16||typeof valor!=='string')return false;
 return crypto.timingSafeEqual(crypto.createHash('sha256').update(valor).digest(),crypto.createHash('sha256').update(clave).digest());
}
export function crearCookiePresentacion(){const vence=String(Date.now()+12*60*60*1000);return vence+'.'+firma(vence);}
export function presentacionAutorizada(req:Pick<Request,'cookies'>){
 if(!presentacionCompartida()||!process.env.TT_PRESENTACION_CLAVE)return false;
 const valor=req.cookies?.[cookie];if(typeof valor!=='string')return false;
 const [vence,sello]=valor.split('.');if(!/^\d{13}$/.test(vence)||!/^[a-f0-9]{64}$/.test(sello)||+vence<Date.now()||+vence>Date.now()+12*60*60*1000)return false;
 return crypto.timingSafeEqual(Buffer.from(sello,'hex'),Buffer.from(firma(vence),'hex'));
}
export const nombreCookiePresentacion=cookie;
