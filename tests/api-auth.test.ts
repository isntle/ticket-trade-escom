import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  verificarContrasena,
  hashContrasena,
} from "../backend/comun/seguridad";
test("Contraseñas: hash real, rechazo de texto plano y de valores malformados", async () => {
  const hash = await hashContrasena("ClavePrueba-SoloTest-938");
  assert.equal(
    await verificarContrasena("ClavePrueba-SoloTest-938", hash),
    true,
  );
  assert.equal(await verificarContrasena("OtraClave", hash), false);
  assert.equal(await verificarContrasena("texto", "texto"), false);
  assert.equal(await verificarContrasena({}, hash), false);
  assert.equal(await verificarContrasena("texto", "scrypt:x:y"), false);
});
test(
  "PostgreSQL aislado: sesión revocable, borrador atómico y autorización",
  { skip: !process.env.TT_API_PRUEBAS },
  async (t) => {
    const { app } = await import("../backend/app");
    const { pool } = await import("../backend/bd/pool");
    const bd = (await pool.query("SELECT current_database() n")).rows[0].n;
    assert.ok(
      /^tt_pruebas_[a-f0-9]{16}$/.test(bd) &&
        bd === process.env.TT_BD_DESECHABLE,
      "Usa npm run test:postgres; esta prueba solo admite su base desechable.",
    );
    const originales = (
      await pool.query(
        'SELECT id_cuenta,contrasena_hash FROM ticket_trade."Cuenta" WHERE id_cuenta IN (1001,1002,1003,1004)',
      )
    ).rows;
    const servidor = http.createServer(app);
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${(servidor.address() as any).port}`;
    t.after(async () => {
      await pool.query(`BEGIN;
        DELETE FROM ticket_trade."ResolucionSolicitud" WHERE id_solicitud_evento IN (SELECT id_solicitud_evento FROM ticket_trade."SolicitudEvento" WHERE id_evento IN (SELECT id_evento FROM ticket_trade."Evento" WHERE titulo='Prueba API'));
        DELETE FROM ticket_trade."SolicitudEvento" WHERE id_evento IN (SELECT id_evento FROM ticket_trade."Evento" WHERE titulo='Prueba API');
        DELETE FROM ticket_trade."Actividad" WHERE id_evento IN (SELECT id_evento FROM ticket_trade."Evento" WHERE titulo='Prueba API');
        DELETE FROM ticket_trade."Evento" WHERE titulo='Prueba API';
        COMMIT;`);
      for (const cuenta of originales)
        await pool.query(
          'UPDATE ticket_trade."Cuenta" SET contrasena_hash=$1 WHERE id_cuenta=$2',
          [cuenta.contrasena_hash, cuenta.id_cuenta],
        );
      await new Promise<void>((r) => servidor.close(() => r()));
      await pool.end();
    });
    const clave = "Prueba-Aislada-938438";
    const hash = await hashContrasena(clave);
    await pool.query(
      'UPDATE ticket_trade."Cuenta" SET contrasena_hash=$1 WHERE id_cuenta IN (1001,1002,1003,1004)',
      [hash],
    );
    async function pedir(ruta: string, datos?: unknown, cookie?: string) {
      return fetch(base + ruta, {
        method: datos === undefined ? "GET" : "POST",
        headers: {
          ...(datos === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: datos === undefined ? undefined : JSON.stringify(datos),
      });
    }
    async function entrar(id: number) {
      const r = await pedir("/api/auth/login", {
        correo: `cuenta${id}@example.invalid`,
        password: clave,
      });
      assert.equal(r.status, 200);
      return r.headers.get("set-cookie")!.split(";")[0];
    }
    const invalido = await pedir("/api/auth/login", {
      correo: "cuenta1001@example.invalid",
      password: "clave-incorrecta",
    });
    assert.equal(invalido.status, 401);
    assert.equal(
      (await pedir("/api/auth/login", { correo: {}, password: clave })).status,
      400,
    );
    const cookie = await entrar(1001);
    assert.equal((await pedir("/api/auth/yo", undefined, cookie)).status, 200);
    assert.equal((await pedir("/api/auth/logout", {}, cookie)).status, 200);
    assert.equal(
      (await pedir("/api/auth/yo", undefined, cookie)).status,
      401,
      "La cookie copiada debe quedar revocada",
    );
    assert.equal((await pedir("/api/organizacion/solicitudes")).status, 401);
    const docente = await entrar(1003);
    const b = {
      tituloEvento: "Prueba API",
      descripcionEvento: "Persistencia real",
      categoria: "Taller",
      correoContacto: "contacto@example.invalid",
      telefonoContacto: "0000000000",
      idArchivoCartel: "1010",
      fechasSolicitadas: [
        {
          nombreActividad: "Actividad API",
          fecha: "2099-10-20",
          horaInicio: "12:00",
          horaFin: "13:00",
          idRecinto: "1001",
          modalidadAsistencia: "registro",
          asistenciaEstimada: 2,
        },
      ],
    };
    const r = await pedir("/api/organizacion/solicitudes", b, docente);
    assert.equal(r.status, 201, await r.clone().text());
    const guardado = (await r.json()).datos;
    const filas = await pool.query(
      'SELECT * FROM ticket_trade."Actividad" WHERE id_evento=$1',
      [guardado.idEvento],
    );
    assert.equal(filas.rowCount, 1);
    const antes = await pool.query(
      'SELECT count(*)::int n FROM ticket_trade."Evento"',
    );
    const fallo = await pedir(
      "/api/organizacion/solicitudes",
      { ...b, idArchivoCartel: null, enviar: true },
      docente,
    );
    assert.equal(fallo.status, 409);
    assert.deepEqual(
      (await pool.query('SELECT count(*)::int n FROM ticket_trade."Evento"'))
        .rows,
      antes.rows,
      "No deja un evento parcial",
    );
    const enviado = await pedir(
      "/api/organizacion/solicitudes",
      { ...b, enviar: true },
      docente,
    );
    assert.equal(enviado.status, 201);
    const id = (await enviado.json()).datos.id;
    assert.equal(
      (
        await pedir(
          `/api/organizacion/solicitudes/${id}/resolucion`,
          { decision: "Aprobada", version: 1 },
          docente,
        )
      ).status,
      403,
    );
    const sub = await entrar(1002);
    assert.equal(
      (
        await pedir(
          `/api/organizacion/solicitudes/${id}/resolucion`,
          { decision: "Aprobada", version: 1 },
          sub,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await pedir(
          `/api/organizacion/solicitudes/${id}/resolucion`,
          { decision: "Aprobada", version: 1 },
          sub,
        )
      ).status,
      409,
    );
    const publico = await (await pedir("/api/eventos")).json();
    assert.ok(publico.datos.some((e: any) => e.titulo === "Prueba API"));
    const { rows: privados } = await pool.query(
      `SELECT id_evento::text id FROM ticket_trade."Evento" WHERE id_estado_evento=(SELECT id_estado_evento FROM ticket_trade."EstadoEvento" WHERE nombre='Borrador')`,
    );
    assert.ok(
      !publico.datos.some((e: any) => privados.some((p) => p.id === e.id)),
      "No publica borradores",
    );

    // =========================================================================
    // PRUEBAS DE JEFATURAS DE ACADEMIA Y PERIODOS (TT012, ATRIBUCIÓN INSTITUCIONAL)
    // =========================================================================
    const estudiante = await entrar(1004);
    const administracion = await entrar(1001);

    // 1. Rechazo si la sesión no tiene permiso
    const sinPermiso = await pedir(
      "/api/auth/usuarios/1003/jefatura",
      { valor: false },
      estudiante,
    );
    assert.equal(sinPermiso.status, 403, "Estudiante no puede gestionar jefaturas");

    // 2. Retiro de jefatura por Administración y consulta desde otra sesión
    const retiroAdmin = await pedir(
      "/api/auth/usuarios/1003/jefatura",
      { valor: false, motivo: "Fin de nombramiento" },
      administracion, // cookie de cuenta 1001 (Administración)
    );
    assert.equal(retiroAdmin.status, 200, "Administración retira jefatura");
    // Consulta desde la sesión del docente (otra sesión)
    const yoDocenteSinJefatura = await (await pedir("/api/auth/yo", undefined, docente)).json();
    assert.equal(
      yoDocenteSinJefatura.datos.usuario.tieneJefaturaAcademica,
      false,
      "Docente ya no tiene autoaprobación tras retiro consultado desde su sesión",
    );

    // 3. Rechazo si la verificación fue retirada
    await pool.query(
      `UPDATE ticket_trade."Verificacion" SET retirada_en = CURRENT_TIMESTAMP, id_cuenta_retiro = 1001, motivo_retiro = 'Prueba de retiro' WHERE id_verificacion = 1001`,
    );
    const intentoVerifRetirada = await pedir(
      "/api/auth/usuarios/1003/jefatura",
      { valor: true, motivo: "Intento con verificación retirada", idOtorgante: "1002" },
      administracion,
    );
    assert.equal(intentoVerifRetirada.status, 422, "Rechaza si la verificación fue retirada");
    const jsonRetirada = await intentoVerifRetirada.json();
    assert.match(jsonRetirada.error.mensaje, /retirada/);

    // Restaurar verificación no retirada
    await pool.query(
      `UPDATE ticket_trade."Verificacion" SET retirada_en = NULL, id_cuenta_retiro = NULL, motivo_retiro = NULL WHERE id_verificacion = 1001`,
    );

    // 4. Rechazo si el otorgante no corresponde (cuenta que no es de Subdirección)
    const otorganteInvalido = await pedir(
      "/api/auth/usuarios/1003/jefatura",
      { valor: true, motivo: "Alta inválida", idOtorgante: "1004" }, // 1004 es estudiante
      administracion,
    );
    assert.equal(otorganteInvalido.status, 422, "Rechaza si el otorgante no es Subdirección");
    const jsonOtorgante = await otorganteInvalido.json();
    assert.match(jsonOtorgante.error.mensaje, /Subdirección/);

    // 5. Alta con persona verificada y otorgante elegible (Subdirección 1002, operado desde Administración)
    const altaExitosa = await pedir(
      "/api/auth/usuarios/1003/jefatura",
      { valor: true, motivo: "Nombramiento institucional vigente", idOtorgante: "1002", idAcademia: "1001" },
      administracion,
    );
    assert.equal(altaExitosa.status, 200, "Alta exitosa de jefatura");

    // Consulta desde la sesión de Docente (otra sesión)
    const yoDocenteConJefatura = await (await pedir("/api/auth/yo", undefined, docente)).json();
    assert.equal(
      yoDocenteConJefatura.datos.usuario.tieneJefaturaAcademica,
      true,
      "Docente refleja autoaprobación activa consultada desde su sesión",
    );

    // 6. Configuración de periodos escolares desde Administración
    const catalogo = await pedir("/api/auth/jefaturas/catalogo", undefined, administracion);
    assert.equal(catalogo.status, 200);
    assert.ok((await catalogo.json()).datos.academias.some((a: any) => a.id === "1001" && a.titular === "1003"));
    assert.equal((await pedir("/api/auth/jefaturas/catalogo", undefined, estudiante)).status, 403);
    const periodosActuales = (await (await pedir("/api/auth/periodos", undefined, administracion)).json()).datos;
    const periodosResp = await pedir(
      "/api/auth/periodos",
      {
        periodos: [
          ...periodosActuales,
          { id: "2099-1", inicio: "2099-02-01", fin: "2099-07-31" },
        ],
      },
      administracion,
    );
    assert.equal(periodosResp.status, 200, "Periodos guardados desde Administración");
    const periodosJson = await periodosResp.json();
    assert.ok(
      periodosJson.datos.periodos.some((p: any) => p.id === "2099-1"),
      "Nuevo periodo agregado a PostgreSQL",
    );
  },
);
