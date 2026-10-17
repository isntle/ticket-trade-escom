import { VentanaModal } from "../componentes/ui/VentanaModal";
import { CalendarioRecinto } from "../componentes/calendario/CalendarioRecinto";
import {
  esFechaUrgente,
  fechaHoyMexico,
  inicioEnMexico,
  validarProgramacion,
  versionSolicitud,
} from "../dominio/solicitudes";
import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  ArrowLeft,
  FileText,
  Info,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import { useDatos } from "../contextos/DatosContexto";
import { useAutenticacion } from "../contextos/AutenticacionContexto";
import { useNotificaciones } from "../contextos/NotificacionesContexto";
import {
  ElementoFechaSolicitada,
  ModalidadAsistencia,
  VisibilidadEvento,
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
    verificarDisponibilidadRecinto,
    crearSolicitud,
    guardarBorradorSolicitud,
    actualizarSolicitud,
  } = useDatos();
  const { usuarioActual } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();
  const solicitudEnEdicion = listaSolicitudes.find(
    (solicitud) => solicitud.id === requestId,
  );

  const [versionEnEdicion] = useState(() =>
    solicitudEnEdicion ? versionSolicitud(solicitudEnEdicion) : undefined,
  );

  // Campos generales y de solicitud unificados
  const [titulo, setTitulo] = useState(
    () => solicitudEnEdicion?.tituloEvento || "",
  );
  const [descripcion, setDescripcion] = useState(
    () => solicitudEnEdicion?.descripcionEvento || "",
  );
  const [modalidad, setModalidad] = useState<ModalidadAsistencia>(
    () => solicitudEnEdicion?.modalidadAsistencia || "controlado",
  );
  const [visibilidad, setVisibilidad] = useState<VisibilidadEvento>(
    () => solicitudEnEdicion?.visibilidad || "publico",
  );
  const [asistenciaEstimada, setAsistenciaEstimada] = useState(
    () => solicitudEnEdicion?.asistenciaEstimada || 120,
  );
  const [correoContacto, setCorreoContacto] = useState(
    () => solicitudEnEdicion?.correoContacto || usuarioActual?.correo || "",
  );
  const [telefonoContacto, setTelefonoContacto] = useState(
    () =>
      solicitudEnEdicion?.telefonoContacto ||
      usuarioActual?.telefonoContacto ||
      "",
  );
  const [nombreBanner, setNombreBanner] = useState(
    () => solicitudEnEdicion?.nombreBanner || "",
  );
  const [urlImagen, setUrlImagen] = useState<string | undefined>(
    () => solicitudEnEdicion?.urlImagen,
  );
  const [errorBanner, setErrorBanner] = useState("");
  const [nombreDocumento, setNombreDocumento] = useState(
    () => solicitudEnEdicion?.nombreDocumento || "",
  );
  const [urlDocumento, setUrlDocumento] = useState<string | undefined>(
    () => solicitudEnEdicion?.urlDocumento,
  );
  const [errorDocumento, setErrorDocumento] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");
  const [resumenEnvioAbierto, setResumenEnvioAbierto] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [viaExtraordinaria, setViaExtraordinaria] = useState(() =>
    Boolean(
      solicitudEnEdicion?.esExcepcional ||
        new URLSearchParams(window.location.search).get("tipo") ===
          "extraordinaria",
    ),
  );

  // Lista unificada de días y fechas solicitadas con programa/actividad por día
  const [fechas, setFechas] = useState<ElementoFechaSolicitada[]>(
    () =>
      solicitudEnEdicion?.fechasSolicitadas || [
        {
          id: `fec-temp-1`,
          nombreDia: "Día 1",
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
            "rec-auditorio",
          actividadOPrograma: "",
        },
      ],
  );

  const [justificacionExcepcional, setJustificacionExcepcional] = useState(
    () => solicitudEnEdicion?.justificacionExcepcional || "",
  );

  const hoy = new Date();
  const cadenaHoy = fechaHoyMexico(hoy);
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
  const requiereJustificacion = viaExtraordinaria;
  const validarFormulario = (borrador: boolean): boolean => {
    const error = validarProgramacion(fechas, listaRecintos, {
      borrador,
      modalidad,
      aforo: asistenciaEstimada,
    });
    if (error) {
      setErrorFormulario(error);
      mostrarNotificacion("Revisa la programación", error, "advertencia");
      return false;
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
        id: `fec-temp-${Date.now()}`,
        nombreDia: `Día ${siguienteNumero}`,
        fecha: fechaHoyMexico(
          new Date(Date.now() + (8 + fechas.length) * 86400000),
        ),
        horaInicio: "10:00",
        horaFin: "14:00",
        idRecinto: fechas[0]?.idRecinto || "rec-auditorio",
        actividadOPrograma: "",
      },
    ]);
  };

  const eliminarDia = (id: string) => {
    if (fechas.length === 1) return;
    setFechas((previas) => {
      const filtradas = previas.filter((f) => f.id !== id);
      // Renumerar días consecutivamente (Día 1, Día 2, ...)
      return filtradas.map((item, idx) => ({
        ...item,
        nombreDia: `Día ${idx + 1}`,
      }));
    });
  };

  const actualizarFecha = (
    id: string,
    campo: keyof ElementoFechaSolicitada,
    valor: string,
  ) => {
    setFechas((previas) =>
      previas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    );
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

  const prepararBanner = async (archivo?: File) => {
    setErrorBanner("");
    if (!archivo) return;
    if (
      !["image/jpeg", "image/png"].includes(archivo.type) ||
      archivo.size > 5 * 1024 * 1024
    ) {
      setErrorBanner("Selecciona una imagen JPEG o PNG de máximo 5 MiB.");
      return;
    }
    let urlTemporal = "";
    try {
      const imagen = new Image();
      urlTemporal = URL.createObjectURL(archivo);
      imagen.src = urlTemporal;
      await new Promise<void>((resolve, reject) => {
        imagen.onload = () => resolve();
        imagen.onerror = () => reject(new Error("No se pudo leer la imagen."));
      });
      const escala = Math.min(1, 1800 / imagen.width, 1200 / imagen.height);
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.max(1, Math.round(imagen.width * escala));
      lienzo.height = Math.max(1, Math.round(imagen.height * escala));
      const contexto = lienzo.getContext("2d");
      if (!contexto) throw new Error("No se pudo preparar la vista previa.");
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, lienzo.width, lienzo.height);
      contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      const imagenOptimizada = lienzo.toDataURL("image/jpeg", 0.78);
      if (imagenOptimizada.length > 1_500_000)
        throw new Error("La imagen optimizada es demasiado grande.");
      setUrlImagen(imagenOptimizada);
      setNombreBanner(archivo.name);
    } catch {
      setErrorBanner("No se pudo procesar la imagen seleccionada.");
    } finally {
      if (urlTemporal) URL.revokeObjectURL(urlTemporal);
    }
  };

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

  const manejarEnvio = (e?: React.FormEvent, confirmado = false) => {
    e?.preventDefault();

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
        "Envía tu expediente documental y espera el dictamen de Subdirección.",
        "advertencia",
      );
      navigate("/perfil");
      return;
    }
    if (
      usuarioActual?.restriccionSolicitudesHasta &&
      usuarioActual.restriccionSolicitudesHasta >=
        new Date().toISOString().slice(0, 10)
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
      tituloEvento: titulo,
      descripcionEvento: descripcion,
      fechasSolicitadas: fechas,
      modalidadAsistencia: modalidad,
      visibilidad,
      asistenciaEstimada,
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
    let nuevaSolicitud;
    try {
      if (solicitudEnEdicion) {
        const resultado = actualizarSolicitud(
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
      } else nuevaSolicitud = crearSolicitud(datosSolicitud);
    } catch (error) {
      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud.",
      );
      return;
    }

    mostrarNotificacion(
      "Solicitud enviada a Subdirección",
      "Puedes consultar su estado y las observaciones desde Mis solicitudes.",
      "exito",
    );

    navigate(`/organizador/solicitudes/${nuevaSolicitud.id}`);
  };

  const manejarGuardarBorrador = () => {
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
      tituloEvento: titulo.trim(),
      descripcionEvento: descripcion.trim(),
      fechasSolicitadas: fechas,
      modalidadAsistencia: modalidad,
      visibilidad,
      asistenciaEstimada,
      esExcepcional: requiereJustificacion,
      justificacionExcepcional: justificacionExcepcional || undefined,
    };
    let borrador;
    try {
      if (solicitudEnEdicion) {
        const resultado = actualizarSolicitud(
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
      } else borrador = guardarBorradorSolicitud(datosBorrador);
    } catch (error) {
      setErrorFormulario(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el borrador.",
      );
      return;
    }
    mostrarNotificacion(
      "Borrador guardado",
      "Puedes consultarlo desde Mis solicitudes.",
      "exito",
    );
    navigate(`/organizador/solicitudes/${borrador.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={() => setConfirmarSalida(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al panel</span>
      </button>

      <div className="mb-8">
        <span className="text-sm font-bold text-[#7a132b]  block mb-1">
          Organización y recintos
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Solicitar evento
        </h1>
        <p className="text-sm sm:text-sm text-neutral-500 mt-1 max-w-3xl">
          Prepara la información del evento y elige los días, horarios y
          recintos. Guardar un borrador o enviar una solicitud no reserva el
          espacio.
        </p>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-8">
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
          <div className="space-y-4 text-sm">
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
                Descripción y Objetivo Académico *
              </label>
              <textarea
                aria-label="Descripción del evento"
                rows={3}
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla los objetivos, la población estudiantil a beneficiar y los temas que se abordarán..."
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
              <label className="text-sm font-semibold text-neutral-800">
                Cartel o imagen del evento (JPEG/PNG, máximo 5 MiB)
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    void prepararBanner(e.currentTarget.files?.[0]);
                  }}
                  className="mt-2 block w-full text-sm"
                />
                {nombreBanner && (
                  <span className="mt-1 block font-normal text-emerald-700">
                    Imagen lista: {nombreBanner}
                  </span>
                )}
                {errorBanner && (
                  <span
                    role="alert"
                    className="mt-1 block font-normal text-rose-700"
                  >
                    {errorBanner}
                  </span>
                )}
              </label>
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
              {urlImagen && (
                <img
                  src={urlImagen}
                  alt="Vista previa del cartel del evento"
                  className="max-h-40 w-full rounded-lg object-cover sm:col-span-2"
                />
              )}
            </div>

            {/* Parámetros integrados de asistencia, visibilidad y aforo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Modalidad de Asistencia *
                </label>
                <select
                  aria-label="Modalidad de asistencia"
                  value={modalidad}
                  onChange={(e) =>
                    setModalidad(e.target.value as ModalidadAsistencia)
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-sm focus:outline-none focus:border-[#7a132b]"
                >
                  <option value="controlado">
                    Acceso Controlado (QR con Butaca)
                  </option>
                  <option value="libre">
                    Acceso Libre (Sin boleto numerado)
                  </option>
                  <option value="registro">Registro de Asistencia</option>
                </select>
                <span className="text-sm text-neutral-400 mt-1 block">
                  Determina si se reservan butacas o es entrada general.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Visibilidad Institucional *
                </label>
                <select
                  aria-label="Visibilidad del evento"
                  value={visibilidad}
                  onChange={(e) =>
                    setVisibilidad(e.target.value as VisibilidadEvento)
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 text-sm focus:outline-none focus:border-[#7a132b]"
                >
                  <option value="publico">Público General</option>
                  <option value="interno">Solo Comunidad IPN</option>
                  <option value="privado">Privado (mediante enlace)</option>
                </select>
                <span className="text-sm text-neutral-400 mt-1 block">
                  Alcance en cartelera escolar.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Aforo solicitado (personas) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  aria-label="Aforo solicitado"
                  value={asistenciaEstimada}
                  onChange={(e) =>
                    setAsistenciaEstimada(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:border-[#7a132b]"
                />
                <span className="text-sm text-neutral-400 mt-1 block">
                  Capacidad proyectada de asistentes.
                </span>
              </div>
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
                  <span>Días, horarios y recintos</span>
                </h3>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Especifica cada día de tu evento: fecha exacta, horario de
                  inicio y fin, recinto oficial y programa planificado.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarDia}
                className="px-3.5 py-1.5 bg-[#7a132b]/10 hover:bg-[#7a132b]/20 text-[#7a132b] rounded-xl text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Día {fechas.length + 1}</span>
              </button>
            </div>

            <div className="space-y-3">
              {fechas.map((f, indice) => {
                const esFechaPasada =
                  f.fecha &&
                  inicioEnMexico(f.fecha, f.horaInicio) <= Date.now();
                const esMenor7Dias = esFechaUrgente(f);
                const etiquetaDia = f.nombreDia || `Día ${indice + 1}`;

                return (
                  <div
                    key={f.id}
                    className={`p-4 rounded-xl border transition-all ${
                      esFechaPasada
                        ? "border-rose-400 bg-rose-50"
                        : esMenor7Dias
                          ? "border-amber-300 bg-amber-50/40"
                          : "border-neutral-200 bg-neutral-50/70 hover:border-neutral-300"
                    } space-y-3 text-sm`}
                  >
                    {/* Encabezado del Día */}
                    <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#7a132b] text-white font-mono text-sm font-bold">
                          {etiquetaDia}
                        </span>
                        <span className="text-neutral-500 font-medium text-sm">
                          Día {indice + 1} del evento
                        </span>
                        {esFechaPasada && (
                          <span
                            role="alert"
                            className="rounded bg-rose-100 px-2 py-1 text-sm font-semibold text-rose-800"
                          >
                            Fecha u hora pasada: selecciona un horario futuro
                          </span>
                        )}
                        {esMenor7Dias && (
                          <span className="text-sm font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Urgente (&lt; 7 días)
                          </span>
                        )}
                      </div>

                      {fechas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => eliminarDia(f.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                          title={`Eliminar ${etiquetaDia}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Controles de Día: Fecha, Horas y Recinto */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Fecha ({etiquetaDia}) *
                        </label>
                        <input
                          type="date"
                          min={cadenaHoy}
                          aria-label={`Fecha del ${etiquetaDia}`}
                          aria-invalid={Boolean(esFechaPasada)}
                          required
                          value={f.fecha}
                          onChange={(e) =>
                            actualizarFecha(f.id, "fecha", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Hora Inicio *
                        </label>
                        <input
                          type="time"
                          required
                          aria-label={`Hora de inicio del ${etiquetaDia}`}
                          value={f.horaInicio}
                          onChange={(e) =>
                            actualizarFecha(f.id, "horaInicio", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Hora Fin *
                        </label>
                        <input
                          type="time"
                          required
                          aria-label={`Hora de término del ${etiquetaDia}`}
                          value={f.horaFin}
                          onChange={(e) =>
                            actualizarFecha(f.id, "horaFin", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Recinto Solicitado *
                        </label>
                        <select
                          aria-label={`Recinto del ${etiquetaDia}`}
                          value={f.idRecinto}
                          onChange={(e) =>
                            actualizarFecha(f.id, "idRecinto", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#7a132b]"
                        >
                          {listaRecintos
                            .filter((r) => r.activo !== false)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nombre} ({r.capacidad} cap)
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <details className="rounded-xl border border-neutral-200 bg-white p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[#7a132b]">
                        Consultar calendario del recinto
                      </summary>
                      <div className="mt-3">
                        <CalendarioRecinto
                          idRecinto={f.idRecinto}
                          fechaSeleccionada={f.fecha}
                          horaInicio={f.horaInicio}
                          horaFin={f.horaFin}
                          soloFechasFuturas
                          alSeleccionarFecha={(fecha) =>
                            actualizarFecha(f.id, "fecha", fecha)
                          }
                        />
                      </div>
                    </details>
                    {/* Programa / Actividades específicas de este día */}
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1 text-sm">
                        Programa o Actividades Previstas para {etiquetaDia}{" "}
                        (opcional)
                      </label>
                      <input
                        type="text"
                        aria-label={`Programa del ${etiquetaDia}`}
                        value={f.actividadOPrograma || ""}
                        onChange={(e) =>
                          actualizarFecha(
                            f.id,
                            "actividadOPrograma",
                            e.target.value,
                          )
                        }
                        placeholder="ej: 10:00 Conferencia inaugural, 11:30 Panel de debate, 13:00 Ronda de preguntas"
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-[#7a132b]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

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

                {!viaExtraordinaria && (
                  <button
                    type="button"
                    onClick={() => {
                      setViaExtraordinaria(true);
                      setErrorFormulario("");
                    }}
                    className="rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-bold text-amber-950"
                  >
                    Preparar solicitud extraordinaria
                  </button>
                )}
                {viaExtraordinaria && (
                  <button
                    type="button"
                    onClick={() => {
                      setViaExtraordinaria(false);
                      setErrorFormulario("");
                    }}
                    className="rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-950"
                  >
                    Volver a vía ordinaria
                  </button>
                )}
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
      </form>
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
            <h3 className="text-lg font-bold">{titulo}</h3>
            <p className="whitespace-pre-line leading-6">{descripcion}</p>
            <ul className="space-y-2">
              {fechas.map((dia, i) => (
                <li key={dia.id}>
                  <strong>{dia.nombreDia || "Día " + (i + 1)}</strong>:{" "}
                  {dia.fecha} · {dia.horaInicio}–{dia.horaFin} ·{" "}
                  {listaRecintos.find((r) => r.id === dia.idRecinto)?.nombre}
                </li>
              ))}
            </ul>
            <p>
              {asistenciaEstimada} personas ·{" "}
              {modalidad === "libre" ? "Entrada libre" : "Aforo controlado"}
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
                onClick={() => navigate("/organizador")}
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
