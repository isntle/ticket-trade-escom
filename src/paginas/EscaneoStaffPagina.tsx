import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Camera,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { RegistroEscaneo, BoletoDigital } from '../tipos';

interface PropiedadesEscaneoStaff {
  navigate: (ruta: string) => void;
}

export const EscaneoStaffPagina: React.FC<PropiedadesEscaneoStaff> = ({ navigate }) => {
  const { listaBoletos, procesarCheckIn, bitacoraEscaneos, listaEventos } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [eventoActivoId, setEventoActivoId] = useState('evt-simposio-ia');
  const [fechaActivaId, setFechaActivaId] = useState('fec-simposio-d1');

  // Resultado de escaneo activo (soft screen)
  const [ultimoResultado, setUltimoResultado] = useState<{
    exito: boolean;
    resultado: RegistroEscaneo['resultado'];
    boleto?: BoletoDigital;
    mensaje: string;
    horaRegistro?: string;
  } | null>(null);

  const eventoSeleccionado = listaEventos.find((e) => e.id === eventoActivoId) || listaEventos[0];
  const fechaSeleccionada =
    eventoSeleccionado?.fechas.find((f) => f.id === fechaActivaId) || eventoSeleccionado?.fechas[0];

  // Cálculo de aforo e ingresos en vivo en puerta
  const boletosEvento = listaBoletos.filter((b) => b.idEvento === eventoSeleccionado?.id);
  const totalEmitidos = boletosEvento.length || 120;
  const totalIngresados = boletosEvento.filter((b) => b.estado === 'utilizado').length;
  const porcentajeIngreso = Math.round((totalIngresados / totalEmitidos) * 100);

  // Códigos de prueba prefabricados para demostración instantánea
  const codigosDemostracion = [
    {
      etiqueta: 'Boleto Válido (Carlos Méndez · C-7)',
      codigo: 'TT-ESCOM-IA26-D1-C7-VALIDO'
    },
    {
      etiqueta: 'Boleto VIP Válido (Mariana Morales · A-5)',
      codigo: 'TT-ESCOM-IA26-VIP-A5-VALIDO'
    },
    {
      etiqueta: 'Boleto YA UTILIZADO (Fraude / Duplicado)',
      codigo: 'TT-ESCOM-IA26-D2-D8-YAUSADO'
    },
    {
      etiqueta: 'Código No Emitido / Inválido',
      codigo: 'QR-FALSO-ESCOM-999'
    }
  ];

  const ejecutarEscaneo = (codigoAProcesar: string) => {
    if (!codigoAProcesar.trim()) return;

    const res = procesarCheckIn(codigoAProcesar.trim(), usuarioActual.nombre);
    const ahora = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    setUltimoResultado({
      ...res,
      horaRegistro: ahora
    });
    setCodigoIngresado('');
  };

  const limpiarParaSiguiente = () => {
    setUltimoResultado(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 min-h-[85vh] flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* CASO A: PANTALLA DE RESULTADO ULTRA-ENFOCADA (Soft Green / Soft Red)     */}
      {/* ========================================================================= */}
      {ultimoResultado ? (
        <div
          className={`my-auto p-7 rounded-3xl border text-center shadow-lg transition-all animate-in zoom-in-95 duration-150 flex flex-col justify-between min-h-[460px] ${
            ultimoResultado.exito
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/90 border-rose-300 text-rose-950'
          }`}
        >
          <div className="space-y-4">
            {/* Icono de Verificación Suave */}
            <div className="pt-2">
              {ultimoResultado.exito ? (
                <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-12 h-12 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <XCircle className="w-12 h-12 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {ultimoResultado.exito ? '✓ Entrada válida' : '✕ Entrada no válida'}
              </h2>
              <p className="text-xs mt-1.5 opacity-90 max-w-xs mx-auto leading-relaxed">
                {ultimoResultado.mensaje}
              </p>
            </div>

            {/* Tarjeta del Asistente (legible sin saturación) */}
            {ultimoResultado.boleto ? (
              <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-black/10 text-left text-xs space-y-2.5 shadow-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">
                    Asistente
                  </span>
                  <span className="font-extrabold text-neutral-900 text-base">
                    {ultimoResultado.boleto.nombreUsuario}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                  <span className="text-neutral-500">Lugar Asignado:</span>
                  <span className="font-mono font-black text-lg text-[#7a132b]">
                    {ultimoResultado.boleto.etiquetaAsiento || 'General'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                  <span>Hora de ingreso:</span>
                  <span className="font-mono font-semibold text-neutral-800">
                    {ultimoResultado.horaRegistro} hrs
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/70 border border-black/10 text-xs">
                <span className="text-rose-900 font-semibold block">
                  El código no corresponde a un boleto registrado para esta fecha.
                </span>
              </div>
            )}
          </div>

          {/* Botón Principal para Continuar */}
          <div className="pt-6">
            <button
              type="button"
              autoFocus
              onClick={limpiarParaSiguiente}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                ultimoResultado.exito
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <span>Escanear siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CASO B: ESTADO INICIAL DE ESCANEO ACTIVO (Visor + Contador)               */
        /* ========================================================================= */
        <div className="space-y-5 my-auto">
          {/* Identidad del Evento y Recinto */}
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold tracking-widest text-[#7a132b] uppercase">
              Control de Acceso Operacional
            </span>
            <h1 className="text-lg font-black text-neutral-900 line-clamp-1">
              {eventoSeleccionado?.titulo}
            </h1>
            <div className="text-xs text-neutral-500 flex items-center justify-center gap-2">
              <span className="font-mono font-semibold text-neutral-800">
                {fechaSeleccionada?.fecha}
              </span>
              <span aria-hidden="true" className="text-neutral-300">·</span>
              <span className="font-semibold text-neutral-700">AUDITORIO</span>
            </div>
          </div>

          {/* Contador de Ingresos en Puerta */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#7a132b]" />
                <span>Ingresos Registrados</span>
              </span>
              <span className="font-mono font-black text-neutral-900">
                {totalIngresados} / {totalEmitidos} ({porcentajeIngreso}%)
              </span>
            </div>
            <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, porcentajeIngreso)}%` }}
              />
            </div>
          </div>

          {/* Visor de Cámara Simulado con Guía de Enfoque QR */}
          <div className="bg-neutral-950 rounded-3xl p-6 text-white text-center relative overflow-hidden shadow-md">
            {/* Esquinas guía del visor */}
            <div className="relative w-56 h-56 mx-auto flex flex-col items-center justify-center">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />

              {/* Línea roja láser de escaneo animada */}
              <div className="absolute inset-x-4 h-0.5 bg-rose-500 shadow-lg shadow-rose-500 animate-pulse" />

              <Camera className="w-12 h-12 text-neutral-500 mb-2" />
              <span className="text-xs font-mono tracking-wider text-neutral-300">
                Apunta al código QR del asistente
              </span>
            </div>
          </div>

          {/* Ingreso Manual de Código o Simulador Rápido */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3">
            <span className="text-xs font-bold text-neutral-800 block">
              Prueba Rápida o Ingreso Manual:
            </span>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ejecutarEscaneo(codigoIngresado);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={codigoIngresado}
                onChange={(e) => setCodigoIngresado(e.target.value)}
                placeholder="Ingresar código QR (ej: TT-ESCOM-...)"
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#7a132b]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-neutral-900 hover:bg-[#7a132b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Validar
              </button>
            </form>

            {/* Botones de simulación directa de casos de uso reales */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {codigosDemostracion.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => ejecutarEscaneo(item.codigo)}
                  className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-[10px] font-semibold text-neutral-700 text-left transition-colors cursor-pointer truncate"
                  title={item.codigo}
                >
                  {item.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pie Operativo */}
      <div className="pt-4 text-center">
        <button
          type="button"
          onClick={() => navigate('/staff/ocupacion')}
          className="text-xs font-semibold text-[#7a132b] hover:underline cursor-pointer"
        >
          Ver Mapa de Ocupabilidad en Vivo de la Sala →
        </button>
      </div>
    </div>
  );
};
