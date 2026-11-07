# Diferencias que hay que resolver antes de migrar todo el frontend

La estructura SQL reproduce las **73 tablas y sus campos del HTML recibido**, sin añadir campos de anteriores versiones. Las restricciones concretan sus reglas. Esto permite construir y probar la base; no significa que el frontend antiguo pueda conectarse directamente sin adaptadores ni decisiones.

| Punto | HTML final | Código actual / acción necesaria |
|---|---|---|
| Afiliación de empleados | RolRegistro solo Estudiante, Externo y Empleado del IPN | Usuario.afiliacion distingue profesor, administrativo y pae. El modelo no almacena esa distinción. Acordar si se conserva mediante un dato adicional o si el frontend muestra Empleado del IPN. No reconstruirla a partir del RFC. |
| Visibilidad | Público/Privado | El frontend también usa interno. No convertir silenciosamente un evento interno en público; aprobar un valor Interno en el catálogo o retirar esa opción explícitamente antes de migrar. |
| Categorías históricas | Congreso, Conferencia, Taller, Hackatón, Otro | El código conserva Académico, Cultural, Institucional. Mantenerlas como valores históricos del catálogo si van a migrarse o acordar clasificación evento por evento. El instalador no altera el catálogo del HTML a escondidas. |
| Categorías de lugares | Asistente, VIP, Staff, Bloqueado | El frontend tiene organizador y sin_definir y banderas de eliminado/bloqueado. Decidir si organizador se integra en Staff y qué estados son solo preparación de UI. No borrar asientos reservados al convertir. |
| Datos del recinto | Nombre, descripción, número de salón, aforo, croquis, accesorios y lugares | Se quitaron código/ubicación/activo/permiteEliminarLugares. El adaptador puede usar el ID como identificador visible y TipoRecinto para reglas de Sala 14; no recuperar texto de ubicación que se eliminó del modelo. Deshabilitar un recinto se expresa por BloqueoRecinto. |
| Estados del evento | Borrador, Publicado, Cancelado | En curso/finalizado pueden calcularse con fecha/hora de las actividades vigentes. configuracion debe tratarse como fase de UI o acordarse si necesita persistencia propia. No volver a crear un catálogo grande automáticamente. |
| Cierre de inscripciones | Ya no existe estado ni fecha de cierre | El frontend conserva aperturas/cierres manuales. Adaptarlo a la regla vigente: mientras haya cupo y la actividad siga habilitada. No recuperar esos campos como requisito accidental de la conexión. |
| Programa/ponentes/etiquetas | No hay tablas de ponentes ni JSON de programa ni etiquetas | Se conserva la actividad estructurada y el itinerario por evento/día. Mantener información antigua como archivo de itinerario si procede; no descartar el texto sin revisar la migración. |
| Interés | Evento.total_senales_interes, contador global | El frontend guarda RegistroIntencionAsistencia por usuario/actividad. El contador no permite saber quién marcó interés ni deduplicar por persona. Si se quiere conservar esa función personal, hace falta acordar una relación; no afirmar que se recupera mediante SQL sin almacenar sus datos de origen. |
| Espera | AvisoDisponibilidad: una petición por cuenta/actividad, sin reserva | No equivale a la lista de espera con posiciones y ofertas de 10 minutos que existe en el código. Decidir si se sustituye ese recorrido por el aviso simple o se amplía el modelo. No inventar equivalencias. |
| Historial de escaneos | EntradaOrdinaria y EntradaEspecial guardan éxitos | No almacena intentos rechazados/cancelados/códigos desconocidos. Si el historial completo sigue en alcance, necesita persistencia adicional aprobada. Las vistas del paquete no fabrican filas de rechazo. |
| Perfil y seguridad | Cuenta contiene los campos expresos del HTML | No hay foto de perfil, fecha de registro ni datos para todos los bloqueos/reintentos del frontend. Reintentos de autenticación pueden ir a un almacén de seguridad del backend; si se desean persistir foto/registro/restricciones documentales, hay que acordar dónde. |
| Verificación | Regla del HTML: máximo tres envíos por cuenta/periodo y uno pendiente | En mensajes previos se habló de tres rechazos. Este DDL sigue el HTML: cuenta envíos. Alinear la pantalla y el Word antes de activar el flujo; no son la misma regla. Comprobante de horario debe tratarse como constancia de estudios si esa es la categoría documental acordada. |
| Fechas y contactos obligatorios | El último HTML exige título, descripción, contactos, categoría, visibilidad, cartel y actividad al enviar/publicar | El frontend anterior dejaba algunos contactos/cartel opcionales. Un envío debe validarse con esta regla antes de llamar a la API. El borrador admite NULL en los campos que el HTML permite; la Actividad siempre necesita su fecha/recinto/horario. |
| Historiales y versiones | Se eliminaron historiales generales; permanecen resoluciones y contadores version_edicion/version_revisada | No hay almacenamiento para reconstruir todas las versiones anteriores de cualquier evento. No ofrecer ese historial remoto como ya conectado. Los contadores sí permiten detectar una edición desactualizada. |

## Tratamiento de horarios informativos

ActividadInterna y DiaActividadInterna son información para revisar solicitudes. Una coincidencia con clases no genera un bloqueo automático. Se mantienen separadas las ocupaciones por eventos aprobados y los bloqueos reales. La API y Subdirección deben revisar estos últimos al autorizar, sin convertir las clases informativas en reservas permanentes.

## Qué decidir primero

Antes de una migración completa, resolver afiliación del empleado, visibilidad interna, categorías de lugares, interés personal, espera e historial completo de escaneos. Son diferencias de información o reglas, no fallos de sintaxis que se arreglen cambiando un nombre en el SQL. Ninguna se corrigió alterando el HTML recibido sin avisar.

Se puede empezar entretanto con la consulta de recintos/eventos/actividades y el CSV local, aplicando los contratos descritos. Este paquete no conecta ni cambia el comportamiento de la aplicación desplegada.
