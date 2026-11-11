-- ============================================================================
-- Ticket Trade ESCOM - Catálogo académico de demostración con temas realistas
-- Escuela Superior de Cómputo - Instituto Politécnico Nacional
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- 1. Registrar archivos de carteles ilustrativos en ticket_trade."Archivo"
INSERT INTO ticket_trade."Archivo" ("id_archivo", "clave_almacenamiento", "nombre", "id_tipo_mime", "tamano_bytes")
OVERRIDING SYSTEM VALUE VALUES
  (1010, '/imagenes/eventos/simposio-ia.jpg', 'simposio-ia.jpg', 3, 109205),
  (1011, '/imagenes/eventos/expo-escom.jpg', 'expo-escom.jpg', 3, 163024),
  (1012, '/imagenes/eventos/hackathon-escom.jpg', 'hackathon-escom.jpg', 3, 206962),
  (1013, '/imagenes/eventos/ciberseguridad-congreso.jpg', 'ciberseguridad-congreso.jpg', 3, 237890),
  (1014, '/imagenes/eventos/robotica-autonoma.jpg', 'robotica-autonoma.jpg', 3, 99698),
  (1015, '/imagenes/eventos/ciberseguridad.jpg', 'ciberseguridad.jpg', 3, 210099),
  (1016, '/imagenes/eventos/torneo-icpc.jpg', 'torneo-icpc.jpg', 3, 106668),
  (1017, '/imagenes/eventos/feria-empleo.jpg', 'feria-empleo.jpg', 3, 186952),
  (1018, '/imagenes/eventos/gamejam-escom.jpg', 'gamejam-escom.jpg', 3, 120088),
  (1019, '/imagenes/eventos/coloquio-posgrado.jpg', 'coloquio-posgrado.jpg', 3, 166424),
  (1020, '/imagenes/eventos/taller-web.jpg', 'taller-web.jpg', 3, 136530),
  (1021, '/imagenes/eventos/stem-escom.jpg', 'stem-escom.jpg', 3, 308096)
ON CONFLICT ("id_archivo") DO UPDATE SET
  "clave_almacenamiento" = EXCLUDED."clave_almacenamiento",
  "nombre" = EXCLUDED."nombre",
  "tamano_bytes" = EXCLUDED."tamano_bytes";

-- 2. Evento 1001: Simposio Internacional de Inteligencia Artificial y Modelos Fundacionales 2026
UPDATE ticket_trade."Evento" SET
  "titulo" = 'Simposio Internacional de Inteligencia Artificial y Modelos Fundacionales 2026',
  "descripcion" = 'Encuentro académico insignia de la Escuela Superior de Cómputo sobre aprendizaje profundo, agentes autónomos, visión por computadora y modelos de lenguaje a gran escala, con conferencias magistrales e investigadores invitados.',
  "id_categoria_evento" = 1,
  "id_visibilidad_evento" = 1,
  "id_archivo_cartel" = 1010,
  "id_estado_evento" = 2,
  "publicado_en" = COALESCE("publicado_en", CURRENT_TIMESTAMP)
WHERE "id_evento" = 1001;

UPDATE ticket_trade."Actividad" SET
  "nombre" = 'Conferencia Inaugural: Arquitecturas Transformer y Modelos Multimodales',
  "descripcion" = 'Ponencia magistral en el Auditorio Principal sobre nuevas técnicas de atención dispersa e inferencia distribuida.',
  "fecha" = '2026-11-17',
  "hora_inicio" = '10:00:00',
  "hora_fin" = '12:00:00',
  "id_recinto" = 1001,
  "id_tipo_acceso" = 3,
  "aforo_solicitado" = 200
WHERE "id_actividad" = 1001;

UPDATE ticket_trade."Actividad" SET
  "nombre" = 'Panel de Expertos: Retos y Gobernanza de Agentes de IA en México',
  "descripcion" = 'Mesa redonda con académicos e industria sobre el impacto de la inteligencia artificial en la ingeniería mexicana.',
  "fecha" = '2026-11-18',
  "hora_inicio" = '11:00:00',
  "hora_fin" = '13:00:00',
  "id_recinto" = 1002,
  "id_tipo_acceso" = 2,
  "aforo_solicitado" = 40
WHERE "id_actividad" = 1002;

UPDATE ticket_trade."Actividad" SET
  "nombre" = 'Taller Práctico: Despliegue de Modelos de IA en Hardware de Borde (Edge AI)',
  "descripcion" = 'Práctica guiada en laboratorio con cuantización de modelos y optimización con ONNX y TensorRT.',
  "fecha" = '2026-11-19',
  "hora_inicio" = '14:00:00',
  "hora_fin" = '16:30:00',
  "id_recinto" = 1003,
  "id_tipo_acceso" = 3,
  "aforo_solicitado" = 30
WHERE "id_actividad" = 1003;

-- 3. Evento 1002: Expo ESCOM 2026: Proyectos Terminales e Innovación Tecnológica
UPDATE ticket_trade."Evento" SET
  "titulo" = 'Expo ESCOM 2026: Proyectos Terminales e Innovación Tecnológica',
  "descripcion" = 'Exposición anual de proyectos terminales, prototipos de hardware y desarrollo de software de los estudiantes de Ingeniería en Sistemas Computacionales, IA y Ciencia de Datos de la ESCOM.',
  "id_categoria_evento" = 1,
  "id_visibilidad_evento" = 1,
  "id_archivo_cartel" = 1011,
  "id_estado_evento" = 2,
  "publicado_en" = CURRENT_TIMESTAMP
WHERE "id_evento" = 1002;

UPDATE ticket_trade."Actividad" SET
  "nombre" = 'Ceremonia de Inauguración y Presentación de Proyectos Destacados',
  "descripcion" = 'Apertura oficial en el Auditorio Principal de ESCOM y recorrido guiado con directivos y empresas invitadas.',
  "fecha" = '2026-11-20',
  "hora_inicio" = '09:30:00',
  "hora_fin" = '12:30:00',
  "id_recinto" = 1001,
  "id_tipo_acceso" = 3,
  "aforo_solicitado" = 240
WHERE "id_actividad" = 1004;

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1005, 1002, 'Demostración de Prototipos de Robótica y Cómputo Embebido', 'Muestra en vivo de robots móviles, sensores inteligentes y sistemas IoT desarrollados por alumnos de la comunidad.', '2026-11-20', '14:00:00', '17:00:00', 1002, 1, 40, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 4. Evento 1010: Hackathon ESCOM Innovation Challenge 2026
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1010, 1003, 'Hackathon ESCOM Innovation Challenge 2026', 'Maratón intensivo de desarrollo de software durante 36 horas. Equipos multidisciplinarios crearán soluciones para salud, movilidad sustentable y educación utilizando tecnologías en la nube y modelos de IA.', 'rsilva@ipn.mx', '5557296000', 4, 1, 1012, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1006, 1010, 'Kickoff, Mentorías y Fase de Desarrollo Intensivo', 'Presentación de problemáticas de la industria, asignación de estaciones en el laboratorio y trabajo en equipo.', '2026-11-27', '10:00:00', '18:00:00', 1003, 3, 30, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 5. Evento 1011: Congreso Internacional de Ciberseguridad y Hacking Ético ESCOM
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1011, 1005, 'Congreso Internacional de Ciberseguridad y Hacking Ético ESCOM', 'Jornada especializada en seguridad informática, análisis forense digital, pentesting y protección de infraestructuras críticas ante ciberamenazas modernas.', 'subdireccion_seis@escom.ipn.mx', '5557296000', 2, 1, 1013, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1007, 1011, 'Keynote: Vectores de Ataque Modernos y Seguridad en la Nube', 'Conferencia magistral con especialistas internacionales de ciberseguridad sobre mitigación de amenazas APT.', '2026-12-01', '10:00:00', '12:30:00', 1001, 3, 220, 1),
  (1008, 1011, 'Laboratorio Práctico de Pentesting y Análisis de Tráfico de Red', 'Taller hands-on de auditoría de seguridad y contramedidas defensivas en el laboratorio de redes.', '2026-12-02', '15:00:00', '18:00:00', 1004, 3, 25, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 6. Evento 1012: Taller de Robótica Autónoma y Sistemas Embebidos
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1012, 1003, 'Taller de Robótica Autónoma y Sistemas Embebidos', 'Curso práctico sobre diseño y programación de robots móviles autónomos, cinemática, sensado con LIDAR y control mediante microcontroladores y ROS 2.', 'rsilva@ipn.mx', '5557296000', 3, 1, 1014, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1009, 1012, 'Sesión Práctica: Navegación Autónoma y Control de Actuadores', 'Programación de trayectorias, calibración de sensores inerciales y pruebas de navegación en pista.', '2026-12-04', '12:00:00', '15:00:00', 1002, 2, 35, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 7. Evento 1033: Taller de Ciberseguridad Defensiva y Análisis de Tráfico de Red
UPDATE ticket_trade."Evento" SET
  "titulo" = 'Taller de Ciberseguridad Defensiva y Análisis de Tráfico de Red',
  "descripcion" = 'Práctica avanzada en laboratorio de redes con herramientas de inspección profunda de paquetes, análisis con Wireshark y configuración de reglas Suricata/Snort.',
  "id_archivo_cartel" = 1015
WHERE "id_evento" = 1033;

UPDATE ticket_trade."Actividad" SET
  "nombre" = 'Auditoría de Protocolos y Hardening de Servidores',
  "descripcion" = 'Configuración de firewalls y mitigación de tráfico anómalo en el laboratorio de redes.',
  "fecha" = '2026-11-25',
  "hora_inicio" = '14:00:00',
  "hora_fin" = '16:00:00',
  "id_recinto" = 1004,
  "id_tipo_acceso" = 3,
  "aforo_solicitado" = 20
WHERE "id_evento" = 1033;

-- 8. Evento 1013: Concurso de Programación Competitiva "Gran Premio de México" - Sede ESCOM
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1013, 1003, 'Concurso de Programación Competitiva Gran Premio de México - Sede ESCOM', 'Encuentro de práctica inspirado en competencias de programación por equipos. Equipos de tres integrantes resolverán problemas algorítmicos contra reloj.', 'rsilva@ipn.mx', '5557296000', 5, 1, 1016, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1010, 1013, 'Competencia Oficial ICPC: Resolución Algorítmica de 5 Horas', 'Jornada continua de resolución de retos en C++, Java y Python con juez en línea y entrega de globos por problema resuelto.', '2026-11-21', '09:00:00', '14:00:00', 1003, 3, 30, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 9. Evento 1014: Feria de Vinculación Laboral y Residencias Profesionales ESCOM 2026
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1014, 1005, 'Feria de Vinculación Laboral y Residencias Profesionales ESCOM 2026', 'Encuentro anual con más de 30 empresas tecnológicas de primer nivel (software, fintech, telecomunicaciones) ofreciendo residencias profesionales y plazas para recién egresados.', 'subdireccion_seis@escom.ipn.mx', '5557296000', 2, 1, 1017, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1011, 1014, 'Encuentro con Reclutadores Tecnológicos y Entrevistas Rápidas', 'Recepción de CVs, conferencias de cultura organizacional y entrevistas técnicas en el Auditorio Principal.', '2026-11-24', '10:00:00', '15:00:00', 1001, 1, 200, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 10. Evento 1015: Game Jam ESCOM: Desarrollo de Videojuegos y Motores Gráficos
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1015, 1003, 'Game Jam ESCOM: Desarrollo de Videojuegos y Motores Gráficos', 'Reto creativo de desarrollo de videojuegos en el que los participantes crean un título jugable desde cero bajo una temática sorpresa anunciada en la inauguración.', 'rsilva@ipn.mx', '5557296000', 4, 1, 1018, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1012, 1015, 'Reto de Creación de Prototipos de Videojuegos en Unity y Godot', 'Sesión intensiva de diseño de mecánicas, modelado 2D/3D, audio y programación de lógica de juego.', '2026-11-28', '10:00:00', '18:00:00', 1003, 3, 30, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 11. Evento 1016: Coloquio de Posgrado e Investigación en Cómputo Móvil y Distribuido
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1016, 1005, 'Coloquio de Posgrado e Investigación en Cómputo Móvil y Distribuido', 'Espacio de difusión científica donde estudiantes de maestría y doctorado de la Sección de Estudios de Posgrado e Investigación (SEPI ESCOM) presentan sus avances de tesis.', 'subdireccion_seis@escom.ipn.mx', '5557296000', 1, 1, 1019, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1013, 1016, 'Defensa de Tesis y Presentación de Artículos Científicos', 'Exposiciones orales y sesiones de póster técnico evaluadas por el claustro doctoral de la escuela.', '2026-12-03', '10:00:00', '14:00:00', 1002, 2, 40, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 12. Evento 1017: Taller de Desarrollo Web Fullstack y Cloud Native con Kubernetes
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1017, 1003, 'Taller de Desarrollo Web Fullstack y Cloud Native con Kubernetes', 'Taller formativo de arquitectura moderna de aplicaciones: contenedores con Docker, orquestación de clústeres locales con K3s y pipelines de CI/CD para servicios web.', 'rsilva@ipn.mx', '5557296000', 3, 1, 1020, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1014, 1017, 'Contenedorización de Microservicios y Despliegue en Clúster', 'Práctica guiada en laboratorio: empaquetado de APIs, balanceo de carga y service mesh.', '2026-12-05', '10:00:00', '14:00:00', 1004, 3, 25, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 13. Evento 1018: Semana de la Mujer en la Ingeniería y la Ciencia (STEM ESCOM)
INSERT INTO ticket_trade."Evento" ("id_evento", "id_cuenta_organizadora", "titulo", "descripcion", "correo_contacto", "telefono_contacto", "id_categoria_evento", "id_visibilidad_evento", "id_archivo_cartel", "id_estado_evento", "publicado_en", "total_senales_interes")
OVERRIDING SYSTEM VALUE VALUES
  (1018, 1005, 'Semana de la Mujer en la Ingeniería y la Ciencia (STEM ESCOM)', 'Ciclo de conferencias, paneles y talleres dedicados a visibilizar y promover la participación de mujeres en computación, desarrollo de software y puestos directivos de ingeniería.', 'subdireccion_seis@escom.ipn.mx', '5557296000', 2, 1, 1021, 2, CURRENT_TIMESTAMP, 0)
ON CONFLICT ("id_evento") DO UPDATE SET
  "titulo" = EXCLUDED."titulo",
  "descripcion" = EXCLUDED."descripcion",
  "id_categoria_evento" = EXCLUDED."id_categoria_evento",
  "id_archivo_cartel" = EXCLUDED."id_archivo_cartel",
  "id_estado_evento" = EXCLUDED."id_estado_evento";

INSERT INTO ticket_trade."Actividad" ("id_actividad", "id_evento", "nombre", "descripcion", "fecha", "hora_inicio", "hora_fin", "id_recinto", "id_tipo_acceso", "aforo_solicitado", "id_estado_actividad")
OVERRIDING SYSTEM VALUE VALUES
  (1015, 1018, 'Panel Magistral: Liderazgo Femenino en la Industria del Software y la IA', 'Mesa de diálogo con ingenieras egresadas de ESCOM que lideran equipos de ingeniería en empresas tecnológicas globales.', '2026-12-08', '11:00:00', '13:30:00', 1001, 3, 240, 1)
ON CONFLICT ("id_actividad") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "fecha" = EXCLUDED."fecha",
  "hora_inicio" = EXCLUDED."hora_inicio",
  "hora_fin" = EXCLUDED."hora_fin",
  "id_recinto" = EXCLUDED."id_recinto",
  "id_tipo_acceso" = EXCLUDED."id_tipo_acceso",
  "aforo_solicitado" = EXCLUDED."aforo_solicitado";

-- 14. Actualizar ItinerarioDia para coincidir con la fecha de la Conferencia Inaugural de Evento 1001 (TT021)
UPDATE ticket_trade."ItinerarioDia" SET
  "fecha" = '2026-11-17',
  "id_archivo" = 1010
WHERE "id_evento" = 1001;

COMMIT;
