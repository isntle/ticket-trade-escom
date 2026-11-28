BEGIN;
SET LOCAL lock_timeout = '5s';

-- La participación pertenece a la cuenta. El perfil de registro se exige
-- solo en los trámites que dependen de la afiliación de una cuenta común.
DO $$
DECLARE
  relacion record;
BEGIN
  FOR relacion IN
    SELECT * FROM (VALUES
      (to_regclass('ticket_trade."Apartado"'), 'fk_071', 'DEFERRABLE INITIALLY IMMEDIATE'),
      (to_regclass('ticket_trade."BoletoEvento"'), 'fk_073', 'DEFERRABLE INITIALLY IMMEDIATE'),
      (to_regclass('ticket_trade."AvisoDisponibilidad"'), 'fk_080', 'DEFERRABLE INITIALLY IMMEDIATE'),
      (to_regclass('infra.intencion_asistencia'), 'intencion_asistencia_id_cuenta_fkey', 'ON DELETE CASCADE')
    ) AS relaciones(tabla, restriccion, opciones)
    WHERE tabla IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = relacion.tabla AND conname = relacion.restriccion
        AND confrelid = 'ticket_trade."Cuenta"'::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I, ADD CONSTRAINT %I FOREIGN KEY (id_cuenta) REFERENCES ticket_trade."Cuenta"(id_cuenta) %s',
        relacion.tabla, relacion.restriccion, relacion.restriccion, relacion.opciones
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
