import {opcionesTlsPostgres} from "../bd/tls";
import 'dotenv/config';
import pg from 'pg';
import {RECINTOS_INICIALES} from '../../src/datos/datosIniciales';
import {lugaresDelRecinto} from '../../src/dominio/distribucionSolicitud';
/** Catálogo físico existente, sin cuentas, expedientes, bloqueos ni eventos demo. */
export async function prepararRecintos(c:pg.PoolClient|pg.Client){
 await c.query('BEGIN');
 try{
 await c.query('SELECT pg_advisory_xact_lock(744220261107::bigint)');
 const codigos=new Set<string>();let agregados=0;
 for(const r of RECINTOS_INICIALES){
  if(codigos.has(r.codigo))continue;codigos.add(r.codigo);
  const previo=await c.query('SELECT 1 FROM ticket_trade."Recinto" WHERE nombre=$1 OR numero_salon=$2',[r.nombre,r.codigo]);
  if(previo.rowCount)continue; // No cambiar capacidades, geometría ni estado operativo existentes.
  const tipo={auditorio:'Auditorio',sala:'Sala de usos múltiples',laboratorio:'Laboratorio'}[r.tipo];
  const tipos=(await c.query('SELECT id_tipo_recinto,nombre FROM ticket_trade."TipoRecinto"')).rows;
  const t=tipos.find(t=>t.nombre.toLowerCase().startsWith(r.tipo==='sala'?'sala':tipo.toLowerCase()));if(!t)throw Error('Tipo de recinto no configurado: '+r.tipo);
  const id=(await c.query('INSERT INTO ticket_trade."Recinto"(nombre,descripcion,id_tipo_recinto,numero_salon,aforo_maximo) VALUES($1,$2,$3,$4,$5) RETURNING id_recinto::text id',[r.nombre,r.descripcion,t.id_tipo_recinto,r.codigo,r.capacidad])).rows[0].id;
  const lugares=lugaresDelRecinto(r);if(lugares.length!==r.capacidad)throw Error('La distribución no coincide con la capacidad de '+r.nombre);
  const filas = lugares.map(l=>({codigo:l.etiqueta,fila:l.fila,x:l.posicionX??l.numero,y:l.posicionY??0,bloqueado:!!l.estaBloqueado}));
  await c.query(`INSERT INTO ticket_trade."LugarRecinto"(id_recinto,codigo,fila,posicion_x,posicion_y,id_tipo_lugar)
    SELECT $1,l.codigo,l.fila,l.x,l.y,(SELECT id_tipo_lugar FROM ticket_trade."TipoLugar" WHERE nombre=$3)
    FROM jsonb_to_recordset($2::jsonb) AS l(codigo text,fila text,x numeric,y numeric)`,[id,JSON.stringify(filas),r.tipo==='laboratorio'?'Estación de trabajo':'Butaca']);
  if(r.tipo==='laboratorio')await c.query(`INSERT INTO ticket_trade."EstacionComputo"(id_lugar_recinto,id_estado_funcionamiento)
    SELECT lr.id_lugar_recinto,ef.id_estado_funcionamiento FROM jsonb_to_recordset($2::jsonb) AS l(codigo text,bloqueado boolean)
    JOIN ticket_trade."LugarRecinto" lr ON lr.id_recinto=$1 AND lr.codigo=l.codigo
    JOIN ticket_trade."EstadoFuncionamiento" ef ON ef.nombre=CASE WHEN l.bloqueado THEN 'Fuera de servicio' ELSE 'Funcional' END`,[id,JSON.stringify(filas)]);
  agregados++;
 }
 await c.query('COMMIT');return agregados;
 }catch(e){await c.query('ROLLBACK');throw e;}
}
if(process.argv[1]?.endsWith('/recintos.ts')){
 const c=new pg.Client({connectionString:process.env.DATABASE_URL,...opcionesTlsPostgres(process.env.DATABASE_URL)});try{await c.connect();console.log('Recintos agregados:',await prepararRecintos(c));}finally{await c.end();}
}
