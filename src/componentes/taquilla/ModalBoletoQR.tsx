import React from "react";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { VentanaModal } from "../ui/VentanaModal";
import type { BoletoDigital } from "../../tipos";

interface PropiedadesModalBoletoQR {
  boleto: (BoletoDigital & { nombreDia?: string }) | null;
  accesos?: Array<
    BoletoDigital & { nombreDia?: string; entradaPendiente?: boolean }
  >;
  alCerrar: () => void;
}
export const ModalBoletoQR: React.FC<PropiedadesModalBoletoQR> = ({
  boleto,
  accesos,
  alCerrar,
}) => {
  if (!boleto) return null;
  const actividades = accesos || [boleto];
  const vigente = actividades.some((a) =>
    "entradaPendiente" in a ? a.entradaPendiente : a.estado === "valido",
  );
  return (
    <VentanaModal estaAbierto alCerrar={alCerrar} titulo="Boleto del evento">
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-bold">{boleto.tituloEvento}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Titular: {boleto.nombreUsuario}
          </p>
        </div>
        {vigente ? (
          <>
            <p className="text-sm text-neutral-600">
              El mismo QR permite consultar tus accesos en cada actividad.
              Usarlo en una no consume las demás.
            </p>
            <div className="mx-auto w-fit rounded-2xl border border-neutral-200 bg-white p-4">
              <QRCodeSVG
                value={boleto.codigoQr}
                size={192}
                level="M"
                includeMargin
                title="Código QR del evento"
              />
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-500">
                Identificador para captura manual
              </p>
              <p className="mt-1 break-all font-mono text-xs font-bold text-[#7a132b]">
                {boleto.codigoQr}
              </p>
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            Este boleto ya no tiene actividades con acceso pendiente.
          </p>
        )}
        <ul className="space-y-3" aria-label="Actividades de este boleto">
          {actividades.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-neutral-200 p-3 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{a.nombreDia || "Actividad"}</strong>
                <span
                  className={
                    a.estado === "valido"
                      ? "font-semibold text-emerald-700"
                      : "text-neutral-500"
                  }
                >
                  {a.estado === "valido"
                    ? "entradaPendiente" in a && a.entradaPendiente === false
                      ? "Actividad finalizada o no disponible"
                      : "Acceso pendiente"
                    : a.estado === "utilizado"
                      ? "Entrada registrada"
                      : "Acceso cancelado"}
                </span>
              </div>
              <p className="mt-2 text-neutral-600">
                {a.fechaEvento} · {a.horaEvento}
              </p>
              <p className="mt-1 text-neutral-600">
                {a.nombreRecinto} · {a.etiquetaAsiento || "Acceso general"}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Printer size={16} />
            Imprimir boleto
          </button>
          <button
            type="button"
            onClick={alCerrar}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </VentanaModal>
  );
};
export default ModalBoletoQR;
