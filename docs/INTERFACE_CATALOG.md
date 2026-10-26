# Catálogo de Interfaces de Usuario (UI) — Ticket Trade ESCOM IPN
**Materia:** Análisis y Diseño de Sistemas  
**Alcance:** Matriz de trazabilidad entre Interfaces de Usuario (UI), Actores, Objetivos y Casos de Uso (CU).

---

| ID | Nombre de Interfaz | Actor Principal | Objetivo Operativo | Ruta SPA | Casos de Uso Relacionados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`UI-01`** | Inicio de Sesión Institucional | Todos | Acceso con credenciales politécnicas (@ipn.mx). | `/login` | `CU-AUT-01: Iniciar Sesión` |
| **`UI-02`** | Registro y Acreditación | Alumno, Profesor, Externo | Registro y validación formal de afiliación (boleta, no. empleado, convenio). | `/registro`, `/perfil` | `CU-AUT-02: Registrar Usuario`, `CU-AUT-03: Acreditar Perfil` |
| **`UI-03`** | Recuperación de Acceso | Todos | Restablecimiento de credenciales institucionales. | `/recuperar-password` | `CU-AUT-04: Recuperar Contraseña` |
| **`UI-10`** | Cartelera General de Eventos | Asistente, Comunidad | Catálogo navegable con filtros por categoría, recinto y modalidad. | `/`, `/eventos` | `CU-TAQ-01: Consultar Cartelera` |
| **`UI-11`** | Ficha Técnica del Evento | Asistente, Organizador | Detalle descriptivo, ponentes, fechas y acceso privado con clave. | `/eventos/:id` | `CU-TAQ-02: Ver Detalle de Evento` |
| **`UI-20`** | Solicitud Formal de Evento | Organizador | Trámite oficial de evento con selector de fechas, recinto y regla de anticipación. | `/solicitar-evento` | `CU-ORG-01: Solicitar Evento y Recinto` |
| **`UI-21`** | Detalle y Dictamen de Solicitud | Organizador, Subdirección | Consulta del estatus de revisión y motivo formal del dictamen. | `/organizador/solicitudes/:id` | `CU-ORG-02: Consultar Estado de Solicitud` |
| **`UI-30`** | Panel de Organización | Organizador | Gestión centralizada de eventos propios, solicitudes y acceso al editor de lugares. | `/organizador` | `CU-ORG-03: Gestionar Eventos Propios` |
| **`UI-31`** | Configuración y Checklist de Evento | Organizador | Verificación de requisitos previos a la publicación (fechas, recintos, versión final). | `/organizador/eventos/:id` | `CU-ORG-04: Configurar Evento` |
| **`UI-35`** | Editor de Distribución de Lugares | Organizador | Personalización de butacas/estaciones (VIP, Staff, Bloqueo, Módulos). | `/organizador/eventos/:id/fechas/:dateId/arreglos` | `CU-ORG-05: Diseñar Distribución de Lugares` |
| **`UI-36`** | Comparador Visual de Arreglos | Organizador | Comparación lado a lado de dos versiones borrador para toma de decisiones. | Modal en `UI-35` | `CU-ORG-06: Comparar Distribuciones` |
| **`UI-40`** | Taquilla y Selección de Lugar | Asistente | Mapa interactivo, cronómetro de 10 min de apartado y confirmación sin costo. | `/eventos/:id/reservar` | `CU-TAQ-03: Apartar y Reservar Lugar` |
| **`UI-41`** | Mis Boletos Digitales | Asistente | Pases de acceso con código QR, visor de impresión y cancelación voluntaria. | `/mis-reservaciones` | `CU-TAQ-04: Consultar y Cancelar Boletos` |
| **`UI-50`** | Bandeja de Dictamen de Subdirección | Subdirección | Revisión de solicitudes ordinarias y excepcionales con motivos obligatorios. | `/subdireccion` | `CU-SUB-01: Dictaminar Solicitudes` |
| **`UI-51`** | Agenda Multi-Recinto de Ocupación | Subdirección, Organizador | Matriz de disponibilidad cruzada: eventos, clases en laboratorios y actividades. | `/subdireccion?tab=agenda` | `CU-SUB-02: Consultar Agenda Multi-Recinto` |
| **`UI-52`** | Gestión de Bloqueos Extraordinarios | Subdirección | Inhabilitación temporal o indefinida de uno, varios o todos los recintos. | `/subdireccion?tab=bloqueos` | `CU-SUB-03: Administrar Bloqueos` |
| **`UI-53`** | Creación Directa de Evento Oficial | Subdirección | Alta inmediata de ceremonias o eventos institucionales sin solicitud previa. | `/subdireccion?tab=evento_directo` | `CU-SUB-04: Crear Evento Oficial Directo` |
| **`UI-60`** | Escáner de Acceso Mobile-First | Staff de Acceso | Validación de códigos QR en puerta con detección inmediata de boletos ya usados. | `/staff` | `CU-STF-01: Controlar Acceso en Puerta` |
| **`UI-61`** | Monitor de Ocupabilidad en Vivo | Staff, Organizador | Mapa en tiempo real con código de colores (verde en sala, azul reservado, libre). | `/staff/ocupacion` | `CU-STF-02: Monitorear Ocupabilidad en Tiempo Real` |
| **`UI-62`** | Gestión de boletos especiales por actividad | Organizador responsable | Identificar la actividad por nombre, fecha, horario y recinto; emitir, consultar e invalidar sus acreditaciones sin modificar el QR. | `/organizador/eventos/:id/boletos-especiales` | `CU-MT-07` |
| **`UI-63`** | Apertura y cierre de inscripciones por actividad | Organizador responsable | Abrir o cerrar solo las actividades elegidas, confirmar el cambio y consultar su historial en hora institucional. | `/organizador/eventos/:id/inscripciones` | `CU-MT-08` |
| **`UI-64`** | Panel de taquilla y participación por actividad | Organizador responsable | Consultar cupos, reservas, espera y accesos propios de cada actividad; distinguir un pase por evento de sus accesos y de sus titulares únicos. | `/organizador/eventos/:id/taquilla-participacion` | `CU-MT-09` |
| **`UI-70`** | Administración Técnica de Usuarios | Administrador TI | Control de usuarios politécnicos y asignación de permisos del sistema. | `/admin` | `CU-ADM-01: Administrar Cuentas y Roles` |
