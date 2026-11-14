import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import {
  cifrar,
  descifrar,
  escapar,
} from "../backend/modulos/correos/seguridad";
import { generarPdfBoleto } from "../backend/modulos/correos/boleto";
test("Correo: contenido cifrado, integridad y escape HTML", () => {
  process.env.TT_CORREO_CLAVE = crypto.randomBytes(32).toString("base64");
  const entrada = { token: "secreto", correo: "prueba@example.invalid" };
  const c = cifrar(entrada);
  assert.ok(!c.includes("secreto"));
  assert.deepEqual(descifrar(c), entrada);
  const partes = c.split(".");
  partes[2] = Buffer.from("modificado").toString("base64");
  assert.throws(() => descifrar(partes.join(".")));
  assert.equal(escapar("<script>&"), "&lt;script&gt;&amp;");
});
test("PDF real: varias páginas, acentos y QR PNG del pase", async () => {
  const b = {
    id: "1",
    titulo: "Simposio de tecnologías · México",
    titular: "José Ángel Muñoz",
    correo: "prueba@example.invalid",
    qr: "a".repeat(64),
    actividades: Array.from({ length: 30 }, (_, i) => ({
      nombre: "Actividad " + i,
      fecha: "2026-12-01",
      inicio: "10:00",
      fin: "11:00",
      recinto: "Auditorio",
      lugar: "A1",
      estado: "valido",
    })),
  };
  const { pdf, png } = await generarPdfBoleto(b);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.ok((await PDFDocument.load(pdf)).getPageCount() > 1);
});

test("Configuración SMTP: faltantes, remitente, TLS y credenciales", async () => {
  const { configuracionSmtp } =
    await import("../backend/modulos/correos/configuracion");
  assert.throws(() => configuracionSmtp({}), /SMTP_HOST, SMTP_FROM/);
  const env = {
    SMTP_HOST: "smtp.example.invalid",
    SMTP_FROM: "Ticket Trade <boletos@example.invalid>",
    SMTP_PORT: "587",
    SMTP_SECURE: "0",
    SMTP_USER: "usuario",
    SMTP_PASSWORD: "secreto",
  };
  assert.equal(configuracionSmtp(env).requireTLS, true);
  assert.equal(configuracionSmtp(env).secure, false);
  assert.throws(
    () => configuracionSmtp({ ...env, SMTP_PORT: "465" }),
    /SMTP_SECURE/,
  );
  assert.throws(
    () => configuracionSmtp({ ...env, SMTP_PASSWORD: "" }),
    /SMTP_USER/,
  );
  assert.throws(
    () =>
      configuracionSmtp({
        ...env,
        SMTP_FROM: "correo\r\nBcc: otro@example.invalid",
      }),
    /SMTP_FROM/,
  );
  assert.throws(
    () => configuracionSmtp({ ...env, SMTP_PORT: "NaN" }),
    /SMTP_PORT/,
  );
  assert.equal(
    configuracionSmtp({
      SMTP_HOST: "127.0.0.1",
      SMTP_FROM: "local@example.invalid",
      SMTP_PORT: "2525",
    }).requireTLS,
    false,
  );
});

test("Plantillas personalizadas: sin HTML inyectado, actividades y botones correctos", async () => {
  const { plantillaToken, plantillaBoleto, plantillaAviso } =
    await import("../backend/modulos/correos/plantillas");
  const t = plantillaToken(
    "<Mariana>",
    false,
    "https://example.invalid/confirmar-correo?token=abc",
  );
  assert.match(t.html, /Hola, &lt;Mariana&gt;/);
  assert.match(t.html, /Confirmar mi correo/);
  assert.match(t.text, /24 horas/);
  assert.ok(!t.html.includes("<Mariana>"));
  const r = plantillaToken(
    "José",
    true,
    "https://example.invalid/recuperar-password",
  );
  assert.match(r.text, /30 minutos/);
  const b = plantillaBoleto(
    {
      id: "1",
      titulo: "<Simposio>",
      titular: "José",
      correo: "jose@example.invalid",
      qr: "x",
      actividades: [
        {
          nombre: "Mi taller",
          fecha: "2026-12-01",
          inicio: "10:00",
          fin: "12:00",
          recinto: "Laboratorio",
          lugar: "PC08",
          estado: "cancelado",
        },
      ],
    },
    "https://example.invalid/mis-reservaciones",
  );
  assert.match(b.html, /cid:qr-tickettrade/);
  assert.match(b.html, /PC08/);
  assert.match(b.html, /Reservación cancelada/);
  assert.match(b.html, /&lt;Simposio&gt;/);
  assert.ok(!b.html.includes("<script"));
  const a = plantillaAviso(
    "José",
    "Solicitud",
    "<img src=x onerror=alert(1)>",
    "https://example.invalid/mi-expediente",
  );
  assert.match(a.html, /&lt;img/);
  assert.throws(
    () => plantillaToken("x", false, "javascript:alert(1)"),
    /inválido/,
  );
});
