import { procesarAvisosCupo } from "./modulos/taquilla/avisosCupo.js";
import {procesarCorreos} from "./modulos/correos/servicio.js";
import {huella} from "./comun/seguridad.js";
import { routerEstado } from './modulos/lecturas/estado.js';
import { leerRecintos, leerEventos } from "./modulos/lecturas/catalogos.js";
import { routerArchivos } from './modulos/archivos/rutas.js';
import { routerPerfil } from './modulos/identidad/perfil.js';
import { routerTaquilla } from './modulos/taquilla/rutas.js';
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import { pool, seleccionarBaseDatos } from "./bd/pool.js";
import { routerAuth } from "./modulos/identidad/auth.js";
import { routerPassword } from "./modulos/identidad/password.js";
import { routerOrganizacion } from "./modulos/organizacion/rutas.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "128kb" }));
app.use(cookieParser());
app.use('/api', seleccionarBaseDatos);

// Módulo de Autenticación e Identidad
app.use("/api/auth", routerAuth);
app.use("/api/auth", routerPassword);
app.use("/api/auth", routerPerfil);
app.use("/api/archivos", routerArchivos);
app.use("/api/taquilla", routerTaquilla);
app.use("/api/estado", routerEstado);
app.use("/api/organizacion", routerOrganizacion);

// Recuperación diaria de avisos pendientes; la clave solo vive en el servidor.
app.get('/api/correos/procesar', async(req,res,next)=>{
 try{
  const secreto=process.env.CRON_SECRET;
  if(!secreto||secreto.length<32)return void res.status(503).json({error:{codigo:'PROGRAMADOR_NO_CONFIGURADO',mensaje:'Procesamiento programado no disponible.'}});
  if(huella(req.get('authorization')||'')!==huella('Bearer '+secreto))return void res.status(401).json({error:{codigo:'NO_AUTORIZADO',mensaje:'Acceso no autorizado.'}});
  await procesarAvisosCupo();
  res.json({datos:await procesarCorreos(20)});
 }catch(e){next(e);}
});

// Endpoint de comprobación de salud
app.get("/api/salud", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      datos: {
        estado: "en_linea",
        mensaje: "API de Ticket Trade conectada a PostgreSQL correctamente",
        fecha: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: {
        codigo: "ERROR_BASE_DATOS",
        mensaje: "No se pudo comunicar con PostgreSQL",
      },
    });
  }
});

// Endpoint para consultar recintos desde PostgreSQL (adaptado al frontend)
app.get("/api/recintos", async (_req, res, next) => { try { res.json({ datos: await leerRecintos() }); } catch (e) { next(e); } });

// Endpoint para consultar eventos y actividades desde PostgreSQL (adaptado al frontend)
app.get("/api/eventos", async (_req, res, next) => { try { res.json({ datos: await leerEventos() }); } catch (e) { next(e); } });

app.use("/api", (_req, res) => {
  res
    .status(404)
    .json({
      error: {
        codigo: "RUTA_NO_DISPONIBLE",
        mensaje: "Esta operación no está disponible.",
      },
    });
});
app.use((err: any, _req: Request, res: Response, _next: any) => {
  if(!err.estado && !['23505','23514','23503','22P02'].includes(err.code)) console.error('Error interno API',JSON.stringify({codigo:err.code||err.name,punto:String(err.stack||'').split('\n').slice(1,4)}));
  const estado =
    err.estado ||
    (err.type === "entity.too.large" ? 413 : undefined) ||
    (err.code === "23505" || err.code === "23514"
      ? 409
      : err.code === "23503" || err.code === "22P02"
        ? 422
        : err.type === "entity.parse.failed"
          ? 400
          : 500);
  // Mientras se actualiza el esquema, explica el rechazo de las cuentas institucionales.
  const vinculacionParticipante = err.code === "23503" && [
    "fk_071", "fk_073", "fk_080", "intencion_asistencia_id_cuenta_fkey",
  ].includes(err.constraint);
  const codigo = vinculacionParticipante ? "PARTICIPACION_NO_HABILITADA"
    : err.estado ? err.codigo || (estado === 409 ? "CONFLICTO" : "OPERACION_INVALIDA")
    : estado === 500 ? "ERROR_SERVIDOR" : "SOLICITUD_RECHAZADA";
  const mensaje = vinculacionParticipante
    ? "La participación todavía no está habilitada para esta cuenta. Contacta al equipo de Ticket Trade."
    : err.estado ? err.message
    : estado === 500 ? "Ticket Trade no pudo procesar la solicitud. Vuelve a intentarlo en un momento."
    : estado === 413 ? "El archivo o la solicitud supera el tamaño permitido. Reduce su tamaño y vuelve a enviarlo."
    : estado === 400 ? "El servidor recibió una solicitud incompleta. Vuelve a abrir la pantalla e inténtalo de nuevo."
    : estado === 409 ? "El servidor rechazó el cambio. Actualiza la pantalla antes de intentarlo de nuevo."
    : "La información enviada ya no está disponible o no es válida para esta acción. Vuelve a abrir la pantalla y haz la selección de nuevo.";
  res.status(estado).json({ error: { codigo, mensaje } });
});
