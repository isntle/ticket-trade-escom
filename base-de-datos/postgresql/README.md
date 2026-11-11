# Base de datos de Ticket Trade

Esta carpeta reúne el modelo de referencia, la instalación de PostgreSQL y los planes de conexión.

La aplicación conectada y sus pruebas actuales se describen en [backend/README.md](../../backend/README.md). Instalar con `npm run db:init`; preparar la demostración con `npm run db:demo`; verificar las 73 tablas y las 96 relaciones contra el HTML con `npm run db:verify`.

**Consulta rápida nativa:** `npm run db:ver` abre un selector con psql. También puedes usar [Ver-Tablas.ps1](Ver-Tablas.ps1) o abrir [las consultas para exposición](12_consultar_para_exposicion.sql) en pgAdmin.

## Por dónde empezar

1. [Instrucciones de instalación](LEEME_PRIMERO.md).
2. Ejecutar [00_instalar_tickettrade.sql](00_instalar_tickettrade.sql) en una base nueva.
3. Ejecutar [04_pruebas_integridad.sql](04_pruebas_integridad.sql). Las filas ficticias se revierten.
4. Revisar el [plan de implementación de Luis y Regina](PLAN_IMPLEMENTACION_LUIS_Y_REGINA.md).

## Organización

- `fuentes/`: HTML visual del modelo, DBML, estructura JSON, catálogos y huella del archivo de origen.
- `00_instalar_tickettrade.sql`: instalación completa. No ejecutar además 01, 02 y 03.
- `01`, `02` y `03`: partes de la instalación, separadas para mantenimiento y consulta.
- `04_pruebas_integridad.sql`: comprobaciones reproducibles.
- `05_datos_ejemplo_opcionales.sql`: datos ficticios para una base de pruebas, sin archivos binarios ni cuentas autenticables.
- `06_actualizar_restricciones_karim.sql`: únicamente para actualizar la instalación anterior; no ejecutar después del 00 vigente.
- `migraciones/07_sesiones_http.sql`, `10_archivos_servidor.sql` y `13_preferencias_perfil.sql`: infraestructura separada para sesiones, PDF privados y datos del expediente en preparación, aplicada por `db:init`.
- `08_semilla_demo.sql` y `09_eventos_reales.sql`: datos temáticos académicos; ejecutar mediante `db:demo`, que valida el destino y completa secuencias, archivos y lugares físicos.
- `VERIFICACION.md` y `RESULTADOS_VERIFICACION.json`: alcance y resultados de lo comprobado.
- `AJUSTES_TIPOS_KARIM.md`: decisiones de tipos y validaciones.
- `CONEXION_FRONTEND.md`, `DIFERENCIAS_CON_EL_FRONTEND.md` y los planes: adaptación y reparto del trabajo.

## Modelo visual

Descargar [el HTML](fuentes/TicketTrade_Modelo_ER_Ultima-Version.html) y abrirlo en el navegador. GitHub muestra su código, no el diagrama interactivo. El archivo conserva el modelo recibido; los límites de formato de boleta y cartel se concretan en el SQL y en AJUSTES_TIPOS_KARIM.md.

La construcción original se comprobó con PostgreSQL 18.1; la revisión de integración se probó con PostgreSQL 17.5. Los recorridos remotos y las funciones que siguen en el prototipo local están delimitados en la guía del backend. Se conservan documentadas las diferencias con funciones antiguas del frontend.

No guardar aquí credenciales, directorios de PostgreSQL, archivos personales ni respaldos de datos reales.
