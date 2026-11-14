import React from 'react';
import { QrCode, Calendar, Clock, MapPin, Ticket as IconoSesion, Download } from 'lucide-react';
import { InsigniaEstadoTaquilla } from './InsigniaEstadoTaquilla';
import { obtenerMensaje } from '../../dominio/mensajes';
import { QRCodeSVG } from 'qrcode.react';
import { BoletoDigital } from '../../tipos';
import { generarBoletoPdf } from '../../utilidades/generadorBoletoPdf';

type BoletoVista = BoletoDigital & { 
  nombreDia: string; 
  restriccionCancelacion?: string;
  correoUsuario?: string;
  actividades?: Array<{
    nombre: string;
    fecha: string;
    inicio: string;
    fin: string;
    recinto: string;
    lugar: string;
    estado: 'valido' | 'cancelado' | 'utilizado';
  }>;
};

interface PropiedadesTarjetaBoleto {
  boleto: BoletoVista;
  alAmpliarQr: (boleto: BoletoVista) => void;
  alCancelar: (boleto: BoletoDigital) => void;
}

export const TarjetaBoleto: React.FC<PropiedadesTarjetaBoleto> = ({ boleto, alAmpliarQr, alCancelar }) => {
  const estaActivo = boleto.estado === 'valido';
  const atenuado = boleto.estado === 'cancelado' || boleto.estado === 'utilizado';

  const cancelacionPermitida = estaActivo && !boleto.restriccionCancelacion;

  let mensajeRestriccion: string | null = null;
  if (boleto.restriccionCancelacion === 'menos24h') {
    mensajeRestriccion = obtenerMensaje('ERR-MT-08').descripcion;
  } else if (boleto.restriccionCancelacion === 'utilizado') {
    mensajeRestriccion = obtenerMensaje('ERR-MT-09').descripcion;
  }

  const tituloEvento = boleto.tituloEvento || 'Evento Institucional ESCOM';
  const nombreDia = boleto.nombreDia || 'Día del evento';
  const fechaEvento = boleto.fechaEvento || 'Fecha por confirmar';
  const horaEvento = boleto.horaEvento || 'Horario asignado';
  const nombreRecinto = boleto.nombreRecinto || 'Recinto ESCOM';
  const etiquetaAsiento = boleto.etiquetaAsiento || 'Acceso General';
  const nombreTitular = boleto.nombreUsuario || 'Asistente Institucional';
  const codigoManual = boleto.codigoQr;

  // Función para disparar la descarga del PDF reutilizando el generador
  const manejarDescargaPdf = () => {
    // Construimos el payload respetando estrictamente el contrato acordado con Luis
    const payloadBoleto = {
      id: boleto.id || 'pase-01',
      titular: nombreTitular,
      correo: boleto.correoUsuario || 'estudiante@ipn.mx',
      titulo: tituloEvento,
      qr: codigoManual,
      // Si el boleto trae actividades asociadas las usa, de lo contrario genera una actividad por defecto basada en la tarjeta
      actividades: boleto.actividades && boleto.actividades.length > 0 ? boleto.actividades : [
        {
          nombre: tituloEvento,
          fecha: fechaEvento,
          inicio: horaEvento.split('-')[0] || '10:00',
          fin: horaEvento.split('-')[1] || '12:00',
          recinto: nombreRecinto,
          lugar: etiquetaAsiento,
          estado: (boleto.estado === 'utilizado' || boleto.estado === 'cancelado' ? boleto.estado : 'valido') as 'valido' | 'cancelado' | 'utilizado'
        }
      ]
    };

    // Generamos el documento y disparamos la descarga directa en el navegador
    const docPdf = generarBoletoPdf(payloadBoleto);
    docPdf.save(`Boleto_${tituloEvento.replace(/\s+/g, '_')}_${boleto.id || 'acceso'}.pdf`);
  };

  return (
    <div
      className={`relative bg-white rounded-3xl border border-neutral-300 shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
        atenuado ? 'opacity-70 grayscale-25' : ''
      }`}
    >
      <div className="p-6 bg-[#fafaf9] border-b border-neutral-200/80">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-mono text-[10px] tracking-wider text-neutral-400 font-bold uppercase">
            ESCOM IPN · TICKET TRADE
          </span>
          <InsigniaEstadoTaquilla estado={boleto.estado} />
        </div>

        <h3 className="text-base font-extrabold text-neutral-900 leading-snug line-clamp-2">
          {tituloEvento}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
          <IconoSesion className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-medium">{nombreDia}</span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5 font-semibold text-neutral-800">
            <Calendar className="w-3.5 h-3.5 text-[#7a132b]" />
            {fechaEvento}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            {horaEvento}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
          <span>{nombreRecinto}</span>
        </div>
      </div>

      <div className="relative py-1 bg-white">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fafaf9] border border-neutral-300 shadow-inner" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fafaf9] border border-neutral-300 shadow-inner" />
        <div className="border-t-2 border-dashed border-neutral-200 mx-5" />
      </div>

      <div className="p-6 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
              Lugar Asignado
            </span>
            <span className="text-2xl font-black font-mono text-[#7a132b] leading-tight">
              {etiquetaAsiento}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
              Titular Acreditado
            </span>
            <span className="text-xs font-bold text-neutral-900 block truncate max-w-[160px]">
              {nombreTitular}
            </span>
          </div>
        </div>

        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-4">
          <div className="w-16 h-16 bg-white p-1 rounded-xl border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs">
            <QRCodeSVG value={boleto.codigoQr} size={56} level="M" includeMargin title={`Código QR ${boleto.codigoQr}`} />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase">Identificador manual</span>
            <span className="font-mono text-xs font-bold tracking-widest text-neutral-800 truncate block">
              {codigoManual}
            </span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">Acreditación nominal intransferible</span>
          </div>
        </div>

        {/* Botonera de acciones (Ampliar QR, Descargar PDF y Cancelar) */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => alAmpliarQr(boleto)}
            disabled={!estaActivo}
            className="flex-1 py-2.5 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Ampliar QR</span>
          </button>

          {/* Botón nuevo para la descarga directa del PDF real */}
          <button
            type="button"
            onClick={manejarDescargaPdf}
            className="py-2.5 px-3 bg-neutral-100 hover:bg-[#7a132b] hover:text-white text-neutral-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Descargar Boleto en PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => alCancelar(boleto)}
            disabled={!cancelacionPermitida}
            className="px-3 py-2.5 border border-neutral-300 hover:border-rose-300 hover:text-rose-600 rounded-xl text-xs font-semibold text-neutral-600 transition-colors cursor-pointer disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>

        {mensajeRestriccion && (
          <p role="alert" className="text-[11px] leading-relaxed text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {mensajeRestriccion}
          </p>
        )}
      </div>
    </div>
  );
};