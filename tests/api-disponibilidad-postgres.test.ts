import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { setTimeout } from 'node:timers/promises';
import type { ActividadDisponibilidad, AgendaDisponibilidad, RevisionDisponibilidad } from '../src/servicios/disponibilidadRecintos';

test('Disponibilidad PostgreSQL: dos sesiones, aprobación concurrente, bloqueos y clases informativas',
  { skip: !process.env.TT_API_PRUEBAS }, async t => {
    const { pool, conTransaccion } = await import('../backend/bd/pool');
    t.after(() => pool.end());
    const bd = (await pool.query('SELECT current_database() nombre')).rows[0].nombre;
    assert.ok(/^tt_pruebas_[a-f0-9]{16}$/.test(bd) && bd === process.env.TT_BD_DESECHABLE,
      'Esta prueba solo admite la base desechable de npm run test:postgres.');
    process.env.TT_CORREO_ACTIVO = '0';
    const { app } = await import('../backend/app');
    const servidor = http.createServer(app);
    await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
    t.after(() => new Promise<void>(r => servidor.close(() => r())));
    const base = `http://127.0.0.1:${(servidor.address() as import('node:net').AddressInfo).port}/api`;
    const pedir = (ruta: string, cookie: string, datos?: unknown) => fetch(base + ruta, {
      method: datos === undefined ? 'GET' : 'POST',
      headers: { Cookie: cookie, ...(datos === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: datos === undefined ? undefined : JSON.stringify(datos),
    });
    async function bien<T = any>(respuesta: Response, estado = 200): Promise<T> {
      assert.equal(respuesta.status, estado, await respuesta.clone().text());
      return (await respuesta.json()).datos;
    }
    async function entrar(id: number) {
      const respuesta = await pedir('/auth/login', '', { correo: `cuenta${id}@example.invalid`, password: 'Password123!' });
      const datos = await bien(respuesta);
      return { cookie: respuesta.headers.get('set-cookie')!.split(';')[0], usuario: datos.usuario };
    }
    const sub = await entrar(1002), admin = await entrar(1001), organizador = await entrar(1003);
    // Completar el expediente de ejemplo por la API, únicamente en la base guardada arriba.
    const externaInicial = await entrar(1005);
    if (!externaInicial.usuario.esVerificado) await bien(await pedir('/auth/expedientes/1002/resolucion', sub.cookie,
      { decision: 'Aprobada', motivo: 'Expediente sintético para la aceptación de disponibilidad' }));
    const externa = await entrar(1005);
    assert.equal(externa.usuario.esVerificado, true);
    assert.notEqual(organizador.cookie, externa.cookie);
    const propietarios = [organizador.cookie, externa.cookie];
    const revisores = [sub.cookie, admin.cookie];
    const fixture = await conTransaccion(async c => {
      const crearRecinto = async (tipo: string) => (await c.query(`INSERT INTO ticket_trade."Recinto"(nombre,descripcion,id_tipo_recinto,numero_salon,aforo_maximo)
        VALUES($1,'Fixture aislada de disponibilidad',(SELECT id_tipo_recinto FROM ticket_trade."TipoRecinto" WHERE nombre=$2),$1,20) RETURNING id_recinto::text id`,
        ['Recinto de aceptación ' + tipo, tipo])).rows[0].id as string;
      const sala = await crearRecinto('Sala 14'), laboratorio = await crearRecinto('Laboratorio');
      const cartel = (await c.query(`SELECT id_archivo::text id FROM ticket_trade."Archivo" WHERE clave_almacenamiento LIKE '/imagenes/eventos/%' ORDER BY id_archivo LIMIT 1`)).rows[0]?.id;
      assert.ok(cartel, 'La semilla del runner debe incluir el cartel de demostración.');
      return { sala, laboratorio, cartel };
    });
    const franja: ActividadDisponibilidad = { id:'captura', idRecinto:fixture.sala, fecha:'2099-11-17', horaInicio:'10:00', horaFin:'11:00' };
    const consultar = async (cookie: string, fecha = franja.fecha, idRecinto = fixture.sala) => {
      const respuesta = await pedir(`/organizacion/disponibilidad/agenda?fecha=${fecha}&idRecinto=${idRecinto}`, cookie);
      assert.match(respuesta.headers.get('cache-control') || '', /no-store/);
      return bien<AgendaDisponibilidad>(respuesta);
    };
    const revisar = async (cookie: string, actividades = [franja], contexto = {}) => bien<RevisionDisponibilidad>(await pedir('/organizacion/disponibilidad/revision', cookie, { actividades, ...contexto }));
    const datosSolicitud = (titulo: string, actividades = [franja]) => ({
      tituloEvento:titulo,descripcionEvento:'Propuesta sintética de aceptación de disponibilidad',categoria:'Conferencia',
      visibilidad:'privado',correoContacto:'agenda@example.invalid',telefonoContacto:'5555555555',idArchivoCartel:fixture.cartel,enviar:true,
      fechasSolicitadas:actividades.map(a=>({...a,nombreActividad:titulo,modalidadAsistencia:'registro',asistenciaEstimada:10})),
    });
    const enviar = async (cookie: string, titulo: string, actividades = [franja]) => bien<{id:string;idEvento:string;disponibilidad:RevisionDisponibilidad}>(await pedir('/organizacion/solicitudes', cookie, datosSolicitud(titulo, actividades)),201);
    let solicitudes: Awaited<ReturnType<typeof enviar>>[] = [];
    let ganadora = -1;

    await t.test('dos titulares consultan y envían; una propuesta pendiente no reserva el recinto', async () => {
      const previas = await Promise.all(propietarios.map(c=>revisar(c)));
      assert.ok(previas.every(r=>r.actividades[0].disponible));
      solicitudes = await Promise.all(propietarios.map((c,i)=>enviar(c,'Propuesta privada de aceptación '+i)));
      assert.ok(solicitudes.every(s=>s.disponibilidad.actividades[0].disponible));
      const agendas = await Promise.all(propietarios.map(c=>consultar(c)));
      assert.ok(agendas.every(a=>a.recintos[0].ocupaciones.length===0));
      t.diagnostic('Dos sesiones distintas: consultas libres, dos envíos HTTP 201 y cero ocupaciones por solicitudes pendientes.');
    });

    await t.test('dos resoluciones en competencia producen un éxito y un conflicto autoritativo', async () => {
      // Mantener la exclusión unos instantes permite comprobar que las dos
      // solicitudes realmente alcanzan el bloqueo en conexiones diferentes.
      const puerta = await pool.connect();
      let respuestas: Promise<Response>[] = [], contendientes = 0;
      try {
        await puerta.query('BEGIN');
        await puerta.query('SELECT pg_advisory_xact_lock(744220261107::bigint)');
        respuestas = solicitudes.map((s,i)=>pedir(`/organizacion/solicitudes/${s.id}/resolucion`, revisores[i], {decision:'Aprobada',version:1}));
        const limite = Date.now()+5000;
        do {
          contendientes = (await pool.query(`SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory' AND pid<>pg_backend_pid()`)).rows[0].n;
          if (contendientes>=2) break;
          await setTimeout(20);
        } while(Date.now()<limite);
      } finally { await puerta.query('ROLLBACK'); puerta.release(); }
      const resultados = await Promise.all(respuestas);
      assert.ok(contendientes>=2,'Ambas resoluciones deben competir antes de liberar la exclusión.');
      assert.deepEqual(resultados.map(r=>r.status).sort(),[200,409]);
      ganadora = resultados.findIndex(r=>r.status===200);
      const conflicto = await resultados[1-ganadora].json();
      assert.match(conflicto.error.mensaje,/ya no está disponible/,'El rechazo procede de la revisión de agenda, no de una excepción SQL genérica.');
      const estados = (await pool.query(`SELECT e.id_evento::text id,ee.nombre evento,es.nombre solicitud,
        (SELECT count(*)::int FROM ticket_trade."ResolucionSolicitud" r WHERE r.id_solicitud_evento=s.id_solicitud_evento) resoluciones
        FROM ticket_trade."SolicitudEvento" s JOIN ticket_trade."Evento" e USING(id_evento) JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento)
        JOIN ticket_trade."EstadoSolicitudEvento" es USING(id_estado_solicitud_evento) WHERE e.id_evento=ANY($1::bigint[])`,[solicitudes.map(s=>s.idEvento)])).rows;
      assert.equal(estados.filter(s=>s.evento==='Publicado'&&s.solicitud==='Aprobada'&&s.resoluciones===1).length,1);
      assert.equal(estados.filter(s=>s.evento==='Borrador'&&s.solicitud==='En revisión'&&s.resoluciones===0).length,1);
      const agendas = await Promise.all(propietarios.map(c=>consultar(c)));
      assert.deepEqual(agendas[0].recintos[0].ocupaciones.map(o=>o.id),agendas[1].recintos[0].ocupaciones.map(o=>o.id));
      assert.equal(agendas[1-ganadora].recintos[0].ocupaciones[0].titulo,'Actividad autorizada','El otro titular no recibe el título privado.');
      assert.ok((await consultar(revisores[0])).recintos[0].ocupaciones[0].titulo.startsWith('Propuesta privada'));
      t.diagnostic(JSON.stringify({contendientes,estadosHTTP:resultados.map(r=>r.status),publicados:1,pendientes:1,resolucionesRechazadasGuardadas:0}));
    });

    await t.test('ocupación parcial y margen exacto conservan horas libres para ambas sesiones', async () => {
      for (const cookie of propietarios) {
        const consulta = await consultar(cookie);
        assert.deepEqual(consulta.recintos[0].franjasLibres,[{horaInicio:'00:00',horaFin:'09:30'},{horaInicio:'11:30',horaFin:'21:00'}]);
        const actividades = [
          {...franja,horaInicio:'09:00',horaFin:'09:30'}, {...franja,horaInicio:'09:01',horaFin:'09:31'},
          {...franja,horaInicio:'11:29',horaFin:'12:00'}, {...franja,horaInicio:'11:30',horaFin:'12:00'},
        ];
        // Separar consultas: son alternativas, no cuatro actividades simultáneas.
        const alternativas = await Promise.all(actividades.map(a=>revisar(cookie,[a])));
        assert.deepEqual(alternativas.map(r=>r.actividades[0].disponible),[true,false,false,true]);
      }
    });

    await t.test('una autorización conserva la ocupación aunque el evento aún no esté publicado', async () => {
      const id=solicitudes[ganadora].idEvento;
      await pool.query(`UPDATE ticket_trade."Evento" SET id_estado_evento=(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Borrador'),publicado_en=NULL WHERE id_evento=$1`,[id]);
      try {
        assert.equal((await consultar(propietarios[1-ganadora])).recintos[0].ocupaciones.length,1);
        assert.equal((await revisar(propietarios[1-ganadora])).actividades[0].disponible,false);
      } finally {
        await pool.query(`UPDATE ticket_trade."Evento" SET id_estado_evento=(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Publicado'),publicado_en=CURRENT_TIMESTAMP WHERE id_evento=$1`,[id]);
      }
    });

    await t.test('el envío repite la lectura y rechaza cruces propios sin escrituras parciales', async () => {
      const posterior = await enviar(propietarios[1-ganadora],'Envío posterior a la ocupación');
      assert.equal(posterior.disponibilidad.actividades[0].disponible,false,'El envío ordinario advierte la agenda actual y conserva la revisión.');
      const antes = (await pool.query('SELECT count(*)::int n FROM ticket_trade."Evento"')).rows[0].n;
      const respuesta = await pedir('/organizacion/solicitudes',propietarios[0],datosSolicitud('Cruce interno inválido',[franja,{...franja,horaInicio:'10:30',horaFin:'11:30'}]));
      assert.equal(respuesta.status,422,await respuesta.clone().text());
      assert.match((await respuesta.json()).error.mensaje,/misma propuesta/);
      assert.equal((await pool.query('SELECT count(*)::int n FROM ticket_trade."Evento"')).rows[0].n,antes);
      const exclusion = await pedir('/organizacion/disponibilidad/revision',propietarios[1-ganadora],{actividades:[franja],idSolicitud:solicitudes[ganadora].id});
      assert.equal(exclusion.status,403,'La otra sesión no puede excluir una solicitud privada ajena.');
    });

    await t.test('bloqueo temporal: límites efectivos, medianoche, inicio futuro y previsión', async () => {
      const propuestaLibre=await enviar(propietarios[0],'Propuesta anterior al bloqueo',[{...franja,fecha:'2099-11-19'}]);
      assert.equal(propuestaLibre.disponibilidad.actividades[0].disponible,true);
      await conTransaccion(async c => {
        for (const b of [
          ['2099-11-19T10:00:00-06:00','2099-11-19T10:30:00-06:00','2099-11-19T11:00:00-06:00'],
          ['2099-11-20T22:00:00-06:00','2099-11-21T01:00:00-06:00','2099-11-21T01:00:00-06:00'],
          ['2099-11-23T10:00:00-06:00','2099-11-23T11:00:00-06:00',null],
        ]) await c.query(`INSERT INTO ticket_trade."BloqueoRecinto"(id_recinto,id_tipo_bloqueo_recinto,inicio,fin_previsto,finalizado_en,motivo,id_cuenta_responsable)
          VALUES($1,(SELECT id_tipo_bloqueo_recinto FROM ticket_trade."TipoBloqueoRecinto" WHERE nombre='Mantenimiento'),$2,$3,$4,'Fixture temporal de aceptación',1001)`,[fixture.sala,...b]);
      });
      for(const cookie of propietarios){
        const a=(await consultar(cookie,'2099-11-19')).recintos[0];
        assert.deepEqual(a.ocupaciones.map(o=>[o.horaInicio,o.horaFin]),[['10:00','11:00']]);
        const alternativas=[['09:30','10:00'],['10:30','11:00'],['11:00','11:30']];
        assert.deepEqual((await Promise.all(alternativas.map(([horaInicio,horaFin])=>revisar(cookie,[{...franja,fecha:'2099-11-19',horaInicio,horaFin}])))).map(r=>r.actividades[0].disponible),[true,false,true]);
        assert.deepEqual((await consultar(cookie,'2099-11-20')).recintos[0].ocupaciones.map(o=>[o.horaInicio,o.horaFin]),[['22:00','24:00']]);
        assert.deepEqual((await consultar(cookie,'2099-11-21')).recintos[0].ocupaciones.map(o=>[o.horaInicio,o.horaFin]),[['00:00','01:00']]);
        assert.equal((await consultar(cookie,'2099-11-22')).recintos[0].ocupaciones.length,0);
        const vigente=(await consultar(cookie,'2099-11-23')).recintos[0].ocupaciones[0];
        assert.ok(vigente.finPrevisto);assert.equal(vigente.horaFin,'24:00');
      }
      const rechazo=await pedir(`/organizacion/solicitudes/${propuestaLibre.id}/resolucion`,sub.cookie,{decision:'Aprobada',version:1});
      assert.equal(rechazo.status,409,await rechazo.clone().text());
      assert.match((await rechazo.json()).error.mensaje,/ya no está disponible/,'La aprobación lee un bloqueo agregado después del envío.');
    });

    await t.test('una clase de laboratorio aparece como informativa y permite autorizar la actividad', async () => {
      const fecha='2099-11-24';
      await conTransaccion(async c => {
        const id=(await c.query(`INSERT INTO ticket_trade."ActividadInterna"(id_recinto,inicio_vigencia,fin_vigencia,hora_inicio,hora_fin) VALUES($1,$2,$2,'10:00','12:00') RETURNING id_actividad_interna`,[fixture.laboratorio,fecha])).rows[0].id_actividad_interna;
        await c.query(`INSERT INTO ticket_trade."DiaActividadInterna"(id_actividad_interna,dia_semana) VALUES($1,EXTRACT(ISODOW FROM $2::date))`,[id,fecha]);
      });
      const clase={...franja,idRecinto:fixture.laboratorio,fecha,horaInicio:'10:30',horaFin:'11:30'};
      for(const cookie of propietarios){
        const a=(await consultar(cookie,fecha,fixture.laboratorio)).recintos[0];
        assert.equal(a.ocupaciones[0].informativa,true);assert.equal(a.ocupaciones[0].tipo,'clase');
        assert.deepEqual(a.franjasLibres,[{horaInicio:'00:00',horaFin:'21:00'}]);
        const r=(await revisar(cookie,[clase])).actividades[0];assert.equal(r.disponible,true);assert.equal(r.advertencias.length,1);
      }
      const s=await enviar(propietarios[0],'Actividad que coincide con clase informativa',[clase]);
      await bien(await pedir(`/organizacion/solicitudes/${s.id}/resolucion`,sub.cookie,{decision:'Aprobada',version:1}));
      const agenda=(await consultar(sub.cookie,fecha,fixture.laboratorio)).recintos[0];
      assert.equal(agenda.ocupaciones.filter(o=>o.tipo==='clase').length,1,'Autorizar no borra el horario académico.');
      assert.equal(agenda.ocupaciones.filter(o=>o.tipo==='evento').length,1);
    });
  });
