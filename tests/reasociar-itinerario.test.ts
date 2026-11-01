import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reasociarItinerario} from '../src/componentes/eventos/EditorItinerarios';
const archivos=[{fecha:'2030-01-01',urlImagen:'data:image/png;base64,YQ==',nombreArchivo:'programa.png'},{fecha:'2030-01-03',urlImagen:'data:image/png;base64,Yg==',nombreArchivo:'otro.png'}];
test('traslada el archivo huérfano sin perder contenido ni sobrescribir otro día',()=>{
 const resultado=reasociarItinerario(archivos,['2030-01-02','2030-01-03'],'2030-01-01','2030-01-02');
 assert.deepEqual(resultado[0],{...archivos[0],fecha:'2030-01-02'});
 assert.equal(resultado[1],archivos[1]); assert.equal(archivos[0].fecha,'2030-01-01');
 assert.equal(reasociarItinerario(archivos,['2030-01-03'],'2030-01-01','2030-01-03'),archivos);
 assert.equal(reasociarItinerario(archivos,['2030-01-02'],'2030-01-01','2030-01-04'),archivos);
 assert.equal(reasociarItinerario(archivos,['2030-01-01','2030-01-02'],'2030-01-01','2030-01-02'),archivos);
});
