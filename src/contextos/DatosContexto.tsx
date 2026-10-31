import { reservaIncompatible } from '../dominio/crucesReservas';
import { proyectarCambioRecinto, firmaCambioRecinto, type PeticionCambioRecinto, type PropuestaCambioRecinto, type EstadoCambioRecinto } from "../dominio/cambioRecinto";
import { useListaLocal } from "./useListaLocal";
import { accesoDelPase, codigoQrDelEvento } from "../dominio/pasesEvento";
import { modalidadActividad, aforoActividad, validarItinerarios } from '../dominio/actividades';
import { REGLA_INGRESO_ACTIVIDAD } from '../dominio/presentacionActividad';
import { capacidadActividad, indicadoresActividad, limiteInscripcionesActividad, estadoInscripcionesActividad, proyectarCambioInscripciones, proyectarCierreAutomatico, puedeAdministrarTaquilla, type CambioInscripciones } from '../dominio/taquilla';
import { impedimentoActividad, impedimentoParticipante } from '../dominio/participacionActividad';
import { ARREGLOS_DEMOSTRACION, incorporarProgramados, cargarEventosProgramados } from '../datos/eventosDemostracion';
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
import { inicioEnMexico, registrarCambioSolicitud, validarAnticipacionSolicitud, validarProgramacion, versionSolicitud } from '../dominio/solicitudes';
import { generarIdentificadorQr } from '../utilidades/identificadores';
import { convertirDiasSolicitud } from '../dominio/programa';
import { guardarLoteLocal } from '../dominio/almacenamiento';
import { restriccionIdentidadVigente, verificacionIdentidadVigente } from '../dominio/identidad';

import { modoDemostracionActivo } from '../dominio/demostracion';
import { escenarioSuspension } from '../dominio/escenarioSuspension';
import { duracionProgramada, validarLimitesEvento, puedeModificarEvento } from '../dominio/cambiosEvento';
import { afectaBloqueo, revisarBloqueo, type PropuestaBloqueo } from '../dominio/bloqueos';
import { CLAVE_CALENDARIO, validarCalendario, vencimientoRevision, motivoVencimiento, pausarRevision, reanudarRevision, type CalendarioRevision } from '../dominio/calendarioRevision';
import { validarDistribuciones, arregloDesdeSolicitud, lugaresDelRecinto } from '../dominio/distribucionSolicitud';
interface ContextoDatosTipo {
  prepararEventoDemostracion: () => {exito:boolean;error?:string;evento?:Evento};
  prepararSolicitudDemostracion: (estado:'borrador'|'en_revision'|'requiere_correccion', extraordinaria?:boolean) => {exito:boolean;error?:string;id?:string};
  prepararSuspensionDemostracion: () => {exito:boolean;error?:string;id?:string};
  calendarioRevision: CalendarioRevision | null;
  guardarCalendarioRevision: (datos: CalendarioRevision) => {exito:boolean;error?:string};
  listaEventos: Evento[];
  listaSolicitudes: SolicitudEvento[];
  listaRecintos: Recinto[];
  listaOcupacionesInternas: OcupacionInterna[];
  listaArreglos: ArregloAsientos[];
  listaBloqueos: BloqueoRecinto[];
  revisarBloqueoInstitucional: (datos: PropuestaBloqueo, id?:string) => {afectados?: ReturnType<typeof revisarBloqueo>['afectados']; firma?:string; error?:string};
  guardarBloqueoInstitucional: (datos:PropuestaBloqueo,id?:string,version?:number,firma?:string) => {exito:boolean;error?:string;id?:string;version?:number};
  cancelarBloqueoInstitucional: (id:string,motivo:string,version?:number) => {exito:boolean;error?:string};
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
    idFechaEventoExcluir?: string,
    consultarAgendaGuardada?: boolean
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
        | "categoria"
        | "itinerarios"
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
  cancelarUnidadEvento: (idEvento:string,idFecha:string|undefined,motivo:string,retirar:boolean,versionEsperada:string) => {exito:boolean;error?:string};
  revisarCambioRecinto: (peticion: Omit<PeticionCambioRecinto, 'idArreglo'>) => {exito:boolean; error?:string; propuesta?:PropuestaCambioRecinto};
  confirmarCambioRecinto: (propuesta: PropuestaCambioRecinto, aceptarReduccion:boolean) => {exito:boolean; error?:string};
  actualizarEvento: (idEvento: string, parcial: Partial<Evento>, versionEsperada?: string) => { exito: boolean; error?: string };
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
  cancelarIntencionAsistencia: (idRegistro: string) => { exito: boolean; error?: string };

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
  }) => { exito: boolean; actividadesActualizadas?: number; error?: string };

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

  guardarRecinto: (recinto: Recinto) => void;
  crearOcupacionInterna: (ocupacion: Omit<OcupacionInterna, 'id' | 'fechaCreacion' | 'estado'>) => OcupacionInterna;
  cancelarOcupacionInterna: (id: string) => void;

  reiniciarDatosIniciales: () => void;
}

const ContextoDatos = createContext<ContextoDatosTipo | undefined>(undefined);
const CLAVE_ALMACEN_DATOS = 'tt_datos_almacen_escom_v7';
function leerListaActual<T>(sufijo:string,anterior:T[]):T[]{
  const guardado=localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_${sufijo}`);
  const lista=guardado===null?anterior:JSON.parse(guardado);
  if(!Array.isArray(lista))throw new Error('El almacenamiento no contiene una lista válida.');
  return lista;
}


const obtenerFechaLimiteInscripciones = limiteInscripcionesActividad;

const obtenerEstadoInscripciones = estadoInscripcionesActividad;

const bloqueoAfectaSesion = afectaBloqueo;

export const ProveedorDatos: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuarioActual, refrescarUsuarios, todosLosUsuarios } = useAutenticacion();
  const [calendarioRevision, setCalendarioRevision] = useState<CalendarioRevision | null>(() => { try {return JSON.parse(localStorage.getItem(CLAVE_CALENDARIO) || 'null');} catch {return null;} });
  const guardarCalendarioRevision = (datos: CalendarioRevision) => {
    if (!usuarioActual?.roles.includes('admin')) return {exito:false,error:'Solo Administración configura el calendario hábil.'};
    const error = validarCalendario(datos); if(error) return {exito:false,error};
    const nuevo = {...datos, diasLaborables:[...new Set(datos.diasLaborables)], diasInhabiles:[...new Set(datos.diasInhabiles)], responsable:usuarioActual.nombre,fechaConfiguracion:new Date().toISOString()};
    const solicitudes=listaSolicitudes.map(s=>s.estado==='en_revision'&&!s.fechaVencimientoRevision?{...s,fechaVencimientoRevision:vencimientoRevision(s.fechaEnvioInicial||s.fechaCreacion,nuevo)}:s);
    const resultado=guardarLoteLocal(localStorage,{[CLAVE_CALENDARIO]:nuevo,[`${CLAVE_ALMACEN_DATOS}_solicitudes`]:solicitudes});
    if(resultado.exito){setCalendarioRevision(nuevo);setListaSolicitudes(solicitudes);} return resultado;
  };
  const [listaEventos, setListaEventos] = useListaLocal<Evento>(`${CLAVE_ALMACEN_DATOS}_eventos`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_eventos`);
    return cargarEventosProgramados(g ? JSON.parse(g) : EVENTOS_INICIALES);
  });

  const [listaSolicitudes, setListaSolicitudes] = useListaLocal<SolicitudEvento>(`${CLAVE_ALMACEN_DATOS}_solicitudes`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_solicitudes`);
    return g ? JSON.parse(g) : SOLICITUDES_INICIALES;
  });

  const [listaRecintos, setListaRecintos] = useListaLocal<Recinto>(`${CLAVE_ALMACEN_DATOS}_recintos`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_recintos`);
    return g ? JSON.parse(g) : RECINTOS_INICIALES.map((r) => ({ ...r, activo: true }));
  });

  const [listaOcupacionesInternas, setListaOcupacionesInternas] = useListaLocal<OcupacionInterna>(`${CLAVE_ALMACEN_DATOS}_ocupaciones_internas`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_ocupaciones_internas`);
    return g ? JSON.parse(g) : [];
  });

  const [listaArreglos, setListaArreglos] = useListaLocal<ArregloAsientos>(`${CLAVE_ALMACEN_DATOS}_arreglos`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_arreglos`);
    return incorporarProgramados<ArregloAsientos>(g ? JSON.parse(g) : ARREGLOS_INICIALES, ARREGLOS_DEMOSTRACION);
  });

  const [listaBloqueos, setListaBloqueos] = useListaLocal<BloqueoRecinto>(`${CLAVE_ALMACEN_DATOS}_bloqueos`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_bloqueos`);
    return g ? JSON.parse(g) : BLOQUEOS_INICIALES;
  });

  const [listaReservaciones, setListaReservaciones] = useListaLocal<Reservacion>(`${CLAVE_ALMACEN_DATOS}_reservaciones`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_reservaciones`);
    return g ? JSON.parse(g) : RESERVACIONES_INICIALES;
  });

  const [listaBoletos, setListaBoletos] = useListaLocal<BoletoDigital>(`${CLAVE_ALMACEN_DATOS}_boletos`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_boletos`);
    return g ? JSON.parse(g) : BOLETOS_INICIALES;
  });

  const [listaEspera, setListaEspera] = useListaLocal<EntradaListaEspera>(`${CLAVE_ALMACEN_DATOS}_espera`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_espera`);
    return g ? JSON.parse(g) : [];
  });

  const [listaIntencionesAsistencia, setListaIntencionesAsistencia] = useListaLocal<RegistroIntencionAsistencia>(`${CLAVE_ALMACEN_DATOS}_intenciones_asistencia`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_intenciones_asistencia`);
    return g ? JSON.parse(g) : [];
  });

  const [bitacoraEscaneos, setBitacoraEscaneos] = useListaLocal<RegistroEscaneo>(`${CLAVE_ALMACEN_DATOS}_escaneos`,() => {
    const g = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_escaneos`);
    return g ? JSON.parse(g) : BITACORA_INICIAL_ESCANEOS;
  });

  const [listaClasesRegulares] = useState<HorarioClaseRegular[]>(CLASES_REGULARES_INICIALES);

  // Limpieza periódica de apartados temporales vencidos (2 minutos)
  useEffect(() => {
    const intervalo = setInterval(() => {
      try {
        const actuales=leerListaActual('reservaciones',listaReservaciones);
        const nuevas=actuales.map(res=>res.estado==='apartado_temporal'&&(res.tiempoExpiracionApartado||Infinity)<Date.now()?{...res,estado:'cancelada' as const}:res);
        if(nuevas.some((r,i)=>r!==actuales[i])){
          const r=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_reservaciones`]:nuevas});
          if(r.exito)setListaReservaciones(nuevas);
        }
      }catch{/* No se modifican apartados si no se pudo consultar su versión guardada. */}
    }, 15000);
    return () => clearInterval(intervalo);
  }, []);

  // Cierre automático por actividad con fecha límite en hora institucional.
  useEffect(() => {
    const cerrarActividadesVencidas = () => {
      try {
        const actual = {
          eventos: leerListaActual('eventos', listaEventos),
          reservaciones: leerListaActual('reservaciones', listaReservaciones),
          espera: leerListaActual('espera', listaEspera),
          bloqueos: leerListaActual('bloqueos', listaBloqueos)
        };
        const siguiente = proyectarCierreAutomatico(actual);
        if (!siguiente.actividadesActualizadas) return;
        const guardado = guardarLoteLocal(localStorage, {
          [`${CLAVE_ALMACEN_DATOS}_eventos`]: siguiente.eventos,
          [`${CLAVE_ALMACEN_DATOS}_reservaciones`]: siguiente.reservaciones,
          [`${CLAVE_ALMACEN_DATOS}_espera`]: siguiente.espera
        });
        if (!guardado.exito) return;
        setListaEventos(siguiente.eventos);
        setListaReservaciones(siguiente.reservaciones);
        setListaEspera(siguiente.espera);
      } catch {
        // Se conserva el estado si no se pudo consultar su versión guardada.
      }
    };
    cerrarActividadesVencidas();
    const intervalo = setInterval(cerrarActividadesVencidas, 30000);
    return () => clearInterval(intervalo);
  }, [listaEventos]);

  // Validación de disponibilidad física y logística de recinto (Colchón de ±30 minutos + Clases en laboratorios + Bloqueos)
  const verificarDisponibilidadRecinto = (
    idRecinto: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    idFechaEventoExcluir?: string,
    consultarAgendaGuardada = false
  ): ResultadoDisponibilidadRecinto => {
    let eventos=listaEventos, recintos=listaRecintos, bloqueos=listaBloqueos, ocupaciones=listaOcupacionesInternas;
    if(consultarAgendaGuardada){
      try{
        const leer = <T,>(clave:string,base:T[]):T[]=>{
          const texto=localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_${clave}`);
          const guardado=texto?JSON.parse(texto):base;
          if(!Array.isArray(guardado))throw new Error('Agenda inválida');
          return guardado;
        };
        eventos=cargarEventosProgramados(leer('eventos',listaEventos));
        recintos=leer('recintos',listaRecintos);bloqueos=leer('bloqueos',listaBloqueos);ocupaciones=leer('ocupaciones_internas',listaOcupacionesInternas);
      }catch{return {disponible:false,motivo:'No se pudo consultar la agenda guardada. Actualiza la página antes de continuar.'};}
    }
    const recintoConsultado = recintos.find((recinto) => recinto.id === idRecinto);
    if (!recintoConsultado || recintoConsultado.activo === false) {
      return {
        disponible: false,
        codigoMensaje: 'MSG-VENUE-005',
        motivo: 'El recinto no existe o está desactivado en el catálogo institucional.',
        tipoConflicto: 'bloqueo',
        tituloConflicto: 'Recinto no disponible'
      };
    }
    const bloqueo=bloqueos.find(b=>afectaBloqueo(b,{id:'',idEvento:'',idRecinto,fecha,horaInicio,horaFin,esFinalConfirmado:false,ponentes:[]}));
    if(bloqueo)return {disponible:false,codigoMensaje:'MSG-VENUE-003',motivo:'Bloqueo institucional: '+bloqueo.titulo,tipoConflicto:'bloqueo',tituloConflicto:bloqueo.titulo};

    // 2. Validar contra clases docentes regulares si el recinto es un laboratorio
    const fechaObj = new Date(`${fecha}T12:00:00Z`);
    const diaSemana = fechaObj.getUTCDay(); // 1 = Lunes, 2 = Martes ... 5 = Viernes

    const esLaboratorio =
      idRecinto.startsWith('rec-lab') ||
      recintos.find((r) => r.id === idRecinto)?.tipo === 'laboratorio';

    let avisoClase: ResultadoDisponibilidadRecinto | undefined;
    if (esLaboratorio) {
      for (const clase of listaClasesRegulares) {
        const coincideRecinto =
          clase.idRecinto === idRecinto ||
          (idRecinto === 'rec-lab-3' && clase.idRecinto === 'rec-lab-computo-3') ||
          (idRecinto === 'rec-lab-computo-3' && clase.idRecinto === 'rec-lab-3');

        if (coincideRecinto && clase.diaSemana === diaSemana) {
          if (horaInicio < clase.horaFin && horaFin > clase.horaInicio) {
            avisoClase = {
              disponible: true,
              codigoMensaje: 'MSG-VENUE-002',
              tipoConflicto: 'clase',
              tituloConflicto: `Clase Programada: ${clase.materia}`,
              motivo: `Existe una clase programada de ${clase.horaInicio} a ${clase.horaFin} en este laboratorio (${clase.materia}, Grupo ${clase.grupo}, ${clase.profesor}). Horario informativo: puedes enviar la solicitud. Subdirección revisará esta coincidencia y decidirá su autorización.`,
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

    for (const evento of eventos) {
      if (evento.estado === 'cancelado') continue;
      for (const fec of evento.fechas) {
        if (fec.cancelada || fec.suspendida || (idFechaEventoExcluir && fec.id === idFechaEventoExcluir)) continue;
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

    const ocupacionInterna = ocupaciones.find((o) =>
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

    return avisoClase || { disponible: true };
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
        if (fec.cancelada || fec.suspendida) continue;
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
      Boolean(evento.descripcion?.trim());
    const tieneFechas = evento.fechas && evento.fechas.length > 0;
    const todasLasFechasTienenRecinto =
      tieneFechas && evento.fechas.every((f) => Boolean(f.idRecinto));

    // Si es acceso controlado, cada fecha debe tener exactamente una versión final confirmada
    const todasLasFechasTienenVersionFinal =
      (tieneFechas &&
        evento.fechas.every((f) => {
          if (modalidadActividad(f,evento.modalidadAsistencia) !== 'controlado') return true;
          if (!f.idArregloFinal) return false;
          const arreglo = listaArreglos.find((a) => a.id === f.idArregloFinal);
          return arreglo && arreglo.estado === 'version_final';
        }));

    const elementosPendientes: string[] = [];
    if (!solicitudAutorizada) elementosPendientes.push('Solicitud formal autorizada por Subdirección');
    if (!informacionGeneralCompleta) elementosPendientes.push('Información completa (título y descripción)');
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

  useEffect(() => {
    const cerrarVencidas = () => {
      const actuales: SolicitudEvento[] = JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_solicitudes`) || 'null') || listaSolicitudes;
      let cambiaron=false;
      const nuevas=actuales.map(s=>{const motivo=motivoVencimiento(s);if(!motivo)return s;cambiaron=true;return registrarCambioSolicitud(s,{estado:'rechazada',motivoRechazo:motivo,fechaRevision:new Date().toISOString(),revisadoPor:'Vencimiento automático'},'Sistema','Rechazo por vencimiento',motivo);});
      if(cambiaron) persistirSolicitudes(nuevas);
    };
    cerrarVencidas(); const intervalo=setInterval(cerrarVencidas,30000); return ()=>clearInterval(intervalo);
  }, [listaSolicitudes]);

  const solicitudVigente = (id: string) => {
    const guardadas = localStorage.getItem(
      `${CLAVE_ALMACEN_DATOS}_solicitudes`,
    );
    const lista: SolicitudEvento[] = guardadas
      ? JSON.parse(guardadas)
      : listaSolicitudes;
    return { lista, solicitud: lista.find((item) => item.id === id) };
  };

  const consultarSolicitanteVigente = () => {
    try {
      const cuentas:Usuario[]=JSON.parse(localStorage.getItem('tt_usuarios_sistema_v2')||'[]');
      return Array.isArray(cuentas)?cuentas.find(u=>u.id===usuarioActual?.id&&u.estaActivo):undefined;
    } catch { return undefined; }
  };
  const crearSolicitud: ContextoDatosTipo["crearSolicitud"] = (datos) => {
    if (
      !usuarioActual ||
      datos.idSolicitante !== usuarioActual.id ||
      !verificacionIdentidadVigente(usuarioActual) ||
      usuarioActual.correoConfirmado !== true ||
      restriccionIdentidadVigente(usuarioActual)
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
    const errorItinerario = validarItinerarios(datos.itinerarios, datos.fechasSolicitadas);
    if (errorItinerario) throw new Error(errorItinerario);
    const errorDistribucion=validarDistribuciones(datos,listaRecintos);
    if(errorDistribucion) throw new Error(errorDistribucion);
    for(const actividad of datos.fechasSolicitadas){const d=verificarDisponibilidadRecinto(actividad.idRecinto,actividad.fecha,actividad.horaInicio,actividad.horaFin,undefined,true);if(!d.disponible)throw new Error(d.motivo||'El recinto ya no está disponible.');}
    if(!calendarioRevision) throw new Error('Administración debe configurar el calendario hábil de revisión antes del envío.');
    const ahora = new Date().toISOString();
    const nuevaSolicitud: SolicitudEvento = {
      ...datos,
      id: `sol-${crypto.randomUUID()}`,
      estado: "en_revision",
      fechaCreacion: ahora,
      fechaEnvioInicial: ahora,
      fechaVencimientoRevision: vencimientoRevision(ahora,calendarioRevision),
      version: 1,
    };
    if(usuarioActual.puedeAutoaprobar && !nuevaSolicitud.esExcepcional && !nuevaSolicitud.fechasSolicitadas.some(f=>verificarDisponibilidadRecinto(f.idRecinto,f.fecha,f.horaInicio,f.horaFin,undefined,true).tipoConflicto==='clase')){
      const resultado=resolverSolicitud(nuevaSolicitud.id,'autorizada','Autorización automática por jefatura de academia.',1,false,nuevaSolicitud);
      if(!resultado.exito)throw new Error(resultado.error);
      return {...nuevaSolicitud,estado:'autorizada'};
    }
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
        !verificacionIdentidadVigente(usuarioActual) ||
        usuarioActual.correoConfirmado !== true ||
        restriccionIdentidadVigente(usuarioActual)
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
    propuesta?: SolicitudEvento,
  ) => {
    const vigentes=solicitudVigente(idSolicitud);
    const lista=propuesta?[propuesta,...vigentes.lista.filter(s=>s.id!==idSolicitud)]:vigentes.lista;
    const solicitud=propuesta||vigentes.solicitud;
    const actorVigente=consultarSolicitanteVigente();
    const autoaprobacionPropia = !!actorVigente?.puedeAutoaprobar && verificacionIdentidadVigente(actorVigente) && actorVigente.correoConfirmado === true && !restriccionIdentidadVigente(actorVigente) && solicitud?.idSolicitante === actorVigente.id && decision === "autorizada" && !solicitud.esExcepcional && !validarAnticipacionSolicitud(solicitud);
    if (!usuarioActual || !actorVigente || !actorVigente.roles.includes("subdireccion") && !autoaprobacionPropia)
      return {
        exito: false,
        error: "Solo Subdirección puede resolver solicitudes.",
      };
    if (solicitud && motivoVencimiento(solicitud)) return {exito:false,error:motivoVencimiento(solicitud)};
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
      const errorItinerario = validarItinerarios(solicitud.itinerarios, solicitud.fechasSolicitadas);
      if (errorItinerario) return { exito: false, error: errorItinerario };
      const errorDistribucion=validarDistribuciones(solicitud,listaRecintos);
      if(errorDistribucion) return {exito:false,error:errorDistribucion};
      for (const fecha of solicitud.fechasSolicitadas) {
        const disponibilidad = verificarDisponibilidadRecinto(
          fecha.idRecinto,
          fecha.fecha,
          fecha.horaInicio,
          fecha.horaFin,
          undefined,
          true,
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
    const solicitudesNuevas = lista.map((item) => item.id === idSolicitud ? solicitudActualizada : item);
    let eventosNuevos = listaEventos;
    let arreglosNuevos = listaArreglos;
    if(decision==='autorizada'){
      try{
        const eventosGuardados=JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_eventos`)||'null');
        const arreglosGuardados=JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_arreglos`)||'null');
        if(eventosGuardados&&!Array.isArray(eventosGuardados)||arreglosGuardados&&!Array.isArray(arreglosGuardados))throw new Error('Datos inválidos');
        eventosNuevos=cargarEventosProgramados(eventosGuardados||listaEventos);
        arreglosNuevos=incorporarProgramados(arreglosGuardados||listaArreglos,ARREGLOS_DEMOSTRACION);
      }catch{return {exito:false,error:'No se pudo consultar la versión guardada de los eventos. No se autorizó la solicitud.'};}
    }
    if (decision === "autorizada") {
      const sol = solicitudActualizada;
      const nuevoIdEvento = `evt-${sol.id.replace("sol-", "")}`;
      const yaExiste = eventosNuevos.some(
        (e) => e.id === nuevoIdEvento || e.idSolicitud === sol.id,
      );
      if (!yaExiste) {
        const fechasConvertidas = convertirDiasSolicitud(sol, nuevoIdEvento);

        const nuevoEvento: Evento = {
          id: nuevoIdEvento,
          idSolicitud: sol.id,
          idOrganizador: sol.idSolicitante,
          nombreOrganizador: sol.nombreSolicitante,
          titulo: sol.tituloEvento,
          descripcion: sol.descripcionEvento,
          urlImagen: sol.urlImagen,
          categoria: sol.categoria || "Académico",
          itinerarios: sol.itinerarios,
          visibilidad: sol.visibilidad,
          modalidadAsistencia: sol.modalidadAsistencia,
          estado: "publicado",
          fechaPublicacion: new Date().toISOString(),
          limitesAprobados:{numeroFechas:fechasConvertidas.length,duracionMinutos:duracionProgramada(fechasConvertidas)},
          fechas: fechasConvertidas.map((f,i)=>({...f,esFinalConfirmado:true,idArregloFinal:modalidadActividad(sol.fechasSolicitadas[i],sol.modalidadAsistencia)==="controlado"?`arr-${f.id}-aprobado`:undefined})),
          aforoMaximo: sol.asistenciaEstimada,
          ponentes: [...new Set(fechasConvertidas.flatMap((dia) => dia.ponentes))],
          etiquetas: ["ESCOM", sol.modalidadAsistencia],
        };

        eventosNuevos = [nuevoEvento, ...eventosNuevos];

        arreglosNuevos=[...arreglosNuevos,...fechasConvertidas.flatMap((f,i)=>modalidadActividad(sol.fechasSolicitadas[i],sol.modalidadAsistencia)==='controlado'?[arregloDesdeSolicitud(sol.fechasSolicitadas[i],f.id)]:[])];
      }
    }
    if (decision !== 'autorizada') return persistirSolicitudes(solicitudesNuevas);
    let usuariosNuevos: Usuario[];
    try {
      usuariosNuevos = JSON.parse(
        localStorage.getItem("tt_usuarios_sistema_v2") || "[]",
      );
      const titular = usuariosNuevos.find(
        (u) => u.id === solicitud.idSolicitante,
      );
      if (!titular)
        return {
          exito: false,
          error: "No se pudo consultar la cuenta del solicitante.",
        };
      usuariosNuevos = usuariosNuevos.map((u) =>
        u.id === titular.id
          ? {
              ...u,
              roles: [
                ...new Set<Usuario["roles"][number]>([
                  ...u.roles,
                  "organizador",
                ]),
              ],
            }
          : u,
      );
    } catch {
      return {
        exito: false,
        error: "No se pudo consultar la identidad del solicitante.",
      };
    }
    const resultadoGuardado = guardarLoteLocal(localStorage, {
      tt_usuarios_sistema_v2: usuariosNuevos,
      [`${CLAVE_ALMACEN_DATOS}_solicitudes`]: solicitudesNuevas,
      [`${CLAVE_ALMACEN_DATOS}_eventos`]: eventosNuevos,
      [`${CLAVE_ALMACEN_DATOS}_arreglos`]: arreglosNuevos,
    });
    if (!resultadoGuardado.exito) return resultadoGuardado;
    setListaSolicitudes(solicitudesNuevas);
    setListaEventos(eventosNuevos);
    setListaArreglos(arreglosNuevos);
    refrescarUsuarios();
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
    if(motivoVencimiento(solicitud)) return {exito:false,error:motivoVencimiento(solicitud)};
    const nueva = registrarCambioSolicitud(
      solicitud,
      {
        ...pausarRevision(solicitud),
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
    const errorItinerarios=validarItinerarios(cambios.itinerarios || solicitud.itinerarios,cambios.fechasSolicitadas || solicitud.fechasSolicitadas);
    if(errorItinerarios)return {exito:false,error:errorItinerarios};
    if(motivoVencimiento(solicitud)) return {exito:false,error:motivoVencimiento(solicitud)};
    if (reenviar) {
      if(!verificacionIdentidadVigente(usuarioActual)||usuarioActual.correoConfirmado!==true||restriccionIdentidadVigente(usuarioActual))return {exito:false,error:'Necesitas una cuenta confirmada, verificada y habilitada para enviar la solicitud.'};
      for(const actividad of cambios.fechasSolicitadas||solicitud.fechasSolicitadas){const d=verificarDisponibilidadRecinto(actividad.idRecinto,actividad.fecha,actividad.horaInicio,actividad.horaFin,undefined,true);if(!d.disponible)return {exito:false,error:d.motivo||'El recinto ya no está disponible.'};}
      if(!calendarioRevision) return {exito:false,error:'Administración debe configurar el calendario hábil antes de enviar.'};
      const errorDistribucion=validarDistribuciones({...solicitud,...cambios},listaRecintos);
      if(errorDistribucion) return {exito:false,error:errorDistribucion};
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
              fechaVencimientoRevision: reanudarRevision(solicitud,calendarioRevision!),
              tiempoRevisionRestanteMs: undefined,
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
    if(reenviar && usuarioActual.puedeAutoaprobar && !nueva.esExcepcional && !nueva.fechasSolicitadas.some(f=>verificarDisponibilidadRecinto(f.idRecinto,f.fecha,f.horaInicio,f.horaFin,undefined,true).tipoConflicto==='clase'))return resolverSolicitud(id,'autorizada','Autorización automática por jefatura de academia.',versionSolicitud(nueva),false,nueva);
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
    if(!usuarioActual?.roles.includes('subdireccion'))throw new Error('Solo Subdirección crea eventos institucionales.');
    const error=validarProgramacion(datosEvento.fechas||[],listaRecintos,{modalidad:datosEvento.modalidadAsistencia,aforo:datosEvento.aforoMaximo});
    if(error)throw new Error(error);
    for(const d of datosEvento.fechas||[]){const r=verificarDisponibilidadRecinto(d.idRecinto,d.fecha,d.horaInicio,d.horaFin,undefined,true);if(!r.disponible)throw new Error(r.motivo||'Recinto no disponible.');}
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
      estado: 'publicado',
      fechaPublicacion:new Date().toISOString(),
      limitesAprobados:{numeroFechas:datosEvento.fechas?.length||0,duracionMinutos:duracionProgramada(datosEvento.fechas||[])},
      fechas: datosEvento.fechas || [],
      ponentes: datosEvento.ponentes || ['Comité Institucional'],
      etiquetas: datosEvento.etiquetas || ['Institucional', 'ESCOM'],
      aforoMaximo: datosEvento.aforoMaximo || 120
    };

    const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_eventos`]:[nuevo,...listaEventos]});
    if(!resultado.exito)throw new Error(resultado.error);
    setListaEventos((previos) => [nuevo, ...previos]);
    return nuevo;
  };

  const datosCambioRecinto = (idEvento:string):{estado:EstadoCambioRecinto;actor:Usuario} => {
    const cuentas:Usuario[]=JSON.parse(localStorage.getItem('tt_usuarios_sistema_v2')||'[]');
    if(!Array.isArray(cuentas))throw new Error('No se pudieron comprobar los permisos actuales.');
    const actor=cuentas.find(u=>u.id===usuarioActual?.id);
    if(!actor?.estaActivo)throw new Error('Tu cuenta no está habilitada para modificar eventos.');
    const eventos=leerListaActual('eventos',listaEventos);
    const evento=eventos.find(e=>e.id===idEvento);
    if(!evento)throw new Error('El evento ya no está disponible.');
    return {actor,estado:{evento,recintos:leerListaActual('recintos',listaRecintos),arreglos:leerListaActual('arreglos',listaArreglos),reservas:leerListaActual('reservaciones',listaReservaciones),boletos:leerListaActual('boletos',listaBoletos),espera:leerListaActual('espera',listaEspera),escaneos:leerListaActual('escaneos',bitacoraEscaneos)}};
  };
  const comprobarDestinoRecinto = (estado:EstadoCambioRecinto, actividad:Evento['fechas'][number]) => {
    const error=validarProgramacion([actividad],estado.recintos,{modalidad:estado.evento.modalidadAsistencia,aforo:estado.evento.aforoMaximo});
    if(error)throw new Error(error);
    const disponibilidad=verificarDisponibilidadRecinto(actividad.idRecinto,actividad.fecha,actividad.horaInicio,actividad.horaFin,actividad.id,true);
    if(!disponibilidad.disponible)throw new Error(disponibilidad.motivo||'El recinto ya no está disponible.');
  };
  const revisarCambioRecinto:ContextoDatosTipo['revisarCambioRecinto'] = peticion => {
    try {
      const {estado,actor}=datosCambioRecinto(peticion.idEvento);
      const resultado=proyectarCambioRecinto(estado,{...peticion,idArreglo:'arr-cambio-'+crypto.randomUUID()},actor);
      comprobarDestinoRecinto(estado,resultado.actividad);
      return {exito:true,propuesta:resultado.propuesta};
    } catch(error){return {exito:false,error:error instanceof Error?error.message:'No se pudo revisar el cambio de recinto.'};}
  };
  const confirmarCambioRecinto:ContextoDatosTipo['confirmarCambioRecinto'] = (propuesta,aceptarReduccion) => {
    try {
      const p=propuesta.peticion;
      const {estado,actor}=datosCambioRecinto(p.idEvento);
      if(propuesta.firma!==firmaCambioRecinto(estado,p.idActividad))throw new Error('El evento, sus lugares o compromisos cambiaron desde la revisión. Vuelve a revisar la correspondencia.');
      const r=proyectarCambioRecinto(estado,p,actor);
      comprobarDestinoRecinto(estado,r.actividad);
      if(r.propuesta.reduccion&&!aceptarReduccion)throw new Error('Confirma expresamente la reducción de aforo.');
      const e=estado.evento;
      const fecha=new Date().toISOString();
      const valores={titulo:e.titulo,descripcion:e.descripcion,ponentes:e.ponentes,urlImagen:e.urlImagen};
      const destinatarios=[...new Set([todosLosUsuarios.find(u=>u.id===e.idOrganizador)?.correo,...estado.reservas.filter(x=>x.idFechaEvento===p.idActividad&&x.estado!=='cancelada').map(x=>x.correoUsuario),...estado.boletos.filter(x=>x.idFechaEvento===p.idActividad&&x.estado!=='cancelado').map(x=>x.correoUsuario),...estado.espera.filter(x=>x.idFechaEvento===p.idActividad&&x.estado==='notificado').map(x=>x.correoUsuario)].filter((v):v is string=>!!v))];
      const actualizado:Evento={...e,fechas:e.fechas.map(a=>a.id===p.idActividad?r.actividad:a),historialCambios:[...(e.historialCambios||[]),{version:(e.historialCambios?.length||0)+1,fecha,responsable:actor.nombre,motivo:p.motivo.trim(),campos:['Cambio de recinto','Correspondencia de lugares',...(r.propuesta.reduccion?['Reducción de aforo']:[])],valoresAnteriores:valores,valoresNuevos:valores,detalleAnterior:JSON.stringify(e.fechas.find(a=>a.id===p.idActividad)),detalleNuevo:JSON.stringify({actividad:r.actividad,correspondencias:r.propuesta.lugares}),resultadoNotificacion:{estado:'no_configurada',destinatarios,fechaRegistro:fecha}}]};
      const eventos=leerListaActual('eventos',listaEventos).map(a=>a.id===e.id?actualizado:a);
      const arreglos=r.arreglo?[...estado.arreglos.map(a=>a.idFechaEvento===p.idActividad&&a.estado==='version_final'?{...a,estado:'bloqueado' as const}:a),r.arreglo]:estado.arreglos;
      const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_eventos`]:eventos,[`${CLAVE_ALMACEN_DATOS}_arreglos`]:arreglos,[`${CLAVE_ALMACEN_DATOS}_reservaciones`]:r.reservas,[`${CLAVE_ALMACEN_DATOS}_boletos`]:r.boletos,[`${CLAVE_ALMACEN_DATOS}_espera`]:r.espera});
      if(resultado.exito){setListaEventos(eventos);setListaArreglos(arreglos);setListaReservaciones(r.reservas);setListaBoletos(r.boletos);setListaEspera(r.espera);}
      return resultado;
    }catch(error){return {exito:false,error:error instanceof Error?error.message:'No se confirmó el cambio de recinto.'};}
  };

  const actualizarEvento = (idEvento: string, parcial: Partial<Evento>, versionEsperada?: string) => {
    let vigentes = listaEventos;
    try {
      const guardados = localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_eventos`);
      if (guardados) vigentes = JSON.parse(guardados);
    } catch { return { exito: false, error: 'No se pudo consultar la versión guardada. No se modificó el evento.' }; }
    if (!Array.isArray(vigentes)) return { exito: false, error: 'La agenda guardada no es válida.' };
    let boletosVigentes: BoletoDigital[];
    let reservasVigentes: Reservacion[];
    let esperaVigente: EntradaListaEspera[];
    let escaneosVigentes: RegistroEscaneo[];
    try {
      boletosVigentes = JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_boletos`) || 'null') || listaBoletos;
      reservasVigentes = JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_reservaciones`) || 'null') || listaReservaciones;
      esperaVigente = JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_espera`) || 'null') || listaEspera;
      escaneosVigentes = JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_escaneos`) || 'null') || bitacoraEscaneos;
      if (![boletosVigentes, reservasVigentes, esperaVigente, escaneosVigentes].every(Array.isArray)) throw new Error();
    } catch { return { exito: false, error: 'No se pudieron comprobar los compromisos guardados. No se modificó el evento.' }; }
    const vigente = vigentes.find((evento) => evento.id === idEvento);
    if (!vigente) return { exito: false, error: 'El evento ya no está disponible.' };
    if (versionEsperada !== undefined && JSON.stringify(vigente) !== versionEsperada) {
      setListaEventos(vigentes);
      return { exito: false, error: 'El evento cambió en otra ventana. Revisa la versión actual antes de guardar.' };
    }
    if(!puedeModificarEvento(usuarioActual,vigente))return {exito:false,error:'Solo el Organizador propietario o Subdirección pueden modificar el evento.'};
    const errorItinerario=validarItinerarios(parcial.itinerarios || vigente.itinerarios,parcial.fechas || vigente.fechas);
    if(errorItinerario)return {exito:false,error:errorItinerario};
    const original=EVENTOS_INICIALES.find(e=>e.id===vigente.id)||vigente;
    if(parcial.fechas){
      const error=validarLimitesEvento(vigente,parcial.fechas,original);if(error)return {exito:false,error};
      for(const d of vigente.fechas){
        const nueva=parcial.fechas.find(f=>f.id===d.id);
        if(JSON.stringify(d)===JSON.stringify(nueva))continue;
        if(d.cancelada||inicioEnMexico(d.fecha,d.horaInicio)<=Date.now()||boletosVigentes.some(b=>b.idFechaEvento===d.id&&b.estado==='utilizado')||escaneosVigentes.some(r=>r.idFechaEvento===d.id&&r.resultado==='exito'))return {exito:false,error:'No se pueden modificar días cancelados, iniciados o con entradas registradas.'};
        if(!nueva) return {exito:false,error:'Retira el día mediante la operación que comprueba sus compromisos.'};
        if(nueva.nombreActividad!==undefined&&!nueva.nombreActividad.trim())return {exito:false,error:'Cada actividad necesita un nombre.'};
        if(nueva.modalidadAsistencia!==d.modalidadAsistencia||nueva.asistenciaEstimada!==d.asistenciaEstimada)return {exito:false,error:'Conserva el tipo de acceso y aforo aprobados de la actividad.'};
        const cambioProgramacion=d.fecha!==nueva.fecha||d.horaInicio!==nueva.horaInicio||d.horaFin!==nueva.horaFin||d.idRecinto!==nueva.idRecinto;
        if(cambioProgramacion){
          const error=validarProgramacion(parcial.fechas.filter(f=>!f.cancelada&&(f.id===nueva.id||inicioEnMexico(f.fecha,f.horaInicio)>Date.now())),listaRecintos,{modalidad:vigente.modalidadAsistencia,aforo:vigente.aforoMaximo});if(error)return {exito:false,error};
          const disponibilidad=verificarDisponibilidadRecinto(nueva.idRecinto,nueva.fecha,nueva.horaInicio,nueva.horaFin,d.id,true);if(!disponibilidad.disponible)return {exito:false,error:disponibilidad.motivo};
          if(d.fecha!==nueva.fecha&&inicioEnMexico(nueva.fecha,nueva.horaInicio)-Date.now()<168*3600000&&!(usuarioActual?.roles.includes('subdireccion')&&parcial.historialExcepcionesAnticipacion?.some(h=>h.idFechaEvento===d.id&&h.motivo.trim())))return {exito:false,error:'La excepción de anticipación requiere Subdirección y un motivo registrado.'};
          if(d.idRecinto!==nueva.idRecinto&&(reservasVigentes.some(r=>r.idFechaEvento===d.id&&(r.estado==='confirmada'||r.estado==='apartado_temporal'&&(r.tiempoExpiracionApartado||0)>Date.now()))||boletosVigentes.some(b=>b.idFechaEvento===d.id&&b.estado!=='cancelado')||esperaVigente.some(e=>e.idFechaEvento===d.id&&e.estado==='notificado')))return {exito:false,error:'Resuelve los boletos, apartados y ofertas vigentes antes de cambiar el recinto.'};
        }
      }
    }
    const nuevos = vigentes.map((evento) => evento.id === idEvento ? { ...evento, ...parcial,limitesAprobados:evento.limitesAprobados||{numeroFechas:original.fechas.length,duracionMinutos:duracionProgramada(original.fechas)} } : evento);
    const actualizado = nuevos.find(evento => evento.id === idEvento)!;
    const boletosActualizados = boletosVigentes.map(boleto => {
      if (boleto.idEvento !== idEvento || boleto.estado === 'cancelado') return boleto;
      const actividad = actualizado.fechas.find(fecha => fecha.id === boleto.idFechaEvento);
      if (!actividad) return boleto;
      const anterior = vigente.fechas.find(fecha => fecha.id === actividad.id);
      if (actualizado.titulo === vigente.titulo && anterior?.fecha === actividad.fecha && anterior.horaInicio === actividad.horaInicio && anterior.horaFin === actividad.horaFin && anterior.idRecinto === actividad.idRecinto) return boleto;
      const recinto = listaRecintos.find(recinto => recinto.id === actividad.idRecinto);
      return { ...boleto, tituloEvento: actualizado.titulo, fechaEvento: actividad.fecha,
        horaEvento: `${actividad.horaInicio} - ${actividad.horaFin}`,
        nombreRecinto: recinto?.nombre || boleto.nombreRecinto };
    });
    const resultado = guardarLoteLocal(localStorage, {
      [`${CLAVE_ALMACEN_DATOS}_eventos`]: nuevos,
      [`${CLAVE_ALMACEN_DATOS}_boletos`]: boletosActualizados
    });
    if (resultado.exito) { setListaEventos(nuevos); setListaBoletos(boletosActualizados); }
    return resultado;
  };

  const cancelarUnidadEvento:ContextoDatosTipo['cancelarUnidadEvento']=(idEvento,idFecha,motivo,retirar,versionEsperada)=>{
    try {
      const a=leerEstadoBloqueos();const evento=a.eventos.find(e=>e.id===idEvento);
      if(!evento||!puedeModificarEvento(usuarioActual,evento)||!motivo.trim())return {exito:false,error:'No hay autorización o falta el motivo de la operación.'};
      if(JSON.stringify(evento)!==versionEsperada)return {exito:false,error:'El evento cambió. Revisa su versión actual antes de confirmar.'};
      const dias=evento.fechas.filter(d=>!d.cancelada&&(!idFecha||d.id===idFecha));const ids=new Set(dias.map(d=>d.id));
      const boletos:BoletoDigital[]=JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_boletos`)||'null')||listaBoletos;
      if(!dias.length||dias.some(d=>inicioEnMexico(d.fecha,d.horaInicio)<=Date.now()||boletos.some(b=>b.idFechaEvento===d.id&&b.estado==='utilizado')||a.escaneos.some(r=>r.idFechaEvento===d.id&&r.resultado==='exito')))return {exito:false,error:'Solo se pueden retirar o cancelar días futuros sin entradas registradas.'};
      if(retirar&&(evento.fechas.length<=1||a.reservas.some(r=>ids.has(r.idFechaEvento)&&(r.estado==='confirmada'||r.estado==='apartado_temporal'&&(r.tiempoExpiracionApartado||0)>Date.now()))||boletos.some(b=>ids.has(b.idFechaEvento)&&b.estado!=='cancelado')||a.espera.some(e=>ids.has(e.idFechaEvento)&&['esperando','notificado'].includes(e.estado))))return {exito:false,error:'No se puede retirar el último día ni un día con boletos, apartados, ofertas o personas en espera.'};
      const fechas=retirar?evento.fechas.filter(d=>!ids.has(d.id)):evento.fechas.map(d=>ids.has(d.id)?{...d,cancelada:true,estadoInscripciones:'cerradas' as const}:d);
      const reservas=a.reservas.map(r=>ids.has(r.idFechaEvento)&&r.estado!=='cancelada'?{...r,estado:'cancelada' as const,motivoCancelacion:motivo.trim()}:r);
      const nuevosBoletos=boletos.map(b=>ids.has(b.idFechaEvento)&&b.estado!=='cancelado'?{...b,estado:'cancelado' as const,motivoInvalidacion:motivo.trim(),fechaInvalidacion:new Date().toISOString(),invalidadoPor:usuarioActual!.nombre}:b);
      const espera=a.espera.map(e=>ids.has(e.idFechaEvento)&&['esperando','notificado'].includes(e.estado)?{...e,estado:'cancelado' as const}:e);
      const valores={titulo:evento.titulo,descripcion:evento.descripcion,ponentes:evento.ponentes,urlImagen:evento.urlImagen};
      const destinatarios=[...new Set([todosLosUsuarios.find(u=>u.id===evento.idOrganizador)?.correo,...a.reservas.filter(r=>ids.has(r.idFechaEvento)).map(r=>r.correoUsuario),...boletos.filter(b=>ids.has(b.idFechaEvento)).map(b=>b.correoUsuario)].filter((correo): correo is string => Boolean(correo)))];
      const original=EVENTOS_INICIALES.find(e=>e.id===evento.id)||evento;
      const actualizado:Evento={...evento,fechas,estado:fechas.every(d=>d.cancelada)?'cancelado':evento.estado,limitesAprobados:evento.limitesAprobados||{numeroFechas:original.fechas.length,duracionMinutos:duracionProgramada(original.fechas)},historialCambios:[...(evento.historialCambios||[]),{version:(evento.historialCambios?.length||0)+1,fecha:new Date().toISOString(),responsable:usuarioActual!.nombre,motivo:motivo.trim(),campos:[retirar?'Retiro de día':'Cancelación'],valoresAnteriores:valores,valoresNuevos:valores,detalleAnterior:JSON.stringify(evento.fechas),detalleNuevo:JSON.stringify(fechas),resultadoNotificacion:{estado:'no_configurada',destinatarios,fechaRegistro:new Date().toISOString()}}]};
      const eventos=a.eventos.map(e=>e.id===idEvento?actualizado:e);
      const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_eventos`]:eventos,[`${CLAVE_ALMACEN_DATOS}_reservaciones`]:reservas,[`${CLAVE_ALMACEN_DATOS}_boletos`]:nuevosBoletos,[`${CLAVE_ALMACEN_DATOS}_espera`]:espera});
      if(resultado.exito){setListaEventos(eventos);setListaReservaciones(reservas);setListaBoletos(nuevosBoletos);setListaEspera(espera);}return resultado;
    }catch{return {exito:false,error:'No se confirmó la operación; no se pudo guardar el conjunto de cambios.'};}
  };
  const publicarEvento = (idEvento: string): { exito: boolean; error?: string } => {
    const checklist = obtenerListaDeVerificacion(idEvento);
    if (!checklist.puedePublicar) {
      return {
        exito: false,
        error: `Faltan requisitos para publicar: ${checklist.elementosPendientes.join(', ')}`
      };
    }

    return actualizarEvento(idEvento, { estado: 'publicado', fechaPublicacion: new Date().toISOString() });
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
    let reservasActuales:Reservacion[],eventosActuales:Evento[],boletosActuales:BoletoDigital[],esperaActual:EntradaListaEspera[],arreglosActuales:ArregloAsientos[],bloqueosActuales:BloqueoRecinto[];
    try{
      reservasActuales=leerListaActual('reservaciones',listaReservaciones);eventosActuales=leerListaActual('eventos',listaEventos);
      boletosActuales=leerListaActual('boletos',listaBoletos);esperaActual=leerListaActual('espera',listaEspera);
      arreglosActuales=leerListaActual('arreglos',listaArreglos);bloqueosActuales=leerListaActual('bloqueos',listaBloqueos);
    }catch{return {exito:false,error:'No se pudo consultar la disponibilidad guardada. No se apartó un lugar.'};}
    if(usuarioActual?.id!==idUsuario)return {exito:false,error:'Solo puedes apartar lugares para tu propia cuenta.'};
    const ahora = Date.now();
    const eventoTaquilla = eventosActuales.find((evento) => evento.id === idEvento);
    const fechaTaquilla = eventoTaquilla?.fechas.find((fecha) => fecha.id === idFechaEvento);

    if (!eventoTaquilla || !fechaTaquilla) {
      return { exito: false, error: 'El día seleccionado ya no se encuentra disponible.' };
    }
    const errorActividad = impedimentoActividad(eventoTaquilla, fechaTaquilla, bloqueosActuales, ahora);
    const errorParticipante = impedimentoParticipante(eventoTaquilla, consultarSolicitanteVigente() || null);
    if (errorActividad || errorParticipante) return { exito: false, error: errorActividad || errorParticipante };
    if(reservasActuales.some(r=>r.idFechaEvento===idFechaEvento&&r.idUsuario===idUsuario&&r.estado==='confirmada'))return {exito:false,error:'Ya tienes una reservación confirmada para esta actividad.'};
    if (fechaTaquilla.cancelada) return { exito: false, error: 'Este día fue cancelado y ya no admite reservaciones.' };
    if (modalidadActividad(fechaTaquilla,eventoTaquilla.modalidadAsistencia) !== 'controlado') return {exito:false,error:'Esta actividad no utiliza reservación de lugares.'};
    {
      const comprometidos = new Set([
        ...reservasActuales.filter(r=>r.idFechaEvento===idFechaEvento && (r.estado==='confirmada'||r.estado==='apartado_temporal'&&(r.tiempoExpiracionApartado||0)>ahora&&r.idUsuario!==idUsuario)).map(r=>r.idAsiento),
        ...boletosActuales.filter(b=>b.idFechaEvento===idFechaEvento && ['valido','utilizado'].includes(b.estado)).map(b=>reservasActuales.find(r=>r.id===b.idReservacion)?.idAsiento || arreglosActuales.find(a=>a.idFechaEvento===idFechaEvento&&a.estado==='version_final')?.asientos.find(a=>a.etiqueta===b.etiquetaAsiento)?.id || b.id),
        ...esperaActual.filter(e=>e.idFechaEvento===idFechaEvento && e.estado==='notificado'&&(e.fechaExpiracionOferta||0)>ahora&&e.idUsuario!==idUsuario).map(e=>e.idAsientoOferta||e.id),
      ]);
      const capacidad = capacidadActividad(eventoTaquilla, fechaTaquilla, { recintos: listaRecintos, arreglos: arreglosActuales });
      if(comprometidos.size >= capacidad) return {exito:false,error:'Se alcanzó el aforo aprobado de esta actividad.'};
    }


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
    const colision = reservasActuales.find(
      (r) =>
        r.idFechaEvento === idFechaEvento &&
        r.idAsiento === idAsiento &&
        (r.estado === 'confirmada' ||
          (r.estado === 'apartado_temporal' &&
            r.tiempoExpiracionApartado &&
            r.tiempoExpiracionApartado > ahora &&
            r.idUsuario !== idUsuario))
    );

    const ofertaVigenteDeOtraPersona = esperaActual.some((entrada) =>
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
    const reservacionesLimpias = reservasActuales.filter(
      (r) =>
        !(
          r.idFechaEvento === idFechaEvento &&
          r.idUsuario === idUsuario &&
          r.estado === 'apartado_temporal'
        )
    );

    const nuevaReservacion: Reservacion = {
      id: `res-${crypto.randomUUID()}`,
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

    const nuevas=[...reservacionesLimpias,nuevaReservacion];
    const guardado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_reservaciones`]:nuevas});
    if(!guardado.exito)return guardado;
    setListaReservaciones(nuevas);
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
    let reservas:Reservacion[],boletos:BoletoDigital[],espera:EntradaListaEspera[],eventos:Evento[],bloqueos:BloqueoRecinto[];
    try {
      reservas=leerListaActual('reservaciones',listaReservaciones);
      boletos=leerListaActual('boletos',listaBoletos);
      espera=leerListaActual('espera',listaEspera);
      eventos=leerListaActual('eventos',listaEventos);
      bloqueos=leerListaActual('bloqueos',listaBloqueos);
    }catch{return {exito:false,error:'No se pudo comprobar el estado guardado. No se confirmó la reservación.'};}
    const res = reservas.find((r) => r.id === idReservacion);
    if (!res || res.idUsuario!==usuarioActual?.id) {
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

    const evento = eventos.find((e) => e.id === res.idEvento);
    const fecha = evento?.fechas.find((f) => f.id === res.idFechaEvento);
    const recinto = listaRecintos.find((v) => v.id === fecha?.idRecinto);

    if (!evento || !fecha) {
      return { exito: false, error: 'El día asociado con el apartado ya no existe.' };
    }
    const errorActividad = impedimentoActividad(evento, fecha, bloqueos);
    const errorParticipante = impedimentoParticipante(evento, consultarSolicitanteVigente() || null);
    if (errorActividad || errorParticipante) return { exito: false, error: errorActividad || errorParticipante };
    if (modalidadActividad(fecha, evento.modalidadAsistencia) !== 'controlado') return { exito: false, error: 'Esta actividad no utiliza reservación de lugares.' };
    if (reservas.some(r=>r.id!==res.id&&r.idFechaEvento===res.idFechaEvento&&r.estado==='confirmada'&&(r.idUsuario===res.idUsuario||!!res.idAsiento&&r.idAsiento===res.idAsiento)))return {exito:false,error:'La actividad o el asiento ya tienen una reservación confirmada.'};
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

    if (reservaIncompatible(res, reservas, eventos)) return {exito:false,error:'ERR-MT-07 · Ya tienes una reserva confirmada que coincide con el horario de esta actividad.'};

    const idBoleto = `bol-${crypto.randomUUID()}`;
    const codigoQr = codigoQrDelEvento(boletos,res.idEvento,res.idUsuario) || `TT-${generarIdentificadorQr()}`;

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

    const reservasNuevas=reservas.map(r=>r.id===idReservacion?{...r,estado:'confirmada' as const,fechaConfirmacion:new Date().toISOString(),idBoleto}:r);
    const boletosNuevos=[nuevoBoleto,...boletos];
    const esperaNueva=espera.map(entrada=>entrada.idReservacionOferta===idReservacion&&entrada.estado==='notificado'?{...entrada,estado:'convertido' as const}:entrada);
    const guardado=guardarLoteLocal(localStorage,{
      [`${CLAVE_ALMACEN_DATOS}_reservaciones`]:reservasNuevas,
      [`${CLAVE_ALMACEN_DATOS}_boletos`]:boletosNuevos,
      [`${CLAVE_ALMACEN_DATOS}_espera`]:esperaNueva
    });
    if(!guardado.exito)return guardado;
    setListaReservaciones(reservasNuevas);setListaBoletos(boletosNuevos);setListaEspera(esperaNueva);
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
      return { exito: false, error: 'El evento o la actividad seleccionada no existe.' };
    }

    if (!puedeAdministrarTaquilla(usuarioActual, evento) || usuarioActual?.id !== datos.idOrganizador) {
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
        error: 'ERR-MT-02 · Las inscripciones están cerradas para esta actividad.'
      };
    }

    const bloqueo = listaBloqueos.find((elemento) => bloqueoAfectaSesion(elemento, fecha));
    if (bloqueo || fecha.suspendida) {
      return {
        exito: false,
        error: `ERR-TR-10 · SUSPENDIDO: ${bloqueo?.titulo || 'Actividad pendiente de reprogramación'}.`
      };
    }

    const inicioDia = inicioEnMexico(fecha.fecha, fecha.horaInicio);
    if (!Number.isFinite(inicioDia) || inicioDia - Date.now() < 60 * 60 * 1000) {
      return { exito: false, error: 'La emisión debe realizarse al menos una hora antes del inicio de la actividad.' };
    }

    if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 20) {
      return { exito: false, error: 'La cantidad debe estar entre 1 y 20 boletos.' };
    }

    if (!datos.nombreBase.trim() || !datos.correoDestino.trim()) {
      return { exito: false, error: 'Indica el nombre de referencia y el correo de destino.' };
    }

    const indicadores = indicadoresActividad(evento, fecha, {
      recintos: listaRecintos, arreglos: listaArreglos, reservaciones: listaReservaciones,
      boletos: listaBoletos, espera: listaEspera, escaneos: bitacoraEscaneos, intenciones: listaIntencionesAsistencia
    });
    if (!indicadores.aforo || datos.cantidad > indicadores.disponibles) {
      return { exito: false, error: 'La cantidad solicitada supera los lugares disponibles para esta actividad.' };
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

  const cambiarEstadoInscripciones = (datos: CambioInscripciones): { exito: boolean; actividadesActualizadas?: number; error?: string } => {
    try {
      const actual = {
        eventos: leerListaActual('eventos', listaEventos),
        reservaciones: leerListaActual('reservaciones', listaReservaciones),
        espera: leerListaActual('espera', listaEspera),
        bloqueos: leerListaActual('bloqueos', listaBloqueos)
      };
      const siguiente = proyectarCambioInscripciones(actual, datos, consultarSolicitanteVigente() || null);
      const guardado = guardarLoteLocal(localStorage, {
        [`${CLAVE_ALMACEN_DATOS}_eventos`]: siguiente.eventos,
        [`${CLAVE_ALMACEN_DATOS}_reservaciones`]: siguiente.reservaciones,
        [`${CLAVE_ALMACEN_DATOS}_espera`]: siguiente.espera
      });
      if (!guardado.exito) return guardado;
      setListaEventos(siguiente.eventos);
      setListaReservaciones(siguiente.reservaciones);
      setListaEspera(siguiente.espera);
      return { exito: true, actividadesActualizadas: siguiente.actividadesActualizadas };
    } catch (error) {
      return { exito: false, error: error instanceof Error ? error.message : 'No fue posible consultar el estado vigente de las inscripciones.' };
    }
  };

  const registrarIntencionAsistencia = (
    idEvento: string,
    idFechaEvento: string,
    idUsuario: string,
    nombreUsuario: string,
    correoUsuario: string
  ): { exito: boolean; registro?: RegistroIntencionAsistencia; error?: string } => {
    let eventos: Evento[], intenciones: RegistroIntencionAsistencia[], bloqueos: BloqueoRecinto[];
    try {
      eventos = leerListaActual('eventos', listaEventos);
      intenciones = leerListaActual('intenciones_asistencia', listaIntencionesAsistencia);
      bloqueos = leerListaActual('bloqueos', listaBloqueos);
    } catch { return { exito: false, error: 'No fue posible consultar los registros vigentes.' }; }
    const eventoIntencion = eventos.find(e => e.id === idEvento);
    const actividad = eventoIntencion?.fechas.find(d => d.id === idFechaEvento);
    if (!eventoIntencion || !actividad) return { exito: false, error: 'La actividad ya no existe.' };
    if (usuarioActual?.id !== idUsuario) return { exito: false, error: 'Solo puedes registrar asistencia para tu propia cuenta.' };
    const error = impedimentoActividad(eventoIntencion, actividad, bloqueos) || impedimentoParticipante(eventoIntencion, consultarSolicitanteVigente() || null);
    if (error) return { exito: false, error };
    if (modalidadActividad(actividad, eventoIntencion.modalidadAsistencia) === 'controlado') return { exito: false, error: 'Esta actividad requiere reservar un lugar.' };
    const yaExiste = intenciones.some(
      (registro) =>
        registro.idEvento === idEvento &&
        registro.idFechaEvento === idFechaEvento &&
        registro.idUsuario === idUsuario
    );

    if (yaExiste) {
      return {
        exito: false,
        error: 'Ya tienes una intención de asistencia registrada para esta actividad.'
      };
    }

    const registro: RegistroIntencionAsistencia = {
      id: `int-${crypto.randomUUID()}`,
      idEvento,
      idFechaEvento,
      idUsuario,
      nombreUsuario,
      correoUsuario,
      fechaRegistro: new Date().toISOString()
    };

    const nuevas = [registro, ...intenciones];
    const guardado = guardarLoteLocal(localStorage, { [`${CLAVE_ALMACEN_DATOS}_intenciones_asistencia`]: nuevas });
    if (!guardado.exito) return guardado;
    setListaIntencionesAsistencia(nuevas);
    return { exito: true, registro };
  };

  const cancelarIntencionAsistencia = (idRegistro: string) => {
    let intenciones: RegistroIntencionAsistencia[];
    try { intenciones = leerListaActual('intenciones_asistencia', listaIntencionesAsistencia); }
    catch { return { exito: false, error: 'No fue posible consultar el registro vigente.' }; }
    const registro = intenciones.find(r => r.id === idRegistro);
    if (!registro || registro.idUsuario !== usuarioActual?.id || !consultarSolicitanteVigente())
      return { exito: false, error: 'Solo puedes cancelar registros de tu propia cuenta activa.' };
    const nuevas = intenciones.filter(r => r.id !== idRegistro);
    const guardado = guardarLoteLocal(localStorage, { [`${CLAVE_ALMACEN_DATOS}_intenciones_asistencia`]: nuevas });
    if (!guardado.exito) return guardado;
    setListaIntencionesAsistencia(nuevas);
    return { exito: true };
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
    const aforo = aforoActividad(fecha, evento.aforoMaximo) || listaRecintos.find((recinto) => recinto.id === fecha.idRecinto)?.capacidad || 0;
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
    let esperaActual:EntradaListaEspera[], reservasActuales:Reservacion[], eventosActuales:Evento[];
    try {
      esperaActual=leerListaActual('espera',listaEspera);
      reservasActuales=leerListaActual('reservaciones',listaReservaciones);
      eventosActuales=leerListaActual('eventos',listaEventos);
    } catch {return {exito:false,error:'No se pudo consultar la oferta guardada. Actualiza antes de continuar.'};}
    if(idUsuario!==usuarioActual?.id)return {exito:false,error:'La oferta no pertenece a tu cuenta.'};
    const entrada = esperaActual.find((elemento) => elemento.id === idEntrada && elemento.idUsuario === idUsuario);
    if (!entrada || entrada.estado !== 'notificado' || !entrada.idReservacionOferta) {
      return { exito: false, error: 'La oferta ya no está activa.' };
    }
    const reservaOferta = reservasActuales.find((reserva) => reserva.id === entrada.idReservacionOferta);
    if (!reservaOferta || reservaOferta.estado !== 'apartado_temporal') {
      return { exito: false, error: 'El lugar ofrecido ya no está disponible.' };
    }

    const expirada = (entrada.fechaExpiracionOferta || 0) <= Date.now();
    if (decision === 'aceptar') {
      if (expirada) {
        return responderOfertaListaDeEspera(idEntrada, idUsuario, 'vencer');
      }
      const evento = eventosActuales.find((item) => item.id === entrada.idEvento);
      const fecha = evento?.fechas.find((item) => item.id === entrada.idFechaEvento);
      if (!evento || !fecha || obtenerEstadoInscripciones(fecha, evento.estado) !== 'abiertas' || obtenerFechaLimiteInscripciones(fecha) <= Date.now()) {
        return { exito: false, error: 'ERR-MT-02 · Las inscripciones de este día ya están cerradas.' };
      }
      const yaReservo = reservasActuales.some((reserva) =>
        reserva.id !== reservaOferta.id && reserva.idUsuario === idUsuario && reserva.idFechaEvento === entrada.idFechaEvento &&
        (reserva.estado === 'confirmada' || (reserva.estado === 'apartado_temporal' && (reserva.tiempoExpiracionApartado || 0) > Date.now()))
      );
      const empalme = reservaIncompatible(reservaOferta, reservasActuales, eventosActuales);
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
    let boletos:BoletoDigital[],reservas:Reservacion[],eventos:Evento[],bloqueos:BloqueoRecinto[],escaneos:RegistroEscaneo[],cuentas:Usuario[];
    try{
      boletos=leerListaActual('boletos',listaBoletos);reservas=leerListaActual('reservaciones',listaReservaciones);
      eventos=leerListaActual('eventos',listaEventos);bloqueos=leerListaActual('bloqueos',listaBloqueos);escaneos=leerListaActual('escaneos',bitacoraEscaneos);
      cuentas=JSON.parse(localStorage.getItem('tt_usuarios_sistema_v2')||'[]');if(!Array.isArray(cuentas))throw new Error();
    }catch{return {exito:false,resultado:'no_autorizado',mensaje:'No se pudo comprobar el estado guardado. No se registró una entrada.'};}
    const operadorVigente=cuentas.find(c=>c.id===usuarioActual?.id&&c.id===operador?.id);
    const codigoNormalizado = codigoQr.trim().toUpperCase();
    const fechaHora = new Date(Date.now()).toISOString();
    const crearRegistro=(datos:Omit<RegistroEscaneo,'id'|'fechaEscaneo'|'escaneadoPor'>):RegistroEscaneo=>({...datos,id:'esc-'+crypto.randomUUID(),fechaEscaneo:fechaHora,escaneadoPor:operadorVigente?.nombre||escaneadoPor});
    const registrarIntento = (datos: Omit<RegistroEscaneo, 'id' | 'fechaEscaneo' | 'escaneadoPor'>) => {
      const nuevas=[crearRegistro(datos),...escaneos];
      const r=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_escaneos`]:nuevas});
      if(r.exito)setBitacoraEscaneos(nuevas);
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
    const eventoObjetivo = eventos.find((evento) => evento.id === idEventoObjetivo);
    const puedeOperar = Boolean(
      operadorVigente?.estaActivo && eventoObjetivo && (
        (operadorVigente.roles.includes('organizador') && eventoObjetivo.idOrganizador === operadorVigente.id) ||
        (operadorVigente.roles.includes('staff') && operadorVigente.eventosAsignadosStaff?.includes(eventoObjetivo.id))
      )
    );
    if (!puedeOperar) {
      return rechazar('no_autorizado', 'No tienes autorización vigente para registrar accesos en este evento.', undefined, false);
    }

    const fechaObjetivo = eventoObjetivo?.fechas.find((fecha) => fecha.id === idFechaEventoObjetivo);
    if (!eventoObjetivo || !fechaObjetivo) {
      return rechazar('evento_invalido', 'El evento o la actividad seleccionada ya no está disponible.');
    }
    const bloqueo = bloqueos.find((elemento) => bloqueoAfectaSesion(elemento, fechaObjetivo));
    if (eventoObjetivo.estado !== 'publicado' || fechaObjetivo.cancelada || fechaObjetivo.suspendida || bloqueo) {
      return rechazar('suspendido', bloqueo ? `Actividad suspendida: ${bloqueo.titulo}.` : fechaObjetivo.cancelada ? 'La actividad está cancelada.' : fechaObjetivo.suspendida ? 'La actividad está suspendida.' : 'El evento está cancelado.');
    }
    if (modalidadActividad(fechaObjetivo, eventoObjetivo.modalidadAsistencia) !== 'controlado') {
      return rechazar('evento_invalido', 'Esta actividad no utiliza control de acceso mediante boleto.');
    }
    const inicio = inicioEnMexico(fechaObjetivo.fecha,fechaObjetivo.horaInicio) - 30 * 60 * 1000;
    const fin = inicioEnMexico(fechaObjetivo.fecha,fechaObjetivo.horaFin);
    if(!Number.isFinite(inicio)||!Number.isFinite(fin)||fin<=inicio+30*60*1000)return rechazar('evento_invalido','La actividad no tiene un horario válido para registrar entradas.');
    if (Date.now() < inicio || Date.now() >= fin) {
      return rechazar('fuera_de_horario', REGLA_INGRESO_ACTIVIDAD);
    }

    // Los identificadores emitidos por Ticket Trade son opacos de 128 bits.
    // No se guardan en bitácora los códigos capturados que no correspondan.
    if (!/^TT-[A-F0-9]{32}$/.test(codigoNormalizado)) {
      return rechazar('codigo_no_reconocido', 'El código no tiene el formato de un boleto Ticket Trade.');
    }
    const reconocido = boletos.some(item=>item.codigoQr.toUpperCase()===codigoNormalizado);
    if(!reconocido)return rechazar('inexistente','El código no corresponde a un boleto emitido.');
    const boleto = accesoDelPase(boletos,codigoNormalizado,eventoObjetivo.id,fechaObjetivo.id);
    if(!boleto)return rechazar('fecha_invalida','El pase no tiene una reservación para esta actividad. No se muestran datos de otros eventos.');
    if (boleto.estado === 'cancelado') {
      return rechazar('cancelado', 'Boleto invalidado. No se puede registrar la entrada.', boleto);
    }
    if (boleto.estado === 'utilizado'||escaneos.some(r=>r.idBoleto===boleto.id&&r.resultado==='exito')) {
      const horaAnterior = boleto.fechaCheckIn ? new Date(boleto.fechaCheckIn).toLocaleString('es-MX') : 'hora no disponible';
      return rechazar('ya_utilizado', `Boleto ya utilizado el ${horaAnterior} por ${boleto.revisadoPor || 'Staff'}.`, boleto);
    }

    if (!boleto.esEspecial) {
      const reservacion = reservas.find((item) => item.id === boleto.idReservacion);
      if (!reservacion || reservacion.estado !== 'confirmada'||reservacion.idUsuario!==boleto.idUsuario||reservacion.idEvento!==boleto.idEvento||reservacion.idFechaEvento!==boleto.idFechaEvento||!!reservacion.idBoleto&&reservacion.idBoleto!==boleto.id) {
        return rechazar('reservacion_no_vigente', 'La reservación de este boleto ya no está vigente.', boleto);
      }
    }

    const boletoActualizado = { ...boleto, estado: 'utilizado' as const, fechaCheckIn: fechaHora, revisadoPor: operadorVigente!.nombre };
    const boletosNuevos=boletos.map(item=>item.id===boleto.id?boletoActualizado:item);
    const escaneosNuevos=[crearRegistro({idBoleto:boleto.id,idEvento:boleto.idEvento,idFechaEvento:boleto.idFechaEvento,resultado:'exito',nombreAsistente:boleto.nombreUsuario,etiquetaAsiento:boleto.etiquetaAsiento}),...escaneos];
    const guardado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_boletos`]:boletosNuevos,[`${CLAVE_ALMACEN_DATOS}_escaneos`]:escaneosNuevos});
    if(!guardado.exito)return {exito:false,resultado:'reservacion_no_vigente',mensaje:'No se pudo guardar la entrada. No permitas el acceso hasta confirmar el registro.'};
    setListaBoletos(boletosNuevos);setBitacoraEscaneos(escaneosNuevos);
    return {
      exito: true,
      resultado: 'exito',
      boleto: boletoActualizado,
      mensaje: `Acceso concedido a ${boleto.nombreUsuario}. Asiento asignado: ${boleto.etiquetaAsiento || 'General'}.`
    };
  };

  const prepararEventoDemostracion:ContextoDatosTipo['prepararEventoDemostracion']=()=>{
    if(!modoDemostracionActivo())return {exito:false,error:'Solo disponible en demostración.'};
    const vigente=listaEventos.find(e=>e.idOrganizador==='usr-silva'&&e.modalidadAsistencia==='controlado'&&e.estado==='publicado'&&e.inscripcionesAbiertas!==false&&(!e.fechaCierreInscripcion||Date.parse(e.fechaCierreInscripcion)>Date.now())&&e.fechas.some(d=>!d.cancelada&&!d.suspendida&&d.esFinalConfirmado&&d.estadoInscripciones!=='cerradas'&&(!d.fechaLimiteInscripciones||Date.parse(d.fechaLimiteInscripciones)>Date.now())&&inicioEnMexico(d.fecha,d.horaInicio)>Date.now()));
    if(vigente)return {exito:true,evento:vigente};
    const plantilla=EVENTOS_INICIALES.find(e=>e.id==='evt-simposio-ia')!;
    const id='evt-recorrido-'+crypto.randomUUID(),idDia='fec-'+crypto.randomUUID();
    const arregloOriginal=ARREGLOS_INICIALES.find(a=>a.idFechaEvento===plantilla.fechas[0].id&&a.estado==='version_final');
    if(!arregloOriginal)return {exito:false,error:'No hay distribución de prueba disponible.'};
    const arreglo={...structuredClone(arregloOriginal),id:'arr-'+crypto.randomUUID(),idFechaEvento:idDia,etiquetaVersion:'Demostración 1',fechaCreacion:new Date().toISOString(),fechaConfirmacionFinal:new Date().toISOString()};
    const dia={...structuredClone(plantilla.fechas[0]),id:idDia,idEvento:id,fecha:new Date(Date.now()+21*86400000).toISOString().slice(0,10),idArregloFinal:arreglo.id,esFinalConfirmado:true,estadoInscripciones:'abiertas' as const,fechaLimiteInscripciones:undefined,historialInscripciones:[]};
    const evento:Evento={...structuredClone(plantilla),id,idSolicitud:undefined,titulo:'Evento de demostración de Ticket Trade',descripcion:'Evento de prueba para recorrer interfaces sin modificar los eventos existentes.',fechas:[dia],fechaPublicacion:new Date().toISOString(),inscripcionesAbiertas:true,fechaCierreInscripcion:undefined,historialCambios:[],limitesAprobados:{numeroFechas:1,duracionMinutos:duracionProgramada([dia])}};
    const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_eventos`]:[evento,...listaEventos],[`${CLAVE_ALMACEN_DATOS}_arreglos`]:[arreglo,...listaArreglos]});
    if(resultado.exito){setListaEventos([evento,...listaEventos]);setListaArreglos([arreglo,...listaArreglos]);}
    return {...resultado,evento:resultado.exito?evento:undefined};
  };
  const prepararSolicitudDemostracion:ContextoDatosTipo['prepararSolicitudDemostracion']=(estado, extraordinaria=false)=>{
    if(!modoDemostracionActivo())return {exito:false,error:'Este escenario solo está disponible en demostración.'};
    try {
      const solicitudes:SolicitudEvento[]=JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_solicitudes`) || 'null') || listaSolicitudes;
      const existente=solicitudes.find(s=>s.idSolicitante==='usr-silva'&&s.estado===estado&&Boolean(s.esExcepcional)===extraordinaria&&!motivoVencimiento(s)&&(estado!=='borrador'||!validarDistribuciones(s,listaRecintos))&&s.fechasSolicitadas.every(d=>inicioEnMexico(d.fecha,d.horaInicio)>Date.now()));
      if(existente)return {exito:true,id:existente.id};
      const plantilla=SOLICITUDES_INICIALES.find(s=>s.id===(estado==='borrador'?'sol-borrador-demo':estado==='en_revision'?'sol-revision-ordinaria-demo':'sol-correccion-demo'))!;
      const recinto=listaRecintos.find(r=>r.id==='rec-sala14'&&r.activo!==false);
      if(!recinto)return {exito:false,error:'El recinto de demostración no está disponible.'};
      const fecha=new Date(Date.now()+(extraordinaria?3:21)*86400000).toISOString().slice(0,10);
      const ahora=new Date().toISOString();
      const distribucion=lugaresDelRecinto(recinto);
      const lugaresHabilitados=distribucion.filter(l=>!l.estaBloqueado&&!l.estaEliminado).length;
      const nueva:SolicitudEvento={...plantilla,id:'sol-demo-'+crypto.randomUUID(),estado,fechaCreacion:ahora,fechaEnvioInicial:estado==='borrador'?undefined:ahora,asistenciaEstimada:Math.min(plantilla.asistenciaEstimada,recinto.capacidad,lugaresHabilitados),version:1,historialVersiones:undefined,fechaRevision:estado==='requiere_correccion'?ahora:undefined,
        esExcepcional:extraordinaria,justificacionExcepcional:extraordinaria?'Demostración de una solicitud urgente para revisar su recorrido.':undefined,
        fechaVencimientoRevision:estado==='en_revision'&&!extraordinaria&&calendarioRevision?vencimientoRevision(ahora,calendarioRevision):undefined,
        fechaLimiteCorreccion:estado==='requiere_correccion'?new Date(Date.now()+86400000).toISOString():undefined,tiempoRevisionRestanteMs:estado==='requiere_correccion'?2*86400000:undefined,
        fechasSolicitadas:[{...plantilla.fechasSolicitadas[0],fecha,idRecinto:recinto.id,distribucion,distribucionConfirmada:true}]};
      const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_solicitudes`]:[nueva,...solicitudes]});
      if(resultado.exito)setListaSolicitudes([nueva,...solicitudes]);
      return {...resultado,id:resultado.exito?nueva.id:undefined};
    }catch{return {exito:false,error:'No se pudo preparar la solicitud de demostración.'};}
  };
  const prepararSuspensionDemostracion:ContextoDatosTipo['prepararSuspensionDemostracion']=()=>{
    if(!modoDemostracionActivo())return {exito:false,error:'Este escenario solo está disponible en demostración.'};
    const existente=listaEventos.find(e=>e.idOrganizador==='usr-silva'&&e.fechas.some(d=>d.suspendida&&!d.cancelada&&inicioEnMexico(d.fecha,d.horaInicio)>Date.now()));
    if(existente)return {exito:true,id:existente.id};
    const demo=escenarioSuspension();
    const eventos=[demo.evento,...listaEventos.filter(e=>e.id!==demo.evento.id)];
    const bloqueos=[demo.bloqueo,...listaBloqueos.filter(b=>b.id!==demo.bloqueo.id)];
    const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_eventos`]:eventos,[`${CLAVE_ALMACEN_DATOS}_bloqueos`]:bloqueos});
    if(resultado.exito){setListaEventos(eventos);setListaBloqueos(bloqueos);}return {...resultado,id:resultado.exito?demo.evento.id:undefined};
  };
  const leerEstadoBloqueos = () => {
    const leer=<T,>(clave:string,actual:T):T=>JSON.parse(localStorage.getItem(`${CLAVE_ALMACEN_DATOS}_${clave}`) || 'null') || actual;
    return {eventos:leer('eventos',listaEventos),bloqueos:leer('bloqueos',listaBloqueos),ocupaciones:leer('ocupaciones_internas',listaOcupacionesInternas),escaneos:leer('escaneos',bitacoraEscaneos),reservas:leer('reservaciones',listaReservaciones),espera:leer('espera',listaEspera)};
  };
  const revisarBloqueoInstitucional:ContextoDatosTipo['revisarBloqueoInstitucional']=(datos,id)=>{
    if(!usuarioActual?.roles.includes('admin')) return {error:'Solo Administración gestiona bloqueos.'};
    try {const a=leerEstadoBloqueos();const revision=revisarBloqueo(datos,a.eventos,listaRecintos,a.ocupaciones,a.bloqueos,a.escaneos,id);
      return {...revision,firma:JSON.stringify([revision.firma,a.reservas,a.espera])};
    } catch(e){return {error:e instanceof Error?e.message:'No se pudieron consultar las afectaciones.'};}
  };
  const guardarBloqueoInstitucional:ContextoDatosTipo['guardarBloqueoInstitucional']=(datos,id,version,firma)=>{
    const revision=revisarBloqueoInstitucional(datos,id);
    if(revision.error)return {exito:false,error:revision.error};
    if(!firma||firma!==revision.firma)return {exito:false,error:'ERR-TR-08 · Las afectaciones cambiaron. Revisa el resumen actualizado.'};
    try {
      const actuales=leerEstadoBloqueos(); const anterior=actuales.bloqueos.find(b=>b.id===id);
      if(id&&(!anterior||anterior.estado==='cancelado'||inicioEnMexico(anterior.fechaInicio,anterior.horaInicio)<=Date.now()||(anterior.version||1)!==version))return {exito:false,error:'ERR-TR-08 · El bloqueo cambió o ya no admite modificación.'};
      const identificador=id||'bloq-'+crypto.randomUUID();
      const ids=new Set((revision.afectados||[]).map(a=>a.idFecha));
      const nuevo:BloqueoRecinto={...datos,id:identificador,estado:'activo',version:(anterior?.version||0)+1,fechaCreacion:anterior?.fechaCreacion||new Date().toISOString(),creadoPor:anterior?.creadoPor||usuarioActual!.nombre,historial:[...(anterior?.historial||[]),{fecha:new Date().toISOString(),responsable:usuarioActual!.nombre,accion:id?'Modificación':'Registro',motivo:datos.motivo}]};
      const bloques=id?actuales.bloqueos.map(b=>b.id===id?nuevo:b):[nuevo,...actuales.bloqueos];
      const eventos=actuales.eventos.map(e=>({...e,fechas:e.fechas.map(d=>ids.has(d.id)?{...d,suspendida:true,idBloqueoSuspension:identificador,estadoInscripciones:'cerradas' as const}:d)}));
      const reservas=actuales.reservas.map(r=>ids.has(r.idFechaEvento)&&r.estado==='apartado_temporal'?{...r,estado:'cancelada' as const}:r);
      const espera=actuales.espera.map(e=>ids.has(e.idFechaEvento)&&e.estado==='notificado'?{...e,estado:'esperando' as const,fechaOferta:undefined,fechaExpiracionOferta:undefined,idReservacionOferta:undefined,idAsientoOferta:undefined,etiquetaAsientoOferta:undefined}:e);
      const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_bloqueos`]:bloques,[`${CLAVE_ALMACEN_DATOS}_eventos`]:eventos,[`${CLAVE_ALMACEN_DATOS}_reservaciones`]:reservas,[`${CLAVE_ALMACEN_DATOS}_espera`]:espera});
      if(!resultado.exito)return resultado;
      setListaBloqueos(bloques);setListaEventos(eventos);setListaReservaciones(reservas);setListaEspera(espera);
      return {exito:true,id:identificador,version:nuevo.version};
    } catch {return {exito:false,error:'No se guardó el bloqueo. Conserva el formulario e inténtalo de nuevo.'};}
  };
  const cancelarBloqueoInstitucional:ContextoDatosTipo['cancelarBloqueoInstitucional']=(id,motivo,version)=>{
    if(!usuarioActual?.roles.includes('admin')||!motivo.trim()) return {exito:false,error:'Se requiere Administración y un motivo de cancelación.'};
    try {const actuales=leerEstadoBloqueos();const b=actuales.bloqueos.find(b=>b.id===id);
      if(!b||b.estado==='cancelado'||(b.version||1)!==version||(!b.esIndefinido&&inicioEnMexico(b.fechaFin||b.fechaInicio,b.horaFin||'23:59')<=Date.now())) return {exito:false,error:'El bloqueo cambió, ya terminó o está cancelado.'};
      const nuevos=actuales.bloqueos.map(item=>item.id===id?{...item,estado:'cancelado' as const,motivoCancelacion:motivo.trim(),version:(item.version||1)+1,historial:[...(item.historial||[]),{fecha:new Date().toISOString(),responsable:usuarioActual.nombre,accion:'Cancelación',motivo:motivo.trim()}]}:item);
      const resultado=guardarLoteLocal(localStorage,{[`${CLAVE_ALMACEN_DATOS}_bloqueos`]:nuevos});if(resultado.exito)setListaBloqueos(nuevos);return resultado;
    } catch{return {exito:false,error:'No se pudo guardar la cancelación del bloqueo.'};}
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
        prepararSuspensionDemostracion,
        prepararEventoDemostracion,
        prepararSolicitudDemostracion,
        calendarioRevision,
        guardarCalendarioRevision,
        listaRecintos,
        listaOcupacionesInternas,
        listaArreglos,
        listaBloqueos,
        revisarBloqueoInstitucional,
        guardarBloqueoInstitucional,
        cancelarBloqueoInstitucional,
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
        revisarCambioRecinto,
        confirmarCambioRecinto,
        cancelarUnidadEvento,
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
