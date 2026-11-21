import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { vencimientoRevision } from '../src/dominio/calendarioRevision';

test('Sprint 9 PostgreSQL: calendario persistente, plazos anteriores, roles y bloqueos atómicos', { skip: !process.env.TT_API_PRUEBAS }, async t => {
  const { pool, conTransaccion } = await import('../backend/bd/pool');
  t.after(() => pool.end());
  const bd = (await pool.query('SELECT current_database() nombre')).rows[0].nombre;
  assert.ok(/^tt_pruebas_[a-f0-9]{16}$/.test(bd) && bd === process.env.TT_BD_DESECHABLE, 'Solo se admite la base desechable del runner.');
  process.env.TT_CORREO_ACTIVO = '0';
  const { app } = await import('../backend/app');
  const servidor = http.createServer(app);
  await new Promise<void>(r => servidor.listen(0, '127.0.0.1', r));
  t.after(() => new Promise<void>(r => servidor.close(() => r())));
  const base = `http://127.0.0.1:${(servidor.address() as any).port}/api`;
  const pedir = (ruta: string, cookie = '', datos?: unknown, metodo = datos === undefined ? 'GET' : 'POST') => fetch(base + ruta, {
    method: metodo, headers: { Cookie: cookie, ...(datos === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: datos === undefined ? undefined : JSON.stringify(datos),
  });
  const bien = async (r: Response, estado = 200) => { assert.equal(r.status, estado, await r.clone().text()); return (await r.json()).datos; };
  const entrar = async (id: number | string) => {
    const r = await pedir('/auth/login', '', { correo: typeof id === 'number' ? `cuenta${id}@example.invalid` : id, password: 'Password123!' });
    const datos = await bien(r); return { cookie: r.headers.get('set-cookie')!.split(';')[0], usuario: datos.usuario };
  };
  const admin = await entrar(1001), sub = await entrar(1002), organizador = await entrar(1003), asistente = await entrar(1005);
  const recintos = await conTransaccion(async c => {
    const ids: string[] = [];
    for (const [nombre, tipo] of [['Plazos Sprint 9', 'Sala 14'], ['Eventos Sprint 9', 'Sala 14'], ['Mantenimiento Sprint 9', 'Sala 14'], ['Clases Sprint 9', 'Laboratorio'], ['Concurrencia Sprint 9', 'Sala 14'], ['Fallo Sprint 9', 'Sala 14'], ['Entradas Sprint 9', 'Sala 14'], ['Fallo múltiple Sprint 9', 'Sala 14']]) {
      ids.push((await c.query(`INSERT INTO ticket_trade."Recinto"(nombre,descripcion,id_tipo_recinto,numero_salon,aforo_maximo)
        VALUES($1,'Recinto sintético del sprint 9',(SELECT id_tipo_recinto FROM ticket_trade."TipoRecinto" WHERE nombre=$2),$1,20) RETURNING id_recinto::text id`, [nombre, tipo])).rows[0].id);
    }
    return ids;
  });
  const cartel = (await pool.query(`SELECT id_archivo::text id FROM ticket_trade."Archivo" WHERE clave_almacenamiento LIKE '/imagenes/eventos/%' LIMIT 1`)).rows[0].id;
  const solicitud = async (idRecinto = recintos[0], fecha = '2099-11-17') => bien(await pedir('/organizacion/solicitudes', organizador.cookie, {
    tituloEvento: 'Solicitud sintética Sprint 9', descripcionEvento: 'Aceptación aislada de calendario y bloqueos', categoria: 'Conferencia',
    visibilidad: 'publico', correoContacto: 'agenda.sprint9@example.invalid', telefonoContacto: '5555555555', idArchivoCartel: cartel, enviar: true,
    fechasSolicitadas: [{ idRecinto, fecha, horaInicio: '10:00', horaFin: '11:00', asistenciaEstimada: 10, modalidadAsistencia: 'registro' }],
  }), 201);
  const plazo = async (id: string) => (await pool.query(`SELECT s.inicio_revision,p.limite_exclusivo FROM ticket_trade."SolicitudEvento" s
    JOIN infra.plazo_revision p ON p.id_solicitud_evento=s.id_solicitud_evento AND p.inicio_revision=s.inicio_revision WHERE s.id_solicitud_evento=$1`, [id])).rows[0];
  const calendarioInicial = await bien(await pedir('/organizacion/calendario', admin.cookie));
  const propuesta = (idRecinto: string, tipo = 'Mantenimiento', extra = {}) => ({ titulo: 'Bloqueo sintético', motivo: 'Aceptación Sprint 9', tipo,
    idRecinto, fechaInicio: '2099-11-17', horaInicio: '09:00', fechaFin: '2099-11-17', horaFin: '12:00', esIndefinido: false, ...extra });
  const revision = async (p: any, cookie = admin.cookie, id?: string) => bien(await pedir('/organizacion/bloqueos/revision', cookie, { propuesta: p, id }));
  const guardar = async (p: any, cookie = admin.cookie) => {
    const r = await revision(p, cookie);
    return bien(await pedir('/organizacion/bloqueos', cookie, { propuesta: p, firma: r.firma }), 201);
  };
  const agenda = async (id: string, fecha = '2099-11-17') => (await bien(await pedir(`/organizacion/disponibilidad/agenda?fecha=${fecha}&idRecinto=${id}`, organizador.cookie))).recintos[0];

  await t.test('guardar calendario conserva plazos anteriores y las solicitudes nuevas usan la configuración guardada', async () => {
    const antigua = await solicitud(); const antes = await plazo(antigua.id);
    // Simular una solicitud anterior a esta extensión, sin tocar sus datos de negocio.
    await pool.query('DELETE FROM infra.plazo_revision WHERE id_solicitud_evento=$1', [antigua.id]);
    const guardado = await bien(await pedir('/organizacion/calendario', admin.cookie, { diasLaborables: [6], diasInhabiles: ['2099-11-21'], version: calendarioInicial.version, responsable: 'Suplantado' }, 'PUT'));
    assert.equal(guardado.exito, true); assert.deepEqual(guardado.calendario.diasLaborables, [6]);
    assert.equal(guardado.calendario.responsable, admin.usuario.nombre);
    const despues = await plazo(antigua.id);
    assert.equal(+despues.limite_exclusivo, +antes.limite_exclusivo); assert.equal(+despues.inicio_revision, +antes.inicio_revision);
    const nueva = await solicitud(recintos[0], '2099-11-18'), nuevoPlazo = await plazo(nueva.id);
    assert.equal(+nuevoPlazo.limite_exclusivo, Date.parse(vencimientoRevision(nuevoPlazo.inicio_revision.toISOString(), guardado.calendario)) + 1000);
    assert.notEqual(+nuevoPlazo.limite_exclusivo, +antes.limite_exclusivo);
    const estado = await bien(await pedir('/estado', organizador.cookie));
    assert.equal(estado.listaSolicitudes.find((s: any) => s.id === antigua.id).fechaVencimientoRevision, antes.limite_exclusivo.toISOString());
    assert.deepEqual((await bien(await pedir('/organizacion/calendario', sub.cookie))).diasInhabiles, ['2099-11-21']);
    t.diagnostic(JSON.stringify({ plazoAnteriorConservado: true, nuevasSolicitudesUsanCalendarioGuardado: true }));
  });

  await t.test('calendario valida rol, fechas reales, versión y dos escrituras competidoras', async () => {
    const actual = await bien(await pedir('/organizacion/calendario', admin.cookie));
    assert.equal((await pedir('/organizacion/calendario')).status, 401);
    for (const cookie of [sub.cookie, organizador.cookie]) assert.equal((await pedir('/organizacion/calendario', cookie, actual, 'PUT')).status, 403);
    for (const cambio of [{ diasLaborables: [] }, { diasInhabiles: ['2030-02-30'] }, { diasLaborables: [7] }])
      assert.equal((await pedir('/organizacion/calendario', admin.cookie, { ...actual, ...cambio }, 'PUT')).status, 422);
    const resultados = await Promise.all([1, 2].map(() => pedir('/organizacion/calendario', admin.cookie, actual, 'PUT')));
    assert.deepEqual(resultados.map(r => r.status).sort(), [200, 409]);
    t.diagnostic(JSON.stringify({ calendarioConcurrente: resultados.map(r => r.status) }));
  });

  await t.test('bloqueos persistidos se modifican y cierran con versión e historial; cancelar antes del inicio deja la agenda libre', async () => {
    const p = propuesta(recintos[2]);
    for (const [cookie, tipo] of [[admin.cookie, 'Institucional'], [sub.cookie, 'Mantenimiento'], [organizador.cookie, 'Fuera de servicio']])
      assert.equal((await pedir('/organizacion/bloqueos/revision', cookie, { propuesta: { ...p, tipo } })).status, 403);
    const g = await guardar(p);
    let b = (await bien(await pedir('/estado', admin.cookie))).listaBloqueos.find((b: any) => b.id === g.id);
    assert.equal(b.titulo, p.titulo); assert.equal(b.creadoPor, admin.usuario.nombre); assert.equal(b.version, 1);
    assert.equal((await agenda(recintos[2])).ocupaciones.filter((o: any) => o.tipo === 'bloqueo').length, 1);
    assert.equal((await agenda(recintos[2], '2099-11-18')).ocupaciones.filter((o: any) => o.tipo === 'bloqueo').length, 1, 'Fin previsto no es cierre efectivo.');
    const cambio = { ...p, titulo: 'Mantenimiento actualizado', horaInicio: '08:00' }, r = await revision(cambio, admin.cookie, g.id);
    const actualizado = await bien(await pedir('/organizacion/bloqueos/' + g.id, admin.cookie, { propuesta: cambio, firma: r.firma, version: 1 }, 'PATCH'));
    assert.equal(actualizado.version, 2);
    assert.equal((await pedir('/organizacion/bloqueos/' + g.id, admin.cookie, { propuesta: cambio, firma: r.firma, version: 1 }, 'PATCH')).status, 409);
    assert.equal((await pedir('/organizacion/bloqueos/' + g.id + '/cancelacion', admin.cookie, { motivo: '', version: 2 })).status, 422);
    const cerrados = await Promise.all([1, 2].map(() => pedir('/organizacion/bloqueos/' + g.id + '/cancelacion', admin.cookie, { motivo: 'Finalizó la intervención', version: 2 })));
    assert.deepEqual(cerrados.map(r => r.status).sort(), [200, 409]);
    b = (await bien(await pedir('/estado', admin.cookie))).listaBloqueos.find((b: any) => b.id === g.id);
    assert.equal(b.estado, 'cancelado'); assert.equal(b.historial.length, 3); assert.equal(b.historial[2].responsable, admin.usuario.nombre);
    assert.equal((await agenda(recintos[2])).ocupaciones.filter((o: any) => o.tipo === 'bloqueo').length, 0);
  });

  await t.test('mantenimiento no desplaza eventos; bloqueo institucional suspende y conserva las reservaciones', async () => {
    const s = await solicitud(recintos[1]);
    await bien(await pedir('/organizacion/solicitudes/' + s.id + '/resolucion', sub.cookie, { decision: 'Aprobada', version: 1 }));
    const actividad = (await pool.query('SELECT id_actividad::text id FROM ticket_trade."Actividad" WHERE id_evento=$1', [s.idEvento])).rows[0].id;
    const apartado = await bien(await pedir('/taquilla/apartados', organizador.cookie, { idActividad: actividad }), 201);
    await bien(await pedir('/taquilla/apartados/' + apartado.id + '/confirmacion', organizador.cookie, {}), 201);
    const temporal = await bien(await pedir('/taquilla/apartados', asistente.cookie, { idActividad: actividad }), 201);
    assert.equal((await pedir('/organizacion/bloqueos/revision', admin.cookie, { propuesta: propuesta(recintos[1]) })).status, 409);
    const p = propuesta(recintos[1], 'Institucional'), g = await guardar(p, sub.cookie);
    const fila = (await pool.query(`SELECT ea.nombre estado FROM ticket_trade."Actividad" a JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) WHERE a.id_actividad=$1`, [actividad])).rows[0];
    assert.equal(fila.estado, 'Suspendida');
    const cupoTemporal = (await pool.query(`SELECT ea.nombre apartado,ec.nombre cupo FROM ticket_trade."Apartado" a
      JOIN ticket_trade."EstadoApartado" ea USING(id_estado_apartado) JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo)
      JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE a.id_compromiso_cupo=$1`, [temporal.id])).rows[0];
    assert.deepEqual(cupoTemporal, { apartado: 'Liberado', cupo: 'Liberado' });
    const antes = (await pool.query(`SELECT r.id_reservacion,b.codigo_qr,er.nombre estado FROM ticket_trade."Reservacion" r JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento)
      JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion) WHERE cp.id_actividad=$1`, [actividad])).rows;
    assert.ok(antes.length); assert.ok(antes.every(r => r.estado === 'Confirmada'));
    await bien(await pedir('/organizacion/bloqueos/' + g.id + '/cancelacion', sub.cookie, { motivo: 'Concluyó la causa', version: 1 }));
    assert.equal((await pool.query(`SELECT ea.nombre estado FROM ticket_trade."Actividad" a JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) WHERE a.id_actividad=$1`, [actividad])).rows[0].estado, 'Suspendida');
    const despues = (await pool.query(`SELECT r.id_reservacion,b.codigo_qr,er.nombre estado FROM ticket_trade."Reservacion" r JOIN ticket_trade."BoletoEvento" b USING(id_boleto_evento)
      JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion) WHERE cp.id_actividad=$1`, [actividad])).rows;
    assert.deepEqual(despues, antes);
  });

  await t.test('clases informativas se muestran y no impiden guardar un bloqueo autorizado', async () => {
    await conTransaccion(async c => {
      const id = (await c.query(`INSERT INTO ticket_trade."ActividadInterna"(id_recinto,inicio_vigencia,fin_vigencia,hora_inicio,hora_fin)
        VALUES($1,'2099-11-24','2099-11-24','10:00','12:00') RETURNING id_actividad_interna`, [recintos[3]])).rows[0].id_actividad_interna;
      await c.query(`INSERT INTO ticket_trade."DiaActividadInterna"(id_actividad_interna,dia_semana) VALUES($1,extract(isodow FROM date '2099-11-24'))`, [id]);
    });
    const p = propuesta(recintos[3], 'Mantenimiento', { fechaInicio: '2099-11-24', fechaFin: '2099-11-24' });
    const r = await revision(p); assert.equal(r.afectados.length, 0); assert.equal(r.advertencias.length, 1);
    await bien(await pedir('/organizacion/bloqueos', admin.cookie, { propuesta: p, firma: r.firma }), 201);
    const a = await agenda(recintos[3], '2099-11-24');
    assert.equal(a.ocupaciones.filter((o: any) => o.tipo === 'clase' && o.informativa).length, 1);
    assert.equal(a.ocupaciones.filter((o: any) => o.tipo === 'bloqueo' && !o.informativa).length, 1);
  });

  await t.test('dos bloqueos competidores solo guardan uno y una firma antigua no omite la nueva ocupación', async () => {
    const p = propuesta(recintos[4]), r = await revision(p);
    const antes = (await pool.query('SELECT count(*)::int n FROM ticket_trade."BloqueoRecinto" WHERE id_recinto=$1', [recintos[4]])).rows[0].n;
    const respuestas = await Promise.all([1, 2].map(() => pedir('/organizacion/bloqueos', admin.cookie, { propuesta: p, firma: r.firma })));
    assert.deepEqual(respuestas.map(r => r.status).sort(), [201, 409]);
    assert.equal((await pool.query('SELECT count(*)::int n FROM ticket_trade."BloqueoRecinto" WHERE id_recinto=$1', [recintos[4]])).rows[0].n, antes + 1);
    t.diagnostic(JSON.stringify({ bloqueosCompetidores: respuestas.map(r => r.status), guardados: 1 }));
  });

  await t.test('una entrada registrada después de la revisión impide suspender y no modifica la actividad', async () => {
    const s = await solicitud(recintos[6]);
    await bien(await pedir('/organizacion/solicitudes/' + s.id + '/resolucion', sub.cookie, { decision: 'Aprobada', version: 1 }));
    const actividad = (await pool.query('SELECT id_actividad::text id FROM ticket_trade."Actividad" WHERE id_evento=$1', [s.idEvento])).rows[0].id;
    const apartado = await bien(await pedir('/taquilla/apartados', asistente.cookie, { idActividad: actividad }), 201);
    await bien(await pedir('/taquilla/apartados/' + apartado.id + '/confirmacion', asistente.cookie, {}), 201);
    const idReserva = (await pool.query('SELECT id_reservacion FROM ticket_trade."Reservacion" WHERE id_compromiso_cupo=$1', [apartado.id])).rows[0].id_reservacion;
    const p = propuesta(recintos[6], 'Institucional'), r = await revision(p, sub.cookie);
    assert.equal(r.afectados.length, 1);
    // Fixture histórica de entrada persistida: esta prueba no cambia ni prueba el check-in de Diego.
    await pool.query('INSERT INTO ticket_trade."EntradaOrdinaria"(id_reservacion,id_cuenta_operadora,registrada_en) VALUES($1,1001,CURRENT_TIMESTAMP)', [idReserva]);
    const antes = (await pool.query('SELECT count(*)::int n FROM ticket_trade."BloqueoRecinto"')).rows[0].n;
    const respuesta = await pedir('/organizacion/bloqueos', sub.cookie, { propuesta: p, firma: r.firma });
    assert.equal(respuesta.status, 409); assert.match((await respuesta.json()).error.mensaje, /entradas registradas/);
    assert.equal((await pool.query('SELECT count(*)::int n FROM ticket_trade."BloqueoRecinto"')).rows[0].n, antes);
    assert.equal((await pool.query(`SELECT ea.nombre estado FROM ticket_trade."Actividad" a JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) WHERE a.id_actividad=$1`, [actividad])).rows[0].estado, 'Programada');
  });

  await t.test('un fallo al confirmar la transacción revierte todo y el servidor no devuelve éxito', async () => {
    const p = propuesta(recintos[5], 'Mantenimiento', { titulo: 'Fallo controlado', idsRecintos: [recintos[5], recintos[7]] }), r = await revision(p);
    const antes = (await pool.query('SELECT count(*)::int n FROM ticket_trade."BloqueoRecinto"')).rows[0].n;
    await pool.query(`CREATE FUNCTION infra.rechazar_prueba_sprint9() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo controlado de commit'; END $$;
      CREATE CONSTRAINT TRIGGER fallo_prueba_sprint9 AFTER INSERT ON infra.bloqueo_detalle DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.titulo='Fallo controlado') EXECUTE FUNCTION infra.rechazar_prueba_sprint9()`);
    try {
      const respuesta = await pedir('/organizacion/bloqueos', admin.cookie, { propuesta: p, firma: r.firma });
      assert.equal(respuesta.status, 500);
      assert.equal((await pool.query('SELECT count(*)::int n FROM ticket_trade."BloqueoRecinto"')).rows[0].n, antes);
      t.diagnostic(JSON.stringify({ falloCommit: 500, escriturasParciales: 0 }));
    } finally { await pool.query('DROP TRIGGER fallo_prueba_sprint9 ON infra.bloqueo_detalle; DROP FUNCTION infra.rechazar_prueba_sprint9()'); }
  });

  await t.test('la misma sesión pierde el permiso institucional cuando se retira su rol', async () => {
    const id = (await pool.query(`INSERT INTO ticket_trade."Cuenta"(nombres,primer_apellido,segundo_apellido,correo,contrasena_hash,correo_confirmado_en,id_tipo_cuenta,id_estado_cuenta)
      SELECT 'Revisor','Sintético','','permiso.sprint9@example.invalid',contrasena_hash,CURRENT_TIMESTAMP,id_tipo_cuenta,id_estado_cuenta
      FROM ticket_trade."Cuenta" WHERE id_cuenta=1002 RETURNING id_cuenta::text id`)).rows[0].id;
    const revisor = await entrar('permiso.sprint9@example.invalid');
    await revision(propuesta(recintos[5], 'Institucional'), revisor.cookie);
    await conTransaccion(async c => {
      await c.query(`UPDATE ticket_trade."Cuenta" SET id_tipo_cuenta=(SELECT id_tipo_cuenta FROM ticket_trade."TipoCuenta" WHERE nombre='Común') WHERE id_cuenta=$1`, [id]);
      await c.query(`INSERT INTO ticket_trade."PerfilUsuario"(id_cuenta,id_rol_registro) VALUES($1,(SELECT id_rol_registro FROM ticket_trade."RolRegistro" WHERE nombre='Externo'))`, [id]);
    });
    assert.equal((await pedir('/organizacion/bloqueos/revision', revisor.cookie, { propuesta: propuesta(recintos[5], 'Institucional') })).status, 403);
  });

  const actual = await bien(await pedir('/organizacion/calendario', admin.cookie));
  await bien(await pedir('/organizacion/calendario', admin.cookie, { ...calendarioInicial, version: actual.version }, 'PUT'));
});
