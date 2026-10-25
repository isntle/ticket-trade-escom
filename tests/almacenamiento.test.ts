import assert from 'node:assert/strict';
import test from 'node:test';
import { guardarListaSiVigente, guardarLoteLocal } from '../src/dominio/almacenamiento';

test('un fallo de cuota no deja una solicitud autorizada sin el evento y cartel correspondientes', () => {
  const datos = new Map([['solicitudes', 'pendiente'], ['eventos', 'anteriores']]);
  const almacen = {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => { if (clave === 'eventos' && valor !== 'anteriores') throw new Error('Cuota'); datos.set(clave, valor); },
    removeItem: (clave: string) => { datos.delete(clave); },
  };
  const resultado = guardarLoteLocal(almacen, { solicitudes: 'autorizada', eventos: { cartel: 'imagen', programa: ['actividad'] } });
  assert.equal(resultado.exito, false);
  assert.equal(datos.get('solicitudes'), 'pendiente');
  assert.equal(datos.get('eventos'), 'anteriores');
});

test('confirma un lote completo y restaura claves nuevas si una escritura posterior falla', () => {
  const datos = new Map<string, string>();
  const almacen = { getItem: (clave: string) => datos.get(clave) ?? null, setItem: (clave: string, valor: string) => { if (clave === 'falla') throw new Error('Fallo'); datos.set(clave, valor); }, removeItem: (clave: string) => { datos.delete(clave); } };
  assert.equal(guardarLoteLocal(almacen, { evento: { programa: ['actividad'] } }).exito, true);
  assert.deepEqual(JSON.parse(datos.get('evento')!), { programa: ['actividad'] });
  assert.equal(guardarLoteLocal(almacen, { nueva: 'valor', falla: 'valor' }).exito, false);
  assert.equal(datos.has('nueva'), false);
});

 test('una pestaña antigua no puede borrar un apartado creado desde otra',()=>{
  const datos=new Map<string,string>([['reservas','[]']]);
  const almacen={getItem:(k:string)=>datos.get(k)??null,setItem:(k:string,v:string)=>{datos.set(k,v);},removeItem:(k:string)=>{datos.delete(k);}};
  const versionAntigua=datos.get('reservas')!;
  const apartado=[{id:'nuevo',estado:'apartado_temporal'}];
  datos.set('reservas',JSON.stringify(apartado));
  const r=guardarListaSiVigente(almacen,'reservas',[],versionAntigua);
  assert.equal(r.exito,false);assert.deepEqual(JSON.parse(datos.get('reservas')!),apartado);
  assert.equal(guardarListaSiVigente(almacen,'reservas',apartado,versionAntigua).exito,true);
 });
