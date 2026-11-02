# TICKTRADE-128 — Preparación de Organización y recintos

Fuente: TicketTrade_Modelo_ER (5).html recibido el 1 de noviembre de 2026. modelo-b-referencia.json conserva entidades, atributos y reglas extraídos del archivo sin ejecutar su JavaScript. Es una referencia, no una migración ni una declaración de reglas aprobadas.

## Preparación implementada localmente

src/servicios/contratoOrganizacion.ts define 30 operaciones tipadas (consultas y comandos) y lectura del conjunto de datos de B. adaptarOrganizacionLocal consulta el contexto vigente en cada invocación y devuelve Promises, conserva argumentos/versiones/resultados y propaga fallos. El transporte no reintenta escrituras automáticamente.

src/servicios/organizacionRemota.ts permite proporcionar un contrato explícito de rutas y serializadores por operación. No trae rutas activadas ni cambia silenciosamente el almacenamiento usado por las pantallas. Los nombres de tablas no se convierten automáticamente en endpoints. Cada comando lleva identificador de petición; corresponde al servidor implementar su idempotencia.

identificadorPostgres conserva bigint positivo como cadena hasta el límite PostgreSQL, rechaza números JavaScript y evita redondear identificadores. No transforma IDs locales existentes en IDs de BD. estadoSolicitudDesdeCatalogo traduce Aprobada a autorizada y rechaza estados desconocidos en lugar de asumir éxito. Las claves numéricas de los catálogos se resuelven mediante la API, no se inventan.

La captura y decisiones de solicitudes ya tienen preparación asíncrona local previa. Las demás páginas aún consultan el contexto; este contrato no las convierte mágicamente a consultas remotas. Su migración requiere incorporar estados cargando/error/vacío, cancelación de consultas antiguas y devolución de la versión guardada desde el endpoint acordado.

## Diferencias que requieren acuerdo

| Tema | Frontend actual / modelo recibido | Decisión requerida |
|---|---|---|
| Solicitud inicial | Captura propia / SolicitudEvento apunta a Evento | Confirmar creación de evento borrador y proyección de datos del solicitante; no publicar al crear borrador |
| Autoría | Nombre e ID de actor en llamadas locales | Servidor obtiene actor de sesión y comprueba propiedad/rol; no confía en parámetros del navegador |
| Historial | Valores anteriores/nuevos, responsable y versiones | No hay tabla explícita de historial de edición en el extracto B; definir dónde conservarla antes de conectar |
| Programa | Actividades operativas y programa descriptivo separados | No veo entidad explícita para los renglones descriptivos; acordar persistencia sin convertirlos en actividades reservables |
| Campos obligatorios | Contactos adicionales opcionales / modelo exige contactos y cartel al enviar | Validar regla con responsables; no endurecer frontend solo por el diagrama |
| Cambios de actividad | Frontend modifica versión y sincroniza reservas / BD propone CambioActividadSolicitado | Acordar estados, autorización, pausa de reservas, alcance de cambios y operación atómica |
| Horario de clase | Informativo, decide Subdirección | Conservar acuerdo de la 122 y no convertirlo en conflicto bloqueante al consultar SQL |
| Estados de evento | Hay configuración, en curso, finalizado / catálogo BD Borrador, Publicado, Cancelado | Definir estados derivados por horario y checklist sin perder información |
| Recinto | Capacidad, croquis y lugares existentes | No sustituir distribuciones históricas al cambiar inventario; catálogo operativo actual se conserva |
| Restricciones adicionales | Modelo impide entrada libre en laboratorio y exige fin a las 21:00 | Confirmar contra reglas vigentes antes de aplicarlas como cambio funcional |

## Contrato de red pendiente

Backend debe entregar: URL base, rutas/métodos, sesión por cookie o mecanismo acordado, CSRF cuando aplique, esquemas de respuesta y errores, catálogo de estados, paginación/filtros, versión esperada y versión persistida, archivos públicos/privados e idempotencia. El esquema HTTP de los adaptadores existentes es una propuesta y necesita alineación, no es un backend implementado.

La lectura de UI requiere una proyección con datos de solicitud, solicitante autorizado, evento, actividades, catálogo y archivos accesibles por permiso. Leer tablas crudas no basta para reconstruir SolicitudEvento sin esos joins/campos. No incluir documentos privados en la respuesta pública.

Autorización, traslado de recinto, reprogramación y cancelación deben guardar todos sus efectos en una transacción. Un conflicto 409 conserva captura y motivo; no debe reintentarse sin que el usuario revise la versión. Una propuesta de cambio no ocupa permanentemente el destino.

## Pendiente para cerrar 128

Acordar puntos anteriores; implementar endpoints por el equipo de backend; conectar consultas/páginas restantes mediante el puerto y verificar errores/reintentos con respuestas reales. Conservar pruebas del adaptador local y añadir pruebas de integración de servidor. No dar por terminada ni publicada la conexión mientras solo exista un modelo ER.
