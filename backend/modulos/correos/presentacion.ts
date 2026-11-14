export function fechaBoleto(fecha:string){
 const d=new Date(fecha+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||!Number.isFinite(d.getTime()))return {dia:fecha,mes:'',completa:fecha};
 return {dia:fecha.slice(8),mes:new Intl.DateTimeFormat('es-MX',{month:'short',timeZone:'America/Mexico_City'}).format(d).replace('.',''),completa:new Intl.DateTimeFormat('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Mexico_City'}).format(d)};
}
export function estadoBoleto(estado:string){return ({valido:'Acceso pendiente',cancelado:'Reservación cancelada',utilizado:'Entrada registrada'} as Record<string,string>)[estado]||estado;}
