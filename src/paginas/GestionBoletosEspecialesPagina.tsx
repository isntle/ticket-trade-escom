import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Eye,
  Mail,
  MapPin,
  PackageCheck,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Star,
  Ticket,
  UserCog,
  Users
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useDatos } from '../contextos/DatosContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { AlertaMensaje } from '../componentes/ui/AlertaMensaje';
import { EstadoVacio } from '../componentes/ui/EstadoVacio';
import { InsigniaEstado } from '../componentes/ui/InsigniaEstado';
import { VentanaModal } from '../componentes/ui/VentanaModal';
import { BoletoDigital, TipoBoletoEspecial } from '../tipos';

interface PropiedadesGestionBoletosEspeciales {
  eventId: string;
  navigate: (ruta: string) => void;
}

const ETIQUETAS_TIPO: Record<TipoBoletoEspecial, string> = {
  organizador: 'Comité organizador',
  staff: 'Staff de apoyo',
  vip: 'Invitado VIP'
};

const ICONOS_TIPO: Record<TipoBoletoEspecial, React.ReactNode> = {
  organizador: <Users className="w-4 h-4" />,
  staff: <UserCog className="w-4 h-4" />,
  vip: <Star className="w-4 h-4" />
};

const CLASES_TIPO: Record<TipoBoletoEspecial, string> = {
  organizador: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  staff: 'bg-violet-50 text-violet-800 border-violet-200',
  vip: 'bg-amber-50 text-amber-900 border-amber-200'
};

export const GestionBoletosEspecialesPagina: React.FC<PropiedadesGestionBoletosEspeciales> = ({
  eventId,
  navigate
}) => {
  const {
    listaEventos,
    listaBoletos,
    emitirBoletosEspeciales,
    invalidarBoletoEspecial
  } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const evento = listaEventos.find((elemento) => elemento.id === eventId);
  const [modalEmisionAbierto, setModalEmisionAbierto] = useState(false);
  const [boletoParaInvalidar, setBoletoParaInvalidar] = useState<BoletoDigital | null>(null);
  const [boletoParaConsultar, setBoletoParaConsultar] = useState<BoletoDigital | null>(null);
  const [motivoInvalidacion, setMotivoInvalidacion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'valido' | 'utilizado' | 'cancelado'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoBoletoEspecial>('todos');
  const [ultimoLote, setUltimoLote] = useState<BoletoDigital[]>([]);

  const [idFechaEvento, setIdFechaEvento] = useState(evento?.fechas[0]?.id || '');
  const [tipoEspecial, setTipoEspecial] = useState<TipoBoletoEspecial>('vip');
  const [cantidad, setCantidad] = useState(1);
  const [nombreBase, setNombreBase] = useState('Invitado VIP');
  const [correoDestino, setCorreoDestino] = useState(usuarioActual?.correo || '');

  const boletosEspeciales = useMemo(
    () => listaBoletos.filter((boleto) => boleto.idEvento === eventId && boleto.esEspecial),
    [eventId, listaBoletos]
  );

  const boletosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return boletosEspeciales.filter((boleto) => {
      const coincideEstado = filtroEstado === 'todos' || boleto.estado === filtroEstado;
      const coincideTipo = filtroTipo === 'todos' || boleto.tipoEspecial === filtroTipo;
      const coincideBusqueda =
        !termino ||
        boleto.nombreUsuario.toLowerCase().includes(termino) ||
        boleto.codigoQr.toLowerCase().includes(termino) ||
        (boleto.etiquetaAsiento || '').toLowerCase().includes(termino);
      return coincideEstado && coincideTipo && coincideBusqueda;
    });
  }, [boletosEspeciales, busqueda, filtroEstado, filtroTipo]);

  if (!evento) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EstadoVacio
          titulo="Evento no encontrado"
          descripcion="El evento solicitado no existe o ya no está disponible."
          textoAccion="Volver a Mis Eventos"
          alHacerAccion={() => navigate('/organizador')}
        />
      </div>
    );
  }

  if (!usuarioActual || !usuarioActual.roles.includes('organizador') || usuarioActual.id !== evento.idOrganizador) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-xl font-black">Acceso restringido</h1><p className="mt-2 text-sm text-neutral-600">Solo el organizador responsable puede administrar los boletos especiales de este evento.</p><button className="mt-5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white" onClick={() => navigate('/organizador')}>Volver a mis eventos</button></div>;
  }

  const fechaSeleccionada = evento.fechas.find((fecha) => fecha.id === idFechaEvento);
  const totalActivos = boletosEspeciales.filter((boleto) => boleto.estado === 'valido').length;
  const totalUtilizados = boletosEspeciales.filter((boleto) => boleto.estado === 'utilizado').length;
  const totalInvalidados = boletosEspeciales.filter((boleto) => boleto.estado === 'cancelado').length;

  const abrirModalEmision = () => {
    setIdFechaEvento(evento.fechas[0]?.id || '');
    setTipoEspecial('vip');
    setCantidad(1);
    setNombreBase('Invitado VIP');
    setCorreoDestino(usuarioActual?.correo || '');
    setModalEmisionAbierto(true);
  };

  const cambiarTipo = (tipo: TipoBoletoEspecial) => {
    setTipoEspecial(tipo);
    const nombres: Record<TipoBoletoEspecial, string> = {
      organizador: 'Integrante del comité',
      staff: 'Integrante de staff',
      vip: 'Invitado VIP'
    };
    setNombreBase(nombres[tipo]);
  };

  const manejarEmision = (eventoFormulario: React.FormEvent) => {
    eventoFormulario.preventDefault();
    const resultado = emitirBoletosEspeciales({
      idEvento: evento.id,
      idFechaEvento,
      tipo: tipoEspecial,
      cantidad,
      nombreBase,
      correoDestino,
      emitidoPor: usuarioActual?.nombre || 'Organizador acreditado',
      idOrganizador: usuarioActual?.id || ''
    });

    if (!resultado.exito || !resultado.boletos) {
      mostrarNotificacion('No fue posible emitir los boletos', resultado.error || '', 'error');
      return;
    }

    setUltimoLote(resultado.boletos);
    setModalEmisionAbierto(false);
    mostrarNotificacion(
      'Paquete de boletos generado',
      `Se emitieron ${resultado.boletos.length} acreditación(es) ${ETIQUETAS_TIPO[tipoEspecial].toLowerCase()}.`,
      'exito'
    );
  };

  const manejarInvalidacion = () => {
    if (!boletoParaInvalidar) return;
    const resultado = invalidarBoletoEspecial(
      boletoParaInvalidar.id,
      motivoInvalidacion,
      usuarioActual?.nombre || 'Organizador acreditado'
    );

    if (!resultado.exito) {
      mostrarNotificacion('No fue posible invalidar el boleto', resultado.error || '', 'error');
      return;
    }

    setBoletoParaInvalidar(null);
    setMotivoInvalidacion('');
    mostrarNotificacion(
      'Boleto especial invalidado',
      'El código QR quedó cancelado y será rechazado por el módulo de acceso.',
      'informacion'
    );
  };

  const descargarUltimoLote = () => {
    if (ultimoLote.length === 0) return;
    const contenido = ultimoLote
      .map(
        (boleto, indice) =>
          `${indice + 1}. ${boleto.nombreUsuario}\n` +
          `Tipo: ${ETIQUETAS_TIPO[boleto.tipoEspecial || 'vip']}\n` +
          `Sesión: ${boleto.fechaEvento} · ${boleto.horaEvento}\n` +
          `Código QR: ${boleto.codigoQr}\n`
      )
      .join('\n');
    const archivo = new Blob([`TICKET TRADE ESCOM\n${evento.titulo}\n\n${contenido}`], {
      type: 'text/plain;charset=utf-8'
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `boletos-especiales-${evento.id}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => navigate(`/organizador/eventos/${evento.id}`)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la configuración del evento</span>
      </button>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
        <div>
          <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
            Motor de Taquilla · CU-MT-07
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-0.5">
            Gestión de boletos especiales
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-3xl">
            Emite e invalida acreditaciones con código QR para Comité Organizador, Staff de apoyo e invitados VIP de <strong className="text-neutral-700">{evento.titulo}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalEmision}
          disabled={evento.fechas.length === 0}
          className="px-5 py-3 rounded-xl bg-[#7a132b] hover:bg-[#620f23] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generar boletos especiales</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Boletos activos</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{totalActivos}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Códigos QR disponibles para acceso</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Accesos registrados</span>
            <CheckCircle2 className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{totalUtilizados}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Boletos utilizados en el recinto</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Invalidados</span>
            <Ban className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-neutral-900 mt-2">{totalInvalidados}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Códigos revocados por el Organizador</p>
        </div>
      </div>

      {ultimoLote.length > 0 && (
        <AlertaMensaje
          tipo="exito"
          titulo="Paquete listo para el Organizador"
          className="mb-6"
          mensaje={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>
                Se generaron {ultimoLote.length} boleto(s). El prototipo conserva los códigos y simula la notificación por correo.
              </span>
              <button
                type="button"
                onClick={descargarUltimoLote}
                className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold whitespace-nowrap cursor-pointer"
              >
                Descargar paquete
              </button>
            </div>
          }
        />
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-neutral-900">Acreditaciones emitidas</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Consulta el estado de cada QR y conserva la trazabilidad de las invalidaciones.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(eventoCampo) => setBusqueda(eventoCampo.target.value)}
                placeholder="Buscar nombre o código"
                className="w-full sm:w-52 pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 text-xs outline-none focus:ring-2 focus:ring-[#7a132b]/15 focus:border-[#7a132b]"
              />
            </label>
            <select
              value={filtroTipo}
              onChange={(eventoCampo) => setFiltroTipo(eventoCampo.target.value as 'todos' | TipoBoletoEspecial)}
              className="px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:border-[#7a132b]"
            >
              <option value="todos">Todos los tipos</option>
              <option value="organizador">Organizador</option>
              <option value="staff">Staff</option>
              <option value="vip">VIP</option>
            </select>
            <select
              value={filtroEstado}
              onChange={(eventoCampo) => setFiltroEstado(eventoCampo.target.value as typeof filtroEstado)}
              className="px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:border-[#7a132b]"
            >
              <option value="todos">Todos los estados</option>
              <option value="valido">Activos</option>
              <option value="utilizado">Utilizados</option>
              <option value="cancelado">Invalidados</option>
            </select>
          </div>
        </div>

        {boletosFiltrados.length === 0 ? (
          <div className="p-6">
            <EstadoVacio
              icono={<Ticket className="w-7 h-7" />}
              titulo={boletosEspeciales.length === 0 ? 'Aún no hay boletos especiales' : 'No hay coincidencias'}
              descripcion={
                boletosEspeciales.length === 0
                  ? 'Genera el primer paquete de acreditaciones para el equipo organizador, Staff o invitados VIP.'
                  : 'Modifica los filtros o el término de búsqueda para consultar otros boletos.'
              }
              textoAccion={boletosEspeciales.length === 0 ? 'Generar primer paquete' : undefined}
              alHacerAccion={boletosEspeciales.length === 0 ? abrirModalEmision : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase text-[10px] tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="px-5 py-3 font-bold">Titular o referencia</th>
                  <th className="px-5 py-3 font-bold">Tipo</th>
                  <th className="px-5 py-3 font-bold">Sesión</th>
                  <th className="px-5 py-3 font-bold">Estado</th>
                  <th className="px-5 py-3 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {boletosFiltrados.map((boleto) => (
                  <tr key={boleto.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-5 py-4 min-w-56">
                      <div className="font-bold text-neutral-900">{boleto.nombreUsuario}</div>
                      <div className="font-mono text-[10px] text-neutral-400 mt-0.5 max-w-64 truncate">
                        {boleto.codigoQr}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold whitespace-nowrap ${CLASES_TIPO[boleto.tipoEspecial || 'vip']}`}>
                        {ICONOS_TIPO[boleto.tipoEspecial || 'vip']}
                        {ETIQUETAS_TIPO[boleto.tipoEspecial || 'vip']}
                      </span>
                    </td>
                    <td className="px-5 py-4 min-w-48">
                      <div className="flex items-center gap-1.5 font-semibold text-neutral-700">
                        <CalendarDays className="w-3.5 h-3.5 text-[#7a132b]" />
                        {boleto.fechaEvento}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">{boleto.horaEvento} hrs</div>
                    </td>
                    <td className="px-5 py-4">
                      <InsigniaEstado estado={boleto.estado} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setBoletoParaConsultar(boleto)}
                          className="p-2 rounded-lg border border-neutral-300 text-neutral-600 hover:text-[#7a132b] hover:border-[#7a132b]/40 cursor-pointer transition-colors"
                          title="Consultar código QR"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {boleto.estado === 'valido' && (
                          <button
                            type="button"
                            onClick={() => {
                              setBoletoParaInvalidar(boleto);
                              setMotivoInvalidacion('');
                            }}
                            className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold cursor-pointer transition-colors"
                          >
                            Invalidar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VentanaModal
        estaAbierto={modalEmisionAbierto}
        alCerrar={() => setModalEmisionAbierto(false)}
        titulo="Generar paquete de boletos especiales"
        subtitulo="Cada acreditación recibirá un identificador y código QR únicos"
        anchoMaximo="2xl"
      >
        <form onSubmit={manejarEmision} className="space-y-5">
          <div>
            <label htmlFor="sesion-especial" className="text-xs font-bold text-neutral-800 block mb-1.5">
              Sesión del evento
            </label>
            <select
              id="sesion-especial"
              required
              value={idFechaEvento}
              onChange={(eventoCampo) => setIdFechaEvento(eventoCampo.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:ring-2 focus:ring-[#7a132b]/15 focus:border-[#7a132b]"
            >
              {evento.fechas.map((fecha, indice) => (
                <option key={fecha.id} value={fecha.id}>
                  Día {indice + 1} · {fecha.fecha} · {fecha.horaInicio} a {fecha.horaFin}
                </option>
              ))}
            </select>
          </div>

          {fechaSeleccionada && (
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 grid sm:grid-cols-2 gap-3 text-xs text-neutral-600">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#7a132b]" />
                {fechaSeleccionada.fecha} · {fechaSeleccionada.horaInicio} - {fechaSeleccionada.horaFin}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#7a132b]" />
                Sesión oficial del evento
              </span>
            </div>
          )}

          <fieldset>
            <legend className="text-xs font-bold text-neutral-800 mb-2">Tipo de acreditación</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(ETIQUETAS_TIPO) as TipoBoletoEspecial[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => cambiarTipo(tipo)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tipoEspecial === tipo
                      ? 'border-[#7a132b] bg-[#7a132b]/5 ring-2 ring-[#7a132b]/10'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <span className="text-[#7a132b]">{ICONOS_TIPO[tipo]}</span>
                  <span className="block text-xs font-bold text-neutral-900 mt-2">{ETIQUETAS_TIPO[tipo]}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="sm:col-span-2 text-xs font-bold text-neutral-800">
              Nombre o referencia del paquete
              <input
                required
                value={nombreBase}
                onChange={(eventoCampo) => setNombreBase(eventoCampo.target.value)}
                placeholder="Ej. Invitado VIP"
                className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-xs font-normal outline-none focus:ring-2 focus:ring-[#7a132b]/15 focus:border-[#7a132b]"
              />
            </label>
            <label className="text-xs font-bold text-neutral-800">
              Cantidad
              <input
                required
                type="number"
                min={1}
                max={20}
                value={cantidad}
                onChange={(eventoCampo) => setCantidad(Number(eventoCampo.target.value))}
                className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-xs font-normal outline-none focus:ring-2 focus:ring-[#7a132b]/15 focus:border-[#7a132b]"
              />
            </label>
          </div>

          <label className="text-xs font-bold text-neutral-800 block">
            Correo que recibirá el paquete
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                required
                type="email"
                value={correoDestino}
                onChange={(eventoCampo) => setCorreoDestino(eventoCampo.target.value)}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-neutral-300 text-xs font-normal outline-none focus:ring-2 focus:ring-[#7a132b]/15 focus:border-[#7a132b]"
              />
            </div>
          </label>

          <AlertaMensaje
            tipo="informacion"
            mensaje="En este prototipo el envío de correo se representa mediante una confirmación y un paquete descargable. No se enviarán mensajes reales."
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalEmisionAbierto(false)}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#7a132b] hover:bg-[#620f23] text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              Generar paquete de QR
            </button>
          </div>
        </form>
      </VentanaModal>

      <VentanaModal
        estaAbierto={Boolean(boletoParaInvalidar)}
        alCerrar={() => {
          setBoletoParaInvalidar(null);
          setMotivoInvalidacion('');
        }}
        titulo="Invalidar boleto especial"
        subtitulo="El código QR dejará de ser válido para el control de acceso"
        anchoMaximo="md"
      >
        {boletoParaInvalidar && (
          <div className="space-y-4">
            <AlertaMensaje
              tipo="advertencia"
              mensaje={
                <span>
                  Se invalidará la acreditación de <strong>{boletoParaInvalidar.nombreUsuario}</strong>. Esta acción quedará registrada en el historial.
                </span>
              }
            />
            <label className="text-xs font-bold text-neutral-800 block">
              Motivo de la invalidación
              <textarea
                required
                rows={4}
                value={motivoInvalidacion}
                onChange={(eventoCampo) => setMotivoInvalidacion(eventoCampo.target.value)}
                placeholder="Ej. Cambio de integrante del equipo de apoyo"
                className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-xs font-normal resize-none outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
              />
            </label>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setBoletoParaInvalidar(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
              >
                Conservar boleto
              </button>
              <button
                type="button"
                disabled={!motivoInvalidacion.trim()}
                onClick={manejarInvalidacion}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                Confirmar invalidación
              </button>
            </div>
          </div>
        )}
      </VentanaModal>

      <VentanaModal
        estaAbierto={Boolean(boletoParaConsultar)}
        alCerrar={() => setBoletoParaConsultar(null)}
        titulo="Acreditación especial"
        subtitulo="Código QR individual para el control de acceso"
        anchoMaximo="md"
      >
        {boletoParaConsultar && (
          <div className="text-center space-y-5">
            <div className="w-52 h-52 mx-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm flex items-center justify-center">
              <QRCodeSVG
                value={boletoParaConsultar.codigoQr}
                size={176}
                level="M"
                bgColor="#ffffff"
                fgColor="#171717"
                includeMargin
                title={`Código QR de ${boletoParaConsultar.nombreUsuario}`}
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-[#7a132b]" />
                <InsigniaEstado estado={boletoParaConsultar.estado} />
              </div>
              <h4 className="text-lg font-extrabold text-neutral-900">{boletoParaConsultar.nombreUsuario}</h4>
              <p className="text-xs text-neutral-500 mt-1">
                {ETIQUETAS_TIPO[boletoParaConsultar.tipoEspecial || 'vip']} · {boletoParaConsultar.fechaEvento}
              </p>
              <p className="font-mono text-[10px] text-neutral-400 mt-3 break-all">
                {boletoParaConsultar.codigoQr}
              </p>
            </div>
            {boletoParaConsultar.estado === 'cancelado' && boletoParaConsultar.motivoInvalidacion && (
              <AlertaMensaje
                tipo="error"
                titulo="Boleto invalidado"
                mensaje={boletoParaConsultar.motivoInvalidacion}
              />
            )}
          </div>
        )}
      </VentanaModal>
    </div>
  );
};
