-- Reglas entre tablas. Ejecutar después de 01 y antes de cargar información.
-- Todas las escrituras usan READ COMMITTED y una exclusión transaccional global.
-- Se prioriza integridad en este proyecto académico; el backend podrá sustituirla
-- por bloqueos por actividad/persona cuando existan mediciones de concurrencia.
BEGIN;
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
COMMIT;
