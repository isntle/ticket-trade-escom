import { Router } from "express";
import { conTransaccion, nombreCookieSesion, pool } from "../../bd/pool.js";
import { fallo, ruta } from "../../comun/http.js";
import {
  hashContrasena,
  huella,
  origenSeguro,
  verificarContrasena,
} from "../../comun/seguridad.js";
import { encolarAviso } from "../correos/avisos.js";
import { cookies, exigirSesion } from "./auth.js";

export const routerPassword = Router();

const fallos = new Map<string, { desde: number; cantidad: number }>();
const VENTANA = 60000;
const MAXIMO_FALLOS = 20;
const camposAjenos = ["id", "idCuenta", "id_cuenta", "usuarioId", "cuentaId"];

const tiene = (valor: unknown, campo: string) =>
  Object.prototype.hasOwnProperty.call(valor || {}, campo);

routerPassword.post(
  "/cambiar-password",
  origenSeguro,
  exigirSesion,
  ruta(async (req, res) => {
    if (camposAjenos.some((campo) => tiene(req.body, campo) || tiene(req.query, campo)))
      fallo("No puedes cambiar la contraseña de otra cuenta.", 400);

    const b = req.body || {};
    const actual = b.passwordActual;
    if (typeof actual !== "string" || !actual || actual.length > 1024)
      fallo("Revisa la contraseña actual.", 400);
    const nueva = b.passwordNueva;
    if (
      typeof nueva !== "string" ||
      nueva.length < 8 ||
      nueva.length > 1024 ||
      !/[A-Z]/.test(nueva) ||
      !/[a-z]/.test(nueva) ||
      !/[0-9]/.test(nueva)
    )
      fallo("Usa 8 caracteres con mayúscula, minúscula y número.");
    if (nueva === actual)
      fallo("La nueva contraseña debe ser diferente a la actual.");

    const id = res.locals.usuario.id as string;
    const ahora = Date.now();
    const claves = [`ip:${req.ip || "local"}`, `cuenta:${id}`];
    const vigente = (clave: string) => {
      const contador = fallos.get(clave);
      return contador && ahora - contador.desde < VENTANA ? contador : null;
    };
    if (claves.some((clave) => (vigente(clave)?.cantidad || 0) >= MAXIMO_FALLOS))
      fallo("Espera un minuto antes de intentar de nuevo.", 429);
    if (fallos.size > 5000)
      for (const [clave, contador] of fallos)
        if (ahora - contador.desde >= VENTANA) fallos.delete(clave);

    const { rows } = await pool.query(
      'SELECT contrasena_hash FROM ticket_trade."Cuenta" WHERE id_cuenta=$1',
      [id],
    );
    if (!(await verificarContrasena(actual, rows[0]?.contrasena_hash))) {
      for (const clave of claves) {
        const contador = vigente(clave);
        fallos.set(clave, {
          desde: contador?.desde || ahora,
          cantidad: (contador?.cantidad || 0) + 1,
        });
      }
      fallo("La contraseña actual no es correcta.");
    }

    const hash = await hashContrasena(nueva);
    await conTransaccion(async (c) => {
      const cambio = await c.query(
        'UPDATE ticket_trade."Cuenta" SET contrasena_hash=$1 WHERE id_cuenta=$2 AND contrasena_hash=$3 RETURNING id_cuenta',
        [hash, id, rows[0].contrasena_hash],
      );
      if (!cambio.rowCount) fallo("La contraseña cambió durante la operación. Inicia sesión de nuevo.", 409);
      await c.query("DELETE FROM infra.sesion_http WHERE id_cuenta=$1", [id]);
    });
    for (const clave of claves) fallos.delete(clave);

    // El aviso es posterior al commit: un fallo de correo no revierte la contraseña.
    await conTransaccion((c) =>
      encolarAviso(
        c,
        id,
        `password-cambiada:${id}:${huella(hash)}`,
        "Tu contraseña fue actualizada",
        "Se cambió la contraseña de tu cuenta y se cerraron las sesiones activas. Si no reconoces este cambio, recupera tu cuenta de inmediato.",
        "/recuperar-password",
      ),
    ).catch(() => {});

    res.clearCookie(nombreCookieSesion(), cookies);
    res.json({
      datos: {
        exito: true,
        mensaje: "Contraseña actualizada. Inicia sesión de nuevo.",
      },
    });
  }),
);
