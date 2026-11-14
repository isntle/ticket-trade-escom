import {fechaBoleto, estadoBoleto} from "./presentacion";
import { escapar as e } from "./seguridad";
import type { DatosBoleto } from "./boleto";
type Mensaje = { subject: string; html: string; text: string };
function marco(
  pre: string,
  titulo: string,
  saludo: string,
  cuerpo: string,
  accion: string,
  url: string,
  pie: string,
) {
  const u = new URL(url);
  if (!["https:", "http:"].includes(u.protocol))
    throw Error("Enlace de correo inválido.");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(titulo)}</title></head><body style="margin:0;background:#f3f2ef;color:#30282d;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${e(pre)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:white;border-top:5px solid #7a132b"><tr><td style="padding:27px 30px;border-bottom:1px solid #ece7e9"><table role="presentation" width="100%"><tr><td><span style="font-size:27px;font-weight:bold;letter-spacing:-1px;color:#7a132b">Ticket Trade</span></td><td align="right" style="font-size:10px;letter-spacing:2px;color:#7b7277">ESCOM · IPN</td></tr></table></td></tr><tr><td style="padding:30px"><h1 style="font-size:30px;line-height:1.15;letter-spacing:-0.8px;margin:0 0 22px;color:#2e2329">${e(titulo)}</h1><p style="font-size:16px;line-height:1.6;margin:0 0 18px">Hola, ${e(saludo)}.</p>${cuerpo}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0"><tr><td bgcolor="#7a132b" style="border-radius:6px"><a href="${e(url)}" style="display:inline-block;padding:15px 23px;color:#fff;font-size:15px;font-weight:bold;text-decoration:none">${e(accion)}</a></td></tr></table><p style="font-size:12px;line-height:1.6;color:#6f656b">${e(pie)}</p><p style="font-size:12px;line-height:1.6;color:#6f656b">Si el botón no abre, copia este enlace:<br><a style="color:#7a132b;word-break:break-all" href="${e(url)}">${e(url)}</a></p></td></tr><tr><td style="border-top:1px solid #e8e0e4;padding:22px 30px;color:#756a70;font-size:12px;line-height:1.6">Ticket Trade · Proyecto académico ESCOM-IPN<br>Este es un aviso sobre tu cuenta o tus actividades, no una suscripción publicitaria.</td></tr></table></td></tr></table></body></html>`;
}
export function plantillaToken(
  nombre: string,
  recuperacion: boolean,
  url: string,
): Mensaje {
  const subject = recuperacion
    ? "Recupera tu contraseña de Ticket Trade"
    : "Confirma tu correo de Ticket Trade";
  const intro = recuperacion
    ? "Recibimos una solicitud para cambiar tu contraseña. Puedes elegir una nueva desde el siguiente enlace."
    : "Ya creaste tu cuenta. Confirma que este correo te pertenece para continuar en Ticket Trade.";
  const tiempo = recuperacion
    ? "El enlace vence en 30 minutos y solo puede utilizarse una vez."
    : "El enlace vence en 24 horas y solo puede utilizarse una vez. Verificar tu correo no sustituye la revisión de documentos para organizar eventos.";
  return {
    subject,
    text: `Hola, ${nombre}.\n${intro}\n${url}\n${tiempo}\nSi no lo solicitaste, ignora este mensaje.`,
    html: marco(
      intro,
      subject,
      nombre,
      `<p style="font-size:16px;line-height:1.7">${e(intro)}</p><p style="padding:16px;background:#f8f3f5;font-size:14px;line-height:1.7">${e(tiempo)}</p>`,
      recuperacion ? "Elegir nueva contraseña" : "Confirmar mi correo",
      url,
      "Si no hiciste esta solicitud, ignora este mensaje. Nunca te pediremos que respondas con tu contraseña.",
    ),
  };
}
export function plantillaBoleto(b: DatosBoleto, url: string): Mensaje {
  const filas = b.actividades.map(a => {
    const f = fechaBoleto(a.fecha);
    return `<tr><td width="55" valign="top" style="padding:20px 12px 20px 0;border-bottom:1px solid #eee8eb"><p style="margin:0;font-size:28px;font-weight:bold;color:#7a132b;line-height:1">${e(f.dia)}</p><p style="margin:5px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#7b7277">${e(f.mes)}</p></td><td valign="top" style="padding:18px 0;border-bottom:1px solid #eee8eb"><p style="margin:0 0 7px;font-weight:bold;font-size:17px;color:#2e2329">${e(a.nombre)}</p><p style="margin:0;font-size:14px;line-height:1.7;color:#60545b">${e(a.inicio)}–${e(a.fin)} h · ${e(a.recinto)}<br><strong style="color:#3c3036">${e(a.lugar)}</strong></p><p style="margin:7px 0 0;font-size:12px;color:${a.estado === 'cancelado' ? '#ad2344' : '#307159'}">${e(estadoBoleto(a.estado))}</p></td></tr>`;
  }).join("");
  const subject = "Tu boleto · " + b.titulo;
  const cuerpo = `<p style="font-size:16px;line-height:1.7;color:#60545b">Tu lugar está reservado. Guarda el PDF adjunto o presenta este código al llegar.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0;background:#faf6f7;border:1px solid #e8dce1;border-radius:12px"><tr><td style="padding:23px 24px;border-bottom:1px dashed #d5bfc9"><p style="margin:0 0 10px;font-size:10px;letter-spacing:2px;font-weight:bold;color:#7a132b">PASE DE ACCESO</p><h2 style="margin:0;font-size:24px;line-height:1.2;color:#2e2329">${e(b.titulo)}</h2><p style="margin:14px 0 0;font-size:13px;color:#72626b">Titular<br><strong style="font-size:16px;color:#352830">${e(b.titular)}</strong></p></td></tr><tr><td align="center" style="padding:24px;background:white"><img src="cid:qr-tickettrade" alt="Código QR de tu pase para ${e(b.titulo)}" width="190" height="190" style="display:block;width:190px;height:190px;max-width:100%"><p style="font-size:12px;line-height:1.7;color:#6f626a;margin:13px 0 0">Un QR para tus actividades reservadas.<br>Cada entrada se valida por separado.</p></td></tr></table><h2 style="font-size:20px;letter-spacing:-0.3px;margin:30px 0 0">Tu agenda</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${filas}</table>`;
  return {
    subject,
    html: marco(
      b.titulo + " · Tu pase y PDF están listos",
      "Tu boleto, listo para llevar",
      b.titular,
      cuerpo,
      "Consultar mis boletos",
      url,
      "Consulta la aplicación antes de asistir: los horarios, recintos y estados pueden cambiar. El PDF no reemplaza la validación de acceso en el servidor.",
    ),
    text:
      `Hola, ${b.titular}.\n${b.titulo}\n` +
      b.actividades
        .map(
          (a) =>
            `${a.nombre}: ${a.fecha}, ${a.inicio}-${a.fin}, ${a.recinto}, ${a.lugar}. Estado: ${a.estado}`,
        )
        .join("\n") +
      `\nTu QR y PDF están adjuntos.\nConsulta el estado vigente: ${url}`,
  };
}
export function plantillaAviso(
  nombre: string,
  titulo: string,
  detalle: string,
  url: string,
): Mensaje {
  return {
    subject: titulo + " · Ticket Trade",
    text: `Hola, ${nombre}.\n${titulo}\n${detalle}\nConsulta los detalles en ${url}`,
    html: marco(
      titulo,
      titulo,
      nombre,
      `<p style="font-size:16px;line-height:1.8;white-space:pre-line">${e(detalle)}</p>`,
      "Consultar en Ticket Trade",
      url,
      "Este aviso corresponde a una actualización registrada. Consulta la aplicación para ver su estado actual. Los documentos personales solo se consultan en tu sesión autorizada.",
    ),
  };
}
