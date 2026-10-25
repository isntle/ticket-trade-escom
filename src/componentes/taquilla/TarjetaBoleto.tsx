import React from "react";
import { QrCode, CalendarDays, MapPin, Clock3 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { InsigniaEstadoTaquilla } from "./InsigniaEstadoTaquilla";
import type { BoletoDigital } from "../../tipos";

export type AccesoBoleto = BoletoDigital & {
  nombreDia: string;
  entradaPendiente?: boolean;
  restriccionCancelacion?: string;
};
interface PropiedadesTarjetaBoleto {
  boleto: AccesoBoleto;
  accesos?: AccesoBoleto[];
  alAmpliarQr: (boleto: AccesoBoleto) => void;
  alCancelar: (boleto: BoletoDigital) => void;
}
export const TarjetaBoleto: React.FC<PropiedadesTarjetaBoleto> = ({
  boleto,
  accesos = [boleto],
  alAmpliarQr,
  alCancelar,
}) => {
  const pendientes = accesos.filter(
    (a) => a.entradaPendiente ?? a.estado === "valido",
  ).length;
  return (
    <article className="min-w-0 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200">
      <header className="border-b border-neutral-100 bg-[#7a132b]/5 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#7a132b]">
          Ticket Trade · Boleto del evento
        </p>
        <h3 className="mt-2 text-xl font-bold leading-snug text-neutral-900">
          {boleto.tituloEvento}
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          {boleto.nombreUsuario} · {pendientes}{" "}
          {pendientes === 1
            ? "actividad con acceso pendiente"
            : "actividades con acceso pendiente"}
        </p>
      </header>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-neutral-50 p-4">
          {pendientes > 0 && (
            <div className="rounded-xl bg-white p-2 ring-1 ring-neutral-200">
              <QRCodeSVG
                value={boleto.codigoQr}
                size={112}
                level="M"
                includeMargin
                title="Código QR del evento"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-neutral-900">
              {pendientes > 0
                ? "Un código para tus actividades"
                : "Registro del boleto"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {pendientes > 0
                ? "Preséntalo en cada recinto. Cada entrada se registra por separado."
                : "Las actividades de este boleto ya no tienen entradas pendientes."}
            </p>
            <button
              type="button"
              onClick={() => alAmpliarQr(boleto)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <QrCode size={16} />
              {pendientes > 0
                ? "Ver boleto y ampliar QR"
                : "Ver actividades del boleto"}
            </button>
          </div>
        </div>
        <ul className="space-y-3" aria-label="Actividades reservadas">
          {accesos.map((acceso) => (
            <li
              key={acceso.id}
              className="space-y-3 rounded-2xl border border-neutral-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="min-w-0 font-bold text-neutral-900">
                  {acceso.nombreDia}
                </h4>
                {acceso.estado === "valido" &&
                acceso.entradaPendiente === false ? (
                  <span className="text-xs font-semibold text-neutral-500">
                    Actividad finalizada o no disponible
                  </span>
                ) : (
                  <InsigniaEstadoTaquilla estado={acceso.estado} />
                )}
              </div>
              <div className="space-y-1.5 text-sm text-neutral-600">
                <p className="flex items-center gap-2">
                  <CalendarDays size={15} />
                  {acceso.fechaEvento}
                </p>
                <p className="flex items-center gap-2">
                  <Clock3 size={15} />
                  {acceso.horaEvento}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0" />
                  {acceso.nombreRecinto} ·{" "}
                  {acceso.etiquetaAsiento || "Acceso general"}
                </p>
              </div>
              {acceso.estado === "valido" &&
                acceso.entradaPendiente !== false && (
                  <>
                    <button
                      type="button"
                      disabled={!!acceso.restriccionCancelacion}
                      onClick={() => alCancelar(acceso)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400"
                    >
                      Cancelar esta reservación
                    </button>
                    {acceso.restriccionCancelacion && (
                      <p className="text-xs leading-relaxed text-neutral-500">
                        {acceso.restriccionCancelacion}
                      </p>
                    )}
                  </>
                )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};
