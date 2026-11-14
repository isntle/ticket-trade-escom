import React, {useId} from 'react';
export function SimboloTicketTrade({className="h-7 w-8",claro=false}:{className?:string;claro?:boolean}){
 const filtro='marca-'+useId().replace(/:/g,'');
 return <svg viewBox="370 385 515 460" role="img" aria-label="Logo de Ticket Trade" className={className}><defs><filter id={filtro} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={claro?"0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .4252 1.4304 .1444 0 -1":"0 0 0 0 .439 0 0 0 0 .086 0 0 0 0 .173 .4252 1.4304 .1444 0 -1"} /></filter></defs><image href="/imagenes/marca/ticket-trade.jpg" width="1254" height="1254" filter={'url(#'+filtro+')'} /></svg>;
}
