# Arranque para la presentación

En este equipo ya están instaladas las dependencias, las dos bases y el archivo privado `.env`. No hay que reconstruir ni volver a sembrar las bases cada mañana.

## Encender

Abrir PowerShell en la carpeta del proyecto:

```powershell
cd C:\Users\isnot\Downloads\TicketTrade
npm start
```

Dejar esa terminal abierta. Arranca el frontend en 3000 y la API en 4000. Detener ambos con Ctrl+C. Abrir:

- Demostración: <http://localhost:3000/?demo=1>.
- Uso normal, sin ejemplos: <http://localhost:3000/>.

En la demo, seleccionar una cuenta rápida en el acceso. La contraseña de las cuentas ficticias es `Password123!`. Al salir de demo no se borran ni se copian registros.

Si se prefieren dos terminales, ejecutar `npm run server` en una y `npm run dev` en otra, ambas en esta misma carpeta. Usar esta alternativa **en lugar de** `npm start`, para no ocupar dos veces los puertos.

Si PostgreSQL no está iniciado, abrir Servicios de Windows e iniciar `postgresql-x64-17`. Normalmente inicia automáticamente. No hace falta reinstalarlo.

## Mostrar la base directamente

En una segunda terminal, desde la misma carpeta:

```powershell
npm run db:ver:demo
```

Muestra las 73 tablas y sus conteos. Escribir el número o nombre de una tabla para ver sus registros; Enter sale. La consulta la ejecuta **psql directamente en PostgreSQL**, sin pasar por una tabla HTML de la aplicación ni por su API.

También se puede abrir una tabla directamente:

```powershell
npm run db:ver:demo -- Cuenta
npm run db:ver:demo -- Evento
```

Para demostrar que una cuenta normal se guardó en la otra base:

```powershell
npm run db:ver -- Cuenta
```

La base normal local se llama `tickettrade_real`; la demo conservada se llama `tickettrade`. Sus conexiones están en `.env`. No proyectar ese archivo ni pegar sus contraseñas. Las consultas de `base-de-datos/postgresql/12_consultar_para_exposicion.sql` también se pueden ejecutar en Query Tool de pgAdmin.

## Conectado a PostgreSQL desde las pantallas originales

- Registro con nombres y apellidos acentuados, validación de datos, confirmación mediante código generado, login, logout y recuperación de contraseña.
- Perfil, carga de PDF real y privado, envío de expediente y dictamen por Subdirección.
- Cartelera y detalles con imágenes, actividades, recintos y modalidades reales de la base demo.
- Solicitud de evento con cartel y varias actividades: guardar borrador, enviar, devolver, corregir, reenviar, cancelar y resolver. La aprobación publica el evento y prepara sus lugares.
- Apartado temporal de dos minutos, confirmación de reservación con asiento o registro sin asiento, pase QR por evento, cancelación y consulta después de reiniciar el servidor.
- Check-in por cuenta autorizada, rechazo de código repetido/fuera de horario y consulta de ocupación cada 15 segundos.
- Bases y cookies independientes para demo y normal. La misma dirección de correo puede tener una cuenta independiente en cada base.

## Pendiente del roadmap

No se declara conexión completa de todos los casos de uso. Siguen pendientes, entre otros: edición de versiones de distribuciones, publicación institucional directa, listas de espera, pases especiales, intenciones de asistencia libre, altas e invitaciones de Staff, administración avanzada de roles/jefaturas y cambios de correo. La distribución conectada permite consultar los lugares reales; sus acciones de edición avisan que no se guardaron cambios. Una actividad de entrada libre se puede consultar sin reservar.

El envío real de correo no está instalado: durante la práctica se usa el código generado, como se solicitó. Supabase y Vercel tienen código y guía preparados; **no se ha comprobado un despliegue remoto con base de datos**, porque aún no se crearon los proyectos. Véase [la preparación de Supabase](POSTGRESQL_DEMO_Y_SUPABASE.md).

## Verificaciones de esta revisión

```powershell
npm run lint
npm test
npm run build
npm run db:verify
npm run db:verify:demo
npm run test:postgres
```

Resultado: tipado y compilación correctos; 166 pruebas generales aprobadas. Las tres pruebas de integración se omiten en `npm test` y se ejecutan con PostgreSQL en `test:postgres`, cuya suite completa contiene cuatro pruebas aprobadas. Compara las 73 tablas, columnas, tipos, nulabilidad y 96 relaciones con el HTML del ER, y ejecuta las restricciones del propio motor.

Las pruebas HTTP usan bases desechables: comprueban persistencia, aislamiento, tokens vencidos/reutilizados, permisos de PDF, corrección y publicación de solicitudes, competencia por un asiento, vencimiento de apartados, registro sin asiento, cancelación y QR repetido. No borran las bases de presentación.

Durante la integración se corrigieron un ciclo de contextos que dejaba la vista vacía, la reemisión de tokens antiguos y adaptaciones de identificadores/fechas entre la interfaz y PostgreSQL. El resultado final de las pruebas es el indicado arriba. La compilación conserva una advertencia sobre el tamaño del JavaScript; no es un fallo de compilación ni una garantía de que estén implementados los casos pendientes.

Se revisó `backend_Regina` hasta `a54528f`: se recuperaron los flujos útiles de registro y confirmación, sin incorporar una contraseña universal ni una clave fija de sesión. Se conservaron los eventos e imágenes de Antigravity dentro de las pantallas originales.
