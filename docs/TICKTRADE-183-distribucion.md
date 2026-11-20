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

## Integración con taquilla y archivos privados

La consulta de disponibilidad devuelve también `categorias`, un objeto indexado por `idLugarActividad`. Incluye solo `vip`, `staff` y `bloqueado`, incluidas estaciones fuera de servicio. El mapa abierto aplica los cambios con su consulta periódica. Un lugar omitido recupera la categoría de asistente.

El invitado solicita el cartel o itinerario subido con `GET /api/archivos/eventos/:idEvento/:idArchivo`, enviando el token en `X-TicketTrade-Enlace`. La API valida publicación, privacidad y relación con el evento, excluye respaldos y expedientes, y no permite cachear la respuesta. El detalle usa la imagen autenticada para la vista previa y descarga. Los carteles de ejemplo servidos como recursos estáticos conservan su ruta.

Flujos verificados en la suite PostgreSQL local: imagen de cartel e itinerario subidos, acceso antes de iniciar sesión con invitación válida, rechazo de archivo ajeno o documento de verificación, renovación que invalida el enlace anterior, y aparición y retiro de un bloqueo en la consulta de taquilla.

La lista de espera todavía no aparece como acción en modo remoto. El esquema vigente solo describe un aviso de disponibilidad, sin prioridad ni apartado. La cola de ofertas requiere un modelo explícito y una migración independiente de este cambio.
