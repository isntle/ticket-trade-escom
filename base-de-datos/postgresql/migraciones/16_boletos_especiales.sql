BEGIN;
CREATE SCHEMA IF NOT EXISTS infra;

CREATE TABLE IF NOT EXISTS infra.boleto_especial_detalle (
  id_boleto_especial bigint PRIMARY KEY REFERENCES ticket_trade."BoletoEspecial"(id_boleto_especial) ON DELETE CASCADE,
  tipo_especial text NOT NULL CHECK (tipo_especial IN ('organizador', 'staff', 'vip')),
  nombre_titular text NOT NULL CHECK (btrim(nombre_titular) <> ''),
  correo_destino text NOT NULL CHECK (btrim(correo_destino) <> ''),
  id_cuenta_emisora bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta),
  emitido_por text NOT NULL CHECK (btrim(emitido_por) <> ''),
  id_cuenta_invalidadora bigint REFERENCES ticket_trade."Cuenta"(id_cuenta),
  invalidado_por text,
  id_categoria_lugar_previa bigint REFERENCES ticket_trade."CategoriaLugarActividad"(id_categoria_lugar_actividad)
);

CREATE TABLE IF NOT EXISTS infra.emision_especial_idempotencia (
  id_cuenta bigint NOT NULL REFERENCES ticket_trade."Cuenta"(id_cuenta) ON DELETE CASCADE,
  clave text NOT NULL CHECK (btrim(clave) <> ''),
  id_actividad bigint NOT NULL REFERENCES ticket_trade."Actividad"(id_actividad) ON DELETE CASCADE,
  ids_boletos bigint[] NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_cuenta, clave)
);
COMMIT;
