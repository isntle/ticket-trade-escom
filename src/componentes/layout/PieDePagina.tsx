import React from 'react';

export const PieDePagina: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white text-xs text-neutral-500 py-6 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center text-center gap-3">
          <span className="font-bold text-neutral-800">TICKET TRADE</span>
          <span aria-hidden="true" className="text-neutral-300">·</span>
          <span>Escuela Superior de Cómputo</span>
          <span aria-hidden="true" className="text-neutral-300">·</span>
          <span>Instituto Politécnico Nacional</span>
        </div>
      </div>
    </footer>
  );
};
