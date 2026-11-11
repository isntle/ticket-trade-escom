# Preparación de PostgreSQL normal y demostración

Estado: código preparado y verificado con PostgreSQL local. El usuario indicó que aún no tiene los proyectos Supabase; no se crearon servicios externos ni se desplegaron credenciales.

## Separación

Usar dos proyectos Supabase distintos: uno normal y otro de demostración, con las mismas 73 tablas y migraciones. En local pueden ser dos bases de un mismo servidor. No basta con ocultar botones o filtrar usuarios de una sola base.

| Entrada | Conexión | Cookie | Datos |
| --- | --- | --- | --- |
| URL sin demo | `DATABASE_URL` | `tt_sesion_id` | Cuentas y registros normales |
| URL con `?demo=1` | `DATABASE_URL_DEMO` | `tt_sesion_demo` | Eventos y cuentas de práctica |

El servidor selecciona la conexión por petición mediante AsyncLocalStorage. Los SQL usan nombres de esquema fijos; el navegador no puede elegir un nombre de base ni aportar una cadena de conexión. Una cookie demo no sirve en normal, ni a la inversa. La semilla comprueba el destino y solo escribe en demo.

## Cuando se creen los proyectos

1. Crear los proyectos normal y demo. Obtener sus cadenas desde el panel Connect de Supabase. Para instalaciones SQL usar la conexión directa o de sesión. Para la API se puede usar el pooler; conservar el usuario completo, que identifica el proyecto en el pooler compartido. No desactivar la verificación TLS. [Conexiones PostgreSQL de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
2. Guardar `DATABASE_URL` y `DATABASE_URL_DEMO` en el entorno privado del equipo. Ejecutar `npm run db:init` y después `npm run db:demo`. No cargar 05/08/09 manualmente en normal.
3. Ejecutar `npm run db:verify` y `npm run db:verify:demo`.
4. En las variables de entorno de Vercel configurar ambas conexiones, `VITE_MODO_DATOS=api`, `TT_DEMO=1` y `APP_ORIGIN=https://DOMINIO-EXACTO`. Las cadenas PostgreSQL son secretos del servidor: nunca llevan prefijo `VITE_` ni se incorporan a Git.
5. Durante la práctica, `TT_MOSTRAR_CODIGOS=1` permite demostrar confirmación y recuperación sin correo real. Quitar esta opción cuando se conecte un proveedor de correo; no se considera verificación de un buzón.
6. Desplegar y comprobar: URL normal vacía, registro normal consultable en su BD, catálogo en `?demo=1`, registro demo solo en su BD, PDF privado y sesiones separadas.

`api/index.ts` exporta la misma aplicación Express que se usa localmente, sin `listen`. Las reglas de Vercel envían `/api/*` a esa función y conservan las rutas de la SPA. [Express en Vercel](https://vercel.com/docs/frameworks/backend/express).

No se ha validado todavía una instalación remota real. Deben comprobarse los límites de tamaño de archivos de la plataforma antes de habilitar PDF grandes; la API local admite hasta 10 MiB. Para el uso alojado conviene completar el almacenamiento directo privado con URLs firmadas si esos archivos superan el límite de la función.

## Exponer en clase

Abrir `?demo=1` y mostrar las cuentas rápidas. El catálogo incluye acceso con asiento, registro sin asiento, entrada libre, actividades en distintos recintos y eventos sencillos. Todo sigue el diseño original de Ticket Trade.

Abrir `npm run db:ver:demo` en otra ventana para consultar las tablas con psql. Para demostrar aislamiento, abrir la URL normal y `npm run db:ver`: los registros demo no aparecen allí. Cambiar de modo no borra ni copia datos.

El prototipo local sin API se conserva para revisar los casos que aún no tienen comando remoto, siempre identificado como almacenamiento del navegador. No es una alternativa automática ante errores del servidor.
