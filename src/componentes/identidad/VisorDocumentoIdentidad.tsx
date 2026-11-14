import React, { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Eye, Loader2, RotateCcw } from 'lucide-react';
import { VentanaModal } from '../ui/VentanaModal';
import { leerDocumentoIdentidad } from '../../utilidades/documentosIdentidad';
import type { DocumentoIdentidad } from '../../tipos';

/** Nombre legible del tipo de documento del expediente. */
export const ETIQUETAS_TIPO_DOCUMENTO: Record<DocumentoIdentidad['tipo'], string> = {
  constancia: 'Constancia de estudios',
  horario: 'Comprobante de horario',
  adscripcion: 'Comprobante de adscripción',
  existencia: 'Acta constitutiva o documento equivalente',
  representacion: 'Poder o nombramiento de representación',
};
export const etiquetaTipoDocumento = (tipo?: string) =>
  ETIQUETAS_TIPO_DOCUMENTO[tipo as DocumentoIdentidad['tipo']] || 'Documento';

const claseBoton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a132b] focus-visible:ring-offset-2 disabled:opacity-40';
const clasePrimario =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#7a132b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5f0f22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a132b] focus-visible:ring-offset-2';

/** Acción visible para abrir un documento; no depende de que el nombre parezca enlace. */
export function BotonVerDocumento({ archivo, onClick }: { archivo: DocumentoIdentidad; onClick: () => void }) {
  return (
    <button
      type="button"
      className={claseBoton}
      onClick={onClick}
      aria-label={`Ver documento ${archivo.nombre} (${etiquetaTipoDocumento(archivo.tipo)}, PDF)`}
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      Ver documento
    </button>
  );
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; url: string }
  | { tipo: 'error'; mensaje: string };

interface PropiedadesVisor {
  archivo: DocumentoIdentidad;
  /** Nombre de la persona titular del expediente. */
  titular?: string;
  /** Descarga solo cuando la cuenta está autorizada para consultar el documento. */
  puedeDescargar: boolean;
  alCerrar: () => void;
  /** Lectura del documento; por defecto usa la sesión vigente (sin URL pública). */
  leer?: (id: string) => Promise<Blob>;
}

/**
 * Vista previa de un PDF del expediente en una ventana identificada.
 * Estados: cargando, error recuperable (Reintentar) y documento listo.
 * El PDF se obtiene con la sesión actual y se muestra con una URL local del
 * navegador (blob:) que se libera al cerrar; nunca se publica.
 */
export function VisorDocumentoIdentidad({ archivo, titular, puedeDescargar, alCerrar, leer = leerDocumentoIdentidad }: PropiedadesVisor) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const reintentar = () => {
    setIntento((n) => n + 1);
    // El botón desaparece al reintentar; el foco se queda en el contenido de la ventana.
    contenidoRef.current?.focus();
  };

  useEffect(() => {
    let vigente = true;
    let url: string | null = null;
    setEstado({ tipo: 'cargando' });
    leer(archivo.id)
      .then((contenido) => {
        if (!vigente) return;
        url = URL.createObjectURL(contenido.type === 'application/pdf' ? contenido : new Blob([contenido], { type: 'application/pdf' }));
        setEstado({ tipo: 'listo', url });
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        const detalle = error instanceof Error && error.message ? error.message : 'No se pudo abrir el documento.';
        setEstado({ tipo: 'error', mensaje: detalle });
      });
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [archivo.id, intento, leer]);

  const tipo = etiquetaTipoDocumento(archivo.tipo);
  return (
    <VentanaModal
      estaAbierto
      alCerrar={alCerrar}
      titulo={`Vista previa: ${archivo.nombre}`}
      subtitulo={[tipo, 'PDF', titular && `Titular: ${titular}`].filter(Boolean).join(' · ')}
      anchoMaximo="4xl"
    >
      <div ref={contenidoRef} tabIndex={-1} className="space-y-4 outline-none">
        {estado.tipo === 'cargando' && (
          <div role="status" aria-live="polite" className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl bg-neutral-50 p-6 text-sm text-neutral-700">
            <Loader2 className="h-8 w-8 animate-spin text-[#7a132b]" aria-hidden="true" />
            Cargando documento…
          </div>
        )}

        {estado.tipo === 'error' && (
          <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">No se pudo mostrar el documento.</p>
            <p>{estado.mensaje} Puedes intentarlo de nuevo; si el problema continúa, cierra la ventana y vuelve a abrirlo desde el expediente.</p>
            <button type="button" className={claseBoton} onClick={reintentar}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        {estado.tipo === 'listo' && (
          <>
            <iframe
              title={`Vista previa del documento ${archivo.nombre}`}
              src={estado.url}
              className="h-[60vh] min-h-[320px] w-full rounded-xl border"
            />
            <p className="text-xs text-neutral-600">
              Si la vista previa no aparece en tu dispositivo, usa «Abrir en otra pestaña»{puedeDescargar ? ' o «Descargar PDF»' : ''}. Con teclado, si el foco queda dentro del PDF, pulsa Tab para volver a los botones de esta ventana. El documento solo se muestra en esta sesión.
            </p>
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
          {estado.tipo === 'listo' && (
            <a className={claseBoton} href={estado.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Abrir en otra pestaña
            </a>
          )}
          {estado.tipo === 'listo' && puedeDescargar && (
            <a className={clasePrimario} href={estado.url} download={archivo.nombre}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar PDF
            </a>
          )}
          <button type="button" className={claseBoton} onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </VentanaModal>
  );
}
