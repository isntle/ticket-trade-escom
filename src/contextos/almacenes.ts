import { createContext } from "react";
import type { TipoAutenticacion } from "./AutenticacionContexto";
import type { ContextoDatosTipo } from "./DatosContexto";
// Los proveedores local y remoto comparten exactamente las mismas identidades de contexto.
export const ContextoAutenticacion = createContext<
  TipoAutenticacion | undefined
>(undefined);
export const ContextoDatos = createContext<ContextoDatosTipo | undefined>(
  undefined,
);
