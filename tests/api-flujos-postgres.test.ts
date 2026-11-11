import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";

test(
  "PostgreSQL: registro, tokens, PDF privado, revisión, cartel, solicitud, cupo concurrente y persistencia",
  { skip: !process.env.TT_API_PRUEBAS },
  async (t) => {
    const { app } = await import("../backend/app");
    const { pool } = await import("../backend/bd/pool");
    const bd = (await pool.query("SELECT current_database() n")).rows[0].n;
    assert.ok(
      /^tt_pruebas_[a-f0-9]{16}$/.test(bd) &&
        bd === process.env.TT_BD_DESECHABLE,
      "Ejecuta npm run test:postgres.",
    );
    let servidor = http.createServer(app);
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    let base = `http://127.0.0.1:${(servidor.address() as any).port}`;
    t.after(async () => {
      await new Promise<void>((r) => servidor.close(() => r()));
      await pool.end();
    });
    async function pedir(ruta: string, cuerpo?: unknown, cookie?: string) {
      return fetch(base + ruta, {
        method: cuerpo === undefined ? "GET" : "POST",
        headers: {
          ...(cuerpo === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
    }
    async function ok(r: Response, estado = 200) {
      assert.equal(r.status, estado, await r.clone().text());
      return (await r.json()).datos;
    }
    async function entrar(correo: string, password = "Password123!") {
      const r = await pedir("/api/auth/login", { correo, password });
      await ok(r);
      return r.headers.get("set-cookie")!.split(";")[0];
    }
    const password = "ClaveSegura-9385";
    const cuerpo = {
      nombres: "José Ángel",
      primerApellido: "Muñoz",
      segundoApellido: "García",
      correo: "jose.flujo@alumno.ipn.mx",
      password,
      rol: "Estudiante",
      boleta: "2026630777",
    };
    assert.equal(
      (
        await pedir("/api/auth/registro", {
          ...cuerpo,
          correo: "jose@alumno.ipn.mx.evil.test",
        })
      ).status,
      422,
    );
    const registro = await ok(await pedir("/api/auth/registro", cuerpo), 201);
    assert.match(registro.codigoPrueba, /^[a-f0-9]{64}$/);
    const cuenta = (
      await pool.query(
        'SELECT * FROM ticket_trade."Cuenta" WHERE id_cuenta=$1',
        [registro.id],
      )
    ).rows[0];
    assert.equal(cuenta.nombres, "José Ángel");
    assert.notEqual(cuenta.contrasena_hash, password);
    assert.equal(
      (await pedir("/api/auth/confirmar-correo", { correo: cuerpo.correo }))
        .status,
      422,
      "El correo solo no confirma la cuenta",
    );
    assert.equal(
      (await pedir("/api/auth/login", { correo: cuerpo.correo, password }))
        .status,
      403,
      "La cuenta pendiente no entra",
    );
    assert.equal(
      (
        await pedir("/api/auth/restablecer-password", {
          token: registro.codigoPrueba,
          password,
        })
      ).status,
      422,
      "No intercambia propósitos de token",
    );
    await pool.query(
      "UPDATE ticket_trade.\"TokenCuenta\" SET vence_en=CURRENT_TIMESTAMP-interval '1 minute' WHERE id_cuenta=$1",
      [registro.id],
    );
    assert.equal(
      (
        await pedir("/api/auth/confirmar-correo", {
          token: registro.codigoPrueba,
        })
      ).status,
      422,
      "Rechaza códigos vencidos",
    );
    const reenviado = await ok(
      await pedir("/api/auth/reenviar-confirmacion", { correo: cuerpo.correo }),
    );
    registro.codigoPrueba = reenviado.codigoPrueba;
    await ok(
      await pedir("/api/auth/confirmar-correo", {
        token: registro.codigoPrueba,
      }),
    );
    assert.equal(
      (
        await pedir("/api/auth/confirmar-correo", {
          token: registro.codigoPrueba,
        })
      ).status,
      422,
      "Código de un solo uso",
    );
    assert.equal(
      (
        await pedir("/api/auth/login", {
          correo: cuerpo.correo,
          password: "Regina504+",
        })
      ).status,
      401,
      "No hay contraseña universal",
    );
    const cookie = await entrar(cuerpo.correo, password);
    assert.equal(
      (await pedir("/api/auth/usuarios", undefined, cookie)).status,
      403,
    );
    const pdf = await readFile(
      new URL("./fixtures/documento-identidad-prueba.pdf", import.meta.url),
    );
    async function subir(
      bytes: Buffer,
      nombre: string,
      mime: string,
      sesion: string,
    ) {
      return fetch(
        base + "/api/archivos?nombre=" + encodeURIComponent(nombre),
        {
          method: "POST",
          headers: { "Content-Type": mime, Cookie: sesion },
          body: new Uint8Array(bytes),
        },
      );
    }
    assert.equal(
      (
        await subir(
          Buffer.from("no es PDF"),
          "falso.pdf",
          "application/pdf",
          cookie,
        )
      ).status,
      422,
    );
    const archivo = await ok(
      await subir(pdf, "constancia-Muñoz.pdf", "application/pdf", cookie),
      201,
    );
    assert.deepEqual(
      (
        await pool.query(
          "SELECT contenido FROM infra.archivo_contenido WHERE id_archivo=$1",
          [archivo.id],
        )
      ).rows[0].contenido,
      pdf,
    );
    assert.equal(
      (await pedir("/api/archivos/" + archivo.id)).status,
      403,
      "PDF privado",
    );
    assert.deepEqual(
      Buffer.from(
        await (
          await pedir("/api/archivos/" + archivo.id, undefined, cookie)
        ).arrayBuffer(),
      ),
      pdf,
    );
    const sub = await entrar("cuenta1002@example.invalid");
    assert.equal(
      (await pedir("/api/archivos/" + archivo.id, undefined, sub)).status,
      403,
      "Un archivo sin enviar aún no es revisable",
    );
    const expediente = await ok(
      await pedir(
        "/api/auth/expediente",
        {
          motivoSolicitud: "Organizar charlas de algoritmos",
          documentos: [{ id: archivo.id, tipo: "constancia" }],
        },
        cookie,
      ),
      201,
    );
    assert.equal(expediente.usuario.estadoExpediente, "en_revision");
    assert.equal(
      (await pedir("/api/archivos/" + archivo.id, undefined, sub)).status,
      200,
    );
    assert.equal(
      (
        await pedir(
          "/api/auth/expedientes/" + expediente.id + "/resolucion",
          { decision: "Aprobada", motivo: "Yo mismo" },
          cookie,
        )
      ).status,
      403,
    );
    await ok(
      await pedir(
        "/api/auth/expedientes/" + expediente.id + "/resolucion",
        { decision: "Aprobada", motivo: "Constancia vigente revisada" },
        sub,
      ),
    );
    assert.equal(
      (await ok(await pedir("/api/auth/yo", undefined, cookie))).usuario
        .esVerificado,
      true,
    );
    assert.equal(
      (
        await pedir(
          "/api/auth/expedientes/" + expediente.id + "/resolucion",
          { decision: "Aprobada", motivo: "Duplicado" },
          sub,
        )
      ).status,
      409,
    );
    const png = await readFile(
      new URL("../public/imagenes/eventos/simposio-ia.jpg", import.meta.url),
    );
    const cartel = await ok(
      await subir(png, "cartel.jpg", "image/jpeg", cookie),
      201,
    );
    const solicitud = {
      tituloEvento: "Encuentro de algoritmos y cómputo",
      descripcionEvento:
        "Una jornada académica con acentos: programación y análisis.",
      categoria: "Conferencia",
      correoContacto: cuerpo.correo,
      telefonoContacto: "5557296000",
      idArchivoCartel: cartel.id,
      enviar: true,
      fechasSolicitadas: [
        {
          nombreActividad: "Análisis de algoritmos",
          fecha: "2099-10-24",
          horaInicio: "10:00",
          horaFin: "12:00",
          idRecinto: "1001",
          modalidadAsistencia: "controlado",
          asistenciaEstimada: 2,
        },
      ],
    };
    const s = await ok(
      await pedir(
        "/api/organizacion/solicitudes",
        { ...solicitud, enviar: false },
        cookie,
      ),
      201,
    );
    const corregir = (version: number) =>
      fetch(base + "/api/organizacion/solicitudes/" + s.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          ...solicitud,
          visibilidad: "publico",
          version,
          enviar: true,
        }),
      });
    await ok(await corregir(1));
    assert.equal(
      (await corregir(1)).status,
      409,
      "No modifica una versión obsoleta",
    );
    await ok(
      await pedir(
        "/api/organizacion/solicitudes/" + s.id + "/resolucion",
        {
          decision: "Devuelta",
          mensaje: "Completar la descripción de la actividad",
          version: 2,
        },
        sub,
      ),
    );
    const devuelta = (
      await ok(await pedir("/api/estado", undefined, cookie))
    ).listaSolicitudes.find((x: any) => x.id === s.id);
    assert.equal(devuelta.estado, "requiere_correccion");
    assert.equal(devuelta.version, 2);
    await ok(await corregir(2));
    await ok(
      await pedir(
        "/api/organizacion/solicitudes/" + s.id + "/resolucion",
        { decision: "Aprobada", version: 3 },
        sub,
      ),
    );

    const catalogo = await ok(await pedir("/api/eventos"));
    const evento = catalogo.find((e: any) => e.id === s.idEvento);
    assert.equal(evento.titulo, solicitud.tituloEvento);
    assert.equal(evento.urlImagen, "/api/archivos/" + cartel.id);
    assert.equal(
      (await pedir(evento.urlImagen)).status,
      200,
      "Cartel publicado es visible al público",
    );
    const actividad = evento.fechas[0].id;
    const lugares = await ok(
      await pedir("/api/taquilla/actividades/" + actividad + "/lugares"),
    );
    assert.ok(lugares.lugares.length >= 2);
    const estudiante = await entrar("cuenta1004@example.invalid");
    const carreras = await Promise.all(
      [cookie, estudiante].map((c) =>
        pedir(
          "/api/taquilla/apartados",
          { idActividad: actividad, idLugar: lugares.lugares[0].id },
          c,
        ),
      ),
    );
    assert.deepEqual(
      carreras.map((r) => r.status).sort(),
      [201, 409],
      "Dos sesiones no apartan el mismo asiento",
    );
    const ganador = carreras[0].status === 201 ? cookie : estudiante;
    const ap = await ok(
      carreras.find((r) => r.status === 201)!,
      201,
    );
    const reserva = await ok(
      await pedir(
        "/api/taquilla/apartados/" + ap.id + "/confirmacion",
        {},
        ganador,
      ),
      201,
    );
    assert.equal(
      (
        await pedir(
          "/api/taquilla/apartados/" + ap.id + "/confirmacion",
          {},
          ganador,
        )
      ).status,
      409,
      "No duplica la confirmación",
    );
    const boleto = (
      await ok(await pedir("/api/taquilla/mis-boletos", undefined, ganador))
    ).find((b: any) => b.id_reservacion === reserva.id);
    assert.ok(boleto.codigo_qr);
    assert.match(
      boleto.fecha,
      /^\d{4}-\d{2}-\d{2}$/,
      "La fecha académica no se transforma en un instante UTC",
    );
    const admin = await entrar("cuenta1001@example.invalid");
    assert.equal(
      (
        await pedir(
          "/api/taquilla/checkin",
          { idActividad: actividad, codigo: boleto.codigo_qr },
          ganador,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await pedir(
          "/api/taquilla/checkin",
          { idActividad: actividad, codigo: boleto.codigo_qr },
          admin,
        )
      ).status,
      409,
      "Respeta la ventana de ingreso",
    );
    // Reiniciar HTTP prueba que la sesión y la reserva no dependían de variables del proceso ni del navegador.
    await new Promise<void>((r) => servidor.close(() => r()));
    servidor = http.createServer(app);
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(servidor.address() as any).port}`;
    assert.ok(
      (
        await ok(await pedir("/api/taquilla/mis-boletos", undefined, ganador))
      ).some((b: any) => b.id_reservacion === reserva.id),
    );
    await ok(
      await pedir(
        "/api/taquilla/reservaciones/" + reserva.id + "/cancelacion",
        {},
        ganador,
      ),
    );
    assert.equal(
      (
        await pool.query(
          `SELECT ec.nombre FROM ticket_trade."CompromisoCupo" cp JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE cp.id_compromiso_cupo=$1`,
          [ap.id],
        )
      ).rows[0].nombre,
      "Liberado",
    );
    const vencido = await ok(
      await pedir(
        "/api/taquilla/apartados",
        { idActividad: actividad, idLugar: lugares.lugares[0].id },
        ganador,
      ),
      201,
    );
    await pool.query(
      `UPDATE ticket_trade."Apartado" SET creado_en=clock_timestamp()-interval '3 minutes' WHERE id_compromiso_cupo=$1`,
      [vencido.id],
    );
    assert.equal(
      (
        await pedir(
          "/api/taquilla/apartados/" + vencido.id + "/confirmacion",
          {},
          ganador,
        )
      ).status,
      409,
    );
    await ok(
      await pedir("/api/taquilla/actividades/" + actividad + "/lugares"),
    );
    assert.equal(
      (
        await pool.query(
          `SELECT ec.nombre FROM ticket_trade."CompromisoCupo" cp JOIN ticket_trade."EstadoCompromisoCupo" ec USING(id_estado_compromiso_cupo) WHERE cp.id_compromiso_cupo=$1`,
          [vencido.id],
        )
      ).rows[0].nombre,
      "Liberado",
      "La consulta libera los apartados vencidos",
    );
    const paraIngreso = await ok(
      await pedir(
        "/api/taquilla/apartados",
        { idActividad: actividad, idLugar: lugares.lugares[0].id },
        ganador,
      ),
      201,
    );
    await ok(
      await pedir(
        "/api/taquilla/apartados/" + paraIngreso.id + "/confirmacion",
        {},
        ganador,
      ),
      201,
    );
    // Reloj de aplicación controlado: la prueba también debe funcionar por la
    // noche, cuando el horario permitido por el modelo ya terminó.
    await pool.query(
      `UPDATE ticket_trade."Actividad" SET fecha=CURRENT_DATE,
    hora_inicio=time '12:00',hora_fin=time '13:00' WHERE id_actividad=$1`,
      [actividad],
    );
    const instanteIngreso = (await pool.query(`SELECT (CURRENT_DATE+time '12:15') AT TIME ZONE 'America/Mexico_City' instante`)).rows[0].instante;
    const relojIngreso = t.mock.method(Date, 'now', () => new Date(instanteIngreso).getTime());
    await ok(
      await pedir(
        "/api/taquilla/checkin",
        { idActividad: actividad, codigo: boleto.codigo_qr },
        admin,
      ),
    );
    assert.equal(
      (
        await pedir(
          "/api/taquilla/checkin",
          { idActividad: actividad, codigo: boleto.codigo_qr },
          admin,
        )
      ).status,
      409,
      "Rechaza un QR reutilizado",
    );
    assert.equal(
      (
        await pool.query(
          `SELECT count(*)::int n FROM ticket_trade."EntradaOrdinaria" en JOIN ticket_trade."Reservacion" r USING(id_reservacion) JOIN ticket_trade."CompromisoCupo" cp USING(id_compromiso_cupo) WHERE cp.id_actividad=$1`,
          [actividad],
        )
      ).rows[0].n,
      1,
    );
    relojIngreso.mock.restore();
    const recuperacion = await ok(
      await pedir("/api/auth/recuperacion", { correo: cuerpo.correo }),
    );
    await ok(
      await pedir("/api/auth/restablecer-password", {
        token: recuperacion.codigoPrueba,
        password: "NuevaClave-8395",
      }),
    );
    assert.equal(
      (await pedir("/api/auth/yo", undefined, cookie)).status,
      401,
      "Cambiar contraseña revoca sesiones",
    );
    assert.equal(
      (
        await pedir("/api/auth/restablecer-password", {
          token: recuperacion.codigoPrueba,
          password,
        })
      ).status,
      422,
    );
    await entrar(cuerpo.correo, "NuevaClave-8395");
    await pool.query("SELECT ticket_trade.validar_integridad()");
  },
);
