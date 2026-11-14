import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
test(
  "Eventos PostgreSQL: edición, conflictos, cambio de recinto y cancelación parcial preservan pase y reservas",
  { skip: !process.env.TT_API_PRUEBAS },
  async (t) => {
    process.env.TT_CORREO_ACTIVO = "1";
    process.env.TT_CORREO_CLAVE = crypto.randomBytes(32).toString("base64");
    const { app } = await import("../backend/app");
    const { pool, conTransaccion } = await import("../backend/bd/pool");
    const { versionEvento } = await import(
      "../backend/modulos/organizacion/version"
    );
    assert.match(
      (await pool.query("SELECT current_database() db")).rows[0].db,
      /^tt_pruebas_/,
    );
    const server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    t.after(async () => {
      await new Promise<void>((r) => server.close(() => r()));
      await pool.end();
    });
    const base = "http://127.0.0.1:" + (server.address() as any).port;
    async function post(
      path: string,
      datos: any,
      cookie?: string,
      method = "POST",
    ) {
      return fetch(base + "/api/" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(datos),
      });
    }
    const fuente = (
      await pool.query(
        'SELECT e.*,c.correo FROM ticket_trade."Evento" e JOIN ticket_trade."Cuenta" c ON c.id_cuenta=e.id_cuenta_organizadora ORDER BY id_evento LIMIT 1',
      )
    ).rows[0];
    const login = await post("auth/login", {
      correo: fuente.correo,
      password: "Password123!",
    });
    assert.equal(login.status, 200, await login.clone().text());
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const alumno = (
      await pool.query(
        'SELECT id_cuenta::text id FROM ticket_trade."Estudiante" ORDER BY id_cuenta LIMIT 1',
      )
    ).rows[0].id;
    const fixture = await conTransaccion(async (c) => {
      const e = (
        await c.query(
          `INSERT INTO ticket_trade."Evento"(id_cuenta_organizadora,titulo,descripcion,correo_contacto,telefono_contacto,id_categoria_evento,id_visibilidad_evento,id_archivo_cartel,id_estado_evento,publicado_en) VALUES($1,'Encuentro de innovación','Encuentro académico con dos actividades',$2,'5555555555',$3,(SELECT id_visibilidad_evento FROM ticket_trade."VisibilidadEvento" WHERE nombre='Público'),$4,(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Publicado'),now()) RETURNING id_evento::text id`,
          [
            fuente.id_cuenta_organizadora,
            fuente.correo,
            fuente.id_categoria_evento,
            fuente.id_archivo_cartel,
          ],
        )
      ).rows[0].id;
      const recinto = (
        await c.query(
          'SELECT id_recinto::text id FROM ticket_trade."Recinto" ORDER BY aforo_maximo DESC LIMIT 1',
        )
      ).rows[0].id;
      const actividades = [] as any[];
      for (let i = 0; i < 2; i++)
        actividades.push(
          (
            await c.query(
              `INSERT INTO ticket_trade."Actividad"(id_evento,nombre,descripcion,fecha,hora_inicio,hora_fin,id_recinto,id_tipo_acceso,aforo_solicitado,id_estado_actividad) VALUES($1,$2,'Actividad de investigación',(now() AT TIME ZONE 'America/Mexico_City')::date+200+$3::int,'10:00','11:00',$4,(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre='Registro sin asiento asignado'),10,(SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Programada')) RETURNING id_actividad::text id,to_char(fecha,'YYYY-MM-DD') fecha`,
              [e, "Actividad " + (i + 1), i, recinto],
            )
          ).rows[0],
        );
      await c.query(
        'INSERT INTO ticket_trade."ItinerarioDia"(id_evento,fecha,id_archivo) VALUES($1,$2,$3)',
        [e, actividades[0].fecha, fuente.id_archivo_cartel],
      );
      const qr = crypto.randomBytes(32).toString("hex");
      const pase = (
        await c.query(
          'INSERT INTO ticket_trade."BoletoEvento"(id_evento,id_cuenta,codigo_qr,codigo_manual) VALUES($1,$2,$3,$4) RETURNING id_boleto_evento::text id',
          [e, alumno, qr, "TT-" + crypto.randomBytes(12).toString("hex")],
        )
      ).rows[0].id;
      for (const a of actividades) {
        const cp = (
          await c.query(
            `INSERT INTO ticket_trade."CompromisoCupo"(id_actividad,id_estado_compromiso_cupo) VALUES($1,(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Activo')) RETURNING id_compromiso_cupo`,
            [a.id],
          )
        ).rows[0].id_compromiso_cupo;
        await c.query(
          `INSERT INTO ticket_trade."Reservacion"(id_boleto_evento,id_compromiso_cupo,confirmada_en,id_estado_reservacion) VALUES($1,$2,now(),(SELECT id_estado_reservacion FROM ticket_trade."EstadoReservacion" WHERE nombre='Confirmada'))`,
          [pase, cp],
        );
      }
      return { e, actividades, pase, qr, recinto };
    });
    const version = await versionEvento(pool, fixture.e);
    let r = await post(
      "organizacion/eventos/" + fixture.e,
      {
        version,
        parcial: { titulo: "Encuentro de innovación actualizado" },
        motivo: "Actualizar el nombre del encuentro",
      },
      cookie,
      "PATCH",
    );
    assert.equal(r.status, 200, await r.clone().text());
    r = await post(
      "organizacion/eventos/" + fixture.e,
      {
        version,
        parcial: { titulo: "Datos obsoletos" },
        motivo: "Cambio concurrente",
      },
      cookie,
      "PATCH",
    );
    assert.equal(r.status, 409);
    const actual = (
      await pool.query(
        'SELECT titulo FROM ticket_trade."Evento" WHERE id_evento=$1',
        [fixture.e],
      )
    ).rows[0];
    assert.equal(actual.titulo, "Encuentro de innovación actualizado");
    const estado = await fetch(base + "/api/estado", {
      headers: { Cookie: cookie },
    });
    const datos = (await estado.json()).datos;
    const evento = datos.listaEventos.find((e: any) => e.id === fixture.e);
    assert.ok(evento.versionServidor);
    assert.equal(evento.historialCambios.length, 1);
    const fechas = evento.fechas.map((f: any) => ({
      ...f,
      horaInicio: "12:00",
      horaFin: "13:00",
    }));
    r = await post(
      "organizacion/eventos/" + fixture.e,
      {
        version: evento.versionServidor,
        parcial: { fechas },
        motivo: "Ajustar horario",
      },
      cookie,
      "PATCH",
    );
    assert.equal(r.status, 200, await r.clone().text());
    // Cambiar de día conserva el archivo del itinerario, sin duplicarlo ni perderlo.
    const nuevoDia = new Date(
      new Date(fixture.actividades[0].fecha + "T12:00:00Z").getTime() +
        4 * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    const fechasMovidas = fechas.map((f: any, i: number) => ({
      ...f,
      fecha: i === 0 ? nuevoDia : f.fecha,
    }));
    r = await post(
      "organizacion/eventos/" + fixture.e,
      {
        version: await versionEvento(pool, fixture.e),
        parcial: { fechas: fechasMovidas },
        motivo: "Mover la actividad con su itinerario",
      },
      cookie,
      "PATCH",
    );
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(
      (
        await pool.query(
          `SELECT to_char(fecha,'YYYY-MM-DD') fecha FROM ticket_trade."ItinerarioDia" WHERE id_evento=$1`,
          [fixture.e],
        )
      ).rows[0].fecha,
      nuevoDia,
    );
    await pool.query(
      `UPDATE ticket_trade."Actividad" SET id_estado_actividad=(SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Suspendida') WHERE id_actividad=$1`,
      [fixture.actividades[0].id],
    );
    r = await post(
      "organizacion/eventos/" + fixture.e,
      {
        version: await versionEvento(pool, fixture.e),
        parcial: {
          fechas: fechasMovidas.map((f: any) => ({ ...f, suspendida: false })),
        },
        motivo: "Reactivar expresamente después de revisar la agenda",
      },
      cookie,
      "PATCH",
    );
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(
      (
        await pool.query(
          `SELECT ea.nombre FROM ticket_trade."Actividad" a JOIN ticket_trade."EstadoActividad" ea USING(id_estado_actividad) WHERE id_actividad=$1`,
          [fixture.actividades[0].id],
        )
      ).rows[0].nombre,
      "Programada",
    );
    const correoAjeno = (
      await pool.query(
        'SELECT correo FROM ticket_trade."Cuenta" WHERE id_cuenta=$1',
        [alumno],
      )
    ).rows[0].correo;
    const ajeno = await post("auth/login", {
      correo: correoAjeno,
      password: "Password123!",
    });
    assert.equal(ajeno.status, 200);
    const ca = ajeno.headers.get("set-cookie")!.split(";")[0];
    r = await post(
      "organizacion/eventos/" + fixture.e + "/cancelacion",
      {
        version: await versionEvento(pool, fixture.e),
        idActividad: fixture.actividades[0].id,
        motivo: "Intento sin permiso",
      },
      ca,
    );
    assert.equal(r.status, 403);
    // Cambio con asiento comprometido y plaza VIP sin boleto: conservar ambas categorías.
    await conTransaccion(async (c) => {
      const a = fixture.actividades[0].id;
      await c.query(
        `UPDATE ticket_trade."Actividad" SET id_tipo_acceso=(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre='Reservación con lugar asignado') WHERE id_actividad=$1`,
        [a],
      );
      const lugares = (
        await c.query(
          `INSERT INTO ticket_trade."LugarActividad"(id_actividad,id_lugar_recinto,id_categoria_lugar_actividad) SELECT $1,id_lugar_recinto,(SELECT id_categoria_lugar_actividad FROM ticket_trade."CategoriaLugarActividad" WHERE nombre='Asistente') FROM ticket_trade."LugarRecinto" WHERE id_recinto=$2 ORDER BY id_lugar_recinto LIMIT 10 RETURNING id_lugar_actividad::text id`,
          [a, fixture.recinto],
        )
      ).rows;
      const cp = (
        await c.query(
          'SELECT id_compromiso_cupo FROM ticket_trade."CompromisoCupo" WHERE id_actividad=$1',
          [a],
        )
      ).rows[0].id_compromiso_cupo;
      await c.query(
        'INSERT INTO ticket_trade."AsignacionAsiento" VALUES($1,$2)',
        [cp, lugares[0].id],
      );
      await c.query(
        `UPDATE ticket_trade."LugarActividad" SET id_categoria_lugar_actividad=(SELECT id_categoria_lugar_actividad FROM ticket_trade."CategoriaLugarActividad" WHERE nombre='VIP') WHERE id_lugar_actividad=$1`,
        [lugares[1].id],
      );
    });
    const destino = (
      await pool.query(
        'SELECT id_recinto::text id FROM ticket_trade."Recinto" WHERE id_recinto<>$1 AND aforo_maximo>=10 AND NOT EXISTS(SELECT 1 FROM ticket_trade."BloqueoRecinto" b WHERE b.id_recinto=ticket_trade."Recinto".id_recinto AND b.finalizado_en IS NULL) ORDER BY id_recinto LIMIT 1',
        [fixture.recinto],
      )
    ).rows[0].id;
    const p = {
      idEvento: fixture.e,
      idActividad: fixture.actividades[0].id,
      idRecinto: destino,
      aforo: 5,
      motivo: "Usar un recinto más adecuado",
    };
    r = await post(
      "organizacion/eventos/" + fixture.e + "/recinto/revision",
      { version: await versionEvento(pool, fixture.e), peticion: p },
      cookie,
    );
    assert.equal(r.status, 200, await r.clone().text());
    const propuesta = (await r.json()).datos.propuesta;
    r = await post(
      "organizacion/eventos/" + fixture.e + "/recinto",
      {
        version: propuesta.firma,
        peticion: propuesta.peticion,
        aceptarReduccion: false,
      },
      cookie,
    );
    assert.equal(r.status, 422);
    r = await post(
      "organizacion/eventos/" + fixture.e + "/recinto",
      {
        version: propuesta.firma,
        peticion: propuesta.peticion,
        aceptarReduccion: true,
      },
      cookie,
    );
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(
      (
        await pool.query(
          `SELECT count(*)::int n FROM ticket_trade."LugarActividad" la JOIN ticket_trade."Actividad" a USING(id_actividad) JOIN ticket_trade."LugarRecinto" lr USING(id_lugar_recinto) WHERE a.id_evento=$1 AND a.id_recinto<>lr.id_recinto`,
          [fixture.e],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool.query(
          `SELECT count(*)::int n FROM ticket_trade."LugarActividad" la JOIN ticket_trade."CategoriaLugarActividad" cl USING(id_categoria_lugar_actividad) WHERE la.id_actividad=$1 AND cl.nombre='VIP'`,
          [fixture.actividades[0].id],
        )
      ).rows[0].n,
      1,
    );
    // Alta requiere Subdirección; retiro comprueba compromisos y mantiene otra actividad.
    const nueva = {
      nombreActividad: "Mesa de investigación",
      descripcionActividad: "Presentación académica",
      fecha: "2027-09-15",
      horaInicio: "10:00",
      horaFin: "11:00",
      idRecinto: fixture.recinto,
      modalidadAsistencia: "registro",
      asistenciaEstimada: 5,
    };
    r = await post(
      "organizacion/eventos/" + fixture.e + "/actividades",
      {
        version: await versionEvento(pool, fixture.e),
        actividad: nueva,
        motivo: "Añadir una mesa de investigación",
      },
      cookie,
    );
    assert.equal(r.status, 403);
    const sub = (
      await pool.query(
        `SELECT correo FROM ticket_trade."Cuenta" c JOIN ticket_trade."TipoCuenta" tc USING(id_tipo_cuenta) WHERE tc.nombre='Subdirección'`,
      )
    ).rows[0];
    const ls = await post("auth/login", {
      correo: sub.correo,
      password: "Password123!",
    });
    assert.equal(ls.status, 200);
    const cs = ls.headers.get("set-cookie")!.split(";")[0];
    r = await post(
      "organizacion/eventos/" + fixture.e + "/publicacion",
      { version: await versionEvento(pool, fixture.e) },
      cookie,
    );
    assert.equal(r.status, 403);
    r = await post(
      "organizacion/eventos/" + fixture.e + "/publicacion",
      { version: await versionEvento(pool, fixture.e) },
      cs,
    );
    assert.equal(r.status, 200, await r.clone().text());

    r = await post(
      "organizacion/eventos/" + fixture.e + "/actividades",
      {
        version: await versionEvento(pool, fixture.e),
        actividad: nueva,
        motivo: "Autorizar la nueva mesa académica",
      },
      cs,
    );
    assert.equal(r.status, 201, await r.clone().text());
    const alta = (await r.json()).datos.id;
    r = await post(
      "organizacion/eventos/" + fixture.e + "/cancelacion",
      {
        version: await versionEvento(pool, fixture.e),
        idActividad: alta,
        motivo: "Retirar la actividad sin compromisos",
        retirar: true,
      },
      cs,
    );
    assert.equal(r.status, 200, await r.clone().text());
    // Un acceso registrado impide cancelar; no se invalidan sus reservas.
    const reserva = (
      await pool.query(
        'SELECT r.id_reservacion FROM ticket_trade."Reservacion" r JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) WHERE cp.id_actividad=$1',
        [fixture.actividades[1].id],
      )
    ).rows[0].id_reservacion;
    const entrada = (
      await pool.query(
        'INSERT INTO ticket_trade."EntradaOrdinaria"(id_reservacion,id_cuenta_operadora,registrada_en) VALUES($1,$2,now()) RETURNING id_entrada_ordinaria',
        [reserva, fuente.id_cuenta_organizadora],
      )
    ).rows[0].id_entrada_ordinaria;
    r = await post(
      "organizacion/eventos/" + fixture.e + "/cancelacion",
      {
        version: await versionEvento(pool, fixture.e),
        idActividad: fixture.actividades[1].id,
        motivo: "No cancelar una entrada utilizada",
      },
      cs,
    );
    assert.equal(r.status, 409);
    await pool.query(
      'DELETE FROM ticket_trade."EntradaOrdinaria" WHERE id_entrada_ordinaria=$1',
      [entrada],
    );
    const antes = await versionEvento(pool, fixture.e);
    r = await post(
      "organizacion/eventos/" + fixture.e + "/cancelacion",
      {
        version: antes,
        idActividad: fixture.actividades[0].id,
        motivo: "Cancelar solo el primer taller",
      },
      cookie,
    );
    assert.equal(r.status, 200, await r.clone().text());
    const reservas = (
      await pool.query(
        'SELECT er.nombre FROM ticket_trade."Reservacion" r JOIN ticket_trade."EstadoReservacion" er USING(id_estado_reservacion) WHERE id_boleto_evento=$1 ORDER BY id_reservacion',
        [fixture.pase],
      )
    ).rows.map((r) => r.nombre);
    assert.deepEqual(reservas, ["Cancelada", "Confirmada"]);
    assert.equal(
      (
        await pool.query(
          'SELECT codigo_qr FROM ticket_trade."BoletoEvento" WHERE id_boleto_evento=$1',
          [fixture.pase],
        )
      ).rows[0].codigo_qr,
      fixture.qr,
    );
    r = await post(
      "organizacion/eventos/" + fixture.e + "/cancelacion",
      {
        version: antes,
        idActividad: fixture.actividades[1].id,
        motivo: "No sobrescribir",
      },
      cookie,
    );
    assert.equal(r.status, 409);
    r = await post(
      "organizacion/eventos/" + fixture.e + "/cancelacion",
      {
        version: await versionEvento(pool, fixture.e),
        idActividad: fixture.actividades[1].id,
        motivo: "Cancelar el segundo taller",
      },
      cookie,
    );
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(
      (
        await pool.query(
          'SELECT ee.nombre FROM ticket_trade."Evento" e JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento) WHERE id_evento=$1',
          [fixture.e],
        )
      ).rows[0].nombre,
      "Cancelado",
    );
    await pool.query("SELECT ticket_trade.validar_integridad()");
  },
);
