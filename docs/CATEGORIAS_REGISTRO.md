# Categorías de registro y compatibilidad

La interfaz presenta Estudiante, Empleado del IPN y Externo, conforme al catálogo `RolRegistro` del esquema PostgreSQL. La selección adicional de tipo de trabajador se eliminó: no se almacenaba como categoría independiente en la base conectada.

La aplicación conserva temporalmente los identificadores internos `alumno`, `profesor`, `administrativo`, `pae` y `externo` para que sigan funcionando datos del prototipo local y condiciones existentes. En registro, `profesor` es un identificador heredado para cualquier empleado, no una afirmación de que sea docente. El adaptador remoto lo convierte a `Empleado del IPN`; al leer empleados el backend sigue devolviendo ese identificador. `afiliacionLegible` agrupa los tres valores heredados de trabajador para mostrarlos como Empleado del IPN. No se modifican ni migran cuentas, permisos, reglas de jefatura ni bases de datos.

Los roles funcionales como administración, subdirección y personal de acceso son permisos distintos de la categoría de registro. Algunas cuentas especiales no tienen perfil común y el backend les asigna una afiliación de compatibilidad; no debe interpretarse como un dato confirmado de su vínculo con el IPN.

Para retirar los identificadores heredados del código se requiere una migración coordinada del contrato de API, datos locales persistidos y condiciones de autorización, además de revisar la regla de jefatura docente. No se debe ejecutar una semilla ni migración en la base compartida para este ajuste visual.
