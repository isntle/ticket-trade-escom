# Guardado de distribución por actividad

Contrato del primer bloque de TICKTRADE-183 para conectar el editor de TICKTRADE-168. Los dos métodos usan la sesión normal de Ticket Trade. Puede utilizarlos el organizador responsable o Subdirección.

## Ruta

`/api/organizacion/eventos/:idEvento/actividades/:idActividad/distribucion`

- **GET** devuelve `{ datos }` con `idActividad`, `idRecinto`, `aforo`, `aforoRecinto`, `estadoEvento`, `editable`, `lugares` y `version`.
- **PATCH** recibe la versión del último GET o PATCH exitoso y los lugares que cambiaron. Devuelve la distribución completa con la versión vigente. Conserva el resto de los lugares.

```json
{
  "version": "<valor recibido de la API>",
  "cambios": [
    { "idLugarRecinto": "18", "categoria": "vip" },
    { "idLugarRecinto": "19", "categoria": "bloqueado" }
  ]
}
```

Cada elemento de `lugares` incluye `idLugarRecinto`, `idLugarActividad` (puede ser nulo), `codigo`, `fila` (puede ser nula), `x`, `y`, `categoria`, `fueraDeServicio` y `ocupado`. Para guardar usa el ID físico `idLugarRecinto`. En el mapa de taquilla se sigue usando `idLugarActividad`. Cuando todavía no hay clasificación persistida, el editor recibe `asistente` como valor inicial e `idLugarActividad: null`.

Las categorías del catálogo de PostgreSQL son `asistente`, `vip`, `staff` y `bloqueado`. El editor remoto debe presentar esas cuatro. Bloquear cambia la categoría en esa actividad y conserva el lugar físico. Si el aforo ya ocupa toda la capacidad utilizable del mapa, primero hay que revisar la reducción de aforo con el flujo de cambios del evento.

## Respuesta del editor

- Respeta `editable: false` y deja en solo lectura los lugares ocupados o fuera de servicio.
- Con HTTP 409, conserva los cambios locales, muestra el mensaje de la API y ofrece recargar la distribución para revisar el conflicto. Evita reenviar automáticamente una versión nueva con cambios viejos.
- Con HTTP 422, indica que la categoría o los lugares requieren corrección. Con 403, explica que la sesión no tiene permiso. Con 404, la relación evento–actividad no existe o la actividad es de una modalidad sin lugar asignado.
- Tras guardar, usa la respuesta como base del siguiente cambio. El estado de ocupación puede cambiar entre una lectura y el guardado. El servidor revalida antes de escribir y protege las reservas y los apartados vigentes.

La distribución usa `LugarRecinto`, `LugarActividad` y el catálogo de categorías existente. Este bloque no requiere migración en Supabase. Para verificarlo en local, ejecuta `npm run test:postgres` con una conexión de PostgreSQL local. El script crea una base desechable y cubre permisos, recarga, aforo, ediciones concurrentes, una carrera contra taquilla y protección de reservas confirmadas.
