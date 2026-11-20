# Sprint 9: guardar calendario hábil y bloqueos de recintos

La configuración y los comandos de bloqueo se guardan en PostgreSQL mediante la API. El frontend espera la confirmación de la transacción; conserva el formulario ante error y evita el doble envío. La rama parte de `origin/main` en `d8241ef`, que ya integra la disponibilidad del sprint 8.

## Permisos y reglas vigentes

| Operación | Rol requerido en el servidor |
|---|---|
| Guardar días laborables e inhábiles | Administración |
| Registrar, modificar o cerrar un bloqueo institucional | Subdirección |
| Registrar, modificar o cerrar mantenimiento y fuera de servicio | Administración |
| Consultar disponibilidad | Sesión autenticada y alcance del contrato del sprint 8 |

Se verifica la sesión vigente y el origen de cada escritura. La cancelación y la edición validan también el tipo del bloqueo existente; cambiar el tipo enviado no concede permisos sobre otro bloqueo. Una versión anterior devuelve conflicto. Se conserva el patrón de transacciones y exclusión de la disponibilidad: `pg_advisory_xact_lock(744220261107)`.

Mantenimiento no desplaza actividades autorizadas. Los bloqueos institucionales y fuera de servicio pueden suspender actividades futuras, conservando reservaciones y boletos, pero rechazan actividades iniciadas o con entradas. Se liberan los apartados temporales afectados. Cambiar o cerrar un bloqueo no reactiva una actividad suspendida: esa resolución sigue siendo competencia del Organizador/Subdirección y del flujo de reprogramación existente.

Las clases de laboratorio continúan visibles como información: se incluyen en las advertencias de revisión y no impiden automáticamente guardar un bloqueo autorizado. No se borran sus horarios.

## Fin previsto y cierre efectivo

Se conserva el significado actual del modelo y de la agenda del sprint 8: `fin_previsto` es una estimación, mientras que `finalizado_en` es el fin efectivo. El formulario lo indica y ofrece **Cancelar o finalizar bloqueo**. Un bloqueo sin cierre efectivo sigue ocupando la agenda después de la fecha prevista.

Si se cancela antes del inicio, el intervalo efectivo es vacío (`finalizado_en = inicio`). Las consultas de disponibilidad y de cambio de recinto excluyen explícitamente ese intervalo. No se cambia la lógica de reprogramación; se corrige únicamente la interpretación del bloqueo vacío en sus consultas.

## Contrato de API

Todas estas rutas se montan bajo `/api/organizacion`, después de la comprobación de sesión y de origen seguro.

| Método y ruta | Entrada | Respuesta confirmada |
|---|---|---|
| `GET /calendario` | Sesión | Calendario, responsable, fecha real de actualización y versión |
| `PUT /calendario` | `diasLaborables`, `diasInhabiles`, `version` | `{exito:true, calendario}` |
| `POST /bloqueos/revision` | `propuesta`, `id` opcional | `afectados`, `advertencias`, `firma` |
| `POST /bloqueos` | `propuesta`, `firma` | HTTP 201 con `exito`, `id`, `ids`, `version` |
| `PATCH /bloqueos/:id` | `propuesta`, `firma`, `version` | `exito`, `id`, `version` |
| `POST /bloqueos/:id/cancelacion` | `motivo`, `version` | `exito`, `version` |

Una propuesta contiene título, motivo, tipo (`Institucional`, `Mantenimiento` o `Fuera de servicio`), recintos, fecha/hora de inicio y fin previsto opcional. La creación permite varios recintos y los guarda conjuntamente, con un bloqueo por recinto. La edición modifica un solo bloqueo/recinto. La firma se vuelve a calcular con los datos actuales al confirmar: una revisión anterior no autoriza el guardado si cambian las afectaciones.

Los identificadores PostgreSQL viajan como texto. El responsable se obtiene de la sesión, no de la captura. La lectura `/api/estado` muestra calendario y bloqueos guardados; expone detalle e historial de bloqueos solo a los roles de gestión. Los demás usuarios reciben una descripción genérica de la ocupación.

## Conservación de plazos

Antes de cambiar días inhábiles o laborables se guardan los límites de todos los ciclos de revisión anteriores que aún no tienen una copia persistida. El ciclo se identifica por solicitud y `inicio_revision`, conservando los microsegundos de PostgreSQL. Las nuevas solicitudes guardan su límite al enviarse, dentro de la misma transacción que registra el envío. Un cambio de calendario posterior no reemplaza ese límite.

La lectura de solicitudes incluye `fechaVencimientoRevision` y `fechaLimiteCorreccion`. El límite de revisión es exclusivo, al comenzar el día siguiente al segundo día hábil posterior al envío, en Ciudad de México. La devolución conserva su plazo de 24 horas naturales; el calendario no lo modifica. Un nuevo ciclo de corrección sigue la regla de reenvío del servidor existente.

El modelo SQL original no contiene columnas para la semana configurable, versiones de configuración ni copias históricas de plazos. Se sigue el patrón de extensiones `infra` que ya usa el backend:

- `infra.calendario_revision`: semana laborable, versión y responsable real.
- `infra.plazo_revision`: límite persistido de cada solicitud/ciclo.
- `infra.bloqueo_detalle`: título, versión y movimientos reales de cada bloqueo.

Se crean de manera idempotente desde TypeScript. Se reutilizan `DiaInhabil`, `BloqueoRecinto` y `AfectacionActividad` del modelo de negocio. No se editaron archivos `.sql` ni se modificó la base compartida. La vista SQL heredada `v_plazos_solicitud` calcula sobre el calendario actual; el contrato de la aplicación usa las copias persistidas para conservar los plazos anteriores. Otros consumidores de plazos históricos deben usar esta misma fuente.

## Interfaz y respuesta a errores

El calendario muestra la configuración leída del servidor y el responsable de la última actualización. Conserva la captura cuando otra sesión modifica la versión y permite restablecerla con la última lectura. El panel de Administración tiene acceso visible a bloqueos y mantenimiento; Subdirección conserva su pestaña de bloqueos.

Los botones esperan revisión, guardado o cierre y permanecen deshabilitados durante la petición. Un error de red, permiso, validación, conflicto o confirmación de transacción mantiene el formulario y se presenta como error. Un HTTP exitoso sin `exito:true` tampoco se presenta como guardado. Si el servidor confirmó la escritura pero falla la recarga posterior, se informa esa situación por separado para evitar repetir una escritura ya confirmada. Se invalida la caché de agenda después de cada guardado confirmado.

## Verificación reproducible

```powershell
npm ci
npm run lint
npm test
npm run build
npm run verify:api
```

Para integración real, usar una instancia PostgreSQL **de pruebas**, con permiso para crear bases:

```powershell
$env:DATABASE_URL = 'postgresql://USUARIO:CONTRASENA@127.0.0.1:5432/postgres'
npm run test:postgres
```

El runner crea una base exclusiva `tt_pruebas_<hex>`, instala el esquema y semillas, ejecuta las pruebas y elimina esa base. La prueba nueva verifica el nombre y `TT_BD_DESECHABLE` antes de preparar datos. Incluye conservación de plazos, lectura persistida, roles, fechas inválidas, cambios de versión, cierre antes del inicio, reservas preservadas, clases informativas, peticiones concurrentes y rollback al fallar el commit. La prueba de fallo fuerza un error únicamente en esa base desechable; no altera los archivos SQL ni la conexión del equipo.

Se reparó también el lockfile: `npm ci` rechazaba la versión recibida por entradas opcionales ausentes de `@emnapi`. Se regeneró el lockfile con npm, sin cambiar las dependencias declaradas de la aplicación.

La integración y despliegue los revisa el equipo. Este trabajo se mantiene en `sprint9/calendario-bloqueos-recintos`, separado de `main`.

## Resultados del 20 de noviembre de 2026

| Comprobación | Resultado |
|---|---|
| `npm ci` tras reparar el lockfile | Correcto |
| `npm run lint` | Correcto |
| `npm test` | 226 aprobadas, 0 fallidas; 8 pruebas de PostgreSQL omitidas en este comando |
| Runner real de PostgreSQL | 26 aprobadas, 0 fallidas, 0 omitidas; incluye las pruebas previas y los subcasos nuevos |
| `npm run build` en modo API | Correcto; se conserva el aviso previo por tamaño del paquete |
| `npm run verify:api` | API ESM compilada y cargada correctamente |
| `git diff --check` | Correcto |
| Esquema de negocio | 73 tablas y 96 relaciones verificadas; ningún archivo SQL modificado |

Resultados relevantes del registro real:

```json
{"plazoAnteriorConservado":true,"nuevasSolicitudesUsanCalendarioGuardado":true}
{"calendarioConcurrente":[200,409]}
{"bloqueosCompetidores":[201,409],"guardados":1}
{"falloCommit":500,"escriturasParciales":0}
```

El error de commit de la última línea se fuerza deliberadamente en la base desechable para comprobar rollback y ausencia de éxito falso. No representa un fallo de la suite. El orden de los intentos ganadores puede cambiar entre ejecuciones.

Registros completos: [PostgreSQL](evidencias/sprint9/resultado-postgresql.txt) y [suite ordinaria](evidencias/sprint9/resultado-unitarias.txt).

También se revisó el frontend compilado en modo API con una segunda base temporal aislada y datos sintéticos. Desde la interfaz se inició sesión con Administración, se envió una fecha inexistente y se conservó la captura con el error del servidor, se guardó un calendario válido y se comprobó que persistiera al recargar. Se registró un mantenimiento, se volvió a cargar para verificar su permanencia y se confirmó su cierre con motivo e historial. Las cuentas, fechas de 2099 y recintos de las pruebas son datos sintéticos.

Al terminar se eliminó la base de revisión y se detuvo PostgreSQL temporal. Los servicios locales de prueba no quedaron activos.

Capturas reales de navegador:

- [Validación de fecha y captura conservada](evidencias/sprint9/calendario-error.jpg).
- [Calendario persistido después de recargar](evidencias/sprint9/calendario-persistido.jpg).
- [Bloqueo persistido después de recargar](evidencias/sprint9/bloqueo-persistido.jpg).
