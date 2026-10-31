import { servicioOrganizacionLocal } from '../servicios/organizacion';
import { CATEGORIAS_EVENTO, aforoActividad, modalidadActividad, nombreActividad, validarItinerarios } from '../dominio/actividades';
import { EditorItinerarios } from '../componentes/eventos/EditorItinerarios';
import { volverA } from '../dominio/navegacion';
import { DiaSolicitud } from "../componentes/recintos/DiaSolicitud";
import { validarDistribuciones } from "../dominio/distribucionSolicitud";
import { VentanaModal } from "../componentes/ui/VentanaModal";
import { restriccionIdentidadVigente } from "../dominio/identidad";
import {
  esFechaUrgente,
  fechaHoyMexico,
  validarProgramacion,
  versionSolicitud,
} from "../dominio/solicitudes";
import React, { useState, useEffect } from "react";
import { interfazSolicitada } from "../dominio/pantallasDocumentacion";
import {
  ProgramaDia,
} from "../componentes/eventos/EditorPrograma";
import { EditorCartel } from "../componentes/eventos/EditorCartel";
import {
  Calendar,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  ArrowLeft,
  FileText,
  Info,
} from "lucide-react";
import { useDatos } from "../contextos/DatosContexto";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useNotificaciones } from "../contextos/NotificacionesContexto";
import {
  ElementoFechaSolicitada,
  ModalidadAsistencia,
  VisibilidadEvento,
  CategoriaEvento,
  ItinerarioDia,
} from "../tipos";

interface PropiedadesSolicitudEvento {
  navigate: (ruta: string) => void;
  requestId?: string;
}

export const SolicitudEventoPagina: React.FC<PropiedadesSolicitudEvento> = ({
  navigate,
  requestId,
}) => {
  const {
    listaRecintos,
    listaSolicitudes,
    crearSolicitud,
    guardarBorradorSolicitud,
    actualizarSolicitud,
    verificarDisponibilidadRecinto,
  } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const claveCaptura = `tt_solicitud_captura:${usuarioActual?.id || 'sin-sesion'}`;
  const [guardandoSolicitud, setGuardandoSolicitud] = useState(false);
  const bloqueoGuardado = React.useRef(false);
  const servicio = servicioOrganizacionLocal({crearSolicitud, guardarBorradorSolicitud, actualizarSolicitud});
  const [captura] = useState<Partial<{titulo:string;descripcion:string;categoria:CategoriaEvento;visibilidad:VisibilidadEvento;fechas:ElementoFechaSolicitada[];itinerarios:ItinerarioDia[];urlImagen:string;nombreBanner:string;correoContacto:string;telefonoContacto:string;justificacion:string;nombreDocumento:string;urlDocumento:string}>>(()=>{
    if(requestId) return {};
    try { return JSON.parse(sessionStorage.getItem(claveCaptura)||'{}'); } catch { return {}; }
  });
  const solicitudEnEdicion = listaSolicitudes.find(
    (solicitud) => solicitud.id === requestId,
  );

  const [versionEnEdicion] = useState(() =>
    solicitudEnEdicion ? versionSolicitud(solicitudEnEdicion) : undefined,
  );

  // Campos generales y de solicitud unificados
  const [titulo, setTitulo] = useState(
    () => solicitudEnEdicion?.tituloEvento || captura.titulo || "",
  );
  const [descripcion, setDescripcion] = useState(
    () => solicitudEnEdicion?.descripcionEvento || captura.descripcion || "",
  );
  const [modalidad] = useState<ModalidadAsistencia>(
    () => solicitudEnEdicion?.modalidadAsistencia || "controlado",
  );
  const [visibilidad, setVisibilidad] = useState<VisibilidadEvento>(
    () => solicitudEnEdicion?.visibilidad || captura.visibilidad || "publico",
  );
  const [asistenciaEstimada] = useState(
    () => solicitudEnEdicion?.asistenciaEstimada || 120,
  );
  const [correoContacto, setCorreoContacto] = useState(
    () => solicitudEnEdicion?.correoContacto || captura.correoContacto || usuarioActual?.correo || "",
  );
  const [telefonoContacto, setTelefonoContacto] = useState(
    () =>
      solicitudEnEdicion?.telefonoContacto || captura.telefonoContacto ||
      usuarioActual?.telefonoContacto ||
      "",
  );
  const [nombreBanner, setNombreBanner] = useState(
    () => solicitudEnEdicion?.nombreBanner || captura.nombreBanner || "",
  );
  const [urlImagen, setUrlImagen] = useState<string | undefined>(
    () => solicitudEnEdicion?.urlImagen || captura.urlImagen,
  );
  const [errorBanner, setErrorBanner] = useState("");
  const [cargandoBanner, setCargandoBanner] = useState(false);
  const [nombreDocumento, setNombreDocumento] = useState(
    () => solicitudEnEdicion?.nombreDocumento || captura.nombreDocumento || "",
  );
  const [urlDocumento, setUrlDocumento] = useState<string | undefined>(
    () => solicitudEnEdicion?.urlDocumento || captura.urlDocumento,
  );
  const [errorDocumento, setErrorDocumento] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");
  const [resumenEnvioAbierto, setResumenEnvioAbierto] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaEvento>(() => solicitudEnEdicion?.categoria || captura.categoria || (solicitudEnEdicion ? 'Académico' : 'Conferencia'));
  const [itinerarios, setItinerarios] = useState<ItinerarioDia[]>(() => solicitudEnEdicion?.itinerarios || captura.itinerarios || []);
  const [estadoItinerarios, setEstadoItinerarios] = useState<Record<string,{cargando:boolean;error:string}>>({});

  // Lista unificada de días y fechas solicitadas con programa/actividad por día
  const [fechas, setFechas] = useState<ElementoFechaSolicitada[]>(
    () =>
      solicitudEnEdicion?.fechasSolicitadas || captura.fechas || [
        {
          id: `actividad-${crypto.randomUUID()}`,
          nombreActividad: "",
          descripcionActividad: "",
          modalidadAsistencia: "controlado",
          asistenciaEstimada: 40,
          fecha: fechaHoyMexico(
            new Date(
              Date.now() +
                (new URLSearchParams(window.location.search).get("tipo") ===
                "extraordinaria"
                  ? 1
                  : 8) *
                  86400000,
            ),
          ),
          horaInicio: "10:00",
          horaFin: "14:00",
          idRecinto:
            new URLSearchParams(window.location.search).get("recinto") ||
            (new URLSearchParams(window.location.search).get("distribucion")==="1" ? "rec-auditorio" : ""),
          actividadOPrograma: "",
        },
      ],
  );

  const [justificacionExcepcional, setJustificacionExcepcional] = useState(
    () => solicitudEnEdicion?.justificacionExcepcional || captura.justificacion || "",
  );
  useEffect(()=>{
    if (requestId || !usuarioActual) return;
    try { sessionStorage.setItem(claveCaptura,JSON.stringify({titulo,descripcion,categoria,visibilidad,fechas,itinerarios,urlImagen,nombreBanner,correoContacto,telefonoContacto,justificacion:justificacionExcepcional,nombreDocumento,urlDocumento})); }
    catch { /* La captura permanece en el formulario si el navegador no dispone de espacio. */ }
  },[titulo,descripcion,categoria,visibilidad,fechas,itinerarios,urlImagen,nombreBanner,correoContacto,telefonoContacto,justificacionExcepcional,nombreDocumento,urlDocumento,claveCaptura,requestId]);
  useEffect(() => {
    if (interfazSolicitada() === "UI.08" && solicitudEnEdicion && solicitudEnEdicion.idSolicitante === usuarioActual?.id) manejarEnvio();
  }, [requestId]);

  const hoy = new Date();
  const fechasFueraDeAnticipacion = fechas.filter(
    (fecha) =>
      esFechaUrgente(fecha, hoy) &&
      (!solicitudEnEdicion ||
        solicitudEnEdicion.estado === "borrador" ||
        solicitudEnEdicion.esExcepcional ||
        !solicitudEnEdicion.fechasSolicitadas.some(
          (anterior) =>
            anterior.id === fecha.id && anterior.fecha === fecha.fecha,
        )),
  );
  const viaExtraordinaria = fechasFueraDeAnticipacion.length > 0;
  const requiereJustificacion = viaExtraordinaria;
  const validarFormulario = (borrador: boolean): boolean => {
    const estadoArchivo = Object.entries(estadoItinerarios).find(([fecha,estado]) => fechas.some(a=>a.fecha===fecha) && (estado.cargando || estado.error))?.[1];
    const errorItinerario = validarItinerarios(itinerarios,fechas);
    if (estadoArchivo || errorItinerario) { setErrorFormulario(estadoArchivo?.cargando ? 'Espera a que termine de prepararse el itinerario.' : estadoArchivo?.error || errorItinerario || 'Revisa el itinerario.'); return false; }
    if (cargandoBanner) {
      setErrorFormulario(
        "Espera a que termine de prepararse el cartel antes de guardar.",
      );
      return false;
    }
    const error = validarProgramacion(fechas, listaRecintos, {
      borrador,
      modalidad,
      aforo: asistenciaEstimada,
    });
    const errorDistribucion = !borrador ? validarDistribuciones({fechasSolicitadas:fechas,modalidadAsistencia:modalidad,asistenciaEstimada},listaRecintos) : undefined;
    if (error || errorDistribucion) {
      setErrorFormulario(error || errorDistribucion || '');
      mostrarNotificacion("Revisa la programación", error || errorDistribucion || "", "advertencia");
      return false;
    }
    if (!borrador) {
      const ocupado = fechas.find(dia => !verificarDisponibilidadRecinto(dia.idRecinto, dia.fecha, dia.horaInicio, dia.horaFin, undefined, true).disponible);
      if (ocupado) {
        setErrorFormulario(`${ocupado.nombreDia || 'Un día'} tiene un conflicto de disponibilidad. Cambia el recinto o el horario antes de enviar.`);
        return false;
      }
    }
    if (
      !borrador &&
      solicitudEnEdicion &&
      solicitudEnEdicion.estado !== "borrador" &&
      !solicitudEnEdicion.esExcepcional &&
      fechas.some((fecha) => {
        const anterior = solicitudEnEdicion.fechasSolicitadas.find(
          (item) => item.id === fecha.id,
        );
        return (
          (!anterior || anterior.fecha !== fecha.fecha) && esFechaUrgente(fecha)
        );
      })
    ) {
      setErrorFormulario(
        "Una nueva fecha de una solicitud ordinaria debe tener al menos 168 horas de anticipación.",
      );
      return false;
    }
    if (
      correoContacto.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoContacto.trim())
    ) {
      setErrorFormulario(
        "Escribe un correo de contacto válido o deja el correo de tu cuenta.",
      );
      return false;
    }
    if (
      telefonoContacto.trim() &&
      !/^[+\d][\d\s().-]{6,24}$/.test(telefonoContacto.trim())
    ) {
      setErrorFormulario(
        "Revisa el teléfono de contacto; usa números y, si aplica, la clave del país.",
      );
      return false;
    }
    setErrorFormulario("");
    return true;
  };

  const agregarDia = () => {
    const siguienteNumero = fechas.length + 1;
    setFechas((previas) => [
      ...previas,
      {
        id: `actividad-${crypto.randomUUID()}`,
        nombreActividad: "",
        descripcionActividad: "",
        modalidadAsistencia: "controlado",
        asistenciaEstimada: 40,
        fecha: fechas[fechas.length-1]?.fecha || fechaHoyMexico(new Date(Date.now()+8*86400000)),
        horaInicio: "10:00",
        horaFin: "14:00",
        idRecinto: "",
        actividadOPrograma: "",
      },
    ]);
  };

  const eliminarDia = (id: string) => {
    if (fechas.length === 1) return;
    setFechas((previas) => {
      const filtradas = previas.filter((f) => f.id !== id);
      return filtradas;
    });
  };

  const leerArchivoComoDataUrl = (archivo: File) =>
    new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () =>
        typeof lector.result === "string"
          ? resolve(lector.result)
          : reject(new Error("Archivo inválido."));
      lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
      lector.readAsDataURL(archivo);
    });

  const prepararDocumento = async (archivo?: File) => {
    setErrorDocumento("");
    if (!archivo) return;
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(archivo.type) ||
      archivo.size > 1024 * 1024
    ) {
      setErrorDocumento(
        "Selecciona un PDF, JPEG o PNG de máximo 1 MiB para conservarlo en el almacenamiento local.",
      );
      return;
    }
    try {
      setUrlDocumento(await leerArchivoComoDataUrl(archivo));
      setNombreDocumento(archivo.name);
    } catch {
      setErrorDocumento("No se pudo leer el documento seleccionado.");
    }
  };

  const manejarEnvio = async (e?: React.FormEvent, confirmado = false) => {
    e?.preventDefault();
    if (bloqueoGuardado.current) return;

    if (
      solicitudEnEdicion &&
      (!usuarioActual || solicitudEnEdicion.idSolicitante !== usuarioActual.id)
    ) {
      mostrarNotificacion(
        "Sin autorización",
        "Solo la persona solicitante puede editar este trámite.",
        "error",
      );
      navigate("/organizador");
      return;
    }
    if (
      solicitudEnEdicion &&
      !["borrador", "en_revision", "requiere_correccion"].includes(
        solicitudEnEdicion.estado,
      )
    ) {
      mostrarNotificacion(
        "Edición no disponible",
        "Este trámite ya no admite cambios.",
        "advertencia",
      );
      navigate(`/organizador/solicitudes/${solicitudEnEdicion.id}`);
      return;
    }
    if (
      solicitudEnEdicion?.estado === "requiere_correccion" &&
      solicitudEnEdicion.fechaLimiteCorreccion &&
      Date.now() > new Date(solicitudEnEdicion.fechaLimiteCorreccion).getTime()
    ) {
      mostrarNotificacion(
        "Plazo vencido",
        "El sistema cerró el trámite porque vencieron las 24 horas para corregir.",
        "error",
      );
      navigate(`/organizador/solicitudes/${solicitudEnEdicion.id}`);
      return;
    }

    if (usuarioActual && usuarioActual.correoConfirmado === false) {
      mostrarNotificacion(
        "Confirma tu correo",
        "Confirma tu correo electrónico antes de enviar solicitudes.",
        "advertencia",
      );
      navigate("/perfil");
      return;
    }
    if (usuarioActual && usuarioActual.esVerificado !== true) {
      mostrarNotificacion(
        "Verificación requerida",
        "Envía tu expediente documental y espera el dictamen de Administración.",
        "advertencia",
      );
      navigate("/perfil");
      return;
    }
    if (
      !solicitudEnEdicion &&
      usuarioActual &&
      restriccionIdentidadVigente(usuarioActual)
    ) {
      mostrarNotificacion(
        "Solicitud restringida",
        `No puedes crear solicitudes hasta ${usuarioActual.restriccionSolicitudesHasta}.`,
        "error",
      );
      return;
    }

    if (!validarFormulario(false)) return;
    if (!titulo.trim() || !descripcion.trim()) {
      mostrarNotificacion(
        "Campos incompletos",
        "Ingresa el título y la descripción del evento",
        "advertencia",
      );
      return;
    }
    if (errorBanner || errorDocumento) {
      mostrarNotificacion(
        "Revisa los archivos adjuntos",
        errorBanner || errorDocumento,
        "advertencia",
      );
      return;
    }

    if (fechasFueraDeAnticipacion.length > 0 && !viaExtraordinaria) {
      setErrorFormulario(
        "Hay fechas futuras con menos de 168 horas. Elige expresamente la vía extraordinaria o corrige la fecha.",
      );
      return;
    }
    if (viaExtraordinaria && fechasFueraDeAnticipacion.length === 0) {
      setErrorFormulario(
        "La solicitud extraordinaria debe incluir al menos una fecha futura dentro de las siguientes 168 horas. Puedes volver a la vía ordinaria.",
      );
      return;
    }
    if (requiereJustificacion && !justificacionExcepcional.trim()) {
      mostrarNotificacion(
        "Justificación obligatoria",
        "Has seleccionado al menos un día con menos de 7 días de anticipación. Debes redactar el motivo extraordinario para Subdirección.",
        "error",
      );
      return;
    }

    // Las coincidencias de ocupación se informan al capturar y se vuelven a validar
    // al autorizar. Una propuesta en revisión no reserva el recinto.

    if (!usuarioActual) {
      mostrarNotificacion(
        "Inicia Sesión",
        "Debes iniciar sesión para solicitar un evento.",
        "error",
      );
      navigate("/login");
      return;
    }

    const datosSolicitud = {
      idSolicitante: usuarioActual.id,
      nombreSolicitante: usuarioActual.nombre,
      correoSolicitante: usuarioActual.correo,
      afiliacionSolicitante: usuarioActual.afiliacion,
      identificadorSolicitante:
        usuarioActual.boleta ||
        usuarioActual.numeroEmpleado ||
        usuarioActual.nombreOrganizacion,
      correoContacto: correoContacto.trim(),
      telefonoContacto: telefonoContacto.trim(),
      nombreDocumento: nombreDocumento || undefined,
      urlDocumento,
      nombreBanner: nombreBanner || undefined,
      urlImagen,
      categoria,
      itinerarios,
      tituloEvento: titulo,
      descripcionEvento: descripcion,
      fechasSolicitadas: fechas,
      modalidadAsistencia: modalidadActividad(fechas[0],modalidad),
      visibilidad,
      asistenciaEstimada: Math.max(...fechas.map(f=>aforoActividad(f,asistenciaEstimada)||0)),
      esExcepcional: requiereJustificacion,
      justificacionExcepcional: requiereJustificacion
        ? justificacionExcepcional
        : undefined,
    };
    if (!confirmado) {
      setResumenEnvioAbierto(true);
      return;
    }
    setResumenEnvioAbierto(false);
    bloqueoGuardado.current = true; setGuardandoSolicitud(true);
    let nuevaSolicitud;
    try {
      if (solicitudEnEdicion) {
        const resultado = await servicio.actualizarSolicitud(
          solicitudEnEdicion.id,
          datosSolicitud,
          true,
          versionEnEdicion,
        );
        if (!resultado.exito) {
          setErrorFormulario(resultado.error || "No se pudo guardar.");
          return;
        }
        nuevaSolicitud = solicitudEnEdicion;
      } else nuevaSolicitud = await servicio.crearSolicitud(datosSolicitud);
    } catch (error) {
      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud.",
      );
      return;
    } finally {bloqueoGuardado.current=false;setGuardandoSolicitud(false);}

    mostrarNotificacion(
      usuarioActual.puedeAutoaprobar && !requiereJustificacion ? "Evento autorizado" : "Solicitud enviada a Subdirección",
      usuarioActual.puedeAutoaprobar && !requiereJustificacion ? "La solicitud cumple las validaciones y quedó autorizada por tu jefatura de academia. Puedes consultar el evento desde Mis eventos y solicitudes." : "Puedes consultar su estado y las observaciones desde Mis solicitudes.",
      "exito",
    );

    sessionStorage.removeItem(claveCaptura);
    navigate(`/organizador/solicitudes/${nuevaSolicitud.id}`);
  };

  const manejarGuardarBorrador = async () => {
    if (bloqueoGuardado.current) return;
    if (!usuarioActual) {
      mostrarNotificacion(
        "Inicia sesión",
        "Necesitas una cuenta para guardar un borrador.",
        "advertencia",
      );
      navigate("/login");
      return;
    }
    if (usuarioActual.esVerificado !== true) {
      mostrarNotificacion(
        "Verificación requerida",
        "La preparación de trámites está disponible para solicitantes verificados.",
        "advertencia",
      );
      navigate("/identidad/expediente");
      return;
    }
    if (
      solicitudEnEdicion &&
      solicitudEnEdicion.idSolicitante !== usuarioActual.id
    ) {
      mostrarNotificacion(
        "Sin autorización",
        "Solo la persona solicitante puede editar este borrador.",
        "error",
      );
      return;
    }
    if (!titulo.trim() || !descripcion.trim()) {
      mostrarNotificacion(
        "Completa la información básica",
        "El título y la descripción permiten identificar el borrador.",
        "advertencia",
      );
      return;
    }
    if (errorBanner || errorDocumento) {
      mostrarNotificacion(
        "Revisa los archivos adjuntos",
        errorBanner || errorDocumento,
        "advertencia",
      );
      return;
    }
    if (!validarFormulario(true)) return;
    const datosBorrador = {
      idSolicitante: usuarioActual.id,
      nombreSolicitante: usuarioActual.nombre,
      correoSolicitante: usuarioActual.correo,
      afiliacionSolicitante: usuarioActual.afiliacion,
      identificadorSolicitante:
        usuarioActual.boleta ||
        usuarioActual.numeroEmpleado ||
        usuarioActual.nombreOrganizacion,
      correoContacto: correoContacto.trim(),
      telefonoContacto: telefonoContacto.trim(),
      nombreDocumento: nombreDocumento || undefined,
      urlDocumento,
      nombreBanner: nombreBanner || undefined,
      urlImagen,
      categoria,
      itinerarios,
      tituloEvento: titulo.trim(),
      descripcionEvento: descripcion.trim(),
      fechasSolicitadas: fechas,
      modalidadAsistencia: modalidadActividad(fechas[0],modalidad),
      visibilidad,
      asistenciaEstimada: Math.max(...fechas.map(f=>aforoActividad(f,asistenciaEstimada)||0)),
      esExcepcional: requiereJustificacion,
      justificacionExcepcional: justificacionExcepcional || undefined,
    };
    bloqueoGuardado.current = true; setGuardandoSolicitud(true);
    let borrador;
    try {
      if (solicitudEnEdicion) {
        const resultado = await servicio.actualizarSolicitud(
          solicitudEnEdicion.id,
          datosBorrador,
          false,
          versionEnEdicion,
        );
        if (!resultado.exito) {
          setErrorFormulario(resultado.error || "No se pudo guardar.");
          return;
        }
        borrador = solicitudEnEdicion;
      } else borrador = await servicio.guardarBorradorSolicitud(datosBorrador);
    } catch (error) {
      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el borrador.",
      );
      return;
    } finally {bloqueoGuardado.current=false;setGuardandoSolicitud(false);}
    mostrarNotificacion(
      "Borrador guardado",
      "Puedes consultarlo desde Mis solicitudes.",
      "exito",
    );
    sessionStorage.removeItem(claveCaptura);
    navigate(`/organizador/solicitudes/${borrador.id}`);
  };

  if (!usuarioActual || !usuarioActual.correoConfirmado || !usuarioActual.esVerificado || restriccionIdentidadVigente(usuarioActual)) {
    const rutaRetorno = '/solicitar-evento';
    const correoPendiente = usuarioActual && !usuarioActual.correoConfirmado;
    const enRevision = usuarioActual?.estadoExpediente === 'en_revision';
    const restringida = usuarioActual && restriccionIdentidadVigente(usuarioActual);
    const destino = !usuarioActual ? '/login?continuar='+encodeURIComponent(rutaRetorno) : correoPendiente ? '/confirmar-correo?continuar='+encodeURIComponent(rutaRetorno) : '/identidad/expediente?continuar='+encodeURIComponent(rutaRetorno);
    return <section className="mx-auto max-w-2xl px-5 py-12"><button className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500" onClick={()=>navigate(volverA('/eventos'))}><ArrowLeft size={16}/><span>Regresar</span></button><div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-9"><h1 className="text-2xl font-bold">Solicitar nuevo evento</h1><p className="mt-4 text-neutral-600">{!usuarioActual?'Inicia sesión para preparar tu solicitud.':correoPendiente?'Primero confirma tu correo con el enlace o código de confirmación. Este paso es distinto de la revisión de tus documentos.':restringida?`Tu cuenta tiene una restricción vigente hasta ${usuarioActual.restriccionSolicitudesHasta}. ${usuarioActual.motivoRestriccion||''}`:enRevision?'Tu expediente de identidad está en revisión. Cuando se apruebe, podrás volver aquí y preparar la solicitud.':'Necesitas verificar tu identidad para solicitar un evento. Consulta los documentos que corresponden a tu perfil y envía tu expediente.'}</p><button onClick={()=>navigate(destino)} className="boton-primario mt-6 px-5 py-3">{!usuarioActual?'Iniciar sesión':correoPendiente?'Confirmar mi correo':enRevision?'Consultar mi verificación':'Ir a mi expediente'}</button><p className="mt-4 text-sm text-neutral-500">Encontrarás este acceso en la cartelera. La revisión documental y la aprobación del evento son trámites separados.</p></div></section>;
  }

  return (
    <div data-interfaz={requestId?"UI.04":"UI.03"} tabIndex={-1} className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => setConfirmarSalida(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Regresar</span>
      </button>

      <div className="mb-8">
        <span className="text-sm font-bold text-[#7a132b]  block mb-1">
          Organización y recintos
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Solicitar evento
        </h1>
        <p className="text-sm sm:text-sm text-neutral-500 mt-1 max-w-3xl">
          Prepara la información del evento y elige las fechas, horarios y
          recintos. Guardar un borrador o enviar una solicitud no reserva el
          espacio.
        </p>
      </div>

      <form onSubmit={manejarEnvio} aria-busy={guardandoSolicitud}>
        {guardandoSolicitud && <p role="status" className="mb-4 rounded-xl bg-blue-50 p-3 text-blue-900">Guardando tu solicitud. Espera la confirmación antes de salir.</p>}
        <fieldset disabled={guardandoSolicitud} className="space-y-8 min-w-0">
        {errorFormulario && (
          <div
            role="alert"
            className="sticky top-20 z-10 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800"
          >
            {errorFormulario}
          </div>
        )}
        {/* ========================================================================= */}
        {/* 1. DATOS INSTITUCIONALES DEL SOLICITANTE (Validación institucional ESCOM) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-neutral-900  flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#7a132b]" />
            <span>Datos del solicitante</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-sm text-neutral-400 block font-medium">
                Nombre del Solicitante
              </span>
              <span className="font-semibold text-neutral-900 text-sm sm:text-sm">
                {usuarioActual?.nombre || "Solicitante"}
              </span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-sm text-neutral-400 block font-medium">
                Afiliación Institucional
              </span>
              <span className="font-semibold text-neutral-900 capitalize text-sm sm:text-sm">
                {usuarioActual?.afiliacion || "Comunidad IPN"}
              </span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-sm text-neutral-400 block font-medium">
                Identificador Oficial (Boleta / Empleado / Org)
              </span>
              <span className="font-mono font-semibold text-[#7a132b] text-sm sm:text-sm">
                {usuarioActual?.boleta ||
                  usuarioActual?.numeroEmpleado ||
                  usuarioActual?.nombreOrganizacion ||
                  "Registrado"}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SECCIÓN UNIFICADA: INFORMACIÓN GENERAL, MODALIDAD, AFORO Y PROGRAMA    */}
        {/* (Unificación requerida: fecha, hora, día, recinto, modalidad, aforo, etc.) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7a132b]" />
              <span>Información del evento y programación</span>
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Completa la información del evento, el aforo y los días que
              necesitas.
            </p>
          </div>

          {/* Bloque superior: Título y Descripción */}
          <div data-interfaz="UI.08" tabIndex={-1} className="space-y-4 text-sm">
            <div>
              <label className="block font-semibold text-neutral-800 mb-1">
                Título del Evento *
              </label>
              <input
                aria-label="Título del evento"
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ej: Simposio de Robótica Móvil y Visión Artificial 2026"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm sm:text-sm focus:outline-none focus:border-[#7a132b] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-800 mb-1">
                Descripción del evento *
              </label>
              <textarea
                aria-label="Descripción del evento"
                rows={3}
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe en qué consiste el evento y a quién está dirigido..."
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm sm:text-sm focus:outline-none focus:border-[#7a132b] focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block font-semibold text-neutral-800">
                Correo de contacto del evento (opcional)
                <input
                  type="email"
                  value={correoContacto}
                  onChange={(e) => setCorreoContacto(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-normal text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                />
              </label>
              <label className="block font-semibold text-neutral-800">
                Teléfono de contacto (opcional)
                <input
                  type="tel"
                  value={telefonoContacto}
                  onChange={(e) => setTelefonoContacto(e.target.value)}
                  placeholder="Ej. 55 1234 5678"
                  className="mt-1 w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-normal text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <EditorCartel
                urlImagen={urlImagen}
                nombre={nombreBanner}
                alCambiar={(url, nombre) => {
                  setUrlImagen(url);
                  setNombreBanner(nombre);
                }}
                alCambiarEstado={({ cargando, error }) => {
                  setCargandoBanner(cargando);
                  setErrorBanner(error);
                }}
              />
              <label className="text-sm font-semibold text-neutral-800">
                Documento de respaldo (PDF/JPEG/PNG, máximo 1 MiB)
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => {
                    void prepararDocumento(e.currentTarget.files?.[0]);
                  }}
                  className="mt-2 block w-full text-sm"
                />
                {nombreDocumento && (
                  <span className="mt-1 block font-normal text-emerald-700">
                    Documento adjunto: {nombreDocumento}
                  </span>
                )}
                {errorDocumento && (
                  <span
                    role="alert"
                    className="mt-1 block font-normal text-rose-700"
                  >
                    {errorDocumento}
                  </span>
                )}
              </label>
            </div>

            <div className="grid gap-4 pt-1 sm:grid-cols-2">
              <label className="block font-semibold text-neutral-800">Categoría del evento *<select aria-label="Categoría del evento" className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm" value={categoria} onChange={e=>setCategoria(e.target.value as CategoriaEvento)}>
                {!CATEGORIAS_EVENTO.some(c=>c===categoria)&&<option value={categoria}>{categoria} (registro anterior)</option>}
                {CATEGORIAS_EVENTO.map(c=><option key={c} value={c}>{c}</option>)}
              </select><span className="mt-2 block text-xs font-normal text-neutral-500">Clasifica el evento completo. Tener varias actividades no lo convierte automáticamente en un congreso.</span></label>
              <label className="block font-semibold text-neutral-800">Visibilidad del evento *<select aria-label="Visibilidad del evento" className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm" value={visibilidad} onChange={e=>setVisibilidad(e.target.value as VisibilidadEvento)}><option value="publico">Público</option><option value="interno">Comunidad IPN</option><option value="privado">Privado, mediante enlace</option></select><span className="mt-2 block text-xs font-normal text-neutral-500">El tipo de acceso y el aforo se definen en cada actividad.</span></label>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CALENDARIO Y RECINTOS: DÍA 1, DÍA 2, DÍA 3 (Reemplazando "Jornada")       */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-neutral-900  flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#7a132b]" />
                  <span>Actividades del evento</span>
                </h3>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Añade las actividades con su fecha, recinto, horario y tipo de acceso. Puedes programar varias en el mismo día.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarDia}
                className="px-3.5 py-1.5 bg-[#7a132b]/10 hover:bg-[#7a132b]/20 text-[#7a132b] rounded-xl text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir actividad</span>
              </button>
            </div>

            <div className="space-y-5">
              {fechas.map((dia, indice) => (
                <DiaSolicitud
                  key={dia.id}
                  dia={dia}
                  otrasActividades={fechas}
                  indice={indice}
                  modalidad={modalidad}
                  aforo={asistenciaEstimada}
                  puedeEliminar={fechas.length > 1}
                  alCambiar={nuevoDia => setFechas(previas => previas.map(item => item.id === dia.id ? nuevoDia : item))}
                  alEliminar={() => eliminarDia(dia.id)}
                />
              ))}
            </div>

            <EditorItinerarios fechas={fechas.map(f=>f.fecha)} itinerarios={itinerarios} alCambiar={setItinerarios} alCambiarEstado={(fecha,estado)=>setEstadoItinerarios(prev=>({...prev,[fecha]:estado}))} />
            {/* Advertencia y Justificación Excepcional por Regla de Anticipación */}
            {(fechasFueraDeAnticipacion.length > 0 || viaExtraordinaria) && (
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-3 animate-in fade-in duration-200 mt-4">
                <div className="flex items-start gap-2.5 text-sm text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Solicitud urgente:</span> Faltan
                    menos de 168 horas para algún día solicitado. Explica por
                    qué necesitas ese plazo. Subdirección deberá revisar el
                    caso; enviarlo no reserva el recinto ni garantiza su
                    autorización.
                  </div>
                </div>

                <p className="text-sm text-amber-950">La vía extraordinaria se determina por las fechas y horas. Para preparar una solicitud ordinaria, cambia las actividades a fechas con al menos 168 horas de anticipación.</p>
                <div>
                  <label className="block font-bold text-amber-900 text-sm mb-1">
                    Motivo de urgencia *
                  </label>
                  <textarea
                    rows={3}
                    required={viaExtraordinaria}
                    value={justificacionExcepcional}
                    onChange={(e) =>
                      setJustificacionExcepcional(e.target.value)
                    }
                    placeholder="Explica la causa imprevista o urgente (ej: visita no programada de investigador internacional con aval de academia)..."
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Envío */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={manejarGuardarBorrador}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => setConfirmarSalida(true)}
            className="px-4 py-2.5 border border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="boton-primario px-6 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>
              {solicitudEnEdicion?.estado === "requiere_correccion"
                ? "Guardar corrección y reenviar"
                : solicitudEnEdicion
                  ? "Guardar y enviar cambios"
                  : viaExtraordinaria
                    ? "Revisar envío extraordinario"
                    : "Revisar envío ordinario"}
            </span>
          </button>
        </div>
      </fieldset></form>
      {resumenEnvioAbierto && (
        <VentanaModal
          estaAbierto
          alCerrar={() => setResumenEnvioAbierto(false)}
          titulo={
            viaExtraordinaria
              ? "Revisar envío extraordinario"
              : "Revisar envío de solicitud"
          }
          anchoMaximo="lg"
        >
          <div className="space-y-4 text-sm">
            {urlImagen && (
              <img
                src={urlImagen}
                alt="Vista previa del cartel antes de enviar"
                className="max-h-80 w-full rounded-xl bg-neutral-50 object-contain"
              />
            )}
            <h3 className="text-lg font-bold">{titulo}</h3>
            <p className="whitespace-pre-line leading-6">{descripcion}</p>
            <ul className="space-y-2">
              {fechas.map((dia, i) => (
                <li key={dia.id}>
                  <strong>{nombreActividad(dia,i)}</strong>:{" "}
                  {dia.fecha} · {dia.horaInicio}–{dia.horaFin} ·{" "}
                  {listaRecintos.find((r) => r.id === dia.idRecinto)?.nombre}
                  <p className="mt-1 text-neutral-600">{aforoActividad(dia,asistenciaEstimada)} personas · {modalidadActividad(dia,modalidad)==='controlado'?'Con reservación':modalidadActividad(dia,modalidad)==='registro'?'Registro de asistencia':'Entrada libre'}</p>
                  <ProgramaDia programa={dia.programa} />
                </li>
              ))}
            </ul>
            <p>
              {fechas.length} actividades · {new Set(fechas.map(f=>f.fecha)).size} {new Set(fechas.map(f=>f.fecha)).size===1?'fecha':'fechas'} · {categoria}
            </p>
            {viaExtraordinaria && (
              <p className="rounded-xl bg-amber-50 p-3 text-amber-950">
                <strong>Motivo de urgencia:</strong> {justificacionExcepcional}
              </p>
            )}
            <p>
              La propuesta pasará a revisión. Este envío no reserva el recinto
              ni publica el evento.
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setResumenEnvioAbierto(false)}
                className="rounded-xl border px-4 py-2.5 font-semibold"
              >
                Volver a editar
              </button>
              <button
                onClick={() => manejarEnvio(undefined, true)}
                className="rounded-xl bg-[#7a132b] px-4 py-2.5 font-bold text-white"
              >
                {viaExtraordinaria
                  ? "Enviar solicitud extraordinaria"
                  : "Enviar a revisión"}
              </button>
            </div>
          </div>
        </VentanaModal>
      )}
      {confirmarSalida && (
        <VentanaModal
          estaAbierto
          alCerrar={() => setConfirmarSalida(false)}
          titulo="¿Salir de la solicitud?"
          anchoMaximo="lg"
        >
          <div className="space-y-4 text-sm">
            <p>
              Los cambios que no hayas guardado se perderán. Si existe un
              borrador guardado, se conservará su última versión.
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setConfirmarSalida(false)}
                className="rounded-xl border px-4 py-2.5 font-semibold"
              >
                Continuar editando
              </button>
              <button
                onClick={() => { sessionStorage.removeItem(claveCaptura); navigate(volverA("/organizador")); }}
                className="rounded-xl bg-[#7a132b] px-4 py-2.5 font-bold text-white"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </VentanaModal>
      )}
    </div>
  );
};
