# Apartados de butacas y cupos entre sesiones

El mapa remoto consulta solo la disponibilidad de la actividad cada cuatro segundos mientras está visible. La respuesta distingue lugares apartados de lugares ocupados y contiene el cupo disponible. No incluye datos de asistentes ni ejecuta escrituras. Al vencer un apartado deja de contarse inmediatamente en esta lectura. Las operaciones que cambian el cupo siguen limpiando los vencidos y usando el bloqueo de PostgreSQL existente.

Repetir un apartado vigente recupera el mismo identificador si corresponde al mismo titular, actividad y lugar. Repetir una confirmación devuelve la reserva confirmada de ese titular sin generar otro pase ni correo. La vista evita clics simultáneos y conserva el apartado cuando se pierde la respuesta de confirmación.

## Verificación

- Dos sesiones en PostgreSQL desechable disputaron la misma butaca y el último cupo sin asiento. En ambos casos una recibió éxito y la otra conflicto.
- La lectura devolvió el lugar apartado, confirmado y posteriormente libre tras el vencimiento de un nuevo apartado. La confirmación repetida conservó el mismo pase, una reservación y una entrada de correo en cola. Se comprobó que otra cuenta no puede confirmar el apartado y que un enlace privado revocado no puede consultar la disponibilidad.
- En dos sesiones del navegador contra una base desechable, la primera cuenta apartó PC02. La segunda vio el lugar deshabilitado sin recargar. Tras simular el vencimiento, la segunda vio el lugar disponible, lo apartó y confirmó.
- No requiere migraciones. La API usa las tablas, estados y restricciones de PostgreSQL existentes. La comprobación en Vercel corresponde al despliegue posterior al push.
