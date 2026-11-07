# Revisión de las sugerencias de tipos de datos

La tabla del documento de Karim recomienda mantener `text` en casi todos los casos y definir formatos reales con `CHECK`. El paquete aplica ese criterio.

| Campos | Decisión |
|---|---|
| Nombres, apellidos, títulos, recintos y catálogos | Continúan como text. No se inventó un máximo de 255. Si se acuerda un límite en requisitos, se aplica también en UI/API y después en el DDL. |
| Boleta | text, UNIQUE y CHECK de diez dígitos o PE/PP seguidos de ocho dígitos. Índice adicional para que PE y pe no permitan duplicar la misma boleta. Los ceros iniciales se conservan. |
| RFC, número de empleado, teléfono, salón y códigos | Continúan como text. El número de empleado ya exige contenido no vacío al verificar; no se impone una longitud nueva no acordada. No convertir estos identificadores en números. |
| Correo | text, formato básico y unicidad sin distinguir mayúsculas. Registro e inicio de sesión deben aplicar el mismo criterio en la API. |
| Fecha y horario de actividad | date y time. Combinar con America/Mexico_City para comparar instantes y anticipación. |
| Instantes de envío, confirmación, entrada, cancelación y vencimiento | timestamptz. |
| Aforos, cantidades y tamaños | integer con límites de signo. Fotografías: máximo 150000 bytes; cartel JPEG/PNG: máximo 5242880 bytes (5 MiB). La carga debe comprobar también los bytes reales, no solo el MIME declarado. |
| Día semanal | Se mantiene integer con CHECK 1–7, lunes = 1 y domingo = 7. smallint también serviría, pero no cambia el comportamiento y la sugerencia no exige reemplazarlo. |
| Coordenadas del croquis | numeric; admite decimales sin perder precisión. |
| PK/FK | bigint; solo se autonumeran las PK independientes. Una PK que también es FK, como PerfilUsuario.id_cuenta, recibe el ID del registro padre. |

`varchar(n)` limita la longitud; no valida por sí solo el formato de una boleta, no evita inyección SQL y no sustituye consultas parametrizadas ni permisos. Conservar text es apropiado cuando no existe una longitud máxima acordada.

No se cambió el HTML original ni se añadieron columnas. Sus tipos siguen coincidiendo con el DDL. Los requisitos y reglas de negocio deberán reflejar los formatos y acuerdos vigentes; este paquete no modifica automáticamente el documento académico global.

Referencia oficial: https://www.postgresql.org/docs/18/datatype-character.html
