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
