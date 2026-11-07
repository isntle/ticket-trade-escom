# Comprobación del paquete

Fecha: 7 de noviembre de 2026. Motor utilizado: PostgreSQL 18.1 instalado localmente. Las comprobaciones se realizaron en una instancia aislada, sin modificar la base del servidor local de uso habitual ni el repositorio.

## Resultado

- Instalación completa ejecutada desde `00_instalar_tickettrade.sql` en una base nueva: correcta.
- 73 tablas, 277 columnas y 73 llaves primarias contrastadas con el HTML. Nombres, tipos y nulabilidad coinciden.
- 96 llaves foráneas y 27 catálogos. Seis vistas creadas y consultadas correctamente.
- Escenario con 80 filas ficticias que utiliza las 46 tablas de dominio; las otras 27 son catálogos con valores iniciales.
- 38 operaciones inválidas rechazadas: referencias inexistentes, correo repetido sin distinguir mayúsculas, horarios inválidos, exceso de aforo, laboratorio con entrada libre, última actividad eliminada, foto demasiado grande, estación sin ficha, itinerario sin actividad en esa fecha, cruce al publicar, QR duplicado, doble entrada, asiento de otro recinto/actividad, doble ocupación, cancelación incompleta, pase sin reservas, especial en categoría no permitida, documentación incompleta, Staff sin invitación y apartado vencido, entre otras.
- Un pase con dos actividades conserva el mismo QR; registrar entrada para una actividad deja la otra disponible. Cancelar una reserva conserva el QR y el estado de la otra.
- Conversión válida de apartado a reservación comprobada en una misma transacción.
- Plazo de dos días hábiles probado omitiendo fin de semana y un inhábil; no se almacena tiempo restante.
- Dos conexiones intentaron tomar el último cupo: una se confirmó y la otra fue rechazada. Resultado final: dos cupos comprometidos de una capacidad de dos.
- Datos opcionales cargados correctamente; las identidades se reajustan después de los IDs explícitos de ejemplo.
- Respaldo con `pg_dump` y restauración con `pg_restore` en otra base: correctos. La base restaurada volvió a pasar la validación entre tablas.
- Ejecutar el instalador otra vez sobre una base instalada es rechazado; no borra ni sustituye las tablas existentes.
- Tras `04_pruebas_integridad.sql`, la base principal de entrega conserva únicamente los catálogos; los datos ficticios se revirtieron.

## Ajustes realizados durante la revisión

- Separar instalación completa de archivos parciales para evitar que se ejecuten ambos por duplicado.
- Corregir cruces ambiguos en las consultas de reporte; las vistas ya se crean realmente en PostgreSQL.
- Comprobar las restricciones diferidas antes de aceptar una prueba, incluidas las llaves foráneas.
- Evitar que el cambio de semestre invalide todas las escrituras de la base por una comprobación global de fecha; la vigencia se consulta dinámicamente.
- Diferenciar códigos de error y mantener las secuencias utilizables después de cargar los ejemplos con IDs explícitos.
- Preservar el HTML recibido y documentar diferencias funcionales, sin reponer columnas o tablas retiradas.

## Límites de esta comprobación

Se comprobó el DDL, sus consultas y escenarios concretos de integridad; no se afirma que toda alternativa de la aplicación haya sido validada con un backend que todavía no está conectado. La API deberá autenticar al usuario, comprobar permisos/horario/estado al actuar, validar los archivos y ejecutar cada operación completa dentro de una transacción.

Las reglas diferidas serializan las escrituras para proteger la integridad en esta primera implementación académica. Deben medirse antes de un uso de mayor volumen. No se probaron tiempos de respuesta de producción ni dispositivos físicos.

Las diferencias del HTML con partes actuales del frontend se describen en `DIFERENCIAS_CON_EL_FRONTEND.md`. No se solucionan fabricando datos o prometiendo que el adaptador recuperará información que el modelo no almacena.

Los comandos de Windows están preparados para PowerShell y PostgreSQL 18; la ejecución real se verificó con las herramientas de PostgreSQL en macOS. `Instalar.ps1` es una comodidad; `LEEME_PRIMERO.md` incluye también todos los comandos manuales.

## Revisión con las sugerencias de tipos de Karim

Se mantuvo `text` para los campos sin límite de longitud acordado, y se añadieron:

- CHECK de boleta: diez dígitos, o PE/PP más ocho dígitos. La unicidad también ignora mayúsculas para esos prefijos; los ceros iniciales se conservan.
- Cartel: metadatos de imagen JPEG/PNG y máximo 5 242 880 bytes. La API debe validar además el contenido real del archivo, como ya hace la utilidad del frontend.
- Ocho pruebas negativas adicionales, para un total de 38, y casos válidos de boletas con ceros iniciales/PE/PP y cartel exactamente en el límite.

Se comprobó además la actualización de una base creada con el paquete anterior mediante el archivo 06.
