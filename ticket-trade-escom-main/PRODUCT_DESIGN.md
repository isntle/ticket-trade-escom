# DOCUMENTO DE DISEÑO DE PRODUCTO — TICKET TRADE
**Materia:** Análisis y Diseño de Sistemas  
**Institución:** Escuela Superior de Cómputo (ESCOM) — Instituto Politécnico Nacional  
**Etapa:** Prototipo de Alta Fidelidad para Validación Docente y de Usuarios  

---

## 1. Arquitectura de Información y Modelo Conceptual

Ticket Trade no es un SaaS genérico ni una réplica de una boletera comercial; es una solución orientada a las necesidades académicas, operativas y de aforo de ESCOM.

### 1.1 Jerarquía Conceptual de Entidades
```text
[Usuario Institucional] (Alumno, Profesor, Administrativo, PAE, Externo)
       │
       ▼ (Si requiere organizar un evento)
[Solicitud de Evento] ──(Revisión / Autorización)──► [Subdirección]
       │                                                   │ (Eventos directos)
       ▼ (Autorizada)                                      ▼
    [Evento]
       │
       ├──► 1..N [Fechas de Sesión Independientes]
       │            │
       │            ├──► Exactamente 1 [Recinto] (Auditorio, Sala 14, Lab)
       │            │       ▲
       │            │       └── [Bloqueos de Mantenimiento / Actividad Oficial]
       │            │
       │            ├──► 1..N [Borradores de Arreglo de Lugares]
       │            │       │
       │            │       └──► Exactamente 1 [Versión Final Inmutable] (1:1)
       │            │
       │            └──► [Checklist de Publicación Verificado]
       │
       ▼ (Publicación)
[Motor de Taquilla] 
       │
       ├── Modalidad 1: Acceso Libre (Aforo físico en puerta, sin boleto)
       ├── Modalidad 2: Registro de Asistencia (Estimación de interés, sin asiento)
       └── Modalidad 3: Acceso Controlado (Mapa interactivo, asiento, QR y Check-in)
             │
             ├── Apartado Temporal (10 minutos con cronómetro)
             ├── Confirmación sin costo / Sin pasarelas de pago
             └── [Boleto Digital QR]
                   │
                   ▼ (Día del Evento)
             [Escáner Staff de Check-in] ──► [Mapa de Ocupabilidad en Vivo]
```

---

## 2. Decisiones de UX / UI Clave

1. **Diseño Visual Claro (Light-Mode Primario):**  
   Basado en la retroalimentación docente, la interfaz prioriza el modo claro con contrastes WCAG AA para garantizar máxima legibilidad en proyectores de auditorios y aulas de ESCOM. El acento institucional guinda (`#7a132b`) se utiliza con moderación en puntos focales de interacción (botones primarios, selección de asientos, barras activas).

2. **Diferenciación entre Evento y Fecha (No son sinónimos):**  
   Un congreso de 3 días no comparte un único aforo ni una única sala. Cada fecha tiene su horario, sus ponentes, su recinto asignado y su versión de butacas propia.

3. **Separación de las Dos Dimensiones del Evento:**  
   - **Dimensión A (Visibilidad):** Público / Interno IPN / Privado con clave.
   - **Dimensión B (Modalidad de Asistencia):** Acceso Libre / Registro de Asistencia / Acceso Controlado.  
   Esta separación previene que los eventos privados se confundan con eventos de pago o que los eventos abiertos requieran indebidamente una butaca numerada.

4. **Principio de "Cero Pasarelas de Pago":**  
   Ticket Trade es una herramienta politécnica institucional. No existe carrito, cobros de servicio, ni solicitud de tarjetas de crédito. La acción final es unívocamente *"Confirmar reservación"*.

5. **Editor de Arreglos vs. Mapa de Asistente vs. Mapa de Ocupación:**  
   El mismo componente visual base (`SeatMap`) evoluciona de manera natural según la fase:
   - *Organizador:* Permite categorizar (Asistente, VIP, Organizador, Staff), bloquear asientos y eliminar lugares modulares (Sala 14).
   - *Asistente:* Muestra disponibilidad, asientos ocupados, lugares bloqueados y apartado temporal.
   - *Staff de Entrada:* Muestra en verde los asistentes que ya pasaron por el escáner, en azul los que faltan por llegar y en ámbar los invitados VIP.

6. **Check-in Mobile-First con Auditoría:**  
   Diseñado específicamente para ser utilizado desde la pantalla de un teléfono inteligente por el personal de apoyo, con retroalimentación visual contundente (pantalla completa verde para éxito, roja para rechazo) y botón inmediato para escanear el siguiente boleto sin recargas.

---

## 3. Matriz de Requerimientos vs. Propuestas de Diseño

| Requerimiento / Entrada Docente | Decisión en el Prototipo | Justificación |
| :--- | :--- | :--- |
| **No inventar un actor para cada variante de usuario** | Cuenta base institucional con selector de capacidades dinámicas. | Alumnos y profesores son variantes de un mismo usuario que pueden ser asistentes o promover solicitudes de evento. |
| **Subdirección como perfil operativo** | Dashboard operativo con dictaminación de solicitudes, creación directa de eventos y gestión de bloqueos. | Evita crear perfiles redundantes como "Coordinador" y distingue la operación del rol técnico de TI. |
| **Regla de anticipación (1 semana)** | Detección automática en selector de fecha. Si es &lt; 7 días, se advierte y habilita el bloque obligatorio de *Justificación Excepcional*. | No bloquea el sistema ante imprevistos válidos, pero somete la decisión extraordinaria a Subdirección. |
| **Margen de 30 minutos entre eventos** | Motor de disponibilidad `checkVenueAvailability` que valida ocupaciones con buffer de ±30 minutos. | Evita colisiones de logística y permite el desalojo del recinto. |
| **Relación 1:1 Fecha ↔ Versión Final** | Cada fecha de sesión debe tener exactamente una versión final confirmada antes de permitir la publicación. | Asegura que la taquilla no abra boletos para un recinto cuya distribución física aún no está cerrada. |
| **Auditorio (fijo) vs Sala 14 (flexible)** | Auditorio no permite borrar butacas (solo bloquear); Sala 14 permite remover módulos de sillas. | Refleja la arquitectura física real documentada en el Sprint 1. |
| **Laboratorios de Cómputo** | Modelo extensible con tipo `laboratorio` y estaciones de trabajo (`M1-E1`, etc.). | Deja el sistema listo para extenderse a laboratorios sin necesidad de rediseñar la base de datos. |

---

## 4. Decisiones que son Propuestas de Diseño del Equipo

1. **Temporizador de Apartado de 10 Minutos:**  
   Al seleccionar una butaca, se aparta temporalmente para evitar colisiones entre usuarios concurrentes (*Seat Race*), con liberación automática al vencer el tiempo.
2. **Lista de Espera Proporcional:**  
   Cuando un evento controlado alcanza el 100% de aforo, los asistentes pueden incorporarse a una fila virtual con número de turno garantizado.
3. **Barra Flotante de Demostración (Scenario Quick-Runner):**  
   Permite al profesor o evaluador navegar directamente a los 7 escenarios de evaluación sin configuraciones complejas ni pasos previos manuales.
4. **Acceso a Eventos Privados por Clave:**  
   Los eventos privados se excluyen del catálogo público y se desbloquean mediante parámetro de URL (`?key=...`) o caja de ingreso de clave institucional.

---

## 5. Puntos Pendientes de Validación Docente

Los siguientes puntos fueron identificados durante el análisis y han sido implementados mediante parámetros configurables, a la espera de la retroalimentación final de la profesora:

1. **Límite de solicitudes activas por usuario:** Se dejó abierto en el prototipo; requiere validarse si un alumno podrá tener un número máximo de eventos simultáneos en trámite.
2. **Procedimiento formal de cancelación de butacas por el asistente:** Implementado con confirmación seria y liberación a lista de espera; pendiente validar la ventana de tiempo límite permitida antes del evento (e.g. hasta 2 horas antes).
3. **Validación de aforo para Laboratorios de Cómputo:** Pendiente determinar con los jefes de laboratorio si el aforo debe contemplar solo computadoras operativas o también lugares para oyentes con laptop personal.
4. **Mecanismo de asignación de Staff a eventos:** Actualmente se simula la asociación del personal de apoyo al evento; pendiente definir si el organizador o Subdirección invita al staff mediante correo electrónico o lista preaprobada de servicio social.
