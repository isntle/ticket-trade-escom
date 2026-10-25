import React from "react";
import { CheckCircle, Ticket } from "lucide-react";

/** Composición de acceso compartida; conserva el banner de IP-Regina sin recortar pantallas bajas. */
export function MarcoAcceso({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-dvh w-full bg-white">
      <div className="grid min-h-dvh w-full grid-rows-[auto_1fr] overflow-hidden bg-white lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:grid-rows-1">
        <aside className="relative flex flex-col justify-between gap-8 overflow-hidden bg-[#651127] px-5 py-4 text-white sm:px-8 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <Ticket className="text-amber-200" />
            </span>
            <div>
              <p className="text-xs text-amber-200">ESCOM · IPN</p>
              <p className="font-semibold">Ticket Trade</p>
            </div>
          </div>
          <div className="relative my-auto hidden max-w-lg py-4 lg:block">
            <p className="mb-4 text-sm text-white/80">
              Tu agenda académica, en un solo lugar
            </p>
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Entra a la experiencia ESCOM.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Consulta eventos, reserva tu lugar y lleva tus boletos digitales
              contigo.
            </p>
          </div>
          <div className="relative hidden space-y-3 border-t border-white/15 pt-5 lg:block">
            {[
              ["Acceso institucional", "Una cuenta para toda tu actividad"],
              ["Boletos digitales", "Tu entrada siempre disponible"],
              ["Agenda ESCOM", "Eventos y recintos organizados"],
            ].map(([titulo, descripcion]) => (
              <div key={titulo} className="flex gap-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-amber-200" />
                <div>
                  <p className="text-xs font-semibold">{titulo}</p>
                  <p className="mt-1 text-xs text-white/60">{descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 items-start px-5 py-8 sm:px-8 lg:items-center lg:px-[clamp(2rem,4vw,5rem)] lg:py-10">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </section>
  );
}
