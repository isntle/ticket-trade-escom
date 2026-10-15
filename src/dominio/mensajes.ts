/**
 * ===================================================================
 * CATÁLOGO OFICIAL DE MENSAJES DEL SISTEMA — TICKET TRADE ESCOM IPN
 * ===================================================================
 * Identificadores normalizados de mensajes para trazabilidad y consistencia
 * en análisis y diseño de sistemas.
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
    titulo: 'Lugar apartado temporalmente (2 min)',
    descripcion: 'Tienes 2 minutos para confirmar tu lugar. Si el cronómetro llega a cero, el asiento se liberará automáticamente.'
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
    descripcion: 'El tiempo límite de 2 minutos ha expirado y el lugar fue devuelto a la disponibilidad general.'
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
  },

  // Motor de Taquilla (CU-MT-04, CU-MT-05, CU-MT-06)
  'ERR-MT-01': {
    codigo: 'ERR-MT-01',
    tipo: 'error',
    titulo: 'Público no permitido',
    descripcion: 'Tu cuenta no cumple las condiciones del público permitido para esta actividad: {público permitido}.'
  },
  'ERR-MT-02': {
    codigo: 'ERR-MT-02',
    tipo: 'error',
    titulo: 'Inscripciones cerradas',
    descripcion: 'Las inscripciones para este día están cerradas.'
  },
  'ERR-MT-03': {
    codigo: 'ERR-MT-03',
    tipo: 'error',
    titulo: 'Sin disponibilidad',
    descripcion: 'No hay lugares disponibles para este día.'
  },
  'ERR-MT-06': {
    codigo: 'ERR-MT-06',
    tipo: 'error',
    titulo: 'Reservación existente',
    descripcion: 'Ya tienes una reservación activa para este día. Puedes consultarla en tus reservaciones.'
  },
  'ERR-MT-07': {
    codigo: 'ERR-MT-07',
    tipo: 'error',
    titulo: 'Empalme de horario',
    descripcion: 'No puedes confirmar esta reservación porque coincide con «{actividad}», de {inicio} a {fin}.'
  },
  'ERR-MT-08': {
    codigo: 'ERR-MT-08',
    tipo: 'error',
    titulo: 'Plazo vencido para cancelar',
    descripcion: 'Ya no puedes cancelar esta reservación porque faltan menos de 24 horas para el inicio del día.'
  },
  'ERR-MT-09': {
    codigo: 'ERR-MT-09',
    tipo: 'error',
    titulo: 'Boleto utilizado',
    descripcion: 'No puedes cancelar esta reservación porque su boleto ya fue utilizado.'
  },
  'ERR-MT-10': {
    codigo: 'ERR-MT-10',
    tipo: 'error',
    titulo: 'Registro previo activo',
    descripcion: 'Ya tienes una reservación, una oferta o una participación activa en la lista de espera de este día.'
  },
  'ERR-MT-11': {
    codigo: 'ERR-MT-11',
    tipo: 'error',
    titulo: 'Oferta expirada',
    descripcion: 'La oferta de lugar venció. Tu participación salió de la lista; puedes volver a ingresar al final si las inscripciones siguen abiertas.'
  },
  'INF-MT-02': {
    codigo: 'INF-MT-02',
    tipo: 'informacion',
    titulo: 'Oferta de lugar disponible',
    descripcion: 'Tienes un lugar disponible para «{día}». Confirma antes de {fecha y hora límite}; después la oferta vencerá.'
  },
  'INF-MT-05': {
    codigo: 'INF-MT-05',
    tipo: 'informacion',
    titulo: 'Lugares disponibles',
    descripcion: 'Ya hay lugares disponibles para este día. Puedes reservar uno sin ingresar a la lista de espera.'
  },
  'INF-MT-06': {
    codigo: 'INF-MT-06',
    tipo: 'informacion',
    titulo: 'Sin reservaciones activas',
    descripcion: 'Aún no tienes boletos ni registros en tu historial. Explora la cartelera para inscribirte.'
  },
  'OK-MT-01': {
    codigo: 'OK-MT-01',
    tipo: 'exito',
    titulo: 'Reservación confirmada',
    descripcion: 'Tu reservación para «{día}» fue confirmada. Consulta tu boleto y los datos vigentes de acceso.'
  },
  'OK-MT-02': {
    codigo: 'OK-MT-02',
    tipo: 'exito',
    titulo: 'Reservación cancelada',
    descripcion: 'Tu reservación fue cancelada y el boleto quedó invalidado.'
  },
  'OK-MT-03': {
    codigo: 'OK-MT-03',
    tipo: 'exito',
    titulo: 'Registro a lista de espera',
    descripcion: 'Te incorporaste a la lista de espera. Recibirás un aviso si se te ofrece un lugar.'
  },
  'OK-MT-07': {
    codigo: 'OK-MT-07',
    tipo: 'exito',
    titulo: 'Baja de lista de espera',
    descripcion: 'Tu participación en la lista de espera de «{día}» fue cerrada. Si vuelves a ingresar, ocuparás el último lugar.'
  },
  'AV-MT-01': {
    codigo: 'AV-MT-01',
    tipo: 'advertencia',
    titulo: 'Confirmar cancelación de reservación',
    descripcion: 'Tu boleto quedará invalidado y el lugar se liberará. Recuperarlo dependerá de la disponibilidad. ¿Confirmas la cancelación?'
  },
  'AV-MT-02': {
    codigo: 'AV-MT-02',
    tipo: 'advertencia',
    titulo: 'Confirmar baja de lista de espera',
    descripcion: 'Perderás tu posición en la lista de espera de «{día}». Si vuelves a ingresar, ocuparás el último lugar. ¿Deseas continuar?'
  },
  'ERR-TR-01': {
    codigo: 'ERR-TR-01',
    tipo: 'error',
    titulo: 'Sesión no iniciada',
    descripcion: 'Tu sesión no está activa. Inicia sesión para continuar.'
  },
  'ERR-IP-04': {
    codigo: 'ERR-IP-04',
    tipo: 'error',
    titulo: 'Verificación de correo requerida',
    descripcion: 'Confirma tu correo electrónico para realizar esta acción.'
  }
};

export type CodigoMensaje = keyof typeof CATALOGO_MENSAJES;

/**
 * Función principal para obtener un mensaje formateado del catálogo con sustitución dinámica
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

// ===================================================================
// RETROCOMPATIBILIDAD CON COMPONENTES DEL ZIP
// ===================================================================
export const CATALOGO_MENSAJES_MT = {
  'ERR-MT-01': CATALOGO_MENSAJES['ERR-MT-01'].descripcion,
  'ERR-MT-02': CATALOGO_MENSAJES['ERR-MT-02'].descripcion,
  'ERR-MT-03': CATALOGO_MENSAJES['ERR-MT-03'].descripcion,
  'ERR-MT-06': CATALOGO_MENSAJES['ERR-MT-06'].descripcion,
  'ERR-MT-07': CATALOGO_MENSAJES['ERR-MT-07'].descripcion,
  'ERR-MT-08': CATALOGO_MENSAJES['ERR-MT-08'].descripcion,
  'ERR-MT-09': CATALOGO_MENSAJES['ERR-MT-09'].descripcion,
  'ERR-MT-10': CATALOGO_MENSAJES['ERR-MT-10'].descripcion,
  'ERR-MT-11': CATALOGO_MENSAJES['ERR-MT-11'].descripcion,
  'INF-MT-02': CATALOGO_MENSAJES['INF-MT-02'].descripcion,
  'INF-MT-05': CATALOGO_MENSAJES['INF-MT-05'].descripcion,
  'INF-MT-06': CATALOGO_MENSAJES['INF-MT-06'].descripcion,
  'OK-MT-01': CATALOGO_MENSAJES['OK-MT-01'].descripcion,
  'OK-MT-02': CATALOGO_MENSAJES['OK-MT-02'].descripcion,
  'OK-MT-03': CATALOGO_MENSAJES['OK-MT-03'].descripcion,
  'OK-MT-07': CATALOGO_MENSAJES['OK-MT-07'].descripcion,
  'AV-MT-01': CATALOGO_MENSAJES['AV-MT-01'].descripcion,
  'AV-MT-02': CATALOGO_MENSAJES['AV-MT-02'].descripcion,
  'ERR-TR-01': CATALOGO_MENSAJES['ERR-TR-01'].descripcion,
  'ERR-IP-04': CATALOGO_MENSAJES['ERR-IP-04'].descripcion
} as const;

export type CodigoMensajeMT = keyof typeof CATALOGO_MENSAJES_MT;

export function textoMensajeMT(
  codigo: CodigoMensajeMT,
  sustituciones?: Record<string, string>
): string {
  let texto: string = CATALOGO_MENSAJES_MT[codigo] || '';
  if (sustituciones) {
    Object.entries(sustituciones).forEach(([clave, valor]) => {
      texto = texto.split(`{${clave}}`).join(valor);
    });
  }
  return texto;
}
