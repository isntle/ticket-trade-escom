import jsPDF from 'jspdf';

// Contrato de datos acordado con Luis
export interface ActividadBoleto {
  nombre: string;
  fecha: string;
  inicio: string;
  fin: string;
  recinto: string;
  lugar: string; // Asiento, equipo o "Acceso general"
  estado: 'valido' | 'cancelado' | 'utilizado';
}

export interface BoletoPayload {
  id: string;
  titular: string;
  correo: string;
  titulo: string;
  qr: string; // Texto plano del QR
  actividades: ActividadBoleto[];
}

/**
 * Genera el documento PDF del boleto reutilizable para descarga y correo.
 * Retorna un objeto jsPDF listo para ser guardado como archivo o convertido a Blob/Base64.
 */
export function generarBoletoPdf(datos: BoletoPayload): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 20;

  // --- 1. Identidad Visual (Ticket Trade) ---
  doc.setFillColor(122, 19, 43); // Color vino institucional (#7a132b)
  doc.rect(0, 0, pageWidth, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TICKET TRADE - PASE DE ACCESO', 14, 10);

  cursorY = 25;

  // --- 2. Información General del Boleto ---
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.text(datos.titulo, 14, cursorY);
  cursorY += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Titular: ${datos.titular}`, 14, cursorY);
  cursorY += 6;
  doc.text(`Correo: ${datos.correo}`, 14, cursorY);
  cursorY += 6;
  doc.text(`Folio de Pase: ${datos.id}`, 14, cursorY);
  cursorY += 10;

  // Línea divisoria
  doc.setDrawColor(200, 200, 200);
  doc.line(14, cursorY, pageWidth - 14, cursorY);
  cursorY += 10;

  // --- 3. Listado de Actividades Reservadas ---
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Actividades y Accesos Asociados:', 14, cursorY);
  cursorY += 8;

  datos.actividades.forEach((act, index) => {
    // Validar salto de página si es necesario
    if (cursorY > 250) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, cursorY, pageWidth - 28, 24, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${act.nombre}`, 18, cursorY + 6);

    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${act.fecha} | Horario: ${act.inicio} - ${act.fin}`, 18, cursorY + 12);
    doc.text(`Recinto: ${act.recinto} | Ubicación: ${act.lugar}`, 18, cursorY + 17);

    // Estado legible y con acentos
    let estadoTexto = 'Válido';
    if (act.estado === 'cancelado') estadoTexto = 'Cancelado';
    if (act.estado === 'utilizado') estadoTexto = 'Utilizado';
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Estado: ${estadoTexto}`, pageWidth - 45, cursorY + 12);

    cursorY += 28;
  });

  // --- 4. Representación del Código QR ---
  if (cursorY > 220) {
    doc.addPage();
    cursorY = 20;
  }

  cursorY += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Código QR de Acceso:', 14, cursorY);
  cursorY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`[Texto de verificación QR: ${datos.qr}]`, 14, cursorY);

  return doc;
}