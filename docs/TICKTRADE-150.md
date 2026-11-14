# TICKTRADE-150 — Ciclo del evento conectado a PostgreSQL

Implementación revisada el 14 de noviembre de 2026 y publicada junto con la 149. No se cambió Jira durante este trabajo.

## Comportamiento

- La pantalla de configuración espera al servidor al guardar. Mantiene el formulario si hay error y bloquea confirmaciones repetidas mientras procesa.
- Propietario o Subdirección pueden editar título, descripción, cartel y actividades, reprogramar, revisar/confirmar traslado y cancelar. La sesión y la huella de los datos se comprueban dentro de la transacción; no se confía en los permisos ni el historial enviados por el navegador.
- El alta de una actividad adicional en un evento ya aprobado requiere Subdirección. El formulario está disponible en su perfil, con motivo, fecha, horario, recinto, acceso y aforo. No se amplía silenciosamente lo autorizado al organizador.
- Fecha futura y horario de 07:00 a 21:00; capacidad del recinto y restricciones de laboratorio; agenda con separación de 30 minutos; bloqueos vigentes y cruces de reservas se comprueban en servidor/base. Los horarios de clases siguen siendo informativos.
- Actividades iniciadas o con entradas ordinarias/especiales registradas no se reprograman ni cancelan. Las actividades canceladas conservan su historial.
- El traslado requiere revisión de correspondencias y aceptación explícita si baja el aforo. Se conserva cada compromiso activo, su categoría y las plazas especiales. Los lugares anteriores se reasocian a los del nuevo recinto, sin cambiar el QR. Si no caben los compromisos o faltan lugares físicos habilitados se rechaza todo.
- El retiro físico solo admite una actividad sin compromisos ni historial, conservando al menos otra actividad. No se usa para borrar reservas históricas.
- Cancelar una actividad libera sus compromisos y apartados, invalida sus accesos y conserva las demás reservas del pase. Si se cancela la última actividad vigente, el evento queda Cancelado. La operación completa se revierte si falla una validación.
- Se consulta la audiencia antes de invalidar las reservas. Los avisos de cambio/cancelación se guardan en la cola cifrada dentro de la misma transacción; SMTP se ejecuta después del commit. La cancelación parcial solo considera participantes de la actividad afectada. No se adjuntan documentos personales.
- Cartel e itinerarios siguen enlazados a archivos persistidos. Un itinerario se mueve con la última actividad de su día cuando el destino no tiene otro; si existe conflicto se exige resolverlo, sin sobrescribir un archivo. Se valida propiedad, formato y correspondencia de fechas. Los ponentes se documentan en el archivo de itinerario del modelo vigente; no se ofrece un campo remoto que luego no pueda guardarse.
- Publicar exige autorización y datos/distribución suficientes. La lectura no declara distribución final por tener únicamente alguna fila de lugares: considera publicación, lugares habilitados y aforo.

## Concurrencia e historial

La huella `versionServidor` incluye evento, actividades, itinerarios, lugares, asignaciones y compromisos. Se obtiene en la misma sentencia que lee el evento, para no mezclar información anterior con una huella posterior. La operación vuelve a calcularla bajo la exclusión transaccional existente. Un cambio ajeno exige consultar/revisar de nuevo.

Los motivos y detalles de las operaciones se guardan con tipo `evento_operacion` en Notificacion, una tabla ya existente, para lectura del propietario/Subdirección. No se añadió una tabla de versiones ni se guardan conteos calculables como campos académicos. La numeración visual del historial se deriva de sus operaciones.

Los apartados vencidos se limpian conjuntamente antes de ejecutar el comando. Un rechazo posterior no revierte esa limpieza ni deja al usuario atrapado por una huella que nunca puede actualizarse.

## Rutas de servidor

Todas dependen de sesión, origen permitido y permisos vigentes:

| Método y ruta bajo /api/organizacion | Uso |
| --- | --- |
| PATCH /eventos/:id | Información y reprogramación conjunta |
| POST /eventos/:id/actividades | Alta autorizada por Subdirección |
| POST /eventos/:id/recinto/revision | Revisar capacidad y correspondencias |
| POST /eventos/:id/recinto | Confirmar traslado y reducción aceptada |
| POST /eventos/:id/cancelacion | Cancelar actividad/evento o retirar sin compromisos |
| POST /eventos/:id/publicacion | Publicar tras validaciones |

Las escrituras reciben `version` y los cambios aplicables. No aceptan un idUsuario del cuerpo como autoridad, no hacen reintentos automáticos y no sustituyen un error de API por guardado local.

## Comprobaciones

Seis pruebas de integración PostgreSQL aprobadas en una base desechable. La prueba de esta tarea cubre edición, huella desactualizada, reprogramación, traslado con asiento reservado y plaza VIP, reducción no aceptada, alta autorizada/rechazada, retiro sin compromisos, rechazo de cancelación con entrada, rechazo de un actor ajeno, reactivación expresa después de revisar agenda, publicación con permisos, cancelación parcial, cierre de la última actividad y QR conservado. También verifica conservación/reasociación de itinerario y las restricciones del modelo.

En navegador se editó el título del evento de aceptación, se reprogramó una actividad con reserva, se canceló solo esa actividad y se recargó la página: persistieron título, horario, historial y estado. El entorno de aceptación es independiente de las bases normal/demo. No se alteraron datos de producción.

Los avisos de esas operaciones al buzón de ensayo usan el remitente real configurado. Las capturas están fuera del repositorio en Downloads/TicketTrade_Correos_Vista_Previa. Los enlaces localhost requieren esta Mac; no prueban un despliegue remoto ni funcionamiento entre teléfonos.

## Límites del alcance

No se implementó en esta tarea un backend nuevo de lista de espera/ofertas, ni se cambió el modelo académico para inventarlo. La protección de cupos considera los compromisos que efectivamente están persistidos. Tampoco se terminó el despliegue: falta configurar API/base/archivos/worker accesibles por HTTPS antes de usar los enlaces en otros dispositivos.
