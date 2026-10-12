import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Evento,
  SolicitudEvento,
  Recinto,
  ArregloAsientos,
  BloqueoRecinto,
  Reservacion,
  BoletoDigital,
  TipoBoletoEspecial,
  EstadoInscripciones,
  EntradaListaEspera,
  RegistroEscaneo,
  ResultadoDisponibilidadRecinto,
  ListaVerificacionPublicacion,
  ConfiguracionAsiento,
  HorarioClaseRegular,
  OcupacionAgenda
} from '../tipos';
import {
  EVENTOS_INICIALES,
  SOLICITUDES_INICIALES,
  RECINTOS_INICIALES,
  ARREGLOS_INICIALES,
  BLOQUEOS_INICIALES,
  RESERVACIONES_INICIALES,
  BOLETOS_INICIALES,
  BITACORA_INICIAL_ESCANEOS,
  CLASES_REGULARES_INICIALES,
  generarAsientosAuditorio,
  generarAsientosSala14,
  generarEstacionesLaboratorio
} from '../datos/datosIniciales';

interface ContextoDatosTipo {
  listaEventos: Evento[];
  listaSolicitudes: SolicitudEvento[];
  listaRecintos: Recinto[];
  listaArreglos: ArregloAsientos[];
  listaBloqueos: BloqueoRecinto[];
  listaReservaciones: Reservacion[];
  listaBoletos: BoletoDigital[];
  listaEspera: EntradaListaEspera[];
  bitacoraEscaneos: RegistroEscaneo[];
  listaClasesRegulares: HorarioClaseRegular[];

  verificarDisponibilidadRecinto: (
    idRecinto: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    idFechaEventoExcluir?: string
  ) => ResultadoDisponibilidadRecinto;

  obtenerOcupacionesRecinto: (idRecinto: string, fecha: string) => OcupacionAgenda[];
  obtenerAgendaMultiRecinto: (fecha: string) => OcupacionAgenda[];

  obtenerListaDeVerificacion: (idEvento: string) => ListaVerificacionPublicacion;

  crearSolicitud: (
    datos: Omit<SolicitudEvento, 'id' | 'fechaCreacion' | 'estado'>
  ) => SolicitudEvento;

  dictaminarSolicitud: (
    idSolicitud: string,
    decision: 'autorizada' | 'rechazada',
    motivo?: string,
    nombreRevisor?: string
  ) => void;

  crearEventoInstitucionalDirecto: (datosEvento: Partial<Evento>) => Evento;
  actualizarEvento: (idEvento: string, parcial: Partial<Evento>) => void;
  publicarEvento: (idEvento: string) => { exito: boolean; error?: string };
  agregarFechaEvento: (
    idEvento: string,
    datosFecha: Omit<Evento['fechas'][0], 'id' | 'esFinalConfirmado'>
  ) => void;
  eliminarFechaEvento: (idEvento: string, idFecha: string) => void;

  crearArreglo: (datos: Omit<ArregloAsientos, 'id' | 'fechaCreacion'>) => ArregloAsientos;
  actualizarArreglo: (idArreglo: string, parcial: Partial<ArregloAsientos>) => void;
  confirmarVersionFinalArreglo: (idFechaEvento: string, idArreglo: string) => void;
  eliminarArreglo: (idArreglo: string) => void;

  apartarAsiento: (
    idEvento: string,
    idFechaEvento: string,
    idAsiento: string,
    etiquetaAsiento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string
  ) => { exito: boolean; reservacion?: Reservacion; error?: string };

  liberarApartadoAsiento: (idReservacion: string) => void;
  confirmarReservacion: (
    idReservacion: string
  ) => { exito: boolean; boleto?: BoletoDigital; error?: string };
  cancelarReservacion: (idReservacion: string) => void;

  emitirBoletosEspeciales: (datos: {
    idEvento: string;
    idFechaEvento: string;
    tipo: TipoBoletoEspecial;
    cantidad: number;
    nombreBase: string;
    correoDestino: string;
    emitidoPor: string;
  }) => { exito: boolean; boletos?: BoletoDigital[]; error?: string };

  invalidarBoletoEspecial: (
    idBoleto: string,
    motivo: string,
    invalidadoPor: string
  ) => { exito: boolean; error?: string };

  cambiarEstadoInscripciones: (datos: {
    idEvento: string;
    idsFechaEvento: string[];
    nuevoEstado: EstadoInscripciones;
    idOrganizador: string;
    nombreOrganizador: string;
    versionesEsperadas?: Record<string, number>;
  }) => { exito: boolean; sesionesActualizadas?: number; error?: string };

  unirseAListaDeEspera: (
    idEvento: string,
    idFechaEvento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string
  ) => { exito: boolean; entrada?: EntradaListaEspera; error?: string };

  procesarCheckIn: (
    codigoQr: string,
    escaneadoPor: string,
    idFechaEventoObjetivo?: string
  ) => {
    exito: boolean;
    resultado: RegistroEscaneo['resultado'];
    boleto?: BoletoDigital;
    mensaje: string;
  };

  crearBloqueoRecinto: (bloqueo: Omit<BloqueoRecinto, 'id' | 'fechaCreacion'>) => BloqueoRecinto;
  eliminarBloqueoRecinto: (idBloqueo: string) => void;

  reiniciarDatosIniciales: () => void;
}

const ContextoDatos = createContext<ContextoDatosTipo | undefined>(undefined);
const CLAVE_ALMACEN_DATOS = 'tt_datos_almacen_escom_v7';

const obtenerFechaLimiteInscripciones = (fecha: Evento['fechas'][0]): number => {
  if (fecha.fechaLimiteInscripciones) {
    return new Date(fecha.fechaLimiteInscripciones).getTime();
  }
  return new Date(`${fecha.fecha}T${fecha.horaInicio}:00`).getTime() - 60 * 60 * 1000;
};

const obtenerEstadoInscripciones = (
  fecha: Evento['fechas'][0],
  estadoEvento: Evento['estado']
): EstadoInscripciones =>
  fecha.estadoInscripciones ||
  (estadoEvento === 'publicado' || estadoEvento === 'en_curso' ? 'abiertas' : 'cerradas');

const bloqueoAfectaSesion = (
  bloqueo: BloqueoRecinto,
  fecha: Evento['fechas'][0]
): boolean => {
  const aplicaRecinto =
    bloqueo.idRecinto === fecha.idRecinto ||
    bloqueo.idRecinto === 'todos' ||
    Boolean(bloqueo.idsRecintos?.includes(fecha.idRecinto));

  if (!aplicaRecinto || fecha.fecha < bloqueo.fechaInicio) return false;
  if (bloqueo.esIndefinido) return true;

  const fechaFin = bloqueo.fechaFin || bloqueo.fechaInicio;
  const horaInicio = bloqueo.horaInicio || '00:00';
  const horaFin = bloqueo.horaFin || '23:59';
  return (
    fecha.fecha <= fechaFin &&
    fecha.horaInicio < horaFin &&
    fecha.horaFin > horaInicio
  );
};

export const ProveedorDatos: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listaEventos, setListaEventos] = useState<Evento[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_eventos`);
    return g ? JSON.parse(g) : EVENTOS_INICIALES;
  });

  const [listaSolicitudes, setListaSolicitudes] = useState<SolicitudEvento[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_solicitudes`);
    return g ? JSON.parse(g) : SOLICITUDES_INICIALES;
  });

  const [listaRecintos] = useState<Recinto[]>(RECINTOS_INICIALES);

  const [listaArreglos, setListaArreglos] = useState<ArregloAsientos[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_arreglos`);
    return g ? JSON.parse(g) : ARREGLOS_INICIALES;
  });

  const [listaBloqueos, setListaBloqueos] = useState<BloqueoRecinto[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_bloqueos`);
    return g ? JSON.parse(g) : BLOQUEOS_INICIALES;
  });

  const [listaReservaciones, setListaReservaciones] = useState<Reservacion[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_reservaciones`);
    return g ? JSON.parse(g) : RESERVACIONES_INICIALES;
  });

  const [listaBoletos, setListaBoletos] = useState<BoletoDigital[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_boletos`);
    return g ? JSON.parse(g) : BOLETOS_INICIALES;
  });

  const [listaEspera, setListaEspera] = useState<EntradaListaEspera[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_espera`);
    return g ? JSON.parse(g) : [];
  });

  const [bitacoraEscaneos, setBitacoraEscaneos] = useState<RegistroEscaneo[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_escaneos`);
    return g ? JSON.parse(g) : BITACORA_INICIAL_ESCANEOS;
  });

  const [listaClasesRegulares] = useState<HorarioClaseRegular[]>(CLASES_REGULARES_INICIALES);

  // Guardar cambios en el almacenamiento local
  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_eventos`, JSON.stringify(listaEventos));
  }, [listaEventos]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_solicitudes`, JSON.stringify(listaSolicitudes));
  }, [listaSolicitudes]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_arreglos`, JSON.stringify(listaArreglos));
  }, [listaArreglos]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_bloqueos`, JSON.stringify(listaBloqueos));
  }, [listaBloqueos]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_reservaciones`, JSON.stringify(listaReservaciones));
  }, [listaReservaciones]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_boletos`, JSON.stringify(listaBoletos));
  }, [listaBoletos]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_espera`, JSON.stringify(listaEspera));
  }, [listaEspera]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_escaneos`, JSON.stringify(bitacoraEscaneos));
  }, [bitacoraEscaneos]);

  // Limpieza periódica de apartados temporales vencidos (10 minutos)
  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = Date.now();
      setListaReservaciones((previas) =>
        previas.map((res) => {
          if (
            res.estado === 'apartado_temporal' &&
            res.tiempoExpiracionApartado &&
            res.tiempoExpiracionApartado < ahora
          ) {
            return { ...res, estado: 'cancelada' };
          }
          return res;
        })
      );
    }, 15000);
    return () => clearInterval(intervalo);
  }, []);

  // Cierre automático al alcanzar la fecha límite configurada para cada sesión.
  useEffect(() => {
    const cerrarSesionesVencidas = () => {
      const ahora = Date.now();
      const idsVencidas = listaEventos.flatMap((evento) =>
        evento.fechas
          .filter(
            (fecha) =>
              obtenerEstadoInscripciones(fecha, evento.estado) === 'abiertas' &&
              obtenerFechaLimiteInscripciones(fecha) <= ahora
          )
          .map((fecha) => fecha.id)
      );

      if (idsVencidas.length === 0) return;
      const conjuntoVencidas = new Set(idsVencidas);
      const fechaCambio = new Date(ahora).toISOString();

      setListaEventos((previos) =>
        previos.map((evento) => ({
          ...evento,
          fechas: evento.fechas.map((fecha) => {
            if (!conjuntoVencidas.has(fecha.id)) return fecha;
            return {
              ...fecha,
              estadoInscripciones: 'cerradas',
              versionInscripciones: (fecha.versionInscripciones || 0) + 1,
              historialInscripciones: [
                ...(fecha.historialInscripciones || []),
                {
                  id: `ins-auto-${fecha.id}-${ahora}`,
                  estado: 'cerradas',
                  fechaCambio,
                  idResponsable: 'sistema',
                  responsable: 'Sistema Ticket Trade',
                  causa: 'cierre_automatico'
                }
              ]
            };
          })
        }))
      );

      setListaReservaciones((previas) =>
        previas.map((reservacion) =>
          conjuntoVencidas.has(reservacion.idFechaEvento) &&
          reservacion.estado === 'apartado_temporal'
            ? { ...reservacion, estado: 'cancelada' }
            : reservacion
        )
      );

      setListaEspera((previas) =>
        previas.map((entrada) =>
          conjuntoVencidas.has(entrada.idFechaEvento) &&
          (entrada.estado === 'esperando' || entrada.estado === 'notificado')
            ? { ...entrada, estado: 'cancelado' }
            : entrada
        )
      );
    };

    cerrarSesionesVencidas();
    const intervalo = setInterval(cerrarSesionesVencidas, 60000);
    return () => clearInterval(intervalo);
  }, [listaEventos]);

  // Validación de disponibilidad física y logística de recinto (Colchón de ±30 minutos + Clases en laboratorios + Bloqueos)
  const verificarDisponibilidadRecinto = (
    idRecinto: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    idFechaEventoExcluir?: string
  ): ResultadoDisponibilidadRecinto => {
    // 1. Validar contra bloqueos de Subdirección (específicos o generales)
    for (const b of listaBloqueos) {
      const aplicaRecinto =
        b.idRecinto === idRecinto ||
        b.idRecinto === 'todos' ||
        (b.idsRecintos && b.idsRecintos.includes(idRecinto));

      if (aplicaRecinto) {
        if (b.esIndefinido && fecha >= b.fechaInicio) {
          return {
            disponible: false,
            codigoMensaje: 'MSG-VENUE-003',
            motivo: `Recinto bajo bloqueo oficial indefinido: "${b.titulo}" (${b.motivo})`,
            tipoConflicto: 'bloqueo',
            tituloConflicto: b.titulo
          };
        }
        const fechaFinBloqueo = b.fechaFin || b.fechaInicio;
        if (fecha >= b.fechaInicio && fecha <= fechaFinBloqueo) {
          const inicioB = b.horaInicio || '00:00';
          const finB = b.horaFin || '23:59';
          if (horaInicio < finB && horaFin > inicioB) {
            return {
              disponible: false,
              codigoMensaje: 'MSG-VENUE-003',
              motivo: `Bloqueo institucional programado: "${b.titulo}" (${inicioB} a ${finB}) — Motivo: ${b.motivo}`,
              tipoConflicto: 'bloqueo',
              tituloConflicto: b.titulo
            };
          }
        }
      }
    }

    // 2. Validar contra clases docentes regulares si el recinto es un laboratorio
    const fechaObj = new Date(`${fecha}T12:00:00Z`);
    const diaSemana = fechaObj.getUTCDay(); // 1 = Lunes, 2 = Martes ... 5 = Viernes

    const esLaboratorio =
      idRecinto.startsWith('rec-lab') ||
      listaRecintos.find((r) => r.id === idRecinto)?.tipo === 'laboratorio';

    if (esLaboratorio) {
      for (const clase of listaClasesRegulares) {
        const coincideRecinto =
          clase.idRecinto === idRecinto ||
          (idRecinto === 'rec-lab-3' && clase.idRecinto === 'rec-lab-computo-3') ||
          (idRecinto === 'rec-lab-computo-3' && clase.idRecinto === 'rec-lab-3');

        if (coincideRecinto && clase.diaSemana === diaSemana) {
          if (horaInicio < clase.horaFin && horaFin > clase.horaInicio) {
            return {
              disponible: false,
              codigoMensaje: 'MSG-VENUE-002',
              tipoConflicto: 'clase',
              tituloConflicto: `Clase Programada: ${clase.materia}`,
              motivo: `Existe una clase programada de ${clase.horaInicio} a ${clase.horaFin} en este laboratorio (${clase.materia}, Grupo ${clase.grupo}, ${clase.profesor}). Las clases regulares no se desplazan automáticamente; requieren autorización extraordinaria de Subdirección.`,
              detallesConflicto: {
                horarioConflicto: `${clase.horaInicio} - ${clase.horaFin}`,
                nombreActividad: clase.materia,
                materia: clase.materia,
                grupo: clase.grupo,
                profesor: clase.profesor,
                accionesSugeridas: {
                  otroHorario: true,
                  verDisponibilidadDia: true,
                  otroRecinto: true
                }
              }
            };
          }
        }
      }
    }

    // 3. Validar contra otros eventos con colchón de 30 minutos de despeje
    const bufferInicio = restarMinutos(horaInicio, 30);
    const bufferFin = sumarMinutos(horaFin, 30);

    for (const evento of listaEventos) {
      if (evento.estado === 'cancelado') continue;
      for (const fec of evento.fechas) {
        if (idFechaEventoExcluir && fec.id === idFechaEventoExcluir) continue;
        const coincideRecinto =
          fec.idRecinto === idRecinto ||
          (idRecinto === 'rec-lab-3' && fec.idRecinto === 'rec-lab-computo-3') ||
          (idRecinto === 'rec-lab-computo-3' && fec.idRecinto === 'rec-lab-3');

        if (coincideRecinto && fec.fecha === fecha) {
          if (bufferInicio < fec.horaFin && bufferFin > fec.horaInicio) {
            return {
              disponible: false,
              codigoMensaje: 'MSG-VENUE-001',
              motivo: `Conflicto con evento "${evento.titulo}" (${fec.horaInicio} a ${fec.horaFin}). El reglamento de ESCOM exige al menos 30 minutos de margen para desalojo logístico.`,
              tipoConflicto: 'evento',
              tituloConflicto: evento.titulo
            };
          }
        }
      }
    }

    return { disponible: true };
  };

  // Obtener todas las ocupaciones de un recinto en una fecha (para línea de tiempo)
  const obtenerOcupacionesRecinto = (idRecinto: string, fecha: string): OcupacionAgenda[] => {
    const ocupaciones: OcupacionAgenda[] = [];
    const recinto = listaRecintos.find((r) => r.id === idRecinto);
    const nombreRecinto = recinto ? recinto.nombre : idRecinto;

    // A. Clases regulares si es laboratorio
    const fechaObj = new Date(`${fecha}T12:00:00Z`);
    const diaSemana = fechaObj.getUTCDay();

    for (const clase of listaClasesRegulares) {
      const coincideRecinto =
        clase.idRecinto === idRecinto ||
        (idRecinto === 'rec-lab-3' && clase.idRecinto === 'rec-lab-computo-3') ||
        (idRecinto === 'rec-lab-computo-3' && clase.idRecinto === 'rec-lab-3');

      if (coincideRecinto && clase.diaSemana === diaSemana) {
        ocupaciones.push({
          id: clase.id,
          idRecinto,
          nombreRecinto,
          fecha,
          horaInicio: clase.horaInicio,
          horaFin: clase.horaFin,
          tipo: 'clase',
          titulo: `Clase: ${clase.materia}`,
          descripcion: `Grupo ${clase.grupo} · Prof. ${clase.profesor}`,
          responsable: clase.profesor,
          grupo: clase.grupo
        });
      }
    }

    // B. Eventos programados
    for (const evento of listaEventos) {
      if (evento.estado === 'cancelado') continue;
      for (const fec of evento.fechas) {
        const coincideRecinto =
          fec.idRecinto === idRecinto ||
          (idRecinto === 'rec-lab-3' && fec.idRecinto === 'rec-lab-computo-3') ||
          (idRecinto === 'rec-lab-computo-3' && fec.idRecinto === 'rec-lab-3');

        if (coincideRecinto && fec.fecha === fecha) {
          ocupaciones.push({
            id: fec.id,
            idRecinto,
            nombreRecinto,
            fecha,
            horaInicio: fec.horaInicio,
            horaFin: fec.horaFin,
            tipo: evento.categoria === 'Institucional' ? 'actividad_institucional' : 'evento',
            titulo: evento.titulo,
            descripcion: evento.descripcion,
            responsable: evento.nombreOrganizador
          });
        }
      }
    }

    // C. Bloqueos de Subdirección
    for (const b of listaBloqueos) {
      const aplicaRecinto =
        b.idRecinto === idRecinto ||
        b.idRecinto === 'todos' ||
        (b.idsRecintos && b.idsRecintos.includes(idRecinto));

      if (aplicaRecinto) {
        const fin = b.fechaFin || b.fechaInicio;
        if (fecha >= b.fechaInicio && (b.esIndefinido || fecha <= fin)) {
          ocupaciones.push({
            id: b.id,
            idRecinto,
            nombreRecinto,
            fecha,
            horaInicio: b.horaInicio || '08:00',
            horaFin: b.horaFin || '20:00',
            tipo: 'bloqueo',
            titulo: `Bloqueo: ${b.titulo}`,
            descripcion: b.motivo,
            responsable: b.creadoPor
          });
        }
      }
    }

    // Ordenar cronológicamente por horaInicio
    return ocupaciones.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  };

  // Obtener agenda multi-recinto consolidada para una fecha
  const obtenerAgendaMultiRecinto = (fecha: string): OcupacionAgenda[] => {
    const agendaConsolidada: OcupacionAgenda[] = [];
    // Unir ocupaciones de todos los recintos
    for (const rec of listaRecintos) {
      if (rec.id === 'rec-lab-computo-3') continue; // Evitar duplicar alias
      const items = obtenerOcupacionesRecinto(rec.id, fecha);
      agendaConsolidada.push(...items);
    }
    return agendaConsolidada;
  };

  // Obtener lista de verificación previa a publicación
  const obtenerListaDeVerificacion = (idEvento: string): ListaVerificacionPublicacion => {
    const evento = listaEventos.find((e) => e.id === idEvento);
    if (!evento) {
      return {
        solicitudAutorizada: false,
        informacionGeneralCompleta: false,
        tieneFechas: false,
        todasLasFechasTienenRecinto: false,
        todasLasFechasTienenVersionFinal: false,
        puedePublicar: false,
        elementosPendientes: ['Evento no encontrado']
      };
    }

    const solicitud = evento.idSolicitud
      ? listaSolicitudes.find((s) => s.id === evento.idSolicitud)
      : null;

    const solicitudAutorizada = !evento.idSolicitud || solicitud?.estado === 'autorizada';
    const informacionGeneralCompleta =
      Boolean(evento.titulo?.trim()) &&
      Boolean(evento.descripcion?.trim()) &&
      evento.ponentes?.length > 0;
    const tieneFechas = evento.fechas && evento.fechas.length > 0;
    const todasLasFechasTienenRecinto =
      tieneFechas && evento.fechas.every((f) => Boolean(f.idRecinto));

    // Si es acceso controlado, cada fecha debe tener exactamente una versión final confirmada
    const todasLasFechasTienenVersionFinal =
      evento.modalidadAsistencia !== 'controlado' ||
      (tieneFechas &&
        evento.fechas.every((f) => {
          if (!f.idArregloFinal) return false;
          const arreglo = listaArreglos.find((a) => a.id === f.idArregloFinal);
          return arreglo && arreglo.estado === 'version_final';
        }));

    const elementosPendientes: string[] = [];
    if (!solicitudAutorizada) elementosPendientes.push('Solicitud formal autorizada por Subdirección');
    if (!informacionGeneralCompleta) elementosPendientes.push('Información completa (título, descripción, ponentes)');
    if (!tieneFechas) elementosPendientes.push('Al menos una fecha de sesión programada');
    if (!todasLasFechasTienenRecinto) elementosPendientes.push('Asignación de recinto para todas las fechas');
    if (!todasLasFechasTienenVersionFinal) elementosPendientes.push('Versión final confirmada de lugares para cada fecha');

    return {
      solicitudAutorizada,
      informacionGeneralCompleta,
      tieneFechas,
      todasLasFechasTienenRecinto,
      todasLasFechasTienenVersionFinal,
      puedePublicar: elementosPendientes.length === 0,
      elementosPendientes
    };
  };

  // Crear Solicitud de Evento
  const crearSolicitud = (
    datos: Omit<SolicitudEvento, 'id' | 'fechaCreacion' | 'estado'>
  ): SolicitudEvento => {
    const id = `sol-${Date.now().toString(36)}`;
    const nuevaSolicitud: SolicitudEvento = {
      ...datos,
      id,
      estado: 'en_revision',
      fechaCreacion: new Date().toISOString()
    };

    setListaSolicitudes((previas) => [nuevaSolicitud, ...previas]);
    return nuevaSolicitud;
  };

  // Dictaminar Solicitud
  const dictaminarSolicitud = (
    idSolicitud: string,
    decision: 'autorizada' | 'rechazada',
    motivo?: string,
    nombreRevisor?: string
  ) => {
    let solicitudActualizada: SolicitudEvento | undefined;

    setListaSolicitudes((previas) =>
      previas.map((s) => {
        if (s.id === idSolicitud) {
          solicitudActualizada = {
            ...s,
            estado: decision,
            motivoRechazo: decision === 'rechazada' ? motivo : undefined,
            revisadoPor: nombreRevisor || 'Subdirección de ESCOM',
            fechaRevision: new Date().toISOString()
          };
          return solicitudActualizada;
        }
        return s;
      })
    );

    if (decision === 'autorizada' && solicitudActualizada) {
      const sol = solicitudActualizada;
      const nuevoIdEvento = `evt-${sol.id.replace('sol-', '')}`;
      const yaExiste = listaEventos.some((e) => e.id === nuevoIdEvento || e.idSolicitud === sol.id);

      if (!yaExiste) {
        const fechasConvertidas: Evento['fechas'] = sol.fechasSolicitadas.map((f, indice) => ({
          id: `fec-${nuevoIdEvento}-${indice + 1}`,
          idEvento: nuevoIdEvento,
          fecha: f.fecha,
          horaInicio: f.horaInicio,
          horaFin: f.horaFin,
          idRecinto: f.idRecinto,
          esFinalConfirmado: false,
          ponentes: []
        }));

        const nuevoEvento: Evento = {
          id: nuevoIdEvento,
          idSolicitud: sol.id,
          idOrganizador: sol.idSolicitante,
          nombreOrganizador: sol.nombreSolicitante,
          titulo: sol.tituloEvento,
          descripcion: sol.descripcionEvento,
          categoria: 'Académico',
          visibilidad: sol.visibilidad,
          modalidadAsistencia: sol.modalidadAsistencia,
          estado: 'configuracion',
          fechas: fechasConvertidas,
          aforoMaximo: sol.asistenciaEstimada,
          ponentes: [],
          etiquetas: ['ESCOM', sol.modalidadAsistencia]
        };

        setListaEventos((previos) => [nuevoEvento, ...previos]);

        // Crear borradores iniciales de arreglo para cada fecha
        fechasConvertidas.forEach((f) => {
          const asientos = f.idRecinto === 'rec-auditorio'
            ? generarAsientosAuditorio()
            : generarAsientosSala14();

          const total = asientos.filter((a) => !a.estaEliminado).length;
          const nuevoArreglo: ArregloAsientos = {
            id: `arr-${f.id}-borrador`,
            idFechaEvento: f.id,
            idRecinto: f.idRecinto,
            nombre: 'Borrador Inicial 1',
            etiquetaVersion: 'v1.0-borrador',
            estado: 'borrador',
            asientos,
            totalAsientos: total,
            asientosAsistente: asientos.filter((a) => a.categoria === 'asistente' && !a.estaEliminado).length,
            asientosVip: asientos.filter((a) => a.categoria === 'vip' && !a.estaEliminado).length,
            asientosOrganizador: asientos.filter((a) => a.categoria === 'organizador' && !a.estaEliminado).length,
            asientosStaff: asientos.filter((a) => a.categoria === 'staff' && !a.estaEliminado).length,
            asientosBloqueados: asientos.filter((a) => a.estaBloqueado && !a.estaEliminado).length,
            asientosSinAsignar: 0,
            fechaCreacion: new Date().toISOString()
          };
          setListaArreglos((previos) => [...previos, nuevoArreglo]);
        });
      }
    }
  };

  // Crear Evento Institucional Directo (Subdirección)
  const crearEventoInstitucionalDirecto = (datosEvento: Partial<Evento>): Evento => {
    const id = `evt-inst-${Date.now().toString(36)}`;
    const nuevo: Evento = {
      id,
      idOrganizador: 'usr-subdireccion',
      nombreOrganizador: 'Subdirección de ESCOM',
      titulo: datosEvento.titulo || 'Evento Institucional ESCOM',
      descripcion: datosEvento.descripcion || '',
      categoria: datosEvento.categoria || 'Institucional',
      visibilidad: datosEvento.visibilidad || 'interno',
      modalidadAsistencia: datosEvento.modalidadAsistencia || 'libre',
      estado: 'configuracion',
      fechas: datosEvento.fechas || [],
      ponentes: datosEvento.ponentes || ['Comité Institucional'],
      etiquetas: datosEvento.etiquetas || ['Institucional', 'ESCOM'],
      aforoMaximo: datosEvento.aforoMaximo || 120
    };

    setListaEventos((previos) => [nuevo, ...previos]);
    return nuevo;
  };

  const actualizarEvento = (idEvento: string, parcial: Partial<Evento>) => {
    setListaEventos((previos) =>
      previos.map((e) => (e.id === idEvento ? { ...e, ...parcial } : e))
    );
  };

  const publicarEvento = (idEvento: string): { exito: boolean; error?: string } => {
    const checklist = obtenerListaDeVerificacion(idEvento);
    if (!checklist.puedePublicar) {
      return {
        exito: false,
        error: `Faltan requisitos para publicar: ${checklist.elementosPendientes.join(', ')}`
      };
    }

    setListaEventos((previos) =>
      previos.map((e) =>
        e.id === idEvento
          ? { ...e, estado: 'publicado', fechaPublicacion: new Date().toISOString() }
          : e
      )
    );
    return { exito: true };
  };

  const agregarFechaEvento = (
    idEvento: string,
    datosFecha: Omit<Evento['fechas'][0], 'id' | 'esFinalConfirmado'>
  ) => {
    const nuevaFecha: Evento['fechas'][0] = {
      ...datosFecha,
      id: `fec-${idEvento}-${Date.now().toString(36)}`,
      esFinalConfirmado: false
    };

    setListaEventos((previos) =>
      previos.map((e) => {
        if (e.id === idEvento) {
          return { ...e, fechas: [...e.fechas, nuevaFecha] };
        }
        return e;
      })
    );
  };

  const eliminarFechaEvento = (idEvento: string, idFecha: string) => {
    setListaEventos((previos) =>
      previos.map((e) => {
        if (e.id === idEvento) {
          return { ...e, fechas: e.fechas.filter((f) => f.id !== idFecha) };
        }
        return e;
      })
    );
  };

  // Arreglos
  const crearArreglo = (datos: Omit<ArregloAsientos, 'id' | 'fechaCreacion'>): ArregloAsientos => {
    const nuevo: ArregloAsientos = {
      ...datos,
      id: `arr-${Date.now().toString(36)}`,
      fechaCreacion: new Date().toISOString()
    };
    setListaArreglos((previos) => [...previos, nuevo]);
    return nuevo;
  };

  const actualizarArreglo = (idArreglo: string, parcial: Partial<ArregloAsientos>) => {
    setListaArreglos((previos) =>
      previos.map((a) => (a.id === idArreglo ? { ...a, ...parcial } : a))
    );
  };

  const confirmarVersionFinalArreglo = (idFechaEvento: string, idArreglo: string) => {
    setListaArreglos((previos) =>
      previos.map((a) => {
        if (a.idFechaEvento === idFechaEvento) {
          if (a.id === idArreglo) {
            return {
              ...a,
              estado: 'version_final',
              fechaConfirmacionFinal: new Date().toISOString()
            };
          }
          if (a.estado === 'version_final') {
            return { ...a, estado: 'bloqueado' };
          }
        }
        return a;
      })
    );

    setListaEventos((previos) =>
      previos.map((e) => ({
        ...e,
        fechas: e.fechas.map((f) =>
          f.id === idFechaEvento
            ? { ...f, idArregloFinal: idArreglo, esFinalConfirmado: true }
            : f
        )
      }))
    );
  };

  const eliminarArreglo = (idArreglo: string) => {
    setListaArreglos((previos) => previos.filter((a) => a.id !== idArreglo));
  };

  // Apartado Temporal de Asiento (10 Minutos)
  const apartarAsiento = (
    idEvento: string,
    idFechaEvento: string,
    idAsiento: string,
    etiquetaAsiento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string
  ): { exito: boolean; reservacion?: Reservacion; error?: string } => {
    const ahora = Date.now();
    const eventoTaquilla = listaEventos.find((evento) => evento.id === idEvento);
    const fechaTaquilla = eventoTaquilla?.fechas.find((fecha) => fecha.id === idFechaEvento);

    if (!eventoTaquilla || !fechaTaquilla) {
      return { exito: false, error: 'La sesión seleccionada ya no se encuentra disponible.' };
    }

    if (
      obtenerEstadoInscripciones(fechaTaquilla, eventoTaquilla.estado) === 'cerradas' ||
      obtenerFechaLimiteInscripciones(fechaTaquilla) <= ahora
    ) {
      return {
        exito: false,
        error: 'ERR-MT-02 · Las inscripciones de esta sesión están CERRADAS.'
      };
    }

    // Validar si el asiento ya se encuentra tomado o apartado
    const colision = listaReservaciones.find(
      (r) =>
        r.idFechaEvento === idFechaEvento &&
        r.idAsiento === idAsiento &&
        (r.estado === 'confirmada' ||
          (r.estado === 'apartado_temporal' &&
            r.tiempoExpiracionApartado &&
            r.tiempoExpiracionApartado > ahora &&
            r.idUsuario !== idUsuario))
    );

    if (colision) {
      return {
        exito: false,
        error: `El asiento ${etiquetaAsiento} ya no está disponible (fue seleccionado por otro asistente hace unos instantes).`
      };
    }

    // Cancelar apartados temporales previos del mismo usuario para esta fecha
    const reservacionesLimpias = listaReservaciones.filter(
      (r) =>
        !(
          r.idFechaEvento === idFechaEvento &&
          r.idUsuario === idUsuario &&
          r.estado === 'apartado_temporal'
        )
    );

    const nuevaReservacion: Reservacion = {
      id: `res-${Date.now().toString(36)}`,
      idEvento,
      idFechaEvento,
      idUsuario,
      nombreUsuario,
      correoUsuario,
      idAsiento,
      etiquetaAsiento,
      estado: 'apartado_temporal',
      tiempoExpiracionApartado: ahora + 10 * 60 * 1000, // 10 minutos
      fechaCreacion: new Date().toISOString()
    };

    setListaReservaciones([...reservacionesLimpias, nuevaReservacion]);
    return { exito: true, reservacion: nuevaReservacion };
  };

  const liberarApartadoAsiento = (idReservacion: string) => {
    setListaReservaciones((previas) =>
      previas.map((r) => (r.id === idReservacion ? { ...r, estado: 'cancelada' } : r))
    );
  };

  const confirmarReservacion = (
    idReservacion: string
  ): { exito: boolean; boleto?: BoletoDigital; error?: string } => {
    const res = listaReservaciones.find((r) => r.id === idReservacion);
    if (!res) {
      return { exito: false, error: 'Reservación no encontrada.' };
    }

    if (res.estado !== 'apartado_temporal') {
      return {
        exito: false,
        error: 'El apartado ya no se encuentra activo. Verifica el estado de las inscripciones.'
      };
    }

    if (
      res.estado === 'apartado_temporal' &&
      res.tiempoExpiracionApartado &&
      res.tiempoExpiracionApartado < Date.now()
    ) {
      return {
        exito: false,
        error: 'El tiempo límite de 10 minutos ha expirado. Por favor, selecciona tu asiento nuevamente.'
      };
    }

    const evento = listaEventos.find((e) => e.id === res.idEvento);
    const fecha = evento?.fechas.find((f) => f.id === res.idFechaEvento);
    const recinto = listaRecintos.find((v) => v.id === fecha?.idRecinto);

    if (!evento || !fecha) {
      return { exito: false, error: 'La sesión asociada con el apartado ya no existe.' };
    }

    if (
      obtenerEstadoInscripciones(fecha, evento.estado) === 'cerradas' ||
      obtenerFechaLimiteInscripciones(fecha) <= Date.now()
    ) {
      return {
        exito: false,
        error: 'ERR-MT-02 · Las inscripciones se cerraron antes de confirmar el apartado.'
      };
    }

    const idBoleto = `bol-${Date.now().toString(36)}`;
    const codigoQr = `TT-ESCOM-${evento?.id.toUpperCase()}-${res.etiquetaAsiento || 'GEN'}-${Date.now().toString(36).toUpperCase()}`;

    const nuevoBoleto: BoletoDigital = {
      id: idBoleto,
      idReservacion: res.id,
      idEvento: res.idEvento,
      idFechaEvento: res.idFechaEvento,
      idUsuario: res.idUsuario,
      nombreUsuario: res.nombreUsuario,
      correoUsuario: res.correoUsuario,
      tituloEvento: evento?.titulo || 'Evento ESCOM',
      fechaEvento: fecha?.fecha || '',
      horaEvento: `${fecha?.horaInicio || ''} - ${fecha?.horaFin || ''}`,
      nombreRecinto: recinto?.nombre || 'Recinto ESCOM',
      etiquetaAsiento: res.etiquetaAsiento,
      codigoQr,
      estado: 'valido',
      fechaEmision: new Date().toISOString()
    };

    setListaReservaciones((previas) =>
      previas.map((r) =>
        r.id === idReservacion
          ? {
              ...r,
              estado: 'confirmada',
              fechaConfirmacion: new Date().toISOString(),
              idBoleto
            }
          : r
      )
    );

    setListaBoletos((previos) => [nuevoBoleto, ...previos]);
    return { exito: true, boleto: nuevoBoleto };
  };

  const cancelarReservacion = (idReservacion: string) => {
    const res = listaReservaciones.find((r) => r.id === idReservacion);
    if (!res) return;

    setListaReservaciones((previas) =>
      previas.map((r) => (r.id === idReservacion ? { ...r, estado: 'cancelada' } : r))
    );

    if (res.idBoleto) {
      setListaBoletos((previos) =>
        previos.map((b) => (b.id === res.idBoleto ? { ...b, estado: 'cancelado' } : b))
      );
    }

    // Solo generar una nueva oferta si la taquilla continúa abierta.
    const evento = listaEventos.find((elemento) => elemento.id === res.idEvento);
    const fecha = evento?.fechas.find((elemento) => elemento.id === res.idFechaEvento);
    const inscripcionesAbiertas =
      evento &&
      fecha &&
      obtenerEstadoInscripciones(fecha, evento.estado) === 'abiertas' &&
      obtenerFechaLimiteInscripciones(fecha) > Date.now();

    if (inscripcionesAbiertas) {
      const siguienteEnFila = listaEspera.find(
        (w) => w.idFechaEvento === res.idFechaEvento && w.estado === 'esperando'
      );
      if (siguienteEnFila) {
        setListaEspera((previas) =>
          previas.map((w) => (w.id === siguienteEnFila.id ? { ...w, estado: 'notificado' } : w))
        );
      }
    }
  };

  const emitirBoletosEspeciales = (datos: {
    idEvento: string;
    idFechaEvento: string;
    tipo: TipoBoletoEspecial;
    cantidad: number;
    nombreBase: string;
    correoDestino: string;
    emitidoPor: string;
  }): { exito: boolean; boletos?: BoletoDigital[]; error?: string } => {
    const evento = listaEventos.find((e) => e.id === datos.idEvento);
    const fecha = evento?.fechas.find((f) => f.id === datos.idFechaEvento);
    const recinto = listaRecintos.find((r) => r.id === fecha?.idRecinto);

    if (!evento || !fecha) {
      return { exito: false, error: 'El evento o la sesión seleccionada no existe.' };
    }

    if (evento.estado === 'cancelado' || evento.estado === 'finalizado') {
      return {
        exito: false,
        error: 'No se pueden emitir boletos para un evento cancelado o finalizado.'
      };
    }

    if (
      obtenerEstadoInscripciones(fecha, evento.estado) === 'cerradas' ||
      obtenerFechaLimiteInscripciones(fecha) <= Date.now()
    ) {
      return {
        exito: false,
        error: 'ERR-MT-02 · Las inscripciones están CERRADAS para esta sesión.'
      };
    }

    const bloqueo = listaBloqueos.find((elemento) => bloqueoAfectaSesion(elemento, fecha));
    if (bloqueo) {
      return {
        exito: false,
        error: `ERR-TR-10 · SUSPENDIDO: ${bloqueo.titulo}.`
      };
    }

    if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 20) {
      return { exito: false, error: 'La cantidad debe estar entre 1 y 20 boletos.' };
    }

    if (!datos.nombreBase.trim() || !datos.correoDestino.trim()) {
      return { exito: false, error: 'Indica el nombre de referencia y el correo de destino.' };
    }

    const ahora = Date.now();
    const prefijo = datos.tipo.toUpperCase();
    const boletosNuevos: BoletoDigital[] = Array.from({ length: datos.cantidad }, (_, indice) => {
      const consecutivo = indice + 1;
      const sufijo = `${ahora.toString(36)}-${consecutivo}`;
      const nombreUsuario =
        datos.cantidad === 1
          ? datos.nombreBase.trim()
          : `${datos.nombreBase.trim()} ${consecutivo}`;

      return {
        id: `bol-esp-${sufijo}`,
        idReservacion: `res-esp-${sufijo}`,
        idEvento: evento.id,
        idFechaEvento: fecha.id,
        idUsuario: `acreditacion-${datos.tipo}-${sufijo}`,
        nombreUsuario,
        correoUsuario: datos.correoDestino.trim(),
        tituloEvento: evento.titulo,
        fechaEvento: fecha.fecha,
        horaEvento: `${fecha.horaInicio} - ${fecha.horaFin}`,
        nombreRecinto: recinto?.nombre || 'Recinto ESCOM',
        etiquetaAsiento: `${prefijo}-${String(consecutivo).padStart(2, '0')}`,
        codigoQr: `TT-ESCOM-${evento.id.toUpperCase()}-${prefijo}-${sufijo.toUpperCase()}`,
        estado: 'valido',
        esEspecial: true,
        tipoEspecial: datos.tipo,
        emitidoPor: datos.emitidoPor,
        fechaEmision: new Date(ahora + indice).toISOString()
      };
    });

    setListaBoletos((previos) => [...boletosNuevos, ...previos]);
    return { exito: true, boletos: boletosNuevos };
  };

  const invalidarBoletoEspecial = (
    idBoleto: string,
    motivo: string,
    invalidadoPor: string
  ): { exito: boolean; error?: string } => {
    const boleto = listaBoletos.find((b) => b.id === idBoleto && b.esEspecial);

    if (!boleto) {
      return { exito: false, error: 'No se encontró el boleto especial seleccionado.' };
    }

    if (boleto.estado === 'utilizado') {
      return { exito: false, error: 'Un boleto que ya fue utilizado no puede invalidarse.' };
    }

    if (boleto.estado === 'cancelado') {
      return { exito: false, error: 'El boleto ya se encuentra invalidado.' };
    }

    if (!motivo.trim()) {
      return { exito: false, error: 'Es necesario registrar el motivo de invalidación.' };
    }

    setListaBoletos((previos) =>
      previos.map((b) =>
        b.id === idBoleto
          ? {
              ...b,
              estado: 'cancelado',
              motivoInvalidacion: motivo.trim(),
              fechaInvalidacion: new Date().toISOString(),
              invalidadoPor
            }
          : b
      )
    );

    return { exito: true };
  };

  const cambiarEstadoInscripciones = (datos: {
    idEvento: string;
    idsFechaEvento: string[];
    nuevoEstado: EstadoInscripciones;
    idOrganizador: string;
    nombreOrganizador: string;
    versionesEsperadas?: Record<string, number>;
  }): { exito: boolean; sesionesActualizadas?: number; error?: string } => {
    const evento = listaEventos.find((elemento) => elemento.id === datos.idEvento);
    const idsUnicas = [...new Set(datos.idsFechaEvento)];

    if (!evento) {
      return { exito: false, error: 'ERR-TR-03 · El evento seleccionado no existe.' };
    }

    if (evento.idOrganizador !== datos.idOrganizador) {
      return {
        exito: false,
        error: 'ERR-TR-02 · No estás autorizado para administrar las inscripciones de este evento.'
      };
    }

    if (idsUnicas.length === 0) {
      return { exito: false, error: 'Selecciona al menos una sesión para continuar.' };
    }

    if (evento.estado === 'cancelado' || evento.estado === 'finalizado') {
      return {
        exito: false,
        error: `ERR-TR-10 · El evento se encuentra ${evento.estado.toUpperCase()}.`
      };
    }

    if (datos.nuevoEstado === 'abiertas' && evento.estado !== 'publicado') {
      return {
        exito: false,
        error: 'ERR-TR-10 · El evento debe estar PUBLICADO antes de abrir inscripciones.'
      };
    }

    const ahora = Date.now();
    const sesiones = idsUnicas.map((idFecha) =>
      evento.fechas.find((fecha) => fecha.id === idFecha)
    );

    if (sesiones.some((fecha) => !fecha)) {
      return { exito: false, error: 'ERR-TR-03 · Una de las sesiones ya no existe.' };
    }

    for (const fecha of sesiones) {
      if (!fecha) continue;
      const estadoActual = obtenerEstadoInscripciones(fecha, evento.estado);
      const versionActual = fecha.versionInscripciones || 0;
      const versionEsperada = datos.versionesEsperadas?.[fecha.id];

      if (versionEsperada !== undefined && versionEsperada !== versionActual) {
        return {
          exito: false,
          error: 'ERR-TR-08 · El estado fue modificado mientras realizabas la operación. Recarga y vuelve a intentarlo.'
        };
      }

      if (estadoActual === datos.nuevoEstado) {
        return {
          exito: false,
          error: `ERR-TR-10 · Las inscripciones de ${fecha.nombreDia || fecha.fecha} ya están ${estadoActual.toUpperCase()}.`
        };
      }

      if (datos.nuevoEstado === 'abiertas') {
        const bloqueo = listaBloqueos.find((elemento) => bloqueoAfectaSesion(elemento, fecha));
        if (bloqueo) {
          return {
            exito: false,
            error: `ERR-TR-10 · SUSPENDIDO: ${bloqueo.titulo}. No es posible abrir inscripciones.`
          };
        }

        const finSesion = new Date(`${fecha.fecha}T${fecha.horaFin}:00`).getTime();
        if (finSesion <= ahora) {
          return {
            exito: false,
            error: `ERR-TR-10 · La sesión ${fecha.nombreDia || fecha.fecha} ya está FINALIZADA.`
          };
        }

        if (obtenerFechaLimiteInscripciones(fecha) <= ahora) {
          return {
            exito: false,
            error: `ERR-TR-10 · La fecha límite de ${fecha.nombreDia || fecha.fecha} ya fue alcanzada.`
          };
        }
      }
    }

    const conjuntoIds = new Set(idsUnicas);
    const fechaCambio = new Date(ahora).toISOString();
    const causa = datos.nuevoEstado === 'abiertas' ? 'apertura_manual' : 'cierre_manual';

    setListaEventos((previos) =>
      previos.map((elemento) =>
        elemento.id !== evento.id
          ? elemento
          : {
              ...elemento,
              fechas: elemento.fechas.map((fecha) =>
                !conjuntoIds.has(fecha.id)
                  ? fecha
                  : {
                      ...fecha,
                      estadoInscripciones: datos.nuevoEstado,
                      versionInscripciones: (fecha.versionInscripciones || 0) + 1,
                      historialInscripciones: [
                        ...(fecha.historialInscripciones || []),
                        {
                          id: `ins-${fecha.id}-${ahora}`,
                          estado: datos.nuevoEstado,
                          fechaCambio,
                          idResponsable: datos.idOrganizador,
                          responsable: datos.nombreOrganizador,
                          causa
                        }
                      ]
                    }
              )
            }
      )
    );

    if (datos.nuevoEstado === 'cerradas') {
      setListaReservaciones((previas) =>
        previas.map((reservacion) =>
          conjuntoIds.has(reservacion.idFechaEvento) &&
          reservacion.estado === 'apartado_temporal'
            ? { ...reservacion, estado: 'cancelada' }
            : reservacion
        )
      );

      // Se cierra la oferta activa, pero se conserva la posición para una posible reapertura.
      setListaEspera((previas) =>
        previas.map((entrada) =>
          conjuntoIds.has(entrada.idFechaEvento) && entrada.estado === 'notificado'
            ? { ...entrada, estado: 'esperando' }
            : entrada
        )
      );
    }

    return { exito: true, sesionesActualizadas: idsUnicas.length };
  };

  const unirseAListaDeEspera = (
    idEvento: string,
    idFechaEvento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string
  ): { exito: boolean; entrada?: EntradaListaEspera; error?: string } => {
    const evento = listaEventos.find((elemento) => elemento.id === idEvento);
    const fecha = evento?.fechas.find((elemento) => elemento.id === idFechaEvento);

    if (!evento || !fecha) {
      return { exito: false, error: 'La sesión seleccionada ya no existe.' };
    }

    if (
      obtenerEstadoInscripciones(fecha, evento.estado) === 'cerradas' ||
      obtenerFechaLimiteInscripciones(fecha) <= Date.now()
    ) {
      return {
        exito: false,
        error: 'ERR-MT-02 · La lista de espera no admite incorporaciones porque las inscripciones están CERRADAS.'
      };
    }

    const actuales = listaEspera.filter((w) => w.idFechaEvento === idFechaEvento);
    const entrada: EntradaListaEspera = {
      id: `esp-${Date.now().toString(36)}`,
      idEvento,
      idFechaEvento,
      idUsuario,
      nombreUsuario,
      correoUsuario,
      posicionFila: actuales.length + 1,
      fechaCreacion: new Date().toISOString(),
      estado: 'esperando'
    };
    setListaEspera((previas) => [...previas, entrada]);
    return { exito: true, entrada };
  };

  // Procesamiento de Check-In en Puerta para Staff
  const procesarCheckIn = (
    codigoQr: string,
    escaneadoPor: string,
    idFechaEventoObjetivo?: string
  ): {
    exito: boolean;
    resultado: RegistroEscaneo['resultado'];
    boleto?: BoletoDigital;
    mensaje: string;
  } => {
    const boleto = listaBoletos.find((b) => b.codigoQr.trim() === codigoQr.trim());

    if (!boleto) {
      const bitacora: RegistroEscaneo = {
        id: `esc-${Date.now()}`,
        idBoleto: 'desconocido',
        idEvento: 'desconocido',
        idFechaEvento: idFechaEventoObjetivo || 'desconocido',
        fechaEscaneo: new Date().toISOString(),
        escaneadoPor,
        resultado: 'inexistente',
        notas: `Código QR inexistente: ${codigoQr}`
      };
      setBitacoraEscaneos((previas) => [bitacora, ...previas]);
      return {
        exito: false,
        resultado: 'inexistente',
        mensaje: 'Boleto inexistente. El código QR no corresponde a ningún boleto emitido por ESCOM.'
      };
    }

    if (boleto.estado === 'cancelado') {
      const bitacora: RegistroEscaneo = {
        id: `esc-${Date.now()}`,
        idBoleto: boleto.id,
        idEvento: boleto.idEvento,
        idFechaEvento: boleto.idFechaEvento,
        fechaEscaneo: new Date().toISOString(),
        escaneadoPor,
        resultado: 'cancelado',
        nombreAsistente: boleto.nombreUsuario,
        etiquetaAsiento: boleto.etiquetaAsiento
      };
      setBitacoraEscaneos((previas) => [bitacora, ...previas]);
      return {
        exito: false,
        resultado: 'cancelado',
        boleto,
        mensaje: `Boleto CANCELADO. Este boleto fue revocado previamente por el usuario o administración.`
      };
    }

    if (boleto.estado === 'utilizado') {
      const bitacora: RegistroEscaneo = {
        id: `esc-${Date.now()}`,
        idBoleto: boleto.id,
        idEvento: boleto.idEvento,
        idFechaEvento: boleto.idFechaEvento,
        fechaEscaneo: new Date().toISOString(),
        escaneadoPor,
        resultado: 'ya_utilizado',
        nombreAsistente: boleto.nombreUsuario,
        etiquetaAsiento: boleto.etiquetaAsiento
      };
      setBitacoraEscaneos((previas) => [bitacora, ...previas]);
      return {
        exito: false,
        resultado: 'ya_utilizado',
        boleto,
        mensaje: `ALERTA: Este boleto YA FUE UTILIZADO el ${new Date(boleto.fechaCheckIn || '').toLocaleString('es-MX')} por ${boleto.revisadoPor || 'Staff'}.`
      };
    }

    if (idFechaEventoObjetivo && boleto.idFechaEvento !== idFechaEventoObjetivo) {
      const bitacora: RegistroEscaneo = {
        id: `esc-${Date.now()}`,
        idBoleto: boleto.id,
        idEvento: boleto.idEvento,
        idFechaEvento: boleto.idFechaEvento,
        fechaEscaneo: new Date().toISOString(),
        escaneadoPor,
        resultado: 'fecha_invalida',
        nombreAsistente: boleto.nombreUsuario,
        etiquetaAsiento: boleto.etiquetaAsiento
      };
      setBitacoraEscaneos((previas) => [bitacora, ...previas]);
      return {
        exito: false,
        resultado: 'fecha_invalida',
        boleto,
        mensaje: `FECHA INCORRECTA: Este boleto es para la sesión del ${boleto.fechaEvento}, no para la sesión actual.`
      };
    }

    // Boleto válido: Registrar ingreso exitoso
    const fechaHora = new Date().toISOString();
    setListaBoletos((previos) =>
      previos.map((b) =>
        b.id === boleto.id
          ? {
              ...b,
              estado: 'utilizado',
              fechaCheckIn: fechaHora,
              revisadoPor: escaneadoPor
            }
          : b
      )
    );

    const bitacora: RegistroEscaneo = {
      id: `esc-${Date.now()}`,
      idBoleto: boleto.id,
      idEvento: boleto.idEvento,
      idFechaEvento: boleto.idFechaEvento,
      fechaEscaneo: fechaHora,
      escaneadoPor,
      resultado: 'exito',
      nombreAsistente: boleto.nombreUsuario,
      etiquetaAsiento: boleto.etiquetaAsiento
    };
    setBitacoraEscaneos((previas) => [bitacora, ...previas]);

    return {
      exito: true,
      resultado: 'exito',
      boleto: { ...boleto, estado: 'utilizado', fechaCheckIn: fechaHora, revisadoPor: escaneadoPor },
      mensaje: `Acceso concedido a ${boleto.nombreUsuario}. Asiento asignado: ${boleto.etiquetaAsiento || 'General'}.`
    };
  };

  // Bloqueos de Recinto
  const crearBloqueoRecinto = (
    bloqueo: Omit<BloqueoRecinto, 'id' | 'fechaCreacion'>
  ): BloqueoRecinto => {
    const nuevo: BloqueoRecinto = {
      ...bloqueo,
      id: `bloq-${Date.now().toString(36)}`,
      fechaCreacion: new Date().toISOString()
    };
    setListaBloqueos((previos) => [nuevo, ...previos]);
    return nuevo;
  };

  const eliminarBloqueoRecinto = (idBloqueo: string) => {
    setListaBloqueos((previos) => previos.filter((b) => b.id !== idBloqueo));
  };

  const reiniciarDatosIniciales = () => {
    localStorage.clear();
    setListaEventos(EVENTOS_INICIALES);
    setListaSolicitudes(SOLICITUDES_INICIALES);
    setListaArreglos(ARREGLOS_INICIALES);
    setListaBloqueos(BLOQUEOS_INICIALES);
    setListaReservaciones(RESERVACIONES_INICIALES);
    setListaBoletos(BOLETOS_INICIALES);
    setListaEspera([]);
    setBitacoraEscaneos(BITACORA_INICIAL_ESCANEOS);
  };

  return (
    <ContextoDatos.Provider
      value={{
        listaEventos,
        listaSolicitudes,
        listaRecintos,
        listaArreglos,
        listaBloqueos,
        listaReservaciones,
        listaBoletos,
        listaEspera,
        bitacoraEscaneos,
        listaClasesRegulares,
        verificarDisponibilidadRecinto,
        obtenerOcupacionesRecinto,
        obtenerAgendaMultiRecinto,
        obtenerListaDeVerificacion,
        crearSolicitud,
        dictaminarSolicitud,
        crearEventoInstitucionalDirecto,
        actualizarEvento,
        publicarEvento,
        agregarFechaEvento,
        eliminarFechaEvento,
        crearArreglo,
        actualizarArreglo,
        confirmarVersionFinalArreglo,
        eliminarArreglo,
        apartarAsiento,
        liberarApartadoAsiento,
        confirmarReservacion,
        cancelarReservacion,
        emitirBoletosEspeciales,
        invalidarBoletoEspecial,
        cambiarEstadoInscripciones,
        unirseAListaDeEspera,
        procesarCheckIn,
        crearBloqueoRecinto,
        eliminarBloqueoRecinto,
        reiniciarDatosIniciales
      }}
    >
      {children}
    </ContextoDatos.Provider>
  );
};

export const useDatos = () => {
  const contexto = useContext(ContextoDatos);
  if (!contexto) {
    throw new Error('useDatos debe ser utilizado dentro de un ProveedorDatos');
  }
  return contexto;
};

// Funciones auxiliares de cálculo horario
function sumarMinutos(cadenaHora: string, minutosASumar: number): string {
  const [h, m] = cadenaHora.split(':').map(Number);
  const total = h * 60 + m + minutosASumar;
  const nuevoH = Math.floor(total / 60) % 24;
  const nuevoM = total % 60;
  return `${String(nuevoH).padStart(2, '0')}:${String(nuevoM).padStart(2, '0')}`;
}

function restarMinutos(cadenaHora: string, minutosARestar: number): string {
  const [h, m] = cadenaHora.split(':').map(Number);
  const total = Math.max(0, h * 60 + m - minutosARestar);
  const nuevoH = Math.floor(total / 60);
  const nuevoM = total % 60;
  return `${String(nuevoH).padStart(2, '0')}:${String(nuevoM).padStart(2, '0')}`;
}
