# Sprint 6 — Corrección de participación por actividad

Continuación correctiva de TICKTRADE-108 y [PR 4](https://github.com/isntle/ticket-trade-escom/pull/4), ya integrado. Rama `feature/sprint6-cu-mt-01-03-actividades`, creada desde `origin/main` en `ff9fa215f35f3c3cdc64748815484adfb5f8cdba`. Se conserva la presentación vigente de main y se corrigen sus validaciones; no se restauran archivos completos del commit antiguo `51ac2c8`.

## Comportamiento

- `FechaEvento.id` es la actividad operativa. La ficha ofrece una acción por actividad, incluso sin programa; las ponencias solo describen contenido. La taquilla usa el nombre, recinto, horario, modalidad y aforo propios, y el arreglo de asientos debe ser una versión final de esa actividad y recinto.
- El acceso libre conserva registro, confirmación y cancelación de intención. No emite boleto ni consume cupo. La cancelación del registro propio continúa disponible después del cierre de inscripciones y comprueba titularidad.
- Ficha, taquilla y operaciones locales comparten las validaciones de cuenta activa, correo confirmado, público permitido, cancelación, suspensión, bloqueos e inscripciones. Las operaciones releen los registros guardados antes de confirmar, registrar o cancelar.
- Los límites usan la hora institucional `America/Mexico_City`. El aviso de ingreso coincide con Check-in: desde 30 minutos antes del inicio hasta el fin de la actividad.
- La clave de evento privado y el identificador de actividad se conservan en el regreso desde inicio de sesión o confirmación de correo. La reserva no interpreta índices de programa como actividades. Se mantienen itinerarios, ponentes, resumen multirrecinto y QR por evento. No se crea backend.

## Interfaces y documentación

| Caso | Interfaz | Controles comprobados |
| --- | --- | --- |
| CU-MT-01 | UI-10, UI-11 | Cartelera, filtros, detalle y programa descriptivo |
| CU-MT-02 | UI-11 | Registrar asistencia, confirmar registro, cancelar registro |
| CU-MT-03 | UI-11, UI-40 | Reservar lugar, cupo general o butaca, confirmar y regresar |

El explorador Documentación incluye control y respuesta para los tres casos. Sus cuatro botones abren la pantalla correspondiente y eligen una actividad de la modalidad adecuada. El Word `Pantallas_CU_MT_01_03_Sprint6.docx` es un anexo de cinco páginas derivado de la plantilla compartida; actualiza estos casos sin sobrescribir los documentos de otros integrantes.

## Verificación

- `npm test`: 148 pruebas aprobadas, incluidas ocho nuevas pruebas de participación. Cubren reservas con IDs distintos, QR estable, registro libre, cancelación tras cierre, permisos, revalidación del estado guardado y hora institucional.
- `npm run lint` y `npm run build`: correctos. Se conservan los avisos existentes de Vite sobre `__dirname` y tamaño del paquete.
- Navegador independiente con dispositivo en `Asia/Tokyo`: siete grupos de escenarios, cero errores de ejecución. Se confirmó la reserva sin programa, dos actividades el mismo día, ausencia de reservas ficticias por ponencias, registro/cancelación libre, rechazo de actividad cancelada/suspendida, mapa final y regreso real después del inicio de sesión privado. También se comprobó la ficha a 390 px sin desbordamiento horizontal.

Las capturas y `verificacion.json` están en `evidencias/sprint6-cu-mt-01-03/`. Las actividades A y B de las capturas son datos de prueba aislados del 4 de noviembre de 2030, con aforos de 2 y 3 personas. No se agregan a la cartelera real ni se modifica el almacenamiento del navegador habitual.

## Revisión local

1. Abrir esta rama en GitHub Desktop y la carpeta del repositorio en VS Code.
2. Ejecutar `npm run dev` y abrir la dirección indicada por Vite.
3. En Documentación, abrir Motor de taquilla y consultar CU-MT-01, 02 y 03. Para las operaciones, usar una cuenta de prueba activa con correo confirmado.
4. Ejecutar `npm test` para reproducir las condiciones con dos actividades del mismo día y un programa de dos ponencias.

La entrega se propone mediante PR. No se integra directamente en main.
