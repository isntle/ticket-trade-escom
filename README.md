> Se conserva la estética original de Ticket Trade. El modo conectado utiliza las mismas pantallas y guarda en PostgreSQL. Con `?demo=1` se activan las cuentas y el catálogo de demostración; en modo local aislado (`TT_DEMO_COMPARTIDA=0`) utiliza una **base independiente** de la base normal.
>
> [Guía técnica del backend](backend/README.md) · [Arranque y estado de conexiones](docs/ARRANQUE_Y_ESTADO.md) · [PostgreSQL demo y Supabase](docs/POSTGRESQL_DEMO_Y_SUPABASE.md) · [Conexión en producción](docs/SUPABASE_CONEXION.md).

# TICKET TRADE — ESCOM IPN
### Sistema de Gestión de Eventos, Recintos, Boletaje Digital y Control de Acceso
**Institución:** Escuela Superior de Cómputo (ESCOM) — Instituto Politécnico Nacional  
**Materia:** Análisis y Diseño de Sistemas  
**Alcance:** Aplicación full-stack (React + Vite + Express + PostgreSQL 16/Supabase) con modo local conectado y entorno de demostración aislado.

---

## 1. Visión General del Producto

Ticket Trade gestiona el ciclo completo de los eventos celebrados en ESCOM:
1. **01. Identidad y Perfiles:** Registro institucional, confirmación por correo, carga privada de PDF de verificación documental, revisión por Subdirección, restricciones y notificaciones en campana (`/api/estado`).
2. **02. Organización y Recintos:** Solicitud de eventos (ordinaria y extraordinaria `< 168 h`), validación de disponibilidad y separación de 30 minutos entre actividades, dictamen de Subdirección, distribución de lugares por actividad (Asistente, VIP, Staff, Bloqueado) y publicación.
3. **03. Motor de Taquilla:** Cartelera (Público, Interno IPN, Privado por enlace), modalidades (Libre, Registro sin asiento, Reservación con lugar asignado), mapa interactivo con apartado temporal de **2 minutos**, emisión de boleto digital QR/PDF y avisos de liberación de cupo.
4. **04. Check-In:** Escáner QR y captura manual para personal de acceso (Staff), rechazo de boletos cancelados/reutilizados y mapa de ocupabilidad en vivo.

---

## 2. Arranque Local

### Requisitos previos
- **Node.js** 22+ y **npm** 10+
- **PostgreSQL** 16+ en ejecución (con permisos locales para crear bases si se ejecutará `npm run test:postgres`)

### Variables de entorno requeridas (`.env`)
Copia `.env.example` a `.env` en la raíz del proyecto y configura al menos:

```dotenv
PORT=4000
APP_ORIGIN=http://localhost:3000

# Bases distintas para operación normal y modo ?demo=1 aislado
DATABASE_URL=postgresql://USUARIO:CONTRASENA@localhost:5432/tickettrade
DATABASE_URL_DEMO=postgresql://USUARIO:CONTRASENA@localhost:5432/tickettrade_demo

# Modo conectado a PostgreSQL
VITE_MODO_DATOS=api
TT_DEMO=1
TT_DEMO_COMPARTIDA=0
TT_MOSTRAR_CODIGOS=1
TT_CORREO_ACTIVO=0
```

> Nunca asignes `DATABASE_URL` y `DATABASE_URL_DEMO` a la misma base cuando `TT_DEMO_COMPARTIDA=0`: el backend rechaza la petición con `BASES_NO_SEPARADAS` (HTTP `503`) y la semilla demo bloquea la ejecución.

### Instalación, inicialización de PostgreSQL y levantamiento
```bash
# 1. Instalar dependencias
npm install

# 2. Instalar esquema y migraciones en la base normal (sin cuentas ni eventos semilla)
npm run db:init

# 3. Instalar esquema y sembrar catálogo/cuentas en la base demo
npm run db:demo

# 4. Verificar que ambas bases cumplen con las 73 tablas y 96 relaciones del modelo ER
npm run db:verify
npm run db:verify:demo

# 5. Levantar backend (puerto 4000) y frontend Vite (puerto 3000) juntos
npm start
```

- **Uso normal:** `http://localhost:3000/` (consulta `DATABASE_URL`, cookie `tt_sesion_id`)
- **Demostración:** `http://localhost:3000/?demo=1` (consulta `DATABASE_URL_DEMO`, cookie `tt_sesion_demo`)
- **Arranque en dos terminales (alternativa a `npm start`):** `npm run server` y `npm run dev` por separado.
- **Inspección directa en PostgreSQL:** `npm run db:ver` y `npm run db:ver:demo` (o `npm run db:ver:demo -- Evento`).
- **Cargar únicamente los 5 recintos físicos en base normal:** `npm run db:recintos`.

---

## 3. Pruebas Locales

Todos los comandos se ejecutan desde la raíz del proyecto:

```bash
# 1. Verificación de tipos TypeScript (frontend, backend y pruebas)
npm run lint

# 2. Compilación de producción del frontend (Vite -> dist/)
npm run build

# 3. Suite unitaria y de contratos sin conexión a PostgreSQL (tests/*.test.ts)
npm test

# 4. Suite aislada contra PostgreSQL local (crea y destruye una BD desechable tt_pruebas_*)
npm run test:postgres
```

- `npm test` ejecuta las pruebas unitarias y de dominio; las 11 suites `tests/api-*-postgres.test.ts` se omiten automáticamente si no existe `TT_API_PRUEBAS`.
- `npm run test:postgres` (`backend/scripts/pruebas-postgres.ts`) crea una base temporal `tt_pruebas_<hex>`, instala el esquema desde cero, ejecuta `04_pruebas_integridad.sql`, corre las 11 suites PostgreSQL (autenticación, recuperación, correos, flujos completos, eventos, aislamiento demo/normal, disponibilidad, calendario/bloqueos, distribución, dictamen y notificaciones/bandeja) y elimina la base al finalizar. **No ejecutar contra Supabase remoto.**

---

## 4. Verificación de Despliegue

Antes y después de desplegar (por ejemplo en **Vercel** + **Supabase**):

```bash
# 1. Compilar la función serverless api/index.ts como ESM estricto de Node y verificar su exportación
npm run verify:api
```

El script `scripts/verificar-api.mjs` compila `api/index.ts` con `--module nodenext --moduleResolution nodenext` y verifica que Node importe `api/index.js` sin depender de `tsx`.

### Comprobación de salud y aislamiento
Con el servidor local o el despliegue en línea:

```bash
# Comprobar salud de la API (directo en :4000 o vía proxy en :3000)
curl -sS http://localhost:3000/api/salud

# Comprobar salud en modo demo aislado
curl -sS -H "x-tickettrade-demo: 1" http://localhost:3000/api/salud
```

Respuesta esperada (`HTTP 200`):
```json
{"datos":{"estado":"en_linea","mensaje":"API de Ticket Trade conectada a PostgreSQL correctamente","fecha":"..."}}
```

### Variables de entorno a revisar en producción (Vercel)
- **Conexión y TLS:** `DATABASE_URL` (pooler transaccional puerto `6543`, sin parámetros `sslmode`), `TT_POSTGRES_CA_PEM` o `TT_POSTGRES_CA_FILE` (certificado oficial de Supabase; nunca desactivar TLS).
- **Orígenes y modo de datos:** `VITE_MODO_DATOS=api`, `APP_ORIGIN` (dominio exacto HTTPS) y `APP_ORIGIN_ALIASES` (solo dominios propios separados por coma). Nunca anteponer `VITE_` a secretos de servidor.
- **Demostración / presentación:** `TT_DEMO=1`; si se usa presentación compartida (`TT_DEMO_COMPARTIDA=1`), definir `TT_PRESENTACION_CLAVE` y `TT_PRESENTACION_PASSWORD`. En modo aislado (`TT_DEMO_COMPARTIDA=0`), definir `DATABASE_URL_DEMO` apuntando a un proyecto distinto de `DATABASE_URL`.
- **Correos y cron:** `TT_CORREO_ACTIVO`, `TT_CORREO_CLAVE`, `TT_CORREO_LIMITE_DIARIO`, `SMTP_*` y `CRON_SECRET` (`>= 32` caracteres para `/api/correos/procesar`).

---

## 5. Cuentas de Demostración (`?demo=1`)

Contraseña en modo local aislado: `Password123!`

| Nombre | Perfil | Correo demo | Notas |
| :--- | :--- | :--- | :--- |
| **Fernando Castro Pérez** | Administración | `cuenta1001@example.invalid` | Gestión técnica, usuarios, periodos y bloqueos. |
| **Patricia González Ruiz** | Subdirección | `cuenta1002@example.invalid` | Dictamen de expedientes, solicitudes y agenda. |
| **Roberto Silva Reyes** | Docente / Organizador | `cuenta1003@example.invalid` | Organizador verificado con eventos publicados. |
| **Carlos Méndez Vega** | Estudiante | `cuenta1004@example.invalid` | Cuenta estudiantil inicial sin verificar (boleta `2022630412`). |
| **Mariana Morales Navarro** | Externo | `cuenta1005@example.invalid` | Cuenta externa con expediente pendiente (`Fundación TechMX A.C.`). |
| **Andrea Rangel Gómez** | Staff / Asistente | `cuenta1006@example.invalid` | Personal de acceso asignado al Simposio y cuenta asistente. |
| **Lucía Torres Morales** | Estudiante | `ltorres.demo@alumno.ipn.mx` | Cuenta demo con correo pendiente de confirmación. |

---

## 6. Arquitectura de Rutas Navegables

```text
/                                                  -> Cartelera principal de eventos publicados
/eventos                                           -> Catálogo con filtros por categoría y modalidad
/eventos/:id                                       -> Detalle del evento, actividades e intenciones
/eventos/:id/reservar?dateId=:actId                -> Selección de asiento (apartado de 2 min) o cupo general
/mis-reservaciones                                 -> Mis boletos QR digitales, descarga PDF e intenciones
/solicitar-evento                                  -> Formulario guiado de solicitud institucional
/perfil · /mi-expediente                           -> Perfil, envío y seguimiento de verificación documental
/login · /registro · /confirmar-correo · /recuperar-password -> Acceso y recuperación de cuenta

/organizador · /mis-solicitudes                    -> Panel de organizador: eventos y solicitudes
/organizador/solicitudes/:id                       -> Timeline de estado y dictamen de Subdirección
/organizador/eventos/:id                           -> Configuración general, publicación y logística
/organizador/eventos/:id/fechas/:dateId/arreglos   -> Distribución de lugares por actividad (Asistente, VIP, Staff, Bloqueado)
/organizador/eventos/:id/boletos-especiales        -> Emisión e invalidación de boletos especiales
/organizador/eventos/:id/inscripciones             -> Gestión de inscripciones
/organizador/eventos/:id/taquilla-participacion    -> Reporte y exportación CSV de participantes

/subdireccion · /subdireccion/verificaciones       -> Solicitudes de eventos, agenda y revisión de expedientes
/staff/checkin · /staff/ocupacion · /staff/historial -> Escáner QR, ocupabilidad en vivo e historial
/admin · /admin/recintos · /admin/ocupaciones      -> Usuarios, periodos escolares, jefaturas y recintos
```
