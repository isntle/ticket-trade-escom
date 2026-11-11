-- Borrador de datos de la interfaz; al enviar se copian a las tablas de verificación del ER.
BEGIN;
CREATE TABLE IF NOT EXISTS infra.perfil_interfaz (
 id_cuenta bigint PRIMARY KEY REFERENCES ticket_trade."Cuenta"(id_cuenta),
 numero_empleado text,
 nombre_entidad text,
 cargo text,
 telefono text
);
COMMIT;
