import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { textoParaUsuario } from '../src/utilidades/textoParaUsuario';
import { ErrorApi } from '../src/servicios/http';
import { AlertaMensaje } from '../src/componentes/ui/AlertaMensaje';
import { EstadoVacio } from '../src/componentes/ui/EstadoVacio';
import { VentanaModal } from '../src/componentes/ui/VentanaModal';
import { ExploradorCasosUso } from '../src/componentes/demostracion/ExploradorCasosUso';
import { ContextoAutenticacion, ContextoDatos } from '../src/contextos/almacenes';
import type { TipoAutenticacion } from '../src/contextos/AutenticacionContexto';
import type { ContextoDatosTipo } from '../src/contextos/DatosContexto';
import { ProveedorNotificaciones } from '../src/contextos/NotificacionesContexto';

test('presentación: conserva la explicación y los códigos de boletos, lugares y referencias del usuario',()=>{
  for(const prefijo of ['UI-02','UI.02','UI-IP-02','IU-CI04','ERR-OR-06','INF-TR-01','MSG-AUTH-001','TT020'])
    assert.equal(textoParaUsuario(prefijo+' · Revisa el horario.'),'Revisa el horario.');
  for(const referencia of ['TT-AB1234','LAB-4','SALA-14','A-02','2022630412','Código QR: ABCDEF0123456789','Referencia: ERR-OR-06'])
    assert.equal(textoParaUsuario(referencia),referencia);
});
test('presentación: alertas, estados y ventanas muestran nombres normales sin modificar sus datos de origen',()=>{
  const mensaje={codigo:'ERR-OR-06',titulo:'ERR-OR-06 · Horario no disponible',descripcion:'INF-OR-06: Elige otra hora.'};
  const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
    React.createElement(AlertaMensaje,{titulo:mensaje.titulo,mensaje:mensaje.descripcion}),
    React.createElement(EstadoVacio,{titulo:'UI-02 · Mis solicitudes',descripcion:mensaje.descripcion}),
    React.createElement(VentanaModal,{estaAbierto:true,alCerrar:()=>{},titulo:'UI.03 · Solicitud de evento',subtitulo:mensaje.descripcion,children:React.createElement('span',null,'Lugar A-02')}),
  ));
  assert.doesNotMatch(html,/(?:UI[.-]\d|INF-OR-|ERR-OR-)/);
  assert.match(html,/Horario no disponible/);assert.match(html,/Mis solicitudes/);assert.match(html,/Solicitud de evento/);assert.match(html,/Lugar A-02/);
  assert.equal(mensaje.codigo,'ERR-OR-06');assert.equal(mensaje.titulo,'ERR-OR-06 · Horario no disponible');
  const error=new ErrorApi(409,'CONFLICTO','ERR-OR-06 · Actualiza la agenda.');
  assert.equal(error.message,'Actualiza la agenda.');assert.equal(error.codigo,'CONFLICTO');assert.equal(error.estado,409);
});
test('presentación: la documentación académica requiere un acceso explícito incluso en demostración',()=>{
  const anterior=globalThis.window;
  try{
    const renderizar=(search:string)=>{
      Object.assign(globalThis,{window:{location:{search}}});
      return renderToStaticMarkup(React.createElement(ProveedorNotificaciones,null,React.createElement(ContextoAutenticacion.Provider,{value:{} as TipoAutenticacion},
        React.createElement(ContextoDatos.Provider,{value:{listaEventos:[]} as unknown as ContextoDatosTipo},
          React.createElement(ExploradorCasosUso,{navegarA:()=>{}})))));
    };
    assert.doesNotMatch(renderizar(''),/Abrir explorador|Documentación/);assert.doesNotMatch(renderizar('?demo=1'),/Abrir explorador|Documentación/);
    assert.match(renderizar('?demo=1&documentacion=1'),/Abrir explorador de casos de uso/);
  }finally{Object.assign(globalThis,{window:anterior});}
});
