-- Infraestructura del servidor; las 73 tablas del modelo ER no se modifican.
BEGIN;
CREATE SCHEMA IF NOT EXISTS infra;
CREATE TABLE IF NOT EXISTS infra.archivo_contenido (
  id_archivo bigint PRIMARY KEY REFERENCES ticket_trade."Archivo"(id_archivo),
  id_cuenta_propietaria bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta),
  contenido bytea NOT NULL,
  metadatos jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (octet_length(contenido) BETWEEN 1 AND 10485760)
);
COMMENT ON TABLE infra.archivo_contenido IS 'Bytes privados y propietario del archivo descrito por Archivo en el ER; nunca se publican los PDF sin autorización.';
COMMIT;
