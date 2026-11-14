# Sprint 8: disponibilidad del servidor - primera unidad

## Alcance implementado

Esta unidad agrega la lectura autorizada de agenda y la revisión de franjas en el servidor, junto con un puerto reutilizable por el formulario y por la reprogramación de Luis. La conexión de los componentes del calendario y DatosRemotos corresponde a la siguiente unidad.

No cambia tablas, archivos SQL, semillas ni datos de producción. La regla vigente de TT020 conserva 30 minutos entre actividades del mismo recinto.

## Endpoints

Ambos requieren la sesión autenticada existente y responden con datos bajo la propiedad datos. No se almacena una reserva al consultar.

- GET /api/organizacion/disponibilidad/agenda?fecha=2030-01-25&idRecinto=1
- POST /api/organizacion/disponibilidad/revision

La agenda puede omitir idRecinto para consultar todos. Devuelve fecha, zonaHoraria, consultadoEn, margenSeparacionMinutos y, por recinto, ocupaciones y franjasLibres.

Una ocupación informa fuente (evento, bloqueo o clase), tipo de agenda y si es informativa. La presencia de una clase no resta franjas libres. Las actividades privadas ajenas se muestran como Actividad autorizada, sin título ni descripción privados.

El cuerpo de revisión contiene actividades (de una a cien), con id, idRecinto, fecha, horaInicio y horaFin. El id local sirve para correlacionar resultados; repetirlo no permite ocultar un cruce entre dos renglones.

Puede incluir idSolicitud o idActividadExcluir. El servidor comprueba titularidad o rol de revisión antes de excluir. Una exclusión arbitraria de un evento ajeno no modifica la agenda.

Cada resultado conserva esos datos y añade disponible, conflictos y advertencias. Las clases coincidentes aparecen en advertencias, incluso cuando también existe un impedimento real.

## Puerto para el frontend y Luis

Importar crearServicioDisponibilidad desde src/servicios/contratoOrganizacion o src/servicios/disponibilidadRecintos. Sus métodos consultarAgenda y revisar son asíncronos, aceptan AbortSignal y propagan errores sin simular éxito ni reintentar escrituras.

Para reprogramar una sola actividad se utiliza idActividadExcluir. Las demás actividades de su mismo evento permanecen en la consulta. Para revisar una propuesta completa se utiliza idSolicitud y se envían todas las actividades propuestas.

En el backend se pueden reutilizar consultarAgendaRecintos y revisarDisponibilidadServidor pasando el PoolClient de la transacción actual. Estos helpers no crean otra transacción ni confirman escrituras. exigirPropuestaSinCruces(revision, true) rechaza conflictos al autorizar. La integración con el flujo de cambio de recinto sigue a cargo de Luis; su archivo eventos.ts no se modificó.

## Fuentes del esquema existente

- Actividad + Evento: actividades publicadas o con solicitud aprobada; se excluyen eventos y actividades cancelados.
- BloqueoRecinto: intervalo efectivo por recinto, recortado al día consultado.
- ActividadInterna + DiaActividadInterna: repetición semanal dentro de vigencia.
- DiaInhabil: omisión de horarios internos en fechas inhábiles.

El modelo no guarda materia, grupo o docente en ActividadInterna. La respuesta utiliza un rótulo informativo y no inventa esos datos.

Las franjas utilizan periodos semiabiertos [inicio, fin). La hora máxima para programar una actividad es 21:00, conforme al CHECK existente. La separación se aplica a eventos y otras actividades propuestas; no se añade margen a clases ni al límite efectivo de un bloqueo.

## Revalidación al enviar y autorizar

POST de solicitud y PATCH de reenvío vuelven a consultar la disponibilidad dentro de su transacción. Los cruces entre actividades de la misma propuesta se rechazan. Las coincidencias externas se devuelven como información y no impiden por sí mismas enviar una solicitud ordinaria a revisión, conforme a CU-OR-06.1 del PDF.

La aprobación vuelve a leer las actividades guardadas y la agenda vigente, con el bloqueo transaccional global que ya utiliza el proyecto. Un conflicto efectivo produce HTTP 409 antes de publicar el evento. Las solicitudes competidoras pendientes pueden coexistir; la segunda aprobación debe volver a comprobar la ocupación creada por la primera.

Esta unidad no crea una nueva ruta de autoaprobación ni declara que esa funcionalidad adicional esté conectada.

## Bloqueos: previsión y cierre efectivo

Se conservan los significados actuales del modelo y del código de reprogramación:

- inicio indica cuándo comienza el impedimento.
- finalizado_en indica el cierre efectivo.
- fin_previsto se devuelve como información; no acredita por sí solo una reactivación.

Un bloqueo temporal con cierre efectivo limita solo su franja. Un bloqueo futuro no afecta fechas anteriores. Los que atraviesan medianoche se recortan a cada fecha, sin convertir una ocupación parcial en un día completo.

Pendiente de decisión del equipo: si ciertos bloqueos deben vencer automáticamente por fin_previsto. El esquema advierte que Fuera de servicio requiere reactivación manual, y la implementación previa usa finalizado_en como fin efectivo. No se cambió esa regla silenciosamente ni se editaron archivos SQL.

La ocupación de actividades suspendidas conserva el criterio de TT020 vigente. Cualquier cambio a ese criterio debe coordinarse con Luis y el responsable del modelo.

## Validación y siguientes pasos

Las pruebas de disponibilidad cubren franjas parciales, cruces y margen exacto, clases informativas, fin excluido del bloqueo, medianoche y bloqueos futuros, privacidad, exclusiones autorizadas, fechas e IDs inválidos, cambios de agenda entre consultas y propagación de errores. El lector SQL se prueba con un cliente controlado en memoria.

La prueba HTTP comprueba que los dos endpoints exigen sesión sin necesitar PostgreSQL. Estas comprobaciones no sustituyen la prueba real de dos sesiones simultáneas contra PostgreSQL ni certifican el esquema desplegado.

Resultado de esta revisión: 191 pruebas aprobadas, cero fallidas y cinco de integración omitidas; tipado, compilación del frontend y compilación/carga de la API con Node correctos. Se prepararon además aserciones sobre las consultas nuevas en api-flujos-postgres.test.ts para ejecutarlas con PostgreSQL.

Comandos:

    npm run lint
    node --import tsx --test tests/disponibilidad-recintos.test.ts tests/api-disponibilidad.test.ts tests/contrato-organizacion.test.ts
    npm test
    npm run build
    npm run verify:api

Siguiente unidad: conectar DatosRemotos, DiaSolicitud, los calendarios y el visor; conservar la fecha y el estilo y presentar carga, error, clases y franjas. Después, completar la aceptación con dos clientes en una base de pruebas.

Archivos compartidos modificados en esta unidad: organizacion/rutas.ts y servicios/contratoOrganizacion.ts. El contrato y los helpers nuevos están separados para facilitar la coordinación.
