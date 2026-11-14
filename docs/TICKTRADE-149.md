# TICKTRADE-149 — Correos reales y boleto

## Estado comprobado el 14 de noviembre de 2026

Implementación integrada sobre main ebe24bf, conservando la corrección de expedientes de Josué. Gmail del proyecto configurado privadamente como remitente. API, frontend y dos bases PostgreSQL locales separadas funcionando. El entorno normal procesa la cola cada 15 segundos; demostración no envía correos.

### Evidencia de aceptación

- Registro persistido en la base normal con códigos de práctica desactivados; confirmación de correo, login, recuperación, consumo del token, cambio de contraseña y nuevo login comprobados. Los tres mensajes llegaron a tickettradescom@gmail.com.
- En una tercera base de aceptación aislada, con la semilla existente, se inició sesión desde navegador, se eligió el taller de hardware de borde del Simposio, se apartó D-029 y se confirmó la reserva desde su pantalla. Mis boletos conservó el mismo pase y sus otras actividades.
- El correo automático de esa reserva llegó al buzón del proyecto con el PDF y QR. Se comprobó Descargar PDF y Consultar envío desde el modal.
- Se solicitó el reenvío autorizado mediante el endpoint del titular y se comprobó recepción en tatomerida21@gmail.com. Gmail lo clasificó como spam. Se marcó ese mensaje legítimo como no spam y se comprobó su traslado a Recibidos. Esto no garantiza la clasificación de futuros mensajes.
- Se renderizó el PDF descargado, se decodificó su QR con ZXing y se contrastó con BoletoEvento en PostgreSQL: coincide. El ensayo usa datos de semilla y no representa un acceso de producción.
- Pruebas de tokens vencidos/reutilizados, rollback, destinatario/propiedad, concurrencia, PDF multipágina, SMTP local y ambigüedad de entrega aprobadas en la suite. 175 pruebas generales aprobadas y seis de integración PostgreSQL aprobadas; TypeScript y build correctos.

Evidencias locales: Downloads/TicketTrade_Correos_Vista_Previa/boleto-reserva-postgresql.pdf, reserva-y-correo-postgresql.png y segundo-buzon-recibido.png. No subir capturas de contraseñas ni enlaces de autenticación.

## Implementación

Tokens internos cifrados en infra.correo_salida; hash de validación independiente en TokenCuenta. El token no se devuelve públicamente con TT_MOSTRAR_CODIGOS=0. La cola se guarda dentro de la transacción de negocio y SMTP ocurre después del commit.

La reserva encola una referencia al pase: el worker consulta titular, correo confirmado y actividades actuales; genera el mismo QR, PDF diseñado y PNG embebido. No crea otra reserva. Descargar/reenvío/consulta validan sesión y propiedad; reenvío explícito limitado a uno por minuto.

Estados: pendiente, enviando, aceptado, fallido, incierto, omitido. SKIP LOCKED protege ante workers simultáneos. Rechazos temporales explícitos tienen reintentos acotados; timeouts ambiguos no se reenvían automáticamente. Aceptado significa aceptación SMTP, no recepción. Si el proceso muere en enviando, revisar el proveedor antes de resolver manualmente el estado. No reiniciar ciegamente la cola.

## Configuración y reinicio

Ver CORREO_ESTADO_LOCAL.md y CORREOS_SIN_COSTO.md. Mantener privada la clave de cifrado; no regenerarla mientras haya trabajos pendientes. .env y .revision-local están ignorados por Git. APP_ORIGIN debe apuntar al frontend del mismo entorno que su API/base. La base normal y la demo nunca deben coincidir.

## Antes de publicarlo para otros dispositivos

Falta configurar el despliegue coordinado de backend, base, archivos y worker accesibles remotamente. Los enlaces locales funcionan únicamente en esta Mac. Vercel serverless no ejecuta el timer de backend/server.ts; requiere un worker/scheduler. Esta verificación no demuestra un despliegue en Supabase ni garantiza bandeja principal.

Los avisos de reprogramación/cancelación del evento se conectan en la 150, no se consideran terminados por existir plantilla. No confundir esta aceptación local con que todo el backend del proyecto esté finalizado. La fuente PDF estándar no cubre todos los alfabetos; mantener esa limitación o incorporar una fuente Unicode licenciada al ampliar cobertura.

No se cambió el estado de Jira durante estas comprobaciones. Para adjuntar un enlace de commit hace falta crear y publicar el cambio; todavía no existe ese enlace.

## Diseño y conexión

Correo y PDF renovados con encabezado de marca, pase perforado, QR y agenda legible por actividad. Se comprobó el PDF renderizado y la vista HTML. La conexión inicial real a Supabase se detalla en SUPABASE_CONEXION.md; no equivale al despliegue completo.
