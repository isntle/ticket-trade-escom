# Roadmap Sprint 8 — Ticket Trade

Actualizado: 8 de noviembre de 2026. Propuesta de trabajo; no equivale a tareas creadas en Jira ni a funcionalidades terminadas. Las fechas y la carga del sprint se acuerdan con el equipo.

## Objetivo

Completar la conexión de los recorridos actuales con la API y PostgreSQL y preparar un despliegue compartido en Supabase. Una pantalla está conectada cuando guarda en el servidor, otra sesión puede consultar el resultado y los datos se conservan después de reiniciar. Guardar únicamente en localStorage no cumple ese objetivo.

El roadmap reúne pendientes de A, B, C y D. No todo tiene que resolverse en una sola semana: primero se acuerda el alcance, después se toman los paquetes completos que quepan. La salida a producción queda condicionada a terminar y comprobar los módulos que se habiliten.

## 1. Punto de partida real

| Parte | Lo que ya existe | Límite actual |
|---|---|---|
| Modelo y PostgreSQL | HTML, instalador de 73 tablas de negocio, relaciones, restricciones, consultas, ejemplos opcionales e instrucciones. Migración 07 separada para sesiones HTTP. | Hay diferencias entre el modelo aprobado y las estructuras antiguas del frontend; construir la BD no conecta automáticamente esas pantallas. |
| Identidad remota | Registro, login, consulta de sesión y logout; contraseña con hash y sesión revocable. | Documentos, revisión documental, correo y jefaturas no tienen aún su recorrido remoto completo. |
| Lectura pública | `/api/recintos` y `/api/eventos`. | La proyección inicial no incluye todo el expediente, archivos, lugares, itinerarios, detalle privado y vistas del organizador. |
| Organización remota | Consulta y creación de solicitudes; resolución con control de estado/versión y publicación al aprobar. | Faltan otras operaciones y conectar los comandos a las pantallas. |
| Taquilla y Check-in | Flujos locales por actividad, pase compartido por evento, lector, historial y ocupación. | No hay todavía API completa de reservas, pases y entradas compartidas entre dispositivos. |
| Servicios | Transporte HTTP, contrato y adaptadores de organización. | Los contextos aún ejecutan muchas operaciones de negocio sobre almacenamiento del navegador. |
| Demostración desplegada | Frontend con modo local predeterminado. | No presentar ese despliegue como una aplicación ya persistente y multiusuario. |

La entrega inicial de Regina es `6610f57`; su integración y correcciones están en `1f98b56`. Los scripts y el plan se publicaron en `8a9e0c6`, y el HTML en `4410dd9`. Estos avances no deben repetirse como tareas de construcción desde cero.

## 2. Entregas revisadas e integradas antes de este roadmap

- **Horacio, PR #7:** monitor por actividad, conteo de entradas sin butaca y coloreado únicamente de lugares existentes. Conserva sus permisos de consulta. Las 12 pruebas de ocupación pasaron durante la revisión.
- **Rodrigo, PR #8 / TICKTRADE-140:** estados de carga, error y reintento por itinerario. Se corrigió una carrera que ocultaba imágenes válidas de carga rápida. El reinicio se hace por archivo y se conserva abierto el detalle del día al cambiar la URL. Se comprobó imagen válida, archivo inexistente, reintento, sustitución de URL y dos días independientes.
- **Romero, TICKTRADE-138:** los filtros ya estaban integrados en `9478027`.
- **Diego, Jannet y Josué, TICKTRADE-134/135/136:** entregaron análisis documentales. Sus recomendaciones alimentan decisiones y trabajo pendiente; no son migraciones ejecutadas ni autorización para eliminar tablas.

La integración conserva los commits originales de los compañeros como antecesores. Las correcciones y la integración se registran por separado bajo la identidad de Luis.

## 3. Decisiones que deben cerrarse antes de conectar los módulos afectados

No hay que rehacer toda la BD. Registrar las decisiones concretas y, solo cuando haga falta, una migración pequeña y compatible.

| Tema | Diferencia comprobada | Decisión y entregable |
|---|---|---|
| Rol y afiliación | El registro del modelo agrupa empleados; el front conserva diferencias entre docente y administrativo. | Acordar el dato que se conserva y su correspondencia; no deducir permisos del RFC ni del rol declarado. |
| Verificación semestral | Se habló de tres rechazos; el HTML/DDL cuenta tres envíos por periodo. | Definir qué consume intento, periodos oficiales, vigencia, suspensión de envíos y renovación. Un borrador no debe consumir un intento accidentalmente. |
| Visibilidad | El front usa interno y el modelo Público/Privado. | Resolver el acceso interno sin convertirlo silenciosamente en público. |
| Categorías y estaciones | Falta correspondencia de Organizador; sin_definir, bloqueado y eliminado tienen usos distintos en el editor. El modelo permite reservar equipo averiado y TT031 bloquea estaciones fuera de servicio. | Acordar inventario y reglas por categoría, exclusión temporal de lugares y tratamiento del equipo. No confundir aforo físico, operativo y entradas registradas. |
| Espera e interés | El front tiene cola con ofertas de **10 minutos** e interés personal; el modelo guarda un aviso simple y un contador global. | Elegir explícitamente qué se mantiene. Los diez minutos son una decisión vigente; no reducirlos a dos por documentación antigua. No afirmar que un contador permite reconstruir quién se inscribió. |
| Historial y versiones | El modelo simplificado no guarda todas las versiones ni los intentos fallidos de escaneo. | Conservar el alcance acordado o aprobar persistencia adicional. No inventar historiales con datos que nunca se almacenaron. Los contadores de versión para concurrencia sí tienen utilidad. |
| Inscripciones | El código conserva cierres manuales y automáticos retirados del modelo. | Alinear el flujo con la indicación de permitir acceso/registro mientras haya lugar y la actividad siga habilitada. El primer Check-in no cierra por sí solo las inscripciones. |
| Programa e itinerario | Siguen presentes estructuras antiguas de ponentes/programa; el acuerdo conserva actividades e itinerario por día. | Preparar una migración sin perder información histórica útil. No volver a añadir tablas de ponentes, JSON de programa o etiquetas sin decisión del equipo. |

Fuente base: `base-de-datos/postgresql/DIFERENCIAS_CON_EL_FRONTEND.md`. Complementar con el informe de Diego y los PDF de las tareas 135/136. Aprobar una auditoría no equivale a aprobar todas sus propuestas.

## 4. Paquetes propuestos de implementación

Los identificadores S8 son del roadmap, no claves de Jira. Responsables sugeridos, sujetos a confirmación; no son asignaciones realizadas.

### S8-01 — Cerrar acuerdos del modelo y migración de datos

**Apoyo:** Karim, Luis y Regina. **Prioridad:** P0 para los módulos afectados.

Resolver la tabla anterior, publicar la correspondencia entre datos locales y SQL y preparar migraciones incrementales. Tratar identificadores PostgreSQL BIGINT como texto. Revisar categorías históricas, alias de laboratorios y campos obligatorios de borrador frente a envío. No fusionar recintos físicos distintos ni duplicar LAB-03 al importar.

**Terminado cuando:** existe un acuerdo revisable; una base nueva y una actualizada producen el mismo esquema; las restricciones y los datos de ejemplo se comprueban sin perder reservas, archivos ni referencias.

### S8-02 — A: documentos y verificación remota

**Responsable sugerido:** Luis; apoyo de A para pantallas y documentación. **Prioridad:** P0.

Implementar carga y consulta autorizada de documentos, metadatos y vínculo con el expediente. Estudiante: constancia/horario según categoría acordada; empleado: número de empleado y adscripción en la verificación, sin volverlo obligatorio en el registro común; externo: entidad, cargo y documentos de representación. Conservar motivo, revisión por Subdirección, rechazo con nuevo envío permitido, vigencia semestral y pausa de envíos sin bloquear el inicio de sesión.

Conectar acciones de revisar, aprobar, rechazar, silenciar y revocar. La instrucción vigente permite revocar también a Subdirección: alinear permisos del servidor y documentos con Administración. Mostrar distintivo de verificación vigente, separado del correo confirmado.

**Terminado cuando:** el solicitante carga y consulta su expediente; otra cuenta autorizada lo revisa; un tercero no accede al documento; renovación e intentos se calculan en servidor y sobreviven al reinicio.

### S8-03 — A: confirmación de correo, recuperación y perfil

**Responsable sugerido:** Luis. **Prioridad:** P0 antes de usar cuentas reales.

Elegir y configurar un proveedor de correo; Nodemailer puede transportar SMTP, pero GitHub no es por sí mismo un servicio de envío de correos de la aplicación. Implementar confirmación y recuperación con enlaces de un solo uso, vencimiento y tokens almacenados de forma segura. Definir reenvío, límites y respuestas que no revelen si existe una cuenta. Invalidar sesiones cuando corresponda al cambiar contraseña. Conectar edición de perfil y sus validaciones con la API.

**Terminado cuando:** el enlace llega a un buzón de prueba, funciona una vez, expira, no permite recuperar otra cuenta y el cambio se conserva tras una nueva sesión. Una fila de correo pendiente no demuestra entrega.

### S8-04 — A/B: jefaturas y facultades para solicitar eventos

**Responsable sugerido:** Luis; A revisa actores. **Prioridad:** P0 para habilitar ese perfil.

Conectar asignación/retiro de jefaturas por Subdirección, consulta de facultades vigentes y decisión de autorización en el servidor. El rol elegido al registrarse no concede estos permisos. Mantener el acceso «Solicitar nuevo evento» y orientar a login, confirmación de correo o verificación documental conservando el destino previsto.

La autorización automática solo aplica a solicitudes que cumplan las reglas acordadas; una extraordinaria o un conflicto real no se aprueban por confiar en el cliente. Las clases siguen siendo información para Subdirección, no un bloqueo automático.

**Terminado cuando:** asignar o retirar la facultad afecta a una sesión ya abierta; una solicitud válida sigue el recorrido correcto; una cuenta sin facultad no puede autoaprobar mediante HTTP.

### S8-05 — B: conectar el recorrido completo de solicitudes y expediente

**Responsable sugerido:** Luis. **Prioridad:** P0.

Reutilizar las primeras rutas de solicitudes. Completar detalle, edición, reenvío, devolución y cancelación; borrador con actividades y envío completo con contactos/cartel según el modelo acordado. Conectar Mis eventos y solicitudes y Solicitudes de Subdirección a esos comandos. Mantener vista previa, itinerarios, motivos, controles por estado y detección de versiones desactualizadas.

La consulta pública necesita detalle por evento y proyecciones autorizadas para organizador, Subdirección y Administración. No utilizar el listado público como expediente privado. Evitar que los valores provisionales del adaptador, como una distribución no confirmada o un equipamiento vacío, hagan parecer incompleto un registro completo en la BD.

**Terminado cuando:** enviar → revisar → devolver → corregir → aprobar conserva los mismos datos en dos sesiones y publica el cartel/actividades correctos. Un fallo deja el formulario recuperable y no aparenta éxito local.

### S8-06 — B: disponibilidad, recintos, distribuciones y bloqueos

**Responsable sugerido:** Luis; compañeros pueden apoyar adaptadores o pantallas delimitadas. **Prioridad:** P0.

Conectar consultas de disponibilidad y agenda, actualización de recintos, accesorios, croquis, lugares/estaciones, categorías por actividad, bloqueos y reactivaciones. Leer coordenadas/grupos mediante un contrato que realmente pueda consumir el mapa actual; no basta devolver una imagen del croquis.

Revisar disponibilidad al enviar y nuevamente al aprobar, incluyendo margen de separación, otras actividades y bloqueos vigentes. Una solicitud pendiente no reserva permanentemente el recinto. Respetar la distinción entre clases informativas y reservas reales. Calcular totales desde lugares y compromisos; no restablecer versiones o estados de distribución eliminados del modelo sin acuerdo.

**Terminado cuando:** dos aprobaciones concurrentes para el mismo recinto/horario no se aceptan ambas; un lugar excluido no se ofrece; el mismo lugar puede configurarse de forma distinta en actividades diferentes.

### S8-07 — B/C/D: cambios, reasignaciones y cancelaciones remotas

**Responsable sugerido:** Luis en B; Regina/C y D implementan sus módulos dependientes. **Prioridad:** P0.

Implementar cambios de fecha, horario y recinto, solicitudes de cambio y reasignación; confirmar disponibilidad y versión actual en transacción. Reasociar o pedir resolver el itinerario de un día que deja de tener actividades. Coordinar reservas, lugares y acceso: una actividad cancelada no conserva un acceso utilizable; las demás actividades del mismo pase permanecen válidas.

Distinguir cancelar la última actividad de borrar el evento: conservar el registro y aplicar el estado acordado cuando ya no existan actividades vigentes. Impedir cambios incompatibles con entradas ya registradas. Generar avisos persistentes y, una vez disponible correo, entregarlos con destinatarios reales. Programar vencimientos y revisiones en servidor, sin depender de que alguien mantenga una pestaña abierta.

**Terminado cuando:** cambio/cancelación se guarda completo o se revierte completo; otro dispositivo ve la programación vigente; reintentar no duplica la operación ni los avisos.

### S8-08 — C: reservas, cupos y pase por evento en servidor

**Responsable sugerida:** Regina con C, dividiendo disponibilidad, confirmación y consulta de pases en archivos separados. **Prioridad:** P0.

Implementar disponibilidad, apartados de dos minutos, confirmación y cancelación sobre PostgreSQL. Validar con datos actuales cupo, asiento, cruces personales, actividad, permisos y restricciones del usuario. Resolver conjuntamente CompromisoCupo, Apartado, AsignacionAsiento, BoletoEvento y Reservacion.

Emitir o reutilizar **un pase y QR por usuario/evento**, asociado únicamente a las actividades reservadas. Añadir/quitar una actividad cambia sus permisos, no exige generar otro QR para el mismo evento. Generar códigos opacos en servidor. Cada actividad mantiene su aforo y estado propios; no concede entrada general a todo el evento.

Adaptar los pases especiales a su contrato real: sin cuentas o reservaciones ficticias y con inventario/categoría/asiento compatibles. Confirmar idempotencia para dobles clics y reintentos. Conectar Mis boletos a la consulta remota, incluyendo cancelaciones y entradas utilizadas.

**Terminado cuando:** dos clientes compiten por el último lugar y solo uno confirma; reservar A y B devuelve el mismo pase; cancelar A conserva B; todos los datos reaparecen en una sesión nueva.

### S8-09 — C: avisos de disponibilidad e interés

**Responsable sugerido:** C con revisión de Regina. **Prioridad:** P1; decisión previa obligatoria.

Implementar únicamente la variante de espera/interés acordada en S8-01. Si se conservan ofertas de diez minutos, persistir su destinatario, estado y vencimiento y comprobar cupo al aceptarlas. Si se adopta aviso simple, ajustar UI y requisitos para no prometer turno ni cupo protegido inexistentes. El contador global no sustituye un registro personal.

**Terminado cuando:** el recorrido funciona entre sesiones sin duplicar avisos ni inventar posiciones y un usuario no puede aceptar la oferta de otro.

### S8-10 — D: entrada atómica, historial y ocupación compartidos

**Responsable sugerida:** Regina para la API; D para conectar lector, historial y monitor. **Prioridad:** P0.

Validar el pase en servidor contra la actividad seleccionada, recinto, horario, estado de reserva y asignación del operador. Registrar la entrada y devolver el resultado en una operación atómica. No confiar en el nombre de operador enviado por el cliente. Escanear A consume A y mantiene B disponible.

Conectar historial, filtros y ocupación al servidor. Resolver la persistencia de intentos fallidos antes de ofrecer una bitácora completa: las tablas de entradas exitosas no contienen esos intentos. Mantener conteo sin butaca separado del coloreado del mapa, como en el PR de Horacio.

**Terminado cuando:** dos dispositivos intentan aceptar el mismo acceso y solo uno registra éxito; repetir no suma; B no altera A; se retira Staff y deja de poder operar. Ante error de red no se permite entrada como si hubiera guardado.

### S8-11 — CSV, PDF y pendientes pequeños de interfaz

**Responsables propuestos:** confirmar con Regina CSV/PDF; Hugo y Horacio conservan sus tareas delimitadas. **Prioridad:** P1.

**CSV:** no encontré una entrega nueva en las ramas revisadas. Preparar exportación con datos autorizados y filtros aplicados; una fila por reserva/actividad, acentos, comillas, saltos y protección ante fórmulas. No incluir QR, contraseñas ni documentos. Una utilidad que recibe filas permite comenzar con datos locales y después consultar la API.

**PDF:** no encontré una entrega nueva de Regina. Existe impresión básica previa; eso no demuestra el cumplimiento de la tarea completa. Preparar el pase con un QR, actividades elegidas, estados, fechas, horarios, recintos y lugares; sin navbar ni botones y con saltos legibles. Reutilizar impresión nativa si basta. Descargar no emite otro pase ni registra entrada. El PDF guardado no se actualiza automáticamente y su validación final sigue en servidor.

**Historial, TICKTRADE-137:** permitir Desde = Hasta, rechazar rango invertido, conservar fecha institucional y mostrar resultados entendibles. No hay entrega comprobada todavía.

**Modales, TICKTRADE-139:** foco inicial, Tab/Shift+Tab dentro, devolución de foco, nombre accesible y conservación del scroll. El PR del monitor no cubre esta tarea.

**Jira CSV/PDF:** las antiguas claves 143 y 144 ya no aparecen en la búsqueda consultada y sus páginas no están disponibles. No hay un registro accesible que identifique si fueron borradas, quién lo hizo o si cambió su acceso. Las tareas nuevas 146–148 describen instalación/conexión/lectura, no CSV ni PDF. Confirmar con Regina antes de recrear o reasignar tareas para evitar duplicados.

**Terminado cuando:** existe PR o commit específico y un CSV/PDF ficticio revisable; los filtros y permisos coinciden con pantalla; los cambios de teclado se prueban abriendo y cerrando un modal real.

## 5. S8-12 — Supabase, alojamiento de API y despliegue

**Responsables sugeridos:** Luis y Regina; Karim apoya migraciones. **Prioridad:** preparar en paralelo, habilitar uso general al terminar los recorridos incluidos.

### Arquitectura inicial propuesta

Mantener `React → API Express → PostgreSQL en Supabase`. Usar Storage para archivos cuando se complete su integración. No introducir acceso directo desde React a todas las tablas ni sustituir de golpe la autenticación actual por Supabase Auth. La identidad de Ticket Trade y sus cookies no se convierten automáticamente en identidades `auth.uid()`.

La API necesita alojamiento propio o una adaptación explícita a funciones: subir PostgreSQL a Supabase no aloja automáticamente el servidor Express. Decidir el alojamiento antes de configurar dominios. Mantener Vercel para el frontend es compatible con esta separación.

### Preparación y migración

1. Crear un entorno de pruebas de Supabase, separado del futuro uso real. No activar automáticamente facturación ni contratar servicios como parte del código.
2. Revisar versión de PostgreSQL, permisos, funciones, triggers y extensiones del instalador. Crear el esquema `ticket_trade` y aplicar negocio y migración 07 sin alterar los esquemas administrados por Supabase. Las 73 tablas son de negocio; la migración de sesiones añade infraestructura aparte.
3. Ejecutar el instalador con `psql` y la conexión de migración apropiada. No pegar sin adaptación un script con órdenes de `psql`, como `\ir`, en un editor que solo acepta SQL.
4. Aplicar migraciones con un rol de instalación; la API usa un rol limitado. Verificar permisos sobre tablas, secuencias, vistas y funciones. No usar permanentemente la cuenta propietaria/superusuario como usuario de la aplicación.
5. Mantener el esquema de negocio fuera de una Data API pública si solo lo consume Express. Si se expone alguna tabla, definir sus grants y políticas RLS y comprobar accesos permitidos y denegados. La autorización del servidor sigue siendo necesaria.
6. Importar únicamente catálogos, recintos y datos ficticios acordados. No subir credenciales ni archivos personales a semillas o repositorio. Preparar respaldo, restauración y un procedimiento de migración repetible.

### Conexión de la API

- Configurar `DATABASE_URL` y certificados exclusivamente en el entorno privado del servidor; ninguna contraseña ni clave de servicio en variables `VITE_*`.
- Usar TLS con verificación del servidor y configuración compatible con el proveedor. No resolver problemas de certificados desactivando la verificación.
- Elegir conexión directa o pooler de sesión para un servidor persistente según red y límites. Para serverless, evaluar pooler transaccional y limitar el pool por instancia; no copiar sin comprobar el `max: 10` local a muchas funciones.
- Revisar compatibilidad con `options`, `search_path`, zona horaria y prepared statements. El pooler transaccional no conserva estado de sesión entre transacciones; usar configuración transaccional cuando corresponda. Mantener las operaciones que requieren atomicidad en una sola conexión/transacción.
- Las reglas actuales serializan escrituras mediante un bloqueo asesor **transaccional**. Comprobar contención con carga antes de ampliar usuarios; no confundirlo con un bloqueo de sesión ni eliminarlo sin otra garantía de concurrencia.
- Crear un endpoint de salud utilizable por el despliegue y comprobar errores sin exponer consultas, credenciales o documentos. Dimensionar conexiones y límites de peticiones para todas las instancias.

### Archivos y correo

- Separar documentos de identidad privados de carteles públicos. Revisar tipo real, extensión, tamaño, permisos y política de conservación. Guardar metadatos/clave del archivo; no un data URL enorme en cada registro.
- Entregar documentos mediante acceso temporal autorizado. Un cartel público no vuelve público el expediente del solicitante. Las claves de servicio de Storage permanecen solo en servidor.
- Coordinar la creación del objeto con los metadatos de BD: si falla una parte, limpiar o reintentar sin dejar referencias rotas. Definir actualización y eliminación de archivos que ya se usaron.
- Configurar dominio/remitente y proveedor de correo. Añadir reintentos controlados y evitar mensajes duplicados; no incluir documentos sensibles en enlaces permanentes.

### Frontend, dominio y sesiones

- Configurar frontend/API con HTTPS, origen permitido y cookies seguras. Preferir una ruta `/api` bajo el mismo origen mediante proxy cuando el alojamiento lo permita. Si son orígenes distintos, comprobar CORS, cookies y defensa CSRF, no solo login en localhost.
- Provisionar cuentas operativas sin contraseñas universales y rotar las credenciales de desarrollo que hayan aparecido en ramas anteriores.
- Habilitar el modo API solo para un conjunto coherente de módulos conectado: no leer eventos de PostgreSQL y seguir confirmando reservas locales como si fueran remotas.
- Mostrar errores, carga y conflictos; conservar formularios recuperables y filtros de interfaz. Desactivar accesos de demostración en el entorno de uso real y separar sus datos.
- Ejecutar procesos de plazos/avisos en servidor mediante un trabajo programado autenticado. No dejarlos exclusivamente en efectos de React.

### Criterio para publicar el entorno compartido

Comprobar dos cuentas y dos dispositivos: registro/login; solicitud con archivos; revisión; publicación; reserva simultánea; recuperación del pase; entrada única por actividad; cancelación; consulta posterior al reinicio. Comprobar además un usuario sin permiso, API caída y archivo privado. Hacer una restauración de prueba y registrar migración, versión desplegada y forma de volver a la versión anterior sin perder datos.

Referencias oficiales consultadas el 8 de noviembre de 2026:

- [Conexión, poolers, TLS y límites](https://supabase.com/docs/guides/database/connecting-to-postgres).
- [RLS y esquemas expuestos](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Control de acceso de Storage](https://supabase.com/docs/guides/storage/security/access-control).

## 6. Orden y reparto para no pisarse

| Orden | Trabajo | Dependencia |
|---|---|---|
| 1 | Acuerdos del modelo y ambiente Supabase de pruebas | Permite preparar módulos sin modificar reglas a escondidas. |
| 2 | Luis: A y B. Regina/C: lectura completa y taquilla. D: adaptador del lector/historial. | Contratos y datos ficticios comunes. Cada módulo tiene su router/servicio y pruebas propias. |
| 3 | Integrar archivos, revisión y publicación con reservas y pase | Necesita módulos anteriores completos. |
| 4 | Check-in compartido, cancelaciones y cambios coordinados | Necesita cupos y accesos remotos. |
| 5 | Habilitar despliegue compartido; comprobar de extremo a extremo | No sustituirlo por que la compilación sea correcta. |

Luis mantiene la propiedad de los cambios en los contextos comunes y el montaje central de rutas. Cada persona entrega el módulo completo en archivos acordados; no todos modifican DatosContexto.tsx simultáneamente. Extraer servicios conforme se conecta cada operación, reutilizando `http.ts` y los contratos existentes; no hacer un refactor masivo paralelo a toda la integración.

Hugo, Horacio y Rodrigo pueden terminar sus tareas pequeñas independientes. No asignarles la transacción completa de reservas o el modelo de permisos sin acompañamiento. CSV y PDF pueden avanzar sin esperar al despliegue si se confirma quién los toma.

## 7. Qué debe quedar demostrado al cerrar

- [ ] Las reglas pendientes están acordadas y la documentación funcional coincide.
- [ ] Las escrituras habilitadas pasan por API y PostgreSQL, sin éxitos locales de respaldo.
- [ ] Una cuenta no consulta ni modifica expedientes, eventos o accesos ajenos.
- [ ] No se confirma dos veces el mismo lugar ni la misma entrada.
- [ ] El pase conserva las actividades elegidas y los estados independientes.
- [ ] Archivos y correos funcionan realmente con permisos y vencimientos.
- [ ] Hay evidencia concreta en Jira: commit propio, alcance y resultado visible, sin atribuir auditorías a implementaciones inexistentes.
- [ ] El entorno Supabase/API/frontend compartido está comprobado o está marcado explícitamente como pendiente.

Wallet, validación offline, cifrado/firma de QR con secretos en el navegador, interpretación automática de itinerarios, una reescritura con otro ORM y un sistema general de auditoría no son requisitos para completar esta conexión. No añadirlos para llenar el sprint. El QR opaco y su validación atómica en servidor son la prioridad.
