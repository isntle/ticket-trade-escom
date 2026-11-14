/** Valida el entorno sin imprimir credenciales ni abrir conexiones. */
export function configuracionSmtp(env: NodeJS.ProcessEnv = process.env) {
  const faltantes = ["SMTP_HOST", "SMTP_FROM"].filter((k) => !env[k]?.trim());
  if (faltantes.length)
    throw Error("Falta configurar: " + faltantes.join(", ") + ".");
  const host = env.SMTP_HOST!.trim();
  const local = ["localhost", "127.0.0.1", "::1"].includes(host);
  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("SMTP_PORT debe ser un puerto válido.");
  if (env.SMTP_SECURE && !["0", "1"].includes(env.SMTP_SECURE))
    throw Error("SMTP_SECURE admite 0 o 1.");
  const secure = env.SMTP_SECURE === "1";
  if (port === 465 && !secure)
    throw Error("Para el puerto 465 configura SMTP_SECURE=1.");
  const from = env.SMTP_FROM!.trim();
  const direccion = /<([^<>]+)>$/.exec(from)?.[1] || from;
  if (
    /[\r\n]/.test(from) ||
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(direccion)
  )
    throw Error("SMTP_FROM debe contener una dirección de remitente válida.");
  if (
    (!local && (!env.SMTP_USER || !env.SMTP_PASSWORD)) ||
    !!env.SMTP_USER !== !!env.SMTP_PASSWORD
  ) {
    throw Error("Configura SMTP_USER y SMTP_PASSWORD juntos.");
  }
  if (
    host === "smtp.gmail.com" &&
    direccion.toLowerCase() !== env.SMTP_USER?.toLowerCase()
  )
    throw Error("Para Gmail usa como SMTP_FROM la misma cuenta de SMTP_USER.");
  return {
    host,
    port,
    secure,
    requireTLS: !local,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
    connectionTimeout: 10000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
