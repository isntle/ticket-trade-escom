import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { RevisionDisponibilidadSolicitud } from '../src/servicios/disponibilidadRecintos';

test('Sprint 9 dictamen: bloqueo posterior, alternativas autorizadas y devolución persistida', {skip:!process.env.TT_API_PRUEBAS}, async t => {
  const { pool, conTransaccion } = await import('../backend/bd/pool');
  t.after(() => pool.end());
  const bd = (await pool.query('SELECT current_database() nombre')).rows[0].nombre;
  assert.ok(/^tt_pruebas_[a-f0-9]{16}$/.test(bd) && bd === process.env.TT_BD_DESECHABLE);
  const { app } = await import('../backend/app');
  const servidor = http.createServer(app);
  await new Promise<void>(r => servidor.listen(0,'127.0.0.1',r));
  t.after(() => new Promise<void>(r => servidor.close(() => r())));
  const base = `http://127.0.0.1:${(servidor.address() as any).port}/api`;
  const pedir = (ruta:string,cookie='',datos?:unknown) => fetch(base+ruta,{method:datos===undefined?'GET':'POST',headers:{Cookie:cookie,Connection:'close',...(datos===undefined?{}:{'Content-Type':'application/json'})},body:datos===undefined?undefined:JSON.stringify(datos)});
  const bien = async (r:Response,estado=200) => {assert.equal(r.status,estado,await r.clone().text());return (await r.json()).datos;};
  const entrar = async (id:number) => {const r=await pedir('/auth/login','',{correo:`cuenta${id}@example.invalid`,password:'Password123!'});await bien(r);return r.headers.get('set-cookie')!.split(';')[0];};
  const sub=await entrar(1002), admin=await entrar(1001), titular=await entrar(1003), ajeno=await entrar(1004);
  const recintos=await conTransaccion(async c=>{
    const ids:string[]=[];
    // Aforo sintético alto para que las opciones no dependan de otros recintos de la semilla.
    for (const [nombre,tipo,capacidad] of [['Sala dictamen','Sala 14',10000],['Laboratorio alternativo','Laboratorio',10000],['Sala insuficiente','Sala 14',5]] as const)
      ids.push((await c.query(`INSERT INTO ticket_trade."Recinto"(nombre,descripcion,id_tipo_recinto,numero_salon,aforo_maximo) VALUES($1,'Aceptación aislada de dictamen',(SELECT id_tipo_recinto FROM ticket_trade."TipoRecinto" WHERE nombre=$2),$1,$3) RETURNING id_recinto::text id`,[nombre,tipo,capacidad])).rows[0].id);
    return ids;
  });
  const cartel=(await pool.query(`SELECT id_archivo::text id FROM ticket_trade."Archivo" WHERE clave_almacenamiento LIKE '/imagenes/eventos/%' LIMIT 1`)).rows[0].id;
  const fecha='2099-12-07';
  const s=await bien(await pedir('/organizacion/solicitudes',titular,{tituloEvento:'Dictamen de disponibilidad',descripcionEvento:'Prueba de alternativas y corrección',categoria:'Conferencia',visibilidad:'privado',correoContacto:'dictamen@example.invalid',telefonoContacto:'5555555555',idArchivoCartel:cartel,enviar:true,
    fechasSolicitadas:[{idRecinto:recintos[0],fecha,horaInicio:'10:00',horaFin:'11:00',nombreActividad:'Conferencia de sistemas',asistenciaEstimada:10000,modalidadAsistencia:'registro'}]}),201);
  const consultar = async (cookie=sub):Promise<RevisionDisponibilidadSolicitud> => {const r=await pedir(`/organizacion/solicitudes/${s.id}/disponibilidad`,cookie);assert.match(r.headers.get('cache-control')||'',/no-store/);return bien(r);};

  await t.test('se lee la actividad persistida y se protege la solicitud privada',async()=>{
    assert.equal((await pedir(`/organizacion/solicitudes/${s.id}/disponibilidad`)).status,401);
    assert.equal((await pedir(`/organizacion/solicitudes/${s.id}/disponibilidad`,ajeno)).status,404);
    const r=await consultar(titular);assert.equal(r.actividades[0].disponible,true);assert.equal(r.actividades[0].nombreActividad,'Conferencia de sistemas');assert.equal(r.versionSolicitud,1);
  });
  await t.test('otra sesión guarda un bloqueo posterior al envío; el dictamen devuelve conflicto y opciones',async()=>{
    const propuesta={titulo:'Mantenimiento posterior',motivo:'Bloqueo de aceptación de dictamen',tipo:'Mantenimiento',idRecinto:recintos[0],fechaInicio:fecha,horaInicio:'10:00',fechaFin:fecha,horaFin:'11:00',esIndefinido:false};
    const revision=await bien(await pedir('/organizacion/bloqueos/revision',admin,{propuesta}));
    await bien(await pedir('/organizacion/bloqueos',admin,{propuesta,firma:revision.firma}),201);
    const r=await consultar();const a=r.actividades[0];
    assert.equal(a.disponible,false);assert.equal(a.conflictos[0].fuente,'bloqueo');assert.equal(a.conflictos[0].posteriorAlEnvio,true);
    assert.ok(a.alternativas.some(o=>o.idRecinto===recintos[1]));
    assert.ok(a.alternativas.every(o=>o.idRecinto!==recintos[2] && (o.idRecinto!==recintos[0] || o.horaFin<='10:00')));
    // Cada alternativa es independiente, con toda la solicitud y las reglas vigentes.
    for(const o of a.alternativas){const revision=await bien(await pedir('/organizacion/disponibilidad/revision',sub,{actividades:[o],idSolicitud:s.id}));assert.equal(revision.actividades[0].disponible,true);}
    const rechazo=await pedir(`/organizacion/solicitudes/${s.id}/resolucion`,sub,{decision:'Aprobada',version:1});
    assert.equal(rechazo.status,409);assert.match((await rechazo.json()).error.mensaje,/ya no está disponible/);
    const estado=(await pool.query(`SELECT es.nombre FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE s.id_solicitud_evento=$1`,[s.id])).rows[0].nombre;
    assert.equal(estado,'En revisión');
    t.diagnostic('Sesión organizador envía HTTP 201; sesión administrador guarda bloqueo HTTP 201; sesión Subdirección detecta cambio posterior y recibe rechazo HTTP 409 al autorizar.');
  });
  await t.test('las clases informativas permanecen visibles en las alternativas',async()=>{
    await conTransaccion(async c=>{const id=(await c.query(`INSERT INTO ticket_trade."ActividadInterna"(id_recinto,inicio_vigencia,fin_vigencia,hora_inicio,hora_fin) VALUES($1,$2,$2,'07:00','21:00') RETURNING id_actividad_interna`,[recintos[1],fecha])).rows[0].id_actividad_interna;await c.query(`INSERT INTO ticket_trade."DiaActividadInterna"(id_actividad_interna,dia_semana) VALUES($1,EXTRACT(ISODOW FROM $2::date))`,[id,fecha]);});
    const r=await consultar();assert.ok(r.actividades[0].alternativas.some(o=>o.idRecinto===recintos[1]&&o.advertencias.some(c=>c.informativa)));
  });
  await t.test('pedir corrección guarda observaciones y conserva la actividad original',async()=>{
    const motivo='Conferencia de sistemas: bloqueo posterior al envío en Sala dictamen. Propón otro recinto u horario; las alternativas no reservan espacio.';
    await bien(await pedir(`/organizacion/solicitudes/${s.id}/resolucion`,sub,{decision:'Devuelta',version:1,mensaje:motivo}));
    const estado=await bien(await pedir('/estado',titular));const solicitud=estado.listaSolicitudes.find((r:any)=>r.id===s.id);
    assert.equal(solicitud.estado,'requiere_correccion');assert.equal(solicitud.observacionesCorreccion,motivo);assert.ok(solicitud.fechaLimiteCorreccion);
    const r=await consultar(titular);assert.equal(r.actividades[0].idRecinto,recintos[0]);assert.equal(r.actividades[0].horaInicio,'10:00');assert.equal(r.actividades[0].disponible,false);
    assert.equal((await pedir(`/organizacion/solicitudes/${s.id}/resolucion`,sub,{decision:'Aprobada',version:1})).status,409);
    t.diagnostic('Devolución HTTP 200 persistida, observaciones visibles al titular y fecha límite de corrección; seleccionar/sugerir opciones no reprogramó la actividad.');
  });
  // El runner comparte su BD desechable entre archivos: no dejar estas capacidades
  // artificiales como el recinto mayor que consumen las fixtures existentes.
  await t.test('una actividad de entrada libre no recibe laboratorios como alternativas', async () => {
    await pool.query(`UPDATE ticket_trade."Actividad" SET id_tipo_acceso=(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre='Entrada libre') WHERE id_evento=$1`, [s.idEvento]);
    const r = await consultar();
    assert.ok(r.actividades[0].alternativas.length > 0);
    assert.ok(r.actividades[0].alternativas.every(o => o.idRecinto !== recintos[1]));
  });
  await conTransaccion(async c => {
    await c.query('UPDATE ticket_trade."Actividad" SET aforo_solicitado=10 WHERE id_evento=$1', [s.idEvento]);
    await c.query('UPDATE ticket_trade."Recinto" SET aforo_maximo=20 WHERE id_recinto=ANY($1::bigint[])', [recintos.slice(0,2)]);
  });
});
