-- Infraestructura de autenticación, separada del modelo de negocio.
BEGIN;
CREATE SCHEMA IF NOT EXISTS infra;
CREATE TABLE IF NOT EXISTS infra.sesion_http (
 token_hash text PRIMARY KEY,
 id_cuenta bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta),
 vence_en timestamptz NOT NULL,
 creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sesion_http_cuenta ON infra.sesion_http(id_cuenta);
CREATE INDEX IF NOT EXISTS sesion_http_vencimiento ON infra.sesion_http(vence_en);
COMMIT;
