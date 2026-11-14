# Entrega de correos de Ticket Trade

## Qué se comprobó y corrigió

Se verificó recepción en tickettradescom@gmail.com y tatomerida21@gmail.com. El segundo buzón clasificó inicialmente el boleto como spam. Se marcó ese mensaje legítimo como no spam desde Gmail y se verificó su traslado a Recibidos. Gmail indicó que futuros mensajes del remitente irán a Recibidos para esa cuenta. Esta preferencia no se extiende a todas las personas.

El backend usa SMTP autenticado del propio remitente y TLS, destinatario obtenido del titular, HTML más texto plano, asuntos descriptivos y adjuntos PDF/PNG generados en servidor. El Message-ID estable usa el dominio del remitente configurado, no tickettrade.local, y Auto-Submitted indica que es un aviso automático. No se añaden cabeceras para simular autenticación ni se compran servicios.

## Antes de la demostración remota

- Configurar una URL HTTPS real que corresponda al mismo backend/base; los enlaces localhost actuales solo sirven en esta Mac.
- Hacer únicamente envíos transaccionales solicitados, sin listas compradas ni ráfagas de pruebas. Mantener el límite conservador y los reenvíos acotados.
- Revisar en Gmail Mostrar original los resultados de autenticación al validar un despliegue. No inventar registros SPF/DKIM en un dominio gmail.com que no administramos. Si se usa un dominio propio después, autenticarlo con su proveedor.
- Si un destinatario legítimo lo encuentra en spam, puede marcarlo como no spam o guardar el remitente en sus contactos. No desactivar los filtros de seguridad del buzón entero.

Ningún proveedor garantiza superar todos los filtros de spam. No existe una variable o cabecera que lo convierta en garantía universal. La aceptación SMTP y la entrega en Principal son resultados distintos.

Fuentes oficiales consultadas: https://support.google.com/mail/answer/81126 y https://support.google.com/mail/answer/1366858?hl=en
