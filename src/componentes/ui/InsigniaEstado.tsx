import React from 'react';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Ban,
  FileCheck,
  Send,
  Lock
} from 'lucide-react';
import {
  EstadoSolicitud,
  EstadoEvento,
  EstadoArreglo,
  EstadoBoleto,
  ModalidadAsistencia,
  VisibilidadEvento
} from '../../tipos';

interface PropiedadesInsigniaEstado {
  estado:
    | EstadoSolicitud
    | EstadoEvento
    | EstadoArreglo
    | EstadoBoleto
    | ModalidadAsistencia
    | VisibilidadEvento
    | string;
  tipo?: 'solicitud' | 'evento' | 'arreglo' | 'boleto' | 'modalidad' | 'visibilidad';
}

export const InsigniaEstado: React.FC<PropiedadesInsigniaEstado> = ({ estado }) => {
  let etiqueta = estado;
  let icono = <Clock className="w-3.5 h-3.5" />;
  let clasesColor = 'text-neutral-700 bg-neutral-100 border-neutral-200';

  // Solicitudes
  if (estado === 'borrador') {
    etiqueta = 'Borrador';
    icono = <Clock className="w-3.5 h-3.5 text-neutral-500" />;
    clasesColor = 'text-neutral-700 bg-neutral-100 border-neutral-200';
  } else if (estado === 'en_revision') {
    etiqueta = 'En revisión';
    icono = <Send className="w-3.5 h-3.5 text-amber-600" />;
    clasesColor = 'text-amber-800 bg-amber-50 border-amber-200';
  } else if (estado === 'autorizada') {
    etiqueta = 'Autorizada';
    icono = <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    clasesColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
  } else if (estado === 'requiere_correccion') {
    etiqueta = 'Por corregir';
    icono = <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />;
    clasesColor = 'text-amber-900 bg-amber-50 border-amber-200';
  } else if (estado === 'rechazada') {
    etiqueta = 'Rechazada';
    icono = <XCircle className="w-3.5 h-3.5 text-rose-600" />;
    clasesColor = 'text-rose-800 bg-rose-50 border-rose-200';
  } else if (estado === 'cancelada' || estado === 'cancelado') {
    etiqueta = estado === 'cancelada' ? 'Cancelada' : 'Cancelado';
    icono = <Ban className="w-3.5 h-3.5 text-neutral-400" />;
    clasesColor = 'text-neutral-600 bg-neutral-100 border-neutral-200 line-through';
  }
  // Eventos
  else if (estado === 'configuracion') {
    etiqueta = 'En configuración';
    icono = <Clock className="w-3.5 h-3.5 text-indigo-600" />;
    clasesColor = 'text-indigo-800 bg-indigo-50 border-indigo-200';
  } else if (estado === 'publicado') {
    etiqueta = 'Publicado';
    icono = <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    clasesColor = 'text-emerald-800 bg-emerald-50 border-emerald-200 font-semibold';
  }
  // Arreglos
  else if (estado === 'version_final') {
    etiqueta = 'Versión Final';
    icono = <FileCheck className="w-3.5 h-3.5 text-emerald-600" />;
    clasesColor = 'text-emerald-900 bg-emerald-100 border-emerald-300 font-bold';
  } else if (estado === 'bloqueado') {
    etiqueta = 'Arreglo Bloqueado';
    icono = <Lock className="w-3.5 h-3.5 text-neutral-500" />;
    clasesColor = 'text-neutral-700 bg-neutral-100 border-neutral-300';
  }
  // Boletos
  else if (estado === 'valido') {
    etiqueta = 'Boleto Válido';
    icono = <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    clasesColor = 'text-emerald-800 bg-emerald-50 border-emerald-300 font-bold';
  } else if (estado === 'utilizado') {
    etiqueta = 'Utilizado';
    icono = <CheckCircle className="w-3.5 h-3.5 text-sky-600" />;
    clasesColor = 'text-sky-800 bg-sky-50 border-sky-200';
  }
  // Modalidades de Asistencia
  else if (estado === 'libre') {
    etiqueta = 'Acceso Libre';
    icono = <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    clasesColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
  } else if (estado === 'registro') {
    etiqueta = 'Registro de Asistencia';
    icono = <Clock className="w-3.5 h-3.5 text-blue-600" />;
    clasesColor = 'text-blue-800 bg-blue-50 border-blue-200';
  } else if (estado === 'controlado') {
    etiqueta = 'Acceso Controlado (QR)';
    icono = <Lock className="w-3.5 h-3.5 text-[#7a132b]" />;
    clasesColor = 'text-[#7a132b] bg-[#7a132b]/10 border-[#7a132b]/20 font-semibold';
  }
  // Visibilidad
  else if (estado === 'publico') {
    etiqueta = 'Público General';
    clasesColor = 'text-neutral-700 bg-neutral-100 border-neutral-200';
  } else if (estado === 'interno') {
    etiqueta = 'Comunidad IPN';
    clasesColor = 'text-[#7a132b] bg-[#7a132b]/5 border-[#7a132b]/20';
  } else if (estado === 'privado') {
    etiqueta = 'Privado (Solo con Enlace)';
    icono = <Lock className="w-3.5 h-3.5 text-amber-700" />;
    clasesColor = 'text-amber-800 bg-amber-50 border-amber-300';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-medium tracking-tight whitespace-nowrap ${clasesColor}`}
    >
      {icono}
      <span>{etiqueta}</span>
    </span>
  );
};
