-- Ticket Trade: instalación completa revisada con sugerencias de tipos. PostgreSQL 18.1.
-- Base nueva; la transacción falla sin sobrescribir esquemas existentes.
BEGIN;
-- Archivo: 01_crear_esquema.sql
-- Ticket Trade. Modelo recibido el 7 de noviembre de 2026. PostgreSQL 16 o posterior.
-- Instalación en una base nueva. No borra ni reemplaza esquemas existentes.
CREATE SCHEMA ticket_trade;
SET LOCAL search_path = ticket_trade, pg_catalog;
SET LOCAL TIME ZONE 'America/Mexico_City';
CREATE TABLE ticket_trade."Cuenta" (
  "id_cuenta" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombres" text NOT NULL,
  "primer_apellido" text NOT NULL,
  "segundo_apellido" text NOT NULL,
  "correo" text NOT NULL UNIQUE,
  "contrasena_hash" text,
  "correo_confirmado_en" timestamptz,
  "id_tipo_cuenta" bigint NOT NULL,
  "id_estado_cuenta" bigint NOT NULL,
  PRIMARY KEY ("id_cuenta"),
  CONSTRAINT "ck_cuenta_1" CHECK (btrim(correo) <> '' AND correo = btrim(correo) AND correo ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  CONSTRAINT "ck_cuenta_2" CHECK (btrim(nombres) <> '' AND btrim(primer_apellido) <> '')
);
COMMENT ON TABLE ticket_trade."Cuenta" IS 'Datos de acceso de cuentas comunes y especiales. Correo único entre cuentas comunes y especiales; un Administrador. Administrador y Subdirección son cuentas distintas sin rol de registro. Contraseña pendiente solo antes de completar la invitación.';
CREATE TABLE ticket_trade."PerfilUsuario" (
  "id_cuenta" bigint NOT NULL,
  "id_rol_registro" bigint NOT NULL,
  PRIMARY KEY ("id_cuenta")
);
COMMENT ON TABLE ticket_trade."PerfilUsuario" IS 'Rol de registro de una cuenta común. Una cuenta común tiene exactamente un perfil. Estudiante y Empleado son subtipos exclusivos según rol; Externo no tiene fila adicional.';
CREATE TABLE ticket_trade."Estudiante" (
  "id_cuenta" bigint NOT NULL,
  "boleta" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_cuenta"),
  CONSTRAINT ck_boleta_formato CHECK (boleta ~* '^([0-9]{10}|(PE|PP)[0-9]{8})$')
);
COMMENT ON TABLE ticket_trade."Estudiante" IS 'Datos propios del estudiante. ';
CREATE TABLE ticket_trade."EmpleadoIPN" (
  "id_cuenta" bigint NOT NULL,
  "rfc" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_cuenta")
);
COMMENT ON TABLE ticket_trade."EmpleadoIPN" IS 'Datos propios del empleado. ';
CREATE TABLE ticket_trade."TokenCuenta" (
  "id_token_cuenta" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_cuenta" bigint NOT NULL,
  "id_proposito_token_cuenta" bigint NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "correo_destino" text NOT NULL,
  "vence_en" timestamptz NOT NULL,
  "utilizado_en" timestamptz,
  PRIMARY KEY ("id_token_cuenta"),
  CONSTRAINT "ck_tokencuenta_1" CHECK (btrim(token_hash) <> ''),
  CONSTRAINT "ck_tokencuenta_2" CHECK (utilizado_en IS NULL OR utilizado_en <= vence_en)
);
COMMENT ON TABLE ticket_trade."TokenCuenta" IS 'Confirmación de buzón, recuperación o invitación de cuenta especial. ';
CREATE TABLE ticket_trade."PeriodoEscolar" (
  "id_periodo_escolar" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "clave" text NOT NULL UNIQUE,
  "inicio" date NOT NULL,
  "fin" date NOT NULL,
  PRIMARY KEY ("id_periodo_escolar"),
  CONSTRAINT "ck_periodoescolar_1" CHECK (inicio <= fin)
);
COMMENT ON TABLE ticket_trade."PeriodoEscolar" IS 'Intervalo que gobierna vigencia y límite de intentos. ';
CREATE TABLE ticket_trade."SolicitudVerificacion" (
  "id_solicitud_verificacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_cuenta" bigint NOT NULL,
  "id_periodo_escolar" bigint NOT NULL,
  "motivo_solicitud" text NOT NULL,
  "enviada_en" timestamptz NOT NULL,
  "id_estado_solicitud_verificacion" bigint NOT NULL,
  "resuelta_en" timestamptz,
  "id_cuenta_resolutora" bigint,
  "motivo_resolucion" text,
  PRIMARY KEY ("id_solicitud_verificacion"),
  CONSTRAINT "ck_solicitudverificacion_1" CHECK (btrim(motivo_solicitud) <> ''),
  CONSTRAINT "ck_solicitudverificacion_2" CHECK (resuelta_en IS NULL OR resuelta_en >= enviada_en)
);
COMMENT ON TABLE ticket_trade."SolicitudVerificacion" IS 'Registro mínimo de cada envío y su resolución. Máximo tres envíos por cuenta y periodo y uno pendiente por cuenta. Conservar resultado y motivo; eliminar PDF rechazado al resolver y aprobado al vencer o retirarse la verificación. Al envío: un documento para estudiante o empleado y dos para externo. En el historial puede no quedar ninguno tras la eliminación documental. Los datos complementarios de empleado o externo son obligatorios únicamente para el rol correspondiente. En cada envío el solicitante debe explicar por qué solicita la verificación; este motivo es independiente del motivo de resolución.';
CREATE TABLE ticket_trade."DatosVerificacionEmpleado" (
  "id_solicitud_verificacion" bigint NOT NULL,
  "numero_empleado" text NOT NULL,
  PRIMARY KEY ("id_solicitud_verificacion"),
  CONSTRAINT "ck_datosverificacionempleado_1" CHECK (btrim(numero_empleado) <> '')
);
COMMENT ON TABLE ticket_trade."DatosVerificacionEmpleado" IS 'Declaración de número de empleado para el trámite. ';
CREATE TABLE ticket_trade."DatosVerificacionExterno" (
  "id_solicitud_verificacion" bigint NOT NULL,
  "nombre_entidad" text NOT NULL,
  "cargo_o_relacion" text NOT NULL,
  PRIMARY KEY ("id_solicitud_verificacion"),
  CONSTRAINT "ck_datosverificacionexterno_1" CHECK (btrim(nombre_entidad) <> '' AND btrim(cargo_o_relacion) <> '')
);
COMMENT ON TABLE ticket_trade."DatosVerificacionExterno" IS 'Representación declarada sin catálogo empresarial. ';
CREATE TABLE ticket_trade."DocumentoVerificacion" (
  "id_documento_verificacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_solicitud_verificacion" bigint NOT NULL,
  "id_tipo_documento_verificacion" bigint NOT NULL,
  "id_archivo" bigint NOT NULL,
  PRIMARY KEY ("id_documento_verificacion"),
  UNIQUE ("id_solicitud_verificacion", "id_tipo_documento_verificacion")
);
COMMENT ON TABLE ticket_trade."DocumentoVerificacion" IS 'PDF privado aportado para un requisito. ';
CREATE TABLE ticket_trade."Verificacion" (
  "id_verificacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_solicitud_verificacion_aprobada" bigint NOT NULL UNIQUE,
  "retirada_en" timestamptz,
  "id_cuenta_retiro" bigint,
  "motivo_retiro" text,
  PRIMARY KEY ("id_verificacion"),
  CONSTRAINT "ck_verificacion_1" CHECK ((retirada_en IS NULL AND id_cuenta_retiro IS NULL AND motivo_retiro IS NULL) OR (retirada_en IS NOT NULL AND id_cuenta_retiro IS NOT NULL AND nullif(btrim(motivo_retiro),'') IS NOT NULL))
);
COMMENT ON TABLE ticket_trade."Verificacion" IS 'Autorización derivada de una aprobación; su vigencia termina con el periodo o el retiro. Solo nace de una solicitud aprobada. Vigente hasta fin del periodo o retiro. Perderla retira la jefatura y cancela solicitudes pendientes sin cancelar eventos aprobados.';
CREATE TABLE ticket_trade."Academia" (
  "id_academia" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_academia")
);
COMMENT ON TABLE ticket_trade."Academia" IS 'Catálogo institucional. ';
CREATE TABLE ticket_trade."JefaturaAcademia" (
  "id_academia" bigint NOT NULL,
  "id_cuenta_empleada" bigint NOT NULL UNIQUE,
  "id_cuenta_otorgante" bigint NOT NULL,
  PRIMARY KEY ("id_academia")
);
COMMENT ON TABLE ticket_trade."JefaturaAcademia" IS 'Nombramiento vigente que habilita la autoaprobación ordinaria. ';
CREATE TABLE ticket_trade."Recinto" (
  "id_recinto" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL,
  "descripcion" text NOT NULL,
  "id_tipo_recinto" bigint NOT NULL,
  "numero_salon" text,
  "aforo_maximo" integer NOT NULL,
  "id_archivo_croquis" bigint,
  PRIMARY KEY ("id_recinto"),
  CONSTRAINT "ck_recinto_1" CHECK (aforo_maximo > 0),
  CONSTRAINT "ck_recinto_2" CHECK (btrim(nombre) <> '')
);
COMMENT ON TABLE ticket_trade."Recinto" IS 'Espacio físico precargado; Administrador solo modifica. ';
CREATE TABLE ticket_trade."FotografiaRecinto" (
  "id_recinto" bigint NOT NULL,
  "id_archivo" bigint NOT NULL,
  PRIMARY KEY ("id_recinto", "id_archivo")
);
COMMENT ON TABLE ticket_trade."FotografiaRecinto" IS 'Fotografías del recinto, sin orden de visualización. Hasta seis fotografías por recinto, de hasta 150 000 bytes cada una; sin atributo de orden.';
CREATE TABLE ticket_trade."TipoAccesorio" (
  "id_tipo_accesorio" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_accesorio")
);
COMMENT ON TABLE ticket_trade."TipoAccesorio" IS 'Tipo de accesorio general. ';
CREATE TABLE ticket_trade."ExistenciaAccesorio" (
  "id_recinto" bigint NOT NULL,
  "id_tipo_accesorio" bigint NOT NULL,
  "id_estado_funcionamiento" bigint NOT NULL,
  "cantidad" integer NOT NULL,
  PRIMARY KEY ("id_recinto", "id_tipo_accesorio", "id_estado_funcionamiento"),
  CONSTRAINT "ck_existenciaaccesorio_1" CHECK (cantidad >= 0)
);
COMMENT ON TABLE ticket_trade."ExistenciaAccesorio" IS 'Cantidad por tipo y estado de funcionamiento. ';
CREATE TABLE ticket_trade."LugarRecinto" (
  "id_lugar_recinto" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_recinto" bigint NOT NULL,
  "codigo" text NOT NULL,
  "fila" text,
  "posicion_x" numeric NOT NULL,
  "posicion_y" numeric NOT NULL,
  "id_tipo_lugar" bigint NOT NULL,
  PRIMARY KEY ("id_lugar_recinto"),
  UNIQUE ("id_recinto", "codigo")
);
COMMENT ON TABLE ticket_trade."LugarRecinto" IS 'Butaca o estación física con posición fija.  Una estación de trabajo tiene exactamente una ficha EstacionComputo; una butaca no tiene ficha.';
CREATE TABLE ticket_trade."EstacionComputo" (
  "id_lugar_recinto" bigint NOT NULL,
  "id_estado_funcionamiento" bigint NOT NULL,
  PRIMARY KEY ("id_lugar_recinto")
);
COMMENT ON TABLE ticket_trade."EstacionComputo" IS 'Estado individual del equipo; una avería no impide reservar la estación. ';
CREATE TABLE ticket_trade."ActividadInterna" (
  "id_actividad_interna" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_recinto" bigint NOT NULL,
  "inicio_vigencia" date NOT NULL,
  "fin_vigencia" date NOT NULL,
  "hora_inicio" time NOT NULL,
  "hora_fin" time NOT NULL,
  PRIMARY KEY ("id_actividad_interna"),
  CONSTRAINT "ck_actividadinterna_1" CHECK (inicio_vigencia <= fin_vigencia),
  CONSTRAINT "ck_actividadinterna_2" CHECK (hora_inicio < hora_fin)
);
COMMENT ON TABLE ticket_trade."ActividadInterna" IS 'Bloque semanal informativo; se puede borrar, sin estado. Repetición semanal informativa; omitir inhábiles. Sin estado ni historial de eliminación. Cada horario tiene de uno a siete días distintos de la semana.';
CREATE TABLE ticket_trade."DiaActividadInterna" (
  "id_actividad_interna" bigint NOT NULL,
  "dia_semana" integer NOT NULL,
  PRIMARY KEY ("id_actividad_interna", "dia_semana"),
  CONSTRAINT "ck_diaactividadinterna_1" CHECK (dia_semana BETWEEN 1 AND 7)
);
COMMENT ON TABLE ticket_trade."DiaActividadInterna" IS 'Días de repetición semanal. ';
CREATE TABLE ticket_trade."DiaInhabil" (
  "fecha" date NOT NULL,
  "motivo" text NOT NULL,
  PRIMARY KEY ("fecha")
);
COMMENT ON TABLE ticket_trade."DiaInhabil" IS 'Excepciones al calendario de revisión y de actividades internas. ';
CREATE TABLE ticket_trade."BloqueoRecinto" (
  "id_bloqueo_recinto" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_recinto" bigint NOT NULL,
  "id_tipo_bloqueo_recinto" bigint NOT NULL,
  "inicio" timestamptz NOT NULL,
  "fin_previsto" timestamptz,
  "motivo" text NOT NULL,
  "id_cuenta_responsable" bigint NOT NULL,
  "finalizado_en" timestamptz,
  PRIMARY KEY ("id_bloqueo_recinto"),
  CONSTRAINT "ck_bloqueorecinto_1" CHECK (fin_previsto IS NULL OR fin_previsto > inicio),
  CONSTRAINT "ck_bloqueorecinto_2" CHECK (finalizado_en IS NULL OR finalizado_en >= inicio),
  CONSTRAINT "ck_bloqueorecinto_3" CHECK (btrim(motivo) <> '')
);
COMMENT ON TABLE ticket_trade."BloqueoRecinto" IS 'Mantenimiento, bloqueo institucional o fuera de servicio. Fuera de servicio requiere reactivación manual; fin previsto no es fin real. Prorrogar tres días si vence sin actuación. Institucional: Subdirección. Mantenimiento y fuera de servicio: Administrador. Mantenimiento no desplaza actividades aprobadas. Institucional y fuera de servicio pueden suspender futuras actividades afectadas, nunca una iniciada o con Check-in.';
CREATE TABLE ticket_trade."Evento" (
  "id_evento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_cuenta_organizadora" bigint NOT NULL,
  "titulo" text,
  "descripcion" text,
  "correo_contacto" text,
  "telefono_contacto" text,
  "id_categoria_evento" bigint,
  "id_visibilidad_evento" bigint,
  "id_archivo_cartel" bigint,
  "token_enlace_privado" text UNIQUE,
  "id_estado_evento" bigint NOT NULL,
  "publicado_en" timestamptz,
  "total_senales_interes" integer DEFAULT 0 NOT NULL,
  PRIMARY KEY ("id_evento"),
  CONSTRAINT "ck_evento_1" CHECK (total_senales_interes >= 0)
);
COMMENT ON TABLE ticket_trade."Evento" IS 'Datos únicos del evento en preparación o publicado. Título, descripción, contactos, categoría, visibilidad, cartel y al menos una actividad: obligatorios al enviar o publicar. NULL en borrador no autoriza un envío incompleto. Token solo para evento privado. Interés global si existe actividad libre habilitada. Todo evento persistido, incluso en borrador, tiene al menos una actividad; guardar el primer borrador junto con su primera actividad e impedir eliminar la última.';
CREATE TABLE ticket_trade."Actividad" (
  "id_actividad" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_evento" bigint NOT NULL,
  "nombre" text NOT NULL,
  "descripcion" text NOT NULL,
  "fecha" date NOT NULL,
  "hora_inicio" time NOT NULL,
  "hora_fin" time NOT NULL,
  "id_recinto" bigint NOT NULL,
  "id_tipo_acceso" bigint NOT NULL,
  "aforo_solicitado" integer NOT NULL,
  "id_estado_actividad" bigint NOT NULL,
  PRIMARY KEY ("id_actividad"),
  CONSTRAINT "ck_actividad_1" CHECK (btrim(nombre) <> ''),
  CONSTRAINT "ck_actividad_2" CHECK (hora_inicio < hora_fin),
  CONSTRAINT "ck_actividad_3" CHECK (hora_fin <= TIME '21:00'),
  CONSTRAINT "ck_actividad_4" CHECK (aforo_solicitado > 0)
);
COMMENT ON TABLE ticket_trade."Actividad" IS 'Unidad de programación, cupo, reserva y entrada. Cada actividad ocurre en un día, un recinto y un intervalo; termina a más tardar a las 21:00. En laboratorios no se admite entrada libre.';
CREATE TABLE ticket_trade."ItinerarioDia" (
  "id_evento" bigint NOT NULL,
  "fecha" date NOT NULL,
  "id_archivo" bigint NOT NULL,
  PRIMARY KEY ("id_evento", "fecha")
);
COMMENT ON TABLE ticket_trade."ItinerarioDia" IS 'Una imagen opcional por día del evento. ';
CREATE TABLE ticket_trade."LugarActividad" (
  "id_lugar_actividad" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_actividad" bigint NOT NULL,
  "id_lugar_recinto" bigint NOT NULL,
  "id_categoria_lugar_actividad" bigint NOT NULL,
  PRIMARY KEY ("id_lugar_actividad"),
  UNIQUE ("id_actividad", "id_lugar_recinto")
);
COMMENT ON TABLE ticket_trade."LugarActividad" IS 'Clasificación de una butaca o estación para una actividad concreta. ';
CREATE TABLE ticket_trade."AfectacionActividad" (
  "id_bloqueo_recinto" bigint NOT NULL,
  "id_actividad" bigint NOT NULL,
  "resuelta_en" timestamptz,
  PRIMARY KEY ("id_bloqueo_recinto", "id_actividad")
);
COMMENT ON TABLE ticket_trade."AfectacionActividad" IS 'Causa de suspensión asociada al bloqueo que la originó. Mantenimiento no desplaza actividades. Los bloqueos institucionales y fuera de servicio pueden suspender actividades futuras sin Check-in; resolver la causa no reactiva automáticamente la actividad.';
CREATE TABLE ticket_trade."SolicitudEvento" (
  "id_solicitud_evento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_evento" bigint NOT NULL,
  "id_tipo_tramite" bigint NOT NULL,
  "id_tipo_anticipacion" bigint,
  "motivo" text,
  "id_estado_solicitud_evento" bigint NOT NULL,
  "envio_inicial" timestamptz,
  "inicio_revision" timestamptz,
  "version_edicion" integer DEFAULT 1 NOT NULL,
  PRIMARY KEY ("id_solicitud_evento"),
  CONSTRAINT "ck_solicitudevento_1" CHECK (version_edicion > 0),
  CONSTRAINT "ck_solicitudevento_2" CHECK (inicio_revision IS NULL OR (envio_inicial IS NOT NULL AND inicio_revision >= envio_inicial))
);
COMMENT ON TABLE ticket_trade."SolicitudEvento" IS 'Trámite inicial o modificación conjunta; ordinario o extraordinario. Máximo una inicial por evento y una modificación pendiente. Publicación directa de Subdirección sin solicitud inicial. Las propuestas de cambio no ocupan el destino. En Requiere corrección, el límite se calcula sumando 24 horas naturales a resuelta_en de la última devolución del ciclo actual. Sin devolución vigente no existe ese plazo. En revisión, el plazo vence al terminar el segundo día hábil posterior a inicio_revision, sin contar el día de envío, sábados, domingos ni fechas de DiaInhabil. Un reenvío para corregir inicia un nuevo ciclo; editar durante la revisión no lo reinicia. Una modificación de programación enviada incluye uno o más cambios; una solicitud inicial no los utiliza.';
CREATE TABLE ticket_trade."ResolucionSolicitud" (
  "id_resolucion_solicitud" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_solicitud_evento" bigint NOT NULL,
  "version_revisada" integer NOT NULL,
  "id_decision_solicitud" bigint,
  "mensaje" text,
  "resuelta_en" timestamptz NOT NULL,
  "id_cuenta_resolutora" bigint,
  PRIMARY KEY ("id_resolucion_solicitud"),
  CONSTRAINT "ck_resolucionsolicitud_1" CHECK (version_revisada > 0)
);
COMMENT ON TABLE ticket_trade."ResolucionSolicitud" IS 'Decisión sobre la solicitud y mensaje de Subdirección o cierre automático.  La decisión de devolución y su fecha son la fuente del plazo de corrección. Cuando hay aprobación, devolución o rechazo, la decisión es obligatoria. Si se registra un cierre por cancelación sin dictamen, la decisión es nula y el mensaje indica la causa. El rechazo automático por vencimiento usa Rechazada con su motivo.';
CREATE TABLE ticket_trade."CambioActividadSolicitado" (
  "id_cambio_actividad_solicitado" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_solicitud_evento" bigint NOT NULL,
  "id_actividad" bigint NOT NULL,
  "fecha_propuesta" date,
  "inicio_propuesto" time,
  "fin_propuesto" time,
  "id_recinto_propuesto" bigint,
  PRIMARY KEY ("id_cambio_actividad_solicitado"),
  UNIQUE ("id_solicitud_evento", "id_actividad"),
  CONSTRAINT "ck_cambioactividadsolicitado_1" CHECK (fecha_propuesta IS NOT NULL OR inicio_propuesto IS NOT NULL OR fin_propuesto IS NOT NULL OR id_recinto_propuesto IS NOT NULL),
  CONSTRAINT "ck_cambioactividadsolicitado_2" CHECK (inicio_propuesto IS NULL OR fin_propuesto IS NULL OR inicio_propuesto < fin_propuesto)
);
COMMENT ON TABLE ticket_trade."CambioActividadSolicitado" IS 'Nuevos valores solicitados para una actividad ya publicada; la programación vigente queda en Actividad. Al menos un valor cambiado. Solo actividades del evento solicitado. Pausar nuevas reservas si se solicita cambiar recinto. Aplicar toda la solicitud conjuntamente.';
CREATE TABLE ticket_trade."ReasignacionSolicitada" (
  "id_cambio_actividad_solicitado" bigint NOT NULL,
  "id_compromiso_cupo" bigint NOT NULL,
  "id_lugar_recinto_destino" bigint NOT NULL,
  PRIMARY KEY ("id_cambio_actividad_solicitado", "id_compromiso_cupo"),
  UNIQUE ("id_cambio_actividad_solicitado", "id_lugar_recinto_destino")
);
COMMENT ON TABLE ticket_trade."ReasignacionSolicitada" IS 'Destino de un compromiso existente si se aprueba el cambio de recinto. El compromiso pertenece a la actividad cambiada y el asiento físico al recinto propuesto; conservar categoría y cubrir todos los compromisos aplicables al aprobar.';
CREATE TABLE ticket_trade."CompromisoCupo" (
  "id_compromiso_cupo" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_actividad" bigint NOT NULL,
  "id_estado_compromiso_cupo" bigint NOT NULL,
  PRIMARY KEY ("id_compromiso_cupo")
);
COMMENT ON TABLE ticket_trade."CompromisoCupo" IS 'Una unidad de aforo de una actividad. Si hay asiento, se identifica mediante AsignacionAsiento. Para lugar asignado, el lugar debe corresponder a la misma actividad; activo como máximo una vez por lugar. La suma de compromisos activos no rebasa el aforo. Un compromiso puede pasar de apartado a reserva, pero nunca respaldar simultáneamente dos accesos.';
CREATE TABLE ticket_trade."Apartado" (
  "id_compromiso_cupo" bigint NOT NULL,
  "id_cuenta" bigint NOT NULL,
  "creado_en" timestamptz NOT NULL,
  "id_estado_apartado" bigint NOT NULL,
  PRIMARY KEY ("id_compromiso_cupo")
);
COMMENT ON TABLE ticket_trade."Apartado" IS 'Protección de dos minutos en modalidad con asiento. El límite se calcula como creado_en + 2 minutos. Desde ese instante no se puede confirmar el apartado, aunque todavía no se haya actualizado su estado.';
CREATE TABLE ticket_trade."BoletoEvento" (
  "id_boleto_evento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_cuenta" bigint NOT NULL,
  "id_evento" bigint NOT NULL,
  "codigo_qr" text NOT NULL UNIQUE,
  "codigo_manual" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_boleto_evento"),
  UNIQUE ("id_cuenta", "id_evento"),
  CONSTRAINT "ck_boletoevento_1" CHECK (btrim(codigo_qr) <> '' AND btrim(codigo_manual) <> '')
);
COMMENT ON TABLE ticket_trade."BoletoEvento" IS 'QR ordinario reutilizable por usuario y evento.  Se emite junto con la primera reservación y se reutiliza. Siempre conserva al menos una reservación histórica; puede tener cero confirmadas.';
CREATE TABLE ticket_trade."Reservacion" (
  "id_reservacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_boleto_evento" bigint NOT NULL,
  "id_compromiso_cupo" bigint NOT NULL UNIQUE,
  "confirmada_en" timestamptz NOT NULL,
  "id_estado_reservacion" bigint NOT NULL,
  "cancelada_en" timestamptz,
  "id_causa_cancelacion_reservacion" bigint,
  PRIMARY KEY ("id_reservacion")
);
COMMENT ON TABLE ticket_trade."Reservacion" IS 'Acceso ordinario de un boleto a una actividad a través de su compromiso. El evento del boleto coincide con el de la actividad. Una reserva activa por cuenta y actividad; impedir traslapes al confirmar. Confirmada: causa y cancelada_en deben ser nulas. Cancelada: ambas son obligatorias. La suspensión por sí sola conserva la reservación.';
CREATE TABLE ticket_trade."BoletoEspecial" (
  "id_boleto_especial" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_compromiso_cupo" bigint NOT NULL UNIQUE,
  "codigo_qr" text NOT NULL UNIQUE,
  "codigo_manual" text NOT NULL UNIQUE,
  "emitido_en" timestamptz NOT NULL,
  "invalidado_en" timestamptz,
  "motivo_invalidacion" text,
  PRIMARY KEY ("id_boleto_especial"),
  CONSTRAINT "ck_boletoespecial_1" CHECK (btrim(codigo_qr) <> '' AND btrim(codigo_manual) <> ''),
  CONSTRAINT "ck_boletoespecial_2" CHECK (invalidado_en IS NULL OR (invalidado_en >= emitido_en AND nullif(btrim(motivo_invalidacion),'') IS NOT NULL))
);
COMMENT ON TABLE ticket_trade."BoletoEspecial" IS 'Boleto al portador para un lugar VIP o Staff de una actividad. Solo asiento VIP o Staff; una entrada por código. No requiere cuenta del portador.';
CREATE TABLE ticket_trade."AvisoDisponibilidad" (
  "id_cuenta" bigint NOT NULL,
  "id_actividad" bigint NOT NULL,
  "solicitado_en" timestamptz NOT NULL,
  PRIMARY KEY ("id_cuenta", "id_actividad")
);
COMMENT ON TABLE ticket_trade."AvisoDisponibilidad" IS 'Petición pendiente de un aviso; sin prioridad, turno ni apartado. Un aviso interno y un correo por petición cuando haya cupo; no reserva lugar.';
CREATE TABLE ticket_trade."InvitacionStaff" (
  "id_invitacion_staff" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_evento" bigint NOT NULL,
  "id_cuenta_invitada" bigint NOT NULL,
  "id_estado_invitacion_staff" bigint NOT NULL,
  "enviada_en" timestamptz NOT NULL,
  PRIMARY KEY ("id_invitacion_staff")
);
COMMENT ON TABLE ticket_trade."InvitacionStaff" IS 'Invitación por evento con estado, sin fecha de respuesta. Todas las invitaciones pendientes del evento vencen al inicio de su primera actividad vigente. Consultar ese inicio en la programación; no duplicarlo por invitación. Una invitación cerrada no vuelve a abrirse por reprogramación. Al cancelar el evento se cierran las invitaciones pendientes.';
CREATE TABLE ticket_trade."StaffEvento" (
  "id_evento" bigint NOT NULL,
  "id_cuenta" bigint NOT NULL,
  PRIMARY KEY ("id_evento", "id_cuenta")
);
COMMENT ON TABLE ticket_trade."StaffEvento" IS 'Permiso vigente de Check-in para todo el evento. Solo tras invitación aceptada. Retirar permiso no cambia la aceptación ni elimina entradas previas.';
CREATE TABLE ticket_trade."EntradaOrdinaria" (
  "id_entrada_ordinaria" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_reservacion" bigint NOT NULL UNIQUE,
  "id_cuenta_operadora" bigint NOT NULL,
  "registrada_en" timestamptz NOT NULL,
  PRIMARY KEY ("id_entrada_ordinaria")
);
COMMENT ON TABLE ticket_trade."EntradaOrdinaria" IS 'Un Check-in exitoso por reservación. ';
CREATE TABLE ticket_trade."EntradaEspecial" (
  "id_entrada_especial" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_boleto_especial" bigint NOT NULL UNIQUE,
  "id_cuenta_operadora" bigint NOT NULL,
  "registrada_en" timestamptz NOT NULL,
  PRIMARY KEY ("id_entrada_especial")
);
COMMENT ON TABLE ticket_trade."EntradaEspecial" IS 'Un Check-in exitoso por boleto especial. ';
CREATE TABLE ticket_trade."Archivo" (
  "id_archivo" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "clave_almacenamiento" text NOT NULL UNIQUE,
  "nombre" text NOT NULL,
  "id_tipo_mime" bigint NOT NULL,
  "tamano_bytes" integer NOT NULL,
  PRIMARY KEY ("id_archivo"),
  CONSTRAINT "ck_archivo_1" CHECK (tamano_bytes > 0),
  CONSTRAINT "ck_archivo_2" CHECK (btrim(clave_almacenamiento) <> '' AND btrim(nombre) <> '')
);
COMMENT ON TABLE ticket_trade."Archivo" IS 'Metadatos del archivo alojado fuera de las tablas. El catálogo identifica el formato; la carga debe comprobar el contenido, tamaño y formatos autorizados para el uso concreto.';
CREATE TABLE ticket_trade."Notificacion" (
  "id_notificacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "id_cuenta_destinataria" bigint NOT NULL,
  "tipo" text NOT NULL,
  "titulo" text NOT NULL,
  "mensaje" text NOT NULL,
  "creada_en" timestamptz NOT NULL,
  "leida_en" timestamptz,
  "referencia_destino" text,
  PRIMARY KEY ("id_notificacion"),
  CONSTRAINT "ck_notificacion_1" CHECK (leida_en IS NULL OR leida_en >= creada_en)
);
COMMENT ON TABLE ticket_trade."Notificacion" IS 'Aviso de la bandeja interna. ';
CREATE TABLE ticket_trade."EnvioCorreo" (
  "id_envio_correo" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "destinatario" text NOT NULL,
  "asunto" text NOT NULL,
  "contenido" text NOT NULL,
  "id_estado_envio_correo" bigint NOT NULL,
  "intentos" integer DEFAULT 0 NOT NULL,
  "proximo_intento_en" timestamptz,
  "id_notificacion" bigint,
  PRIMARY KEY ("id_envio_correo"),
  CONSTRAINT "ck_enviocorreo_1" CHECK (intentos >= 0)
);
COMMENT ON TABLE ticket_trade."EnvioCorreo" IS 'Envío al buzón y datos para reintento. ';
CREATE TABLE ticket_trade."CategoriaEvento" (
  "id_categoria_evento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_categoria_evento")
);
COMMENT ON TABLE ticket_trade."CategoriaEvento" IS 'Catálogo de categorías que clasifican eventos. Valores iniciales: Congreso, Conferencia, Taller, Hackatón y Otro. Elegir Otro no requiere texto adicional. Una categoría puede no tener eventos.';
CREATE TABLE ticket_trade."AsignacionAsiento" (
  "id_compromiso_cupo" bigint NOT NULL,
  "id_lugar_actividad" bigint NOT NULL,
  PRIMARY KEY ("id_compromiso_cupo")
);
COMMENT ON TABLE ticket_trade."AsignacionAsiento" IS 'Asiento asignado a una unidad de aforo. Cero o una fila por compromiso; obligatoria para un compromiso activo con asiento e inexistente para acceso sin asiento. El lugar y el compromiso deben pertenecer a la misma actividad. Un lugar puede reutilizarse tras la liberación, pero no tener dos compromisos activos simultáneos. Estas reglas cruzan tablas y se deberán garantizar al implementar el DDL.';
CREATE TABLE ticket_trade."EstadoActividad" (
  "id_estado_actividad" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_actividad")
);
COMMENT ON TABLE ticket_trade."EstadoActividad" IS 'Catálogo de estados de Actividad. Valores iniciales del diseño: Programada, Suspendida, Cancelada. Programada: se mantiene en agenda. Suspendida: pendiente de resolución, conserva reservaciones y bloquea nuevos registros y entradas. Cancelada: cierre definitivo de la actividad.';
CREATE TABLE ticket_trade."EstadoApartado" (
  "id_estado_apartado" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_apartado")
);
COMMENT ON TABLE ticket_trade."EstadoApartado" IS 'Catálogo de estados de Apartado. Valores iniciales del diseño: Vigente, Convertido en reservación, Vencido, Liberado.';
CREATE TABLE ticket_trade."EstadoCompromisoCupo" (
  "id_estado_compromiso_cupo" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_compromiso_cupo")
);
COMMENT ON TABLE ticket_trade."EstadoCompromisoCupo" IS 'Catálogo de estados de CompromisoCupo. Valores iniciales del diseño: Activo, Liberado.';
CREATE TABLE ticket_trade."EstadoCuenta" (
  "id_estado_cuenta" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_cuenta")
);
COMMENT ON TABLE ticket_trade."EstadoCuenta" IS 'Catálogo de estados de Cuenta. Valores iniciales del diseño: Pendiente de activación, Activa, Desactivada.';
CREATE TABLE ticket_trade."EstadoEnvioCorreo" (
  "id_estado_envio_correo" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_envio_correo")
);
COMMENT ON TABLE ticket_trade."EstadoEnvioCorreo" IS 'Catálogo de estados de EnvioCorreo. Valores iniciales del diseño: Pendiente, En envío, Enviado, Fallido.';
CREATE TABLE ticket_trade."EstadoFuncionamiento" (
  "id_estado_funcionamiento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_funcionamiento")
);
COMMENT ON TABLE ticket_trade."EstadoFuncionamiento" IS 'Catálogo de estados de funcionamiento de equipos y accesorios. Valores iniciales del diseño: Funcional, Fuera de servicio.';
CREATE TABLE ticket_trade."EstadoEvento" (
  "id_estado_evento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_evento")
);
COMMENT ON TABLE ticket_trade."EstadoEvento" IS 'Catálogo de estados de Evento. Valores iniciales del diseño: Borrador, Publicado, Cancelado.';
CREATE TABLE ticket_trade."EstadoInvitacionStaff" (
  "id_estado_invitacion_staff" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_invitacion_staff")
);
COMMENT ON TABLE ticket_trade."EstadoInvitacionStaff" IS 'Catálogo de estados de InvitacionStaff. Valores iniciales del diseño: Pendiente, Aceptada, Rechazada, Cancelada, Vencida.';
CREATE TABLE ticket_trade."EstadoReservacion" (
  "id_estado_reservacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_reservacion")
);
COMMENT ON TABLE ticket_trade."EstadoReservacion" IS 'Catálogo de estados de Reservacion. Valores iniciales del diseño: Confirmada, Cancelada.';
CREATE TABLE ticket_trade."EstadoSolicitudEvento" (
  "id_estado_solicitud_evento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_solicitud_evento")
);
COMMENT ON TABLE ticket_trade."EstadoSolicitudEvento" IS 'Catálogo de estados de SolicitudEvento. Valores iniciales del diseño: Borrador, En revisión, Requiere corrección, Aprobada, Rechazada, Cancelada.';
CREATE TABLE ticket_trade."EstadoSolicitudVerificacion" (
  "id_estado_solicitud_verificacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_estado_solicitud_verificacion")
);
COMMENT ON TABLE ticket_trade."EstadoSolicitudVerificacion" IS 'Catálogo de estados de SolicitudVerificacion. Valores iniciales del diseño: Pendiente de revisión, Aprobada, Rechazada, Cancelada, Cerrada por fin de periodo.';
CREATE TABLE ticket_trade."TipoRecinto" (
  "id_tipo_recinto" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_recinto")
);
COMMENT ON TABLE ticket_trade."TipoRecinto" IS 'Clasificación del espacio físico. Cada laboratorio concreto conserva su propio registro en Recinto. Valores iniciales: Auditorio, Sala 14 y Laboratorio.';
CREATE TABLE ticket_trade."RolRegistro" (
  "id_rol_registro" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_rol_registro")
);
COMMENT ON TABLE ticket_trade."RolRegistro" IS 'Clasificación de registro de la cuenta común; no otorga por sí misma permisos de Staff. Valores iniciales: Estudiante, Externo y Empleado del IPN.';
CREATE TABLE ticket_trade."TipoDocumentoVerificacion" (
  "id_tipo_documento_verificacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_documento_verificacion")
);
COMMENT ON TABLE ticket_trade."TipoDocumentoVerificacion" IS 'Requisito documental que satisface el PDF. Los dos requisitos de externos admiten los documentos equivalentes acordados. Valores iniciales: Constancia de estudios, Comprobante de adscripción, Acreditación de existencia de la entidad y Acreditación de representación.';
CREATE TABLE ticket_trade."TipoAcceso" (
  "id_tipo_acceso" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_acceso")
);
COMMENT ON TABLE ticket_trade."TipoAcceso" IS 'Modalidad de asistencia que determina si la actividad requiere registro, asiento y Check-in. Valores iniciales: Entrada libre; Registro sin asiento asignado; Reservación con lugar asignado.';
CREATE TABLE ticket_trade."TipoAnticipacion" (
  "id_tipo_anticipacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_anticipacion")
);
COMMENT ON TABLE ticket_trade."TipoAnticipacion" IS 'Clasificación por anticipación. Una sola clasificación para el conjunto de la solicitud. Valores iniciales: Ordinaria; Extraordinaria.';
CREATE TABLE ticket_trade."TipoTramite" (
  "id_tipo_tramite" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_tramite")
);
COMMENT ON TABLE ticket_trade."TipoTramite" IS 'Finalidad del trámite, independiente de la clasificación por anticipación. Valores iniciales: Solicitud inicial; Modificación de evento aprobado.';
CREATE TABLE ticket_trade."VisibilidadEvento" (
  "id_visibilidad_evento" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_visibilidad_evento")
);
COMMENT ON TABLE ticket_trade."VisibilidadEvento" IS 'Indica si el evento se muestra en cartelera o se consulta mediante enlace privado. Valores iniciales: Público; Privado.';
CREATE TABLE ticket_trade."CategoriaLugarActividad" (
  "id_categoria_lugar_actividad" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_categoria_lugar_actividad")
);
COMMENT ON TABLE ticket_trade."CategoriaLugarActividad" IS 'Uso del lugar para esta actividad; Bloqueado impide asignarlo. No es un rol de cuenta. Valores iniciales: Asistente; VIP; Staff; Bloqueado.';
CREATE TABLE ticket_trade."TipoLugar" (
  "id_tipo_lugar" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_lugar")
);
COMMENT ON TABLE ticket_trade."TipoLugar" IS 'Clase física del lugar en el mapa fijo, independiente de su categoría en una actividad. Valores iniciales: Butaca; Estación de trabajo.';
CREATE TABLE ticket_trade."DecisionSolicitud" (
  "id_decision_solicitud" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_decision_solicitud")
);
COMMENT ON TABLE ticket_trade."DecisionSolicitud" IS 'Resultado de la revisión; distinto del estado actual del trámite. Valores iniciales: Aprobada; Devuelta; Rechazada.';
CREATE TABLE ticket_trade."TipoMime" (
  "id_tipo_mime" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_mime")
);
COMMENT ON TABLE ticket_trade."TipoMime" IS 'Identificador del formato del contenido. Los formatos de imagen JPEG y PNG son ejemplos propuestos; los tipos autorizados dependen del uso. Ejemplos de valores: application/pdf; image/svg+xml; image/jpeg; image/png.';
CREATE TABLE ticket_trade."TipoCuenta" (
  "id_tipo_cuenta" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_cuenta")
);
COMMENT ON TABLE ticket_trade."TipoCuenta" IS 'Clase de cuenta; solo las comunes tienen un perfil con rol de registro. Valores iniciales: Común; Administrador; Subdirección.';
CREATE TABLE ticket_trade."PropositoTokenCuenta" (
  "id_proposito_token_cuenta" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_proposito_token_cuenta")
);
COMMENT ON TABLE ticket_trade."PropositoTokenCuenta" IS 'Acción que autoriza un token de cuenta. Valores iniciales: Confirmación de correo; Recuperación de contraseña; Activación de cuenta especial.';
CREATE TABLE ticket_trade."TipoBloqueoRecinto" (
  "id_tipo_bloqueo_recinto" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_tipo_bloqueo_recinto")
);
COMMENT ON TABLE ticket_trade."TipoBloqueoRecinto" IS 'Clasificación que determina quién puede aplicar el bloqueo y si puede suspender actividades. Valores iniciales: Institucional; Mantenimiento; Fuera de servicio.';
CREATE TABLE ticket_trade."CausaCancelacionReservacion" (
  "id_causa_cancelacion_reservacion" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "nombre" text NOT NULL UNIQUE,
  PRIMARY KEY ("id_causa_cancelacion_reservacion")
);
COMMENT ON TABLE ticket_trade."CausaCancelacionReservacion" IS 'Causa por la que se canceló una reservación ordinaria. Valores iniciales: Cancelación voluntaria; Cancelación de la actividad; Cancelación del evento; Cambio a entrada libre; Desactivación de la cuenta del asistente.';
ALTER TABLE ticket_trade."Cuenta" ADD CONSTRAINT fk_001 FOREIGN KEY ("id_tipo_cuenta") REFERENCES ticket_trade."TipoCuenta" ("id_tipo_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_001 ON ticket_trade."Cuenta" ("id_tipo_cuenta");
ALTER TABLE ticket_trade."Cuenta" ADD CONSTRAINT fk_002 FOREIGN KEY ("id_estado_cuenta") REFERENCES ticket_trade."EstadoCuenta" ("id_estado_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_002 ON ticket_trade."Cuenta" ("id_estado_cuenta");
ALTER TABLE ticket_trade."PerfilUsuario" ADD CONSTRAINT fk_003 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."PerfilUsuario" ADD CONSTRAINT fk_004 FOREIGN KEY ("id_rol_registro") REFERENCES ticket_trade."RolRegistro" ("id_rol_registro") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_004 ON ticket_trade."PerfilUsuario" ("id_rol_registro");
ALTER TABLE ticket_trade."Estudiante" ADD CONSTRAINT fk_005 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."EmpleadoIPN" ADD CONSTRAINT fk_006 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."TokenCuenta" ADD CONSTRAINT fk_007 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_007 ON ticket_trade."TokenCuenta" ("id_cuenta");
ALTER TABLE ticket_trade."TokenCuenta" ADD CONSTRAINT fk_008 FOREIGN KEY ("id_proposito_token_cuenta") REFERENCES ticket_trade."PropositoTokenCuenta" ("id_proposito_token_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_008 ON ticket_trade."TokenCuenta" ("id_proposito_token_cuenta");
ALTER TABLE ticket_trade."SolicitudVerificacion" ADD CONSTRAINT fk_009 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_009 ON ticket_trade."SolicitudVerificacion" ("id_cuenta");
ALTER TABLE ticket_trade."SolicitudVerificacion" ADD CONSTRAINT fk_010 FOREIGN KEY ("id_periodo_escolar") REFERENCES ticket_trade."PeriodoEscolar" ("id_periodo_escolar") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_010 ON ticket_trade."SolicitudVerificacion" ("id_periodo_escolar");
ALTER TABLE ticket_trade."SolicitudVerificacion" ADD CONSTRAINT fk_011 FOREIGN KEY ("id_estado_solicitud_verificacion") REFERENCES ticket_trade."EstadoSolicitudVerificacion" ("id_estado_solicitud_verificacion") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_011 ON ticket_trade."SolicitudVerificacion" ("id_estado_solicitud_verificacion");
ALTER TABLE ticket_trade."SolicitudVerificacion" ADD CONSTRAINT fk_012 FOREIGN KEY ("id_cuenta_resolutora") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_012 ON ticket_trade."SolicitudVerificacion" ("id_cuenta_resolutora");
ALTER TABLE ticket_trade."DatosVerificacionEmpleado" ADD CONSTRAINT fk_013 FOREIGN KEY ("id_solicitud_verificacion") REFERENCES ticket_trade."SolicitudVerificacion" ("id_solicitud_verificacion") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."DatosVerificacionExterno" ADD CONSTRAINT fk_014 FOREIGN KEY ("id_solicitud_verificacion") REFERENCES ticket_trade."SolicitudVerificacion" ("id_solicitud_verificacion") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."DocumentoVerificacion" ADD CONSTRAINT fk_015 FOREIGN KEY ("id_solicitud_verificacion") REFERENCES ticket_trade."SolicitudVerificacion" ("id_solicitud_verificacion") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."DocumentoVerificacion" ADD CONSTRAINT fk_016 FOREIGN KEY ("id_tipo_documento_verificacion") REFERENCES ticket_trade."TipoDocumentoVerificacion" ("id_tipo_documento_verificacion") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_016 ON ticket_trade."DocumentoVerificacion" ("id_tipo_documento_verificacion");
ALTER TABLE ticket_trade."DocumentoVerificacion" ADD CONSTRAINT fk_017 FOREIGN KEY ("id_archivo") REFERENCES ticket_trade."Archivo" ("id_archivo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_017 ON ticket_trade."DocumentoVerificacion" ("id_archivo");
ALTER TABLE ticket_trade."Verificacion" ADD CONSTRAINT fk_018 FOREIGN KEY ("id_solicitud_verificacion_aprobada") REFERENCES ticket_trade."SolicitudVerificacion" ("id_solicitud_verificacion") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."Verificacion" ADD CONSTRAINT fk_019 FOREIGN KEY ("id_cuenta_retiro") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_019 ON ticket_trade."Verificacion" ("id_cuenta_retiro");
ALTER TABLE ticket_trade."JefaturaAcademia" ADD CONSTRAINT fk_020 FOREIGN KEY ("id_academia") REFERENCES ticket_trade."Academia" ("id_academia") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."JefaturaAcademia" ADD CONSTRAINT fk_021 FOREIGN KEY ("id_cuenta_empleada") REFERENCES ticket_trade."EmpleadoIPN" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."JefaturaAcademia" ADD CONSTRAINT fk_022 FOREIGN KEY ("id_cuenta_otorgante") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_022 ON ticket_trade."JefaturaAcademia" ("id_cuenta_otorgante");
ALTER TABLE ticket_trade."Recinto" ADD CONSTRAINT fk_023 FOREIGN KEY ("id_tipo_recinto") REFERENCES ticket_trade."TipoRecinto" ("id_tipo_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_023 ON ticket_trade."Recinto" ("id_tipo_recinto");
ALTER TABLE ticket_trade."Recinto" ADD CONSTRAINT fk_024 FOREIGN KEY ("id_archivo_croquis") REFERENCES ticket_trade."Archivo" ("id_archivo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_024 ON ticket_trade."Recinto" ("id_archivo_croquis");
ALTER TABLE ticket_trade."FotografiaRecinto" ADD CONSTRAINT fk_025 FOREIGN KEY ("id_recinto") REFERENCES ticket_trade."Recinto" ("id_recinto") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."FotografiaRecinto" ADD CONSTRAINT fk_026 FOREIGN KEY ("id_archivo") REFERENCES ticket_trade."Archivo" ("id_archivo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_026 ON ticket_trade."FotografiaRecinto" ("id_archivo");
ALTER TABLE ticket_trade."ExistenciaAccesorio" ADD CONSTRAINT fk_027 FOREIGN KEY ("id_recinto") REFERENCES ticket_trade."Recinto" ("id_recinto") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."ExistenciaAccesorio" ADD CONSTRAINT fk_028 FOREIGN KEY ("id_tipo_accesorio") REFERENCES ticket_trade."TipoAccesorio" ("id_tipo_accesorio") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_028 ON ticket_trade."ExistenciaAccesorio" ("id_tipo_accesorio");
ALTER TABLE ticket_trade."ExistenciaAccesorio" ADD CONSTRAINT fk_029 FOREIGN KEY ("id_estado_funcionamiento") REFERENCES ticket_trade."EstadoFuncionamiento" ("id_estado_funcionamiento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_029 ON ticket_trade."ExistenciaAccesorio" ("id_estado_funcionamiento");
ALTER TABLE ticket_trade."LugarRecinto" ADD CONSTRAINT fk_030 FOREIGN KEY ("id_recinto") REFERENCES ticket_trade."Recinto" ("id_recinto") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."LugarRecinto" ADD CONSTRAINT fk_031 FOREIGN KEY ("id_tipo_lugar") REFERENCES ticket_trade."TipoLugar" ("id_tipo_lugar") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_031 ON ticket_trade."LugarRecinto" ("id_tipo_lugar");
ALTER TABLE ticket_trade."EstacionComputo" ADD CONSTRAINT fk_032 FOREIGN KEY ("id_lugar_recinto") REFERENCES ticket_trade."LugarRecinto" ("id_lugar_recinto") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."EstacionComputo" ADD CONSTRAINT fk_033 FOREIGN KEY ("id_estado_funcionamiento") REFERENCES ticket_trade."EstadoFuncionamiento" ("id_estado_funcionamiento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_033 ON ticket_trade."EstacionComputo" ("id_estado_funcionamiento");
ALTER TABLE ticket_trade."ActividadInterna" ADD CONSTRAINT fk_034 FOREIGN KEY ("id_recinto") REFERENCES ticket_trade."Recinto" ("id_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_034 ON ticket_trade."ActividadInterna" ("id_recinto");
ALTER TABLE ticket_trade."DiaActividadInterna" ADD CONSTRAINT fk_035 FOREIGN KEY ("id_actividad_interna") REFERENCES ticket_trade."ActividadInterna" ("id_actividad_interna") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."BloqueoRecinto" ADD CONSTRAINT fk_036 FOREIGN KEY ("id_recinto") REFERENCES ticket_trade."Recinto" ("id_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_036 ON ticket_trade."BloqueoRecinto" ("id_recinto");
ALTER TABLE ticket_trade."BloqueoRecinto" ADD CONSTRAINT fk_037 FOREIGN KEY ("id_tipo_bloqueo_recinto") REFERENCES ticket_trade."TipoBloqueoRecinto" ("id_tipo_bloqueo_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_037 ON ticket_trade."BloqueoRecinto" ("id_tipo_bloqueo_recinto");
ALTER TABLE ticket_trade."BloqueoRecinto" ADD CONSTRAINT fk_038 FOREIGN KEY ("id_cuenta_responsable") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_038 ON ticket_trade."BloqueoRecinto" ("id_cuenta_responsable");
ALTER TABLE ticket_trade."Evento" ADD CONSTRAINT fk_039 FOREIGN KEY ("id_cuenta_organizadora") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_039 ON ticket_trade."Evento" ("id_cuenta_organizadora");
ALTER TABLE ticket_trade."Evento" ADD CONSTRAINT fk_040 FOREIGN KEY ("id_categoria_evento") REFERENCES ticket_trade."CategoriaEvento" ("id_categoria_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_040 ON ticket_trade."Evento" ("id_categoria_evento");
ALTER TABLE ticket_trade."Evento" ADD CONSTRAINT fk_041 FOREIGN KEY ("id_visibilidad_evento") REFERENCES ticket_trade."VisibilidadEvento" ("id_visibilidad_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_041 ON ticket_trade."Evento" ("id_visibilidad_evento");
ALTER TABLE ticket_trade."Evento" ADD CONSTRAINT fk_042 FOREIGN KEY ("id_archivo_cartel") REFERENCES ticket_trade."Archivo" ("id_archivo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_042 ON ticket_trade."Evento" ("id_archivo_cartel");
ALTER TABLE ticket_trade."Evento" ADD CONSTRAINT fk_043 FOREIGN KEY ("id_estado_evento") REFERENCES ticket_trade."EstadoEvento" ("id_estado_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_043 ON ticket_trade."Evento" ("id_estado_evento");
ALTER TABLE ticket_trade."Actividad" ADD CONSTRAINT fk_044 FOREIGN KEY ("id_evento") REFERENCES ticket_trade."Evento" ("id_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_044 ON ticket_trade."Actividad" ("id_evento");
ALTER TABLE ticket_trade."Actividad" ADD CONSTRAINT fk_045 FOREIGN KEY ("id_recinto") REFERENCES ticket_trade."Recinto" ("id_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_045 ON ticket_trade."Actividad" ("id_recinto");
ALTER TABLE ticket_trade."Actividad" ADD CONSTRAINT fk_046 FOREIGN KEY ("id_tipo_acceso") REFERENCES ticket_trade."TipoAcceso" ("id_tipo_acceso") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_046 ON ticket_trade."Actividad" ("id_tipo_acceso");
ALTER TABLE ticket_trade."Actividad" ADD CONSTRAINT fk_047 FOREIGN KEY ("id_estado_actividad") REFERENCES ticket_trade."EstadoActividad" ("id_estado_actividad") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_047 ON ticket_trade."Actividad" ("id_estado_actividad");
ALTER TABLE ticket_trade."ItinerarioDia" ADD CONSTRAINT fk_048 FOREIGN KEY ("id_evento") REFERENCES ticket_trade."Evento" ("id_evento") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."ItinerarioDia" ADD CONSTRAINT fk_049 FOREIGN KEY ("id_archivo") REFERENCES ticket_trade."Archivo" ("id_archivo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_049 ON ticket_trade."ItinerarioDia" ("id_archivo");
ALTER TABLE ticket_trade."LugarActividad" ADD CONSTRAINT fk_050 FOREIGN KEY ("id_actividad") REFERENCES ticket_trade."Actividad" ("id_actividad") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."LugarActividad" ADD CONSTRAINT fk_051 FOREIGN KEY ("id_lugar_recinto") REFERENCES ticket_trade."LugarRecinto" ("id_lugar_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_051 ON ticket_trade."LugarActividad" ("id_lugar_recinto");
ALTER TABLE ticket_trade."LugarActividad" ADD CONSTRAINT fk_052 FOREIGN KEY ("id_categoria_lugar_actividad") REFERENCES ticket_trade."CategoriaLugarActividad" ("id_categoria_lugar_actividad") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_052 ON ticket_trade."LugarActividad" ("id_categoria_lugar_actividad");
ALTER TABLE ticket_trade."AfectacionActividad" ADD CONSTRAINT fk_053 FOREIGN KEY ("id_bloqueo_recinto") REFERENCES ticket_trade."BloqueoRecinto" ("id_bloqueo_recinto") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."AfectacionActividad" ADD CONSTRAINT fk_054 FOREIGN KEY ("id_actividad") REFERENCES ticket_trade."Actividad" ("id_actividad") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_054 ON ticket_trade."AfectacionActividad" ("id_actividad");
ALTER TABLE ticket_trade."SolicitudEvento" ADD CONSTRAINT fk_055 FOREIGN KEY ("id_evento") REFERENCES ticket_trade."Evento" ("id_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_055 ON ticket_trade."SolicitudEvento" ("id_evento");
ALTER TABLE ticket_trade."SolicitudEvento" ADD CONSTRAINT fk_056 FOREIGN KEY ("id_tipo_tramite") REFERENCES ticket_trade."TipoTramite" ("id_tipo_tramite") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_056 ON ticket_trade."SolicitudEvento" ("id_tipo_tramite");
ALTER TABLE ticket_trade."SolicitudEvento" ADD CONSTRAINT fk_057 FOREIGN KEY ("id_tipo_anticipacion") REFERENCES ticket_trade."TipoAnticipacion" ("id_tipo_anticipacion") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_057 ON ticket_trade."SolicitudEvento" ("id_tipo_anticipacion");
ALTER TABLE ticket_trade."SolicitudEvento" ADD CONSTRAINT fk_058 FOREIGN KEY ("id_estado_solicitud_evento") REFERENCES ticket_trade."EstadoSolicitudEvento" ("id_estado_solicitud_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_058 ON ticket_trade."SolicitudEvento" ("id_estado_solicitud_evento");
ALTER TABLE ticket_trade."ResolucionSolicitud" ADD CONSTRAINT fk_059 FOREIGN KEY ("id_solicitud_evento") REFERENCES ticket_trade."SolicitudEvento" ("id_solicitud_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_059 ON ticket_trade."ResolucionSolicitud" ("id_solicitud_evento");
ALTER TABLE ticket_trade."ResolucionSolicitud" ADD CONSTRAINT fk_060 FOREIGN KEY ("id_decision_solicitud") REFERENCES ticket_trade."DecisionSolicitud" ("id_decision_solicitud") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_060 ON ticket_trade."ResolucionSolicitud" ("id_decision_solicitud");
ALTER TABLE ticket_trade."ResolucionSolicitud" ADD CONSTRAINT fk_061 FOREIGN KEY ("id_cuenta_resolutora") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_061 ON ticket_trade."ResolucionSolicitud" ("id_cuenta_resolutora");
ALTER TABLE ticket_trade."CambioActividadSolicitado" ADD CONSTRAINT fk_062 FOREIGN KEY ("id_solicitud_evento") REFERENCES ticket_trade."SolicitudEvento" ("id_solicitud_evento") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."CambioActividadSolicitado" ADD CONSTRAINT fk_063 FOREIGN KEY ("id_actividad") REFERENCES ticket_trade."Actividad" ("id_actividad") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_063 ON ticket_trade."CambioActividadSolicitado" ("id_actividad");
ALTER TABLE ticket_trade."CambioActividadSolicitado" ADD CONSTRAINT fk_064 FOREIGN KEY ("id_recinto_propuesto") REFERENCES ticket_trade."Recinto" ("id_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_064 ON ticket_trade."CambioActividadSolicitado" ("id_recinto_propuesto");
ALTER TABLE ticket_trade."ReasignacionSolicitada" ADD CONSTRAINT fk_065 FOREIGN KEY ("id_cambio_actividad_solicitado") REFERENCES ticket_trade."CambioActividadSolicitado" ("id_cambio_actividad_solicitado") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."ReasignacionSolicitada" ADD CONSTRAINT fk_066 FOREIGN KEY ("id_compromiso_cupo") REFERENCES ticket_trade."CompromisoCupo" ("id_compromiso_cupo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_066 ON ticket_trade."ReasignacionSolicitada" ("id_compromiso_cupo");
ALTER TABLE ticket_trade."ReasignacionSolicitada" ADD CONSTRAINT fk_067 FOREIGN KEY ("id_lugar_recinto_destino") REFERENCES ticket_trade."LugarRecinto" ("id_lugar_recinto") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_067 ON ticket_trade."ReasignacionSolicitada" ("id_lugar_recinto_destino");
ALTER TABLE ticket_trade."CompromisoCupo" ADD CONSTRAINT fk_068 FOREIGN KEY ("id_actividad") REFERENCES ticket_trade."Actividad" ("id_actividad") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_068 ON ticket_trade."CompromisoCupo" ("id_actividad");
ALTER TABLE ticket_trade."CompromisoCupo" ADD CONSTRAINT fk_069 FOREIGN KEY ("id_estado_compromiso_cupo") REFERENCES ticket_trade."EstadoCompromisoCupo" ("id_estado_compromiso_cupo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_069 ON ticket_trade."CompromisoCupo" ("id_estado_compromiso_cupo");
ALTER TABLE ticket_trade."Apartado" ADD CONSTRAINT fk_070 FOREIGN KEY ("id_compromiso_cupo") REFERENCES ticket_trade."CompromisoCupo" ("id_compromiso_cupo") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."Apartado" ADD CONSTRAINT fk_071 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_071 ON ticket_trade."Apartado" ("id_cuenta");
ALTER TABLE ticket_trade."Apartado" ADD CONSTRAINT fk_072 FOREIGN KEY ("id_estado_apartado") REFERENCES ticket_trade."EstadoApartado" ("id_estado_apartado") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_072 ON ticket_trade."Apartado" ("id_estado_apartado");
ALTER TABLE ticket_trade."BoletoEvento" ADD CONSTRAINT fk_073 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."BoletoEvento" ADD CONSTRAINT fk_074 FOREIGN KEY ("id_evento") REFERENCES ticket_trade."Evento" ("id_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_074 ON ticket_trade."BoletoEvento" ("id_evento");
ALTER TABLE ticket_trade."Reservacion" ADD CONSTRAINT fk_075 FOREIGN KEY ("id_boleto_evento") REFERENCES ticket_trade."BoletoEvento" ("id_boleto_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_075 ON ticket_trade."Reservacion" ("id_boleto_evento");
ALTER TABLE ticket_trade."Reservacion" ADD CONSTRAINT fk_076 FOREIGN KEY ("id_compromiso_cupo") REFERENCES ticket_trade."CompromisoCupo" ("id_compromiso_cupo") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."Reservacion" ADD CONSTRAINT fk_077 FOREIGN KEY ("id_estado_reservacion") REFERENCES ticket_trade."EstadoReservacion" ("id_estado_reservacion") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_077 ON ticket_trade."Reservacion" ("id_estado_reservacion");
ALTER TABLE ticket_trade."Reservacion" ADD CONSTRAINT fk_078 FOREIGN KEY ("id_causa_cancelacion_reservacion") REFERENCES ticket_trade."CausaCancelacionReservacion" ("id_causa_cancelacion_reservacion") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_078 ON ticket_trade."Reservacion" ("id_causa_cancelacion_reservacion");
ALTER TABLE ticket_trade."BoletoEspecial" ADD CONSTRAINT fk_079 FOREIGN KEY ("id_compromiso_cupo") REFERENCES ticket_trade."CompromisoCupo" ("id_compromiso_cupo") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."AvisoDisponibilidad" ADD CONSTRAINT fk_080 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."AvisoDisponibilidad" ADD CONSTRAINT fk_081 FOREIGN KEY ("id_actividad") REFERENCES ticket_trade."Actividad" ("id_actividad") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_081 ON ticket_trade."AvisoDisponibilidad" ("id_actividad");
ALTER TABLE ticket_trade."InvitacionStaff" ADD CONSTRAINT fk_082 FOREIGN KEY ("id_evento") REFERENCES ticket_trade."Evento" ("id_evento") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_082 ON ticket_trade."InvitacionStaff" ("id_evento");
ALTER TABLE ticket_trade."InvitacionStaff" ADD CONSTRAINT fk_083 FOREIGN KEY ("id_cuenta_invitada") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_083 ON ticket_trade."InvitacionStaff" ("id_cuenta_invitada");
ALTER TABLE ticket_trade."InvitacionStaff" ADD CONSTRAINT fk_084 FOREIGN KEY ("id_estado_invitacion_staff") REFERENCES ticket_trade."EstadoInvitacionStaff" ("id_estado_invitacion_staff") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_084 ON ticket_trade."InvitacionStaff" ("id_estado_invitacion_staff");
ALTER TABLE ticket_trade."StaffEvento" ADD CONSTRAINT fk_085 FOREIGN KEY ("id_evento") REFERENCES ticket_trade."Evento" ("id_evento") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."StaffEvento" ADD CONSTRAINT fk_086 FOREIGN KEY ("id_cuenta") REFERENCES ticket_trade."PerfilUsuario" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_086 ON ticket_trade."StaffEvento" ("id_cuenta");
ALTER TABLE ticket_trade."EntradaOrdinaria" ADD CONSTRAINT fk_087 FOREIGN KEY ("id_reservacion") REFERENCES ticket_trade."Reservacion" ("id_reservacion") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."EntradaOrdinaria" ADD CONSTRAINT fk_088 FOREIGN KEY ("id_cuenta_operadora") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_088 ON ticket_trade."EntradaOrdinaria" ("id_cuenta_operadora");
ALTER TABLE ticket_trade."EntradaEspecial" ADD CONSTRAINT fk_089 FOREIGN KEY ("id_boleto_especial") REFERENCES ticket_trade."BoletoEspecial" ("id_boleto_especial") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."EntradaEspecial" ADD CONSTRAINT fk_090 FOREIGN KEY ("id_cuenta_operadora") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_090 ON ticket_trade."EntradaEspecial" ("id_cuenta_operadora");
ALTER TABLE ticket_trade."Archivo" ADD CONSTRAINT fk_091 FOREIGN KEY ("id_tipo_mime") REFERENCES ticket_trade."TipoMime" ("id_tipo_mime") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_091 ON ticket_trade."Archivo" ("id_tipo_mime");
ALTER TABLE ticket_trade."Notificacion" ADD CONSTRAINT fk_092 FOREIGN KEY ("id_cuenta_destinataria") REFERENCES ticket_trade."Cuenta" ("id_cuenta") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_092 ON ticket_trade."Notificacion" ("id_cuenta_destinataria");
ALTER TABLE ticket_trade."EnvioCorreo" ADD CONSTRAINT fk_093 FOREIGN KEY ("id_estado_envio_correo") REFERENCES ticket_trade."EstadoEnvioCorreo" ("id_estado_envio_correo") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_093 ON ticket_trade."EnvioCorreo" ("id_estado_envio_correo");
ALTER TABLE ticket_trade."EnvioCorreo" ADD CONSTRAINT fk_094 FOREIGN KEY ("id_notificacion") REFERENCES ticket_trade."Notificacion" ("id_notificacion") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_094 ON ticket_trade."EnvioCorreo" ("id_notificacion");
ALTER TABLE ticket_trade."AsignacionAsiento" ADD CONSTRAINT fk_095 FOREIGN KEY ("id_compromiso_cupo") REFERENCES ticket_trade."CompromisoCupo" ("id_compromiso_cupo") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE ticket_trade."AsignacionAsiento" ADD CONSTRAINT fk_096 FOREIGN KEY ("id_lugar_actividad") REFERENCES ticket_trade."LugarActividad" ("id_lugar_actividad") DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX ix_fk_096 ON ticket_trade."AsignacionAsiento" ("id_lugar_actividad");
CREATE UNIQUE INDEX uq_boleta_normalizada ON ticket_trade."Estudiante" (upper(boleta));
CREATE UNIQUE INDEX uq_cuenta_correo_normalizado ON ticket_trade."Cuenta" (lower(correo));
CREATE INDEX ix_actividad_agenda ON ticket_trade."Actividad" (id_recinto, fecha, hora_inicio);
CREATE INDEX ix_solicitud_estado ON ticket_trade."SolicitudEvento" (id_estado_solicitud_evento, inicio_revision);
CREATE INDEX ix_solicitud_verificacion_cuenta_periodo ON ticket_trade."SolicitudVerificacion" (id_cuenta, id_periodo_escolar);
CREATE INDEX ix_notificacion_cuenta_fecha ON ticket_trade."Notificacion" (id_cuenta_destinataria, creada_en);
INSERT INTO ticket_trade."CategoriaEvento" (nombre) VALUES ('Congreso'), ('Conferencia'), ('Taller'), ('Hackatón'), ('Otro');
INSERT INTO ticket_trade."EstadoActividad" (nombre) VALUES ('Programada'), ('Suspendida'), ('Cancelada');
INSERT INTO ticket_trade."EstadoApartado" (nombre) VALUES ('Vigente'), ('Convertido en reservación'), ('Vencido'), ('Liberado');
INSERT INTO ticket_trade."EstadoCompromisoCupo" (nombre) VALUES ('Activo'), ('Liberado');
INSERT INTO ticket_trade."EstadoCuenta" (nombre) VALUES ('Pendiente de activación'), ('Activa'), ('Desactivada');
INSERT INTO ticket_trade."EstadoEnvioCorreo" (nombre) VALUES ('Pendiente'), ('En envío'), ('Enviado'), ('Fallido');
INSERT INTO ticket_trade."EstadoFuncionamiento" (nombre) VALUES ('Funcional'), ('Fuera de servicio');
INSERT INTO ticket_trade."EstadoEvento" (nombre) VALUES ('Borrador'), ('Publicado'), ('Cancelado');
INSERT INTO ticket_trade."EstadoInvitacionStaff" (nombre) VALUES ('Pendiente'), ('Aceptada'), ('Rechazada'), ('Cancelada'), ('Vencida');
INSERT INTO ticket_trade."EstadoReservacion" (nombre) VALUES ('Confirmada'), ('Cancelada');
INSERT INTO ticket_trade."EstadoSolicitudEvento" (nombre) VALUES ('Borrador'), ('En revisión'), ('Requiere corrección'), ('Aprobada'), ('Rechazada'), ('Cancelada');
INSERT INTO ticket_trade."EstadoSolicitudVerificacion" (nombre) VALUES ('Pendiente de revisión'), ('Aprobada'), ('Rechazada'), ('Cancelada'), ('Cerrada por fin de periodo');
INSERT INTO ticket_trade."TipoRecinto" (nombre) VALUES ('Auditorio'), ('Sala 14'), ('Laboratorio');
INSERT INTO ticket_trade."RolRegistro" (nombre) VALUES ('Estudiante'), ('Externo'), ('Empleado del IPN');
INSERT INTO ticket_trade."TipoDocumentoVerificacion" (nombre) VALUES ('Constancia de estudios'), ('Comprobante de adscripción'), ('Acreditación de existencia de la entidad'), ('Acreditación de representación');
INSERT INTO ticket_trade."TipoAcceso" (nombre) VALUES ('Entrada libre'), ('Registro sin asiento asignado'), ('Reservación con lugar asignado');
INSERT INTO ticket_trade."TipoAnticipacion" (nombre) VALUES ('Ordinaria'), ('Extraordinaria');
INSERT INTO ticket_trade."TipoTramite" (nombre) VALUES ('Solicitud inicial'), ('Modificación de evento aprobado');
INSERT INTO ticket_trade."VisibilidadEvento" (nombre) VALUES ('Público'), ('Privado');
INSERT INTO ticket_trade."CategoriaLugarActividad" (nombre) VALUES ('Asistente'), ('VIP'), ('Staff'), ('Bloqueado');
INSERT INTO ticket_trade."TipoLugar" (nombre) VALUES ('Butaca'), ('Estación de trabajo');
INSERT INTO ticket_trade."DecisionSolicitud" (nombre) VALUES ('Aprobada'), ('Devuelta'), ('Rechazada');
INSERT INTO ticket_trade."TipoMime" (nombre) VALUES ('application/pdf'), ('image/svg+xml'), ('image/jpeg'), ('image/png'), ('image/webp');
INSERT INTO ticket_trade."TipoCuenta" (nombre) VALUES ('Común'), ('Administrador'), ('Subdirección');
INSERT INTO ticket_trade."PropositoTokenCuenta" (nombre) VALUES ('Confirmación de correo'), ('Recuperación de contraseña'), ('Activación de cuenta especial');
INSERT INTO ticket_trade."TipoBloqueoRecinto" (nombre) VALUES ('Institucional'), ('Mantenimiento'), ('Fuera de servicio');
INSERT INTO ticket_trade."CausaCancelacionReservacion" (nombre) VALUES ('Cancelación voluntaria'), ('Cancelación de la actividad'), ('Cancelación del evento'), ('Cambio a entrada libre'), ('Desactivación de la cuenta del asistente');
-- Archivo: 02_reglas_integridad.sql
-- Reglas entre tablas. Ejecutar después de 01 y antes de cargar información.
-- Todas las escrituras usan READ COMMITTED y una exclusión transaccional global.
-- Se prioriza integridad en este proyecto académico; el backend podrá sustituirla
-- por bloqueos por actividad/persona cuando existan mediciones de concurrencia.
SET LOCAL search_path = ticket_trade, pg_catalog;
CREATE FUNCTION ticket_trade.bloquear_escritura() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION USING ERRCODE='25001', MESSAGE='Las escrituras de Ticket Trade requieren READ COMMITTED';
 END IF;
 PERFORM pg_advisory_xact_lock(744220261107::bigint);
 RETURN NULL;
END $$;
CREATE FUNCTION ticket_trade.validar_integridad() RETURNS void
LANGUAGE plpgsql SET search_path = ticket_trade, pg_catalog AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "Cuenta" c JOIN "TipoCuenta" t USING(id_tipo_cuenta) WHERE t.nombre='Administrador' HAVING count(*)>1) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT001: Solo puede existir una cuenta Administrador'; END IF;
 IF EXISTS (SELECT 1 FROM "Cuenta" c JOIN "TipoCuenta" t USING(id_tipo_cuenta) LEFT JOIN "PerfilUsuario" p USING(id_cuenta) WHERE (t.nombre='Común') <> (p.id_cuenta IS NOT NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT002: Una cuenta común requiere su perfil; las especiales no lo tienen'; END IF;
 IF EXISTS (SELECT 1 FROM "PerfilUsuario" p JOIN "RolRegistro" r USING(id_rol_registro) LEFT JOIN "Estudiante" e USING(id_cuenta) LEFT JOIN "EmpleadoIPN" m USING(id_cuenta) WHERE (r.nombre='Estudiante')<>(e.id_cuenta IS NOT NULL) OR (r.nombre='Empleado del IPN')<>(m.id_cuenta IS NOT NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT003: El subtipo debe coincidir con el rol declarado'; END IF;
 IF EXISTS (SELECT 1 FROM "Cuenta" c JOIN "EstadoCuenta" e USING(id_estado_cuenta) WHERE e.nombre='Activa' AND nullif(btrim(c.contrasena_hash),'') IS NULL) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT004: Cuenta activa requiere contraseña; no se guarda una contraseña en claro desde el frontend'; END IF;
 IF EXISTS (SELECT 1 FROM "SolicitudVerificacion" GROUP BY id_cuenta,id_periodo_escolar HAVING count(*)>3) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT005: Máximo tres envíos de verificación por cuenta y periodo'; END IF;
 IF EXISTS (SELECT 1 FROM "SolicitudVerificacion" s JOIN "EstadoSolicitudVerificacion" e USING(id_estado_solicitud_verificacion) WHERE e.nombre='Pendiente de revisión' GROUP BY id_cuenta HAVING count(*)>1) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT006: Solo una verificación pendiente por persona'; END IF;
 IF EXISTS (SELECT 1 FROM "SolicitudVerificacion" s JOIN "PeriodoEscolar" p USING(id_periodo_escolar) JOIN "EstadoSolicitudVerificacion" e USING(id_estado_solicitud_verificacion) WHERE (s.enviada_en AT TIME ZONE 'America/Mexico_City')::date NOT BETWEEN p.inicio AND p.fin OR (e.nombre='Pendiente de revisión' AND s.resuelta_en IS NOT NULL) OR (e.nombre<>'Pendiente de revisión' AND s.resuelta_en IS NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT007: Fechas y resolución de la verificación deben ser coherentes'; END IF;
 IF EXISTS (SELECT 1 FROM "SolicitudVerificacion" s JOIN "PerfilUsuario" p USING(id_cuenta) JOIN "RolRegistro" r USING(id_rol_registro) JOIN "EstadoSolicitudVerificacion" es USING(id_estado_solicitud_verificacion) WHERE (r.nombre='Empleado del IPN')<>(EXISTS(SELECT 1 FROM "DatosVerificacionEmpleado" d WHERE d.id_solicitud_verificacion=s.id_solicitud_verificacion)) OR (r.nombre='Externo')<>(EXISTS(SELECT 1 FROM "DatosVerificacionExterno" d WHERE d.id_solicitud_verificacion=s.id_solicitud_verificacion)) OR (es.nombre='Pendiente de revisión' AND ((r.nombre='Estudiante' AND NOT EXISTS(SELECT 1 FROM "DocumentoVerificacion" d JOIN "TipoDocumentoVerificacion" td USING(id_tipo_documento_verificacion) WHERE d.id_solicitud_verificacion=s.id_solicitud_verificacion AND td.nombre='Constancia de estudios')) OR (r.nombre='Empleado del IPN' AND NOT EXISTS(SELECT 1 FROM "DocumentoVerificacion" d JOIN "TipoDocumentoVerificacion" td USING(id_tipo_documento_verificacion) WHERE d.id_solicitud_verificacion=s.id_solicitud_verificacion AND td.nombre='Comprobante de adscripción')) OR (r.nombre='Externo' AND (SELECT count(*) FROM "DocumentoVerificacion" d JOIN "TipoDocumentoVerificacion" td USING(id_tipo_documento_verificacion) WHERE d.id_solicitud_verificacion=s.id_solicitud_verificacion AND td.nombre IN ('Acreditación de existencia de la entidad','Acreditación de representación'))<>2)))) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT008: Documentación y datos complementarios obligatorios al enviar a verificación'; END IF;
 IF EXISTS (SELECT 1 FROM "DocumentoVerificacion" d JOIN "Archivo" a USING(id_archivo) JOIN "TipoMime" m USING(id_tipo_mime) WHERE m.nombre<>'application/pdf' UNION ALL SELECT 1 FROM "DocumentoVerificacion" GROUP BY id_solicitud_verificacion HAVING count(*)>2) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT009: Los comprobantes de verificación son PDF y máximo dos por envío'; END IF;
 IF EXISTS (SELECT 1 FROM "Verificacion" v JOIN "SolicitudVerificacion" s ON s.id_solicitud_verificacion=v.id_solicitud_verificacion_aprobada JOIN "EstadoSolicitudVerificacion" e USING(id_estado_solicitud_verificacion) WHERE e.nombre<>'Aprobada' OR (v.retirada_en IS NOT NULL AND v.retirada_en<s.resuelta_en)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT010: Una verificación debe provenir de una solicitud aprobada'; END IF;
 IF EXISTS (SELECT 1 FROM "Verificacion" v JOIN "SolicitudVerificacion" s ON s.id_solicitud_verificacion=v.id_solicitud_verificacion_aprobada WHERE v.retirada_en IS NULL GROUP BY s.id_cuenta,s.id_periodo_escolar HAVING count(*)>1) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT011: Una persona no puede tener dos verificaciones no retiradas en el mismo periodo'; END IF;
 IF EXISTS (SELECT 1 FROM "JefaturaAcademia" j JOIN "Cuenta" c ON c.id_cuenta=j.id_cuenta_otorgante JOIN "TipoCuenta" tc USING(id_tipo_cuenta) WHERE tc.nombre<>'Subdirección' OR NOT EXISTS(SELECT 1 FROM "Verificacion" v JOIN "SolicitudVerificacion" s ON s.id_solicitud_verificacion=v.id_solicitud_verificacion_aprobada JOIN "PeriodoEscolar" p USING(id_periodo_escolar) WHERE s.id_cuenta=j.id_cuenta_empleada AND v.retirada_en IS NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT012: Jefaturas otorgadas por Subdirección y respaldadas por verificación no retirada'; END IF;
 IF EXISTS (SELECT 1 FROM "FotografiaRecinto" f JOIN "Archivo" a USING(id_archivo) JOIN "TipoMime" m USING(id_tipo_mime) WHERE a.tamano_bytes>150000 OR m.nombre NOT LIKE 'image/%' UNION ALL SELECT 1 FROM "FotografiaRecinto" GROUP BY id_recinto HAVING count(*)>6) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT013: Máximo seis fotografías de imagen por recinto y 150000 bytes por foto'; END IF;
 IF EXISTS (SELECT 1 FROM "LugarRecinto" l JOIN "TipoLugar" t USING(id_tipo_lugar) LEFT JOIN "EstacionComputo" e USING(id_lugar_recinto) WHERE (t.nombre='Estación de trabajo')<>(e.id_lugar_recinto IS NOT NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT014: Las estaciones tienen ficha de equipo; las butacas no'; END IF;
 IF EXISTS (SELECT 1 FROM "ActividadInterna" a WHERE NOT EXISTS(SELECT 1 FROM "DiaActividadInterna" d WHERE d.id_actividad_interna=a.id_actividad_interna)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT015: Cada horario informativo tiene al menos un día semanal'; END IF;
 IF EXISTS (SELECT 1 FROM "Evento" e WHERE NOT EXISTS(SELECT 1 FROM "Actividad" a WHERE a.id_evento=e.id_evento)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT016: Todo evento conserva al menos una actividad, también en borrador'; END IF;
 IF EXISTS (SELECT 1 FROM "Evento" e JOIN "EstadoEvento" ee USING(id_estado_evento) WHERE (ee.nombre='Publicado' OR EXISTS(SELECT 1 FROM "SolicitudEvento" s JOIN "EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE s.id_evento=e.id_evento AND es.nombre NOT IN ('Borrador','Cancelada'))) AND (nullif(btrim(e.titulo),'') IS NULL OR nullif(btrim(e.descripcion),'') IS NULL OR nullif(btrim(e.correo_contacto),'') IS NULL OR nullif(btrim(e.telefono_contacto),'') IS NULL OR e.id_categoria_evento IS NULL OR e.id_visibilidad_evento IS NULL OR e.id_archivo_cartel IS NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT017: Evento enviado o publicado debe tener información y cartel completos'; END IF;
 IF EXISTS (SELECT 1 FROM "Evento" e LEFT JOIN "VisibilidadEvento" v USING(id_visibilidad_evento) WHERE (e.token_enlace_privado IS NOT NULL AND v.nombre IS DISTINCT FROM 'Privado') OR (v.nombre='Privado' AND nullif(btrim(e.token_enlace_privado),'') IS NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT018: Solo eventos privados usan token de enlace privado'; END IF;
 IF EXISTS (SELECT 1 FROM "Actividad" a JOIN "Recinto" r USING(id_recinto) JOIN "TipoRecinto" tr USING(id_tipo_recinto) JOIN "TipoAcceso" t USING(id_tipo_acceso) WHERE a.aforo_solicitado>r.aforo_maximo OR (tr.nombre='Laboratorio' AND t.nombre='Entrada libre')) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT019: El aforo de una actividad no rebasa el recinto; en laboratorio no hay acceso libre'; END IF;
 IF EXISTS (SELECT 1 FROM "Actividad" a JOIN "Actividad" b ON a.id_actividad<b.id_actividad AND a.id_recinto=b.id_recinto AND a.fecha=b.fecha JOIN "EstadoActividad" sa ON sa.id_estado_actividad=a.id_estado_actividad JOIN "EstadoActividad" sb ON sb.id_estado_actividad=b.id_estado_actividad JOIN "Evento" ea ON ea.id_evento=a.id_evento JOIN "Evento" eb ON eb.id_evento=b.id_evento JOIN "EstadoEvento" esa ON esa.id_estado_evento=ea.id_estado_evento JOIN "EstadoEvento" esb ON esb.id_estado_evento=eb.id_estado_evento WHERE sa.nombre<>'Cancelada' AND sb.nombre<>'Cancelada' AND esa.nombre<>'Cancelado' AND esb.nombre<>'Cancelado' AND (a.id_evento=b.id_evento OR (esa.nombre='Publicado' AND esb.nombre='Publicado')) AND a.fecha+a.hora_inicio < b.fecha+b.hora_fin+interval '30 minutes' AND b.fecha+b.hora_inicio < a.fecha+a.hora_fin+interval '30 minutes' ) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT020: Separar 30 minutos entre actividades del mismo recinto; los borradores ajenos no reservan'; END IF;
 IF EXISTS (SELECT 1 FROM "ItinerarioDia" i WHERE NOT EXISTS(SELECT 1 FROM "Actividad" a WHERE a.id_evento=i.id_evento AND a.fecha=i.fecha)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT021: Un itinerario corresponde a un día con actividades del mismo evento'; END IF;
 IF EXISTS (SELECT 1 FROM "LugarActividad" l JOIN "Actividad" a USING(id_actividad) JOIN "LugarRecinto" r USING(id_lugar_recinto) WHERE a.id_recinto<>r.id_recinto) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT022: Un lugar de actividad pertenece al recinto elegido'; END IF;
 IF EXISTS (SELECT 1 FROM "SolicitudEvento" s JOIN "TipoTramite" t USING(id_tipo_tramite) WHERE t.nombre='Solicitud inicial' GROUP BY id_evento HAVING count(*)>1 UNION ALL SELECT 1 FROM "SolicitudEvento" s JOIN "TipoTramite" t USING(id_tipo_tramite) JOIN "EstadoSolicitudEvento" e USING(id_estado_solicitud_evento) WHERE t.nombre='Modificación de evento aprobado' AND e.nombre IN ('Borrador','En revisión','Requiere corrección') GROUP BY id_evento HAVING count(*)>1) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT023: Máximo una solicitud inicial por evento y una modificación abierta'; END IF;
 IF EXISTS (SELECT 1 FROM "SolicitudEvento" s JOIN "EstadoSolicitudEvento" e USING(id_estado_solicitud_evento) LEFT JOIN "TipoAnticipacion" t USING(id_tipo_anticipacion) WHERE e.nombre NOT IN ('Borrador','Cancelada') AND (s.envio_inicial IS NULL OR s.inicio_revision IS NULL OR s.id_tipo_anticipacion IS NULL OR (t.nombre='Extraordinaria' AND nullif(btrim(s.motivo),'') IS NULL))) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT024: Solicitud enviada requiere anticipación, fechas y justificación extraordinaria'; END IF;
 IF EXISTS (SELECT 1 FROM "ResolucionSolicitud" r JOIN "SolicitudEvento" s USING(id_solicitud_evento) LEFT JOIN "DecisionSolicitud" d USING(id_decision_solicitud) WHERE r.version_revisada>s.version_edicion OR (d.nombre IN ('Devuelta','Rechazada') AND nullif(btrim(r.mensaje),'') IS NULL) OR (r.id_decision_solicitud IS NULL AND nullif(btrim(r.mensaje),'') IS NULL)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT025: Una devolución requiere mensaje y una resolución no revisa una versión futura'; END IF;
 IF EXISTS (SELECT 1 FROM "CambioActividadSolicitado" c JOIN "Actividad" a USING(id_actividad) JOIN "SolicitudEvento" s USING(id_solicitud_evento) JOIN "TipoTramite" t USING(id_tipo_tramite) WHERE a.id_evento<>s.id_evento OR t.nombre<>'Modificación de evento aprobado' UNION ALL SELECT 1 FROM "SolicitudEvento" s JOIN "EstadoSolicitudEvento" e USING(id_estado_solicitud_evento) JOIN "TipoTramite" t USING(id_tipo_tramite) WHERE t.nombre='Modificación de evento aprobado' AND e.nombre IN ('En revisión','Requiere corrección','Aprobada') AND NOT EXISTS(SELECT 1 FROM "CambioActividadSolicitado" c WHERE c.id_solicitud_evento=s.id_solicitud_evento)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT026: Cambios únicamente para actividades del evento y trámites de modificación'; END IF;
 IF EXISTS (SELECT 1 FROM "ReasignacionSolicitada" r JOIN "CambioActividadSolicitado" c USING(id_cambio_actividad_solicitado) JOIN "CompromisoCupo" cp USING(id_compromiso_cupo) JOIN "LugarRecinto" l ON l.id_lugar_recinto=r.id_lugar_recinto_destino JOIN "Actividad" a ON a.id_actividad=c.id_actividad WHERE cp.id_actividad<>c.id_actividad OR l.id_recinto<>coalesce(c.id_recinto_propuesto,a.id_recinto)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT027: Reasignar solo compromisos de la actividad y al recinto propuesto'; END IF;
 IF EXISTS (SELECT 1 FROM "CompromisoCupo" c JOIN "EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) JOIN "Actividad" a USING(id_actividad) JOIN "TipoAcceso" ta USING(id_tipo_acceso) JOIN "EstadoActividad" ea USING(id_estado_actividad) JOIN "Evento" ev USING(id_evento) JOIN "EstadoEvento" ee ON ee.id_estado_evento=ev.id_estado_evento WHERE ec.nombre='Activo' GROUP BY a.id_actividad,ta.nombre,ea.nombre,ee.nombre HAVING count(*)>a.aforo_solicitado OR ta.nombre='Entrada libre' OR ea.nombre='Cancelada' OR ee.nombre='Cancelado' ) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT028: Compromisos activos dentro del aforo y sin cupos en actividades libres o canceladas'; END IF;
 IF EXISTS (SELECT 1 FROM "AsignacionAsiento" s JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "LugarActividad" l USING(id_lugar_actividad) WHERE c.id_actividad<>l.id_actividad UNION ALL SELECT 1 FROM "CompromisoCupo" c JOIN "EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) JOIN "Actividad" a USING(id_actividad) JOIN "TipoAcceso" ta USING(id_tipo_acceso) LEFT JOIN "AsignacionAsiento" s USING(id_compromiso_cupo) WHERE ec.nombre='Activo' AND ((ta.nombre='Reservación con lugar asignado')<>(s.id_compromiso_cupo IS NOT NULL))) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT029: Asignación y compromiso deben coincidir en actividad y modalidad'; END IF;
 IF EXISTS (SELECT 1 FROM "AsignacionAsiento" s JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "EstadoCompromisoCupo" e USING(id_estado_compromiso_cupo) WHERE e.nombre='Activo' GROUP BY s.id_lugar_actividad HAVING count(*)>1) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT030: Un lugar no puede respaldar dos compromisos activos'; END IF;
 IF EXISTS (SELECT 1 FROM "AsignacionAsiento" s JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) JOIN "LugarActividad" la USING(id_lugar_actividad) JOIN "CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad) LEFT JOIN "EstacionComputo" pc ON pc.id_lugar_recinto=la.id_lugar_recinto LEFT JOIN "EstadoFuncionamiento" ef USING(id_estado_funcionamiento) WHERE ec.nombre='Activo' AND (cl.nombre='Bloqueado' OR ef.nombre='Fuera de servicio')) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT031: Nunca usar un lugar Bloqueado ni una estación fuera de servicio para un cupo activo'; END IF;
 IF EXISTS (SELECT 1 FROM "BoletoEvento" b WHERE NOT EXISTS(SELECT 1 FROM "Reservacion" r WHERE r.id_boleto_evento=b.id_boleto_evento)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT032: Todo boleto de evento conserva al menos una reservación histórica'; END IF;
 IF EXISTS (SELECT 1 FROM "Reservacion" r JOIN "BoletoEvento" b USING(id_boleto_evento) JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "Actividad" a USING(id_actividad) JOIN "EstadoReservacion" er USING(id_estado_reservacion) JOIN "EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE b.id_evento<>a.id_evento OR (er.nombre='Confirmada' AND (r.cancelada_en IS NOT NULL OR r.id_causa_cancelacion_reservacion IS NOT NULL OR ec.nombre<>'Activo')) OR (er.nombre='Cancelada' AND (r.cancelada_en IS NULL OR r.id_causa_cancelacion_reservacion IS NULL OR r.cancelada_en<r.confirmada_en OR ec.nombre<>'Liberado'))) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT033: La reserva pertenece al evento del pase; estados de cancelación coherentes'; END IF;
 IF EXISTS (SELECT 1 FROM "Reservacion" r JOIN "BoletoEvento" b USING(id_boleto_evento) JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "EstadoReservacion" er USING(id_estado_reservacion) WHERE er.nombre='Confirmada' GROUP BY b.id_cuenta,c.id_actividad HAVING count(*)>1) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT034: Una reservación confirmada por persona y actividad'; END IF;
 IF EXISTS (SELECT 1 FROM "Reservacion" r JOIN "BoletoEvento" b USING(id_boleto_evento) JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "Actividad" a USING(id_actividad) JOIN "EstadoReservacion" er USING(id_estado_reservacion) JOIN "Reservacion" r2 ON r2.id_reservacion>r.id_reservacion JOIN "BoletoEvento" b2 ON b2.id_boleto_evento=r2.id_boleto_evento AND b2.id_cuenta=b.id_cuenta JOIN "CompromisoCupo" c2 ON c2.id_compromiso_cupo=r2.id_compromiso_cupo JOIN "Actividad" a2 ON a2.id_actividad=c2.id_actividad AND a2.fecha=a.fecha JOIN "EstadoReservacion" er2 ON er2.id_estado_reservacion=r2.id_estado_reservacion WHERE er.nombre='Confirmada' AND er2.nombre='Confirmada' AND a.hora_inicio<a2.hora_fin AND a2.hora_inicio<a.hora_fin) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT035: Una persona no confirma reservas con horarios traslapados'; END IF;
 IF EXISTS (SELECT 1 FROM "CompromisoCupo" c LEFT JOIN "Reservacion" r USING(id_compromiso_cupo) LEFT JOIN "BoletoEspecial" b USING(id_compromiso_cupo) LEFT JOIN "Apartado" a USING(id_compromiso_cupo) LEFT JOIN "EstadoApartado" ea USING(id_estado_apartado) WHERE (r.id_reservacion IS NOT NULL AND b.id_boleto_especial IS NOT NULL) OR ((r.id_reservacion IS NOT NULL OR b.id_boleto_especial IS NOT NULL) AND ea.nombre='Vigente')) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT036: Un compromiso no respalda simultáneamente reserva, especial o apartado vigente'; END IF;
 IF EXISTS (SELECT 1 FROM "BoletoEspecial" b JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) LEFT JOIN "AsignacionAsiento" s USING(id_compromiso_cupo) LEFT JOIN "LugarActividad" la USING(id_lugar_actividad) LEFT JOIN "CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad) WHERE b.invalidado_en IS NULL AND (ec.nombre<>'Activo' OR cl.nombre IS NULL OR cl.nombre NOT IN ('VIP','Staff'))) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT037: Boleto especial activo solo en lugar VIP o Staff y con cupo activo'; END IF;
 IF EXISTS (SELECT 1 FROM (SELECT codigo_qr AS codigo FROM "BoletoEvento" UNION ALL SELECT codigo_qr FROM "BoletoEspecial") q GROUP BY upper(codigo) HAVING count(*)>1 UNION ALL SELECT 1 FROM (SELECT codigo_manual AS codigo FROM "BoletoEvento" UNION ALL SELECT codigo_manual FROM "BoletoEspecial") q GROUP BY upper(codigo) HAVING count(*)>1) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT038: QR y código manual no se repiten entre pases ordinarios y especiales'; END IF;
 IF EXISTS (SELECT 1 FROM "StaffEvento" s WHERE NOT EXISTS(SELECT 1 FROM "InvitacionStaff" i JOIN "EstadoInvitacionStaff" e USING(id_estado_invitacion_staff) WHERE i.id_evento=s.id_evento AND i.id_cuenta_invitada=s.id_cuenta AND e.nombre='Aceptada')) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT039: Solo Staff con invitación aceptada queda asignado al evento'; END IF;
 IF EXISTS (SELECT 1 FROM "EntradaOrdinaria" en JOIN "Reservacion" r USING(id_reservacion) JOIN "EstadoReservacion" er USING(id_estado_reservacion) JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "Actividad" a USING(id_actividad) JOIN "EstadoActividad" ea USING(id_estado_actividad) WHERE er.nombre<>'Confirmada' OR ea.nombre='Cancelada' ) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT040: La entrada ordinaria requiere reserva confirmada y actividad habilitada'; END IF;
 IF EXISTS (SELECT 1 FROM "EntradaEspecial" e JOIN "BoletoEspecial" b USING(id_boleto_especial) WHERE e.registrada_en<b.emitido_en OR (b.invalidado_en IS NOT NULL AND e.registrada_en>=b.invalidado_en)) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT041: La entrada especial no puede anteceder a la emisión ni suceder a una invalidación'; END IF;
 IF EXISTS (SELECT 1 FROM "Evento" e JOIN "Archivo" a ON a.id_archivo=e.id_archivo_cartel JOIN "TipoMime" m ON m.id_tipo_mime=a.id_tipo_mime WHERE a.tamano_bytes>5242880 OR m.nombre NOT IN ('image/jpeg','image/png')) THEN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT043: el cartel debe ser JPEG o PNG de máximo 5 MiB';
 END IF;
END $$;
CREATE FUNCTION ticket_trade.comprobar_al_confirmar() RETURNS trigger
LANGUAGE plpgsql SET search_path = ticket_trade, pg_catalog AS $$
BEGIN
 PERFORM ticket_trade.validar_integridad();
 RETURN NULL;
END $$;
CREATE FUNCTION ticket_trade.validar_apartado_al_reservar() RETURNS trigger
LANGUAGE plpgsql SET search_path = ticket_trade, pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM "Apartado" a WHERE a.id_compromiso_cupo=NEW.id_compromiso_cupo AND a.creado_en+interval '2 minutes'<=clock_timestamp()) THEN
  RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TT042: el apartado de dos minutos venció; libere el cupo antes de volver a reservar';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER revisar_vencimiento BEFORE INSERT ON ticket_trade."Reservacion"
FOR EACH ROW EXECUTE FUNCTION ticket_trade.validar_apartado_al_reservar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Cuenta"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Cuenta"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."PerfilUsuario"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."PerfilUsuario"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Estudiante"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Estudiante"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EmpleadoIPN"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EmpleadoIPN"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TokenCuenta"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TokenCuenta"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."PeriodoEscolar"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."PeriodoEscolar"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."SolicitudVerificacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."SolicitudVerificacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."DatosVerificacionEmpleado"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."DatosVerificacionEmpleado"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."DatosVerificacionExterno"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."DatosVerificacionExterno"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."DocumentoVerificacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."DocumentoVerificacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Verificacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Verificacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Academia"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Academia"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."JefaturaAcademia"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."JefaturaAcademia"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Recinto"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Recinto"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."FotografiaRecinto"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."FotografiaRecinto"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoAccesorio"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoAccesorio"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."ExistenciaAccesorio"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."ExistenciaAccesorio"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."LugarRecinto"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."LugarRecinto"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstacionComputo"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstacionComputo"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."ActividadInterna"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."ActividadInterna"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."DiaActividadInterna"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."DiaActividadInterna"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."DiaInhabil"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."DiaInhabil"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."BloqueoRecinto"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."BloqueoRecinto"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Evento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Evento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Actividad"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Actividad"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."ItinerarioDia"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."ItinerarioDia"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."LugarActividad"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."LugarActividad"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."AfectacionActividad"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."AfectacionActividad"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."SolicitudEvento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."SolicitudEvento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."ResolucionSolicitud"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."ResolucionSolicitud"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."CambioActividadSolicitado"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."CambioActividadSolicitado"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."ReasignacionSolicitada"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."ReasignacionSolicitada"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."CompromisoCupo"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."CompromisoCupo"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Apartado"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Apartado"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."BoletoEvento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."BoletoEvento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Reservacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Reservacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."BoletoEspecial"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."BoletoEspecial"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."AvisoDisponibilidad"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."AvisoDisponibilidad"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."InvitacionStaff"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."InvitacionStaff"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."StaffEvento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."StaffEvento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EntradaOrdinaria"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EntradaOrdinaria"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EntradaEspecial"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EntradaEspecial"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Archivo"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Archivo"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."Notificacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."Notificacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EnvioCorreo"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EnvioCorreo"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."CategoriaEvento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."CategoriaEvento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."AsignacionAsiento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."AsignacionAsiento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoActividad"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoActividad"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoApartado"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoApartado"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoCompromisoCupo"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoCompromisoCupo"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoCuenta"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoCuenta"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoEnvioCorreo"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoEnvioCorreo"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoFuncionamiento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoFuncionamiento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoEvento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoEvento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoInvitacionStaff"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoInvitacionStaff"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoReservacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoReservacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoSolicitudEvento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoSolicitudEvento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoSolicitudVerificacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."EstadoSolicitudVerificacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoRecinto"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoRecinto"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."RolRegistro"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."RolRegistro"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoDocumentoVerificacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoDocumentoVerificacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoAcceso"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoAcceso"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoAnticipacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoAnticipacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoTramite"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoTramite"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."VisibilidadEvento"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."VisibilidadEvento"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."CategoriaLugarActividad"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."CategoriaLugarActividad"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoLugar"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoLugar"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."DecisionSolicitud"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."DecisionSolicitud"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoMime"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoMime"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoCuenta"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoCuenta"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."PropositoTokenCuenta"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."PropositoTokenCuenta"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."TipoBloqueoRecinto"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."TipoBloqueoRecinto"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
CREATE TRIGGER serializar_escritura BEFORE INSERT OR UPDATE OR DELETE ON ticket_trade."CausaCancelacionReservacion"
FOR EACH STATEMENT EXECUTE FUNCTION ticket_trade.bloquear_escritura();
CREATE CONSTRAINT TRIGGER integridad_diferida AFTER INSERT OR UPDATE OR DELETE ON ticket_trade."CausaCancelacionReservacion"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ticket_trade.comprobar_al_confirmar();
SELECT ticket_trade.validar_integridad();
-- Archivo: 03_consultas_y_vistas.sql
-- Proyecciones consultables. No crean tablas de contadores, versiones ni auditoría.
SET LOCAL search_path = ticket_trade, pg_catalog;
CREATE VIEW ticket_trade.v_actividades AS
 SELECT a.id_actividad,a.id_evento,e.titulo,e.id_cuenta_organizadora,a.nombre AS actividad,
 a.descripcion,a.fecha,a.hora_inicio,a.hora_fin,a.id_recinto,r.nombre AS recinto,
 a.aforo_solicitado,ta.nombre AS tipo_acceso,ea.nombre AS estado_actividad,ee.nombre AS estado_evento,
 (SELECT count(*) FROM "CompromisoCupo" c JOIN "EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE c.id_actividad=a.id_actividad AND ec.nombre='Activo') AS cupos_comprometidos,
 (SELECT count(*) FROM "Reservacion" re JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "EstadoReservacion" er USING(id_estado_reservacion) WHERE c.id_actividad=a.id_actividad AND er.nombre='Confirmada') AS reservaciones_confirmadas,
 (SELECT count(*) FROM "EntradaOrdinaria" en JOIN "Reservacion" re USING(id_reservacion) JOIN "CompromisoCupo" c USING(id_compromiso_cupo) WHERE c.id_actividad=a.id_actividad)+
 (SELECT count(*) FROM "EntradaEspecial" en JOIN "BoletoEspecial" b USING(id_boleto_especial) JOIN "CompromisoCupo" c USING(id_compromiso_cupo) WHERE c.id_actividad=a.id_actividad) AS entradas_registradas
 FROM "Actividad" a JOIN "Evento" e USING(id_evento) JOIN "Recinto" r USING(id_recinto)
 JOIN "TipoAcceso" ta USING(id_tipo_acceso) JOIN "EstadoActividad" ea USING(id_estado_actividad)
 JOIN "EstadoEvento" ee ON ee.id_estado_evento=e.id_estado_evento;
CREATE VIEW ticket_trade.v_asistentes_csv AS
 SELECT re.id_reservacion,b.id_evento,a.id_actividad,b.id_cuenta,
 concat_ws(' ',cu.nombres,cu.primer_apellido,nullif(cu.segundo_apellido,'')) AS asistente,
 cu.correo,ev.titulo AS evento,a.nombre AS actividad,a.fecha,a.hora_inicio,a.hora_fin,
 rec.nombre AS recinto,lr.codigo AS lugar,er.nombre AS estado_reservacion,
 re.confirmada_en,re.cancelada_en,en.registrada_en AS entrada_en,
 CASE WHEN en.id_entrada_ordinaria IS NOT NULL THEN 'Ingresó' ELSE 'Sin entrada registrada' END AS asistencia
 FROM "Reservacion" re JOIN "BoletoEvento" b USING(id_boleto_evento)
 JOIN "Cuenta" cu ON cu.id_cuenta=b.id_cuenta JOIN "CompromisoCupo" cp USING(id_compromiso_cupo)
 JOIN "Actividad" a USING(id_actividad) JOIN "Evento" ev ON ev.id_evento=a.id_evento
 JOIN "Recinto" rec ON rec.id_recinto=a.id_recinto JOIN "EstadoReservacion" er USING(id_estado_reservacion)
 LEFT JOIN "AsignacionAsiento" aa ON aa.id_compromiso_cupo=cp.id_compromiso_cupo
 LEFT JOIN "LugarActividad" la USING(id_lugar_actividad) LEFT JOIN "LugarRecinto" lr USING(id_lugar_recinto)
 LEFT JOIN "EntradaOrdinaria" en USING(id_reservacion);
CREATE VIEW ticket_trade.v_entradas_csv AS
 SELECT en.id_entrada_ordinaria AS id_entrada,'Ordinaria'::text AS tipo_entrada,
 a.id_evento,a.id_actividad,ev.titulo AS evento,a.nombre AS actividad,a.fecha,a.hora_inicio,a.hora_fin,
 rec.nombre AS recinto,concat_ws(' ',cu.nombres,cu.primer_apellido,nullif(cu.segundo_apellido,'')) AS asistente,
 lr.codigo AS lugar,en.registrada_en,en.id_cuenta_operadora,
 concat_ws(' ',op.nombres,op.primer_apellido,nullif(op.segundo_apellido,'')) AS operador
 FROM "EntradaOrdinaria" en JOIN "Reservacion" re USING(id_reservacion)
 JOIN "BoletoEvento" b USING(id_boleto_evento) JOIN "Cuenta" cu ON cu.id_cuenta=b.id_cuenta
 JOIN "CompromisoCupo" cp USING(id_compromiso_cupo) JOIN "Actividad" a USING(id_actividad)
 JOIN "Evento" ev ON ev.id_evento=a.id_evento JOIN "Recinto" rec ON rec.id_recinto=a.id_recinto
 JOIN "Cuenta" op ON op.id_cuenta=en.id_cuenta_operadora
 LEFT JOIN "AsignacionAsiento" aa ON aa.id_compromiso_cupo=cp.id_compromiso_cupo
 LEFT JOIN "LugarActividad" la USING(id_lugar_actividad) LEFT JOIN "LugarRecinto" lr USING(id_lugar_recinto)
 UNION ALL
 SELECT en.id_entrada_especial,'Especial',a.id_evento,a.id_actividad,ev.titulo,a.nombre,a.fecha,a.hora_inicio,a.hora_fin,
 rec.nombre,'Acceso especial',lr.codigo,en.registrada_en,en.id_cuenta_operadora,
 concat_ws(' ',op.nombres,op.primer_apellido,nullif(op.segundo_apellido,''))
 FROM "EntradaEspecial" en JOIN "BoletoEspecial" b USING(id_boleto_especial)
 JOIN "CompromisoCupo" cp USING(id_compromiso_cupo) JOIN "Actividad" a USING(id_actividad)
 JOIN "Evento" ev ON ev.id_evento=a.id_evento JOIN "Recinto" rec ON rec.id_recinto=a.id_recinto
 JOIN "Cuenta" op ON op.id_cuenta=en.id_cuenta_operadora
 LEFT JOIN "AsignacionAsiento" aa ON aa.id_compromiso_cupo=cp.id_compromiso_cupo
 LEFT JOIN "LugarActividad" la USING(id_lugar_actividad) LEFT JOIN "LugarRecinto" lr USING(id_lugar_recinto);
CREATE VIEW ticket_trade.v_pase_actividades AS
 SELECT b.id_boleto_evento,b.id_cuenta,b.id_evento,b.codigo_qr,b.codigo_manual,
 re.id_reservacion,a.id_actividad,a.fecha,a.hora_inicio,a.hora_fin,a.nombre AS actividad,
 r.nombre AS recinto,lr.codigo AS lugar,
 CASE WHEN er.nombre='Cancelada' THEN 'cancelado' WHEN en.id_entrada_ordinaria IS NOT NULL THEN 'utilizado' ELSE 'valido' END AS estado_boleto,
 en.registrada_en AS entrada_en
 FROM "BoletoEvento" b JOIN "Reservacion" re USING(id_boleto_evento)
 JOIN "EstadoReservacion" er USING(id_estado_reservacion)
 JOIN "CompromisoCupo" c USING(id_compromiso_cupo) JOIN "Actividad" a USING(id_actividad)
 JOIN "Recinto" r USING(id_recinto) LEFT JOIN "AsignacionAsiento" aa USING(id_compromiso_cupo)
 LEFT JOIN "LugarActividad" la USING(id_lugar_actividad) LEFT JOIN "LugarRecinto" lr USING(id_lugar_recinto)
 LEFT JOIN "EntradaOrdinaria" en USING(id_reservacion);
CREATE VIEW ticket_trade.v_verificaciones_vigentes AS
 SELECT v.id_verificacion,s.id_cuenta,s.id_periodo_escolar,p.clave,p.inicio,p.fin
 FROM "Verificacion" v JOIN "SolicitudVerificacion" s ON s.id_solicitud_verificacion=v.id_solicitud_verificacion_aprobada
 JOIN "PeriodoEscolar" p USING(id_periodo_escolar)
 WHERE v.retirada_en IS NULL AND (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date BETWEEN p.inicio AND p.fin;
CREATE FUNCTION ticket_trade.limite_revision(inicio timestamptz) RETURNS timestamptz
LANGUAGE plpgsql STABLE SET search_path = ticket_trade,pg_catalog AS $$
DECLARE d date; dias integer:=0;
BEGIN
 IF inicio IS NULL THEN RETURN NULL; END IF;
 d := (inicio AT TIME ZONE 'America/Mexico_City')::date;
 WHILE dias<2 LOOP
  d:=d+1;
  IF extract(isodow FROM d) BETWEEN 1 AND 5 AND NOT EXISTS(SELECT 1 FROM "DiaInhabil" WHERE fecha=d) THEN dias:=dias+1; END IF;
 END LOOP;
 -- El plazo vence al comenzar el día siguiente: comparar ahora < limite, no <=.
 RETURN (d+1)::timestamp AT TIME ZONE 'America/Mexico_City';
END $$;
CREATE VIEW ticket_trade.v_plazos_solicitud AS
 SELECT s.id_solicitud_evento,e.nombre AS estado,
 CASE WHEN e.nombre='En revisión' THEN ticket_trade.limite_revision(s.inicio_revision)
 WHEN e.nombre='Requiere corrección' THEN
 (SELECT max(r.resuelta_en)+interval '24 hours' FROM "ResolucionSolicitud" r
 JOIN "DecisionSolicitud" d USING(id_decision_solicitud)
 WHERE r.id_solicitud_evento=s.id_solicitud_evento AND d.nombre='Devuelta'
 AND r.resuelta_en>=s.inicio_revision) ELSE NULL END AS limite_exclusivo
 FROM "SolicitudEvento" s JOIN "EstadoSolicitudEvento" e USING(id_estado_solicitud_evento);
COMMIT;
