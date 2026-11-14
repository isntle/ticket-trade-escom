import {fechaBoleto,estadoBoleto} from "./presentacion";
import type { PoolClient } from "pg";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
export type DatosBoleto = {
  id: string;
  titulo: string;
  titular: string;
  correo: string;
  qr: string;
  actividades: Array<{
    nombre: string;
    fecha: string;
    inicio: string;
    fin: string;
    recinto: string;
    lugar: string;
    estado: string;
  }>;
};
export async function leerBoleto(
  c: PoolClient,
  id: string,
  cuenta: string,
): Promise<DatosBoleto> {
  const b = (
    await c.query(
      `SELECT b.id_boleto_evento::text id,b.codigo_qr qr,e.titulo,c.correo,c.correo_confirmado_en,
 concat_ws(' ',c.nombres,c.primer_apellido,c.segundo_apellido) titular FROM ticket_trade."BoletoEvento" b
 JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."Cuenta" c USING(id_cuenta)
 WHERE b.id_boleto_evento=$1 AND b.id_cuenta=$2`,
      [id, cuenta],
    )
  ).rows[0];
  if (!b || !b.correo_confirmado_en)
    throw Object.assign(Error("Boleto no disponible."), { estado: 404 });
  const a = (
    await c.query(
      `SELECT actividad nombre,to_char(fecha,'YYYY-MM-DD') fecha,to_char(hora_inicio,'HH24:MI') inicio,
 to_char(hora_fin,'HH24:MI') fin,recinto,coalesce(lugar,'Acceso general') lugar,estado_boleto estado
 FROM ticket_trade.v_pase_actividades WHERE id_boleto_evento=$1 ORDER BY fecha,hora_inicio,id_reservacion`,
      [id],
    )
  ).rows;
  return { ...b, actividades: a };
}
export async function generarPdfBoleto(b:DatosBoleto){
 const doc=await PDFDocument.create();doc.setTitle('Boleto · '+b.titulo);doc.setAuthor('Ticket Trade');
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const vino=rgb(0.48,0.075,0.17),tinta=rgb(0.15,0.17,0.20),gris=rgb(0.40,0.43,0.46),linea=rgb(0.86,0.87,0.88),papel=rgb(0.97,0.95,0.96);
 let page=doc.addPage(),y=735;
 const texto=(t:string,x:number,yy:number,tam=11,negrita=false,color=tinta)=>page.drawText(t,{x,y:yy,size:tam,font:negrita?bold:regular,color});
 const partir=(valor:string,ancho:number,tam:number,negrita=false)=>{const f=negrita?bold:regular;const resultado:string[]=[];let actual='';for(const letra of valor.replace(/[\r\n]/g,' ')){if(f.widthOfTextAtSize(actual+letra,tam)>ancho){const corte=actual.lastIndexOf(' ');if(corte>actual.length/2){resultado.push(actual.slice(0,corte));actual=actual.slice(corte+1);}else{resultado.push(actual);actual='';}}actual+=letra;}if(actual)resultado.push(actual);return resultado;};
 const cabecera=()=>{page.drawRectangle({x:0,y:0,width:7,height:page.getHeight(),color:vino});texto('Ticket Trade',48,793,24,true,vino);texto('ESCOM · IPN',450,798,9,true,gris);texto('Boleto del evento',450,783,9,false,gris);page.drawLine({start:{x:48,y:763},end:{x:547,y:763},thickness:1,color:linea});};
 const nueva=()=>{page=doc.addPage();y=735;cabecera();};cabecera();
 for(const t of partir(b.titulo,495,25,true)){if(y<100)nueva();texto(t,48,y,25,true);y-=31;}y-=10;
 const png=await QRCode.toBuffer(b.qr,{width:480,margin:4,errorCorrectionLevel:'M'});const img=await doc.embedPng(png);
 if(y<290)nueva();const base=y-194;
 page.drawRectangle({x:48,y:base,width:499,height:188,color:papel});
 texto('Tu acceso, en un solo código',64,y-28,15,true,vino);texto('Titular',64,y-51,9,false,gris);
 let ty=y-69;for(const t of partir(b.titular,263,13,true)){texto(t,64,ty,13,true);ty-=17;}
 texto('Pase '+b.id,64,Math.min(ty-5,y-111),10,false,gris);
 texto('Presenta el QR en cada actividad.',64,y-146,10);texto('Cada entrada se registra por separado.',64,y-162,10);
 for(let i=base+8;i<base+183;i+=7)page.drawCircle({x:351,y:i,size:0.8,color:rgb(0.72,0.68,0.70)});
 page.drawCircle({x:351,y:base,size:8,color:rgb(1,1,1)});page.drawCircle({x:351,y:base+188,size:8,color:rgb(1,1,1)});
 page.drawImage(img,{x:375,y:base+23,width:148,height:148});y=base-31;
 texto('Tus actividades reservadas',48,y,15,true);y-=23;
 for(const a of b.actividades){
  const tit=partir(a.nombre,380,13,true),rec=partir(a.recinto,380,10),lugar=partir(a.lugar,380,11,true);
  const alto=Math.max(114,35+tit.length*17+rec.length*14+lugar.length*15+24);
  if(y-alto<70){nueva();texto('Actividades reservadas · continuación',48,y,14,true);y-=27;}
  page.drawLine({start:{x:48,y},end:{x:547,y},thickness:1,color:linea});
  const fecha=fechaBoleto(a.fecha);texto(fecha.dia,50,y-35,27,true,vino);texto(fecha.mes.toUpperCase()+' '+a.fecha.slice(0,4),50,y-51,9,true,gris);texto(a.inicio+'–'+a.fin,50,y-70,9,false,gris);
  let ay=y-23;for(const t of tit){if(ay<90){nueva();ay=y;}texto(t,151,ay,13,true);ay-=17;}
  for(const t of rec){texto(t,151,ay-2,10);ay-=14;}for(const t of lugar){texto(t,151,ay-3,11,true);ay-=15;}
  const estado=estadoBoleto(a.estado),color=a.estado==='cancelado'?vino:a.estado==='utilizado'?gris:rgb(0.04,0.38,0.29);
  texto(estado,151,ay-9,9,true,color);y=Math.min(y-alto,ay-30);
 }
 for(const [i,p] of doc.getPages().entries()){p.drawLine({start:{x:48,y:51},end:{x:547,y:51},thickness:1,color:linea});p.drawText('Consulta horarios y estados vigentes en Ticket Trade antes de asistir.',{x:48,y:34,size:8,font:regular,color:gris});p.drawText((i+1)+' / '+doc.getPageCount(),{x:516,y:34,size:8,font:bold,color:vino});}
 return {pdf:Buffer.from(await doc.save()),png};
}
