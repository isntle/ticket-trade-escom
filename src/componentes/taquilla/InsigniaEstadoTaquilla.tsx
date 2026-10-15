import React from 'react';
import {
  CheckCircle2,
  Clock,
  Hourglass,
  XCircle,
  Ban,
  Slash,
  UserMinus
} from 'lucide-react';

export type EstadoTaquilla =
  | 'activo'
  | 'utilizado'
  | 'invalidado'
  | 'cancelado'
  | 'vigente'
  | 'utilizada'
  | 'cancelada'
  | 'en_espera'
  | 'oferta_vigente'
  | 'aceptada'
  | 'rechazada'
  | 'vencida'
  | 'retirada'
  | 'apartado'
  | 'valido'
  | 'confirmada'
  | 'asistido';

interface PropiedadesInsigniaEstadoTaquilla {
  estado: EstadoTaquilla | string;
}

const CONFIGURACION: Record<
  string,
  { etiqueta: string; clases: string; icono: React.ReactNode }
> = {
  activo: {
    etiqueta: 'Activo',
    clases: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icono: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  valido: {
    etiqueta: 'Válido',
    clases: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icono: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  vigente: {
    etiqueta: 'Vigente',
    clases: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icono: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  confirmada: {
    etiqueta: 'Confirmada',
    clases: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icono: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  utilizado: {
    etiqueta: 'Utilizado',
    clases: 'bg-slate-100 text-slate-700 border-slate-300',
    icono: <Slash className="w-3.5 h-3.5" />
  },
  utilizada: {
    etiqueta: 'Utilizada',
    clases: 'bg-slate-100 text-slate-700 border-slate-300',
    icono: <Slash className="w-3.5 h-3.5" />
  },
  asistido: {
    etiqueta: 'Asistido',
    clases: 'bg-slate-100 text-slate-700 border-slate-300',
    icono: <Slash className="w-3.5 h-3.5" />
  },
  invalidado: {
    etiqueta: 'Invalidado',
    clases: 'bg-rose-100 text-rose-800 border-rose-300',
    icono: <XCircle className="w-3.5 h-3.5" />
  },
  cancelado: {
    etiqueta: 'Cancelado',
    clases: 'bg-rose-100 text-rose-800 border-rose-300',
    icono: <Ban className="w-3.5 h-3.5" />
  },
  cancelada: {
    etiqueta: 'Cancelada',
    clases: 'bg-rose-100 text-rose-800 border-rose-300',
    icono: <Ban className="w-3.5 h-3.5" />
  },
  en_espera: {
    etiqueta: 'En espera',
    clases: 'bg-amber-100 text-amber-800 border-amber-300',
    icono: <Hourglass className="w-3.5 h-3.5" />
  },
  oferta_vigente: {
    etiqueta: 'Oferta vigente',
    clases: 'bg-indigo-100 text-indigo-800 border-indigo-300 animate-pulse',
    icono: <Clock className="w-3.5 h-3.5" />
  },
  aceptada: {
    etiqueta: 'Aceptada',
    clases: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icono: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  rechazada: {
    etiqueta: 'Rechazada',
    clases: 'bg-rose-100 text-rose-800 border-rose-300',
    icono: <XCircle className="w-3.5 h-3.5" />
  },
  vencida: {
    etiqueta: 'Vencida',
    clases: 'bg-rose-100 text-rose-800 border-rose-300',
    icono: <Clock className="w-3.5 h-3.5" />
  },
  retirada: {
    etiqueta: 'Retirada',
    clases: 'bg-slate-100 text-slate-700 border-slate-300',
    icono: <UserMinus className="w-3.5 h-3.5" />
  },
  apartado: {
    etiqueta: 'Apartado',
    clases: 'bg-sky-100 text-sky-800 border-sky-300',
    icono: <Clock className="w-3.5 h-3.5" />
  }
};

export const InsigniaEstadoTaquilla: React.FC<PropiedadesInsigniaEstadoTaquilla> = ({ estado }) => {
  const config = CONFIGURACION[estado] || {
    etiqueta: String(estado).toUpperCase(),
    clases: 'bg-gray-100 text-gray-700 border-gray-300',
    icono: <CheckCircle2 className="w-3.5 h-3.5" />
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap ${config.clases}`}
    >
      {config.icono}
      <span>{config.etiqueta}</span>
    </span>
  );
};
