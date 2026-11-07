# Ticket Trade · PostgreSQL para Regina y Luis

Modelo visual: `fuentes/TicketTrade_Modelo_ER_Ultima-Version.html`. La misma estructura está en `fuentes/modelo.json` y `fuentes/modelo.dbml`.
Frontend contrastado: commit `dc7619713d81ea40f8498767c331ba56e43f4ccc` de main.

## Qué contiene

- `00_instalar_tickettrade.sql`: instalación completa. Crea el esquema `ticket_trade`, las 73 tablas del HTML, sus 96 relaciones foráneas, identidades, catálogos, restricciones, reglas y seis vistas de consulta.
- `01_crear_esquema.sql`, `02_reglas_integridad.sql` y `03_consultas_y_vistas.sql`: las mismas partes separadas para leer y mantener. **Si ejecutaste 00, no ejecutes estas tres otra vez.**
- `04_pruebas_integridad.sql`: escenario de prueba con datos ficticios, 38 operaciones inválidas que deben rechazarse y comprobaciones de pases, cancelación parcial, apartados, consultas y plazos. Termina con `ROLLBACK`: no conserva las cuentas ni los eventos de ejemplo. Las secuencias pueden avanzar durante las pruebas; los saltos de ID son normales.
- `06_actualizar_restricciones_karim.sql`: actualización para quien ya instaló el paquete anterior. No ejecutar si se utiliza el `00` actualizado. Rechaza datos existentes que incumplan los formatos, sin borrarlos.
- `05_datos_ejemplo_opcionales.sql`: carga explícita de datos ficticios para practicar. Solo en una base de pruebas vacía de datos de negocio. No incluye archivos binarios ni cuentas utilizables para iniciar sesión.
- `PLAN_IMPLEMENTACION_LUIS_Y_REGINA.md`: reparto completo de conexión por módulos, archivos, rutas, entregas y comprobación final, con trabajo independiente para cada persona.
- `PLAN_CSV_REGINA.md`: trabajo de exportación que puede comenzar antes de conectar la base.
- `CONEXION_FRONTEND.md`: correspondencias y orden de conexión para Regina y Luis.
- `DIFERENCIAS_CON_EL_FRONTEND.md`: diferencias reales que deben acordarse antes de migrar toda la información antigua.
- `VERIFICACION.md`: resultados y límites de lo comprobado.

No se modificó el HTML recibido. No se añadieron tablas de versiones, ponentes, etiquetas, programa JSON ni estados de inscripción/distribución que se retiraron del diseño. `version_edicion` y `version_revisada` se conservan porque siguen en el último HTML: son contadores de concurrencia/resolución, no tablas de historial.

## Instalación en Windows con PowerShell

Instalar PostgreSQL con sus herramientas de línea de comandos. El paquete fue probado en PostgreSQL **18.1**; usa esa versión para reproducir exactamente la comprobación. No requiere extensiones ni instalar Prisma/Drizzle.

Descomprimir el ZIP en Descargas. Abrir PowerShell y ejecutar:

```powershell
Set-Location "$env:USERPROFILE\Downloads\TicketTrade_PostgreSQL_Para_Regina_2026-11-07"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
& "$pgBin\psql.exe" --version
& "$pgBin\createdb.exe" -h localhost -p 5432 -U postgres -W -E UTF8 -T template0 tickettrade
if ($LASTEXITCODE -ne 0) { throw "No se creó la base. Si ya existe, conserva sus datos y usa otro nombre para la prueba." }
& "$pgBin\psql.exe" -X -h localhost -p 5432 -U postgres -W -d tickettrade -v ON_ERROR_STOP=1 -f ".\00_instalar_tickettrade.sql"
if ($LASTEXITCODE -ne 0) { throw "La instalación falló. Revisa el primer ERROR; no continúes con los otros archivos." }
& "$pgBin\psql.exe" -X -h localhost -p 5432 -U postgres -W -d tickettrade -v ON_ERROR_STOP=1 -f ".\04_pruebas_integridad.sql"
if ($LASTEXITCODE -ne 0) { throw "Falló una comprobación de integridad." }
```

La contraseña que solicita es la de PostgreSQL de tu instalación. No se escribe en el script ni se envía a nadie. Cambiar `18` si las herramientas están instaladas en otra ruta; para reproducir la prueba usar PostgreSQL 18.1.

Al finalizar debes ver `COMMIT` al instalar y `Pruebas aprobadas; los datos ficticios se revirtieron` al probar. En pgAdmin: actualizar Bases de datos → tickettrade → Esquemas → ticket_trade → Tablas. Deben aparecer 73 tablas; no están en `public`.

Para practicar con ejemplos (opcional, después de las pruebas):

```powershell
& "$pgBin\psql.exe" -X -h localhost -p 5432 -U postgres -W -d tickettrade -v ON_ERROR_STOP=1 -f ".\05_datos_ejemplo_opcionales.sql"
```

Los datos opcionales usan IDs de prueba a partir de 1001. No ejecutar encima de usuarios/eventos reales; no son semillas oficiales de ESCOM. Sus claves de archivo son referencias ficticias y no generan imágenes ni documentos. Para volver a probar, crear otra base, sin borrar la anterior.

## Si utiliza pgAdmin

1. Crear una base nueva llamada `tickettrade`.
2. Abrir Query Tool **en esa base** y abrir `00_instalar_tickettrade.sql`.
3. Ejecutar todo el archivo, no únicamente una selección.
4. Confirmar `COMMIT`. Después abrir y ejecutar `04_pruebas_integridad.sql`.
5. Si aparece ERROR, ejecutar `ROLLBACK;`, corregir el problema y repetir en una base nueva. No desactivar restricciones para hacer pasar datos.

## En macOS/Linux

```sh
createdb -U postgres -E UTF8 -T template0 tickettrade
psql -X -U postgres -d tickettrade -v ON_ERROR_STOP=1 -f 00_instalar_tickettrade.sql
psql -X -U postgres -d tickettrade -v ON_ERROR_STOP=1 -f 04_pruebas_integridad.sql
```

## Reglas para la conexión

El navegador nunca debe recibir la contraseña de PostgreSQL. React consume una API y la API accede a PostgreSQL con un usuario propio de permisos limitados. Crear esa cuenta al preparar el backend; no utilizar el superusuario `postgres` en la aplicación.

El instalador es para una base nueva: falla si `ticket_trade` ya existe y no borra ni sobrescribe nada. La instalación completa es una transacción. Para bases que ya tengan información se necesitan migraciones explícitas, no volver a ejecutar este instalador.

Las escrituras usan transacciones `READ COMMITTED` (valor habitual de PostgreSQL). Una operación completa se confirma junta: por ejemplo, evento + primera actividad; cupo + asiento + reservación; aprobación + publicación; o cancelación + liberación de cupo. Las comprobaciones diferidas revisan el resultado al confirmar. Ver `CONEXION_FRONTEND.md`.

Referencia para ejecución y restricciones: documentación oficial de PostgreSQL:
- https://www.postgresql.org/docs/18/app-psql.html
- https://www.postgresql.org/docs/18/ddl-constraints.html
