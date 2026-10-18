# Catálogo Unificado de Estados del Dominio — Ticket Trade ESCOM IPN
**Materia:** Análisis y Diseño de Sistemas  
**Alcance:** Definición formal y exhaustiva del ciclo de vida de cada entidad para evitar inconsistencias terminológicas.

---

## 1. Entidad: Solicitud de Evento (`SolicitudEvento`)
Representa el trámite formal de reserva de recintos y autorización de evento gestionado ante la Subdirección.

- **`borrador`**: El solicitante está integrando los datos preliminares del evento y fechas requeridas. Aún no visible para Subdirección.
- **`en_revision`**: Radicada formalmente ante Subdirección para análisis de aforo, viabilidad y pertinencia académica.
- **`autorizada`**: Dictamen favorable emitido por Subdirección. El evento se crea automáticamente en estado `configuracion` en el panel del organizador.
- **`rechazada`**: Dictamen desfavorable emitido con motivo formal obligatorio (e.g., empalme no subsanable, aforo incompatible).
- **`cancelada`**: Retirada voluntariamente por el solicitante antes de su dictaminación.

---

## 2. Entidad: Evento (`Evento`)
Representa la actividad académica o institucional programada en las instalaciones de ESCOM.

- **`configuracion`**: Evento aprobado en preparación por el organizador (asignación de ponentes, edición de lugares por fecha, checklist pre-publicación).
- **`publicado`**: Evento formalmente expuesto en cartelera con fechas y versiones finales de lugares congeladas para taquilla.
- **`cancelado`**: Actividad suspendida formalmente por causas de fuerza mayor.
- **`finalizado`**: Actividad completada; boletos archivados para estadísticas de asistencia.

---

## 3. Entidad: Arreglo de Lugares (`ArregloLugares` / `ArregloAsientos`)
Representa la distribución geométrica y funcional de lugares (butacas en Auditorio, módulos en Sala 14, estaciones de cómputo en Laboratorios) para una fecha específica.

- **`borrador`**: Disposición en diseño. El organizador puede asignar categorías (Asistente, VIP, Organizador, Staff) o bloquear lugares libremente.
- **`bloqueado`**: Arreglo inhabilitado temporalmente para revisiones operativas.
- **`version_final`**: Distribución congelada oficialmente con correspondencia estricta 1:1 por fecha. Requisito ineludible para publicar el evento en taquilla.

---

## 4. Entidad: Lugar (`Lugar` / `ConfiguracionAsiento`)
Representa la unidad básica de ubicación física en un recinto (Asiento fijo en Auditorio, Posición modular en Sala 14, Estación de cómputo en Laboratorio).

- **`disponible`**: Lugar libre para ser seleccionado en taquilla por la comunidad politécnica.
- **`apartado`**: Bloqueado temporalmente (10 minutos) mientras el usuario confirma su registro sin realizar ningún pago.
- **`reservado`**: Asignado formalmente a un usuario con boleto digital QR emitido.
- **`ocupado`**: El asistente ha ingresado al recinto físicamente y su código QR fue validado en puerta por el Staff.
- **`bloqueado`**: Inhabilitado por logística del evento (consola técnica, cableado audiovisual, cámara de video o equipo de servidor).
- **`clase`**: (Exclusivo en laboratorios) Estación reservada u ocupada por horario de clase regular docente.

---

## 5. Entidad: Boleto Digital (`BoletoDigital`)
Credencial digital intransferible con código QR generada para el acceso al recinto.

- **`valido`**: Emitido y vigente. Listo para ser escaneado por el Staff en la puerta del recinto.
- **`utilizado`**: Ingreso verificado por el personal de acceso. Registra fecha, hora y operador que autorizó el ingreso. Si se intenta volver a escanear, genera alarma inmediata de fraude/duplicidad.
- **`cancelado`**: Anulado por el usuario antes del evento. El lugar asociado es liberado inmediatamente para la lista de espera.
