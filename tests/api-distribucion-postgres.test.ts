import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

test("Distribución PostgreSQL: permisos, guardado, concurrencia y protección de reservas", {
  skip: !process.env.TT_API_PRUEBAS,
}, async (t) => {
  const { app } = await import("../backend/app");
  const { pool, conTransaccion } = await import("../backend/bd/pool");
  assert.match((await pool.query("SELECT current_database() db")).rows[0].db, /^tt_pruebas_/);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  });
  const base = "http://127.0.0.1:" + (server.address() as { port: number }).port + "/api/";
  const solicitar = (path: string, method: string, cookie?: string, body?: unknown) =>
    fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const login = async (correo: string) => {
    const r = await solicitar("auth/login", "POST", undefined, { correo, password: "Password123!" });
    assert.equal(r.status, 200, await r.clone().text());
    return r.headers.get("set-cookie")!.split(";")[0];
  };
  const fixture = await conTransaccion(async (c) => {
    const { rows: [fuente] } = await c.query(
      `SELECT e.*, c.correo FROM ticket_trade."Evento" e
       JOIN ticket_trade."Cuenta" c ON c.id_cuenta = e.id_cuenta_organizadora
       WHERE e.id_archivo_cartel IS NOT NULL ORDER BY e.id_evento LIMIT 1`,
    );
    const { rows: [alumno] } = await c.query(
      `SELECT c.correo FROM ticket_trade."Estudiante" s JOIN ticket_trade."Cuenta" c USING (id_cuenta)
       WHERE c.correo_confirmado_en IS NOT NULL AND c.id_cuenta <> $1 ORDER BY c.id_cuenta LIMIT 1`,
      [fuente.id_cuenta_organizadora],
    );
    const { rows: [recinto] } = await c.query(
      `SELECT id_recinto id FROM ticket_trade."LugarRecinto" lr
       JOIN ticket_trade."TipoLugar" tl USING (id_tipo_lugar)
       WHERE tl.nombre = 'Butaca' GROUP BY id_recinto HAVING count(*) >= 5 ORDER BY id_recinto LIMIT 1`,
    );
    const { rows: [evento] } = await c.query(
      `INSERT INTO ticket_trade."Evento"(
         id_cuenta_organizadora, titulo, descripcion, correo_contacto, telefono_contacto,
         id_categoria_evento, id_visibilidad_evento, id_archivo_cartel, id_estado_evento, publicado_en)
       VALUES ($1, 'Encuentro de distribución', 'Prueba del catálogo de lugares', $2, '5555555555', $3,
         (SELECT id_visibilidad_evento FROM ticket_trade."VisibilidadEvento" WHERE nombre = 'Público'),
         $4, (SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre = 'Publicado'), now())
       RETURNING id_evento::text id`,
      [fuente.id_cuenta_organizadora, fuente.correo, fuente.id_categoria_evento, fuente.id_archivo_cartel],
    );
    const { rows: [actividad] } = await c.query(
      `INSERT INTO ticket_trade."Actividad"(
         id_evento, nombre, descripcion, fecha, hora_inicio, hora_fin, id_recinto,
         id_tipo_acceso, aforo_solicitado, id_estado_actividad)
       VALUES ($1, 'Actividad numerada', 'Prueba de guardado', current_date + 300, '10:00', '11:00', $2,
         (SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre = 'Reservación con lugar asignado'),
         4, (SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre = 'Programada'))
       RETURNING id_actividad::text id`,
      [evento.id, recinto.id],
    );
    await c.query(
      `INSERT INTO ticket_trade."LugarActividad"(id_actividad, id_lugar_recinto, id_categoria_lugar_actividad)
       SELECT $1, lr.id_lugar_recinto, cl.id_categoria_lugar_actividad
       FROM ticket_trade."LugarRecinto" lr CROSS JOIN ticket_trade."CategoriaLugarActividad" cl
       WHERE lr.id_recinto = $2 AND cl.nombre = 'Asistente' ORDER BY lr.id_lugar_recinto LIMIT 5`,
      [actividad.id, recinto.id],
    );
    const { rows: [ajeno] } = await c.query(
      'SELECT id_lugar_recinto::text id FROM ticket_trade."LugarRecinto" WHERE id_recinto <> $1 LIMIT 1',
      [recinto.id],
    );
    return { evento: evento.id, actividad: actividad.id, organizador: fuente.correo, alumno: alumno.correo, ajeno: ajeno.id };
  });
  const [propietario, segundaSesion, alumno] = await Promise.all([
    login(fixture.organizador), login(fixture.organizador), login(fixture.alumno),
  ]);
  const path = `organizacion/eventos/${fixture.evento}/actividades/${fixture.actividad}/distribucion`;
  const leer = async (cookie: string) => {
    const r = await solicitar(path, "GET", cookie);
    assert.equal(r.status, 200, await r.clone().text());
    return (await r.json()).datos;
  };
  const guardar = (cookie: string, version: string, cambios: unknown[]) =>
    solicitar(path, "PATCH", cookie, { version, cambios });
  const cambio = (idLugarRecinto: string, categoria: string) => ({ idLugarRecinto, categoria });

  assert.equal((await solicitar(path, "GET")).status, 401);
  assert.equal((await solicitar(path, "GET", alumno)).status, 403);
  const inicial = await leer(propietario);
  const [primero, segundo, tercero, cuarto] = inicial.lugares.filter((lugar: any) => lugar.idLugarActividad);
  assert.equal((await guardar(alumno, inicial.version, [cambio(primero.idLugarRecinto, "staff")])).status, 403);
  assert.equal((await guardar(propietario, inicial.version, [cambio(fixture.ajeno, "staff")])).status, 422);
  assert.equal((await guardar(propietario, inicial.version, [
    cambio(primero.idLugarRecinto, "bloqueado"), cambio(segundo.idLugarRecinto, "bloqueado"),
  ])).status, 409);

  const ediciones = await Promise.all([
    guardar(propietario, inicial.version, [cambio(primero.idLugarRecinto, "vip")]),
    guardar(segundaSesion, inicial.version, [cambio(primero.idLugarRecinto, "staff")]),
  ]);
  assert.deepEqual(ediciones.map((r) => r.status).sort(), [200, 409], await Promise.all(ediciones.map((r) => r.clone().text())).then((x) => x.join("\n")));
  let actual = await leer(segundaSesion);
  assert.notEqual(actual.version, inicial.version);
  const exitoso = await ediciones.find((r) => r.ok)!.json();
  assert.deepEqual(actual, exitoso.datos);

  const [edicion, intentoApartado] = await Promise.all([
    guardar(propietario, actual.version, [cambio(cuarto.idLugarRecinto, "vip")]),
    solicitar("taquilla/apartados", "POST", alumno, {
      idActividad: fixture.actividad, idLugar: cuarto.idLugarActividad,
    }),
  ]);
  assert.ok(
    (edicion.status === 200 && intentoApartado.status === 422)
      || (edicion.status === 409 && intentoApartado.status === 201),
    await Promise.all([edicion.clone().text(), intentoApartado.clone().text()]).then((x) => x.join("\n")),
  );
  if (intentoApartado.ok) {
    const { datos: { id } } = await intentoApartado.json();
    const liberar = await solicitar(`taquilla/apartados/${id}/liberacion`, "POST", alumno, {});
    assert.ok(liberar.ok, await liberar.clone().text());
  }
  actual = await leer(propietario);

  const apartado = await solicitar("taquilla/apartados", "POST", alumno, {
    idActividad: fixture.actividad, idLugar: segundo.idLugarActividad,
  });
  assert.equal(apartado.status, 201, await apartado.clone().text());
  const { datos: { id } } = await apartado.json();
  const protegido = cambio(segundo.idLugarRecinto, "bloqueado");
  assert.equal((await guardar(propietario, actual.version, [protegido])).status, 409);
  const confirmar = await solicitar(`taquilla/apartados/${id}/confirmacion`, "POST", alumno, {});
  assert.equal(confirmar.status, 201, await confirmar.clone().text());
  assert.equal((await guardar(segundaSesion, actual.version, [
    cambio(tercero.idLugarRecinto, "vip"), protegido,
  ])).status, 409);
  assert.equal((await leer(propietario)).version, actual.version);
  const libre = await guardar(segundaSesion, actual.version, [cambio(tercero.idLugarRecinto, "bloqueado")]);
  assert.equal(libre.status, 200, await libre.clone().text());
  const final = await leer(propietario);
  const taquilla = await solicitar(`taquilla/actividades/${fixture.actividad}/lugares`, "GET");
  assert.equal(taquilla.status, 200, await taquilla.clone().text());
  const disponibilidad = await solicitar(`taquilla/actividades/${fixture.actividad}/disponibilidad`, "GET");
  assert.equal(disponibilidad.status, 200, await disponibilidad.clone().text());
  assert.equal((await disponibilidad.json()).datos.categorias[tercero.idLugarActividad], "bloqueado");
  const mapaTaquilla = (await taquilla.json()).datos.lugares;
  assert.equal(mapaTaquilla.find((l: any) => l.id === tercero.idLugarActividad).categoria, "Bloqueado");
  assert.equal(final.lugares.find((l: any) => l.idLugarRecinto === segundo.idLugarRecinto).ocupado, true);
  assert.equal(final.lugares.find((l: any) => l.idLugarRecinto === tercero.idLugarRecinto).categoria, "bloqueado");
  const desbloquear = await guardar(propietario, final.version, [cambio(tercero.idLugarRecinto, "asistente")]);
  assert.equal(desbloquear.status, 200, await desbloquear.clone().text());
  const nuevoMapa = await solicitar(`taquilla/actividades/${fixture.actividad}/disponibilidad`, "GET");
  assert.equal(nuevoMapa.status, 200);
  assert.equal((await nuevoMapa.json()).datos.categorias[tercero.idLugarActividad], undefined);
  const { datos: reserva } = await confirmar.json();
  await pool.query('UPDATE ticket_trade."Actividad" SET aforo_solicitado=1 WHERE id_actividad=$1',[fixture.actividad]);
  // Un lugar puede seguir libre aunque ya se haya agotado el aforo de la actividad.
  const sinCupo = await solicitar("taquilla/apartados", "POST", propietario, {
    idActividad: fixture.actividad, idLugar: tercero.idLugarActividad,
  });
  assert.equal(sinCupo.status, 409);
  assert.equal((await sinCupo.json()).error.mensaje, "Ya no quedan cupos disponibles para esta actividad.");
  const aviso = `taquilla/actividades/${fixture.actividad}/aviso-cupo`;
  for (const cookie of [propietario, segundaSesion]) {
    const alta = await solicitar(aviso, "POST", cookie, {});
    assert.equal(alta.status, 200, await alta.clone().text());
    assert.equal((await alta.json()).datos.activo, true);
  }
  const cancela = await solicitar(`taquilla/reservaciones/${reserva.id}/cancelacion`, "POST", alumno, {});
  assert.equal(cancela.status, 200, await cancela.clone().text());
  assert.equal((await (await solicitar(aviso, "GET", propietario)).json()).datos.activo, false);
  assert.equal((await pool.query('SELECT count(*)::int n FROM ticket_trade."Notificacion" WHERE tipo=$1 AND referencia_destino=$2',
    ["disponibilidad",fixture.evento])).rows[0].n, 1);

  const {rows:[actividadLibre]} = await pool.query(`INSERT INTO ticket_trade."Actividad"
    (id_evento,nombre,descripcion,fecha,hora_inicio,hora_fin,id_recinto,id_tipo_acceso,aforo_solicitado,id_estado_actividad)
    SELECT id_evento,'Entrada libre','Prueba',fecha+1,hora_inicio,hora_fin,id_recinto,
      (SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre='Entrada libre'),aforo_solicitado,id_estado_actividad
    FROM ticket_trade."Actividad" WHERE id_actividad=$1 RETURNING id_actividad::text id`,[fixture.actividad]);
  const intencion = `taquilla/actividades/${actividadLibre.id}/intencion`;
  for (const cookie of [propietario, segundaSesion]) {
    const alta = await solicitar(intencion, "POST", cookie, {});
    assert.equal(alta.status, 200, await alta.clone().text());
  }
  const intenciones = async (cookie: string) => (await (await solicitar("estado","GET",cookie)).json()).datos.listaIntencionesAsistencia;
  assert.equal((await intenciones(propietario)).filter((r: any) => r.id === actividadLibre.id).length, 1);
  assert.equal((await intenciones(alumno)).some((r: any) => r.id === actividadLibre.id), false);
  assert.equal((await solicitar(intencion,"DELETE",alumno)).status, 200);
  assert.equal((await intenciones(propietario)).length, 1);
  assert.equal((await solicitar(intencion,"DELETE",propietario)).status, 200);
  assert.equal((await intenciones(propietario)).length, 0);
  assert.equal((await pool.query('SELECT count(*)::int n FROM ticket_trade."CompromisoCupo" WHERE id_actividad=$1',
    [actividadLibre.id])).rows[0].n, 0);

});
