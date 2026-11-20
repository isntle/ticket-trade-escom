# Rendimiento y recuperación de consultas

## Qué cambió

- La lectura de eventos consulta actividades e itinerarios en conjunto para los eventos visibles. El historial se obtiene en una consulta y solo para los eventos cuyo historial puede ver la cuenta. No se cambió el contrato JSON.
- La vista deja de consultar periódicamente en pestañas ocultas y mientras tiene una lectura activa. Al regresar a la pestaña vuelve a consultar. Al cambiar de identidad se descarta la vista de la sesión anterior.
- Un fallo inicial ofrece volver a consultar. Si ya había datos de la misma sesión, se conservan. Si la API confirmó una escritura y falló la actualización posterior, la interfaz explica que el cambio se guardó. Las escrituras no se reintentan automáticamente.
- La imagen principal de cartelera tiene prioridad. Las imágenes secundarias conservan carga diferida y pueden decodificarse sin bloquear la vista.

## Medición local

Comparación contra `d8241ef` con 11 eventos del mismo PostgreSQL de demostración. Mismo acceso anónimo, rutas y datos. Se hicieron tres lecturas de calentamiento y 15 muestras alternadas por versión. Se contrastó el JSON, excluyendo la marca de tiempo de configuración generada al consultar.

| Ruta | Consultas SQL antes → después | Mediana local antes → después | Bytes antes → después |
| --- | ---: | ---: | ---: |
| `/api/eventos` | 13 → 3 | 6.85 → 5.95 ms | 15 228 → 15 228 |
| `/api/estado` | 21 → 11 | 12.22 → 11.69 ms | 174 937 → 174 937 |

Las mediciones locales muestran el ahorro de consultas. Las latencias y tamaños alojados deben verificarse después de que se despliegue el mismo commit. El tamaño de la respuesta se mantuvo para conservar los recorridos que consumen los datos.

## Comprobación

Ejecutar `npm run lint`, `npm test`, `npm run verify:api`, `npm run build` y `npm run test:postgres` con PostgreSQL local. Esta última orden usa una base desechable. Para reproducir la recuperación en el navegador, abrir la cartelera, desconectar la red, volverla a conectar y pulsar **Volver a consultar**. Durante un guardado, distinguir una escritura confirmada de una respuesta perdida antes de intentar otra vez.
