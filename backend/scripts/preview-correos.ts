import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  plantillaToken,
  plantillaBoleto,
  plantillaAviso,
} from "../modulos/correos/plantillas";
import { generarPdfBoleto } from "../modulos/correos/boleto";
const carpeta = path.resolve(
  process.argv[2] || path.join(os.tmpdir(), "tickettrade-correos"),
);
await fs.mkdir(carpeta, { recursive: true });
const b = {
  id: "123",
  titulo: "Simposio de Inteligencia Artificial",
  titular: "Mariana López",
  correo: "mariana@example.invalid",
  qr: "ejemplo-vista-previa-no-es-un-boleto-real",
  actividades: [
    {
      nombre: "Conferencia: IA aplicada a la salud",
      fecha: "2026-12-07",
      inicio: "10:00",
      fin: "11:30",
      recinto: "Auditorio principal",
      lugar: "Fila C · Asiento 12",
      estado: "valido",
    },
    {
      nombre: "Taller de visión por computadora",
      fecha: "2026-12-08",
      inicio: "12:00",
      fin: "14:00",
      recinto: "Laboratorio de cómputo",
      lugar: "Equipo 08",
      estado: "valido",
    },
  ],
};
const { pdf, png } = await generarPdfBoleto(b);
const origen = "https://tickett3.vercel.app";
const muestras = {
  confirmacion: plantillaToken(
    "Mariana",
    false,
    origen + "/confirmar-correo?token=ejemplo",
  ),
  recuperacion: plantillaToken(
    "Mariana",
    true,
    origen + "/recuperar-password?token=ejemplo",
  ),
  boleto: plantillaBoleto(b, origen + "/mis-reservaciones"),
  verificacion: plantillaAviso(
    "Mariana",
    "Tu verificación fue aprobada",
    "Subdirección aprobó tu expediente. Ya puedes consultar tu habilitación para solicitar eventos.",
    origen + "/mi-expediente",
  ),
  solicitud: plantillaAviso(
    "Mariana",
    "Solicitud de evento: requiere corrección",
    "Simposio de Inteligencia Artificial. Ajusta el horario del taller para conservar el margen de separación entre actividades.",
    origen + "/organizador/solicitudes/123",
  ),
};
for (const [nombre, m] of Object.entries(muestras))
  await fs.writeFile(
    path.join(carpeta, nombre + ".html"),
    m.html.replace(
      "cid:qr-tickettrade",
      "data:image/png;base64," + png.toString("base64"),
    ),
  );
await fs.writeFile(path.join(carpeta, "boleto-ejemplo.pdf"), pdf);
await fs.writeFile(
  path.join(carpeta, "index.html"),
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Correos Ticket Trade</title><body style="font-family:Arial;background:#f2f0f1;color:#561226;padding:24px"><h1>Correos de Ticket Trade</h1><p>Vistas previas con datos ficticios. No envían mensajes y sus enlaces no son tokens válidos.</p><div style="display:flex;gap:24px;flex-wrap:wrap">${Object.keys(
    muestras,
  )
    .map(
      (n) =>
        `<section><h2>${n}</h2><a href="${n}.html">Abrir vista completa</a><br><iframe title="${n}" src="${n}.html" style="border:0;width:360px;height:900px"></iframe></section>`,
    )
    .join("")}</div></body></html>`,
);
console.log(carpeta);
