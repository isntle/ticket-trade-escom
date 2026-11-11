import { routerEstado } from './modulos/lecturas/estado';
import { leerRecintos, leerEventos } from "./modulos/lecturas/catalogos";
import { routerArchivos } from './modulos/archivos/rutas';
import { routerPerfil } from './modulos/identidad/perfil';
import { routerTaquilla } from './modulos/taquilla/rutas';
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import { pool, seleccionarBaseDatos } from "./bd/pool";
import { routerAuth } from "./modulos/identidad/auth";
import { routerOrganizacion } from "./modulos/organizacion/rutas";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "128kb" }));
app.use(cookieParser());
app.use('/api', seleccionarBaseDatos);

// Módulo de Autenticación e Identidad
app.use("/api/auth", routerAuth);
app.use("/api/auth", routerPerfil);
app.use("/api/archivos", routerArchivos);
app.use("/api/taquilla", routerTaquilla);
app.use("/api/estado", routerEstado);
app.use("/api/organizacion", routerOrganizacion);

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
  res
    .status(estado)
    .json({
      error: {
        codigo:
          estado === 500
            ? "ERROR_SERVIDOR"
            : estado === 409
              ? "CONFLICTO"
              : "OPERACION_INVALIDA",
        mensaje:
          estado === 500
            ? "No se pudo completar la operación."
            : err.estado
              ? err.message
              : "Revisa los datos o vuelve a consultar la información vigente.",
      },
    });
});
