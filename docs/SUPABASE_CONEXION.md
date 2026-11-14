# Conectar Ticket Trade a Supabase

El backend conserva PostgreSQL, las sesiones y los permisos existentes. La contraseña de la base nunca se entrega al navegador. La vinculación de GitHub en Supabase no despliega por sí sola la API ni ejecuta las migraciones.

## Configuración del servidor

1. Descargar el certificado desde Database Settings → SSL Configuration del proyecto.
2. Guardar la cadena de **Transaction pooler (puerto 6543) para Vercel**, con usuario `postgres.<referencia>`, en `DATABASE_URL` del entorno privado. No añadir parámetros `sslmode`, `sslcert`, `sslkey` ni `sslrootcert` a la URL.
3. Configurar `TT_POSTGRES_CA_FILE` con la ruta al certificado descargado, o `TT_POSTGRES_CA_PEM` con su contenido en Vercel. Se comprueban tanto su confianza como el nombre del servidor. No desactivar la validación TLS.
4. Ejecutar `npm run db:init`, después `npm run db:verify` y `npm run db:recintos`. El primero instala el esquema si no existe y aplica las migraciones de infraestructura; no borra ni reemplaza tablas académicas existentes. Si la verificación detecta diferencias, detenerse y resolverlas antes de usar datos reales.
5. Iniciar la API persistente y el frontend. `APP_ORIGIN` debe ser la dirección del frontend que utiliza esa misma API/base. Para correo, configurar las variables SMTP privadas descritas en CORREOS_SIN_COSTO.md.

`db:recintos` carga únicamente los cinco recintos físicos del catálogo del proyecto, con 396 lugares y estados de estaciones. Omite recintos existentes según nombre o número de salón; no modifica sus capacidades. No añade cuentas, solicitudes ni eventos. Una segunda ejecución no debe añadir filas.

## Estado del catálogo compartido — 14 de noviembre de 2026

El proyecto autorizado contiene el catálogo trasladado desde PostgreSQL local: 7 cuentas, 11 eventos, 15 actividades y 7 recintos. Se conservaron identificadores de actividades, pases y reservas. El auditorio y Sala 14 se asociaron a los recintos existentes, sin crear copias. Se conservaron los tres laboratorios iniciales y se añadieron los dos del catálogo de eventos.

Los 12 carteles se guardaron como bytes en `infra.archivo_contenido` y se sirven desde `/api/archivos/:id`, respetando publicación y permisos. También se trasladó el PDF del expediente. Dos referencias antiguas de la semilla (`pruebas/cartel.png` y `pruebas/recinto.jpg`) no tienen archivo binario en el origen; no se inventó una fotografía para ellas. Los carteles utilizados por los eventos sí tienen contenido.

`TT_DEMO=1` junto con `TT_DEMO_COMPARTIDA=1` hace que presentación y navegación normal utilicen la misma base y cookie de sesión. La presentación no es una copia ni un entorno desechable: las modificaciones persisten. `?demo=1` únicamente activa su interfaz. Para abrir las tarjetas se exige `TT_PRESENTACION_CLAVE`, se emite una cookie firmada de 12 horas y se entregan exclusivamente los siete perfiles del catálogo. Sus contraseñas fueron reemplazadas por el valor privado `TT_PRESENTACION_PASSWORD`; no funciona la clave pública anterior. Los correos de estos perfiles son alias del buzón del proyecto; no se atribuyen a personas externas reales.

Con `TT_DEMO_COMPARTIDA=0` se conserva el modo local aislado anterior y sus guardas de bases diferentes. No apuntar ambas conexiones al mismo destino para eludir esas guardas.

## Correo en Vercel

Las variables SMTP, clave de cifrado y conexión están en el entorno de producción, sin prefijo VITE. El remitente es `tickettradescom@gmail.com`. Las operaciones guardan el aviso en la misma transacción; la función utiliza `waitUntil` para procesarlo después de responder. Se conserva una cola cifrada en PostgreSQL y los estados de entrega. Un programador diario protegido por `CRON_SECRET` recupera trabajos pendientes y reintentos elegibles; no reenvía automáticamente los de resultado incierto. La petición de reenvío explícito del titular sigue disponible con límite por minuto.

La confirmación y recuperación usan los tokens propios del proyecto; no se configuró un segundo flujo paralelo con Supabase Auth. Los enlaces usan el dominio principal `https://tickettradescom.vercel.app`. Un estado aceptado significa aceptación SMTP; la recepción se verifica en el buzón y no puede prometerse ausencia de spam.

## Antes del despliegue completo

Comprobar los recorridos en la URL pública después de cada cambio de entorno. El intervalo de backend/server.ts es exclusivo del servidor local persistente; Vercel usa el procesamiento de api/index.ts y el programador descrito arriba. No confundir aceptación SMTP con recepción ni prometer que Gmail nunca clasificará un mensaje como spam.

No ejecutar `test:postgres` contra Supabase: crea una base desechable local y requiere permisos que no corresponden al proyecto remoto.

## Comprobar la función de Vercel

Ejecutar `npm run verify:api` además de lint, build y las pruebas PostgreSQL. Compila la función como módulos Node y carga el JavaScript resultante sin tsx. Las importaciones relativas usan extensión `.js`, resuelta hacia TypeScript durante desarrollo. Esto evita publicar una API que compila con Vite pero falla al iniciar en Vercel.

La URL de producción usa el pool transaccional de Supabase (6543), adecuado para funciones con conexiones breves. El pool de sesión (5432) se conserva para herramientas locales persistentes. Se limitan las conexiones por instancia de Vercel y se liberan con attachDatabasePool. Ambos dominios del proyecto, tickett3.vercel.app y tickettradescom.vercel.app, se admiten explícitamente mediante APP_ORIGIN y APP_ORIGIN_ALIASES; no se acepta cualquier dominio enviado por el navegador.
