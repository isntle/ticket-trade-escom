-- Semilla de demostración y cuentas iniciales para Ticket Trade ESCOM
-- Contraseña para todas las cuentas demo: Password123!
-- Hash scrypt generado por el backend: scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2

BEGIN;
SET LOCAL TIME ZONE 'America/Mexico_City';
SET LOCAL search_path = ticket_trade, pg_catalog;
SET CONSTRAINTS ALL DEFERRED;

-- 1. Asegurar periodo escolar vigente
INSERT INTO "PeriodoEscolar" ("id_periodo_escolar", "clave", "inicio", "fin")
OVERRIDING SYSTEM VALUE VALUES (1001, '2026-2', CURRENT_DATE - 180, CURRENT_DATE + 180)
ON CONFLICT ("id_periodo_escolar") DO UPDATE SET
  inicio = CURRENT_DATE - 180,
  fin = CURRENT_DATE + 180;

-- 2. Recintos físicos de ESCOM
UPDATE "Recinto" SET
  nombre = 'Auditorio Principal de ESCOM',
  aforo_maximo = 242,
  descripcion = 'Espacio institucional principal para congresos, simposios y ceremonias oficiales.'
WHERE id_recinto = 1001;

UPDATE "Recinto" SET
  nombre = 'Sala de Usos Múltiples 14',
  numero_salon = 'SALA-14',
  aforo_maximo = 40,
  descripcion = 'Sala para talleres interactivos, conferencias pequeñas y defensas de tesis.'
WHERE id_recinto = 1002;

UPDATE "Recinto" SET
  nombre = 'Laboratorio de Cómputo 4',
  numero_salon = 'LAB-4',
  aforo_maximo = 30,
  descripcion = 'Laboratorio para cursos técnicos, desarrollo y hackatones.'
WHERE id_recinto = 1003;

INSERT INTO "Recinto" ("id_recinto", "nombre", "descripcion", "id_tipo_recinto", "numero_salon", "aforo_maximo")
OVERRIDING SYSTEM VALUE VALUES (
  1004,
  'Laboratorio de Redes y Seguridad',
  'Laboratorio especializado para talleres y certificaciones de infraestructura.',
  3,
  'LAB-REDES',
  25
) ON CONFLICT (id_recinto) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  numero_salon = EXCLUDED.numero_salon,
  aforo_maximo = EXCLUDED.aforo_maximo;

-- 3. Cuentas demo principales
-- 1001: Administrador (Ing. Fernando Castro)
UPDATE "Cuenta" SET
  nombres = 'Fernando',
  primer_apellido = 'Castro',
  segundo_apellido = 'Pérez',
  correo = 'cuenta1001@example.invalid',
  contrasena_hash = 'scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2',
  correo_confirmado_en = CURRENT_TIMESTAMP
WHERE id_cuenta = 1001;

-- 1002: Subdirección (Dra. Patricia González)
UPDATE "Cuenta" SET
  nombres = 'Patricia',
  primer_apellido = 'González',
  segundo_apellido = 'Ruiz',
  correo = 'cuenta1002@example.invalid',
  contrasena_hash = 'scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2',
  correo_confirmado_en = CURRENT_TIMESTAMP
WHERE id_cuenta = 1002;

-- 1003: Docente / Organizador (Mtro. Roberto Silva)
UPDATE "Cuenta" SET
  nombres = 'Roberto',
  primer_apellido = 'Silva',
  segundo_apellido = 'Reyes',
  correo = 'cuenta1003@example.invalid',
  contrasena_hash = 'scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2',
  correo_confirmado_en = CURRENT_TIMESTAMP
WHERE id_cuenta = 1003;

-- 1004: Estudiante (Carlos Méndez Vega)
UPDATE "Cuenta" SET
  nombres = 'Carlos',
  primer_apellido = 'Méndez',
  segundo_apellido = 'Vega',
  correo = 'cuenta1004@example.invalid',
  contrasena_hash = 'scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2',
  correo_confirmado_en = CURRENT_TIMESTAMP
WHERE id_cuenta = 1004;

UPDATE "Estudiante" SET boleta = '2022630412' WHERE id_cuenta = 1004;

-- 1005: Externo (Lic. Mariana Morales)
UPDATE "Cuenta" SET
  nombres = 'Mariana',
  primer_apellido = 'Morales',
  segundo_apellido = 'Navarro',
  correo = 'cuenta1005@example.invalid',
  contrasena_hash = 'scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2',
  correo_confirmado_en = CURRENT_TIMESTAMP
WHERE id_cuenta = 1005;

UPDATE "DatosVerificacionExterno" SET
  nombre_entidad = 'Fundación TechMX A.C.',
  cargo_o_relacion = 'Directora de Vinculación Universitaria'
WHERE id_solicitud_verificacion = 1002;

-- 1006: Staff (Andrea Rangel)
UPDATE "Cuenta" SET
  nombres = 'Andrea',
  primer_apellido = 'Rangel',
  segundo_apellido = 'Gómez',
  correo = 'cuenta1006@example.invalid',
  contrasena_hash = 'scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2',
  correo_confirmado_en = CURRENT_TIMESTAMP
WHERE id_cuenta = 1006;

-- 1007: Estudiante con correo sin confirmar (Lucía Torres)
INSERT INTO "Cuenta" ("id_cuenta","nombres","primer_apellido","segundo_apellido","correo","contrasena_hash","correo_confirmado_en","id_tipo_cuenta","id_estado_cuenta")
OVERRIDING SYSTEM VALUE VALUES (
  1007,
  'Lucía',
  'Torres',
  'Morales',
  'ltorres.demo@alumno.ipn.mx',
  'scrypt:f1c4d676c24524e425aa6c9088c1ecc7:cec1993d54ea06bc2bb39d81c40fb982f338792c7c6e8d11bccc5a95c112fa1689013c987f176d58cf1890d69128b26b097bafc29db4a8c9f88f66d23f5978c2',
  NULL,
  1,
  2
) ON CONFLICT (id_cuenta) DO UPDATE SET
  contrasena_hash = EXCLUDED.contrasena_hash;

INSERT INTO "PerfilUsuario" ("id_cuenta","id_rol_registro")
OVERRIDING SYSTEM VALUE VALUES (1007, 1)
ON CONFLICT (id_cuenta) DO NOTHING;

INSERT INTO "Estudiante" ("id_cuenta","boleta")
OVERRIDING SYSTEM VALUE VALUES (1007, '2026630998')
ON CONFLICT (id_cuenta) DO NOTHING;

-- 4. Evento publicado inicial emblemático de ESCOM
UPDATE "Evento" SET
  titulo = 'Simposio Internacional de Inteligencia Artificial 2026',
  descripcion = 'Encuentro académico anual de la Escuela Superior de Cómputo enfocado en los avances de aprendizaje profundo, agentes autónomos y visión computacional.',
  id_categoria_evento = 1
WHERE id_evento = 1001;

UPDATE "Actividad" SET
  nombre = 'Conferencia Magistral: Agentes Autónomos',
  descripcion = 'Inauguración y ponencia estelar en el Auditorio Principal',
  fecha = CURRENT_DATE + interval '7 days',
  hora_inicio = '10:00',
  hora_fin = '12:00'
WHERE id_actividad = 1001;

-- El itinerario debe conservar exactamente el día de una actividad del evento.
UPDATE "ItinerarioDia" i SET fecha=a.fecha FROM "Actividad" a WHERE a.id_actividad=1001 AND i.id_evento=a.id_evento;
SELECT ticket_trade.validar_integridad();

-- Continuar secuencias identity
DO $$
DECLARE x record; maximo bigint; secuencia regclass;
BEGIN
 FOR x IN SELECT table_name,column_name FROM information_schema.columns
 WHERE table_schema='ticket_trade' AND is_identity='YES' LOOP
  EXECUTE format('SELECT max(%I) FROM ticket_trade.%I',x.column_name,x.table_name) INTO maximo;
  IF maximo IS NOT NULL THEN
   secuencia:=pg_get_serial_sequence(format('ticket_trade.%I',x.table_name),x.column_name)::regclass;
   PERFORM setval(secuencia,greatest(maximo,coalesce(pg_sequence_last_value(secuencia),1)),true);
  END IF;
 END LOOP;
END $$;

SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;
