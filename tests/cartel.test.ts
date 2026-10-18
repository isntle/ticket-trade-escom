import assert from 'node:assert/strict';
import test from 'node:test';
import { MAXIMO_CARTEL_BYTES, validarArchivoCartel } from '../src/utilidades/cartel';

const cabeceraPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
test('admite únicamente firma, extensión, MIME y tamaño correspondientes a JPEG o PNG', async () => {
  await validarArchivoCartel(new File([cabeceraPng], 'cartel.PNG', { type: 'image/png' }));
  await validarArchivoCartel(new File([new Uint8Array([255, 216, 255, 224])], 'cartel.jpeg', { type: 'image/jpeg' }));
  for (const archivo of [
    new File(['no es imagen'], 'cartel.png', { type: 'image/png' }),
    new File([cabeceraPng], 'cartel.jpg', { type: 'image/jpeg' }),
    new File([cabeceraPng], 'cartel.svg', { type: 'image/png' }),
    new File([cabeceraPng], 'cartel.png', { type: 'image/svg+xml' }),
    new File([], 'vacio.png', { type: 'image/png' }),
    new File([cabeceraPng, new Uint8Array(MAXIMO_CARTEL_BYTES)], 'grande.png', { type: 'image/png' }),
  ]) await assert.rejects(validarArchivoCartel(archivo), /ERR-TR-09/);
});
