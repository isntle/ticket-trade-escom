# Cartel y programa del evento

## Alcance

TICKTRADE-56 permite preparar el cartel y las actividades de cada día, conservarlos al autorizar la solicitud y consultarlos en el evento publicado. Los ponentes y el cartel son opcionales conforme al contenido mínimo del Sprint 3. El programa describe actividades: no crea inventarios de boletos independientes para cada actividad.

## Recorrido

1. Con la cuenta de prueba del profesor Roberto, abrir «Solicitar nuevo evento» en la cartelera.
2. Capturar título, descripción, días, horarios y recintos. Elegir un JPEG/PNG de hasta 5 MiB si se requiere cartel. La vista previa aparece antes de guardar.
3. En cada día, usar «Añadir actividad». Capturar hora de inicio y título; se puede añadir término, descripción y ponentes. Se pueden quitar actividades y registrar varias por día.
4. Guardar borrador, recuperar y verificar los datos, o revisar el resumen y enviar la solicitud.
5. En la cuenta de prueba de Subdirección, abrir «Solicitudes» y «Ver detalle». Revisar el cartel y todas las actividades antes de autorizar o crear expresamente el evento extraordinario.
6. Abrir el evento asociado. Se conservan el cartel, los nombres de días, fechas, horarios, recintos, actividades, descripciones y ponentes. Los programas se ordenan por hora.
7. Completar la distribución final de cada día cuando la modalidad lo requiera y publicar mediante el recorrido existente. El detalle público muestra cartel y programa, sin publicar documentos ni contactos privados.
8. En «Mis eventos y solicitudes», configurar el evento propio. Antes de que comience y mientras no haya entradas registradas, editar cartel y programa, revisar cambios, capturar un motivo y confirmar. El historial conserva los valores anteriores y nuevos. Un evento cancelado no admite esta edición.

## Validaciones

- El cartel se comprueba por tamaño, extensión, MIME, firma binaria y decodificación. Un archivo rechazado no sustituye el anterior. Se puede descartar el intento rechazado, elegir otro o quitar el cartel.
- La preparación de la imagen bloquea el guardado hasta terminar. La imagen se optimiza para el almacenamiento local y se liberan sus URL temporales.
- Las actividades requieren título y hora real. Deben comenzar dentro del horario general del día. El término opcional debe ser posterior al inicio y no superar el fin del día. No se admiten comienzos duplicados ni intervalos que se superpongan; dos actividades consecutivas sí son válidas.
- La misma validación de programa se ejecuta al guardar/enviar solicitudes y al autorizar. La edición y reprogramación comprueban que el programa siga dentro del horario.
- La autorización escribe solicitud, evento y distribuciones como un lote local con restauración ante un error de escritura. Los fallos de cuota no deben anunciar autorización o guardado exitosos.
- La confirmación de la edición comprueba la versión revisada contra la almacenada para evitar sobrescribir cambios de otra ventana de este navegador.
- Las solicitudes antiguas conservan su texto de programa: se muestra como antecedente y, al autorizar, se mantiene como descripción de «Programa del día» si no tienen actividades estructuradas. Las nuevas capturas usan la lista estructurada.

## Comprobación

```sh
npm ci
npm run lint
npm test
npm run build
npm run dev
```

Se verificaron TypeScript, compilación y 19 pruebas automatizadas (incluidas las 11 existentes). Las pruebas nuevas cubren conversión sin pérdida ni mutaciones, separación por día, horarios y superposiciones, formatos/tamaño del cartel y restauración del almacenamiento ante fallos.

También se recorrió la interfaz en una instancia local aislada: borrador con cartel y dos actividades del primer día, recuperación tras recarga, segundo día con otra actividad, envío, autorización, confirmación de ambas distribuciones, publicación, consulta pública y edición posterior con motivo e historial.

## Límites del prototipo

Los datos y archivos siguen en el almacenamiento de cada navegador. Esto no agrega base de datos, subida de archivos a un servidor, correo real ni transacciones entre dispositivos. Si se agota la cuota se informa el error y no se confirma la operación. Cerrar TICKTRADE-56 a nivel de pantallas no equivale a completar todos los requisitos de persistencia de producción del Sprint 3.

No se incluye el avance completo local de Identidad y perfiles ni la corrección programada del monitor de ocupación de Check-in.
