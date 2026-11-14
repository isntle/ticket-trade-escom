# Correo y PostgreSQL local — 14 de noviembre de 2026

La comprobación posterior con Supabase y sus límites se documentan en SUPABASE_CONEXION.md. Este archivo conserva el entorno PostgreSQL local independiente para desarrollo.

## Abrir la aplicación

La aplicación normal está en http://localhost:3000 y la demostración en http://localhost:3000/eventos?demo=1. Frontend Vite y API Express se inician juntos con `npm start`. Para reanudar después de apagar la Mac, ejecutar `.revision-local/iniciar-local.command`: inicia primero la instancia exclusiva de PostgreSQL si está detenida y después la aplicación. No ejecutar dos copias en los mismos puertos.

## Qué se configuró

- PostgreSQL 18 exclusivo, en 127.0.0.1:55440. Datos en `~/.local/share/tickettrade/postgresql-18/datos`, autenticación SCRAM y acceso únicamente local. No se modificó la instalación preexistente de 5432.
- Base normal `tickettrade_local`, inicialmente limpia; y `tickettrade_demo`, con las semillas existentes del proyecto. Los correos nunca se envían desde demo.
- Conexiones y contraseña de Gmail en `.env` ignorado por Git. La clave de cifrado se conserva. No publicar tampoco `conexion.json` del directorio privado de PostgreSQL ni `.revision-local/cuenta-local.json`.
- Remitente Ticket Trade <tickettradescom@gmail.com>, TLS, cola cifrada en PostgreSQL y procesamiento cada 15 segundos mientras el servidor persistente corre. Envío activo en el entorno normal, códigos de práctica desactivados.
- URL de los correos: http://localhost:3000. Estos enlaces sirven en esta Mac; para otros dispositivos se necesita un despliegue accesible que consulte la misma base. Publicar solo frontend no despliega este backend/worker.

## Comprobaciones realizadas

- Autenticación SMTP y correo de ejemplo con QR y PDF recibidos y abiertos en Gmail.
- Registro real de la cuenta de ensayo del proyecto, correo de confirmación, consumo del token, login, recuperación, cambio de contraseña y nuevo login en la base normal. Confirmación, recuperación y aviso de cambio recibidos en el buzón. No se concedieron permisos documentales ni administrativos a esa cuenta. Credenciales de ensayo privadas en `.revision-local/cuenta-local.json`.
- Cinco pruebas de integración PostgreSQL aprobadas en una base desechable, incluyendo reservas, PDF privado, destinatarios, atomicidad de la cola y transporte SMTP local. Esto no equivale a una reserva de producción recibida por otro proveedor de correo.
- API saludable y modelo de la base normal verificado: 73 tablas y 96 relaciones.

## Alcance restante

La tarea de correo no termina el resto del backend. Los avisos de modificaciones/cancelaciones de eventos deben integrarse con los comandos persistidos de la tarea 150; las ofertas de espera, revocaciones, Staff y vencimientos solo deben emitir avisos cuando existan sus respectivas transiciones persistidas. No afirmar que estos flujos están conectados porque existe una plantilla.

Antes del uso remoto: desplegar API, PostgreSQL, archivos privados y worker; configurar URL pública coherente y secretos en servidor; verificar recepción en un segundo proveedor autorizado. Gmail limita volumen y puede filtrar correos. Un estado SMTP aceptado no demuestra por sí solo recepción.

Si una entrega queda incierta o en enviando tras una interrupción, comprobar el buzón antes de reintentar. No borrar la cola ni cambiar su clave de cifrado. El PDF representa los datos al momento de generarlo; el acceso se vuelve a validar en servidor.
