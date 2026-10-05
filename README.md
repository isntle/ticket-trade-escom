# TICKET TRADE — ESCOM IPN
### Sistema de Gestión de Eventos, Recintos, Boletaje Digital y Control de Acceso
**Institución:** Escuela Superior de Cómputo (ESCOM) — Instituto Politécnico Nacional  
**Materia:** Análisis y Diseño de Sistemas  
**Alcance:** Prototipo Web de Alta Fidelidad Funcionalmente Navegable (Sprint 1 & Validación de Requerimientos)

---

## 1. Visión General del Producto

Ticket Trade es una plataforma institucional diseñada para gestionar de manera integral el ciclo de vida de los eventos celebrados dentro de ESCOM, abarcando desde la solicitud de espacios por parte de alumnos, docentes o entidades externas, hasta el control de acceso en puertas mediante boletos digitales con código QR y visualización de ocupabilidad en tiempo real.

El sistema se compone de cuatro subsistemas desacoplados pero interconectados:
1. **01. Identidad y Perfiles:** Cuenta base institucional con capacidades dinámicas (Asistente, Organizador, Staff de acceso, Subdirección y Administrador).
2. **02. Organización y Recintos:** Solicitud, revisión y dictamen por Subdirección, configuración de eventos, administración de fechas independientes, recintos físicos y editor visual de arreglos (butacas) con versiones finales inmutables 1:1 por fecha.
3. **03. Motor de Taquilla:** Cartelera de eventos (Público, Interno IPN, Privado con clave), modalidades de asistencia (Libre, Registro, Controlado), mapa interactivo de selección de asiento con apartado temporal de 10 minutos (sin pagos) y emisión de boleto digital QR.
4. **04. Check-In:** Aplicación móvil para personal de apoyo (Staff) con escáner QR, detección inmediata de boletos válidos, cancelados o reutilizados, y mapa en vivo de ocupabilidad del recinto.

---

## 2. Cómo Ejecutar el Prototipo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en puerto 3000
npm run dev

# Compilar para producción
npm run build

# Validar tipado y sintaxis
npm run lint
```

El servidor local corre en `http://localhost:3000`.

---

## 3. Cuentas y Roles de Demostración

La aplicación incluye un **Selector de Usuario y Rol** en la barra superior (TopBar), permitiendo cambiar de identidad con un solo clic para evaluar las diferentes perspectivas del sistema:

| Nombre | Rol Activo | Afiliación | Identificador | Capacidades Clave |
| :--- | :--- | :--- | :--- | :--- |
| **Mtro. Fernando Silva Reyes** | Organizador | Profesor | Num: `ES-449102` | Gestiona el *Congreso Internacional de IA*, fechas, recintos y arreglos de asientos. |
| **Carlos Mendoza López** | Asistente | Alumno | Boleta: `2022630192` | Explora la cartelera, reserva asientos en Auditorio, consulta boletos QR y solicita talleres. |
| **Dra. Patricia Arriaga R.** | Subdirección | Administrativo | Plaza: `DIR-00281` | Revisa solicitudes ordinarias y excepcionales, aprueba/rechaza, bloquea recintos y crea eventos directos. |
| **Ing. Roberto Gómez Morales** | Staff | PAE | Emp: `PAE-1194` | Escáner móvil de Check-in, auditoría de códigos QR y vista de ocupabilidad durante el evento. |
| **Ing. Héctor Morales Téllez** | Administrador | Administrativo | Plaza: `ADM-9011` | Administración técnica de cuentas, activación/desactivación y asignación de permisos. |
| **Lic. Mariana Torres** | Asistente | Externo | TechCorp México | Solicita eventos con comprobante empresarial y justificación de fechas extraordinarias. |

---

## 4. Arquitectura de Rutas Navegables

```text
/                                   -> Cartelera principal de eventos publicados
/eventos                            -> Catálogo con filtros por categoría y modalidad
/eventos/:id                        -> Detalle del evento, ponentes y desglose por fecha
/eventos/:id/reservar               -> Selección visual de asiento con apartado de 10 min
/mis-reservaciones                  -> Mis boletos QR digitales próximos e historial
/solicitar-evento                   -> Formulario adaptativo de solicitud institucional
/perfil                             -> Perfil y acreditaciones académicas del usuario
/login                              -> Inicio de sesión y presets de cuentas demo
/registro                           -> Registro con boleta, num. empleado o empresa
/recuperar-password                 -> Flujo de recuperación de acceso

/organizador                        -> Panel de organizador: eventos y solicitudes
/organizador/solicitudes/:id        -> Timeline de estado y dictamen de Subdirección
/organizador/eventos/:id            -> Configuración general, fechas y checklist
/organizador/eventos/:id/fechas/:dateId/arreglos -> Editor interactivo de butacas y versiones

/subdireccion                       -> Dashboard operativo: solicitudes, agenda y bloqueos
/staff/checkin                      -> Escáner de boletos QR (Mobile-First)
/staff/ocupacion                    -> Mapa visual de ocupabilidad en tiempo real
/admin                              -> Gestión técnica de usuarios y permisos
```

---

## 5. Recorridos de Demostración Guiados (Barra Flotante)

En la esquina inferior izquierda se encuentra disponible la **Guía de Demostración Oficial**, con botones directos para los 7 escenarios requeridos:

- **Escenario A — Evento Controlado de Punta a Punta:**  
  Solicitud aprobada -> Configurar fechas -> Editor de arreglos -> Confirmar versión final -> Publicar -> Asistente aparta asiento (temporizador 10 min) -> Confirmación sin pago -> Boleto QR emitido -> Staff escanea QR -> Asiento pasa a estado ocupado.
- **Escenario B — Evento Abierto / Registro:**  
  Navegar a *Taller de Python* (Acceso libre) o *Jornadas de Inducción* (Registro de aforo). Se comprueba que no se fuerzan asientos ni códigos QR individuales innecesarios.
- **Escenario C — Evento Privado:**  
  Acceso restringido a la *Sesión de Consejo de Posgrado* mediante enlace directo o clave `POSGRADO-SEC-8820`. El evento no se expone en la cartelera pública.
- **Escenario D — Conflicto de Disponibilidad:**  
  Intentar programar una fecha en Auditorio el 12 de octubre (bloqueo por mantenimiento) o en empalme con otro evento. El sistema muestra la advertencia explícita y la regla de 30 minutos de despeje.
- **Escenario E — Solicitud Excepcional (< 7 días):**  
  En el formulario de solicitud, seleccionar una fecha a menos de una semana. El sistema detecta la situación, advierte al solicitante y habilita el campo obligatorio de *Justificación Excepcional* para revisión de Subdirección.
- **Escenario F — Concurrencia de Asientos (Seat Race):**  
  En el mapa de reservación, pulsar el botón *"Simular concurrencia"*. Se demuestra la liberación automática y notificación si otro usuario toma el lugar.
- **Escenario G — Staff & QR Reutilizado:**  
  En la pantalla de Staff, pulsar el botón de prueba *"Boleto Válido"* (éxito de check-in). Al pulsar *"Boleto Ya Utilizado"*, el escáner lo rechaza con el motivo: *"Este boleto ya fue utilizado previamente"*.
