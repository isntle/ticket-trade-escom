// El correo se procesa después de confirmar la transacción y sin perder su cola persistida.
import {waitUntil} from '@vercel/functions';
import type {Request,Response} from 'express';
import {app} from '../backend/app.js';
import {procesarCorreos} from '../backend/modulos/correos/servicio.js';
export default function handler(req:Request,res:Response){
 res.once('finish',()=>{
  const demoAislada=req.get('x-tickettrade-demo')==='1'&&process.env.TT_DEMO_COMPARTIDA!=='1';
  if(req.method==='POST'&&res.statusCode>=200&&res.statusCode<300&&!demoAislada&&process.env.TT_CORREO_ACTIVO==='1'){
   waitUntil(procesarCorreos(5).catch(()=>{console.error('No se pudo completar el procesamiento de correo. La cola permanece en PostgreSQL.');}));
  }
 });
 return app(req,res);
}
