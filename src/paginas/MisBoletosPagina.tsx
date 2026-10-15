import React, { useState } from 'react';
import { obtenerMensaje, MensajeSistema } from '../dominio/mensajes';
import { BOLETOS_INICIALES } from '../datos';
import { BoletoDigital } from '../tipos';
import { ModalBoletoQR } from '../componentes/taquilla/ModalBoletoQR';
import { QrCode, Calendar, MapPin, AlertTriangle, X, Clock, CheckCircle2 } from 'lucide-react';

interface PropiedadesMisBoletos {
  navigate?: (ruta: string) => void;
}

export const MisBoletosPagina: React.FC<PropiedadesMisBoletos> = ({ navigate }) => {
  const [pestanaActiva, setPestanaActiva] = useState<'activos' | 'historial'>('activos');
  const [boletos, setBoletos] = useState<BoletoDigital[]>(BOLETOS_INICIALES);
  
  // Estados para modales y notificaciones
  const [boletoParaQR, setBoletoParaQR] = useState<BoletoDigital | null>(null);
  const [boletoACancelar, setBoletoACancelar] = useState<BoletoDigital | null>(null);
  const [notificacion, setNotificacion] = useState<MensajeSistema | null>(null);

  // Filtrado según el estado del boleto (CU-MT-05)
  const boletosActivos = boletos.filter((b) => b.estado === 'valido');
  const boletosHistorial = boletos.filter((b) => b.estado === 'utilizado' || b.estado === 'cancelado');

  // Validaciones de Cancelación (CU-MT-06)
  const solicitarCancelacion = (boleto: BoletoDigital) => {
    // Regla 1: Boleto ya utilizado (ERR-MT-09)
    if (boleto.estado === 'utilizado') {
      setNotificacion(obtenerMensaje('ERR-MT-09'));
      return;
    }

    // Regla 2: Menos de 24 horas antes del inicio del evento (ERR-MT-08)
    const horaInicioStr = boleto.horaEvento.split(' - ')[0] || '00:00';
    const fechaHoraEvento = new Date(`${boleto.fechaEvento}T${horaInicioStr}:00`).getTime();
    const ahora = new Date().getTime();
    const horasRestantes = (fechaHoraEvento - ahora) / (1000 * 60 * 60);

    if (horasRestantes < 24 && horasRestantes > 0) {
      setNotificacion(obtenerMensaje('ERR-MT-08'));
      return;
    }

    setBoletoACancelar(boleto);
  };

  const confirmarCancelacion = () => {
    if (!boletoACancelar) return;

    setBoletos((prev) =>
      prev.map((b) =>
        b.id === boletoACancelar.id ? { ...b, estado: 'cancelado' } : b
      )
    );

    setBoletoACancelar(null);
    setNotificacion(obtenerMensaje('OK-MT-02'));
  };

  const mensajeVacio = obtenerMensaje('INF-MT-06');
  const advertenciaCancelacion = obtenerMensaje('AV-MT-01');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Reservaciones y Boletos</h1>
      <p className="text-gray-600 mb-6">Gestiona tus accesos e historial de asistencia a eventos en ESCOM.</p>

      {/* Notificaciones del Sistema */}
      {notificacion && (
        <div className={`mb-6 p-4 rounded-lg flex items-start justify-between border ${
          notificacion.tipo === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
          notificacion.tipo === 'exito' ? 'bg-green-50 text-green-800 border-green-200' :
          'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <div>
            <p className="font-semibold">{notificacion.titulo}</p>
            <p className="text-sm mt-0.5">{notificacion.descripcion}</p>
          </div>
          <button onClick={() => setNotificacion(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Pestañas Activos / Historial */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setPestanaActiva('activos')}
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === 'activos'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Boletos Activos ({boletosActivos.length})
        </button>
        <button
          onClick={() => setPestanaActiva('historial')}
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors cursor-pointer ${
            pestanaActiva === 'historial'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial de Asistencia ({boletosHistorial.length})
        </button>
      </div>

      {/* Renderizado de Boletos */}
      {(pestanaActiva === 'activos' ? boletosActivos : boletosHistorial).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">{mensajeVacio.titulo}</h3>
          <p className="text-gray-600 text-sm mt-1 mb-4">{mensajeVacio.descripcion}</p>
          {navigate && (
            <button
              onClick={() => navigate('/eventos')}
              className="px-4 py-2 bg-[#7a132b] text-white rounded-xl text-xs font-bold hover:bg-[#630f23] transition-colors cursor-pointer"
            >
              Ver Cartelera de Eventos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(pestanaActiva === 'activos' ? boletosActivos : boletosHistorial).map((boleto) => (
            <div key={boleto.id} className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    boleto.estado === 'valido' ? 'bg-green-100 text-green-800' :
                    boleto.estado === 'utilizado' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {boleto.estado === 'valido' ? 'VÁLIDO' :
                     boleto.estado === 'utilizado' ? 'ASISTIDO' : 'CANCELADO'}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">Folio: #{boleto.id}</span>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  {boleto.tituloEvento}
                </h3>

                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{boleto.fechaEvento} ({boleto.horaEvento})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{boleto.nombreRecinto}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-50 inline-block px-2.5 py-1 rounded">
                    Lugar: {boleto.etiquetaAsiento}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="bg-gray-50 px-5 py-3 border-t border-neutral-200 flex gap-3">
                {pestanaActiva === 'activos' ? (
                  <>
                    <button
                      onClick={() => setBoletoParaQR(boleto)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      Ver Código QR
                    </button>
                    <button
                      onClick={() => solicitarCancelacion(boleto)}
                      className="px-4 border border-red-300 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                    <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    <span>
                      {boleto.estado === 'utilizado' ? 'Asistencia registrada en puerta' : 'Boleto invalidado'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reutilización del Modal con QR Real e Imprimible */}
      <ModalBoletoQR
        boleto={boletoParaQR}
        alCerrar={() => setBoletoParaQR(null)}
      />

      {/* Modal CONFIRMAR CANCELACIÓN (AV-MT-01) */}
      {boletoACancelar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-lg">{advertenciaCancelacion.titulo}</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">{advertenciaCancelacion.descripcion}</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBoletoACancelar(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Conservar Boleto
              </button>
              <button
                onClick={confirmarCancelacion}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors"
              >
                Sí, Cancelar Reservación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisBoletosPagina;