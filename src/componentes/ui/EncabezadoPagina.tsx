import type { ReactNode } from "react";

interface PropiedadesEncabezadoPagina {
  titulo: string;
  descripcion?: ReactNode;
  accion?: ReactNode;
}

export function EncabezadoPagina({ titulo, descripcion, accion }: PropiedadesEncabezadoPagina) {
  return (
    <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
          {titulo}
        </h1>
        {descripcion && <p className="mt-2 max-w-2xl text-sm text-neutral-600">{descripcion}</p>}
      </div>
      {accion}
    </header>
  );
}
