# Textos visibles para usuarios

La navegación normal utiliza nombres de pantallas, actividades y acciones. Las claves de análisis (UI, IU, CU, INF, ERR y MSG) se mantienen como identificadores internos y no se presentan como títulos, insignias o prefijos de mensajes al usuario.

Se retiraron los códigos visibles de encabezados de control de acceso, historial, boletos especiales, inscripciones, configuración de eventos y participación. Los estados de acceso se traducen a etiquetas legibles, por ejemplo Entrada registrada y Reservación no vigente. El detalle muestra el nombre del titular sin añadir el identificador interno de reservación.

Los componentes compartidos de alertas, estados vacíos, ventanas y notificaciones presentan la explicación de los mensajes. También se normalizan los errores de API y los avisos de formularios. El campo estructurado codigo de los errores y las claves del dominio se conservan para la lógica y las pruebas.

Los folios útiles para usuarios, códigos de boletos, asientos y nombres físicos de recintos se mantienen. No se elimina un código QR ni una referencia de lugar como A-02 o SALA-14 por parecer un identificador.

Se sustituyeron menciones de PostgreSQL en textos de producto por descripciones de la acción o del estado disponible. Las funciones pendientes siguen comunicando que no están disponibles; no se anuncia un guardado o una conexión que no exista. Los permisos conservan sus reglas y los avisos usan los nombres de los perfiles autorizados.

El explorador académico requiere abrir expresamente ?demo=1&documentacion=1. El modo de demostración ordinario ya no muestra ese acceso. Sus códigos se conservan dentro de esa vista específica para revisar el documento, y los atributos internos data-interfaz y rutas de documentación siguen funcionando.

Validación: 205 pruebas ordinarias aprobadas y seis de PostgreSQL omitidas por diseño; las tres pruebas nuevas comprueban presentación, conservación de identificadores funcionales y acceso explícito a documentación. Después de las correcciones visuales se verificaron también las pruebas existentes de actividades de acceso y documentación (12 aprobadas). Tipado, compilación del frontend y carga de la API ESM correctos. El aviso anterior por tamaño del paquete se conserva.

Se revisaron en navegador local cartelera, acceso, navegación de personal, avisos de permisos, panel del organizador e historial con su detalle. La captura utiliza cuentas y datos de demostración. No equivale a un despliegue ni a una nueva prueba de PostgreSQL.

Esta unidad modifica presentación y mensajes. No modifica reglas de disponibilidad o acceso, endpoints, archivos SQL ni datos compartidos.
