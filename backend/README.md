# Ticket Trade: misma interfaz, PostgreSQL y demo aislada

Se conservan las pantallas, colores, filtros y navegación originales de `main`. La imagen del acceso está integrada en el panel guinda existente. Los eventos temáticos y sus imágenes se mantienen dentro de esa interfaz.

## Ejecutar

1. `npm ci`.
2. Copiar `.env.example` a `.env` y configurar dos conexiones distintas: `DATABASE_URL` para cuentas normales y `DATABASE_URL_DEMO` para demostración. Ambas bases deben existir. No publicar credenciales.
3. `npm run db:init` instala el esquema y las migraciones de infraestructura en la base normal, **sin insertar cuentas ni eventos**.
4. `npm run db:demo` instala y prepara exclusivamente la base demo. Rechaza una conexión igual a la normal y nunca utiliza `DATABASE_URL` como destino de la semilla. La base demo debe estar vacía o contener las seis cuentas ficticias de la instalación académica original.
5. `npm start`; abrir <http://localhost:3000> o <http://localhost:3000/?demo=1>.

También pueden ejecutarse `npm run server` y `npm run dev` por separado. `APP_ORIGIN` debe coincidir exactamente con el origen del navegador. El proxy de Vite dirige `/api` a 4000.

## Qué significa demo

- Sin `demo=1`, se consulta y escribe en la base normal. No se insertan ejemplos automáticamente.
- Con `?demo=1`, se usa una base distinta, con su propia cookie `tt_sesion_demo`. La navegación conserva el parámetro. Salir de demo vuelve a la conexión normal y no borra registros.
- `TT_DEMO=1` habilita este modo únicamente si existe la conexión independiente. El selector consulta cuentas reales de la base demo. Cambiar de cuenta inicia una sesión HTTP real.
- Las cuentas creadas durante una demostración quedan en PostgreSQL demo. Las creadas desde la URL normal quedan en PostgreSQL normal. Ninguna cookie de un modo autentica en el otro.
- `TT_MOSTRAR_CODIGOS=1` permite usar el código generado por la aplicación durante la práctica; no demuestra acceso a un buzón. El envío real de correo aún no está conectado.

La demo incluye accesos con asiento, registro sin asiento y entrada libre; eventos de una sola actividad y otros con varios días y recintos. El catálogo contiene IA, Expo ESCOM, programación, robótica, ciberseguridad, vinculación, Game Jam y STEM. Son escenarios académicos realistas, no convocatorias oficiales. Se conservaron las imágenes recibidas de Antigravity; esta revisión no las generó ni atribuye su generación a Nano Banana.

Contraseña demo: `Password123!`, comprobada contra el hash normal de cada cuenta. No existe contraseña universal para cuentas registradas.

| Perfil | Cuenta demo |
| --- | --- |
| Administración | cuenta1001@example.invalid |
| Subdirección | cuenta1002@example.invalid |
| Organizador verificado | cuenta1003@example.invalid |
| Estudiante | cuenta1004@example.invalid |
| Externa con expediente pendiente | cuenta1005@example.invalid |
| Staff del simposio | cuenta1006@example.invalid |
| Estudiante con correo pendiente | ltorres.demo@alumno.ipn.mx |

## Recorridos conectados a las pantallas originales

Registro con acentos, dominio exacto, boleta/RFC, hash scrypt, confirmación por token de un solo uso, login/logout revocable y recuperación. PDF privado, expediente por perfil y revisión por Subdirección. Solicitudes con cartel, varias actividades y aforos, borrador, devolución/corrección, reenvío, cancelación y resolución con versión. Selección sobre lugares físicos, apartado de dos minutos conforme al SQL, confirmación, pase por evento, cancelación, QR/manual y ocupación consultada cada 15 segundos.

En estos recorridos, las pantallas esperan las respuestas remotas antes de mostrar éxito. Los proveedores remotos no guardan cuentas o reservaciones en localStorage. No existe alternativa automática local cuando la API falla.

El modelo de negocio mantiene las 73 tablas del HTML. `infra` contiene sesiones, bytes privados y datos de perfil preparados antes de enviar el expediente. Los documentos se vinculan mediante las tablas de verificación del ER; solo su titular o un revisor autorizado pueden abrirlos.

Los comandos avanzados que todavía no tienen adaptador (por ejemplo, publicación institucional directa, edición de versiones de arreglos, listas de espera, pases especiales, invitaciones Staff y administración de jefaturas) responden que no se guardaron cambios. La distribución muestra los lugares reales en modo consulta. El prototipo local completo sigue accesible con `?modo=local&demo=1`, con aviso explícito y almacenamiento separado del modo normal.

## Mostrar tablas directamente en PostgreSQL

```powershell
npm run db:ver
npm run db:ver:demo
npm run db:ver -- Cuenta
npm run db:ver:demo -- Evento
```

El menú muestra las 73 tablas y sus conteos, y ejecuta `SELECT *` con **psql**, el cliente nativo conectado directamente a la base elegida. También están `base-de-datos/postgresql/Ver-Tablas.ps1` y las consultas de `12_consultar_para_exposicion.sql` para pgAdmin. Si psql no está en PATH, configurar `PSQL_PATH`.

## Comprobaciones

```powershell
npm run lint
npm test
npm run build
npm run db:verify
npm run db:verify:demo
npm run test:postgres
```

La verificación lee el HTML de referencia y compara las 73 tablas, sus columnas/tipos/nulabilidad y las 96 relaciones contra PostgreSQL, además de ejecutar `validar_integridad()`.

`test:postgres` crea y elimina bases desechables, instala desde cero, ejecuta `04_pruebas_integridad.sql` y comprueba HTTP → PostgreSQL: confirmación/vencimiento, PDF y permisos, solicitud/publicación, cupo concurrente, expiración, cancelación, ingreso/QR reutilizado y persistencia. También prueba que normal y demo no comparten cuentas, eventos ni sesiones, y que el catálogo tiene las tres modalidades y variedad de recintos. Requiere permiso local para crear bases y rechaza destinos ajenos a este ejecutor.

## Vercel y Supabase

Se prepararon el punto de entrada `api/index.ts` y las rutas de Vercel. **Todavía no se crearon proyectos Supabase ni se configuraron conexiones remotas**, conforme a lo solicitado. La guía está en [POSTGRESQL_DEMO_Y_SUPABASE.md](../docs/POSTGRESQL_DEMO_Y_SUPABASE.md).

Sin `VITE_MODO_DATOS=api`, el alojamiento estático conserva el prototipo y avisa que es local. Fuera de demo rechaza crear cuentas locales: no muestra un registro exitoso como si hubiese llegado a PostgreSQL.

## Aportes revisados

Se revisó `backend_Regina` hasta `a54528f`. Se recuperó el registro y la confirmación persistentes, conservando sesiones aleatorias revocables y scrypt asíncrono de `main`. Se excluyeron acceso universal, contraseñas en claro y cookies con clave predeterminada. De Antigravity se conservaron imágenes, semillas, UTF-8 y adaptación de carteles; se corrigieron itinerarios, secuencias y guardados que ignoraban errores. El rediseño inicial de esta revisión se retiró.
