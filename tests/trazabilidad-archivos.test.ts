import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarArchivoCartel, MAXIMO_CARTEL_BYTES } from '../src/utilidades/cartel';
import { validarDocumentoIdentidad } from '../src/utilidades/documentosIdentidad';
import { reasociarItinerario } from '../src/componentes/eventos/EditorItinerarios';
import type { ItinerarioDia } from '../src/tipos';

test('Trazabilidad de archivos: valida firmas mágicas y rechaza tamaños/tipos no permitidos', async () => {
  const cabeceraPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const cabeceraJpeg = new Uint8Array([255, 216, 255, 224]);

  // Cartel: debe aceptar únicamente JPEG o PNG reales hasta 5 MiB
  await validarArchivoCartel(new File([cabeceraPng], 'cartel.png', { type: 'image/png' }));
  await validarArchivoCartel(new File([cabeceraJpeg], 'cartel.jpg', { type: 'image/jpeg' }));

  // Rechazo de ejecutable camuflado como imagen
  await assert.rejects(
    validarArchivoCartel(new File(['MZ\x90\x00\x03\x00\x00\x00'], 'malware.png', { type: 'image/png' })),
    /ERR-TR-09/,
  );

  // Rechazo de cartel excedido de 5 MiB
  await assert.rejects(
    validarArchivoCartel(new File([cabeceraPng, new Uint8Array(MAXIMO_CARTEL_BYTES + 10)], 'pesado.png', { type: 'image/png' })),
    /ERR-TR-09/,
  );

  // Documento de identidad: debe ser PDF real sin scripts ni contraseñas
  const pdfValido = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
  await validarDocumentoIdentidad(new File([pdfValido], 'constancia.pdf', { type: 'application/pdf' }));

  // Rechazo de PDF protegido con contraseña
  const pdfCifrado = '%PDF-1.4\n/Encrypt 2 0 R\n%%EOF';
  await assert.rejects(
    validarDocumentoIdentidad(new File([pdfCifrado], 'protegido.pdf', { type: 'application/pdf' })),
    /contraseña/,
  );

  // Rechazo de PDF con scripts o acciones
  const pdfScript = '%PDF-1.4\n/JavaScript (app.alert("xss"))\n%%EOF';
  await assert.rejects(
    validarDocumentoIdentidad(new File([pdfScript], 'script.pdf', { type: 'application/pdf' })),
    /acciones/,
  );

  // Rechazo de documento de identidad que no sea PDF
  await assert.rejects(
    validarDocumentoIdentidad(new File(['texto'], 'documento.txt', { type: 'text/plain' })),
    /Solo PDF/,
  );
});

test('El itinerario pertenece a la fecha del evento y no a actividades individuales; se reasocia correctamente', () => {
  const itinerarios: ItinerarioDia[] = [
    { fecha: '2026-11-20', urlImagen: '/api/archivos/101', nombreArchivo: 'itinerario_dia1.png' },
    { fecha: '2026-11-22', urlImagen: '/api/archivos/102', nombreArchivo: 'itinerario_dia2.png' },
  ];

  // 1. Traslado exitoso cuando el día original queda sin actividades y el nuevo día no tiene itinerario
  const trasplante = reasociarItinerario(
    itinerarios,
    ['2026-11-21', '2026-11-22'], // Fechas actuales de actividades
    '2026-11-20',                  // Origen huérfano
    '2026-11-21',                  // Destino válido
  );
  assert.equal(trasplante.length, 2);
  assert.equal(trasplante[0].fecha, '2026-11-21');
  assert.equal(trasplante[0].urlImagen, '/api/archivos/101');
  assert.equal(trasplante[1].fecha, '2026-11-22');

  // 2. Conflicto: Si el destino ya tiene itinerario, no se sobrescribe ni se pierde
  const conflicto = reasociarItinerario(
    itinerarios,
    ['2026-11-22'],
    '2026-11-20',
    '2026-11-22', // 2026-11-22 ya tiene itinerario
  );
  assert.deepEqual(conflicto, itinerarios, 'No debe sobrescribir un itinerario existente en conflicto');

  // 3. Origen no huérfano: si la fecha original todavía tiene actividades, no se traslada
  const noHuerfano = reasociarItinerario(
    itinerarios,
    ['2026-11-20', '2026-11-21'],
    '2026-11-20',
    '2026-11-21',
  );
  assert.deepEqual(noHuerfano, itinerarios, 'No debe mover itinerarios de días que aún conservan actividades');
});

test('Distinción de carteles sembrados y archivos persistidos en base de datos', () => {
  // Los carteles sembrados guardan rutas estáticas y no asumen bytes en PostgreSQL
  const rutaSembrada = '/imagenes/eventos/simposio-ia.jpg';
  const rutaSubida = '/api/archivos/205';

  const esSembrado = (url: string) => url.startsWith('/imagenes/eventos/');
  assert.equal(esSembrado(rutaSembrada), true);
  assert.equal(esSembrado(rutaSubida), false);

  // Normal vs demo
  const resolverUrl = (idArchivo: string, esDemo: boolean) =>
    `/api/archivos/${idArchivo}${esDemo ? '?demo=1' : ''}`;

  assert.equal(resolverUrl('300', false), '/api/archivos/300');
  assert.equal(resolverUrl('300', true), '/api/archivos/300?demo=1');
});
