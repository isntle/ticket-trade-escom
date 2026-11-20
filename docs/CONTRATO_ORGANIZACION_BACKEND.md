# Contrato de Organización y recintos

## Estado de esta entrega

SolicitudEventoPagina usa ServicioOrganizacion para crear, editar y guardar borradores mediante Promises. En modo API, DatosRemotos conecta los comandos al backend y PostgreSQL; el adaptador local se conserva para demostración. La pantalla evita doble envío, indica guardado y conserva datos ante error. La consulta real de disponibilidad requiere el modo API y no se sustituye por un resultado local cuando falla el servidor.

Contratos específicos: [disponibilidad del sprint 8](SPRINT08_DISPONIBILIDAD.md), [calendario y bloqueos del sprint 9](SPRINT09_CALENDARIO_BLOQUEOS.md) y [revisión con alternativas](SPRINT09_DICTAMEN_DISPONIBILIDAD.md).

## Contratos que deben conservarse

- crearSolicitud recibe los datos tipados actuales y devuelve SolicitudEvento con ID y estado efectivamente guardados.
- guardarBorradorSolicitud conserva captura sin comenzar revisión ni reservar recinto.
- actualizarSolicitud recibe ID, cambios, decisión de enviar y versión esperada. Devuelve resultado y error si la versión cambió.
- Las consultas remotas conservan estados de carga/error/vacío y cancelan respuestas obsoletas al cambiar parámetros. La revisión de disponibilidad consulta las actividades persistidas y devuelve su versión, conflictos, clases informativas y alternativas.
- Las decisiones de Subdirección, cambio de recinto y reprogramación deben ser comandos del servidor; no permitir que el cliente actualice sueltas las tablas derivadas.

## Modelo y reglas para PostgreSQL

Conservar entidades evento, actividad, reserva, pase, acceso por actividad, distribución/lugar, solicitud/versiones, expediente/documentos, periodos, jefaturas, bloqueos y bitácora. Un elemento descriptivo del programa no es una actividad reservable. Una fecha puede agrupar varias actividades en recintos diferentes.

Pase: unicidad por evento y titular. Acceso: unicidad por pase y actividad, con estado individual. Mantener alias de códigos antiguos cuando corresponda y titularidad individual de acreditaciones especiales. Las operaciones de reserva y Check-in requieren transacciones y restricciones para no duplicar lugar o consumo; localStorage no sustituye esa garantía.

Validar en servidor sesión, permisos vigentes, versión, disponibilidad, aforo y horario institucional. Un cambio de recinto guarda evento, lugares, reservas, boletos e historial conjuntamente. Un rechazo deja todo intacto. Nunca aceptar idUsuario suministrado como prueba de identidad.

## Archivos y autenticación

Guardar carteles y PDF en almacenamiento de archivos con rutas privadas o públicas según su uso, límites y comprobación de tipo. Evitar persistir indefinidamente data URLs. Correos, documentos e identificadores del solicitante no son información pública de la cartelera.

La cuenta necesita correo. El contacto adicional del evento sigue siendo opcional en la regla actual; cualquier cambio debe ser explícito. Confirmación de correo y aprobación documental son trámites distintos. Secretos SMTP, credenciales de base de datos y claves administrativas nunca se entregan a Vite/React.

## Operaciones y respuestas a acordar

Definir autenticación, respuestas de error de validación, permiso, conflicto y fallo temporal; devolver ID y versión guardados. Añadir clave de idempotencia para operaciones críticas antes de habilitar reintentos automáticos en la red. El puerto actual no implementa esa garantía.

Las clases de laboratorio son informativas para la decisión de Subdirección: se muestran y no impiden automáticamente seleccionar o autorizar un horario. La autorización no elimina ni modifica la clase. Pendientes de producto: confirmar aforos operativos, equipamiento y croquis cuando el catálogo no los refleje; cualquier cambio al acuerdo académico debe coordinarse con el equipo.
