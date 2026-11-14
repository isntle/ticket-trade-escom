import { createContext } from "react";
import type { TipoAutenticacion } from "./AutenticacionContexto.js";
import type { ContextoDatosTipo } from "./DatosContexto.js";
// Los proveedores local y remoto comparten exactamente las mismas identidades de contexto.
export const ContextoAutenticacion = createContext<
  TipoAutenticacion | undefined
>(undefined);
export const ContextoDatos = createContext<ContextoDatosTipo | undefined>(
  undefined,
);
