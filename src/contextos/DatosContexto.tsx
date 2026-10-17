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
  RegistroIntencionAsistencia,
  RegistroEscaneo,
  ResultadoDisponibilidadRecinto,
  ListaVerificacionPublicacion,
  ConfiguracionAsiento,
  HorarioClaseRegular,
  OcupacionAgenda,
  Usuario,
  OcupacionInterna
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
import { useAutenticacion } from './AutenticacionContexto';
import { registrarCambioSolicitud, validarAnticipacionSolicitud, validarProgramacion, versionSolicitud } from '../dominio/solicitudes';
import { generarIdentificadorQr } from '../utilidades/identificadores';

interface ContextoDatosTipo {
  listaEventos: Evento[];
  listaSolicitudes: SolicitudEvento[];
  listaRecintos: Recinto[];
  listaOcupacionesInternas: OcupacionInterna[];
  listaArreglos: ArregloAsientos[];
  listaBloqueos: BloqueoRecinto[];
  listaReservaciones: Reservacion[];
  listaBoletos: BoletoDigital[];
  listaEspera: EntradaListaEspera[];
  listaIntencionesAsistencia: RegistroIntencionAsistencia[];
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
  guardarBorradorSolicitud: (datos: Omit<SolicitudEvento, 'id' | 'fechaCreacion' | 'estado'>) => SolicitudEvento;

  dictaminarSolicitud: (
    idSolicitud: string,
    decision: "autorizada" | "rechazada",
    motivo?: string,
    nombreRevisor?: string,
    versionEsperada?: number,
  ) => { exito: boolean; error?: string };
  atenderSolicitudExtraordinaria: (
    idSolicitud: string,
    versionEsperada: number,
  ) => { exito: boolean; error?: string };
  devolverSolicitud: (
    idSolicitud: string,
    observaciones: string,
    nombreRevisor?: string,
    versionEsperada?: number,
  ) => { exito: boolean; error?: string };
  actualizarSolicitud: (
    idSolicitud: string,
    cambios: Partial<
      Pick<
        SolicitudEvento,
        | "esExcepcional"
        | "tituloEvento"
        | "descripcionEvento"
        | "fechasSolicitadas"
        | "modalidadAsistencia"
        | "visibilidad"
        | "asistenciaEstimada"
        | "justificacionExcepcional"
        | "correoContacto"
        | "telefonoContacto"
        | "nombreDocumento"
        | "urlDocumento"
        | "nombreBanner"
        | "urlImagen"
      >
    >,
    reenviar?: boolean,
    versionEsperada?: number,
  ) => { exito: boolean; error?: string };
  cancelarSolicitud: (
    idSolicitud: string,
    versionEsperada?: number,
  ) => { exito: boolean; error?: string };

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
  cancelarReservacion: (idReservacion: string, idUsuario: string, motivo: string) => { exito: boolean; error?: string };
  cancelarReservacionPorEvento: (
    idReservacion: string,
    idActor: string,
    rolActivo: Usuario['rolActivo'],
    motivo: string
  ) => { exito: boolean; error?: string };

  registrarIntencionAsistencia: (
    idEvento: string,
    idFechaEvento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string
  ) => { exito: boolean; registro?: RegistroIntencionAsistencia; error?: string };
  cancelarIntencionAsistencia: (idRegistro: string) => void;

  emitirBoletosEspeciales: (datos: {
    idEvento: string;
    idFechaEvento: string;
    tipo: TipoBoletoEspecial;
    cantidad: number;
    nombreBase: string;
    correoDestino: string;
    emitidoPor: string;
    idOrganizador: string;
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
  }) => { exito: boolean; diasActualizados?: number; error?: string };

  unirseAListaDeEspera: (
    idEvento: string,
    idFechaEvento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string,
    rolesUsuario?: Usuario['roles'],
    correoConfirmado?: boolean
  ) => { exito: boolean; entrada?: EntradaListaEspera; error?: string };
  retirarseDeListaDeEspera: (idEntrada: string, idUsuario: string) => { exito: boolean; error?: string };
  responderOfertaListaDeEspera: (
    idEntrada: string,
    idUsuario: string,
    decision: 'aceptar' | 'rechazar' | 'vencer'
  ) => { exito: boolean; error?: string };

  procesarCheckIn: (
    codigoQr: string,
    escaneadoPor: string,
    idFechaEventoObjetivo?: string,
    operador?: Usuario,
    idEventoObjetivo?: string
  ) => {
    exito: boolean;
    resultado: RegistroEscaneo['resultado'];
    boleto?: BoletoDigital;
    mensaje: string;
  };

  crearBloqueoRecinto: (bloqueo: Omit<BloqueoRecinto, 'id' | 'fechaCreacion'>) => BloqueoRecinto;
  eliminarBloqueoRecinto: (idBloqueo: string) => void;
  guardarRecinto: (recinto: Recinto) => void;
  crearOcupacionInterna: (ocupacion: Omit<OcupacionInterna, 'id' | 'fechaCreacion' | 'estado'>) => OcupacionInterna;
  cancelarOcupacionInterna: (id: string) => void;

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
  const { usuarioActual } = useAutenticacion();
  const [listaEventos, setListaEventos] = useState<Evento[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_eventos`);
    return g ? JSON.parse(g) : EVENTOS_INICIALES;
  });

  const [listaSolicitudes, setListaSolicitudes] = useState<SolicitudEvento[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_solicitudes`);
    return g ? JSON.parse(g) : SOLICITUDES_INICIALES;
  });

  const [listaRecintos, setListaRecintos] = useState<Recinto[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_recintos`);
    return g ? JSON.parse(g) : RECINTOS_INICIALES.map((r) => ({ ...r, activo: true }));
  });

  const [listaOcupacionesInternas, setListaOcupacionesInternas] = useState<OcupacionInterna[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_ocupaciones_internas`);
    return g ? JSON.parse(g) : [];
  });

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

  const [listaIntencionesAsistencia, setListaIntencionesAsistencia] = useState<RegistroIntencionAsistencia[]>(() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_intenciones_asistencia`);
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
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_recintos`, JSON.stringify(listaRecintos));
  }, [listaRecintos]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_ocupaciones_internas`, JSON.stringify(listaOcupacionesInternas));
  }, [listaOcupacionesInternas]);

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
    localStorage.setItem(
      `${CLAVE_ALMACEN_DATOS}_intenciones_asistencia`,
      JSON.stringify(listaIntencionesAsistencia)
    );
  }, [listaIntencionesAsistencia]);

  useEffect(() => {
    localStorage.setItem(`${CLAVE_ALMACEN_DATOS}_escaneos`, JSON.stringify(bitacoraEscaneos));
  }, [bitacoraEscaneos]);

  // Limpieza periódica de apartados temporales vencidos (2 minutos)
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

  // Cierre automático al alcanzar la fecha límite configurada para cada día.
  useEffect(() => {
    const cerrarDiasVencidos = () => {
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

    cerrarDiasVencidos();
    const intervalo = setInterval(cerrarDiasVencidos, 60000);
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
    const recintoConsultado = listaRecintos.find((recinto) => recinto.id === idRecinto);
    if (!recintoConsultado || recintoConsultado.activo === false) {
      return {
        disponible: false,
        codigoMensaje: 'MSG-VENUE-005',
        motivo: 'El recinto no existe o está desactivado en el catálogo institucional.',
        tipoConflicto: 'bloqueo',
        tituloConflicto: 'Recinto no disponible'
      };
    }
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

    const ocupacionInterna = listaOcupacionesInternas.find((o) =>
      o.estado === 'activa' && o.idRecinto === idRecinto && fecha >= o.fechaInicio && fecha <= o.fechaFin &&
      horaInicio < o.horaFin && horaFin > o.horaInicio
    );
    if (ocupacionInterna) {
      return {
        disponible: false,
        codigoMensaje: 'MSG-VENUE-004',
        motivo: `El recinto está ocupado por la actividad interna "${ocupacionInterna.titulo}" (${ocupacionInterna.horaInicio} a ${ocupacionInterna.horaFin}).`,
        tipoConflicto: 'ocupacion_interna',
        tituloConflicto: ocupacionInterna.titulo
      };
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

    for (const ocupacion of listaOcupacionesInternas) {
      if (ocupacion.estado === 'activa' && ocupacion.idRecinto === idRecinto && fecha >= ocupacion.fechaInicio && fecha <= ocupacion.fechaFin) {
        ocupaciones.push({
          id: ocupacion.id, idRecinto, nombreRecinto, fecha,
          horaInicio: ocupacion.horaInicio, horaFin: ocupacion.horaFin,
          tipo: 'ocupacion_interna', titulo: ocupacion.titulo,
          descripcion: ocupacion.descripcion, responsable: ocupacion.responsable
        });
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
    if (!tieneFechas) elementosPendientes.push('Al menos un día programado');
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

  const persistirSolicitudes = (solicitudes: SolicitudEvento[]) => {
    try {
      localStorage.setItem(
        `${CLAVE_ALMACEN_DATOS}_solicitudes`,
        JSON.stringify(solicitudes),
      );
      setListaSolicitudes(solicitudes);
      return { exito: true };
    } catch {
      return {
        exito: false,
        error:
          "No se pudo guardar la solicitud. Libera espacio de almacenamiento; tus cambios siguen en el formulario.",
      };
    }
  };

  const solicitudVigente = (id: string) => {
    const guardadas = localStorage.getItem(
      `${CLAVE_ALMACEN_DATOS}_solicitudes`,
    );
    const lista: SolicitudEvento[] = guardadas
      ? JSON.parse(guardadas)
      : listaSolicitudes;
    return { lista, solicitud: lista.find((item) => item.id === id) };
  };

  const crearSolicitud: ContextoDatosTipo["crearSolicitud"] = (datos) => {
    if (
      !usuarioActual ||
      datos.idSolicitante !== usuarioActual.id ||
      usuarioActual.esVerificado !== true ||
      usuarioActual.correoConfirmado === false
    )
      throw new Error(
        "Necesitas una cuenta confirmada y verificada para solicitar un evento.",
      );
    const error =
      validarProgramacion(datos.fechasSolicitadas, listaRecintos, {
        modalidad: datos.modalidadAsistencia,
        aforo: datos.asistenciaEstimada,
      }) || validarAnticipacionSolicitud(datos);
    if (error) throw new Error(error);
    const ahora = new Date().toISOString();
    const nuevaSolicitud: SolicitudEvento = {
      ...datos,
      id: `sol-${crypto.randomUUID()}`,
      estado: "en_revision",
      fechaCreacion: ahora,
      fechaEnvioInicial: ahora,
      version: 1,
    };
    const resultado = persistirSolicitudes([
      nuevaSolicitud,
      ...solicitudVigente("").lista,
    ]);
    if (!resultado.exito) throw new Error(resultado.error);
    return nuevaSolicitud;
  };

  const guardarBorradorSolicitud: ContextoDatosTipo["guardarBorradorSolicitud"] =
    (datos) => {
      if (
        !usuarioActual ||
        datos.idSolicitante !== usuarioActual.id ||
        usuarioActual.esVerificado !== true ||
        usuarioActual.correoConfirmado === false
      )
        throw new Error(
          "Necesitas una cuenta confirmada y verificada para guardar solicitudes.",
        );
      const error = validarProgramacion(
        datos.fechasSolicitadas,
        listaRecintos,
        {
          borrador: true,
          modalidad: datos.modalidadAsistencia,
          aforo: datos.asistenciaEstimada,
        },
      );
      if (error) throw new Error(error);
      const borrador: SolicitudEvento = {
        ...datos,
        id: `sol-${crypto.randomUUID()}`,
        estado: "borrador",
        fechaCreacion: new Date().toISOString(),
        version: 1,
      };
      const resultado = persistirSolicitudes([
        borrador,
        ...solicitudVigente("").lista,
      ]);
      if (!resultado.exito) throw new Error(resultado.error);
      return borrador;
    };

  const resolverSolicitud = (
    idSolicitud: string,
    decision: "autorizada" | "rechazada",
    motivo?: string,
    versionEsperada?: number,
    extraordinaria = false,
  ) => {
    const { lista, solicitud } = solicitudVigente(idSolicitud);
    if (!usuarioActual?.roles.includes("subdireccion"))
      return {
        exito: false,
        error: "Solo Subdirección puede resolver solicitudes.",
      };
    if (!solicitud || solicitud.estado !== "en_revision")
      return { exito: false, error: "La solicitud ya no está en revisión." };
    if (
      versionEsperada !== undefined &&
      versionSolicitud(solicitud) !== versionEsperada
    ) {
      setListaSolicitudes(lista);
      return {
        exito: false,
        error:
          "La solicitud cambió mientras la revisabas. Consulta la versión actual antes de resolver.",
      };
    }
    if (decision === "rechazada" && !motivo?.trim())
      return { exito: false, error: "Indica el motivo del rechazo." };
    if (decision === "autorizada") {
      if (solicitud.esExcepcional && !extraordinaria)
        return {
          exito: false,
          error:
            "Esta solicitud requiere la creación expresa de un evento por Subdirección.",
        };
      const error = validarProgramacion(
        solicitud.fechasSolicitadas,
        listaRecintos,
        {
          modalidad: solicitud.modalidadAsistencia,
          aforo: solicitud.asistenciaEstimada,
        },
      );
      if (error) return { exito: false, error };
      for (const fecha of solicitud.fechasSolicitadas) {
        const disponibilidad = verificarDisponibilidadRecinto(
          fecha.idRecinto,
          fecha.fecha,
          fecha.horaInicio,
          fecha.horaFin,
        );
        if (!disponibilidad.disponible)
          return {
            exito: false,
            error: disponibilidad.motivo || "El recinto ya está ocupado.",
          };
      }
    }
    const solicitudActualizada = registrarCambioSolicitud(
      solicitud,
      {
        estado: decision,
        motivoRechazo: decision === "rechazada" ? motivo?.trim() : undefined,
        revisadoPor: usuarioActual.nombre,
        fechaRevision: new Date().toISOString(),
      },
      usuarioActual.nombre,
      decision === "autorizada"
        ? extraordinaria
          ? "Creación de evento extraordinario"
          : "Autorización"
        : "Rechazo",
      motivo,
    );
    const resultado = persistirSolicitudes(
      lista.map((item) =>
        item.id === idSolicitud ? solicitudActualizada : item,
      ),
    );
    if (!resultado.exito) return resultado;
    if (decision === "autorizada") {
      const sol = solicitudActualizada;
      const nuevoIdEvento = `evt-${sol.id.replace("sol-", "")}`;
      const yaExiste = listaEventos.some(
        (e) => e.id === nuevoIdEvento || e.idSolicitud === sol.id,
      );
      if (!yaExiste) {
        const fechasConvertidas: Evento["fechas"] = sol.fechasSolicitadas.map(
          (f, indice) => ({
            id: `fec-${nuevoIdEvento}-${indice + 1}`,
            idEvento: nuevoIdEvento,
            fecha: f.fecha,
            horaInicio: f.horaInicio,
            horaFin: f.horaFin,
            idRecinto: f.idRecinto,
            esFinalConfirmado: false,
            ponentes: [],
          }),
        );

        const nuevoEvento: Evento = {
          id: nuevoIdEvento,
          idSolicitud: sol.id,
          idOrganizador: sol.idSolicitante,
          nombreOrganizador: sol.nombreSolicitante,
          titulo: sol.tituloEvento,
          descripcion: sol.descripcionEvento,
          urlImagen: sol.urlImagen,
          categoria: "Académico",
          visibilidad: sol.visibilidad,
          modalidadAsistencia: sol.modalidadAsistencia,
          estado: "configuracion",
          fechas: fechasConvertidas,
          aforoMaximo: sol.asistenciaEstimada,
          ponentes: [],
          etiquetas: ["ESCOM", sol.modalidadAsistencia],
        };

        setListaEventos((previos) => [nuevoEvento, ...previos]);

        // Crear borradores iniciales de arreglo para cada fecha
        fechasConvertidas.forEach((f) => {
          const recinto = listaRecintos.find((item) => item.id === f.idRecinto)!;
          const asientos = recinto.tipo === "auditorio"
            ? generarAsientosAuditorio()
            : recinto.tipo === "laboratorio"
              ? generarEstacionesLaboratorio(recinto.codigo)
              : generarAsientosSala14();

          const total = asientos.filter((a) => !a.estaEliminado).length;
          const nuevoArreglo: ArregloAsientos = {
            id: `arr-${f.id}-borrador`,
            idFechaEvento: f.id,
            idRecinto: f.idRecinto,
            nombre: "Borrador Inicial 1",
            etiquetaVersion: "v1.0-borrador",
            estado: "borrador",
            asientos,
            totalAsientos: total,
            asientosAsistente: asientos.filter(
              (a) => a.categoria === "asistente" && !a.estaEliminado,
            ).length,
            asientosVip: asientos.filter(
              (a) => a.categoria === "vip" && !a.estaEliminado,
            ).length,
            asientosOrganizador: asientos.filter(
              (a) => a.categoria === "organizador" && !a.estaEliminado,
            ).length,
            asientosStaff: asientos.filter(
              (a) => a.categoria === "staff" && !a.estaEliminado,
            ).length,
            asientosBloqueados: asientos.filter(
              (a) => a.estaBloqueado && !a.estaEliminado,
            ).length,
            asientosSinAsignar: 0,
            fechaCreacion: new Date().toISOString(),
          };
          setListaArreglos((previos) => [...previos, nuevoArreglo]);
        });
      }
    }
    return { exito: true };
  };

  const dictaminarSolicitud: ContextoDatosTipo["dictaminarSolicitud"] = (
    id,
    decision,
    motivo,
    _nombre,
    versionEsperada,
  ) => resolverSolicitud(id, decision, motivo, versionEsperada);
  const atenderSolicitudExtraordinaria: ContextoDatosTipo["atenderSolicitudExtraordinaria"] =
    (id, versionEsperada) =>
      resolverSolicitud(
        id,
        "autorizada",
        "Creación expresa por Subdirección tras revisar la urgencia y disponibilidad.",
        versionEsperada,
        true,
      );

  const devolverSolicitud: ContextoDatosTipo["devolverSolicitud"] = (
    id,
    observaciones,
    _nombre,
    versionEsperada,
  ) => {
    const { lista, solicitud } = solicitudVigente(id);
    if (
      !usuarioActual?.roles.includes("subdireccion") ||
      !solicitud ||
      solicitud.estado !== "en_revision"
    )
      return { exito: false, error: "No puedes devolver esta solicitud." };
    if (!observaciones.trim())
      return {
        exito: false,
        error: "Indica qué debe corregir el solicitante.",
      };
    if (
      versionEsperada !== undefined &&
      versionEsperada !== versionSolicitud(solicitud)
    ) {
      setListaSolicitudes(lista);
      return {
        exito: false,
        error: "La versión cambió. Revisa la solicitud actualizada.",
      };
    }
    const nueva = registrarCambioSolicitud(
      solicitud,
      {
        estado: "requiere_correccion",
        observacionesCorreccion: observaciones.trim(),
        fechaLimiteCorreccion: new Date(Date.now() + 86400000).toISOString(),
        revisadoPor: usuarioActual.nombre,
        fechaRevision: new Date().toISOString(),
      },
      usuarioActual.nombre,
      "Devolución para corrección",
      observaciones.trim(),
    );
    return persistirSolicitudes(
      lista.map((item) => (item.id === id ? nueva : item)),
    );
  };

  const actualizarSolicitud: ContextoDatosTipo["actualizarSolicitud"] = (
    id,
    cambios,
    reenviar = false,
    versionEsperada,
  ) => {
    const { lista, solicitud } = solicitudVigente(id);
    if (
      !solicitud ||
      usuarioActual?.id !== solicitud.idSolicitante ||
      !["borrador", "en_revision", "requiere_correccion"].includes(
        solicitud.estado,
      )
    )
      return {
        exito: false,
        error: "Solo el titular puede editar una solicitud pendiente.",
      };
    if (
      versionEsperada !== undefined &&
      versionEsperada !== versionSolicitud(solicitud)
    ) {
      setListaSolicitudes(lista);
      return {
        exito: false,
        error:
          "La solicitud cambió en otra ventana. Abre la versión actual antes de guardar.",
      };
    }
    if (
      solicitud.estado === "requiere_correccion" &&
      solicitud.fechaLimiteCorreccion &&
      Date.now() > Date.parse(solicitud.fechaLimiteCorreccion)
    )
      return {
        exito: false,
        error: "Venció el plazo de corrección de 24 horas.",
      };
    const error = validarProgramacion(
      cambios.fechasSolicitadas || solicitud.fechasSolicitadas,
      listaRecintos,
      {
        borrador: !reenviar && solicitud.estado === "borrador",
        modalidad: cambios.modalidadAsistencia || solicitud.modalidadAsistencia,
        aforo: cambios.asistenciaEstimada ?? solicitud.asistenciaEstimada,
      },
    );
    if (error) return { exito: false, error };
    if (reenviar) {
      const errorAnticipacion = validarAnticipacionSolicitud(
        { ...solicitud, ...cambios },
        solicitud,
      );
      if (errorAnticipacion) return { exito: false, error: errorAnticipacion };
    }
    const nueva = registrarCambioSolicitud(
      solicitud,
      {
        ...cambios,
        ...(reenviar
          ? {
              estado: "en_revision" as const,
              fechaEnvioInicial:
                solicitud.fechaEnvioInicial || (solicitud.estado === "borrador" ? new Date().toISOString() : solicitud.fechaCreacion),
              observacionesCorreccion: undefined,
              fechaLimiteCorreccion: undefined,
            }
          : {}),
      },
      usuarioActual.nombre,
      reenviar ? "Envío a revisión" : "Edición de solicitud",
    );
    return persistirSolicitudes(
      lista.map((item) => (item.id === id ? nueva : item)),
    );
  };

  const cancelarSolicitud: ContextoDatosTipo["cancelarSolicitud"] = (
    id,
    versionEsperada,
  ) => {
    const { lista, solicitud } = solicitudVigente(id);
    if (
      !solicitud ||
      usuarioActual?.id !== solicitud.idSolicitante ||
      !["borrador", "en_revision", "requiere_correccion"].includes(
        solicitud.estado,
      )
    )
      return {
        exito: false,
        error: "Solo el titular puede cancelar una solicitud pendiente.",
      };
    if (
      versionEsperada !== undefined &&
      versionEsperada !== versionSolicitud(solicitud)
    ) {
      setListaSolicitudes(lista);
      return {
        exito: false,
        error: "La solicitud cambió. Consulta la versión vigente.",
      };
    }
    const nueva = registrarCambioSolicitud(
      solicitud,
      { estado: "cancelada" },
      usuarioActual.nombre,
      "Cancelación",
      "Cancelación por el solicitante",
    );
    return persistirSolicitudes(
      lista.map((item) => (item.id === id ? nueva : item)),
    );
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

  // Apartado Temporal de Asiento (2 minutos)
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
      return { exito: false, error: 'El día seleccionado ya no se encuentra disponible.' };
    }
    if (fechaTaquilla.cancelada) return { exito: false, error: 'Este día fue cancelado y ya no admite reservaciones.' };

    if (
      obtenerEstadoInscripciones(fechaTaquilla, eventoTaquilla.estado) === 'cerradas' ||
      obtenerFechaLimiteInscripciones(fechaTaquilla) <= ahora
    ) {
      return {
        exito: false,
        error: 'ERR-MT-02 · Las inscripciones de este día están CERRADAS.'
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

    const ofertaVigenteDeOtraPersona = listaEspera.some((entrada) =>
      entrada.idFechaEvento === idFechaEvento &&
      entrada.idAsientoOferta === idAsiento &&
      entrada.idUsuario !== idUsuario &&
      entrada.estado === 'notificado' &&
      (entrada.fechaExpiracionOferta || 0) > ahora
    );

    if (colision || ofertaVigenteDeOtraPersona) {
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
      tiempoExpiracionApartado: ahora + 2 * 60 * 1000, // 2 minutos
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
        error: 'El tiempo límite de 2 minutos ha expirado. Por favor, selecciona tu asiento nuevamente.'
      };
    }

    const evento = listaEventos.find((e) => e.id === res.idEvento);
    const fecha = evento?.fechas.find((f) => f.id === res.idFechaEvento);
    const recinto = listaRecintos.find((v) => v.id === fecha?.idRecinto);

    if (!evento || !fecha) {
      return { exito: false, error: 'El día asociado con el apartado ya no existe.' };
    }
    if (fecha.cancelada) return { exito: false, error: 'Este día fue cancelado y no se puede confirmar el boleto.' };

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
    const codigoQr = `TT-${generarIdentificadorQr()}`;

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
    setListaEspera((previas) => previas.map((entrada) =>
      entrada.idReservacionOferta === idReservacion && entrada.estado === 'notificado'
        ? { ...entrada, estado: 'convertido' }
        : entrada
    ));
    return { exito: true, boleto: nuevoBoleto };
  };

  const ofrecerLugarAListaDeEspera = (
    reservaLiberada: Reservacion,
    excluirIds: string[] = []
  ) => {
    const evento = listaEventos.find((item) => item.id === reservaLiberada.idEvento);
    const fecha = evento?.fechas.find((item) => item.id === reservaLiberada.idFechaEvento);
    if (!evento || !fecha) return;
    if (
      obtenerEstadoInscripciones(fecha, evento.estado) !== 'abiertas' ||
      obtenerFechaLimiteInscripciones(fecha) <= Date.now()
    ) return;

    const candidatos = listaEspera
      .filter((entrada) => entrada.idFechaEvento === reservaLiberada.idFechaEvento && entrada.estado === 'esperando' && !excluirIds.includes(entrada.id))
      .sort((a, b) => a.posicionFila - b.posicionFila);
    const siguiente = candidatos.find((entrada) => {
      const yaReservo = listaReservaciones.some((reserva) => {
        const reservaActiva = reserva.estado === 'confirmada' ||
          (reserva.estado === 'apartado_temporal' && (reserva.tiempoExpiracionApartado || 0) > Date.now());
        return reserva.idUsuario === entrada.idUsuario && reserva.idFechaEvento === entrada.idFechaEvento && reservaActiva;
      });
      const yaTieneBoleto = listaBoletos.some((boleto) =>
        boleto.idUsuario === entrada.idUsuario && boleto.idFechaEvento === entrada.idFechaEvento && boleto.estado === 'valido'
      );
      const seEmpalma = listaReservaciones.some((reserva) => {
        if (reserva.idUsuario !== entrada.idUsuario || reserva.estado !== 'confirmada' || reserva.idFechaEvento === fecha.id) return false;
        const eventoExistente = listaEventos.find((item) => item.id === reserva.idEvento);
        const fechaExistente = eventoExistente?.fechas.find((item) => item.id === reserva.idFechaEvento);
        if (!fechaExistente || fechaExistente.fecha !== fecha.fecha) return false;
        const inicio = (valor: string) => {
          const [hora, minuto] = valor.split(':').map(Number);
          return hora * 60 + minuto;
        };
        return inicio(fecha.horaInicio) < inicio(fechaExistente.horaFin) && inicio(fecha.horaFin) > inicio(fechaExistente.horaInicio);
      });
      const cumplePublico = !evento.publicoPermitido?.length ||
        Boolean(entrada.rolesUsuario?.some((rol) => evento.publicoPermitido?.includes(rol)));
      return entrada.correoConfirmado === true && cumplePublico && !yaReservo && !yaTieneBoleto && !seEmpalma;
    });

    if (!siguiente) return;
    const ahora = Date.now();
    const idReservacionOferta = `res-oferta-${ahora.toString(36)}`;
    const fechaExpiracionOferta = ahora + 10 * 60 * 1000;
    const reservacionOferta: Reservacion = {
      id: idReservacionOferta,
      idEvento: reservaLiberada.idEvento,
      idFechaEvento: reservaLiberada.idFechaEvento,
      idUsuario: siguiente.idUsuario,
      nombreUsuario: siguiente.nombreUsuario,
      correoUsuario: siguiente.correoUsuario,
      idAsiento: reservaLiberada.idAsiento || `gen-oferta-${ahora.toString(36)}`,
      etiquetaAsiento: reservaLiberada.etiquetaAsiento || 'Cupo General',
      estado: 'apartado_temporal',
      tiempoExpiracionApartado: fechaExpiracionOferta,
      fechaCreacion: new Date(ahora).toISOString()
    };
    setListaReservaciones((previas) => [...previas, reservacionOferta]);
    setListaEspera((previas) => previas.map((entrada) => entrada.id === siguiente.id
      ? {
          ...entrada,
          estado: 'notificado',
          fechaOferta: new Date(ahora).toISOString(),
          fechaExpiracionOferta,
          idReservacionOferta,
          idAsientoOferta: reservacionOferta.idAsiento,
          etiquetaAsientoOferta: reservacionOferta.etiquetaAsiento
        }
      : entrada
    ));
  };

  const cancelarReservacion = (idReservacion: string, idUsuario: string, motivo: string) => {
    const res = listaReservaciones.find((r) => r.id === idReservacion);
    if (!res || res.idUsuario !== idUsuario) return { exito: false, error: 'ERR-MT-06 · La reservación no existe o no pertenece a tu cuenta.' };
    if (res.estado !== 'confirmada') return { exito: false, error: 'La reservación ya no está activa.' };
    if (!motivo.trim()) return { exito: false, error: 'Escribe el motivo de la cancelación.' };
    const boleto = listaBoletos.find((elemento) => elemento.id === res.idBoleto);
    if (boleto?.estado === 'utilizado') return { exito: false, error: 'ERR-MT-09 · No se puede cancelar un boleto que ya fue utilizado.' };
    const evento = listaEventos.find((elemento) => elemento.id === res.idEvento);
    const fecha = evento?.fechas.find((elemento) => elemento.id === res.idFechaEvento);
    if (!evento || !fecha) return { exito: false, error: 'No se encontró el día del evento para validar la cancelación.' };
    const inicio = new Date(`${fecha.fecha}T${fecha.horaInicio}:00`).getTime();
    if (!Number.isFinite(inicio) || Date.now() >= inicio) return { exito: false, error: 'No se puede cancelar una reservación cuando el día ya comenzó o terminó.' };
    if (inicio - Date.now() < 24 * 60 * 60 * 1000) return { exito: false, error: 'ERR-MT-08 · Ya no puedes cancelar esta reservación porque faltan menos de 24 horas para el inicio del día.' };

    setListaReservaciones((previas) =>
      previas.map((r) => (r.id === idReservacion
        ? { ...r, estado: 'cancelada', motivoCancelacion: motivo.trim() }
        : r))
    );

    if (res.idBoleto) {
      setListaBoletos((previos) =>
        previos.map((b) => (b.id === res.idBoleto
          ? { ...b, estado: 'cancelado', motivoInvalidacion: motivo.trim(), fechaInvalidacion: new Date().toISOString() }
          : b))
      );
    }

    // La oferta queda protegida para el primer usuario elegible durante diez minutos.
    ofrecerLugarAListaDeEspera(res);
    return { exito: true };
  };

  const cancelarReservacionPorEvento: ContextoDatosTipo['cancelarReservacionPorEvento'] = (
    idReservacion,
    idActor,
    rolActivo,
    motivo
  ) => {
    const reserva = listaReservaciones.find((elemento) => elemento.id === idReservacion);
    const evento = reserva && listaEventos.find((elemento) => elemento.id === reserva.idEvento);
    const autorizado = Boolean(evento && (
      evento.idOrganizador === idActor || rolActivo === 'subdireccion' || rolActivo === 'admin'
    ));
    if (!reserva || !evento || !autorizado) {
      return { exito: false, error: 'No tienes autorización para cancelar esta reservación.' };
    }
    if (reserva.estado === 'cancelada') return { exito: true };

    const motivoFinal = motivo.trim() || 'Cancelación del evento o día por personal autorizado.';
    setListaReservaciones((previas) => previas.map((elemento) => elemento.id === idReservacion
      ? { ...elemento, estado: 'cancelada', motivoCancelacion: motivoFinal }
      : elemento
    ));
    if (reserva.idBoleto) {
      setListaBoletos((previos) => previos.map((boleto) => boleto.id === reserva.idBoleto && boleto.estado !== 'utilizado'
        ? { ...boleto, estado: 'cancelado', motivoInvalidacion: motivoFinal, fechaInvalidacion: new Date().toISOString() }
        : boleto
      ));
    }
    return { exito: true };
  };

  const emitirBoletosEspeciales = (datos: {
    idEvento: string;
    idFechaEvento: string;
    tipo: TipoBoletoEspecial;
    cantidad: number;
    nombreBase: string;
    correoDestino: string;
    emitidoPor: string;
    idOrganizador: string;
  }): { exito: boolean; boletos?: BoletoDigital[]; error?: string } => {
    const evento = listaEventos.find((e) => e.id === datos.idEvento);
    const fecha = evento?.fechas.find((f) => f.id === datos.idFechaEvento);
    const recinto = listaRecintos.find((r) => r.id === fecha?.idRecinto);

    if (!evento || !fecha) {
      return { exito: false, error: 'El evento o el día seleccionado no existe.' };
    }

    if (!datos.idOrganizador || evento.idOrganizador !== datos.idOrganizador) {
      return { exito: false, error: 'Solo el organizador responsable puede emitir boletos especiales.' };
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
        error: 'ERR-MT-02 · Las inscripciones están cerradas para este día.'
      };
    }

    const bloqueo = listaBloqueos.find((elemento) => bloqueoAfectaSesion(elemento, fecha));
    if (bloqueo) {
      return {
        exito: false,
        error: `ERR-TR-10 · SUSPENDIDO: ${bloqueo.titulo}.`
      };
    }

    const inicioDia = new Date(`${fecha.fecha}T${fecha.horaInicio}:00`).getTime();
    if (inicioDia - Date.now() < 60 * 60 * 1000) {
      return { exito: false, error: 'La emisión debe realizarse al menos una hora antes del inicio del día.' };
    }

    if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 20) {
      return { exito: false, error: 'La cantidad debe estar entre 1 y 20 boletos.' };
    }

    if (!datos.nombreBase.trim() || !datos.correoDestino.trim()) {
      return { exito: false, error: 'Indica el nombre de referencia y el correo de destino.' };
    }

    const aforoDia = evento.aforoMaximo || recinto?.capacidad || 0;
    const confirmadas = listaReservaciones.filter((reserva) => reserva.idFechaEvento === fecha.id && reserva.estado === 'confirmada').length;
    const especialesActivos = listaBoletos.filter((boleto) => boleto.idFechaEvento === fecha.id && boleto.esEspecial && boleto.estado !== 'cancelado').length;
    if (!aforoDia || confirmadas + especialesActivos + datos.cantidad > aforoDia) {
      return { exito: false, error: 'La cantidad solicitada supera los lugares disponibles para este día.' };
    }

    const ahora = Date.now();
    const prefijo = datos.tipo.toUpperCase();
    const boletosNuevos: BoletoDigital[] = Array.from({ length: datos.cantidad }, (_, indice) => {
      const consecutivo = indice + 1;
      const sufijo = generarIdentificadorQr();
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
        codigoQr: `TT-${sufijo}`,
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
  }): { exito: boolean; diasActualizados?: number; error?: string } => {
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
      return { exito: false, error: 'Selecciona al menos un día para continuar.' };
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
    const diasSeleccionados = idsUnicas.map((idFecha) =>
      evento.fechas.find((fecha) => fecha.id === idFecha)
    );

    if (diasSeleccionados.some((fecha) => !fecha)) {
      return { exito: false, error: 'ERR-TR-03 · Uno de los días ya no existe.' };
    }

    for (const fecha of diasSeleccionados) {
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
            error: `ERR-TR-10 · El día ${fecha.nombreDia || fecha.fecha} ya FINALIZÓ.`
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

    return { exito: true, diasActualizados: idsUnicas.length };
  };

  const registrarIntencionAsistencia = (
    idEvento: string,
    idFechaEvento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string
  ): { exito: boolean; registro?: RegistroIntencionAsistencia; error?: string } => {
    const yaExiste = listaIntencionesAsistencia.some(
      (registro) =>
        registro.idEvento === idEvento &&
        registro.idFechaEvento === idFechaEvento &&
        registro.idUsuario === idUsuario
    );

    if (yaExiste) {
      return {
        exito: false,
        error: 'Ya tienes una intención de asistencia registrada para este día.'
      };
    }

    const registro: RegistroIntencionAsistencia = {
      id: `int-${Date.now().toString(36)}`,
      idEvento,
      idFechaEvento,
      idUsuario,
      nombreUsuario,
      correoUsuario,
      fechaRegistro: new Date().toISOString()
    };

    setListaIntencionesAsistencia((previas) => [registro, ...previas]);
    return { exito: true, registro };
  };

  const cancelarIntencionAsistencia = (idRegistro: string) => {
    setListaIntencionesAsistencia((previas) => previas.filter((registro) => registro.id !== idRegistro));
  };

  const unirseAListaDeEspera = (
    idEvento: string,
    idFechaEvento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string,
    rolesUsuario?: Usuario['roles'],
    correoConfirmado?: boolean
  ): { exito: boolean; entrada?: EntradaListaEspera; error?: string } => {
    const evento = listaEventos.find((elemento) => elemento.id === idEvento);
    const fecha = evento?.fechas.find((elemento) => elemento.id === idFechaEvento);

    if (!evento || !fecha) {
      return { exito: false, error: 'El día seleccionado ya no existe.' };
    }

    if (correoConfirmado !== true) {
      return { exito: false, error: 'ERR-IP-04 · Confirma tu correo electrónico antes de ingresar a la lista.' };
    }
    if (evento.publicoPermitido?.length && !rolesUsuario?.some((rol) => evento.publicoPermitido?.includes(rol))) {
      return { exito: false, error: 'ERR-MT-01 · Tu cuenta no pertenece al público autorizado para este día.' };
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

    const arregloFinal = listaArreglos.find((arreglo) => arreglo.idFechaEvento === idFechaEvento && arreglo.estado === 'version_final');
    const reservacionesActivas = listaReservaciones.filter((reserva) =>
      reserva.idFechaEvento === idFechaEvento &&
      (reserva.estado === 'confirmada' || (reserva.estado === 'apartado_temporal' && (reserva.tiempoExpiracionApartado || 0) > Date.now()))
    );
    const boletosEspecialesActivos = listaBoletos.filter((boleto) =>
      boleto.idFechaEvento === idFechaEvento && boleto.esEspecial && boleto.estado === 'valido'
    ).length;
    const aforo = evento.aforoMaximo || listaRecintos.find((recinto) => recinto.id === fecha.idRecinto)?.capacidad || 0;
    const lugaresAgotados = arregloFinal
      ? !arregloFinal.asientos.some((asiento) =>
          !asiento.estaBloqueado && !asiento.estaEliminado && asiento.categoria !== 'organizador' && asiento.categoria !== 'staff' &&
          !reservacionesActivas.some((reserva) => reserva.idAsiento === asiento.id)
        )
      : aforo > 0 && reservacionesActivas.length + boletosEspecialesActivos >= aforo;
    if (!lugaresAgotados) {
      return { exito: false, error: 'ERR-MT-03 · Todavía hay lugares disponibles; puedes reservar uno directamente.' };
    }

    const actuales = listaEspera.filter((w) => w.idFechaEvento === idFechaEvento);
    const yaTieneReservacion = listaReservaciones.some(
      (reserva) => reserva.idUsuario === idUsuario && reserva.idFechaEvento === idFechaEvento &&
        (reserva.estado === 'confirmada' || (reserva.estado === 'apartado_temporal' && (reserva.tiempoExpiracionApartado || 0) > Date.now()))
    );
    const yaTieneBoleto = listaBoletos.some(
      (boleto) => boleto.idUsuario === idUsuario && boleto.idFechaEvento === idFechaEvento && boleto.estado === 'valido'
    );
    const participacionActiva = actuales.find(
      (w) => w.idUsuario === idUsuario && (w.estado === 'esperando' || w.estado === 'notificado')
    );

    if (yaTieneReservacion || yaTieneBoleto || participacionActiva) {
      return {
        exito: false,
        error: 'ERR-MT-10 · Ya tienes una reservación, una oferta o una participación activa en la lista de este día.'
      };
    }

    const entrada: EntradaListaEspera = {
      id: `esp-${Date.now().toString(36)}`,
      idEvento,
      idFechaEvento,
      idUsuario,
      nombreUsuario,
      correoUsuario,
      posicionFila: actuales.length + 1,
      fechaCreacion: new Date().toISOString(),
      rolesUsuario,
      correoConfirmado,
      estado: 'esperando'
    };
    setListaEspera((previas) => [...previas, entrada]);
    return { exito: true, entrada };
  };

  const retirarseDeListaDeEspera = (idEntrada: string, idUsuario: string) => {
    const entrada = listaEspera.find((elemento) => elemento.id === idEntrada && elemento.idUsuario === idUsuario);
    if (!entrada || entrada.estado !== 'esperando') {
      return { exito: false, error: 'ERR-TR-03 · La participación ya no está activa.' };
    }

    setListaEspera((previas) => previas.map((elemento) =>
      elemento.id === idEntrada ? { ...elemento, estado: 'retirada' } : elemento
    ));
    return { exito: true };
  };

  const responderOfertaListaDeEspera = (
    idEntrada: string,
    idUsuario: string,
    decision: 'aceptar' | 'rechazar' | 'vencer'
  ) => {
    const entrada = listaEspera.find((elemento) => elemento.id === idEntrada && elemento.idUsuario === idUsuario);
    if (!entrada || entrada.estado !== 'notificado' || !entrada.idReservacionOferta) {
      return { exito: false, error: 'La oferta ya no está activa.' };
    }
    const reservaOferta = listaReservaciones.find((reserva) => reserva.id === entrada.idReservacionOferta);
    if (!reservaOferta || reservaOferta.estado !== 'apartado_temporal') {
      return { exito: false, error: 'El lugar ofrecido ya no está disponible.' };
    }

    const expirada = (entrada.fechaExpiracionOferta || 0) <= Date.now();
    if (decision === 'aceptar') {
      if (expirada) {
        return responderOfertaListaDeEspera(idEntrada, idUsuario, 'vencer');
      }
      const evento = listaEventos.find((item) => item.id === entrada.idEvento);
      const fecha = evento?.fechas.find((item) => item.id === entrada.idFechaEvento);
      if (!evento || !fecha || obtenerEstadoInscripciones(fecha, evento.estado) !== 'abiertas' || obtenerFechaLimiteInscripciones(fecha) <= Date.now()) {
        return { exito: false, error: 'ERR-MT-02 · Las inscripciones de este día ya están cerradas.' };
      }
      const yaReservo = listaReservaciones.some((reserva) =>
        reserva.id !== reservaOferta.id && reserva.idUsuario === idUsuario && reserva.idFechaEvento === entrada.idFechaEvento &&
        (reserva.estado === 'confirmada' || (reserva.estado === 'apartado_temporal' && (reserva.tiempoExpiracionApartado || 0) > Date.now()))
      );
      const empalme = listaReservaciones.some((reserva) => {
        if (reserva.id === reservaOferta.id || reserva.idUsuario !== idUsuario || reserva.estado !== 'confirmada' || reserva.idFechaEvento === fecha.id) return false;
        const eventoExistente = listaEventos.find((item) => item.id === reserva.idEvento);
        const fechaExistente = eventoExistente?.fechas.find((item) => item.id === reserva.idFechaEvento);
        if (!fechaExistente || fechaExistente.fecha !== fecha.fecha) return false;
        const minutos = (hora: string) => {
          const [h, m] = hora.split(':').map(Number);
          return h * 60 + m;
        };
        return minutos(fecha.horaInicio) < minutos(fechaExistente.horaFin) && minutos(fecha.horaFin) > minutos(fechaExistente.horaInicio);
      });
      if (yaReservo || empalme) {
        return { exito: false, error: yaReservo ? 'ERR-MT-10 · Ya existe una reservación activa para este día.' : 'ERR-MT-07 · La reservación se empalma con otra actividad.' };
      }
      const resultado = confirmarReservacion(reservaOferta.id);
      return resultado.exito ? { exito: true } : { exito: false, error: resultado.error };
    }

    const estadoFinal = decision === 'vencer' || expirada ? 'vencida' : 'rechazada';
    liberarApartadoAsiento(reservaOferta.id);
    setListaEspera((previas) => previas.map((item) => item.id === idEntrada ? { ...item, estado: estadoFinal } : item));
    ofrecerLugarAListaDeEspera(reservaOferta, [idEntrada]);
    return { exito: true };
  };

  // Procesamiento de Check-In en Puerta para Staff
  const procesarCheckIn = (
    codigoQr: string,
    escaneadoPor: string,
    idFechaEventoObjetivo?: string,
    operador?: Usuario,
    idEventoObjetivo?: string
  ): {
    exito: boolean;
    resultado: RegistroEscaneo['resultado'];
    boleto?: BoletoDigital;
    mensaje: string;
  } => {
    const codigoNormalizado = codigoQr.trim().toUpperCase();
    const fechaHora = new Date().toISOString();
    const registrarIntento = (datos: Omit<RegistroEscaneo, 'id' | 'fechaEscaneo' | 'escaneadoPor'>) => {
      setBitacoraEscaneos((previas) => [{
        ...datos,
        id: `esc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        fechaEscaneo: fechaHora,
        escaneadoPor
      }, ...previas]);
    };
    const rechazar = (
      resultado: RegistroEscaneo['resultado'],
      mensaje: string,
      boleto?: BoletoDigital,
      registrar = true
    ) => {
      if (registrar) registrarIntento({
        idBoleto: boleto?.id || 'desconocido',
        idEvento: idEventoObjetivo || boleto?.idEvento || 'desconocido',
        idFechaEvento: idFechaEventoObjetivo || boleto?.idFechaEvento || 'desconocido',
        resultado,
        nombreAsistente: boleto?.nombreUsuario,
        etiquetaAsiento: boleto?.etiquetaAsiento,
        notas: mensaje
      });
      return { exito: false, resultado, mensaje, boleto };
    };

    // La autorización se comprueba contra el evento seleccionado, nunca contra
    // el evento que pudiera revelar el código recibido.
    const eventoObjetivo = listaEventos.find((evento) => evento.id === idEventoObjetivo);
    const puedeOperar = Boolean(
      operador?.estaActivo && eventoObjetivo && (
        (operador.roles.includes('organizador') && eventoObjetivo.idOrganizador === operador.id) ||
        (operador.roles.includes('staff') && operador.eventosAsignadosStaff?.includes(eventoObjetivo.id))
      )
    );
    if (!puedeOperar) {
      return rechazar('no_autorizado', 'No tienes autorización vigente para registrar accesos en este evento.', undefined, false);
    }

    const fechaObjetivo = eventoObjetivo?.fechas.find((fecha) => fecha.id === idFechaEventoObjetivo);
    if (!eventoObjetivo || !fechaObjetivo) {
      return rechazar('evento_invalido', 'El evento o el día seleccionado ya no está disponible.');
    }
    const bloqueo = listaBloqueos.find((elemento) => bloqueoAfectaSesion(elemento, fechaObjetivo));
    if (eventoObjetivo.estado === 'cancelado' || bloqueo) {
      return rechazar('suspendido', bloqueo ? `Día suspendido: ${bloqueo.titulo}.` : 'El evento está cancelado.');
    }
    if (eventoObjetivo.modalidadAsistencia !== 'controlado') {
      return rechazar('evento_invalido', 'Este evento no utiliza control de acceso mediante boleto.');
    }
    const inicio = new Date(`${fechaObjetivo.fecha}T${fechaObjetivo.horaInicio}:00`).getTime() - 30 * 60 * 1000;
    const fin = new Date(`${fechaObjetivo.fecha}T${fechaObjetivo.horaFin}:00`).getTime();
    if (Date.now() < inicio || Date.now() >= fin) {
      return rechazar('fuera_de_horario', 'El acceso se habilita 30 minutos antes del inicio y cierra al terminar la actividad.');
    }

    // Los identificadores emitidos por Ticket Trade son opacos de 128 bits.
    // No se guardan en bitácora los códigos capturados que no correspondan.
    if (!/^TT-[A-F0-9]{32}$/.test(codigoNormalizado)) {
      return rechazar('codigo_no_reconocido', 'El código no tiene el formato de un boleto Ticket Trade.');
    }
    const boleto = listaBoletos.find((item) => item.codigoQr.toUpperCase() === codigoNormalizado);
    if (!boleto) {
      return rechazar('inexistente', 'Boleto inexistente. El código no corresponde a un boleto emitido.');
    }
    if (boleto.idEvento !== eventoObjetivo.id || boleto.idFechaEvento !== fechaObjetivo.id) {
      return rechazar('fecha_invalida', 'Boleto de otro evento o día. No se muestran datos del boleto presentado.', undefined);
    }
    if (boleto.estado === 'cancelado') {
      return rechazar('cancelado', 'Boleto invalidado. No se puede registrar la entrada.', boleto);
    }
    if (boleto.estado === 'utilizado') {
      const horaAnterior = boleto.fechaCheckIn ? new Date(boleto.fechaCheckIn).toLocaleString('es-MX') : 'hora no disponible';
      return rechazar('ya_utilizado', `Boleto ya utilizado el ${horaAnterior} por ${boleto.revisadoPor || 'Staff'}.`, boleto);
    }

    if (!boleto.esEspecial) {
      const reservacion = listaReservaciones.find((item) => item.id === boleto.idReservacion);
      if (!reservacion || reservacion.estado !== 'confirmada') {
        return rechazar('reservacion_no_vigente', 'La reservación de este boleto ya no está vigente.', boleto);
      }
    }

    // En esta versión local se actualizan boleto y bitácora en el mismo ciclo
    // del contexto. La atomicidad entre dispositivos requiere persistencia de servidor.
    const boletoActualizado = { ...boleto, estado: 'utilizado' as const, fechaCheckIn: fechaHora, revisadoPor: escaneadoPor };
    setListaBoletos((previos) => previos.map((item) => item.id === boleto.id ? boletoActualizado : item));
    registrarIntento({
      idBoleto: boleto.id,
      idEvento: boleto.idEvento,
      idFechaEvento: boleto.idFechaEvento,
      resultado: 'exito',
      nombreAsistente: boleto.nombreUsuario,
      etiquetaAsiento: boleto.etiquetaAsiento
    });
    return {
      exito: true,
      resultado: 'exito',
      boleto: boletoActualizado,
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

  const guardarRecinto = (recinto: Recinto) => {
    setListaRecintos((previos) => previos.some((r) => r.id === recinto.id)
      ? previos.map((r) => r.id === recinto.id ? recinto : r)
      : [...previos, recinto]);
  };

  const crearOcupacionInterna = (datos: Omit<OcupacionInterna, 'id' | 'fechaCreacion' | 'estado'>) => {
    const nueva: OcupacionInterna = {
      ...datos, id: `ocu-${Date.now().toString(36)}`, estado: 'activa', fechaCreacion: new Date().toISOString()
    };
    setListaOcupacionesInternas((previas) => [nueva, ...previas]);
    return nueva;
  };

  const cancelarOcupacionInterna = (id: string) => {
    setListaOcupacionesInternas((previas) => previas.map((o) => o.id === id ? { ...o, estado: 'cancelada' } : o));
  };

  const reiniciarDatosIniciales = () => {
    localStorage.clear();
    setListaEventos(EVENTOS_INICIALES);
    setListaSolicitudes(SOLICITUDES_INICIALES);
    setListaRecintos(RECINTOS_INICIALES.map((r) => ({ ...r, activo: true })));
    setListaOcupacionesInternas([]);
    setListaArreglos(ARREGLOS_INICIALES);
    setListaBloqueos(BLOQUEOS_INICIALES);
    setListaReservaciones(RESERVACIONES_INICIALES);
    setListaBoletos(BOLETOS_INICIALES);
    setListaEspera([]);
    setListaIntencionesAsistencia([]);
    setBitacoraEscaneos(BITACORA_INICIAL_ESCANEOS);
  };

  return (
    <ContextoDatos.Provider
      value={{
        listaEventos,
        listaSolicitudes,
        listaRecintos,
        listaOcupacionesInternas,
        listaArreglos,
        listaBloqueos,
        listaReservaciones,
        listaBoletos,
        listaEspera,
        listaIntencionesAsistencia,
        bitacoraEscaneos,
        listaClasesRegulares,
        verificarDisponibilidadRecinto,
        obtenerOcupacionesRecinto,
        obtenerAgendaMultiRecinto,
        obtenerListaDeVerificacion,
        crearSolicitud,
        guardarBorradorSolicitud,
        dictaminarSolicitud,
        atenderSolicitudExtraordinaria,
        devolverSolicitud,
        actualizarSolicitud,
        cancelarSolicitud,
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
        cancelarReservacionPorEvento,
        registrarIntencionAsistencia,
        cancelarIntencionAsistencia,
        emitirBoletosEspeciales,
        invalidarBoletoEspecial,
        cambiarEstadoInscripciones,
        unirseAListaDeEspera,
        retirarseDeListaDeEspera,
        responderOfertaListaDeEspera,
        procesarCheckIn,
        crearBloqueoRecinto,
        eliminarBloqueoRecinto,
        guardarRecinto,
        crearOcupacionInterna,
        cancelarOcupacionInterna,
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
