# Plan de exportación CSV · Regina

## Objetivo

Desde los paneles autorizados, descargar una lista entendible de participantes o de entradas registradas, usando los mismos filtros que se ven en pantalla. Puede construirse con los datos locales actuales y después cambiar su fuente por la API. No necesita esperar a que PostgreSQL esté conectado.

## Primera entrega: lista de participantes

Trabajar primero sobre `src/paginas/PanelTaquillaParticipacionPagina.tsx`, que ya reúne eventos, reservaciones, boletos y recintos. Revisar sus filas y filtros actuales antes de añadir otra consulta o repetir la lógica. Usar los permisos existentes de consulta del evento. No dar acceso nuevo a datos de otros organizadores.

1. Añadir «Descargar CSV» junto a los filtros de la lista correspondiente, con un icono de descarga de Lucide.
2. Exportar las filas resultantes de esos filtros, incluidas todas las páginas si la lista está paginada. Indicar claramente «Exportar resultados filtrados». No exportar solo los elementos montados en el DOM.
3. Mantener una fila por reservación/actividad. Una persona puede aparecer dos veces si reservó dos actividades del mismo evento: no deduplicar por correo ni por QR.
4. Columnas: Evento, Actividad, Fecha, Inicio, Fin, Recinto, Participante, Correo, Lugar, Estado de reservación, Asistencia. Lugar vacío → «Sin lugar asignado». No incluir correo para perfiles que no tengan permiso de verlo.
5. Usar un nombre como `participantes-evento-2026-11-07.csv` y un mensaje breve al terminar. Sin filas → deshabilitar descarga y explicar que no hay resultados para los filtros.

## Utilidad compartida pequeña

Crear `src/utilidades/csv.ts` solo si no existe una equivalente. Una función recibe encabezados y filas ya preparados; no lee el contexto, no decide permisos y no conoce PostgreSQL.

- CSV separado por comas; UTF-8 con BOM y saltos CRLF para facilitar apertura en Excel en Windows. Si Excel usa punto y coma por la configuración regional, importar mediante Datos → Desde texto/CSV seleccionando UTF-8 y coma. No depender de `sep=,`.
- Encerrar cada celda entre comillas dobles y duplicar las comillas internas. Respetar acentos, comas y saltos de línea; convertir null/undefined en celda vacía.
- Evitar fórmulas al abrir en Excel: para textos capturados por usuarios cuyo inicio, incluso tras espacios o controles, sea `=`, `+`, `-` o `@`, anteponer apóstrofo. Aplicarlo también a valores que comiencen por tabulador/CR/LF. No ejecutar ni evaluar contenido.
- Descargar con Blob y un enlace temporal; retirar el enlace y liberar su URL. No añadir bibliotecas de hojas de cálculo para esta exportación.
- No incluir contraseñas, tokens, documentos, códigos QR ni códigos manuales. Los identificadores grandes que lleguen como string deben permanecer como string, sin `Number()`.

## Segunda entrega: accesos

Reutilizar la utilidad desde `src/paginas/HistorialAccesosPagina.tsx`. Coordinar primero con Hugo: la TICKTRADE-137 modifica los filtros de ese mismo archivo. Integrar el botón después de sus cambios o acordar quién toca esa sección.

Columnas: Evento, Actividad, Fecha de actividad, Horario, Recinto, Tipo de acceso, Participante cuando exista, Lugar, Momento del registro, Operador y Resultado legible. Exportar únicamente el alcance autorizado y los filtros aplicados.

**Diferencia que no hay que ocultar:** el frontend actual registra también intentos fallidos; el HTML nuevo solo contiene `EntradaOrdinaria` y `EntradaEspecial`, es decir, entradas exitosas. La vista SQL `v_entradas_csv` exporta exclusivamente entradas registradas. Si se exporta ahora toda la bitácora local, el botón y sus columnas deben distinguirla de las entradas exitosas; no afirmar que esa bitácora ya está respaldada por la base nueva. Consultar `DIFERENCIAS_CON_EL_FRONTEND.md` antes de conectar ese reporte.

## Qué cambia cuando exista API

Luis y Regina acuerdan respuestas que entreguen las mismas filas. El serializador CSV permanece igual. La API aplica los permisos y los filtros sobre datos actuales, no confía en un idOrganizador que mande el cliente.

Consultas SQL disponibles para el backend:

```sql
SELECT * FROM ticket_trade.v_asistentes_csv
WHERE id_evento = $1
ORDER BY fecha,hora_inicio,actividad,asistente,id_reservacion;

SELECT * FROM ticket_trade.v_entradas_csv
WHERE id_evento = $1
ORDER BY registrada_en,tipo_entrada,id_entrada;
```

`$1` se recibe mediante una consulta parametrizada del servidor; antes se verifica la autorización sobre el evento. No concatenar el ID en SQL. No ejecutar SQL desde React ni llamar a PostgreSQL directamente desde Vite.

Para el primer CSV basta la descarga con las filas locales. La exportación de conjuntos grandes desde servidor se deja para cuando exista la API; no simular que una página parcial contiene todo el resultado remoto.

## Cómo revisar la entrega

Probar acentos, nombres con comas/comillas/saltos de línea, valores como `=SUM(1,1)`, lista vacía, filtros combinados, dos actividades reservadas por la misma persona, entradas especiales sin cuenta del titular y una cuenta sin autorización. Abrir el archivo en Excel o LibreOffice para confirmar las columnas y que los valores peligrosos no se evalúan como fórmulas. Mantener las verificaciones existentes del proyecto y entregar PR con capturas del botón y una muestra ficticia del CSV.

Fuera de esta tarea: PDF, estructura de la BD, cambios de QR, extracción general de DatosContexto y sistema de correo. El PDF puede planificarse aparte para no mezclar dos entregas.
