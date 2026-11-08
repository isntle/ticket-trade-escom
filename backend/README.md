# API de Ticket Trade

Integración de la rama backend_Regina con correcciones de seguridad y primeras escrituras de organización. El despliegue de frontend conserva el modo local predeterminado. No activar el modo API para uso general mientras falten los adaptadores de escritura y los recorridos de identidad/taquilla.

## Preparación local

1. Crear una base nueva e instalar `base-de-datos/postgresql/00_instalar_tickettrade.sql`.
2. Aplicar `base-de-datos/postgresql/migraciones/07_sesiones_http.sql`. Es infraestructura de sesión separada del ER de negocio.
3. Configurar DATABASE_URL o PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD en el entorno privado. No usar el superusuario en una instalación compartida. El código no proporciona contraseñas predeterminadas.
4. Configurar APP_ORIGIN con el origen exacto del frontend, por ejemplo http://localhost:3000. El proxy de Vite dirige /api al servidor local en 4000.
5. Ejecutar `npm ci`, `npm run server` y `npm run dev` en terminales separadas.

Las cuentas ficticias del SQL no tienen contraseñas utilizables. El endpoint de registro crea cuentas comunes con hash scrypt; no crea administradores ni asigna privilegios. Las cuentas operativas se provisionan por el equipo mediante un procedimiento controlado, no mediante una contraseña universal.

## Implementado

- Lectura pública de recintos y de eventos publicados/públicos. No devuelve borradores ni eventos privados por ese listado.
- Login con hash scrypt, cookie HttpOnly y sesión aleatoria cuyo hash se guarda en PostgreSQL. Logout revoca la sesión; una copia de la cookie deja de funcionar.
- Consulta de sesión y registro transaccional de cuentas comunes.
- Primeros endpoints `/api/organizacion/solicitudes`: consulta autorizada y creación transaccional de borrador/solicitud con actividades.
- Resolución en `/api/organizacion/solicitudes/:id/resolucion`: revisión por Subdirección/Administración, control de versión/estado y publicación al aprobar. El DDL vuelve a comprobar los cruces al confirmar.
- Errores JSON sin exponer SQL ni credenciales. Origen de escrituras comprobado. Límite de intentos local por IP para el proceso de desarrollo.

La declaración de urgencia se calcula a partir de las actividades al enviar; no basta un boolean del cliente. Las clases siguen siendo informativas. Los bloqueos sin reactivación se consideran vigentes aunque haya transcurrido su fin previsto.

## Comprobaciones

`npm run lint`, `npm run build`, `npm test`.

La prueba de integración real se habilita con `TT_API_PRUEBAS=1` y las variables PG apuntando EXCLUSIVAMENTE a una base desechable que contenga los ejemplos opcionales y la migración 07. `tests/api-auth.test.ts` cambia los hashes de cuentas ficticias y crea solicitudes; nunca apuntarla a datos de uso real.

Se comprueba HTTP → PostgreSQL: rechazo de contraseña incorrecta, revocación de cookie, guardado real del borrador, rollback de un envío inválido, revisión sin permiso rechazada, aprobación, doble resolución y filtrado público. Las pruebas de contraseñas se ejecutan también sin BD.

## Lo que todavía no está conectado de extremo a extremo

El plan completo de Luis y Regina sigue en `base-de-datos/postgresql/PLAN_IMPLEMENTACION_LUIS_Y_REGINA.md`.

Faltan las rutas de documentos/almacenamiento, confirmación y recuperación por correo, edición de perfil y revisión documental, jefaturas, todo el contrato de organización (edición/reenvío, cancelaciones/reasignaciones, distribuciones y bloqueos), y los adaptadores remotos de las pantallas. Los endpoints de esta primera entrega no sustituyen aún todos los métodos del contexto.

La rama de Regina aporta lectura y autenticación inicial; no contiene todavía reservas remotas, pases, Check-in ni CSV/PDF. Esos módulos conservan su implementación local. No activar una lectura de PostgreSQL y seguir guardando las reservas en localStorage como si fuesen remotas.

Antes de habilitar API en la UI: completar los comandos, conservar los estados de carga/error, quitar la alternativa automática local y probar cada recorrido con otra sesión y después de reiniciar. También resolver las diferencias de modelo documentadas (afiliación, visibilidad interna, espera e historial de rechazos).

Antes de alojar: configurar PostgreSQL, HTTPS/cookies, almacenamiento y correo, permisos del usuario del servidor, rate limiting compartido y copias de seguridad. La limitación de intentos en memoria es una protección del proceso local; no sustituye la limitación de un servicio con varias instancias.

Las credenciales de desarrollo que hayan estado en la rama original deben cambiarse y no reutilizarse. Corregir el código no retira esos valores del historial previo de Git.
