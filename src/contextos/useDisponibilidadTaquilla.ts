import { useCallback, useEffect, useState } from 'react';
import { tokenEnlacePrivado } from '../servicios/enlacePrivado';
import { transporteApi } from '../servicios/http';

interface Disponibilidad {
  apartados: string[];
  ocupados: string[];
  disponibles: number;
}

const api = transporteApi();

export function useDisponibilidadTaquilla(activa: boolean, idEvento: string, idActividad: string) {
  const [datos, setDatos] = useState<Disponibilidad | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reconsultar = useCallback(() => setRevision(n => n + 1), []);

  useEffect(() => {
    if (!activa) return;
    const ciclo = new AbortController();
    let consultando = false;
    const consultar = async () => {
      if (document.hidden || consultando) return;
      consultando = true;
      try {
        const resultado = await api<Disponibilidad>(
          '/taquilla/actividades/' + encodeURIComponent(idActividad) + '/disponibilidad',
          {
            enlacePrivado: tokenEnlacePrivado(idEvento),
            signal: AbortSignal.any([ciclo.signal, AbortSignal.timeout(8000)]),
          },
        );
        if (ciclo.signal.aborted) return;
        setDatos(resultado);
        setError('');
      } catch (error) {
        if (ciclo.signal.aborted) return;
        setError(error instanceof Error ? error.message : 'No se pudo consultar la disponibilidad.');
      } finally {
        consultando = false;
      }
    };
    void consultar();
    const reloj = window.setInterval(consultar, 4000);
    document.addEventListener('visibilitychange', consultar);
    return () => {
      ciclo.abort();
      window.clearInterval(reloj);
      document.removeEventListener('visibilitychange', consultar);
    };
  }, [activa, idEvento, idActividad, revision]);

  return { datos, error, reconsultar };
}
