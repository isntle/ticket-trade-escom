# Activar correo de Ticket Trade sin contratar un servicio

Revisión de opciones: 13 de noviembre de 2026. La cuenta del proyecto fue creada por Luis. Se envió un único correo de prueba autorizado al propio buzón del proyecto. La implementación sigue local y el envío está desactivado hasta configurar el entorno.

## Opción propuesta para las revisiones académicas

Usar una cuenta Gmail dedicada al proyecto, no el buzón personal de un integrante. El SMTP de Gmail permite probar a pequeña escala sin comprar dominio ni contratar una API de correo. Requiere que la cuenta permita contraseñas de aplicación y tenga verificación en dos pasos. Google recomienda OAuth cuando la aplicación lo soporta; esta conexión SMTP utiliza contraseña de aplicación, nunca la contraseña principal. En cuentas institucionales, Protección Avanzada u otras configuraciones puede no estar disponible. No desactivar protecciones para habilitarla.

Fuentes oficiales: [contraseñas de aplicación](https://support.google.com/accounts/answer/185833?hl=es), [límites de Gmail](https://support.google.com/mail/answer/22839?hl=en).

No es correo ilimitado ni una garantía de entrega en bandeja principal. Gmail aplica límites y bloqueos por abuso; la referencia personal documenta límites alrededor de 500 mensajes/día. Ticket Trade deja un tope conservador propio de 80 intentos/día y conserva pendientes cuando lo alcanza. El conteo de la app es conservador y puede contar intentos de un trabajo de días previos cuando vuelve a actualizarse; no sustituye la cuota total de la cuenta ni cuenta envíos hechos desde otras aplicaciones. No habilitar facturación ni contratar ampliaciones para una demo.

Brevo tiene plan gratuito con 300 envíos/día, pero su documentación recomienda dominio autenticado y puede sustituir remitentes de dominios gratuitos. Si ya cuentan con dominio, puede ser alternativa; no propongo comprar uno solo para esta funcionalidad. [Plan](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [remitentes](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).

## Qué debes hacer tú

1. Usar la cuenta del proyecto tickettradescom@gmail.com, creada por Luis. Iniciar sesión en esa cuenta antes de modificar su configuración de seguridad.
2. Activar la verificación en dos pasos en esa cuenta.
3. Si está disponible, crear una contraseña de aplicación llamada Ticket Trade. Hacerlo personalmente desde la cuenta de Google. No compartirla en Jira, chat, commits ni capturas.
4. En el `.env` privado del backend configurar estos valores, sustituyendo los ejemplos:

```dotenv
APP_ORIGIN=https://URL-ACCESIBLE-DE-TU-APLICACION
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=tickettradescom@gmail.com
SMTP_PASSWORD=CONTRASENA-DE-APLICACION
SMTP_FROM="Ticket Trade <tickettradescom@gmail.com>"
TT_CORREO_ACTIVO=0
TT_MOSTRAR_CODIGOS=0
TT_CORREO_LIMITE_DIARIO=80
TT_CORREO_CLAVE=CLAVE-ALEATORIA-DE-32-BYTES-EN-BASE64
```

En el entorno local ya se prepararon el remitente, el puerto y una clave de cifrado privada; SMTP_PASSWORD quedó configurada privadamente y la autenticación con Gmail fue comprobada; TT_CORREO_ACTIVO permanece en 0. No sobrescribir la clave de cifrado existente al añadir la contraseña de aplicación. La clave de cifrado se genera una vez con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` y se guarda privadamente. No es la contraseña de Google. Respaldarla sin subirla al repo.

5. Preparar también DATABASE_URL real, distinta de demo, y aplicar migraciones con `npm run db:init`. No reconstruir ni sembrar datos demo en la base normal.
6. Ejecutar `npm run correos:verificar -- --sin-conexion`; comprueba variables sin conectar. Después `npm run correos:verificar`; comprueba SMTP/autenticación sin mandar un mensaje. El remitente y la recepción requieren prueba separada.
7. Activar `TT_CORREO_ACTIVO=1` y reiniciar el servidor persistente. Este procesa la cola cada 15 segundos; existe `npm run correos:procesar` para ejecución acotada. En Vercel serverless se necesita scheduler/worker: publicar el frontend no inicia este proceso. No se ha configurado ese despliegue.
8. Probar con dos buzones distintos y autorizados: registrar cuenta, confirmar enlace, recuperar contraseña y reservar una actividad. Abrir PDF y comprobar QR. Verificar rechazo/reenvío y carpeta spam. La aceptación SMTP no garantiza recepción.

Para pruebas en la misma computadora APP_ORIGIN puede ser localhost; un enlace a localhost enviado a otro dispositivo abre el propio dispositivo, no nuestro servidor. El backend y frontend accesibles deben pertenecer al mismo entorno. No apuntar correo local a una app Vercel que consulte otra base de datos.

## Mensajes conectados

| Momento | Destinatario | Contenido |
|---|---|---|
| Registro/reenvío | Correo capturado de la cuenta | Saludo, enlace personal de confirmación, vigencia y diferencia frente a revisión documental |
| Recuperación | Correo de la cuenta elegible | Enlace de un uso y 30 minutos, instrucción de seguridad |
| Contraseña restablecida | Titular con correo confirmado | Aviso de cambio y cierre de sesiones anteriores, sin contraseña en el mensaje |
| Reserva confirmada/reenvío | Titular del pase | Nombre, evento, actividades del pase, recinto/lugar, QR embebido y PDF adjunto |
| Cancelación voluntaria de reserva | Titular | Actividad cancelada y aclaración de que las demás conservan su estado |
| Expediente enviado | Solicitante | Recepción sin promesa de aprobación, enlace al expediente privado |
| Expediente aprobado/rechazado | Solicitante | Resolución y motivo, sin documentos personales adjuntos |
| Solicitud inicial enviada o reenviada | Organizador | Recepción sin promesa de reserva/autorización |
| Solicitud cancelada por el titular | Organizador | Confirmación de cancelación y enlace a su solicitud |
| Solicitud aprobada/devuelta/rechazada | Organizador | Evento, decisión y observación, enlace a su solicitud |

Los avisos de negocio se envían solo a cuentas con correo confirmado; confirmación de correo tiene su flujo independiente. Cada correo usa destinatario obtenido por el backend, no una dirección fija de pruebas. El modo demo no envía mensajes. No se añaden campañas publicitarias ni un correo por cada check-in.

## Preparado para conectar cuando exista el comando correspondiente

`avisarParticipantes` permite encolar avisos de cambio/cancelación del evento por revisión y destinatario. La tarea 150 debe llamarlo dentro de la transacción autorizada y conservar la audiencia afectada **antes** de invalidar reservas si el aviso corresponde a una cancelación total. No llamarlo después de borrar la relación que determina destinatarios. El helper no significa que esos comandos ya estén terminados.

Solicitar corrección/revocar identidad, vencimiento semestral, invitaciones de Staff y ofertas de espera requieren enganchar el aviso a sus transiciones persistidas cuando se completen. No enviar una oferta si todavía no existe cupo/oferta válida en servidor ni prometer un plazo que no se esté ejecutando. No se implementó un planificador de recordatorios por fecha en esta tarea.

## Diseño y vistas previas

Plantillas en backend/modulos/correos/plantillas.ts: cabecera guinda Ticket Trade, saludo personalizado, botón de acción, enlace alternativo, actividades legibles, QR y texto plano alternativo. HTML basado en tablas y estilos inline, sin JavaScript, fuentes externas ni píxeles de seguimiento. Se escapan datos de usuario. Esto mejora compatibilidad; aún hay que probar Gmail/Outlook reales, que pueden variar estilos o bloquear imágenes.

Ejecutar `npm run correos:preview` genera HTML y PDF ficticios fuera del repo. La vista previa reemplaza el CID del QR por una imagen local embebida solo para visualizarlo; el correo real usa adjunto CID. Nunca presentar esos ejemplos como recepción real.

## Qué todavía no está comprobado

Se comprobó autenticación SMTP y recepción en la bandeja de entrada de tickettradescom@gmail.com. Se abrió el correo HTML con QR y el PDF adjunto en Gmail: una página con dos actividades de ejemplo, horarios, recintos y lugares. Es una prueba al propio remitente, sin boleto válido ni registros nuevos de negocio; no verifica recepción en otros proveedores. DATABASE_URL ya apunta a la instancia exclusiva local y el procesamiento automático está activo. Se comprobó registro, confirmación, recuperación y aviso de cambio con recepción real en Gmail. Consultar CORREO_ESTADO_LOCAL.md para el alcance verificado y los pendientes remotos. No se migró a Supabase Auth ni se publicó el worker remoto. No hubo commit/push. Revisar TICKTRADE-149.md para transacciones, cifrado, reintentos y estados ambiguos: SMTP no garantiza envío exactamente una vez.
