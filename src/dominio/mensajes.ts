/**
 * ===================================================================
 * CATÁLOGO OFICIAL DE MENSAJES DEL SISTEMA — TICKET TRADE ESCOM IPN
 * ===================================================================
 * Identificadores normalizados de mensajes para trazabilidad y consistencia
 * en análisis y diseño de sistemas (Sprint 1 & Validación Docente).
 */

export interface MensajeSistema {
  codigo: string;
  tipo: 'informacion' | 'exito' | 'advertencia' | 'error';
  titulo: string;
  descripcion: string;
  accionSugerida?: string;
}

export const CATALOGO_MENSAJES: Record<string, MensajeSistema> = {
  // Autenticación y Perfiles
  'MSG-AUTH-001': {
    codigo: 'MSG-AUTH-001',
    tipo: 'exito',
    titulo: 'Sesión iniciada con éxito',
    descripcion: 'Has ingresado al sistema institucional con tu cuenta politécnica.'
  },
  'MSG-AUTH-002': {
    codigo: 'MSG-AUTH-002',
    tipo: 'error',
    titulo: 'Credenciales no reconocidas',
    descripcion: 'No fue posible iniciar sesión con los datos proporcionados. Verifica tu correo institucional @ipn.mx.'
  },
  'MSG-AUTH-003': {
    codigo: 'MSG-AUTH-003',
    tipo: 'error',
    titulo: 'Boleta politécnica inválida',
    descripcion: 'La boleta de estudiante debe contener exactamente 10 dígitos numéricos (ej: 2022630412).'
  },
  'MSG-AUTH-004': {
    codigo: 'MSG-AUTH-004',
    tipo: 'exito',
    titulo: 'Acreditación institucional actualizada',
    descripcion: 'Tus datos fueron validados ante el registro institucional y se habilitaron tus facultades de organización.'
  },

  // Recintos y Disponibilidad
  'MSG-VENUE-001': {
    codigo: 'MSG-VENUE-001',
    tipo: 'error',
    titulo: 'Recinto ocupado por evento',
    descripcion: 'El recinto no está disponible en el horario solicitado porque existe otra actividad académica programada.',
    accionSugerida: 'Consulta la agenda de disponibilidad para elegir otro horario o recinto alterno.'
  },
  'MSG-VENUE-002': {
    codigo: 'MSG-VENUE-002',
    tipo: 'error',
    titulo: 'Conflicto con horario de clase regular',
    descripcion: 'Existe una clase programada en este laboratorio durante el horario seleccionado.',
    accionSugerida: 'Elige un horario libre del laboratorio o selecciona un laboratorio sin clase.'
  },
  'MSG-VENUE-003': {
    codigo: 'MSG-VENUE-003',
    tipo: 'error',
    titulo: 'Recinto bajo bloqueo institucional',
    descripcion: 'Este espacio se encuentra inhabilitado por disposición oficial de la Subdirección.',
    accionSugerida: 'Revisa el motivo del bloqueo o selecciona un recinto no afectado.'
  },
  'MSG-VENUE-004': {
    codigo: 'MSG-VENUE-004',
    tipo: 'advertencia',
    titulo: 'Margen de despeje insuficiente',
    descripcion: 'El reglamento de recintos de ESCOM requiere al menos 30 minutos de despeje entre eventos consecutivos.',
    accionSugerida: 'Ajusta la hora de inicio con al menos 30 minutos de separación.'
  },

  // Solicitudes y Dictámenes
  'MSG-EVENT-001': {
    codigo: 'MSG-EVENT-001',
    tipo: 'exito',
    titulo: 'Solicitud radicada ante Subdirección',
    descripcion: 'Tu propuesta de evento y solicitud de recinto ha sido registrada para dictamen oficial.'
  },
  'MSG-EVENT-002': {
    codigo: 'MSG-EVENT-002',
    tipo: 'advertencia',
    titulo: 'Regla de anticipación: trámite urgente',
    descripcion: 'Has solicitado al menos una fecha con menos de 7 días de anticipación. Debes registrar la justificación excepcional obligatoria para Subdirección.',
    accionSugerida: 'Completa el campo de justificación extraordinaria explicando la urgencia académica.'
  },
  'MSG-EVENT-003': {
    codigo: 'MSG-EVENT-003',
    tipo: 'error',
    titulo: 'Justificación extraordinaria requerida',
    descripcion: 'No se puede enviar una solicitud con menos de 1 semana de anticipación sin una justificación de causa de fuerza mayor.'
  },
  'MSG-EVENT-004': {
    codigo: 'MSG-EVENT-004',
    tipo: 'exito',
    titulo: 'Solicitud autorizada por Subdirección',
    descripcion: 'El evento ha sido aprobado y transferido a tu panel de organización para configurar la distribución de lugares.'
  },
  'MSG-EVENT-005': {
    codigo: 'MSG-EVENT-005',
    tipo: 'informacion',
    titulo: 'Solicitud rechazada con dictamen motivado',
    descripcion: 'La solicitud no fue autorizada. Se ha notificado al solicitante el motivo oficial registrado.'
  },

  // Arreglos de Lugares y Versión Final
  'MSG-ARR-001': {
    codigo: 'MSG-ARR-001',
    tipo: 'exito',
    titulo: 'Versión final de lugares confirmada (1:1)',
    descripcion: 'La distribución de lugares para esta fecha ha sido confirmada formalmente para publicación en taquilla y permanece editable en todo momento.'
  },
  'MSG-ARR-002': {
    codigo: 'MSG-ARR-002',
    tipo: 'advertencia',
    titulo: 'Modo edición activado',
    descripcion: 'Se habilitó la edición de la distribución de lugares. Recuerda volver a confirmar como versión final cuando concluyas.'
  },
  'MSG-ARR-003': {
    codigo: 'MSG-ARR-003',
    tipo: 'error',
    titulo: 'Lugares pendientes de categorizar',
    descripcion: 'No puedes confirmar la versión final todavía. Existen lugares sin definir en la distribución.',
    accionSugerida: 'Asigna categoría o bloquea todos los lugares disponibles antes de publicar.'
  },
  'MSG-ARR-004': {
    codigo: 'MSG-ARR-004',
    tipo: 'exito',
    titulo: 'Borrador de arreglo duplicado',
    descripcion: 'Se ha creado una copia editable de la distribución para experimentar con otra disposición.'
  },

  // Taquilla y Reservación
  'MSG-BOOKING-001': {
    codigo: 'MSG-BOOKING-001',
    tipo: 'informacion',
    titulo: 'Lugar apartado temporalmente (10 min)',
    descripcion: 'Tienes 10 minutos para confirmar tu asistencia. Si el cronómetro llega a cero, el lugar se liberará automáticamente.'
  },
  'MSG-BOOKING-002': {
    codigo: 'MSG-BOOKING-002',
    tipo: 'error',
    titulo: 'Lugar ocupado por concurrencia',
    descripcion: 'Este lugar acaba de ser seleccionado por otra persona hace unos segundos. Por favor elige otro lugar libre del mapa.'
  },
  'MSG-BOOKING-003': {
    codigo: 'MSG-BOOKING-003',
    tipo: 'advertencia',
    titulo: 'Tiempo de apartado agotado',
    descripcion: 'El tiempo límite de 10 minutos ha expirado y el lugar fue devuelto a la disponibilidad general.'
  },
  'MSG-BOOKING-004': {
    codigo: 'MSG-BOOKING-004',
    tipo: 'exito',
    titulo: 'Reservación confirmada exitosamente',
    descripcion: 'Tu lugar ha sido asegurado y tu boleto digital con código QR está disponible en Mis Boletos.'
  },
  'MSG-BOOKING-005': {
    codigo: 'MSG-BOOKING-005',
    tipo: 'informacion',
    titulo: 'Reservación cancelada voluntariamente',
    descripcion: 'Tu lugar ha sido liberado para la comunidad y tu código QR fue invalidado en el sistema.'
  },

  // Check-In y Control de Acceso
  'MSG-CHECKIN-001': {
    codigo: 'MSG-CHECKIN-001',
    tipo: 'exito',
    titulo: 'Acceso autorizado en puerta',
    descripcion: 'Boleto digital válido. Asistencia registrada en el recinto.'
  },
  'MSG-CHECKIN-002': {
    codigo: 'MSG-CHECKIN-002',
    tipo: 'error',
    titulo: '¡Alerta de duplicidad: Boleto ya utilizado!',
    descripcion: 'Este código QR ya fue presentado previamente en este mismo evento. No se permite el reingreso.'
  },
  'MSG-CHECKIN-003': {
    codigo: 'MSG-CHECKIN-003',
    tipo: 'error',
    titulo: 'Acceso denegado: Boleto cancelado',
    descripcion: 'El asistente canceló esta reservación previamente desde su perfil.'
  },
  'MSG-CHECKIN-004': {
    codigo: 'MSG-CHECKIN-004',
    tipo: 'error',
    titulo: 'Código no reconocido',
    descripcion: 'El código escaneado no corresponde a ningún boleto emitido para este evento institucional.'
  }
};

/**
 * Función auxiliar para obtener un mensaje formateado del catálogo
 */
export function obtenerMensaje(codigo: string, sustituciones?: Record<string, string>): MensajeSistema {
  const base = CATALOGO_MENSAJES[codigo] || {
    codigo,
    tipo: 'informacion',
    titulo: 'Aviso del sistema',
    descripcion: 'Operación procesada en la plataforma.'
  };

  if (!sustituciones) return base;

  let descModificada = base.descripcion;
  Object.entries(sustituciones).forEach(([clave, valor]) => {
    descModificada = descModificada.replace(new RegExp(`{${clave}}`, 'g'), valor);
  });

  return {
    ...base,
    descripcion: descModificada
  };
}
