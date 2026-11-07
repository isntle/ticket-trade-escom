# Conexión de PostgreSQL con el frontend · Luis y Regina

## Distribución propuesta

**Regina:** exportador CSV y adaptación de las listas autorizadas. Puede trabajar primero con la información local. Después conecta esas consultas a las respuestas de la API acordadas.

**Luis y Regina:** fijar los contratos, crear la API y conectar por recorridos completos. No dividir la conexión como «una persona cambia todos los contextos y otra todas las tablas»: acordar primero una respuesta y conectar una operación de principio a fin. Revisar conjuntamente autenticación y escrituras que afectan reservas.

## Primer paso: consulta sin cambiar escrituras

El repositorio ya contiene `src/servicios/http.ts`, `organizacion.ts`, `contratoOrganizacion.ts` y `organizacionRemota.ts`. Leerlos y reutilizarlos. `contratoOrganizacion.ts` ya diferencia consultas/comandos y advierte que bigint viaja como texto. No crear otro cliente HTTP general.

Montar una API local con conexión mediante un pool de PostgreSQL y variables de entorno solo del servidor. Crear una cuenta de servicio con permisos limitados; no reutilizar el usuario propietario del esquema. Las rutas de la API deben acordarse: los nombres de tabla no se convierten automáticamente en rutas.

Primera respuesta: recintos, actividades y eventos consultables. Mantener las estructuras TypeScript que consumen las páginas y transformar las filas SQL en un adaptador. Comprobar estados vacíos, error de consulta y permiso denegado antes de cambiar una escritura.

## Correspondencias principales

| Frontend actual | PostgreSQL | Adaptación |
|---|---|---|
| Usuario.id, Evento.id y demás ID string | PK/FK bigint | Serializar a decimal string en JSON. No usar Number/parseInt ni mezclar IDs demo como `evt-...` con IDs nuevos. Importaciones antiguas necesitan una correspondencia explícita. |
| Usuario.nombre | Cuenta.nombres/primer_apellido/segundo_apellido | Mostrar nombre compuesto; en formularios futuros capturar las partes. No separar un nombre antiguo automáticamente por espacios. |
| correoConfirmado | Cuenta.correo_confirmado_en | Boolean derivado; no es verificación documental. |
| esVerificado/verificacionHasta/periodoVerificado | SolicitudVerificacion + Verificacion + PeriodoEscolar | Consultar vigencia con v_verificaciones_vigentes. No fiarse de una palomita enviada desde React. |
| numeroEmpleado | DatosVerificacionEmpleado.numero_empleado | Se captura al solicitar verificación, no en el registro inicial del empleado. |
| roles y permisos operativos | TipoCuenta, verificación vigente, StaffEvento y JefaturaAcademia | Construir permisos en servidor. Rol de registro no concede administración ni Staff. |
| SolicitudEvento | Evento + SolicitudEvento + Actividad + ResolucionSolicitud | El evento se crea en borrador junto con su primera actividad; la solicitud tramita su autorización. |
| fechas/fechasSolicitadas; idFechaEvento | Actividad; id_actividad | Una actividad por fecha, horario y recinto. No agrupar por día perdiendo actividades. |
| itinerarios | ItinerarioDia + Archivo | Un archivo por evento y día. La URL de consulta se resuelve desde la clave de almacenamiento; no guardar data URLs en PostgreSQL. |
| Recinto.capacidad | Recinto.aforo_maximo | Lugares/PC desde LugarRecinto y EstacionComputo. Ver detalles retirados en el documento de diferencias. |
| ArregloAsientos | LugarActividad + AsignacionAsiento | Categorías sobre lugares físicos, asignación por compromiso. Los conteos se consultan; no se reintroducen tablas de versiones. |
| libre/registro/controlado | TipoAcceso | Entrada libre / Registro sin asiento asignado / Reservación con lugar asignado. |
| estado solicitud `autorizada` | EstadoSolicitudEvento = Aprobada | Usar el mapeo existente de contratoOrganizacion.ts. No devolver Aprobada directamente a una pantalla que espera autorizada. |
| apartado_temporal | Apartado + CompromisoCupo | Creado + 2 minutos. Al confirmar, convertir el apartado en la misma transacción. |
| Reservacion/BoletoDigital | BoletoEvento + Reservacion + CompromisoCupo | Pase por persona/evento y reserva por actividad. Generar la proyección BoletoDigital desde las relaciones; no duplicar el QR por reserva. |
| BoletoDigital.estado | Reservacion + EntradaOrdinaria | Cancelada → cancelado; entrada registrada → utilizado; confirmada sin entrada → valido. |
| Acreditación especial | BoletoEspecial + CompromisoCupo | No requiere cuenta del portador. Solo lugares VIP/Staff. |
| bitacoraEscaneos | EntradaOrdinaria/EntradaEspecial parcialmente | Estas tablas guardan éxitos, no todos los intentos. Ver diferencias antes de conectar todo el historial. |
| bloqueos de varios recintos | BloqueoRecinto | Un registro por recinto, guardados juntos; la pantalla puede agruparlos. |
| horario de clases | ActividadInterna + DiaActividadInterna | Informativo. No bloquear la solicitud solo por coincidir con clases. |
| avisos de cuenta | Notificacion / EnvioCorreo | El registro de correo no envía por sí mismo. Necesita un proceso del servidor. |

## Orden de conexión

1. Lecturas de catálogo/recintos/eventos/actividades y detalles públicos. Verificar categorías y visibilidad antes de importar eventos viejos.
2. Sesión, perfiles, carga real de archivos y verificación documental. Los archivos viven en almacenamiento privado/público según uso; la BD guarda metadatos. Contraseñas se procesan con hash seguro en servidor; token de recuperación se guarda como hash.
3. Borradores y envío de solicitudes. Guardar evento + primera actividad conjuntamente; completar contactos/cartel al enviar. Lo que exige el HTML se valida en UI y en API. No enviar documentos de identidad a endpoints públicos.
4. Resoluciones completas: la Subdirección autenticada revisa y aprueba/devuelve/rechaza. Verificar disponibilidad de nuevo dentro de la transacción antes de publicar. Los cambios propuestos en CambioActividadSolicitado no reservan el destino.
5. Reservas y QR, seguidos de Check-in. Guardar cupo/asiento/confirmación/pase juntos; registrar una entrada por reserva. No autorizar actividades que el pase no contiene.
6. CSV con las vistas incluidas; por último notificaciones/correos reales cuando esté preparado el servidor.

## Operaciones atómicas

Usar un cliente del pool durante toda la transacción, `BEGIN` (READ COMMITTED), consultas parametrizadas y `COMMIT`; si ocurre error, `ROLLBACK` y liberar el cliente. Nunca hacer cada paso de una operación con una conexión diferente.

- Borrador: Evento + primera Actividad; no puede quedar un evento sin actividades.
- Verificación: solicitud + datos complementarios + referencias documentales. La validación del PDF, su fecha, la identidad y los permisos se realizan en servidor. Aprobación + Verificacion juntas. Al retirar verificación, retirar también la jefatura cuando exista.
- Confirmar acceso: CompromisoCupo + AsignacionAsiento cuando aplique + BoletoEvento si aún no existe + Reservacion. La API genera códigos impredecibles con un generador criptográfico del servidor; los IDs numéricos no sirven de QR secreto.
- Convertir apartado: verificar tiempo, cambiar EstadoApartado a Convertido y crear Reservacion con el mismo compromiso. No generar otro compromiso consumiendo cupo doble.
- Cancelar reserva: estado Cancelada + fecha + causa y liberar compromiso. Conservar el pase, las otras reservas y las evidencias.
- Escanear: identificar pase, elegir actividad, comprobar reserva/cupo/estado/horario/operador y crear EntradaOrdinaria. Su UNIQUE impide dos entradas para esa reserva. La API no acepta como autorizado cualquier id_cuenta_operadora que mande el cliente.
- Cambiar actividad: conservar identidad de actividad, reservas y pase; validar destino y reaplicar distribución/reasignaciones antes de confirmar. Un cambio no se aplica actividad por actividad dejando la mitad publicada.

`23505` puede representar duplicidad; `23514` una regla de negocio; `23503` una referencia inexistente. Traducirlos a respuestas estables (por ejemplo 409 para un conflicto real) sin mostrar SQL interno al usuario. El cliente no debe reintentar automáticamente una escritura como si fuese una consulta.

## Qué protege este DDL y qué sigue siendo backend

Se incluyen PK/FK/UNIQUE/CHECK y 42 comprobaciones entre tablas. Las escrituras toman un bloqueo transaccional común para que dos conexiones no validen simultáneamente el último cupo/asiento usando datos anteriores. Esta primera implementación prioriza integridad para el volumen académico; serializa escrituras y **no es una afirmación de rendimiento para producción**. Si luego se optimiza con bloqueos por actividad/persona, conservar las pruebas de concurrencia.

No se implementan con el DDL: inicio de sesión, autorización HTTP, validación real del contenido de archivos, revisión humana, cifrado/hashing de credenciales, generación segura de QR, envío de correos, configuración oficial del semestre ni tareas programadas. Tampoco se ejecuta por sí solo el cierre/limpieza al vencer plazos: un servicio del backend debe consultar y actuar. Las vistas calculan vigencia y plazos sin almacenar contadores de tiempo restantes.

No poner `CURRENT_DATE` en un CHECK de vigencia que haga inválidas todas las filas cuando pase el semestre. La vigencia se consulta, y las transiciones correspondientes se ejecutan de forma controlada.
