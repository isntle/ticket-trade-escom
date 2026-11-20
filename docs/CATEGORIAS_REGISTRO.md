# Categorías de registro y compatibilidad

El formulario conserva la selección de tipo de trabajador (Docente, Administrativo y Personal de apoyo). El adaptador agrupa los tres en Empleado del IPN en el catálogo PostgreSQL. El tipo elegido sigue disponible en el prototipo local; distinguir estos tipos al volver a leer una cuenta remota requeriría ampliar el contrato y la persistencia.

Los roles funcionales como administración, subdirección y personal de acceso son permisos distintos de la categoría de registro. Algunas cuentas especiales no tienen perfil común y el backend les asigna una afiliación de compatibilidad; no debe interpretarse como un dato confirmado de su vínculo con el IPN.

Para retirar los identificadores heredados del código se requiere una migración coordinada del contrato de API, datos locales persistidos y condiciones de autorización, además de revisar la regla de jefatura docente. No se debe ejecutar una semilla ni migración en la base compartida para este ajuste visual.
