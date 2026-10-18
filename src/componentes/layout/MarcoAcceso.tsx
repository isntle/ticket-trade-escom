import React from "react";
import { CheckCircle, Ticket } from "lucide-react";

/** Composición de acceso compartida; conserva el banner de IP-Regina sin recortar pantallas bajas. */
export function MarcoAcceso({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-dvh w-full bg-[#f5f3f0] p-2.5 sm:p-4">
      <div className="grid min-h-[calc(100dvh-1.25rem)] w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-[0_18px_55px_rgba(62,32,36,0.12)] sm:min-h-[calc(100dvh-2rem)] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative order-2 flex flex-col justify-between gap-12 overflow-hidden bg-[#651127] px-7 py-8 text-white sm:px-10 lg:order-1 lg:px-12">
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
          <div className="relative my-auto max-w-sm py-4">
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
          <div className="relative space-y-3 border-t border-white/15 pt-5">
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
        <div className="order-1 flex items-center px-6 py-8 sm:px-12 lg:order-2 lg:px-14">
          <div className="mx-auto w-full max-w-lg">{children}</div>
        </div>
      </div>
    </section>
  );
}
