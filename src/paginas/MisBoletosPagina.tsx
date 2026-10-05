import React, { useState } from 'react';
import {
  Ticket as IconoBoleto,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  Printer,
  XCircle,
  AlertTriangle,
  Download,
  Share2,
  CheckCircle2,
  Building,
  User,
  ShieldCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { VentanaModal } from '../componentes/ui/VentanaModal';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { BoletoDigital } from '../tipos';

interface PropiedadesMisBoletos {
  navigate: (ruta: string) => void;
}

export const MisBoletosPagina: React.FC<PropiedadesMisBoletos> = ({ navigate }) => {
  const { listaBoletos, cancelarReservacion } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [boletoSeleccionado, setBoletoSeleccionado] = useState<BoletoDigital | null>(null);
  const [modalConfirmarCancelacion, setModalConfirmarCancelacion] = useState<BoletoDigital | null>(
    null
  );

  // Filtrar boletos del usuario actual
  const misBoletos = listaBoletos.filter((b) => b.idUsuario === usuarioActual.id);

  const manejarCancelarReservacion = (boleto: BoletoDigital) => {
    cancelarReservacion(boleto.idReservacion);
    setModalConfirmarCancelacion(null);
    mostrarNotificacion(
      'Reservación cancelada',
      'Tu lugar ha sido liberado para la comunidad en lista de espera.',
      'informacion'
    );
  };

  const imprimirBoleto = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Cabecera Editorial */}
      <div className="mb-8">
        <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
          Taquilla Digital y Acreditación ESCOM
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-0.5">
          Mis Boletos de Acceso Oficial
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
          Presenta tu pase con código QR en pantalla o impreso al ingresar al recinto. Cada boleto está validado por tu identidad institucional.
        </p>
      </div>

      {misBoletos.length === 0 ? (
        <EstadoVacio
          icono={<IconoBoleto className="w-8 h-8" />}
          titulo="No tienes reservaciones activas"
          descripcion="Explora los congresos, simposios y talleres académicos disponibles en la cartelera institucional para apartar tu butaca numerada."
          textoAccion="Explorar Cartelera de Eventos"
          alHacerAccion={() => navigate('/eventos')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {misBoletos.map((boleto) => {
            const estaCancelado = boleto.estado === 'cancelado';
            const estaUtilizado = boleto.estado === 'utilizado';

            return (
              /* ========================================================================= */
              /* BOLETO DIGITAL COMO OBJETO FÍSICO-DIGITAL CON PERFORACIÓN Y MUESCAS     */
              /* ========================================================================= */
              <div
                key={boleto.id}
                className={`relative bg-white rounded-3xl border border-neutral-300 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                  estaCancelado ? 'opacity-50 grayscale' : ''
                }`}
              >
                {/* 1. SECCIÓN SUPERIOR: Membrete del Evento y Recinto */}
                <div className="p-6 bg-[#fafaf9] border-b border-neutral-200/80">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-mono text-[10px] tracking-wider text-neutral-400 font-bold uppercase">
                      ESCOM IPN · TICKET TRADE
                    </span>

                    {/* Estado legible sin destrucción visual */}
                    {estaUtilizado ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Entrada Registrada</span>
                      </span>
                    ) : estaCancelado ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-600 text-[10px] font-bold">
                        Cancelado
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Boleto Activo
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-neutral-900 leading-snug line-clamp-2">
                    {boleto.tituloEvento}
                  </h3>

                  <div className="mt-3 flex items-center gap-4 text-xs text-neutral-600">
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-800">
                      <Calendar className="w-3.5 h-3.5 text-[#7a132b]" />
                      {boleto.fechaEvento}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {boleto.horaEvento} hrs
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{boleto.nombreRecinto}</span>
                  </div>
                </div>

                {/* 2. LÍNEA DE PERFORACIÓN CON MUESCAS CIRCULARES LATERALES */}
                <div className="relative py-1 bg-white">
                  {/* Muesca izquierda */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fafaf9] border border-neutral-300 shadow-inner" />
                  {/* Muesca derecha */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fafaf9] border border-neutral-300 shadow-inner" />
                  {/* Línea punteada de corte */}
                  <div className="border-t-2 border-dashed border-neutral-200 mx-5" />
                </div>

                {/* 3. SECCIÓN INFERIOR: Lugar Destacado y Código QR */}
                <div className="p-6 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                        Lugar Asignado
                      </span>
                      <span className="text-2xl font-black font-mono text-[#7a132b] leading-tight">
                        {boleto.etiquetaAsiento || 'Acceso General'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                        Titular Acreditado
                      </span>
                      <span className="text-xs font-bold text-neutral-900 block truncate max-w-[140px]">
                        {boleto.nombreUsuario}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {usuarioActual.boleta || 'Docente'}
                      </span>
                    </div>
                  </div>

                  {/* Código QR con contenedor de alto contraste */}
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-4">
                    <div className="w-16 h-16 bg-white p-1 rounded-xl border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <QRCodeSVG
                        value={boleto.codigoQr}
                        size={56}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#171717"
                        includeMargin
                        title={`Código QR del boleto ${boleto.codigoQr}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                        Código de Acceso
                      </span>
                      <span className="font-mono text-xs font-bold text-neutral-800 truncate block">
                        {boleto.codigoQr}
                      </span>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        Acreditación nominal intransferible
                      </span>
                    </div>
                  </div>

                  {/* Acciones del Boleto */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBoletoSeleccionado(boleto)}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Ampliar Código QR</span>
                    </button>

                    {!estaCancelado && !estaUtilizado && (
                      <button
                        type="button"
                        onClick={() => setModalConfirmarCancelacion(boleto)}
                        title="Cancelar reservación"
                        className="px-3 py-2.5 border border-neutral-300 hover:border-rose-300 hover:text-rose-600 rounded-xl text-xs font-semibold text-neutral-600 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE AMPLIACIÓN E IMPRESIÓN DEL BOLETO                               */}
      {/* ========================================================================= */}
      {boletoSeleccionado && (
        <VentanaModal
          estaAbierto={Boolean(boletoSeleccionado)}
          alCerrar={() => setBoletoSeleccionado(null)}
          titulo="Pase Digital de Acceso ESCOM IPN"
          subtitulo="Presenta este código ante el lector del Staff en la entrada del recinto"
          anchoMaximo="md"
        >
          <div className="space-y-6 text-center">
            {/* Boleto Completo en Modal */}
            <div className="p-6 bg-white border-2 border-dashed border-neutral-300 rounded-3xl max-w-xs mx-auto shadow-inner">
              <span className="font-mono text-[10px] font-bold text-neutral-400 tracking-widest block uppercase mb-3">
                TICKET TRADE · PASE OFICIAL
              </span>

              <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-neutral-200 mx-auto flex items-center justify-center shadow-md">
                <QRCodeSVG
                  value={boletoSeleccionado.codigoQr}
                  size={160}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#171717"
                  includeMargin
                  title={`Código QR del boleto ${boletoSeleccionado.codigoQr}`}
                />
              </div>

              <div className="mt-3 font-mono text-xs font-extrabold text-[#7a132b] break-all px-2">
                {boletoSeleccionado.codigoQr}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 text-left text-xs space-y-1">
                <div className="font-bold text-neutral-900 text-sm line-clamp-1">
                  {boletoSeleccionado.tituloEvento}
                </div>
                <div className="text-neutral-600 flex justify-between">
                  <span>Lugar:</span>
                  <span className="font-mono font-black text-[#7a132b]">
                    {boletoSeleccionado.etiquetaAsiento || 'General'}
                  </span>
                </div>
                <div className="text-neutral-600 flex justify-between">
                  <span>Titular:</span>
                  <span className="font-medium text-neutral-900">
                    {boletoSeleccionado.nombreUsuario}
                  </span>
                </div>
                <div className="text-neutral-600 flex justify-between">
                  <span>Fecha:</span>
                  <span className="font-medium text-neutral-900">
                    {boletoSeleccionado.fechaEvento} · {boletoSeleccionado.horaEvento} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones de Impresión y Cierre */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={imprimirBoleto}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Boleto</span>
              </button>

              <button
                type="button"
                onClick={() => setBoletoSeleccionado(null)}
                className="px-4 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </VentanaModal>
      )}

      {/* Modal de Confirmación de Cancelación */}
      {modalConfirmarCancelacion && (
        <VentanaModal
          estaAbierto={Boolean(modalConfirmarCancelacion)}
          alCerrar={() => setModalConfirmarCancelacion(null)}
          titulo="¿Confirmar cancelación de lugar?"
          subtitulo="Esta acción liberará tu butaca inmediatamente"
        >
          <div className="space-y-4 text-xs">
            <p className="text-neutral-600 leading-relaxed">
              ¿Estás seguro de que deseas cancelar tu reservación para{' '}
              <strong>{modalConfirmarCancelacion.tituloEvento}</strong> (Lugar:{' '}
              <strong className="text-[#7a132b] font-mono">
                {modalConfirmarCancelacion.etiquetaAsiento}
              </strong>
              )?
            </p>
            <p className="text-neutral-500 text-[11px]">
              El lugar será reasignado inmediatamente a los alumnos y participantes que se encuentran en lista de espera.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmarCancelacion(null)}
                className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Conservar Boleto
              </button>

              <button
                type="button"
                onClick={() => manejarCancelarReservacion(modalConfirmarCancelacion)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Sí, Cancelar y Liberar
              </button>
            </div>
          </div>
        </VentanaModal>
      )}
    </div>
  );
};
