-- Restaura únicamente el estado de la cuenta de presentación Carlos.
-- No equivale a revisar documentos de una persona real ni renueva periodos.
BEGIN;
SET LOCAL search_path = ticket_trade, pg_catalog;
SET LOCAL TIME ZONE 'America/Mexico_City';
DO $$
DECLARE periodo bigint; solicitud bigint;
BEGIN
  PERFORM 1 FROM "Cuenta" WHERE id_cuenta=1004 AND nombres='Carlos'
    AND (correo='cuenta1004@example.invalid' OR correo LIKE 'tickettradescom+%@gmail.com') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se identificó la cuenta de presentación Carlos'; END IF;
  IF EXISTS (SELECT 1 FROM v_verificaciones_vigentes WHERE id_cuenta=1004) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM "SolicitudVerificacion" WHERE id_cuenta=1004) THEN
    RAISE EXCEPTION 'Carlos ya tiene expediente: revisar manualmente antes de modificarlo';
  END IF;
  SELECT s.id_periodo_escolar INTO STRICT periodo FROM "SolicitudVerificacion" s
    JOIN "PeriodoEscolar" p USING(id_periodo_escolar)
    WHERE s.id_cuenta=1003 AND CURRENT_DATE BETWEEN p.inicio AND p.fin
    ORDER BY s.enviada_en DESC LIMIT 1;
  INSERT INTO "SolicitudVerificacion" (id_cuenta,id_periodo_escolar,motivo_solicitud,enviada_en,id_estado_solicitud_verificacion,resuelta_en,id_cuenta_resolutora,motivo_resolucion)
  VALUES (1004,periodo,'Cuenta de presentación: estudiante verificado del escenario de demostración',CURRENT_TIMESTAMP,
    (SELECT id_estado_solicitud_verificacion FROM "EstadoSolicitudVerificacion" WHERE nombre='Aprobada'),
    CURRENT_TIMESTAMP,1002,'Restauración del escenario de presentación original; no es una revisión documental real')
  RETURNING id_solicitud_verificacion INTO solicitud;
  INSERT INTO "Verificacion" (id_solicitud_verificacion_aprobada) VALUES(solicitud);
END $$;
SELECT ticket_trade.validar_integridad();
COMMIT;
