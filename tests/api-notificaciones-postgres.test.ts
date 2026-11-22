import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

test(
  "Notificaciones PostgreSQL: expedientes, eventos, umbral 90% de reservas y bandeja del titular",
  { skip: !process.env.TT_API_PRUEBAS },
  async (t) => {
    const { app } = await import("../backend/app");
    const { pool, conTransaccion } = await import("../backend/bd/pool");
    const { registrarAvisoBandeja } = await import(
      "../backend/modulos/correos/avisos"
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
    let secuencia = 0;

    async function pedir(
      ruta: string,
      datos?: any,
      cookie?: string,
      metodo = "POST",
    ) {
      const headers: Record<string, string> = {};
      if (datos !== undefined) headers["Content-Type"] = "application/json";
      if (cookie) headers.Cookie = cookie;
      return fetch(base + ruta, {
        method: metodo,
        headers,
        body: datos !== undefined ? JSON.stringify(datos) : undefined,
      });
    }

    async function ok(r: Response, estado = 200) {
      assert.equal(r.status, estado, await r.clone().text());
      return (await r.json()).datos;
    }

    async function entrar(correo: string) {
      const r = await pedir("/api/auth/login", {
        correo,
        password: "Password123!",
      });
      assert.equal(r.status, 200, await r.clone().text());
      return r.headers.get("set-cookie")!.split(";")[0];
    }

    async function crearCuenta(c: any, rol: string) {
      const n = ++secuencia;
      const correo = `notifb09${process.pid}${n}@example.invalid`;
      const hash = (
        await c.query(
          'SELECT contrasena_hash h FROM ticket_trade."Cuenta" WHERE id_cuenta=1004',
        )
      ).rows[0].h;
      const id = (
        await c.query(
          `INSERT INTO ticket_trade."Cuenta"(nombres,primer_apellido,segundo_apellido,correo,contrasena_hash,correo_confirmado_en,id_tipo_cuenta,id_estado_cuenta)
           VALUES('Prueba','B09','Notif',$1,$2,clock_timestamp(),(SELECT id_tipo_cuenta FROM ticket_trade."TipoCuenta" WHERE nombre='Común'),(SELECT id_estado_cuenta FROM ticket_trade."EstadoCuenta" WHERE nombre='Activa'))
           RETURNING id_cuenta::text id`,
          [correo, hash],
        )
      ).rows[0].id;
      await c.query(
        `INSERT INTO ticket_trade."PerfilUsuario"(id_cuenta,id_rol_registro) VALUES($1,(SELECT id_rol_registro FROM ticket_trade."RolRegistro" WHERE nombre=$2))`,
        [id, rol],
      );
      if (rol === "Estudiante") {
        await c.query(
          `INSERT INTO ticket_trade."Estudiante"(id_cuenta,boleta) VALUES($1,$2)`,
          [id, `2027${String(100000 + n).padStart(6, "0")}`],
        );
      }
      return { id, correo };
    }

    async function crearEvento(
      c: any,
      opciones: {
        estadoEvento?: string;
        conSolicitud?: boolean;
        fecha: string;
        aforo?: number;
      },
    ) {
      const cartel = (
        await c.query(
          'SELECT id_archivo_cartel FROM ticket_trade."Evento" WHERE id_archivo_cartel IS NOT NULL LIMIT 1',
        )
      ).rows[0].id_archivo_cartel;
      const estadoEvento = opciones.estadoEvento || "Borrador";
      const idEvento = (
        await c.query(
          `INSERT INTO ticket_trade."Evento"(id_cuenta_organizadora,titulo,descripcion,correo_contacto,telefono_contacto,id_categoria_evento,id_visibilidad_evento,id_archivo_cartel,id_estado_evento,publicado_en)
           VALUES(1003,'Evento de prueba','Evento para pruebas de notificaciones','org@example.invalid','5555555555',(SELECT id_categoria_evento FROM ticket_trade."CategoriaEvento" WHERE nombre='Congreso'),(SELECT id_visibilidad_evento FROM ticket_trade."VisibilidadEvento" WHERE nombre='Público'),$1,(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre=$2),$3)
           RETURNING id_evento::text id`,
          [
            cartel,
            estadoEvento,
            estadoEvento === "Publicado" ? new Date() : null,
          ],
        )
      ).rows[0].id;
      const idActividad = (
        await c.query(
          `INSERT INTO ticket_trade."Actividad"(id_evento,nombre,descripcion,fecha,hora_inicio,hora_fin,id_recinto,id_tipo_acceso,aforo_solicitado,id_estado_actividad)
           VALUES($1,'Actividad de prueba','Actividad para pruebas',$2,'10:00','11:00',1001,(SELECT id_tipo_acceso FROM ticket_trade."TipoAcceso" WHERE nombre='Registro sin asiento asignado'),$3,(SELECT id_estado_actividad FROM ticket_trade."EstadoActividad" WHERE nombre='Programada'))
           RETURNING id_actividad::text id`,
          [idEvento, opciones.fecha, opciones.aforo || 10],
        )
      ).rows[0].id;
      let idSolicitud: string | null = null;
      if (opciones.conSolicitud) {
        idSolicitud = (
          await c.query(
            `INSERT INTO ticket_trade."SolicitudEvento"(id_evento,id_tipo_tramite,id_tipo_anticipacion,motivo,id_estado_solicitud_evento,envio_inicial,inicio_revision,version_edicion)
             VALUES($1,(SELECT id_tipo_tramite FROM ticket_trade."TipoTramite" WHERE nombre='Solicitud inicial'),(SELECT id_tipo_anticipacion FROM ticket_trade."TipoAnticipacion" WHERE nombre='Ordinaria'),'Solicitud de prueba',(SELECT id_estado_solicitud_evento FROM ticket_trade."EstadoSolicitudEvento" WHERE nombre='En revisión'),clock_timestamp(),clock_timestamp(),1)
             RETURNING id_solicitud_evento::text id`,
            [idEvento],
          )
        ).rows[0].id;
      }
      return { idEvento, idActividad, idSolicitud };
    }

    async function reservasConfirmadas(
      idEvento: string,
      idActividad: string,
      cantidad: number,
    ) {
      return conTransaccion(async (c) => {
        const ids: string[] = [];
        for (let i = 0; i < cantidad; i++) {
          const cuenta = await crearCuenta(c, "Externo");
          const idBoleto = (
            await c.query(
              `INSERT INTO ticket_trade."BoletoEvento"(id_cuenta,id_evento,codigo_qr,codigo_manual) VALUES($1,$2,$3,$4) RETURNING id_boleto_evento::text id`,
              [
                cuenta.id,
                idEvento,
                crypto.randomBytes(32).toString("hex"),
                crypto.randomBytes(8).toString("hex").toUpperCase(),
              ],
            )
          ).rows[0].id;
          const idCompromiso = (
            await c.query(
              `INSERT INTO ticket_trade."CompromisoCupo"(id_actividad,id_estado_compromiso_cupo) VALUES($1,(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Activo')) RETURNING id_compromiso_cupo::text id`,
              [idActividad],
            )
          ).rows[0].id;
          const idReservacion = (
            await c.query(
              `INSERT INTO ticket_trade."Reservacion"(id_boleto_evento,id_compromiso_cupo,confirmada_en,id_estado_reservacion) VALUES($1,$2,clock_timestamp(),(SELECT id_estado_reservacion FROM ticket_trade."EstadoReservacion" WHERE nombre='Confirmada')) RETURNING id_reservacion::text id`,
              [idBoleto, idCompromiso],
            )
          ).rows[0].id;
          ids.push(idReservacion);
        }
        return ids;
      });
    }

    async function expedientePendiente(correo: string, motivo: string) {
      const cookie = await entrar(correo);
      const pdf = await readFile(
        new URL("./fixtures/documento-identidad-prueba.pdf", import.meta.url),
      );
      const subida = await fetch(
        base + "/api/archivos?nombre=" + encodeURIComponent("documento.pdf"),
        {
          method: "POST",
          headers: { "Content-Type": "application/pdf", Cookie: cookie },
          body: new Uint8Array(pdf),
        },
      );
      const archivo = await ok(subida, 201);
      const creado = await ok(
        await pedir(
          "/api/auth/expediente",
          {
            motivoSolicitud: motivo,
            documentos: [{ id: archivo.id, tipo: "constancia" }],
          },
          cookie,
        ),
        201,
      );
      return { id: creado.id as string, cookie };
    }

    async function apartarYConfirmar(correo: string, idActividad: string) {
      const cookie = await entrar(correo);
      const apartado = await ok(
        await pedir("/api/taquilla/apartados", { idActividad }, cookie),
        201,
      );
      const reserva = await ok(
        await pedir(
          `/api/taquilla/apartados/${apartado.id}/confirmacion`,
          {},
          cookie,
        ),
        201,
      );
      return {
        cookie,
        idApartado: apartado.id as string,
        idReserva: reserva.id as string,
      };
    }

    async function avisos(cuenta: string) {
      return (
        await pool.query(
          `SELECT id_notificacion::text id,tipo,titulo,mensaje,referencia_destino enlace,(leida_en IS NOT NULL) leida FROM ticket_trade."Notificacion" WHERE id_cuenta_destinataria=$1 ORDER BY id_notificacion`,
          [cuenta],
        )
      ).rows;
    }

    async function contar(cuenta: string, tipo: string) {
      return (
        await pool.query(
          `SELECT count(*)::int n FROM ticket_trade."Notificacion" WHERE id_cuenta_destinataria=$1 AND tipo=$2`,
          [cuenta, tipo],
        )
      ).rows[0].n as number;
    }

    const sub = await entrar("cuenta1002@example.invalid");

    const decisionesExpediente = [
      { decision: "Aprobada", titulo: "Tu expediente fue aprobado" },
      { decision: "Rechazada", titulo: "Tu expediente fue rechazado" },
      { decision: "Requiere corrección", titulo: "Tu expediente requiere corrección" },
    ];
    for (const [i, caso] of decisionesExpediente.entries()) {
      const alumno = await conTransaccion((c) => crearCuenta(c, "Estudiante"));
      const expediente = await expedientePendiente(
        alumno.correo,
        "Documentos de prueba",
      );
      const motivo = `Motivo de prueba ${i + 1}`;
      await ok(
        await pedir(
          `/api/auth/expedientes/${expediente.id}/resolucion`,
          { decision: caso.decision, motivo },
          sub,
        ),
      );
      const filas = (await avisos(alumno.id)).filter(
        (n: any) => n.tipo === `expediente_resolucion:${expediente.id}`,
      );
      assert.equal(filas.length, 1);
      assert.equal(filas[0].titulo, caso.titulo);
      assert.ok(filas[0].mensaje.includes(`Motivo: ${motivo}`));
      assert.ok(filas[0].mensaje.includes("Siguiente paso:"));
      assert.equal(filas[0].enlace, "/mi-expediente");
      const reintento = await pedir(
        `/api/auth/expedientes/${expediente.id}/resolucion`,
        { decision: caso.decision, motivo },
        sub,
      );
      assert.equal(reintento.status, 409);
      assert.equal(
        (await avisos(alumno.id)).filter(
          (n: any) => n.tipo === `expediente_resolucion:${expediente.id}`,
        ).length,
        1,
      );
    }

    const casosEvento = [
      {
        decision: "Aprobada",
        titulo: "Solicitud de evento: Aprobada",
        fecha: "2030-01-15",
      },
      {
        decision: "Devuelta",
        titulo: "Solicitud de evento: Requiere corrección",
        fecha: "2030-01-16",
      },
      {
        decision: "Rechazada",
        titulo: "Solicitud de evento: Rechazada",
        fecha: "2030-01-17",
      },
    ];
    for (const [i, caso] of casosEvento.entries()) {
      const evento = await conTransaccion((c) =>
        crearEvento(c, { conSolicitud: true, fecha: caso.fecha }),
      );
      const motivo = `Dictamen de prueba ${i + 1}`;
      await ok(
        await pedir(
          `/api/organizacion/solicitudes/${evento.idSolicitud}/resolucion`,
          { decision: caso.decision, mensaje: motivo, version: 1 },
          sub,
        ),
      );
      const filas = (await avisos("1003")).filter(
        (n: any) => n.tipo === `evento_resolucion:${evento.idSolicitud}:1`,
      );
      assert.equal(filas.length, 1);
      assert.equal(filas[0].titulo, caso.titulo);
      assert.ok(filas[0].mensaje.includes(`Motivo: ${motivo}`));
      assert.ok(filas[0].mensaje.includes("Siguiente paso:"));
      assert.equal(
        filas[0].enlace,
        `/organizador/solicitudes/${evento.idSolicitud}`,
      );
      const reintento = await pedir(
        `/api/organizacion/solicitudes/${evento.idSolicitud}/resolucion`,
        { decision: caso.decision, mensaje: motivo, version: 1 },
        sub,
      );
      assert.equal(reintento.status, 409);
      assert.equal(
        (await avisos("1003")).filter(
          (n: any) => n.tipo === `evento_resolucion:${evento.idSolicitud}:1`,
        ).length,
        1,
      );
    }

    const crearActividad = (fecha: string) =>
      conTransaccion((c) =>
        crearEvento(c, { estadoEvento: "Publicado", fecha, aforo: 10 }),
      );

    const actividadA = await crearActividad("2030-02-15");
    await reservasConfirmadas(actividadA.idEvento, actividadA.idActividad, 8);
    assert.equal(await contar("1003", `actividad_90:${actividadA.idActividad}`), 0);
    const primera = await apartarYConfirmar(
      "cuenta1004@example.invalid",
      actividadA.idActividad,
    );
    assert.equal(await contar("1003", `actividad_90:${actividadA.idActividad}`), 1);
    const avisoA = (await avisos("1003")).find(
      (n: any) => n.tipo === `actividad_90:${actividadA.idActividad}`,
    );
    assert.ok(avisoA);
    assert.ok(avisoA.mensaje.includes("9 de 10"));
    assert.ok(avisoA.mensaje.includes("90%"));
    assert.equal(avisoA.enlace, `/organizador/eventos/${actividadA.idEvento}`);
    const repetida = await pedir(
      `/api/taquilla/apartados/${primera.idApartado}/confirmacion`,
      {},
      primera.cookie,
    );
    assert.equal(repetida.status, 200);
    assert.equal(await contar("1003", `actividad_90:${actividadA.idActividad}`), 1);
    await ok(
      await pedir(
        `/api/taquilla/reservaciones/${primera.idReserva}/cancelacion`,
        {},
        primera.cookie,
      ),
    );
    const segunda = await apartarYConfirmar(
      "cuenta1004@example.invalid",
      actividadA.idActividad,
    );
    assert.ok(segunda.idReserva);
    assert.equal(await contar("1003", `actividad_90:${actividadA.idActividad}`), 1);

    const actividadB = await crearActividad("2030-02-16");
    await reservasConfirmadas(actividadB.idEvento, actividadB.idActividad, 9);
    await apartarYConfirmar("cuenta1005@example.invalid", actividadB.idActividad);
    assert.equal(await contar("1003", `actividad_90:${actividadB.idActividad}`), 0);

    const actividadC = await crearActividad("2030-02-17");
    const reservasC = await reservasConfirmadas(
      actividadC.idEvento,
      actividadC.idActividad,
      8,
    );
    await conTransaccion(async (c) => {
      for (const idReservacion of reservasC) {
        await c.query(
          `INSERT INTO ticket_trade."EntradaOrdinaria"(id_reservacion,id_cuenta_operadora,registrada_en) VALUES($1,1001,clock_timestamp())`,
          [idReservacion],
        );
      }
    });
    await apartarYConfirmar("cuenta1006@example.invalid", actividadC.idActividad);
    assert.equal(await contar("1003", `actividad_90:${actividadC.idActividad}`), 1);

    const actividadD = await crearActividad("2030-02-18");
    await reservasConfirmadas(actividadD.idEvento, actividadD.idActividad, 8);
    const cookie5 = await entrar("cuenta1005@example.invalid");
    const cookie6 = await entrar("cuenta1006@example.invalid");
    const apartado5 = await ok(
      await pedir(
        "/api/taquilla/apartados",
        { idActividad: actividadD.idActividad },
        cookie5,
      ),
      201,
    );
    const apartado6 = await ok(
      await pedir(
        "/api/taquilla/apartados",
        { idActividad: actividadD.idActividad },
        cookie6,
      ),
      201,
    );
    const [res5, res6] = await Promise.all([
      pedir(
        `/api/taquilla/apartados/${apartado5.id}/confirmacion`,
        {},
        cookie5,
      ),
      pedir(
        `/api/taquilla/apartados/${apartado6.id}/confirmacion`,
        {},
        cookie6,
      ),
    ]);
    assert.equal(res5.status, 201);
    assert.equal(res6.status, 201);
    assert.equal(await contar("1003", `actividad_90:${actividadD.idActividad}`), 1);

    const aviso = (await avisos("1003")).find(
      (n: any) => n.tipo === `actividad_90:${actividadA.idActividad}`,
    )!;
    const cookie3 = await entrar("cuenta1003@example.invalid");
    const cookie4 = await entrar("cuenta1004@example.invalid");
    const estado3 = await ok(
      await pedir("/api/estado", undefined, cookie3, "GET"),
    );
    const enBandeja = estado3.listaNotificaciones.find(
      (n: any) => n.id === aviso.id,
    );
    assert.ok(enBandeja);
    assert.equal(enBandeja.titulo, aviso.titulo);
    assert.ok(enBandeja.mensaje.includes("Siguiente paso:"));
    assert.equal(enBandeja.enlace, `/organizador/eventos/${actividadA.idEvento}`);
    assert.equal(enBandeja.leida, false);
    assert.equal(typeof enBandeja.fecha, "string");
    assert.equal(
      (
        await pedir(
          `/api/estado/notificaciones/${aviso.id}/leida`,
          {},
          cookie4,
          "PATCH",
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await pedir(
          `/api/estado/notificaciones/${aviso.id}/leida`,
          {},
          cookie3,
          "PATCH",
        )
      ).status,
      200,
    );
    const leidaEn = (
      await pool.query(
        'SELECT leida_en FROM ticket_trade."Notificacion" WHERE id_notificacion=$1',
        [aviso.id],
      )
    ).rows[0].leida_en;
    assert.ok(leidaEn);
    const estado3b = await ok(
      await pedir("/api/estado", undefined, cookie3, "GET"),
    );
    assert.equal(
      estado3b.listaNotificaciones.find((n: any) => n.id === aviso.id).leida,
      true,
    );
    const estado4 = await ok(
      await pedir("/api/estado", undefined, cookie4, "GET"),
    );
    assert.equal(
      estado4.listaNotificaciones.some((n: any) => n.id === aviso.id),
      false,
    );

    const tipoIdem = `idem:${crypto.randomUUID()}`;
    await conTransaccion(async (c) => {
      await registrarAvisoBandeja(c, {
        destinatario: "1004",
        tipo: tipoIdem,
        titulo: "Prueba",
        mensaje: "Prueba",
        referencia: "/mi-expediente",
      });
      await registrarAvisoBandeja(c, {
        destinatario: "1004",
        tipo: tipoIdem,
        titulo: "Prueba",
        mensaje: "Prueba",
        referencia: "/mi-expediente",
      });
    });
    assert.equal(await contar("1004", tipoIdem), 1);
    await pool.query(
      'DELETE FROM ticket_trade."Notificacion" WHERE tipo=$1',
      [tipoIdem],
    );
  },
);
