# Catálogo Oficial de Mensajes del Sistema — Ticket Trade ESCOM IPN
**Materia:** Análisis y Diseño de Sistemas  
**Alcance:** Normalización de microcopy, códigos de trazabilidad y respuestas al usuario.

---

## 1. Estructura y Código de Identificación
Cada mensaje del sistema cuenta con un identificador único con prefijo de dominio, severidad semántica (`éxito`, `información`, `advertencia`, `error`), título formal y descripción clara que explica **QUÉ** ocurrió y **CÓMO** resolverlo.

| Código | Módulo | Severidad | Título | Descripción / Acción Sugerida |
| :--- | :--- | :--- | :--- | :--- |
| **`MSG-AUTH-001`** | Identidad | Éxito | Sesión iniciada con éxito | Has ingresado al sistema institucional con tu cuenta politécnica. |
| **`MSG-AUTH-002`** | Identidad | Error | Credenciales no reconocidas | No fue posible iniciar sesión con los datos proporcionados. Verifica tu correo institucional @ipn.mx. |
| **`MSG-AUTH-003`** | Identidad | Error | Boleta politécnica inválida | La boleta de estudiante debe contener exactamente 10 dígitos numéricos (ej: 2022630412). |
| **`MSG-AUTH-004`** | Identidad | Éxito | Acreditación actualizada | Tus datos fueron validados ante el registro institucional y se habilitaron tus facultades de organización. |
| **`MSG-VENUE-001`** | Recintos | Error | Recinto ocupado por evento | El recinto no está disponible en el horario solicitado porque existe otra actividad académica programada. |
| **`MSG-VENUE-002`** | Recintos | Error | Conflicto con horario de clase | Existe una clase programada en este laboratorio durante el horario seleccionado. La clase no se desplaza automáticamente; requiere decisión administrativa. |
| **`MSG-VENUE-003`** | Recintos | Error | Recinto bajo bloqueo institucional | Este espacio se encuentra inhabilitado por disposición oficial de la Subdirección (mantenimiento o actividad oficial). |
| **`MSG-VENUE-004`** | Recintos | Advertencia | Margen de despeje insuficiente | El reglamento de recintos de ESCOM requiere al menos 30 minutos de despeje entre actividades consecutivas. |
| **`MSG-EVENT-001`** | Solicitud | Éxito | Solicitud radicada ante Subdirección | Tu propuesta de evento y solicitud de recinto ha sido registrada para dictamen oficial. |
| **`MSG-EVENT-002`** | Solicitud | Advertencia | Regla de anticipación: trámite urgente | Solicitud registrada con menos de 7 días de anticipación. Requiere justificación extraordinaria obligatoria para Subdirección. |
| **`MSG-EVENT-003`** | Solicitud | Error | Justificación extraordinaria requerida | No se puede enviar una solicitud con menos de 1 semana de anticipación sin justificar el carácter excepcional. |
| **`MSG-EVENT-004`** | Solicitud | Éxito | Solicitud autorizada | El evento fue autorizado por Subdirección y transferido al panel del organizador. |
| **`MSG-EVENT-005`** | Solicitud | Información | Solicitud rechazada | La solicitud fue rechazada formalmente con el motivo registrado por Subdirección. |
| **`MSG-ARR-001`** | Arreglos | Éxito | Versión final confirmada (1:1) | La distribución de lugares para esta fecha ha sido congelada formalmente para publicación en taquilla. |
| **`MSG-ARR-002`** | Arreglos | Advertencia | Modo edición habilitado | El arreglo se encuentra en modo borrador editable. Modifica lugares y vuelve a confirmar la versión final. |
| **`MSG-ARR-003`** | Arreglos | Error | Lugares pendientes de categorizar | No puedes confirmar la versión final todavía. Existen lugares sin definir en la distribución. |
| **`MSG-ARR-004`** | Arreglos | Éxito | Borrador duplicado | Se ha creado una copia editable de la distribución para experimentar con otra disposición. |
| **`MSG-BOOKING-001`** | Taquilla | Información | Lugar apartado (10 min) | Tienes 10 minutos para confirmar tu asistencia. Si expira el cronómetro, el lugar se liberará. |
| **`MSG-BOOKING-002`** | Taquilla | Error | Lugar ocupado por concurrencia | Este lugar acaba de ser seleccionado por otra persona hace unos segundos. Por favor elige otro lugar libre. |
| **`MSG-BOOKING-003`** | Taquilla | Advertencia | Tiempo de apartado agotado | El tiempo límite de 10 minutos ha expirado y el lugar fue devuelto a la disponibilidad general. |
| **`MSG-BOOKING-004`** | Taquilla | Éxito | Reservación confirmada | Tu lugar ha sido asegurado y tu pase digital con código QR está disponible en Mis Boletos. |
| **`MSG-BOOKING-005`** | Taquilla | Información | Reservación cancelada | Tu lugar ha sido liberado para la comunidad y tu código QR fue invalidado en el sistema. |
| **`MSG-CHECKIN-001`** | Check-In | Éxito | Acceso autorizado en puerta | Boleto digital válido. Asistencia registrada en el recinto. |
| **`MSG-CHECKIN-002`** | Check-In | Error | ¡Alerta: Boleto ya utilizado! | Este código QR ya fue presentado previamente a las {hora}. No se permite el reingreso. |
| **`MSG-CHECKIN-003`** | Check-In | Error | Boleto cancelado | El asistente canceló esta reservación previamente desde su perfil. |
| **`MSG-CHECKIN-004`** | Check-In | Error | Código no reconocido | El código escaneado no corresponde a ningún boleto emitido para este evento. |
