# Sprint 8: disponibilidad del servidor y consulta en interfaz

## Alcance implementado

La primera unidad agregó la lectura autorizada de agenda y la revisión de franjas en el servidor. La segunda conecta DatosRemotos, la captura por actividad, el calendario, el visor y el expediente con ese contrato.

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

## Consulta en la interfaz (segunda unidad)

DatosRemotos deja de deducir ocupaciones de listaEventos. Publica agendaRemota, un almacén de lecturas por fecha y exclusión, separado por cuenta, roles y modo de datos. Los métodos síncronos anteriores conservan su firma para sus consumidores, pero leen únicamente la agenda consultada. Antes de cargar o tras un error, verificarDisponibilidadRecinto devuelve disponible=false y estadoConsulta; nunca anuncia que el espacio esté libre por carecer de eventos publicados.

Los componentes montados usan useDisponibilidadRecintos(fecha, idActividadExcluir?) o useCargarAgendasRecintos(consultas). Se deduplican peticiones, se actualizan cada 15 segundos y al recuperar el foco, y se puede forzar otra consulta. Las respuestas de una fecha no sustituyen otra y las lecturas de una sesión anterior se abortan y descartan. No se cargan todos los días del mes: los no consultados permanecen seleccionables y neutrales.

DiaSolicitud y AgendaHorarioRecinto conservan fecha y horas. Las franjas ocupadas y su margen se distinguen de las libres; una clase se muestra en ámbar y no impide seleccionar su horario. Los intervalos sugeridos terminan como máximo a las 21:00 y no extienden una elección hacia una franja ocupada. Los cruces con otras actividades de la misma captura impiden completar su programación. Las coincidencias externas se advierten y permiten remitir una solicitud ordinaria a revisión, de acuerdo con el documento.

CalendarioRecinto conserva la fecha seleccionada al navegar por meses; su detalle usa esa fecha y no el mismo número de día del mes visible. Ninguna ocupación parcial deshabilita el día completo. El visor conserva su presentación, muestra clases en una línea separada para que no oculten un evento coincidente, permite abrir detalles con teclado y anuncia carga, error y reintento. No muestra fechas de demostración como si fueran agenda real en modo API.

La confirmación del envío llama a revisar, sin utilizar la caché, y la ruta de escritura repite la comprobación en su transacción. La aprobación sigue siendo autoritativa en el servidor. El cliente no anuncia una autoaprobación en modo API cuando la ruta solo envía a revisión.

El expediente y la configuración del evento cargan sus consultas visibles. El consumidor de revisión de reprogramación consulta el puerto asíncrono antes de proponer un cambio. La integración transaccional de cambios de recinto y reprogramación sigue a cargo de Luis; no se modificó backend/modulos/organizacion/eventos.ts.

Dependencias detectadas: las altas directas de evento institucional y de ocupación interna no están conectadas en el adaptador remoto. En esos recorridos se informa la dependencia y se evita anunciar un alta exitosa. Su implementación no forma parte de este cambio.

Validación de esta unidad: 11 pruebas nuevas del almacén y la interfaz; suite completa con 202 aprobadas, cero fallidas y cinco de PostgreSQL omitidas. Tipado, compilación del frontend y verificación de la API también correctos. Se revisaron en navegador selección de una clase informativa, bloqueo de una franja ocupada, error, recuperación y conservación de la fecha. Esa revisión utiliza una fixture local identificada como datos ficticios y no demuestra concurrencia real contra PostgreSQL.

Pendientes para cerrar la aceptación: ejecutar las pruebas preparadas de PostgreSQL y la comparación con dos sesiones sobre una base de pruebas, verificar la segunda aprobación tras competir por el mismo horario y acordar el vencimiento de bloqueos por fin_previsto. No se escribieron datos en la base compartida ni se publicaron estos cambios.

Archivos compartidos modificados en esta unidad: organizacion/rutas.ts y servicios/contratoOrganizacion.ts. El contrato y los helpers nuevos están separados para facilitar la coordinación.

La segunda unidad modifica además DatosRemotos.tsx y añade solo la propiedad opcional agendaRemota al tipo del contexto local; mantiene el comportamiento del proveedor local. Las pantallas consumidoras cambian únicamente su lectura de disponibilidad, los estados del recorrido y la revisión previa al envío. Compartir este contrato y el diff con Luis antes de integrar las dos ramas.

## Aceptación sobre PostgreSQL (tercera unidad)

Se agregó tests/api-disponibilidad-postgres.test.ts al runner npm run test:postgres. Exige comprobar primero que current_database() sea exactamente la base tt_pruebas_<16 caracteres hexadecimales> declarada por TT_BD_DESECHABLE. Sus fixtures y escrituras de preparación solo se ejecutan después de esa comprobación. No modifica archivos SQL ni admite la base compartida como destino de las pruebas.

La prueba usa el servidor Express real, cookies de sesiones autenticadas distintas y dos titulares. Ambos consultan y envían propuestas para el mismo horario; las solicitudes pendientes no ocupan. Dos revisores autorizados solicitan las resoluciones en paralelo. Una barrera transaccional comprueba que ambas conexiones alcanzan el bloqueo de PostgreSQL antes de liberarlo; así se verifica competencia real. Debe haber exactamente un HTTP 200 y un HTTP 409 con el mensaje autoritativo de disponibilidad, un evento publicado y una solicitud pendiente sin resolución parcial.

La misma prueba compara agendas de ambas sesiones y verifica que no se filtre el título de una actividad privada ajena. Comprueba ocupación parcial, margen exacto, autorización sin publicación, relectura al enviar, cruces internos sin escrituras parciales y exclusiones ajenas rechazadas. Para bloqueos cubre fin efectivo, previsión, medianoche e inicio futuro, y el rechazo de una aprobación cuando el bloqueo se agregó después del envío. Una clase informativa en laboratorio permite enviar y autorizar conservando el horario académico.

La comparación de esta unidad usa dos clientes HTTP con sesiones reales contra PostgreSQL. La revisión visual de los componentes de la segunda unidad sigue identificada como fixture de interfaz; no se presenta como una prueba manual en dos navegadores contra la base del equipo.

Para reproducir con un servicio PostgreSQL local de pruebas que permita crear bases:

    $env:DATABASE_URL = 'postgresql://USUARIO:CONTRASENA@127.0.0.1:5432/postgres'
    npm run test:postgres

El runner crea y elimina su propia base. No ejecutarlo apuntando a producción o a la demo compartida. Una conexión del equipo no se configura ni se altera como parte de esta prueba.

Resultado ejecutado de esta unidad: PostgreSQL 17.11 temporal en loopback, esquema y semillas del repositorio, 14 pruebas aprobadas, cero fallidas y cero omitidas. La nueva aceptación aporta siete subcasos y su prueba contenedora. Se observaron dos conexiones contendientes, respuestas HTTP 409 y 200, un evento publicado y una solicitud pendiente sin resolución parcial. Al terminar se eliminó la base tt_pruebas y se detuvo el servidor temporal.

La suite ordinaria se mantiene en 202 pruebas aprobadas y seis casos PostgreSQL omitidos por diseño en npm test; esos casos se ejecutaron por separado con el runner real descrito arriba. El tipado es correcto. Estas pruebas reemplazan el pendiente de ejecutar PostgreSQL indicado en las unidades anteriores para este entorno aislado. Continúan pendientes la revisión manual con la configuración del equipo y la coordinación con Luis antes de integrar ramas.

La interpretación del bloqueo se sostiene en el propio comentario de BloqueoRecinto: fin_previsto no es fin real. Se mantiene finalizado_en como cierre efectivo. Si el equipo acuerda un vencimiento automático distinto, deberá definirlo con el responsable del modelo; no se implementa un cambio de esa regla en esta rama.
