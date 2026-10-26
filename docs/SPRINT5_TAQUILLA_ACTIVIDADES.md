# Sprint 5 Motor de Taquilla por actividad

## Alcance

CU-MT-07 (UI-62), CU-MT-08 (UI-63) y CU-MT-09 (UI-64) conservan sus páginas, rutas, contexto y almacenamiento existentes. La unidad reservable es una actividad identificada por `FechaEvento.id` y referenciada mediante `idFechaEvento`; no se renombra el modelo ni se incorpora un backend. Día agrupa la fecha de las actividades.

- Las pantallas, filtros, confirmaciones e historial identifican la actividad por nombre, fecha, horario y recinto.
- El cierre manual modifica solo el evento y los identificadores elegidos. Conserva las reservas confirmadas y los boletos; cancela sus apartados temporales y devuelve las ofertas no aceptadas a la lista de espera, sin perder el orden.
- La confirmación relee el almacenamiento y los permisos del organizador, comprueba la versión capturada al abrir el modal y guarda el cambio completo con la restauración local ya existente ante fallos.
- Se respetan actividades canceladas, suspendidas y bloqueos institucionales vigentes. Un bloqueo cancelado no se trata como vigente.
- El aforo aprobado de la actividad, su recinto y sus lugares habilitados determinan el cupo. El máximo general del evento solo sirve como compatibilidad si no hay información propia.
- La disponibilidad descuenta reservas normales, especiales, apartados y ofertas vigentes una sola vez. Las intenciones se consultan en su colección específica y no consumen cupo. La participación se deduplica por acceso dentro de cada actividad.
- Un pase por evento puede tener accesos a varias actividades: no se deduplican por QR las entradas de actividades diferentes. Los titulares únicos y las acreditaciones especiales se presentan por separado.
- Las fechas reutilizan `inicioEnMexico` y `ZONA_HORARIA`; los límites sin offset, filtros de próximas/finalizadas e historial usan la hora institucional. La actualización periódica y el botón Actualizar datos recalculan los filtros temporales.
- La generación y lectura del QR existentes permanecen sin cambios.

## Verificación automatizada

Desde la carpeta del proyecto:

```sh
npm ci
npm run lint
npm test
npm run build
```

`tests/taquilla-actividades.test.ts` cubre cierre y reapertura independientes con dos actividades el mismo día, conservación de registros ajenos, cancelación/suspensión, permisos retirados, versión obsoleta, restauración ante fallo de escritura, cupos distintos, especiales sin duplicar, intenciones libres y apartados/ofertas vigentes. Comprueba los límites en UTC, Los Ángeles, Tokio y Ciudad de México.

`tests/documentacion.test.ts` comprueba que los botones UI-62, UI-63 y UI-64 conservan caso, interfaz y destino propios.

## Recorrido manual y evidencia

1. Iniciar con el organizador responsable de un evento publicado que tenga dos actividades futuras A y B el mismo día. Sus nombres, horarios o recintos deben ser distintos.
2. Desde su configuración, abrir **Apertura y cierre de inscripciones**. Cerrar solo A y confirmar. Verificar A cerrada y B abierta, el historial exclusivo de A, las reservas confirmadas conservadas y la liberación exclusiva de sus apartados.
3. Abrir **Panel de taquilla y participación**. Seleccionar A y luego B; comprobar sus cupos, reservas, especiales, espera y accesos contra sus registros. Comprobar también modalidad y periodo.
4. Abrir **Gestión de boletos especiales**. Elegir una actividad abierta y comprobar que el paquete corresponde a esa actividad y conserva los QR emitidos previamente.
5. En **Documentación → Motor de taquilla**, abrir CU-MT-07 → UI-62, CU-MT-08 → UI-63 y CU-MT-09 → UI-64. Cada botón debe abrir su pantalla y conservar `interfaz` y `caso` en la ruta.

La prueba de navegador utilizó almacenamiento independiente con A y B el 2 de noviembre de 2026 y el dispositivo configurado en Asia/Tokyo. El máximo general era 242; los cupos propios fueron A=5 y B=3. Tras cerrar A: A conservó una reserva, un especial, una persona en espera, un acceso registrado y tres lugares libres; B permaneció abierta con dos reservas, un especial, una persona en espera, un acceso registrado y cero lugares libres. Una misma cuenta tuvo acceso a ambas actividades. Los tres botones de Documentación abrieron sus destinos y no hubo errores de página.

- [Word actualizado con capturas, controles y referencias UI](Pantallas_Motor_Taquilla_Sprint5.docx)
- [A cerrada y B abierta](evidencias/sprint5-taquilla/UI-63_CierreA_BAbierta.png)
- [Panel de ambas actividades](evidencias/sprint5-taquilla/UI-64_PanelActividades.png)
- [Filtro de B](evidencias/sprint5-taquilla/UI-64_FiltroActividadB.png)
- [Boletos especiales](evidencias/sprint5-taquilla/UI-62_BoletosActividad.png)
- [Documentación CU-MT-07](evidencias/sprint5-taquilla/Documentacion_CU-MT-07.png)
- [Documentación CU-MT-08](evidencias/sprint5-taquilla/Documentacion_CU-MT-08.png)
- [Documentación CU-MT-09](evidencias/sprint5-taquilla/Documentacion_CU-MT-09.png)
- [Registro de comprobación en navegador](evidencias/sprint5-taquilla/verificacion-navegador.json)
