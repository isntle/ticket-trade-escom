# Revisión del Sprint 3 y correcciones de interfaces

Fecha: 17 de octubre de 2026.

Estado actualizado de publicación: main remoto está en `4fc51f0b2c3fd8d7a0250d0f46e994322080ec95`. Además de `b0c3e80`, se publicaron `d31fd42` (cartel al autorizar, vista previa y consulta de eventos anteriores; evidencia adicional para #54 y parcial de #56) y `4fc51f0` (confirmación de correo de demostración y cuentas de estudiante; CU-ID02). GitHub atribuye ambos a isntle y Vercel reporta despliegue completado. Los commits `c842e52`, `6f8aecd` y el avance anterior de A `d8a8b4e` siguen excluidos de main.

La copia limpia usada para esta publicación es `work/ticket-publicacion-SMHmlj`, basada directamente en `b0c3e80`. La carpeta `ticket-retro-0biSkB` conserva la comparación local y cambios que ya tienen equivalentes publicados: no interpretar todo su diff como trabajo nuevo sin publicar. El ajuste puntual de CU-ID02 contiene únicamente su enlace de confirmación; no incluye el catálogo general de #51 ni el navbar de #55.

Se contrastaron el documento “SPRINT03_TICKET_TRADE - Copy.docx”, las observaciones de clase y el código. Para B, C y D se usó como base main remoto en ceee6503fcb096e5a48610f503c8b707b48f8b70. Para A se revisó además el avance local d8a8b4e en la carpeta ticket_t3. Ese avance de A no forma parte de los commits nuevos.

La publicación se indica en la actualización anterior. La auditoría inicial de A, C y D no modificó sus módulos. La navegación a una pantalla no acredita todas las condiciones del caso de uso, ni los requisitos de servidor.

## Commits locales agrupados

- `b0c3e80` — Completar revisión de solicitudes, fechas y versiones de Organización y recintos. Incluye expediente con vista previa, tarjetas, versiones, decisiones, calendario, validaciones, catálogo y comienzo del editor de distribuciones. Relacionado con #53, #54 y #57.
- `c842e52` — Simplificar navegación, perfiles y textos de Organización y recintos. Incluye navbar, perfiles y nombres claros. Relacionado con #55.
- El tercer commit contiene el catálogo de documentación, sus pruebas y este reporte. Relacionado con #51. La navegación y sus nombres dependen de los dos anteriores; no se propone publicarlo aislado sin comprobar esas dependencias.

La carpeta de revisión es `work/ticket-retro-0biSkB`. Se partió directamente de main remoto sin incorporar los cuatro commits de la carpeta original ni sus nueve cambios locales. Después se publicó únicamente `b0c3e80` por petición de Luis; el avance previo de A permanece en la carpeta original.

## Reglas confirmadas y decisiones pendientes

- El contenido mínimo de la solicitud declara banner y ponentes opcionales. El cartel puede adjuntarse al crear o editar. No se hizo obligatorio.
- No se encontró una obligación expresa de teléfono de contacto, general ni exclusiva para externos. Se conserva el correo de la cuenta como contacto base y se validan los datos adicionales si se capturan. La entidad y evidencia de representación del externo pertenecen al expediente de identidad.
- El expediente de una solicitud se limita al titular, Subdirección y Administración autorizada. El cartel de la solicitud se ve en ese expediente y en su vista previa. El ajuste posterior conserva el cartel al autorizar; el programa estructurado sigue encargado a Rodrigo en #56. El contacto y los documentos no son contenido público.
- El documento vigente asigna evaluación documental al Administrador. Subdirección solicita restricciones y el Administrador decide su aplicación. Esto contradice el avance local de A, que concede ambas operaciones directamente a Subdirección.
- El documento distingue fechas o días de sesiones de asistencia dentro de cada día. No basta con cambiar la palabra “sesión” por “día”: hay una diferencia de modelo que B, C y D deben resolver juntos.
- El Word exige anticipación por 168 horas y nunca admite horarios ya iniciados. Conservar una fecha ordinaria ya enviada no reinicia la anticipación; una fecha nueva sí vuelve a validarse.
- Las solicitudes pendientes no ocupan recintos. Una coincidencia entre propuestas no es una reserva confirmada.
- El envío real de correo queda aplazado por indicación de Luis. Si Jira conserva ese criterio en #57, debe separarse de la aceptación de esta entrega antes de cerrar la tarea.
- La clase pide revisar el caso de jefes de departamento; el Word lo expresa como permiso explícito de autoaprobación administrado sobre una cuenta. No autoriza a deducir ese permiso de la afiliación, del nombre del cargo ni de un correo.

## Cambios locales y tareas

| Tarea | Corrección incluida | Límite |
|---|---|---|
| #54 | Ver detalle en pendientes e historial, vista previa del cartel, itinerario, contacto privado, documentos e historial; comprobación de titularidad y perfil. | No publica automáticamente el cartel ni el programa; corresponde a #56. |
| #55 | Solicitudes, Agenda, Bloqueos de recintos; mejor legibilidad de B; navbar con enlaces principales y selector de perfil dentro del menú de cuenta; retiro de ESCOM-IPN y separador. | Los textos de los módulos A, C y D se entregan como observaciones para sus equipos. |
| #53 | Fechas y horarios futuros, errores rojos, urgencia amarilla con elección expresa, calendario con días pasados deshabilitados, validación al guardar y enviar, resumen antes de enviar y confirmación al salir. Catálogo de recintos real y comienzo del editor sin distribución previa. | No equivale al cumplimiento de todos los requisitos funcionales y no funcionales de B. |
| #57 | Versiones de solicitudes, responsable, momento, valores anteriores/nuevos, decisiones y cancelación. Conservación del envío inicial y comprobación de versión vigente. Destinatario de organizador resuelto a correo. | Sin servidor, correo real ni bitácora central inmutable. |
| #51 | 49 identificadores sin duplicados; 27 asociaciones de B con ruta, control y respuesta; perfiles de demostración y selección de recursos existentes futuros. Cierre del modal al navegar. | Las referencias UI del Word tienen colisiones y referencias UI.XX; no se renumeró el documento ni se declararon completas funciones no verificadas. |
| #56 | La carga de imagen muestra vista previa y el ajuste posterior conserva el cartel al autorizar. | Rodrigo debe implementar el programa estructurado y transferir las actividades al crear el evento autorizado. |

## Pruebas y evidencia de esta entrega

- Pruebas automatizadas de fechas, zona horaria de Ciudad de México, límite exacto de 168 horas, fechas imposibles, capacidad, laboratorios, privacidad, versiones e inventario de casos.
- Verificación de TypeScript y compilación para producción.
- Recorrido local con cuentas de prueba: fecha pasada rechazada al guardar; borrador; envío a revisión; devolución con motivo obligatorio; corrección; reenvío; autorización. El expediente llegó a versión 5 y conservó la fecha de envío inicial.
- Consulta con Administrador: expediente visible, botones de resolución de Subdirección ausentes.
- Se probaron los 27 accesos de B desde el modal. Se encontró y corrigió el editor que terminaba en “Arreglo no encontrado” por no tener primera distribución. Su creación se verificó en la aplicación.
- Se comprobó el resumen previo al envío, el regreso a edición y la advertencia al salir sin guardar. No se envió la solicitud de esa comprobación.
- Resultado final: 11 pruebas aprobadas, TypeScript sin errores y build de producción correcto. Vite mantiene avisos sobre el tamaño del paquete y compatibilidad futura de su configuración; no son errores de compilación.
- Estas pruebas no incluyen envío real de correo, concurrencia entre clientes contra un servidor, cámara física ni la matriz completa de navegadores y dispositivos T09.

## Pendientes de B respecto al documento completo

1. Integrar #56 cuando Rodrigo entregue: actividades estructuradas por día, validaciones, transferencia del programa y presentación pública. La conservación del banner quedó corregida después de la primera revisión y se comprobó con una solicitud de prueba autorizada.
2. Implementar calendario hábil configurable, vencimiento de dos días hábiles, pausa/reanudación durante corrección y tarea de vencimiento. Se conserva el envío inicial, pero no se inventó un calendario institucional ni una tarea de servidor.
3. Resolver con el equipo la configuración de arreglo antes del envío y la publicación atómica al aprobar: el flujo existente todavía crea el evento en configuración. El editor añadido atiende eventos existentes, no sustituye el diseño previo exigido en solicitudes.
4. Completar límites sobre número de fechas y duración originalmente aprobados, correspondencia de asientos al cambiar recinto, y todos los compromisos de apartados, ofertas y boletos especiales al retirar/cancelar.
5. Hacer persistente y versionada la constancia PDF. La función actual abre la impresión del navegador.
6. Completar mantenimiento de galería, reglas de uso y modalidades por recinto. El catálogo muestra la información que existe y no inventa imágenes ni reglas.
7. Consolidar permisos administrativos y la suspensión formal de fechas por bloqueos. La consulta/creación de pantalla no sustituye la operación conjunta descrita por la regla de prioridad institucional.
8. Integrar autorización por recurso, transacciones, reloj oficial, archivos privados y bitácora en servidor cuando se implemente la base del sistema. localStorage no ofrece esas garantías.

## Equipo A — Auditoría del avance local conservado

| Caso | Lo existente | Corrección o comprobación necesaria |
|---|---|---|
| CU-ID01 Registrar cuenta de usuario | Registro institucional/externo y validaciones básicas. | Separar externo asistente de representante solicitante; contrastar dominios y datos exigidos por perfil. Mantener aviso de datos y no asignar facultades por registrarse. |
| CU-ID02 Confirmar correo electrónico | Código de prueba, uso único, vigencia y límites de reenvío. | Tokens criptográficos y entrega controlada por servidor. No tratar mostrar un código en pantalla como confirmación de acceso al correo. |
| CU-ID03 Iniciar y cerrar sesión | Contraseña y bloqueo tras cinco fallos. | Expiración por 60 minutos de inactividad/12 horas absolutas e invalidación real de sesiones previas. |
| CU-ID04 Recuperar y cambiar contraseña | Recuperación y cambio desde perfil. | Mensaje uniforme sin enumerar cuentas, token criptográfico e invalidación de todas las sesiones previas. |
| CU-ID05 Gestionar perfil y cambio de correo | Edición y confirmación del nuevo correo conservando el anterior. | Revisar que cambiar nombre también requiera nueva revisión del solicitante verificado y que se limite la lista de campos modificables. |
| CU-ID06 Gestionar expediente de verificación documental | Selección de archivos, revisión previa y estados. | Solo se conservan nombres, no contenido documental. Validar requisitos según perfil, periodo, antigüedad y vigencia; PDF real, hasta 10 MiB y cinco archivos según T05. |
| CU-ID07 Evaluar expediente y revocar/renovar verificación | Página local de revisión, decisiones e historial. | Cambiar la autorización de Subdirección a Administrador según el Word vigente. Recuperar documentos reales y resolver renovación/revocación con motivo. |
| CU-ID08 Gestionar restricciones y asignación de roles | Roles, restricciones y asociación de Staff. | Separar petición de Subdirección y decisión de Administrador; facultar al Organizador para asignar Staff de sus eventos, no solo al Administrador. Mantener autoaprobación como permiso explícito. |

Los tres formularios de acceso todavía no comparten plenamente el diseño del login en la versión publicada. Revisar registro y recuperación para que conserven la misma estructura visual, tamaño, navegación y comportamiento responsivo. El avance de A sigue local y debe compararse con la rama de la compañera antes de integrarlo.

### Mensaje para el equipo A

Revisen el avance de Identidad y perfiles contra los ocho CU-ID del Sprint 3. En AutenticacionContexto.tsx y GestionIdentidadPagina.tsx corrijan los actores: el Administrador evalúa expedientes y aplica restricciones; Subdirección solo solicita la restricción. El Organizador asigna Staff de sus propios eventos. Revisen también la verificación tras cambiar el nombre, los requisitos documentales por afiliación y la renovación por vigencia. Homologuen AutenticacionPagina.tsx para login, registro y recuperación y prueben a 360, 768 y 1280 px. Conserven los IDs oficiales y documenten controles y trayectorias reales. No sustituyan archivos por versiones antiguas ni integren cambios ajenos. Entreguen su rama y una lista de pruebas para compararla con el avance local antes de unirla.

## Equipo C — Motor de taquilla

| Caso | Pantalla o control existente | Hallazgo o comprobación pendiente |
|---|---|---|
| CU-MT-01 Explorar cartelera y consultar detalle de evento | CarteleraEventosPagina y DetalleEventoPagina. | Separar visibilidad y público permitido, comprobar enlace privado y todas las unidades futuras/canceladas/suspendidas. Programa depende de #56. |
| CU-MT-02 Registrar intención de asistencia | Detalle y registro de intención. | Mantenerlo sin boleto, sin consumo de capacidad ni Check-in; distinguirlo en historial. |
| CU-MT-03 Reservar lugar en sesión | SeleccionAsientoPagina. | El apartado base usa dos minutos; comprobar que no se renueve al recargar y que inventario/traslapes se validen por unidad real de asistencia. |
| CU-MT-04 Participar en lista de espera | ModalListaEspera y BannerOfertaEspera. | Se conservan los 10 minutos desde emisión por indicación posterior de Luis. El Word todavía indica 2 y requiere actualizar esa regla. No prolongarla al abrir el aviso. |
| CU-MT-05 Consultar mis boletos e historial | MisBoletosPagina y ModalBoletoQR. | QR real con qrcode.react y generador aleatorio de 128 bits presentes. Comprobar datos vigentes después de cambio/cancelación y nombre consistente del identificador manual. |
| CU-MT-06 Cancelar reservación activa | ModalCancelarReservacion. | Verificar límite de 24 horas, boleto utilizado, liberación y prioridad de espera. No confundir cancelación voluntaria con institucional. |
| CU-MT-07 Gestionar boletos especiales | GestionBoletosEspecialesPagina. | Unificar “Acreditaciones” con “Boletos especiales”; revisar el paquete, invalidación, límite de emisión y ausencia de titular obligatorio según el Word. |
| CU-MT-08 Gestionar apertura y cierre de inscripciones | GestionInscripcionesPagina. | Probar cierre una hora antes, cierre de apartados/ofertas y preservación de confirmados y orden de espera. No dar por cumplido T10 con limpieza cada 60 segundos. |
| CU-MT-09 Consultar panel de taquilla y participación | PanelTaquillaParticipacionPagina. | Distinguir entradas, asistentes únicos, boletos especiales e intenciones. Verificar alcance por evento y efectos de todos los filtros. |

### Mensaje para el equipo C

Auditen los nueve CU-MT del Sprint 3 usando sus pantallas existentes. Conserven la vigencia de ofertas de espera de diez minutos desde emisión indicada por Luis, sin renovarla al consultar o recargar; actualicen esa regla en el Word. Revisen la separación de día y sesión, visibilidad y público permitido, cancelación voluntaria frente a institucional y conteos del panel. En textos usen “Boletos especiales” de forma consistente en lugar de alternarlo con “Acreditaciones”; expliquen “Inscripciones” con la acción concreta de abrir/cerrar registros. No cambien IDs ni eliminen controles. Conserven qrcode.react y el identificador opaco de 128 bits. Entreguen pruebas de agotamiento, espera, vencimiento, cancelación, cierre, privado y recurso ajeno; coordinen con Rodrigo el programa y los datos del evento.

## Equipo D — Check-in

| Caso | Lo que existe | Falta o límite detectado |
|---|---|---|
| CUCI1 Seleccionar sesión para control de acceso | EscaneoStaffPagina separa selección y lector; filtra por responsable o Staff asignado. | El modelo actual selecciona una fecha, no varias sesiones independientes por día. Probar retirada de asignación con el lector abierto. |
| CUCI2 Registrar entrada mediante código QR | Cámara con ZXing, resultado y validación local. | No se probó cámara física. Faltan confirmación persistente/atómica y reloj de servidor para cerrar los RNF. |
| CUCI2.1 Registrar entrada mediante identificador manual | Captura manual y límite local de 20 inexistentes/minuto por operador. | Falta el límite de 100/minuto por origen y control de servidor. Mostrar siempre “Identificador manual del boleto”, sin alternar con folio o QR. |
| CUCI3 Consultar historial de accesos | Filtros, detalle de solo consulta y totales. | Revisar el alcance de todos los totales al aplicar periodo, operador y tipo; separar intentos rechazados de entradas exitosas. |
| CUCI4 Presentar boleto en el acceso | Mis boletos y QR/identificador. | La consulta no debe registrar entrada. Probar que un boleto cancelado o ya usado muestre su estado vigente. |

Fuera de esos cinco casos, OcupabilidadVivoPagina filtra todos los eventos publicados y no limita sus selectores a los eventos propios o asignados. El Staff puede llegar a datos de otro evento desde el monitor: debe corregirse ese alcance. La página del historial ya limita eventos por Organizador/autoridades, por lo que ambas consultas no son equivalentes.

Textos a simplificar: “Ocupabilidad en vivo” → “Ocupación de lugares”; “Staff técnico” → “Personal de acceso”; “Operador” puede aclararse como “Personal que registró la entrada”; mostrar resultados comprensibles en lugar de valores internos como codigo_no_reconocido. Conservar “sesión” cuando designe la unidad de asistencia oficial, no reemplazarla sin resolver el modelo.

### Mensaje para el equipo D

Revisen los cinco CUCI del Sprint 3, manteniendo selección, lector QR, alternativa manual, historial y presentación del boleto. Corrijan OcupabilidadVivoPagina.tsx: Staff solo consulta eventos asignados y Organizador solo los propios, también al cambiar selectores o parámetros de URL. Revisen los totales del historial con filtros y distingan intentos fallidos de entradas. Simplifiquen los textos indicados y mantengan “Identificador manual del boleto” como etiqueta única. Prueben retirada de Staff con lector abierto, cámara denegada y alternativa manual, código de otra unidad, boleto usado/cancelado y consulta de recurso ajeno. Registren la prueba física de cámara; no la den por realizada porque exista el componente. La atomicidad, el reloj oficial y el límite por origen se resolverán con servidor. Coordinen el modelo de sesiones con B y C.

## Inventario de accesos de B

Los identificadores y nombres proceden del Word. Se conservaron sus referencias UI existentes, que requieren homologación documental por colisiones y referencias provisionales. La ruta es un inicio funcional y puede abrir un recurso de demostración futuro existente del mismo organizador. Si ya no hay recursos adecuados, se vuelve a su panel; no se crean eventos para aparentar cobertura.

| Caso | Nombre | Ruta de inicio | Control relacionado |
|---|---|---|---|
| CU-OR-01 | Preparar borrador de solicitud | `/solicitar-evento` | Guardar borrador |
| CU-OR-02 | Consultar historial de solicitudes propias | `/organizador` | Ver solicitud |
| CU-OR-03 | Revisar y resolver solicitud ordinaria | `/subdireccion` | Ver detalle → Revisar autorización / Pedir correcciones / Rechazar |
| CU-OR-04 | Consultar catálogo y detalle de recintos | `/recintos` | Seleccionar recinto → Consultar calendario |
| CU-OR-05 | Configurar arreglo de asientos | `/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos` | Crear primera distribución / Confirmar versión final |
| CU-OR-06.1 | Enviar solicitud ordinaria | `/solicitar-evento` | Revisar envío ordinario → Enviar a revisión |
| CU-OR-06.2 | Enviar solicitud extraordinaria | `/solicitar-evento?tipo=extraordinaria` | Motivo de urgencia → Revisar envío extraordinario → Enviar solicitud extraordinaria |
| CU-OR-07 | Editar solicitud en revisión | `/organizador/solicitudes/sol-revision-ordinaria-demo` | Editar solicitud |
| CU-OR-08 | Corregir solicitud devuelta | `/organizador/solicitudes/sol-correccion-demo` | Corregir solicitud |
| CU-OR-09 | Cancelar solicitud pendiente | `/organizador/solicitudes/sol-borrador-demo` | Cancelar solicitud → Confirmar cancelación |
| CU-OR-10 | Atender solicitud extraordinaria | `/subdireccion` | Ver detalle → Revisar creación extraordinaria |
| CU-OR-11 | Crear evento propio (Autoaprobación) | `/subdireccion?tab=evento_directo` | Crear evento y continuar |
| CU-OR-12 | Aplicar excepción de anticipación | `/organizador/eventos/evt-simposio-ia` | Guardar fecha, horario o recinto |
| CU-OR-15 | Configurar arreglo del recinto | `/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos` | Crear primera distribución / Confirmar versión final |
| CU-OR-16 | Gestionar versiones de arreglos | `/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos` | Duplicar distribución → Comparar Versiones |
| CU-OR-17 | Establecer versión final del arreglo | `/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos` | Confirmar versión final |
| CU-OR-18 | Consultar constancia operativa | `/organizador/eventos/evt-simposio-ia` | Imprimir constancia operativa |
| CU-OR-19 | Modificar información de un evento aprobado | `/organizador/eventos/evt-simposio-ia` | Revisar cambios → Confirmar cambios |
| CU-OR-20 | Reprogramar fecha u horario de un evento | `/organizador/eventos/evt-simposio-ia` | Guardar fecha, horario o recinto |
| CU-OR-21 | Cambiar recinto de una fecha aprobada | `/organizador/eventos/evt-simposio-ia` | Seleccionar recinto → Guardar fecha, horario o recinto |
| CU-OR-22 | Retirar una fecha o sesión sin compromisos | `/organizador/eventos/evt-simposio-ia` | Retirar día |
| CU-OR-23 | Cancelar evento aprobado | `/organizador/eventos/evt-simposio-ia` | Cancelar evento aprobado |
| CU-OR-24 | Cancelar una fecha o sesión de un evento | `/organizador/eventos/evt-simposio-ia` | Cancelar este día |
| CU-OR-25 | Resolver fecha suspendida por bloqueo institucional | `/organizador/eventos/evt-simposio-ia` | Guardar fecha, horario o recinto / Cancelar este día |
| CU-OR-26 | Administrar catálogo de recintos | `/admin/recintos` | Agregar recinto / Editar recinto |
| CU-OR-27 | Gestionar ocupaciones internas | `/admin/ocupaciones` | Registrar ocupación |
| CU-OR-28 | Gestionar bloqueos institucionales | `/subdireccion?tab=bloqueos` | Registrar bloqueo → Confirmar Bloqueo |
