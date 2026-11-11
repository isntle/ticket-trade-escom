-- Solo para la base demo académica. Conserva IDs, reservas, categorías y archivos.
DO $$ BEGIN
  IF (SELECT count(*) FROM ticket_trade."Cuenta" WHERE id_cuenta BETWEEN 1001 AND 1006 AND correo=('cuenta'||id_cuenta||'@example.invalid')) <> 6 THEN
    RAISE EXCEPTION 'Esta corrección solo admite la base demo académica';
  END IF;
END $$;

-- La semilla anterior distribuía el auditorio en 21 filas de 12. El mapa
-- original usa 11 filas A-K: 14, 21 y nueve filas de 23 (242 lugares).
WITH filas(fila,cantidad,orden) AS (
  VALUES ('A',14,1),('B',21,2),('C',23,3),('D',23,4),('E',23,5),
    ('F',23,6),('G',23,7),('H',23,8),('I',23,9),('J',23,10),('K',23,11)
), posiciones AS (
  SELECT fila,orden,n,row_number() OVER(ORDER BY orden,n) posicion
  FROM filas CROSS JOIN LATERAL generate_series(1,cantidad) n
), lugares AS (
  SELECT id_lugar_recinto,row_number() OVER(ORDER BY id_lugar_recinto) posicion
  FROM ticket_trade."LugarRecinto" WHERE id_recinto=1001
    AND (codigo LIKE 'D-%' OR id_lugar_recinto IN (1001,1002))
)
UPDATE ticket_trade."LugarRecinto" l SET fila=p.fila,posicion_x=p.n,posicion_y=p.orden
FROM lugares x JOIN posiciones p USING(posicion)
WHERE l.id_lugar_recinto=x.id_lugar_recinto AND (SELECT count(*) FROM lugares)=242;

WITH lugares AS (
  SELECT id_lugar_recinto,row_number() OVER(ORDER BY id_lugar_recinto)-1 n
  FROM ticket_trade."LugarRecinto" WHERE id_recinto=1002 AND codigo LIKE 'D-%'
)
UPDATE ticket_trade."LugarRecinto" l SET fila=chr(65+(x.n/10)::int),posicion_x=(x.n%10)+1,posicion_y=(x.n/10)+1
FROM lugares x WHERE l.id_lugar_recinto=x.id_lugar_recinto;

-- Predominan los eventos cotidianos de entrada libre. No requieren apartado,
-- butaca ni boleto; el aforo físico del recinto se conserva en el modelo.
WITH normales(id,titulo,descripcion,fecha,cartel) AS (VALUES
 (60001,'Charla: cómo preparar tu currículum','Consejos y ejemplos para preparar un currículum y buscar la primera experiencia profesional.',date '2026-11-11',1017),
 (60002,'Introducción a Python','Sesión abierta de introducción a Python con ejemplos sencillos. Puedes llevar tu computadora.',date '2026-11-12',1020),
 (60003,'Plática sobre servicio social','Orientación para estudiantes sobre opciones de servicio social y pasos para comenzar.',date '2026-11-13',1011),
 (60004,'Conoce los proyectos terminales','Estudiantes comparten sus proyectos y responden preguntas de la comunidad.',date '2026-11-14',1011),
 (60005,'Charla: inteligencia artificial en la vida diaria','Ejemplos cotidianos de inteligencia artificial y espacio para preguntas.',date '2026-11-15',1010),
 (60006,'Orientación para prácticas profesionales','Sesión informativa sobre prácticas, entrevistas y búsqueda de oportunidades.',date '2026-11-16',1017),
 (60007,'Plática de seguridad en internet','Recomendaciones para proteger cuentas, reconocer fraudes y navegar con cuidado.',date '2026-11-18',1015),
 (60008,'Encuentro con egresados de ESCOM','Egresados comparten su experiencia laboral y conversan con estudiantes.',date '2026-11-19',1017),
 (60009,'Introducción al desarrollo web','Charla abierta sobre páginas web y los primeros pasos para aprender a desarrollarlas.',date '2026-11-21',1020),
 (60010,'Charla sobre ciencia de datos','Una introducción a los datos, su análisis y sus aplicaciones en proyectos escolares.',date '2026-11-22',1019),
 (60011,'Introducción a la robótica','Charla abierta sobre robots, sensores y proyectos para comenzar a aprender robótica.',date '2026-11-26',1014)
)
INSERT INTO ticket_trade."Evento"(id_evento,id_cuenta_organizadora,titulo,descripcion,correo_contacto,telefono_contacto,id_categoria_evento,id_visibilidad_evento,id_archivo_cartel,id_estado_evento,publicado_en)
OVERRIDING SYSTEM VALUE SELECT id,1003,titulo,descripcion,'rsilva@ipn.mx','5557296000',2,1,cartel,2,CURRENT_TIMESTAMP FROM normales
ON CONFLICT(id_evento) DO NOTHING;

INSERT INTO ticket_trade."Actividad"(id_actividad,id_evento,nombre,descripcion,fecha,hora_inicio,hora_fin,id_recinto,id_tipo_acceso,aforo_solicitado,id_estado_actividad)
OVERRIDING SYSTEM VALUE
SELECT e.id_evento,e.id_evento,e.titulo,e.descripcion,
  (ARRAY[date '2026-11-11',date '2026-11-12',date '2026-11-13',date '2026-11-14',date '2026-11-15',date '2026-11-16',date '2026-11-18',date '2026-11-19',date '2026-11-21',date '2026-11-22',date '2026-11-26'])[e.id_evento::int-60000],
  time '11:00',time '12:00',1001,1,242,1
FROM ticket_trade."Evento" e WHERE e.id_evento BETWEEN 60001 AND 60011 AND e.id_cuenta_organizadora=1003
ON CONFLICT(id_actividad) DO UPDATE SET fecha=EXCLUDED.fecha;
