import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transporteApi, ErrorApi} from '../src/servicios/http';
test('conserva conflicto de servidor y no reintenta la escritura',async()=>{
 let llamadas=0;
 const transporte=transporteApi('/api',(async()=>{llamadas++;return new Response(JSON.stringify({error:{codigo:'VERSION',mensaje:'Actualiza la solicitud'}}),{status:409});}) as typeof fetch);
 await assert.rejects(transporte('/solicitudes/s',{metodo:'PATCH',datos:{}}),(e:unknown)=>e instanceof ErrorApi&&e.estado===409&&e.codigo==='VERSION');
 assert.equal(llamadas,1);
});

test('un corte de red distingue la lectura fallida de una escritura con resultado desconocido', async () => {
  let llamadas = 0;
  const transporte = transporteApi('/api', async () => {
    llamadas++;
    throw new TypeError('Failed to fetch');
  });

  await assert.rejects(transporte('/estado'), (error: unknown) =>
    error instanceof ErrorApi && error.codigo === 'ERROR_RED' && /vuelve a consultar/i.test(error.message));
  await assert.rejects(transporte('/taquilla/apartados', { metodo: 'POST', datos: {} }), (error: unknown) =>
    error instanceof ErrorApi && error.codigo === 'ERROR_RED' && /antes de repetir/i.test(error.message));
  assert.equal(llamadas, 2, 'cada operación realiza una única llamada');
});
