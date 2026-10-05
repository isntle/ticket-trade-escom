# Revisión de Diseño y Auditoría de Producto — Ticket Trade ESCOM IPN
**Materia:** Análisis y Diseño de Sistemas  
**Entrega:** Segunda Pasada Obligatoria — Refinamiento y Auditoría

---

## 1. Problemas Detectados en la Primera Versión
1. **Asunción errónea de que todo recinto tiene "asientos":** La arquitectura inicial modelaba exclusivamente butacas tipo auditorio, dificultando la integración de Laboratorios de Cómputo (estaciones de trabajo) y Salas Modulares flexibles.
2. **Ausencia de clases académicas en laboratorios:** No se consideraba que los laboratorios tienen clases docentes regulares asignadas, las cuales representan ocupaciones reales que no pueden cancelarse arbitrariamente por un evento.
3. **Bloqueo rígido en el editor ("Arreglo congelado"):** La confirmación de versión final bloqueaba de forma absoluta la interacción sin proveer una vía ágil para que el organizador desactive el candado y refine la distribución antes de publicar.
4. **Residuos de interfaz no justificados:** Elementos de navegación redundantes en el pie de página y componentes con apariencia de plantillas SaaS en lugar de un sistema universitario específico de ESCOM.
5. **Falta de catálogo estructurado de mensajes:** Los textos de error y validación estaban dispersos y sin códigos estándar de trazabilidad para el reporte de análisis.

---

## 2. Cambios Realizados
1. **Unificación conceptual bajo la entidad "Lugar":**
   - **Auditorio:** Lugares fijos (Fila, Número, pasillo central, escenario).
   - **Sala 14:** Lugares modulares flexibles (posiciones reconfigurables, módulos que se pueden suprimir).
   - **Laboratorios de Cómputo:** Estaciones de cómputo numeradas (PC01..PC36), distribuidas en hileras de mesas frente al estrado del profesor.
2. **Integración completa de Laboratorios con Horarios de Clase:**
   - Se incorporaron los Laboratorios 1, 2 y 3 con capacidades reales de 36 estaciones cada uno.
   - Las clases docentes regulares actúan como ocupaciones formales que generan conflicto explícito ("Existe una clase de Sistemas Distribuidos de 10:30 a 12:00").
   - Se ofrecen 3 acciones claras: elegir otro horario, ver disponibilidad del día o cambiar de recinto.
3. **Agenda Multi-Recinto de Subdirección orientada a la toma de decisiones:**
   - Matriz comparativa de disponibilidad simultánea entre Auditorio, Sala 14 y Laboratorios 1, 2 y 3.
   - Diferenciación visual y semántica entre Evento, Clase regular, Actividad institucional y Bloqueo por mantenimiento.
4. **Descongelamiento y edición fluida de arreglos:**
   - Posibilidad de alternar entre "Versión Final" y "Modo Edición" con un clic, manteniendo visible la paleta de herramientas (Asistente, VIP, Organizador, Staff, Bloqueado).
5. **Catálogos formales de ingeniería de software:**
   - `docs/MESSAGE_CATALOG.md` y `src/dominio/mensajes.ts` con códigos normalizados (`MSG-AUTH-XXX`, `MSG-VENUE-XXX`, `MSG-EVENT-XXX`, `MSG-ARR-XXX`, `MSG-BOOKING-XXX`, `MSG-CHECKIN-XXX`).
   - `docs/INTERFACE_CATALOG.md` vinculando cada pantalla (`UI-01` a `UI-61`) con sus casos de uso.
   - `docs/STATE_CATALOG.md` con los ciclos de vida unificados de Solicitud, Evento, Arreglo, Lugar y Boleto.
6. **Apego estricto a la regla visual 60-30-10:**
   - 60% superficies limpias (blanco y grises cálidos institucionales).
   - 30% tipografía legible, bordes neutros y navegación.
   - 10% acento guinda Politécnico (`#7a132b`) reservado estrictamente para acciones primarias y elementos activos.

---

## 3. Decisiones Basadas en Retroalimentación de la Profesora
1. **Cero cancelación automática de clases:** Un evento programado en laboratorio NO puede desplazar una clase por sistema. Si existe una necesidad extraordinaria, se marca como conflicto y se remite a Subdirección para análisis administrativo.
2. **Prototipado exhaustivo de caminos alternativos:** Cada flujo cuenta con interfaz para situaciones anómalas (anticipación menor a 7 días, colisión de asientos por concurrencia, intento de ingreso con boleto ya utilizado, tiempo de apartado de 10 min agotado).
3. **Eliminación del inventario innecesario en laboratorios:** Se descartaron especificaciones de hardware (RAM, discos, números de serie); la computadora en Ticket Trade importa exclusivamente como estación física disponible para la actividad.
4. **Identificadores estables de interfaz (`UI-XX`):** Permiten al docente y evaluador contrastar directamente el documento de casos de uso con las vistas del prototipo navegable.

---

## 4. Puntos que Todavía Necesitan Validación con el Cliente
1. **Políticas de tolerancia en acceso a laboratorios:** Definir si los alumnos inscritos que no lleguen en los primeros 15 minutos pierden su estación asignada para dar paso a la lista de espera de alumnos presenciales.
2. **Firmas electrónicas en dictamen de Subdirección:** Evaluar si en etapas posteriores al Sprint 1 se requerirá firma digital institucional en los oficios de rechazo o autorización de recintos.
3. **Límite de eventos concurrentes por usuario:** Determinar si un estudiante puede apartar lugares en dos eventos diferentes si los horarios se traslapan parcialmente.
