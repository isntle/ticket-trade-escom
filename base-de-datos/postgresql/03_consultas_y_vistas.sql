-- Proyecciones consultables. No crean tablas de contadores, versiones ni auditoría.
BEGIN;
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
