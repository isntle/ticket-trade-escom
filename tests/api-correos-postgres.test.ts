import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
test(
  "Correo PostgreSQL: rollback, cola cifrada, workers concurrentes y MIME PDF sin envío externo",
  { skip: !process.env.TT_API_PRUEBAS },
  async (t) => {
    const { pool, conTransaccion } = await import("../backend/bd/pool");
    const db = (await pool.query("SELECT current_database() nombre")).rows[0]
      .nombre;
    assert.equal(db, process.env.TT_BD_DESECHABLE);
    assert.match(String(db), /^tt_pruebas_/);
    t.after(() => pool.end());
    process.env.TT_CORREO_ACTIVO = "1";
    process.env.TT_CORREO_CLAVE = crypto.randomBytes(32).toString("base64");
    process.env.SMTP_FROM = "Ticket Trade <pruebas@example.invalid>";
    const { encolarCorreo, procesarCorreos } =
      await import("../backend/modulos/correos/servicio");
    const { crearToken } = await import("../backend/modulos/identidad/tokens");
    const id = (
      await pool.query(
        'SELECT id_cuenta::text id FROM ticket_trade."PerfilUsuario" ORDER BY id_cuenta LIMIT 1',
      )
    ).rows[0].id;
    await assert.rejects(
      conTransaccion(async (c) => {
        await encolarCorreo(c, id, "rollback", { tipo: "token" });
        throw Error("rollback");
      }),
    );
    assert.equal(
      (
        await pool.query(
          "SELECT 1 FROM infra.correo_salida WHERE clave='rollback'",
        )
      ).rowCount,
      0,
    );
    process.env.TT_MOSTRAR_CODIGOS = "0";
    const token = await conTransaccion((c) =>
      crearToken(c, id, "destino@example.invalid", "Confirmación de correo"),
    );
    assert.equal(token, undefined);
    const row = (await pool.query("SELECT contenido FROM infra.correo_salida"))
      .rows[0];
    assert.ok(!row.contenido.includes("destino"));
    const mensajes: Buffer[] = [];
    const smtp = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });
    const simulado = {
      sendMail: async (d: any) => {
        const x = await smtp.sendMail(d);
        mensajes.push(x.message as Buffer);
        return { accepted: [d.to], messageId: x.messageId };
      },
    };
    await Promise.all([
      procesarCorreos(10, simulado as any),
      procesarCorreos(10, simulado as any),
    ]);
    assert.equal(mensajes.length, 1);
    assert.match(mensajes[0].toString(), /Confirma/);
    assert.equal(
      (await pool.query("SELECT estado FROM infra.correo_salida")).rows[0]
        .estado,
      "aceptado",
    );
    await conTransaccion((c) =>
      encolarCorreo(c, id, "ambiguo", {
        tipo: "token",
        token: "bad",
        correo: "a@example.invalid",
      }),
    );
    // Token inexistente se omite, nunca se entrega.
    await procesarCorreos(10, simulado as any);
    assert.equal(mensajes.length, 1);

    // Un pase existente con una reserva alimenta el mismo PDF y el mismo QR.
    const pase = await conTransaccion(async (c) => {
      await c.query(
        'UPDATE ticket_trade."Cuenta" SET correo_confirmado_en=now() WHERE id_cuenta=$1',
        [id],
      );
      const actividades = (
        await c.query(
          `SELECT a.id_actividad::text id,a.id_evento::text evento,l.id_lugar_actividad::text lugar FROM ticket_trade."Actividad" a JOIN ticket_trade."LugarActividad" l USING(id_actividad) WHERE NOT EXISTS(SELECT 1 FROM ticket_trade."AsignacionAsiento" aa JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE aa.id_lugar_actividad=l.id_lugar_actividad AND ec.nombre='Activo') ORDER BY a.id_evento,a.id_actividad,l.id_lugar_actividad LIMIT 1`,
        )
      ).rows;
      const a = actividades[0];
      const b = (
        await c.query(
          'INSERT INTO ticket_trade."BoletoEvento"(id_cuenta,id_evento,codigo_qr,codigo_manual) VALUES($1,$2,$3,$4) RETURNING id_boleto_evento::text id',
          [id, a.evento, "f".repeat(64), "ABCDEF1234567890"],
        )
      ).rows[0];
      const cupo = (
        await c.query(
          `INSERT INTO ticket_trade."CompromisoCupo"(id_actividad,id_estado_compromiso_cupo) VALUES($1,(SELECT id_estado_compromiso_cupo FROM ticket_trade."EstadoCompromisoCupo" WHERE nombre='Activo')) RETURNING id_compromiso_cupo::text id`,
          [a.id],
        )
      ).rows[0];
      await c.query(
        'INSERT INTO ticket_trade."AsignacionAsiento"(id_compromiso_cupo,id_lugar_actividad) VALUES($1,$2)',
        [cupo.id, a.lugar],
      );
      await c.query(
        `INSERT INTO ticket_trade."Reservacion"(id_boleto_evento,id_compromiso_cupo,confirmada_en,id_estado_reservacion) VALUES($1,$2,now(),(SELECT id_estado_reservacion FROM ticket_trade."EstadoReservacion" WHERE nombre='Confirmada'))`,
        [b.id, cupo.id],
      );
      await encolarCorreo(c, id, "boleto-test", {
        tipo: "boleto",
        idPase: b.id,
      });
      return b.id;
    });
    await procesarCorreos(10, simulado as any);
    assert.equal(mensajes.length, 2);
    assert.match(mensajes[1].toString(), /application\/pdf/);
    assert.match(mensajes[1].toString(), /qr-tickettrade/);
    const { leerBoleto } = await import("../backend/modulos/correos/boleto");
    assert.equal(
      (await conTransaccion((c) => leerBoleto(c, pase, id))).qr,
      "f".repeat(64),
    );
    await assert.rejects(conTransaccion((c) => leerBoleto(c, pase, "999999")));
    // Un timeout no se reintenta automáticamente: puede haberse entregado.
    await conTransaccion((c) =>
      encolarCorreo(c, id, "incierto-test", { tipo: "boleto", idPase: pase }),
    );
    await procesarCorreos(10, {
      sendMail: async () => {
        throw Error("timeout");
      },
    } as any);
    assert.equal(
      (
        await pool.query(
          "SELECT estado FROM infra.correo_salida WHERE clave='incierto-test'",
        )
      ).rows[0].estado,
      "incierto",
    );
    await procesarCorreos(10, simulado as any);
    assert.equal(mensajes.length, 2);

    // SMTP local real: prueba del transporte por socket, sin destinatarios externos.
    const net = await import("node:net");
    let recibido = "";
    const servidor = net.createServer((socket) => {
      socket.write("220 localhost ESMTP\r\n");
      let resto = "",
        data = false,
        contenido = "";
      socket.on("data", (trozo) => {
        resto += trozo.toString();
        let pos: number;
        while ((pos = resto.indexOf("\r\n")) >= 0) {
          const l = resto.slice(0, pos);
          resto = resto.slice(pos + 2);
          if (data) {
            if (l === ".") {
              recibido = contenido;
              data = false;
              socket.write("250 aceptado\r\n");
            } else contenido += l + "\r\n";
          } else if (l.startsWith("EHLO")) socket.write("250 localhost\r\n");
          else if (l === "DATA") {
            data = true;
            socket.write("354 datos\r\n");
          } else if (l === "QUIT") {
            socket.end("221 adios\r\n");
          } else socket.write("250 OK\r\n");
        }
      });
    });
    await new Promise<void>((resolve) =>
      servidor.listen(0, "127.0.0.1", resolve),
    );
    t.after(
      () => new Promise<void>((resolve) => servidor.close(() => resolve())),
    );
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String((servidor.address() as any).port);
    process.env.SMTP_SECURE = "0";
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    await conTransaccion((c) =>
      encolarCorreo(c, id, "smtp-local", { tipo: "boleto", idPase: pase }),
    );
    await procesarCorreos();
    assert.match(recibido, /application\/pdf/);
    assert.match(recibido, /qr-tickettrade/);
    assert.equal(
      (
        await pool.query(
          "SELECT estado FROM infra.correo_salida WHERE clave='smtp-local'",
        )
      ).rows[0].estado,
      "aceptado",
    );

    const { encolarAviso } = await import("../backend/modulos/correos/avisos");
    await conTransaccion(async (c) => {
      await encolarAviso(
        c,
        id,
        "aviso-unico",
        "Tu verificación fue aprobada",
        "Datos <privados>",
        "/mi-expediente",
      );
      await encolarAviso(
        c,
        id,
        "aviso-unico",
        "Tu verificación fue aprobada",
        "Datos <privados>",
        "/mi-expediente",
      );
    });
    assert.equal(
      (
        await pool.query(
          "SELECT 1 FROM infra.correo_salida WHERE clave='aviso-unico'",
        )
      ).rowCount,
      1,
    );
    await procesarCorreos(10, simulado as any);
    assert.equal(mensajes.length, 3);
    process.env.TT_CORREO_LIMITE_DIARIO = "1";
    await conTransaccion((c) =>
      encolarAviso(
        c,
        id,
        "aviso-cuota",
        "Actualización",
        "Consulta tu cuenta",
        "/perfil",
      ),
    );
    assert.equal((await procesarCorreos(10, simulado as any)).procesados, 0);
    assert.equal(
      (
        await pool.query(
          "SELECT estado FROM infra.correo_salida WHERE clave='aviso-cuota'",
        )
      ).rows[0].estado,
      "pendiente",
    );
  },
);
