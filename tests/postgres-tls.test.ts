import test from 'node:test';
import assert from 'node:assert/strict';
import {opcionesTlsPostgres} from '../backend/bd/tls';
test('La CA de Supabase no cambia una conexión PostgreSQL local ni permite reemplazar su validación por URL',()=>{
 const previo=process.env.TT_POSTGRES_CA_FILE;
 try{
 process.env.TT_POSTGRES_CA_FILE='/ruta/privada/no-existe.crt';
 assert.deepEqual(opcionesTlsPostgres('postgresql://usuario@localhost:55440/pruebas'),{});
 assert.throws(()=>opcionesTlsPostgres('postgresql://postgres@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=no-verify'),/sin parámetros SSL/);
 delete process.env.TT_POSTGRES_CA_FILE;
 assert.deepEqual(opcionesTlsPostgres('postgresql://usuario@localhost/pruebas'),{});
 }finally{if(previo===undefined)delete process.env.TT_POSTGRES_CA_FILE;else process.env.TT_POSTGRES_CA_FILE=previo;}
});
