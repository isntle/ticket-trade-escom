# Plan para conectar Ticket Trade con PostgreSQL

**Responsables: Luis y Regina. Fecha: 7 de noviembre de 2026.**

El objetivo es que la aplicación consulte y guarde en PostgreSQL mediante una API, conservando los recorridos que ya funcionan. La conexión se hará por módulos y se comprobará guardando desde la API y volviendo a consultar desde una sesión nueva. No basta con que la pantalla cambie ni con que el dato permanezca en el navegador.

## 1. Qué está listo y qué falta construir

El ZIP de esta entrega contiene el instalador revisado con las sugerencias de tipos de Karim. Se comprobó en PostgreSQL 18.1: creación de las 73 tablas, sus tipos y relaciones; inserciones en las 46 tablas de negocio; consultas; rechazo de 38 operaciones inválidas; pase con varias actividades; cancelación parcial; competencia por el último cupo; respaldo y restauración.

**Estas comprobaciones son de la base y sus consultas. Todavía no se ha construido ni probado una conexión completa React → API → PostgreSQL.** Ese es precisamente el trabajo de este plan. No se presenta como implementada la autenticación remota, la carga real de archivos ni el recorrido completo de una pantalla conectada.

La instancia de comprobación se conserva fuera del repositorio. Cada integrante construye su propia base con el SQL; no se publican directorios de PostgreSQL ni respaldos con datos.

## 2. Reparto general

| Persona | Trabajo principal | Qué entrega funcionando |
|---|---|---|
| Luis | Base común de la API, identidad y perfiles, organización y recintos | Inicio de sesión real; verificaciones; recintos y disponibilidad; solicitud, autorización, cambios y cancelaciones guardados en PostgreSQL. |
| Regina | Consulta pública de eventos, taquilla, boletos, Check-in y CSV | Cartelera conectada; reservas por actividad; un QR por evento; entradas registradas en servidor; listas y CSV con datos consultados de PostgreSQL. |
| Luis, al integrar | Montar ambos módulos y revisar el recorrido completo | Una solicitud autorizada aparece en cartelera, admite reservas y se puede validar en puerta, manteniendo sus datos después de reiniciar. |

La división es por funcionalidades completas: cada persona escribe las rutas, consultas SQL, adaptadores y pruebas de sus módulos. No se reparte como «Luis hace todo el backend y Regina espera para hacer el frontend».

**Independencia significa archivos separados y pruebas propias.** Ambos usarán el mismo esquema y los mismos acuerdos. La integración final sí necesita sus dos entregas; sería incorrecto prometer una aplicación integrada sin esa coordinación.

## 3. Acuerdo inicial para trabajar en paralelo

Antes de empezar, tomar como base el mismo commit y el mismo ZIP. La revisión que acompaña este plan usa main `dc7619713d81ea40f8498767c331ba56e43f4ccc`. Si main avanzó, revisar primero el cambio; no sustituir trabajo nuevo con esta copia.

Cada persona instala el esquema en su propia base de desarrollo. Por ejemplo, `tickettrade_luis` y `tickettrade_regina`. Para datos ficticios puede utilizarse `05_datos_ejemplo_opcionales.sql`; las contraseñas de ese archivo no sirven para iniciar sesión. Las cuentas de prueba autenticables las preparará Luis mediante el mecanismo seguro de creación de cuentas del backend, sin publicar contraseñas ni reutilizar datos personales.

### Reglas comunes que ya quedan fijadas

- La aplicación web consume `/api`. PostgreSQL solo es accesible desde el servidor.
- Reutilizar `src/servicios/http.ts`: ya utiliza cookie de sesión y espera respuestas como `{ "datos": ... }`. Errores: `{ "error": { "codigo": "...", "mensaje": "...", "campos": {} } }`.
- Todos los bigint viajan como cadenas decimales: `"1004"`, no `1004`. Las fechas de actividades se devuelven como `AAAA-MM-DD`, las horas como `HH:mm` y los instantes como ISO 8601 con zona. No convertir fechas de actividad a UTC como si fueran instantes.
- Todas las consultas SQL reciben parámetros. Los valores de usuario nunca se concatenan en SQL.
- Una operación con varias escrituras usa un solo cliente del pool y una transacción READ COMMITTED. Si algo falla, se revierte todo.
- Los permisos se calculan con la sesión del servidor. El cliente no puede elegir libremente un usuario, un organizador o un operador mandando su ID.
- No agregar bibliotecas, cambiar contratos compartidos o modificar el esquema por separado. Luis concentra esos cambios y avisa antes de que Regina adapte su código.
- Registrar reservas y entradas no se reintenta automáticamente desde el cliente. Una clave `Idempotency-Key` solo es útil si el servidor la reconoce y persiste el resultado; no asumir que ya funciona porque existe el encabezado.

### Cómo prueba Regina sin esperar al login de Luis

El módulo de Regina debe recibir el pool y el middleware de sesión al montarse, sin importar el archivo que arranca todo el servidor. En sus pruebas puede montarlo en una aplicación Express pequeña, conectada a su base, con identidades ficticias de prueba.

Ese middleware de prueba vive únicamente en `backend/pruebas/regina/`; no se monta desde el arranque real ni acepta identidades enviadas por un encabezado del navegador. Las pruebas comprobarán también que, sin identidad, las operaciones privadas fallan. Al integrar, Luis monta el mismo router con la sesión real.

Esto permite comprobar SQL y rutas privadas sin esperar a que Luis termine identidad. La autorización con cookies reales se vuelve a comprobar en la integración final.

## 4. Archivos y límites para no pisarse

Las rutas de backend de esta tabla son **archivos propuestos a crear**, no archivos ya implementados. Si el equipo ya entregó un backend equivalente, adaptar la distribución a ese backend y reutilizarlo; no construir otro servidor que compita con él.

| Archivos o carpeta | Responsable único |
|---|---|
| `backend/app.ts`, `backend/iniciar.ts`, `backend/comun/` | Luis |
| `backend/modulos/identidad/`, `backend/modulos/organizacion/` | Luis |
| `backend/modulos/consultaEventos/`, `backend/modulos/taquilla/`, `backend/modulos/checkin/`, `backend/modulos/reportes/` | Regina |
| `backend/pruebas/luis/` y `backend/pruebas/regina/` | Cada persona en su carpeta |
| `src/servicios/http.ts`, `contratoOrganizacion.ts`, `organizacionRemota.ts` y `organizacion.ts` | Luis |
| `src/servicios/consultaEventosApi.ts`, `taquillaApi.ts`, `checkinApi.ts`, `reportesApi.ts` | Regina, archivos nuevos |
| `src/contextos/DatosContexto.tsx`, `AutenticacionContexto.tsx`, `NotificacionesContexto.tsx` | Luis |
| Formularios de identidad, perfil, solicitud, Subdirección, configuración de eventos y distribución de espacios | Luis |
| Cartelera, detalle público, selección/reserva, Mis boletos, escáner, historial de accesos y panel de participación | Regina |
| `src/utilidades/csv.ts` y botones CSV de las pantallas de Regina | Regina |
| `package.json`, archivo de bloqueo de dependencias, `vite.config.ts`, configuración de despliegue y migraciones | Luis |
| `src/tipos/index.ts`, contratos compartidos y catálogo de documentación | Luis, después de revisar los cambios de ambos |

Antes de editar HistorialAccesosPagina, coordinar la entrega de Hugo de TICKTRADE-137. Antes de editar VentanaModal, coordinar la tarea de Horacio. No reemplazar sus archivos por una copia anterior. El CSV en Subdirección lo integra Luis usando la utilidad y el servicio de Regina, para que ambos no editen el mismo panel.

Regina entrega los servicios y sus pantallas usando un punto de integración por módulo. Para probar su módulo de forma independiente puede utilizar un proveedor de pruebas bajo `src/integracion/regina/`, sin editar DatosContexto. Luis conecta después ese punto al proveedor común y retira el montaje de prueba del recorrido normal. No copiar todo DatosContexto a otro archivo.

## 5. Trabajo de Luis

### L1. Preparar el servidor común

1. Revisar si ya existe un backend del equipo. Si lo hay, usar su arranque y pool en lugar de abrir una arquitectura nueva.
2. Preparar un pool de PostgreSQL, validación de configuración y un ejecutor de transacciones que libere siempre la conexión, tanto al confirmar como al fallar.
3. Preparar el formato de errores acordado. Duplicidad o aforo ocupado debe traducirse a un conflicto entendible; no devolver consultas, contraseñas o errores internos completos al navegador.
4. Configurar acceso por `/api` en desarrollo. El cliente actual usa `credentials: same-origin`; mantener el mismo origen mediante proxy. En despliegue, definir el encaminamiento equivalente y HTTPS. No cambiar cookies/CORS sin comprobarlo.
5. Preparar sesión y permisos reales. Cookie HttpOnly, protección para escrituras y cierre de sesión que invalide la sesión del servidor. No confiar en `rolActivo` guardado en el navegador.
6. El ER recibido no define sesiones HTTP ni resultados de idempotencia. Si se almacenan en PostgreSQL, añadir una migración técnica separada y explícita, por ejemplo en un esquema `infra`, y probar su instalación. No reutilizar TokenCuenta de recuperación como una sesión de login ni afirmar que esas tablas técnicas ya vienen en el instalador.
7. Mantener `package.json` y dependencias bajo un único responsable. Regina comunica lo que necesite; no cambia el lock en paralelo.

**Entrega L1:** servidor que arranca, consulta PostgreSQL y responde con el formato acordado; manejo de conexión fallida; sesión real para módulos integrados. Regina puede avanzar mientras tanto con su montaje de pruebas.

### L2. Conectar identidad y perfiles

Trabajar con Cuenta, PerfilUsuario, Estudiante, EmpleadoIPN, TokenCuenta y las tablas de verificación.

- Crear cuentas junto con su perfil/subtipo en una transacción. Aplicar el mismo criterio de correo y boleta que el DDL. No guardar contraseñas en claro.
- Consultar y editar el perfil con campos explícitos permitidos. No aceptar un arreglo de roles administrativos enviado por el usuario.
- Completar confirmación de correo y recuperación con enlaces de un solo uso y vencimiento; preparar el envío real desde un servicio del servidor. No marcar correo como confirmado solo porque el cliente lo solicita.
- Guardar solicitud de verificación, motivo, documentos y datos complementarios juntos. El número de empleado se pide en ese trámite.
- Conectar revisión por Subdirección, retiro de verificación según permisos acordados y gestión de jefaturas. Calcular vigencia con el periodo escolar real.
- Separar almacenamiento del archivo y metadatos. La API valida tamaño y contenido y controla el acceso al PDF. Si falla el registro, limpiar el archivo temporal sin dejar referencias rotas.

**Comprobación:** registrar una cuenta, cerrar sesión, iniciar desde una sesión nueva y recuperar el perfil de PostgreSQL. Enviar y resolver una verificación y comprobarla con otra cuenta. Para correo, utilizar un buzón/servicio de pruebas; una fila EnvioCorreo no demuestra que llegó el mensaje.

### L3. Conectar organización y recintos

Reutilizar el contrato de organización que ya existe. El adaptador remoto debe entregar las estructuras que esperan las pantallas, no las filas SQL sin transformar.

- Consultar/guardar recintos, accesorios, lugares y estaciones. No duplicar el croquis al cambiar un estado de equipo.
- Consultar disponibilidad combinando actividades aprobadas, margen de 30 minutos y bloqueos reales. Mostrar las clases como información; no impedir el envío por ese motivo solamente.
- Guardar borrador como Evento + primera Actividad. Al enviar, guardar solicitud y comprobar información completa, contactos, cartel, actividades y urgencia.
- Conectar la revisión de Subdirección. Aprobar toda la solicitud o devolver/rechazar; volver a validar disponibilidad al aprobar, dentro de la transacción.
- Guardar itinerarios por evento y día, con sus archivos. Reprogramar un día requiere comprobar qué ocurre con su itinerario anterior; no dejarlo asociado a una fecha sin actividades.
- Guardar lugares de actividad y categorías. Consultar totales; no reintroducir versiones ni estados de distribución retirados del modelo.
- Aplicar solicitudes de cambio y reasignaciones conjuntamente. Los cambios propuestos no ocupan el destino antes de aprobarse.
- Coordinar cancelación con las reservas existentes: actualizar causa/fecha, liberar compromisos cuando proceda y conservar QR/historial. No modificar solo Evento y dejar accesos activos a una actividad cancelada.
- Gestionar bloqueos y afectaciones. Respetar actividades iniciadas/entradas existentes y no reactivar una actividad automáticamente al terminar un bloqueo.
- Revisar plazos y acciones automáticas en un proceso del servidor. Las vistas calculan límites, pero no resuelven solicitudes por sí solas.

**Comprobación:** enviar una solicitud ordinaria y una extraordinaria, consultarlas desde Subdirección, resolverlas y volver a abrirlas después de reiniciar. Probar también dos aprobaciones que compitan por el mismo recinto y horario. Solo una debe quedar autorizada en ese espacio.

### L4. Integrar los proveedores comunes

Luis es el único que cambia los contextos comunes. Conectar los servicios de Regina sin reescribir sus rutas ni sus consultas. Añadir carga/error y evitar actualizaciones de pantalla que aparenten éxito antes de confirmar el guardado.

En modo API, una caída del servidor debe mostrarse como error: no volver silenciosamente a localStorage y mostrar una reserva que solo existe en un equipo. La configuración para elegir modo local/API será una propuesta nueva a implementar; no se presupone que ya exista. Guardar filtros o preferencias de interfaz localmente sí es compatible con datos de negocio remotos.

## 6. Trabajo de Regina

### R1. Conectar consultas de eventos

- Preparar el router y servicio de lectura para cartelera, detalle público y programación de actividades.
- Devolver categorías, visibilidad, archivo de cartel y programación con el formato acordado. El detalle privado debe respetar el enlace y las reglas de acceso.
- Mantener la diferencia entre evento y actividad: varias actividades pueden compartir fecha y usar distintos recintos.
- Leer itinerarios por día y solicitar sus archivos mediante los accesos que prepare el servidor; no tratar la clave de almacenamiento como una URL pública universal.
- Comprobar lista vacía, evento inexistente, error de servidor y recinto sin foto, manteniendo las pantallas actuales.

**Comprobación:** crear un evento de prueba en su propia base, consultarlo mediante la API y comprobar que sus actividades y recintos coinciden con lo almacenado.

### R2. Conectar taquilla y pases

Trabajar con CompromisoCupo, Apartado, AsignacionAsiento, BoletoEvento, Reservacion y BoletoEspecial.

1. Implementar consulta de disponibilidad de una actividad y sus lugares. El aforo de un evento no se calcula escogiendo el recinto más grande.
2. Implementar apartados de dos minutos. Su vencimiento se calcula en el servidor; el reloj visible es solo informativo.
3. Confirmar en una transacción: revisar cupo, estado de actividad, horario, elegibilidad del usuario y cruces con sus reservas; convertir el apartado cuando exista; crear o reutilizar BoletoEvento y crear la Reservacion.
4. Conservar un pase/QR por persona y evento, con accesos separados por actividad. Generar códigos impredecibles en servidor; no concatenar IDs. Acordar el formato que ya reconoce el lector.
5. Cancelar una reserva con fecha y causa y liberar su compromiso, preservando las demás reservas. Gestionar acreditaciones especiales sin exigir una cuenta ficticia al portador.
6. Implementar la consulta de Mis boletos reconstruyendo los estados desde reservaciones y entradas.
7. Coordinar con Luis la idempotencia del servidor. Ante doble clic o reintento, no crear dos reservas ni emitir dos pases para el mismo usuario/evento.

**Comprobación:** reservar dos actividades; recibir el mismo QR; reiniciar y recuperar ambas; cancelar una y conservar la otra. Usar dos clientes concurrentes para el último cupo y para el mismo asiento. Solo una confirmación debe aceptarse.

### R3. Conectar Check-in y ocupación

- Recibir código y actividad seleccionada; resolver el pase y comprobar que incluye una reserva válida para esa actividad.
- Verificar con la sesión real del servidor la asignación de Staff o el permiso operativo correspondiente. No aceptar al operador solo por su ID enviado desde el cliente.
- Comprobar actividad, evento, recinto, horario y suspensión. Guardar EntradaOrdinaria o EntradaEspecial únicamente cuando se autoriza el acceso.
- Responder de forma clara a código desconocido, acceso cancelado, actividad ajena y entrada ya utilizada. No marcar toda la credencial como consumida después de una actividad.
- Consultar historial de entradas exitosas y ocupación desde servidor, incluyendo accesos sin butaca. No sumar reservas como si todas fueran personas que ya ingresaron.
- Coordinar la rama de Horacio antes de modificar el monitor; conservar su aportación y revisar su alcance.

**Comprobación:** escanear el mismo acceso simultáneamente desde dos clientes; queda una sola entrada. Con el mismo QR, aceptar la segunda actividad reservada y rechazar una tercera no reservada. Reiniciar y recuperar historial/ocupación.

### R4. Conectar reportes y CSV

Seguir también `PLAN_CSV_REGINA.md`. Reutilizar `v_asistentes_csv` y `v_entradas_csv`, filtradas por un evento que la sesión tenga permitido consultar.

El CSV debe exportar los resultados filtrados completos, conservar acentos y escapar comillas/fórmulas. No exportar QR, códigos manuales, contraseñas ni documentos. Una persona puede tener varias filas por sus actividades. El mismo serializador funciona primero con las filas locales y después con las filas recibidas de la API.

**Comprobación:** descargar después de reservas/entradas reales de prueba, comparar las filas con PostgreSQL y abrirlo en Excel/LibreOffice. Sin autorización no debe poder obtenerse el reporte cambiando el ID de evento en la petición.

## 7. Rutas propuestas y responsable de cada una

Estas rutas fijan el reparto; todavía deben implementarse y documentar sus cuerpos/respuestas antes de conectar las pantallas. No significan que ya exista una API funcional.

| Familia de rutas | Responsable |
|---|---|
| `/api/sesion/*`, `/api/cuentas/*`, `/api/verificaciones/*`, `/api/jefaturas/*` | Luis |
| `/api/archivos/*`, `/api/catalogos/*`, `/api/recintos/*`, `/api/agenda/*`, `/api/bloqueos/*` | Luis |
| `/api/solicitudes/*`, `/api/organizacion/eventos/*` | Luis |
| `GET /api/eventos` y `GET /api/eventos/:id` | Regina |
| `/api/taquilla/actividades/:id/*`, `/api/reservaciones/*`, `/api/pases/*`, `/api/acreditaciones/*` | Regina |
| `/api/checkin/*`, `/api/ocupacion/*`, `/api/reportes/*` | Regina |

Luis monta los routers desde app.ts al integrar. Regina no modifica ese archivo: exporta sus routers y deja una lista de cómo montarlos. Las pruebas de Regina los montan en su propio arranque de pruebas. Cada familia conserva un responsable único.

## 8. Diferencias del modelo que no se deben ocultar

Antes de activar cada recorrido remoto, consultar `DIFERENCIAS_CON_EL_FRONTEND.md` y resolver los puntos que lo afecten. Para evitar que ambos cambien el esquema, Luis concentra las decisiones y migraciones; Regina identifica el efecto en sus módulos.

| Diferencia | Quién la resuelve | Mientras se decide |
|---|---|---|
| Empleado genérico frente a docente/administrativo/PAE; datos de perfil y restricciones | Luis, con el acuerdo del equipo | Conectar los campos representados y mantener los datos anteriores sin una conversión destructiva. No declarar completo el perfil remoto si se pierde información requerida. |
| Visibilidad interna, categorías históricas y categorías de lugares | Luis coordina; Regina adapta consulta/taquilla | No publicar eventos internos como públicos ni convertir lugares con reservas sin revisar. Usar datos de prueba compatibles para desarrollar. |
| Contador de interés global frente a interés por persona | Luis define persistencia; Regina conecta pantalla | El contador no permite reconstruir identidades. No inventar deduplicación por usuario sin una relación que la respalde. |
| AvisoDisponibilidad frente a lista de espera con ofertas de 10 minutos | Luis coordina el acuerdo; Regina implementa taquilla | Son recorridos distintos. No considerar completa la lista de espera remota con solo guardar el aviso. |
| Entradas exitosas frente a todos los intentos del escáner | Luis coordina la migración si sigue en alcance; Regina implementa historial | Puede conectarse la consulta de entradas exitosas, identificada así. El historial completo no se considera migrado hasta tener almacenamiento para los rechazos. |
| Cierre manual de inscripciones, ponentes, etiquetas, programa e historiales retirados | Luis confirma requisitos; Regina ajusta sus pantallas | No reponer columnas automáticamente ni descartar información antigua sin acordar su tratamiento. |
| Tres envíos de verificación frente a tres rechazos | Luis alinea requisitos y pantalla | El DDL actual cuenta tres envíos por periodo. Si el acuerdo cambia, modificarlo con una migración y pruebas. |

Estos puntos no impiden escribir y probar el resto de los módulos con escenarios compatibles. Sí impiden afirmar que todo el frontend antiguo ya está migrado sin pérdida. Antes de pasar a un uso compartido, las funciones afectadas deben conservarse con soporte real o cambiarse mediante un acuerdo explícito del equipo.

## 9. Orden de entregas para trabajar al mismo tiempo

| Entrega | Luis | Regina |
|---|---|---|
| 1 | Arranque/pool/errores y contratos; revisar diferencias de identidad | Montaje de pruebas propio; consulta pública y utilidad CSV con sus datos de prueba |
| 2 | Sesión, perfiles, archivos y verificación | Reservas, apartados, pases y pruebas contra su propia base |
| 3 | Solicitudes, autorización y cambios de programación | Check-in, ocupación y reportes contra reservas de su propia base |
| 4 | Cancelaciones, bloqueos y procesos de vencimiento | Pantallas de taquilla/Check-in, CSV y revisión de errores/permisos |
| 5 | Integrar contextos, routers y configuración; revisar ambos módulos | Entregar sus adaptadores y acompañar las pruebas del recorrido real |

Cada entrega debe indicar archivos, operaciones que ya persisten, consultas para comprobarlas y lo que aún no está conectado. No marcar «backend completo» porque una pantalla consulta correctamente una lista.

## 10. Prueba final que hace Luis después de integrar

Utilizar cuentas y eventos ficticios en una base de integración nueva. Comprobar mediante pantallas, API y consultas SQL:

1. Registrar una cuenta y volver a iniciar sesión desde otro navegador. Recuperar los datos de PostgreSQL.
2. Enviar documentación, verla con Subdirección, resolverla y consultar el estado desde la cuenta solicitante.
3. Crear una solicitud con cartel y dos actividades en distintos recintos; guardar y reabrir el borrador. El archivo y la programación permanecen.
4. Enviar, consultar desde Subdirección y aprobar. El mismo evento aparece en cartelera con los datos completos; no se crea una copia desconectada de la solicitud.
5. Reservar las dos actividades, recuperar el pase y comprobar el mismo QR con dos accesos independientes.
6. Reiniciar frontend y API, abrir otra sesión y comprobar que las reservas siguen ahí sin restaurar localStorage.
7. Escanear una actividad desde dos clientes simultáneos: una entrada. El otro acceso del pase permanece disponible.
8. Reprogramar una actividad y comprobar que detalle, pase y consulta operativa muestran la nueva fecha/recinto sin cambiar su identidad ni el QR.
9. Cancelar solo una reserva/actividad según el caso y verificar cupo, causa, pase e historial; comprobar que no se alteraron las demás.
10. Consultar ocupación y descargar CSV; comparar cantidades y filas con PostgreSQL.
11. Intentar acciones con una cuenta ajena, sin sesión y con roles distintos; el servidor las rechaza sin guardar cambios.
12. Simular fallo entre dos escrituras: no queda medio borrador, un cupo sin su reserva ni una entrada duplicada. Probar también caída de la API: la pantalla no muestra un éxito local falso.

Para cada caso basta anotar resultado esperado/observado y la consulta que comprueba la información. Si falla, corregir y repetir ese recorrido; no sumar pruebas de relleno.

## 11. Cuándo podemos decir que está conectado

Una funcionalidad se termina cuando se guarda en PostgreSQL mediante la API, se recupera después de reiniciar, respeta permisos y rechaza los conflictos del recorrido. Si conserva parte del dato únicamente en el navegador, sigue parcialmente conectada.

Antes del despliegue: configurar base de datos, almacenamiento, cookies, HTTPS, secretos del servidor y rutas /api del entorno real; comprobar respaldo/restauración y ejecutar los recorridos anteriores en ese entorno de pruebas. No publicar credenciales ni las bases locales.

Este documento es el plan de trabajo. No inicia tareas de conexión, no modifica Jira, no crea commits ni cambia el despliegue.
