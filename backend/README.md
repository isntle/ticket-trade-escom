# Ticket Trade: Backend, PostgreSQL y Despliegue

Se conservan las pantallas, colores, filtros y navegación originales de `main`. La aplicación conectada utiliza Express (`backend/app.ts`), PostgreSQL 16 (`pg` + `AsyncLocalStorage`) y la función serverless ESM `api/index.ts` para Vercel.

---

## 1. Arranque local y bases de datos

1. Instalar dependencias:
   ```bash
   npm ci
   ```
2. Copiar `.env.example` a `.env` y configurar dos conexiones distintas: `DATABASE_URL` para operación normal y `DATABASE_URL_DEMO` para demostración aislada (`TT_DEMO=1`, `TT_DEMO_COMPARTIDA=0`). Ambas bases deben existir previamente. No publicar credenciales.
3. Inicializar esquemas y migraciones:
   ```bash
   # Instala el esquema (73 tablas) y migraciones en la base normal (sin datos semilla)
   npm run db:init

   # Instala el esquema y siembra catálogo/cuentas demo exclusivamente en DATABASE_URL_DEMO
   npm run db:demo

   # Verifica tablas, columnas, tipos, nulabilidad, 96 FKs e integridad referencial
   npm run db:verify
   npm run db:verify:demo
   ```
   - `npm run db:demo` rechaza una conexión igual a `DATABASE_URL` y nunca escribe en la base normal.
   - Opcional: `npm run db:recintos` carga únicamente los 5 recintos físicos en la base configurada.
4. Levantar API (`:4000`) y frontend (`:3000`) juntos:
   ```bash
   npm start
   ```
   - Uso normal: `http://localhost:3000/` (cookie `tt_sesion_id`).
   - Demostración: `http://localhost:3000/?demo=1` (cookie `tt_sesion_demo`).
   - Alternativa en dos terminales: `npm run server` y `npm run dev` (`APP_ORIGIN` debe coincidir exactamente con el origen del navegador; el proxy de Vite dirige `/api` a `:4000`).

---

## 2. Modo aislado vs. Presentación compartida

### Modo aislado local (`TT_DEMO=1`, `TT_DEMO_COMPARTIDA=0`)
- Sin `?demo=1`, las peticiones consultan `DATABASE_URL` (base normal limpia).
- Con `?demo=1`, el frontend envía la cabecera `x-tickettrade-demo: 1` (y `?demo=1` en descargas `/api/archivos/:id`) y `backend/bd/pool.ts` enruta la petición mediante `AsyncLocalStorage` hacia `DATABASE_URL_DEMO` con cookie `tt_sesion_demo`.
- Ninguna cookie de un modo autentica en el otro.
- `TT_MOSTRAR_CODIGOS=1` permite visualizar tokens de confirmación/recuperación en desarrollo local sin SMTP real.

### Presentación compartida (`TT_DEMO=1`, `TT_DEMO_COMPARTIDA=1`)
- En despliegues compartidos (Vercel + Supabase), `?demo=1` consulta la misma base que el acceso normal y protege las tarjetas rápidas con `TT_PRESENTACION_CLAVE` (`POST /api/auth/presentacion`) y `TT_PRESENTACION_PASSWORD`. No usar `npm run db:demo` contra esta base. Ver [SUPABASE_CONEXION.md](../docs/SUPABASE_CONEXION.md).

### Cuentas demo locales (contraseña: `Password123!`)
| Perfil | Cuenta demo |
| --- | --- |
| Administración | `cuenta1001@example.invalid` |
| Subdirección | `cuenta1002@example.invalid` |
| Organizador verificado | `cuenta1003@example.invalid` |
| Estudiante | `cuenta1004@example.invalid` |
| Externa con expediente pendiente | `cuenta1005@example.invalid` |
| Staff del simposio | `cuenta1006@example.invalid` |
| Estudiante con correo pendiente | `ltorres.demo@alumno.ipn.mx` |

---

## 3. Módulos y avisos en PostgreSQL

- **Identidad (`backend/modulos/identidad/`):** Registro con validación de dominio exacto, boleta/RFC, hash `scrypt` asíncrono, tokens de un solo uso, sesiones HTTP revocables en `infra.sesion_http`, carga privada de PDF en `infra.archivo_contenido`, dictamen de expedientes, jefaturas y restricciones.
- **Organización (`backend/modulos/organizacion/`):** Solicitudes de evento (ordinarias/extraordinarias), verificación de disponibilidad y separación de 30 min, dictamen de Subdirección, distribución editable de lugares por actividad (`Asistente`, `VIP`, `Staff`, `Bloqueado`) y publicación.
- **Taquilla (`backend/modulos/taquilla/`):** Consulta de lugares y disponibilidad, apartado temporal de 2 minutos (`Apartado` + `CompromisoCupo`), confirmación de boleto digital QR/PDF, cancelación voluntaria, boletos especiales, check-in e intenciones de asistencia.
- **Bandeja de notificaciones y avisos de cupo:**
  - `backend/modulos/correos/avisos.ts` (`registrarAvisoBandeja`) persiste avisos idempotentes en `ticket_trade."Notificacion"` con `referencia_destino` exacta (`/mi-expediente`, `/organizador/solicitudes/:id`, `/organizador/eventos/:id`).
  - `backend/modulos/taquilla/avisosCupo.ts` registra suscripciones en `ticket_trade."AvisoDisponibilidad"` y despacha notificaciones de liberación de cupo (`tipo='disponibilidad'`, enlazando a `/eventos/:id`) al cancelar o liberar apartados vencidos.
  - `backend/modulos/lecturas/estado.ts` expone la bandeja en `GET /api/estado` y el marcado idempotente por titular en `PATCH /api/estado/notificaciones/:id/leida`.

---

## 4. Inspección directa en PostgreSQL

```bash
npm run db:ver
npm run db:ver:demo
npm run db:ver -- Cuenta
npm run db:ver:demo -- Evento
```

El menú muestra las 73 tablas del esquema `ticket_trade` y sus conteos usando `psql` directamente. Si `psql` no está en `PATH`, configurar `PSQL_PATH` en `.env`.

---

## 5. Pruebas locales y verificación de despliegue

### Pruebas locales
```bash
npm run lint
npm run build
npm test
npm run db:verify
npm run db:verify:demo
npm run test:postgres
```

- `npm run lint`: valida tipado TypeScript (`tsc --noEmit`).
- `npm run build`: compila el bundle de producción en `dist/`.
- `npm test`: ejecuta la suite unitaria y de contratos en `tests/*.test.ts`.
- `npm run test:postgres`: crea una base local desechable `tt_pruebas_<hex>`, instala el esquema desde cero, ejecuta `04_pruebas_integridad.sql` y corre en serie las 11 suites PostgreSQL:
  - `api-auth.test.ts`
  - `api-password.test.ts`
  - `api-correos-postgres.test.ts`
  - `api-flujos-postgres.test.ts`
  - `api-eventos-postgres.test.ts`
  - `api-demo-aislamiento.test.ts`
  - `api-disponibilidad-postgres.test.ts`
  - `api-calendario-bloqueos-postgres.test.ts`
  - `api-distribucion-postgres.test.ts`
  - `api-dictamen-disponibilidad-postgres.test.ts`
  - `api-notificaciones-postgres.test.ts`
  - Requiere permisos locales para `CREATE DATABASE` / `DROP DATABASE` y **nunca debe ejecutarse contra Supabase remoto**.

### Verificación de despliegue (Vercel + Supabase)
```bash
# Compila api/index.ts como ESM estricto y comprueba la carga en Node sin tsx
npm run verify:api
```
Comprobaciones adicionales tras desplegar:
1. Verificar `GET https://<dominio>/api/salud` (`HTTP 200`, `estado: "en_linea"`).
2. Confirmar que `DATABASE_URL` usa el pooler transaccional (`6543`) sin parámetros `sslmode`, con `TT_POSTGRES_CA_PEM` / `TT_POSTGRES_CA_FILE` configurado y `VITE_MODO_DATOS=api`.
3. Confirmar `APP_ORIGIN`, `APP_ORIGIN_ALIASES`, `CRON_SECRET` (`>= 32` chars) y variables `SMTP_*` / `TT_CORREO_CLAVE` solo en servidor (sin prefijo `VITE_`).
4. Para correo transaccional, validar configuración con `npm run correos:verificar -- --sin-conexion` y `npm run correos:preview`. Ver [POSTGRESQL_DEMO_Y_SUPABASE.md](../docs/POSTGRESQL_DEMO_Y_SUPABASE.md) y [SUPABASE_CONEXION.md](../docs/SUPABASE_CONEXION.md).
