# Enlaces de eventos privados

Un evento privado publicado muestra la opción de copiar y renovar el enlace al organizador y a Subdirección desde su configuración. La renovación invalida el enlace anterior, incluso para confirmar apartados vigentes; no cancela reservaciones ya confirmadas. El enlace permite consultar el evento a quien lo posea. Apartar y confirmar requieren una sesión activa y correo confirmado.

Los eventos creados en el prototipo local permanecen en el navegador y no pueden compartirse con invitados de otros navegadores. La opción de compartir se ofrece únicamente en modo conectado.

En modo conectado, los enlaces nuevos llevan la clave en el fragmento (`#key=…`), que el navegador no envía en la solicitud HTTP inicial. La aplicación la guarda en `sessionStorage` por evento durante la pestaña y la retira de la dirección. Un enlace antiguo con `?key=` se acepta por compatibilidad, pero el servidor o intermediarios podrían haber registrado esa URL antes de que la aplicación la retire; conviene renovarlo y compartir el enlace nuevo. No registrar cuerpos o cabeceras de solicitudes que incluyan tokens. El acceso es una credencial compartible: no incluirlo en listados, mensajes de error ni exportaciones.

El frontend consulta `POST /api/estado/evento-privado` con el identificador y token; la respuesta contiene únicamente el evento autorizado, sus arreglos y ocupación, sin devolver el token. La cartelera no lista privados. Apartado y confirmación vuelven a validar el enlace; se comprueba el titular desde la sesión y el estado/cupo en el servidor. La consulta de lugares acepta el token mediante `X-TicketTrade-Enlace`, sin ponerlo en la ruta. Un titular con una reservación confirmada puede consultar los datos necesarios para sus boletos sin que se exponga el token en el estado general.

Los documentos privados de identidad conservan sus permisos independientes. Las imágenes o itinerarios protegidos por `/api/archivos` no reciben autorización adicional por poseer el enlace; no se usa el enlace para abrir documentos personales. Si se requiere mostrar un cartel privado alojado en ese endpoint, debe diseñarse un acceso limitado específicamente a los archivos del evento.

## Pruebas

`npm test` incluye comprobaciones del token y su almacenamiento por pestaña. `npm run test:postgres` crea una base desechable y ejecuta la prueba de dos sesiones en `tests/api-disponibilidad-postgres.test.ts`: enlace válido e inválido, otro ID, consulta de lugares, renovación, apartado, confirmación, duplicado, boleto y reinicio del servidor HTTP. Ejecutar solo con un servidor PostgreSQL de pruebas con permiso para crear y eliminar bases; no apuntarlo a la base compartida de presentación.
