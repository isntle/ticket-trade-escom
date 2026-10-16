import React, { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Eye, Search, X } from 'lucide-react';
import { useDatos } from '../contextos/DatosContexto';
import { useAutenticacion } from '../contextos/AutenticacionContexto';

interface PropiedadesHistorial { navigate: (ruta: string) => void }

const obtenerFechaInstitucional = (fechaIso: string): string => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(fechaIso));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((item) => item.type === tipo)?.value || '';
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
};

export const HistorialAccesosPagina: React.FC<PropiedadesHistorial> = () => {
  const { bitacoraEscaneos, listaEventos, listaBoletos, listaReservaciones } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const [eventoId, setEventoId] = useState('todos');
  const [diaId, setDiaId] = useState('todos');
  const [texto, setTexto] = useState('');
  const [operador, setOperador] = useState('todos');
  const [tipoBoleto, setTipoBoleto] = useState<'todos' | 'regular' | 'especial'>('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [registroSeleccionado, setRegistroSeleccionado] = useState<(typeof bitacoraEscaneos)[number] | null>(null);
  const rangoInvalido = Boolean(desde && hasta && desde >= hasta);
  const esAuditoria = Boolean(usuarioActual?.roles.some((rol) => rol === 'admin' || rol === 'subdireccion'));
  const eventosVisibles = listaEventos.filter((evento) => esAuditoria || evento.idOrganizador === usuarioActual?.id);
  const diasVisibles = eventosVisibles.filter((evento) => eventoId === 'todos' || evento.id === eventoId).flatMap((evento) => evento.fechas);
  const registros = useMemo(() => bitacoraEscaneos.filter((registro) => {
    if (rangoInvalido) return false;
    if (!eventosVisibles.some((evento) => evento.id === registro.idEvento)) return false;
    if (eventoId !== 'todos' && registro.idEvento !== eventoId) return false;
    if (diaId !== 'todos' && registro.idFechaEvento !== diaId) return false;
    const boleto = listaBoletos.find((item) => item.id === registro.idBoleto);
    if (operador !== 'todos' && registro.escaneadoPor !== operador) return false;
    if (tipoBoleto === 'especial' && !boleto?.esEspecial) return false;
    if (tipoBoleto === 'regular' && boleto?.esEspecial) return false;
    const fechaRegistro = obtenerFechaInstitucional(registro.fechaEscaneo);
    if (desde && fechaRegistro < desde) return false;
    if (hasta && fechaRegistro > hasta) return false;
    const busqueda = texto.trim().toLowerCase();
    return !busqueda || [registro.escaneadoPor, registro.nombreAsistente, registro.idBoleto, boleto?.codigoQr].some((valor) => valor?.toLowerCase().includes(busqueda));
  }), [bitacoraEscaneos, eventosVisibles, eventoId, diaId, texto, operador, tipoBoleto, desde, hasta, rangoInvalido, listaBoletos]);
  const accesosCorrectos = registros.filter((registro) => registro.resultado === 'exito');
  const boletosQueIngresaron = accesosCorrectos.map((registro) => listaBoletos.find((boleto) => boleto.id === registro.idBoleto)).filter(Boolean);
  const cuentasIdentificadas = new Set(boletosQueIngresaron.filter((boleto) => !boleto?.esEspecial).map((boleto) => boleto?.idUsuario)).size;
  const accesosEspeciales = boletosQueIngresaron.filter((boleto) => boleto?.esEspecial).length;
  const reservacionesSinEntrada = listaReservaciones.filter((reserva) => {
    const boleto = listaBoletos.find((elemento) => elemento.idReservacion === reserva.id);
    const entraEnFiltro = eventosVisibles.some((evento) => evento.id === reserva.idEvento) &&
      (eventoId === 'todos' || reserva.idEvento === eventoId) &&
      (diaId === 'todos' || reserva.idFechaEvento === diaId);
    return entraEnFiltro && reserva.estado === 'confirmada' && !boleto?.fechaCheckIn;
  }).length;

  const limpiarFiltros = () => {
    setEventoId('todos');
    setDiaId('todos');
    setTexto('');
    setOperador('todos');
    setTipoBoleto('todos');
    setDesde('');
    setHasta('');
  };

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header className="mb-6"><span className="text-[11px] font-bold uppercase tracking-wider text-[#7a132b]">Check-in · IU-CI04</span><h1 className="mt-1 text-2xl font-black text-neutral-900">Historial de accesos</h1><p className="mt-1 text-sm text-neutral-600">Consulta de solo lectura de las entradas e intentos registrados.</p></header>
    <section className="mb-5 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
      <label className="text-xs font-semibold text-neutral-600">Evento<select value={eventoId} onChange={(e) => { setEventoId(e.target.value); setDiaId('todos'); }} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"><option value="todos">Todos mis eventos</option>{eventosVisibles.map((evento) => <option key={evento.id} value={evento.id}>{evento.titulo}</option>)}</select></label>
      <label className="text-xs font-semibold text-neutral-600">Día<select value={diaId} onChange={(e) => setDiaId(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"><option value="todos">Todos los días</option>{diasVisibles.map((dia, indice) => <option key={dia.id} value={dia.id}>{dia.nombreDia || `Día ${indice + 1}`} · {dia.fecha}</option>)}</select></label>
      <label className="text-xs font-semibold text-neutral-600">Búsqueda por asistente, operador o boleto<span className="mt-1 flex items-center gap-2 rounded-lg border border-neutral-300 px-2"><Search className="h-4 w-4"/><input value={texto} onChange={(e) => setTexto(e.target.value)} className="min-w-0 flex-1 py-2 text-sm outline-none" placeholder="Escribe para filtrar"/></span></label>
      <label className="text-xs font-semibold text-neutral-600">Operador<select value={operador} onChange={(e) => setOperador(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"><option value="todos">Todos</option>{Array.from(new Set(bitacoraEscaneos.filter((registro) => eventosVisibles.some((evento) => evento.id === registro.idEvento)).map((registro) => registro.escaneadoPor))).sort().map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}</select></label>
      <label className="text-xs font-semibold text-neutral-600">Tipo de boleto<select value={tipoBoleto} onChange={(e) => setTipoBoleto(e.target.value as typeof tipoBoleto)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"><option value="todos">Todos</option><option value="regular">General</option><option value="especial">Especial</option></select></label>
      <label className="text-xs font-semibold text-neutral-600">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"/></label>
      <label className="text-xs font-semibold text-neutral-600">Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"/></label>
      <div className="flex items-end"><button type="button" onClick={limpiarFiltros} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50">Limpiar filtros</button></div>
      {rangoInvalido && <p role="alert" className="text-xs font-semibold text-rose-700 sm:col-span-3 lg:col-span-4">La fecha “Desde” debe ser anterior a “Hasta”.</p>}
    </section>
    <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5"><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-neutral-500">Entradas registradas</p><strong className="text-2xl">{accesosCorrectos.length}</strong></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-neutral-500">Cuentas identificadas</p><strong className="text-2xl">{cuentasIdentificadas}</strong></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-neutral-500">Accesos especiales</p><strong className="text-2xl">{accesosEspeciales}</strong></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs text-neutral-500">Reservaciones sin entrada</p><strong className="text-2xl">{reservacionesSinEntrada}</strong></div><div className="col-span-2 rounded-2xl border bg-white p-4 lg:col-span-1"><p className="text-xs text-neutral-500">Intentos consultados</p><strong className="text-2xl">{registros.length}</strong><span className="block text-xs">{esAuditoria ? 'Auditoría institucional' : 'Eventos propios'}</span></div></section>
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="flex items-center gap-2 border-b p-4"><ClipboardList className="h-5 w-5 text-[#7a132b]"/><h2 className="font-bold">Registro de entradas</h2></div>{registros.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="p-3">Fecha y hora</th><th className="p-3">Evento / día</th><th className="p-3">Asistente / boleto</th><th className="p-3">Operador</th><th className="p-3">Resultado</th><th className="p-3">Detalle</th></tr></thead><tbody>{registros.map((registro) => { const evento = listaEventos.find((item) => item.id === registro.idEvento); const dia = evento?.fechas.find((item) => item.id === registro.idFechaEvento); const boleto = listaBoletos.find((item) => item.id === registro.idBoleto); const etiquetaTipo = boleto?.esEspecial ? `Especial · ${boleto.tipoEspecial || 'Acreditación'}` : 'General'; return <tr key={registro.id} className="border-t"><td className="whitespace-nowrap p-3"><CalendarDays className="mr-1 inline h-3.5 w-3.5"/>{new Date(registro.fechaEscaneo).toLocaleString('es-MX')}</td><td className="p-3">{evento?.titulo || 'Evento'}<span className="block text-xs text-neutral-500">{dia?.nombreDia || dia?.fecha}</span></td><td className="p-3">{registro.nombreAsistente || 'No identificado'}<span className="block text-xs text-neutral-500">{etiquetaTipo}</span><span className="block font-mono text-[10px] text-neutral-500">{boleto?.codigoQr || registro.idBoleto}</span></td><td className="p-3">{registro.escaneadoPor}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${registro.resultado === 'exito' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{registro.resultado}</span></td><td className="p-3"><button type="button" onClick={() => setRegistroSeleccionado(registro)} aria-label={`Ver detalle del acceso ${registro.id}`} className="rounded-lg border border-neutral-300 p-2 text-neutral-700 hover:bg-neutral-50"><Eye className="h-4 w-4"/></button></td></tr>; })}</tbody></table></div> : <p className="p-8 text-center text-sm text-neutral-500">No hay registros de acceso para los filtros seleccionados. Los totales se muestran en cero.</p>}</section>
    {registroSeleccionado && <div role="dialog" aria-modal="true" aria-labelledby="detalle-acceso-titulo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setRegistroSeleccionado(null); }}><section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-wider text-[#7a132b]">IU-CI04 · Solo consulta</span><h2 id="detalle-acceso-titulo" className="mt-1 text-lg font-black">Detalle del acceso</h2></div><button type="button" onClick={() => setRegistroSeleccionado(null)} aria-label="Cerrar detalle" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4"/></button></div>{(() => { const registro = registroSeleccionado; const evento = listaEventos.find((item) => item.id === registro.idEvento); const dia = evento?.fechas.find((item) => item.id === registro.idFechaEvento); const boleto = listaBoletos.find((item) => item.id === registro.idBoleto); const reservacion = boleto && listaReservaciones.find((item) => item.id === boleto.idReservacion); return <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-neutral-500">Fecha y hora</dt><dd className="font-semibold">{new Date(registro.fechaEscaneo).toLocaleString('es-MX')}</dd></div><div><dt className="text-xs text-neutral-500">Resultado</dt><dd className="font-semibold">{registro.resultado}</dd></div><div><dt className="text-xs text-neutral-500">Evento</dt><dd className="font-semibold">{evento?.titulo || 'No disponible'}</dd></div><div><dt className="text-xs text-neutral-500">Día y horario</dt><dd className="font-semibold">{dia?.nombreDia || dia?.fecha || 'No disponible'} · {dia?.horaInicio || ''}–{dia?.horaFin || ''}</dd></div><div><dt className="text-xs text-neutral-500">Boleto / identificador</dt><dd className="break-all font-mono text-xs">{boleto?.codigoQr || registro.idBoleto}</dd></div><div><dt className="text-xs text-neutral-500">Tipo / asiento</dt><dd className="font-semibold">{boleto?.esEspecial ? `Especial · ${boleto.tipoEspecial || 'Acreditación'}` : boleto ? `Ordinario · ${boleto.etiquetaAsiento || 'General'}` : 'No identificado'}</dd></div><div><dt className="text-xs text-neutral-500">Titular / reservación</dt><dd className="font-semibold">{registro.nombreAsistente || 'No identificado'}{reservacion ? ` · ${reservacion.id}` : ''}</dd></div><div><dt className="text-xs text-neutral-500">Operador</dt><dd className="font-semibold">{registro.escaneadoPor}</dd></div>{registro.notas && <div className="sm:col-span-2"><dt className="text-xs text-neutral-500">Observación</dt><dd className="rounded-lg bg-neutral-50 p-3 text-sm">{registro.notas}</dd></div>}</dl>; })()}<p className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">Este registro es de solo lectura; no se puede editar ni eliminar desde la aplicación.</p></section></div>}
  </main>;
};
