# Sprint 9 — Aclarar disponibilidad y alternativas al dictaminar

La captura identifica actividad, recinto, fecha y horario, conserva el calendario y permite elegir un intervalo mediante dos bloques de 30 minutos. El encabezado refleja inmediatamente el intervalo seleccionado. Elegir o consultar no reserva espacios.

En el detalle se muestra «Disponibilidad actual»: carga, error recuperable, hora de consulta y resultado por actividad. Los conflictos muestran sus franjas y las clases continúan como advertencias informativas. «Actualizar disponibilidad» consulta otra vez el servidor. Después de una autorización rechazada también se actualiza la revisión y se ofrece volver a sus alternativas.

## Contrato reutilizable para revisión

`GET /api/organizacion/solicitudes/:id/disponibilidad`

- Sesión obligatoria; solo titular, Subdirección o Administración pueden consultar el expediente. Un tercero recibe 404. El cliente no envía aforo, fechas ni actividades sustitutas.
- El servidor lee las actividades no canceladas de la solicitud, su versión y su aforo desde PostgreSQL. Excluye su propio evento, incluye las demás actividades de la propuesta y consulta la agenda autorizada por fecha.
- La lectura usa el mismo bloqueo transaccional de dictamen y bloqueos. Respuesta `Cache-Control: no-store`, envuelta en `{ datos: ... }` como los otros endpoints.
- Devuelve `idSolicitud`, `versionSolicitud`, `consultadoEn`, `margenSeparacionMinutos` y `actividades`. Cada actividad contiene `id`, `idRecinto`, `nombreActividad`, `nombreRecinto`, `fecha`, `horaInicio`, `horaFin`, `disponible`, `conflictos`, `advertencias` y `alternativas`.
- Cada alternativa identifica recinto, fecha, inicio, término y advertencias. Se ofrecen hasta cuatro opciones independientes, de la misma fecha y duración, entre 07:00 y 21:00, con capacidad suficiente. Se consideran bloqueos efectivos, eventos autorizados, otras actividades de la solicitud y separación vigente. Entrada libre no recibe laboratorios como destino. Se priorizan opciones del mismo recinto y horarios próximos.
- Las clases no restan disponibilidad y permanecen visibles en las alternativas. El fin previsto de un bloqueo no equivale a cierre efectivo.
- `conflictos[].posteriorAlEnvio` se incluye como `true` cuando la auditoría del bloqueo registra creación o modificación posterior al último envío (`inicio_revision`). Para bloqueos antiguos sin auditoría se muestra el conflicto, sin inventar cuándo fue creado.
- Puerto frontend: `crearServicioDisponibilidad().revisarSolicitud(id, signal)`. El contrato general de agenda/revisión del sprint 8 se conserva para Luis.

El resultado es una fotografía de la agenda. Autorizar sigue validando dentro de la transacción: un cambio posterior puede producir HTTP 409. La consulta no permite saltarse esa validación.

## Pedir corrección

Subdirección puede pedir corrección de todos los conflictos o incluir una alternativa. Se abre el modal existente con observaciones editables: actividad, recinto, fecha, horas, conflicto y opción sugerida. Solo confirmar «Enviar correcciones» ejecuta la resolución `Devuelta` existente, con la versión revisada. El modal muestra guardado/error y evita doble envío; el éxito requiere respuesta exitosa del servidor.

La devolución y las observaciones permanecen al recargar. El organizador conserva su recorrido de corrección y reenvío. Sugerir una opción no mueve la actividad: la corrección efectiva debe revisar distribución y equipamiento. No se amplió el flujo de reprogramación de Luis ni el de check-in de Diego. No se editaron archivos `.sql` ni la base compartida.

## Verificación y evidencias

- Tipos: `npm run lint`.
- Suite general: `npm test`, 233 aprobadas, 0 fallidas; 10 pruebas de integración PostgreSQL omitidas deliberadamente fuera del runner dedicado.
- Compilación en modo API y `npm run verify:api` correctas. Permanece el aviso previo del tamaño del bundle.
- Integración real: `npm run test:postgres`, 33 aprobadas, 0 fallidas y 0 omitidas, en PostgreSQL 17 temporal, bases desechables, sin correos externos. El runner conserva también las pruebas nuevas de distribución integradas desde main.
- Caso añadido: titular envía (201), otra sesión guarda bloqueo (201), revisión detecta conflicto posterior y opciones, autorización se rechaza (409), devolución se guarda (200), titular recupera observaciones y plazo. También se comprueban privacidad, capacidad, clases informativas y exclusión de laboratorios para entrada libre.
- Navegador: autorización con una lectura anterior libre rechazada; alternativas visibles; corrección enviada y recuperada tras recarga; selección 07:00–08:00 conservando fecha/recinto en el formulario. Datos exclusivamente sintéticos.

Capturas y registros en [evidencias/sprint9-dictamen](evidencias/sprint9-dictamen/). Los logs contienen los resultados originales, no una simulación de aceptación.

Para repetir en PowerShell con un PostgreSQL de pruebas que permita crear bases:

```powershell
$env:DATABASE_URL='postgresql://USUARIO:CLAVE@localhost:5432/postgres'
npm run test:postgres
```

## Coordinación y límites

Se trabaja en `sprint9/calendario-bloqueos-recintos`, conservando la primera tarea. Se incorporó main hasta `705cba7` (distribución por actividad) mediante un merge en esta rama; main no se modificó. En el runner se conservaron ambas listas de pruebas al resolver el conflicto de integración.

Luis debe revisar la nueva ruta GET y los contratos antes de integrar la rama. La respuesta de alternativas sirve de propuesta; el cambio efectivo de recinto/reprogramación conserva su flujo. Si no hay alternativas para la misma fecha y duración, la interfaz pide proponer otra fecha o ajustar requisitos; no presenta una búsqueda de fechas ilimitada ni garantiza equipamiento por el solo aforo.
