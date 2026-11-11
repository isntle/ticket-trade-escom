import { Router, raw } from "express";
import crypto from "node:crypto";
import { conTransaccion, pool, tokenPeticion } from "../../bd/pool";
import { exigirSesion, usuarioSesion } from "../identidad/auth";
import { origenSeguro } from "../../comun/seguridad";
import { fallo, idEntero, ruta, texto } from "../../comun/http";

export const routerArchivos = Router();
routerArchivos.post(
  "/",
  exigirSesion,
  origenSeguro,
  raw({ type: ["application/pdf", "image/jpeg", "image/png"], limit: "10mb" }),
  ruta(async (req, res) => {
    const nombre = texto(req.query.nombre, "el nombre del archivo", 200);
    const bytes = req.body;
    const mime = req.get("content-type")?.split(";")[0];
    if (!Buffer.isBuffer(bytes) || !bytes.length)
      fallo("Selecciona un archivo válido.");
    if (mime === "application/pdf") {
      const contenido = bytes.toString("latin1");
      if (
        !/\.pdf$/i.test(nombre) ||
        !contenido.startsWith("%PDF-") ||
        !contenido.includes("%%EOF") ||
        /\/(Encrypt|JavaScript|JS|Launch|EmbeddedFiles)\b/.test(contenido)
      )
        fallo("Usa un PDF válido, sin contraseña, acciones ni adjuntos.");
    } else {
      if (bytes.length > 5 * 1024 * 1024)
        fallo("El cartel admite hasta 5 MiB.");
      if (
        !(
          mime === "image/png" &&
          /\.png$/i.test(nombre) &&
          bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ) &&
        !(
          mime === "image/jpeg" &&
          /\.jpe?g$/i.test(nombre) &&
          bytes[0] === 255 &&
          bytes[1] === 216 &&
          bytes[2] === 255
        )
      )
        fallo("El cartel debe ser un archivo JPEG o PNG válido.");
    }
    const id = await conTransaccion(async (c) => {
      const r = await c.query(
        `INSERT INTO ticket_trade."Archivo"(clave_almacenamiento,nombre,id_tipo_mime,tamano_bytes)
      VALUES($1,$2,(SELECT id_tipo_mime FROM ticket_trade."TipoMime" WHERE nombre=$3),$4) RETURNING id_archivo::text id`,
        ["privado/" + crypto.randomUUID(), nombre, mime, bytes.length],
      );
      await c.query(
        "INSERT INTO infra.archivo_contenido(id_archivo,id_cuenta_propietaria,contenido) VALUES($1,$2,$3)",
        [r.rows[0].id, res.locals.usuario.id, bytes],
      );
      return r.rows[0].id;
    });
    res.status(201).json({
      datos: { id, nombre, tamano: bytes.length, url: `/api/archivos/${id}` },
    });
  }),
);

routerArchivos.get(
  "/:id",
  ruta(async (req, res) => {
    const id = idEntero(req.params.id);
    const { rows } = await pool.query(
      `SELECT a.nombre,m.nombre mime,b.contenido,b.id_cuenta_propietaria::text propietario,
    EXISTS(SELECT 1 FROM ticket_trade."Evento" e JOIN ticket_trade."EstadoEvento" ee USING(id_estado_evento)
      JOIN ticket_trade."VisibilidadEvento" v USING(id_visibilidad_evento) WHERE e.id_archivo_cartel=a.id_archivo AND ee.nombre='Publicado' AND v.nombre='Público') publico
    FROM ticket_trade."Archivo" a JOIN ticket_trade."TipoMime" m USING(id_tipo_mime)
    JOIN infra.archivo_contenido b USING(id_archivo) WHERE a.id_archivo=$1`,
      [id],
    );
    const a = rows[0];
    if (!a) fallo("Archivo no disponible.", 404);
    const u = await usuarioSesion(tokenPeticion(req));
    const revisor = u?.roles.some((r) => ["admin", "subdireccion"].includes(r));
    // Un revisor solo puede abrir documentos efectivamente enviados a revisión.
    const enviado =
      revisor &&
      (
        await pool.query(
          'SELECT 1 FROM ticket_trade."DocumentoVerificacion" WHERE id_archivo=$1',
          [id],
        )
      ).rowCount;
    const titular =
      u &&
      (
        await pool.query(
          `SELECT 1 FROM ticket_trade."DocumentoVerificacion" d JOIN ticket_trade."SolicitudVerificacion" s USING(id_solicitud_verificacion) WHERE d.id_archivo=$1 AND s.id_cuenta=$2`,
          [id, u.id],
        )
      ).rowCount;
    if (!a.publico && u?.id !== a.propietario && !enviado && !titular)
      fallo("No tienes permiso para abrir este archivo.", 403);
    res.set({
      "Content-Type": a.mime,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "sandbox",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.nombre)}`,
    });
    res.send(a.contenido);
  }),
);

export async function comprobarArchivo(
  c: import("pg").PoolClient,
  id: unknown,
  propietario: string,
  mime: string[],
) {
  const r = await c.query(
    `SELECT 1 FROM ticket_trade."Archivo" a JOIN ticket_trade."TipoMime" m USING(id_tipo_mime)
    JOIN infra.archivo_contenido b USING(id_archivo) WHERE a.id_archivo=$1 AND b.id_cuenta_propietaria=$2 AND m.nombre=ANY($3::text[])`,
    [idEntero(id), propietario, mime],
  );
  if (!r.rowCount) fallo("Adjunta un archivo propio del formato requerido.");
}
