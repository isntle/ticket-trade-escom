-- Abrir en Query Tool de pgAdmin, seleccionar una consulta y pulsar F5.
-- Consulta directa al servidor PostgreSQL: no requiere pasar por Ticket Trade.
SELECT current_database() AS base, version() AS version_postgresql,
       current_setting('server_encoding') AS codificacion;

-- Catálogo de las 73 tablas; no confundir las vistas con tablas adicionales.
SELECT tablename AS tabla FROM pg_tables WHERE schemaname='ticket_trade' ORDER BY tablename;

-- Cuenta nueva, acentos, correo confirmado y estado. No mostrar hashes en la exposición.
SELECT c.id_cuenta,c.nombres,c.primer_apellido,c.segundo_apellido,c.correo,
       c.correo_confirmado_en,e.nombre AS estado
FROM ticket_trade."Cuenta" c JOIN ticket_trade."EstadoCuenta" e USING(id_estado_cuenta)
ORDER BY c.id_cuenta DESC;

-- Evento, fechas, recinto, aforo, reservaciones e ingresos reales.
SELECT * FROM ticket_trade.v_actividades ORDER BY id_evento,fecha,hora_inicio;
SELECT * FROM ticket_trade.v_pase_actividades ORDER BY id_boleto_evento,id_actividad;

-- PDF efectivamente subido: los bytes viven en infra; Archivo conserva el modelo ER.
SELECT a.id_archivo,a.nombre,a.tamano_bytes,b.id_cuenta_propietaria,
       octet_length(b.contenido) AS bytes_guardados,b.creado_en
FROM ticket_trade."Archivo" a JOIN infra.archivo_contenido b USING(id_archivo)
ORDER BY a.id_archivo DESC;

-- Solicitudes y resoluciones.
SELECT * FROM ticket_trade."SolicitudEvento" ORDER BY id_solicitud_evento DESC;
SELECT * FROM ticket_trade."SolicitudVerificacion" ORDER BY id_solicitud_verificacion DESC;
SELECT * FROM ticket_trade."ResolucionSolicitud" ORDER BY id_resolucion_solicitud DESC;

-- Reglas verificadas por el propio motor.
SELECT ticket_trade.validar_integridad();
