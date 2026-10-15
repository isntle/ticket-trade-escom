import React from 'react';
import { CalendarCheck, Hand, Hourglass } from 'lucide-react';
import { InsigniaEstadoTaquilla } from './InsigniaEstadoTaquilla';

interface PropiedadesHistorialBoletos {
  reservaciones?: any[];
  intenciones?: any[];
  listaEspera?: any[];
}

const SeccionHistorial: React.FC<{
  icono: React.ReactNode;
  titulo: string;
  descripcion: string;
  vacia: boolean;
  children: React.ReactNode;
}> = ({ icono, titulo, descripcion, vacia, children }) => (
  <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
    <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/60">
      <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
        {icono}
        <span>{titulo}</span>
      </h2>
      <p className="text-[11px] text-neutral-500 mt-0.5">{descripcion}</p>
    </div>
    {vacia ? (
      <p className="px-5 py-8 text-center text-xs text-neutral-500">No hay registros en esta sección.</p>
    ) : (
      <div className="overflow-x-auto">{children}</div>
    )}
  </section>
);

const claseCabecera = 'px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap';
const claseCelda = 'px-4 py-3 text-xs text-neutral-700 align-top';

export const HistorialBoletos: React.FC<PropiedadesHistorialBoletos> = ({
  reservaciones = [],
  intenciones = [],
  listaEspera = []
}) => {
  return (
    <div className="space-y-6">
      <SeccionHistorial
        icono={<CalendarCheck className="w-4 h-4 text-[#7a132b]" />}
        titulo="Reservaciones"
        descripcion="Reservaciones vigentes, pasadas y canceladas."
        vacia={reservaciones.length === 0}
      >
        <table className="w-full min-w-[820px]">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className={claseCabecera}>Identificador</th>
              <th className={claseCabecera}>Evento</th>
              <th className={claseCabecera}>Sesión</th>
              <th className={claseCabecera}>Fecha</th>
              <th className={claseCabecera}>Horario</th>
              <th className={claseCabecera}>Recinto</th>
              <th className={claseCabecera}>Asiento</th>
              <th className={claseCabecera}>Estado</th>
              <th className={claseCabecera}>Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {reservaciones.map((fila: any, index: number) => (
              <tr key={fila.id || index} className="hover:bg-neutral-50/60">
                <td className={`${claseCelda} font-mono font-semibold text-neutral-900`}>{fila.id}</td>
                <td className={`${claseCelda} font-semibold text-neutral-900`}>{fila.evento || fila.tituloEvento}</td>
                <td className={claseCelda}>{fila.sesion || fila.nombreSesion || 'General'}</td>
                <td className={`${claseCelda} whitespace-nowrap`}>{fila.fecha || fila.fechaEvento}</td>
                <td className={`${claseCelda} whitespace-nowrap`}>{fila.horario || fila.horaEvento || '—'}</td>
                <td className={claseCelda}>{fila.recinto || fila.nombreRecinto || 'ESCOM'}</td>
                <td className={`${claseCelda} font-mono font-bold text-[#7a132b]`}>{fila.asiento || fila.etiquetaAsiento || '—'}</td>
                <td className={claseCelda}>
                  <InsigniaEstadoTaquilla estado={fila.estado} />
                </td>
                <td className={claseCelda}>{fila.motivoCancelacion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SeccionHistorial>

      <SeccionHistorial
        icono={<Hand className="w-4 h-4 text-[#7a132b]" />}
        titulo="Intenciones de asistencia"
        descripcion="Registros informativos de eventos de entrada libre. No generan boleto ni garantizan un lugar."
        vacia={intenciones.length === 0}
      >
        <table className="w-full min-w-[560px]">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className={claseCabecera}>Evento</th>
              <th className={claseCabecera}>Sesión</th>
              <th className={claseCabecera}>Fecha de la sesión</th>
              <th className={claseCabecera}>Fecha de registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {intenciones.map((fila: any, index: number) => (
              <tr key={fila.id || index} className="hover:bg-neutral-50/60">
                <td className={`${claseCelda} font-semibold text-neutral-900`}>{fila.evento || fila.tituloEvento}</td>
                <td className={claseCelda}>{fila.sesion || fila.nombreSesion || 'General'}</td>
                <td className={`${claseCelda} whitespace-nowrap`}>{fila.fechaSesion || fila.fecha}</td>
                <td className={`${claseCelda} whitespace-nowrap`}>{fila.fechaRegistro || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SeccionHistorial>

      <SeccionHistorial
        icono={<Hourglass className="w-4 h-4 text-[#7a132b]" />}
        titulo="Lista de espera"
        descripcion="Participaciones en listas de espera de sesiones con cupo agotado."
        vacia={listaEspera.length === 0}
      >
        <table className="w-full min-w-[680px]">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className={claseCabecera}>Evento</th>
              <th className={claseCabecera}>Sesión</th>
              <th className={claseCabecera}>Fecha de la sesión</th>
              <th className={claseCabecera}>Posición</th>
              <th className={claseCabecera}>Estado</th>
              <th className={claseCabecera}>Fecha de registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {listaEspera.map((fila: any, index: number) => (
              <tr key={fila.id || index} className="hover:bg-neutral-50/60">
                <td className={`${claseCelda} font-semibold text-neutral-900`}>{fila.evento || fila.tituloEvento}</td>
                <td className={claseCelda}>{fila.sesion || fila.nombreSesion || 'General'}</td>
                <td className={`${claseCelda} whitespace-nowrap`}>{fila.fechaSesion || fila.fecha}</td>
                <td className={`${claseCelda} font-mono font-bold text-neutral-900`}>
                  {fila.posicion !== undefined && fila.posicion !== null ? `#${fila.posicion}` : '—'}
                </td>
                <td className={claseCelda}>
                  <InsigniaEstadoTaquilla estado={fila.estado || 'en_espera'} />
                </td>
                <td className={`${claseCelda} whitespace-nowrap`}>{fila.fechaRegistro || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SeccionHistorial>
    </div>
  );
};