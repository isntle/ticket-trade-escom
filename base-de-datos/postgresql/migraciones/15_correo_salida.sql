BEGIN;
CREATE TABLE IF NOT EXISTS infra.correo_salida (
 id uuid PRIMARY KEY, clave text NOT NULL UNIQUE,
 id_cuenta bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta),
 id_pase bigint REFERENCES ticket_trade."BoletoEvento"(id_boleto_evento),
 contenido text NOT NULL,
 estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviando','aceptado','incierto','fallido','omitido')),
 intentos integer NOT NULL DEFAULT 0, siguiente_en timestamptz NOT NULL DEFAULT now(),
 creada_en timestamptz NOT NULL DEFAULT now(), actualizada_en timestamptz NOT NULL DEFAULT now(),
 codigo_resultado text, referencia_proveedor text
);
CREATE INDEX IF NOT EXISTS correo_salida_pendiente ON infra.correo_salida(siguiente_en) WHERE estado='pendiente';
COMMIT;
