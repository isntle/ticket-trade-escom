# Conectar Ticket Trade a Supabase

El backend conserva PostgreSQL, las sesiones y los permisos existentes. La contraseña de la base nunca se entrega al navegador. La vinculación de GitHub en Supabase no despliega por sí sola la API ni ejecuta las migraciones.

## Configuración del servidor

1. Descargar el certificado desde Database Settings → SSL Configuration del proyecto.
2. Guardar la cadena de **Session pooler**, con usuario `postgres.<referencia>`, en `DATABASE_URL` del entorno privado. No añadir parámetros `sslmode`, `sslcert`, `sslkey` ni `sslrootcert` a la URL.
3. Configurar `TT_POSTGRES_CA_FILE` con la ruta al certificado descargado. Se comprueban tanto su confianza como el nombre del servidor. No desactivar la validación TLS.
4. Ejecutar `npm run db:init`, después `npm run db:verify` y `npm run db:recintos`. El primero instala el esquema si no existe y aplica las migraciones de infraestructura; no borra ni reemplaza tablas académicas existentes. Si la verificación detecta diferencias, detenerse y resolverlas antes de usar datos reales.
5. Iniciar la API persistente y el frontend. `APP_ORIGIN` debe ser la dirección del frontend que utiliza esa misma API/base. Para correo, configurar las variables SMTP privadas descritas en CORREOS_SIN_COSTO.md.

`db:recintos` carga únicamente los cinco recintos físicos del catálogo del proyecto, con 396 lugares y estados de estaciones. Omite recintos existentes según nombre o número de salón; no modifica sus capacidades. No añade cuentas, solicitudes ni eventos. Una segunda ejecución no debe añadir filas.

La demostración debe usar otra base/proyecto mediante `DATABASE_URL_DEMO`. No copiar semillas con cuentas públicas de ejemplo a la base normal. Si solo hay un proyecto remoto, mantener la demo local durante la comprobación o deshabilitarla en el despliegue hasta contar con otro destino independiente.

## Comprobación del 14 de noviembre de 2026

Se instaló el modelo en el proyecto autorizado, inicialmente vacío. Se verificaron las 73 tablas, tipos, nulabilidad, 96 relaciones y restricciones de integridad. También se instalaron sesiones, archivos, preferencias y cola de correo. El catálogo físico se cargó y se comprobó su idempotencia. La API local conectada a Supabase respondió correctamente en salud, recintos y eventos.

La base normal nueva no contiene cuentas ni eventos. Los eventos anteriores de demostración siguen en su base separada de la Mac. No se ha migrado automáticamente la información local ni se ha concedido administración a ninguna cuenta.

## Antes del despliegue completo

Configurar DATABASE_URL, CA, APP_ORIGIN y SMTP en el servidor definitivo; publicar API y frontend coordinados; establecer procesamiento persistente o programado de la cola; y comprobar desde dos dispositivos. En Vercel el intervalo de backend/server.ts no se ejecuta por importar api/index.ts: hace falta ejecutar `npm run correos:procesar` con un programador/worker autorizado. No confundir aceptación SMTP con recepción ni prometer que Gmail nunca clasificará un mensaje como spam.

No ejecutar `test:postgres` contra Supabase: crea una base desechable local y requiere permisos que no corresponden al proyecto remoto.
