import "dotenv/config";
import { configuracionSmtp } from "../modulos/correos/configuracion";
import { claveCorreo, origenCorreo } from "../modulos/correos/seguridad";
import nodemailer from "nodemailer";

// Verificar no activa el envío, no usa la BD y nunca envía mensajes.
let transporte: ReturnType<typeof nodemailer.createTransport> | undefined;
try {
  const opciones = configuracionSmtp();
  claveCorreo();
  origenCorreo();
  console.log("Configuración local válida; secretos ocultos.");
  if (!process.argv.includes("--sin-conexion")) {
    transporte = nodemailer.createTransport(opciones);
    await transporte.verify();
    console.log(
      "Conexión SMTP y autenticación comprobadas. No se envió ningún correo.",
    );
    console.log(
      "Falta verificar autorización del remitente y recepción real con destinatarios consentidos.",
    );
  }
} catch (e) {
  // Los errores del proveedor pueden incluir identificadores: no imprimir respuesta cruda.
  console.error(
    transporte
      ? "No se pudo verificar SMTP. Revisa host, puerto, TLS y credenciales en el entorno privado."
      : (e as Error).message,
  );
  process.exitCode = 1;
} finally {
  transporte?.close();
}
