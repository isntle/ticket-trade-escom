import { describe, it, expect } from 'vitest';
import { generarBoletoPdf } from '../src/utilidades/generadorBoletoPdf';

describe('Generador de PDF de Boletos (Ticket Trade)', () => {
  it('debe generar un documento PDF válido a partir del contrato de Luis sin lanzar errores', () => {
    const payloadPrueba = {
      id: 'pase-test-99',
      titular: 'Rodrigo Rafael Pérez',
      correo: 'rperezb1900@alumno.ipn.mx',
      titulo: 'Congreso de Ciberseguridad ESCOM',
      qr: 'TOKEN_QR_SEGURO_12345',
      actividades: [
        {
          nombre: 'Taller de Redes Seguras',
          fecha: '2026-12-07',
          inicio: '10:00',
          fin: '12:00',
          recinto: 'Laboratorio de Redes',
          lugar: 'Equipo 05',
          estado: 'valido' as const
        },
        {
          nombre: 'Conferencia Magistral Ciberseguridad',
          fecha: '2026-12-07',
          inicio: '12:30',
          fin: '14:00',
          recinto: 'Auditorio Principal',
          lugar: 'Acceso General',
          estado: 'valido' as const
        }
      ]
    };

    // Ejecutamos la función generadora compartida
    const docPdf = generarBoletoPdf(payloadPrueba);

    // Verificamos que la instancia se haya creado correctamente
    expect(docPdf).toBeDefined();
    
    // Validamos que el documento pueda exportar su contenido en formato PDF codificado
    const outputPdf = docPdf.output('datauristring');
    expect(outputPdf).toContain('data:application/pdf;');
  });
});