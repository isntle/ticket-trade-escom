import { ArrowLeft } from "lucide-react";

export function BotonRegresar({ destino, alVolver }: { destino: string; alVolver: () => void }) {
  return (
    <button type="button" onClick={alVolver}
      className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-left text-sm font-semibold text-[#7a132b] hover:border-[#7a132b] hover:bg-[#7a132b]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a132b]">
      <ArrowLeft size={17} className="shrink-0" aria-hidden="true" />
      {destino}
    </button>
  );
}
