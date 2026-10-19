import { resolverRutaDocumentacion } from "../../dominio/navegacionDocumentacion";
import { useDatos } from "../../contextos/DatosContexto";
import { modoDemostracionActivo } from "../../dominio/demostracion";
import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Play,
  ScanLine,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAutenticacion } from "../../contextos/AutenticacionContexto";
import { useNotificaciones } from "../../contextos/NotificacionesContexto";

interface PropiedadesExploradorCasosUso {
  navegarA: (ruta: string) => void;
}

type IdSubequipo = "identidad" | "organizacion" | "taquilla" | "checkin";
type EstadoCaso = "comprobable" | "parcial" | "pendiente";

interface CasoDeUso {
  control?: string;
  respuesta?: string;
  id: string;
  nombre: string;
  actor: string;
  interfaz: string;
  descripcion: string;
  ruta?: string;
  estado?: EstadoCaso;
  usuarioDemo?: string;
  rolDemo?: "asistente" | "organizador" | "staff" | "subdireccion" | "admin";
  accesos?: Array<{
    nombre: string;
    ruta: string;
    usuario: string;
    rol: "asistente" | "organizador" | "subdireccion" | "admin";
  }>;
}

interface Subequipo {
  id: IdSubequipo;
  nombre: string;
  resumen: string;
  icono: LucideIcon;
  color: string;
  casos: CasoDeUso[];
}

export const SUBEQUIPOS: Subequipo[] = [
  {
    id: "identidad",
    nombre: "Identidad y perfiles",
    resumen: "Los 8 casos CU-ID del documento de Sprint 3.",
    icono: ShieldCheck,
    color: "text-[#7a132b] bg-[#7a132b]/10 border-[#7a132b]/20",
    casos: [
      {
        id: "CU-ID01",
        nombre: "Registrar cuenta de usuario",
        actor: "Visitante",
        interfaz: "UI-IP-02 · Registro",
        descripcion:
          "El visitante captura sus datos, elige su afiliación y crea una cuenta sin recibir automáticamente habilitación documental.",
        ruta: "/registro",
        estado: "comprobable",
        control: "Registrar cuenta",
        respuesta:
          "Valida la categoría y crea una cuenta pendiente de confirmación, sin roles operativos.",
      },
      {
        id: "CU-ID02",
        nombre: "Confirmar correo electrónico",
        actor: "Titular de cuenta",
        interfaz: "UI-IP-03 · Confirmación de correo",
        descripcion:
          "El titular solicita y captura un código de prueba. El envío real de correo requiere integración con el servidor.",
        ruta: "/confirmar-correo",
        estado: "comprobable",
        control: "Confirmar correo / Solicitar nuevo enlace",
        respuesta:
          "Consume un código vigente o informa que es inválido; limita los reenvíos.",
        usuarioDemo: "usr-estudiante-sin-confirmar",
        rolDemo: "asistente",
      },
      {
        id: "CU-ID03",
        nombre: "Iniciar y cerrar sesión",
        actor: "Visitante o usuario registrado",
        interfaz: "UI-IP-01 · Acceso",
        descripcion:
          "El usuario captura sus credenciales, accede con el rol permitido y puede cerrar la sesión activa.",
        ruta: "/login",
        estado: "comprobable",
        control: "Iniciar sesión / Cerrar sesión",
        respuesta:
          "Autentica, cuenta fallos, aplica bloqueo temporal y permite cerrar la sesión.",
      },
      {
        id: "CU-ID04",
        nombre: "Recuperar y cambiar contraseña",
        actor: "Titular de cuenta",
        interfaz: "UI-IP-04 / UI-IP-05 / UI-IP-06 · Recuperación y seguridad",
        descripcion:
          "El titular solicita un código de recuperación y define una nueva contraseña cuando el token es válido.",
        ruta: "/recuperar-password",
        estado: "comprobable",
        control: "Solicitar enlace / Validar enlace / Restablecer contraseña",
        respuesta:
          "Comprueba vigencia y uso único; cambia la contraseña e invalida sesiones anteriores.",
        accesos: [
          {
            nombre: "Cambiar contraseña desde mi perfil",
            ruta: "/perfil",
            usuario: "usr-carlos",
            rol: "asistente",
          },
        ],
      },
      {
        id: "CU-ID05",
        nombre: "Gestionar perfil y cambio de correo",
        actor: "Usuario registrado",
        interfaz: "UI-IP-07 · Mi perfil",
        descripcion:
          "El usuario consulta y edita los datos permitidos de su perfil y solicita la confirmación de un nuevo correo.",
        ruta: "/perfil",
        estado: "comprobable",
        control: "Revisar cambios / Confirmar modificación",
        respuesta:
          "Actualiza los datos permitidos y conserva el correo anterior hasta confirmar el nuevo.",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-ID06",
        nombre: "Gestionar expediente de verificación documental",
        actor: "Usuario registrado",
        interfaz: "UI-IP-08 · Mi expediente",
        descripcion:
          "El usuario integra o corrige evidencias para solicitar la revisión documental que le permite obtener facultades adicionales.",
        ruta: "/mi-expediente",
        estado: "comprobable",
        control: "Revisar expediente / Enviar a revisión",
        respuesta:
          "Valida documentos PDF y vigencia declarada, conserva la versión e informa el estado.",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-ID07",
        nombre: "Evaluar expediente y revocar/renovar verificación",
        actor: "Administrador",
        interfaz: "UI-IP-09 / UI-IP-10 · Revisión y detalle de expediente",
        descripcion:
          "Administración consulta los PDF y versiones, confirma aprobación, corrección o rechazo y puede revocar una verificación con motivo.",
        ruta: "/admin/expedientes",
        estado: "comprobable",
        control: "Ver detalle / Aprobar expediente / Confirmar decisión",
        respuesta:
          "Comprueba permiso, estado y versión; registra la decisión sin cancelar eventos o reservaciones.",
        usuarioDemo: "usr-admin",
        rolDemo: "admin",
      },
      {
        id: "CU-ID08",
        nombre: "Gestionar restricciones y asignación de roles",
        actor: "Subdirección, Administrador u Organizador",
        interfaz: "UI-IP-11 / UI-IP-12 · Restricciones y roles",
        descripcion:
          "Subdirección solicita una restricción; Administración decide su aplicación y gestiona roles y autoaprobación. El Organizador asigna Staff de sus propios eventos.",
        ruta: "/admin/restricciones",
        estado: "comprobable",
        control: "Confirmar restricción / Aceptar petición / Rechazar petición",
        respuesta:
          "Registra motivo y periodo; limita solo nuevas solicitudes y conserva historial y avisos.",
        usuarioDemo: "usr-admin",
        rolDemo: "admin",
        accesos: [
          {
            nombre: "Pedir restricción desde Subdirección",
            ruta: "/subdireccion/restricciones",
            usuario: "usr-subdireccion",
            rol: "subdireccion",
          },
          {
            nombre: "Administrar roles y autoaprobación",
            ruta: "/admin",
            usuario: "usr-admin",
            rol: "admin",
          },
          {
            nombre: "Asignar Staff de mis eventos",
            ruta: "/organizador/staff",
            usuario: "usr-silva",
            rol: "organizador",
          },
        ],
      },
    ],
  },
  {
    id: "organizacion",
    nombre: "Organización y recintos",
    resumen: "Los 27 casos CU-OR del documento de Sprint 3.",
    icono: Building2,
    color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    casos: [
      {
        id: "CU-OR-01",
        nombre: "Preparar borrador de solicitud",
        actor: "Solicitante verificado",
        interfaz: "UI.03 → UI.16 · Solicitud y expediente",
        descripcion:
          "El solicitante captura la información del evento y conserva los datos como borrador antes de enviarlos.",
        ruta: "/solicitar-evento",
        control: "Guardar borrador",
        respuesta: "Conserva el borrador y abre su detalle.",
      },
      {
        id: "CU-OR-02",
        nombre: "Consultar historial de solicitudes propias",
        actor: "Solicitante verificado",
        interfaz: "UI.02 → UI.16 · Historial y expediente",
        descripcion:
          "Consulta sus trámites, estados, versiones, observaciones y abre su detalle.",
        ruta: "/organizador",
        control: "Ver solicitud",
        respuesta: "Abre el expediente propio con estado y versiones.",
      },
      {
        id: "CU-OR-03",
        nombre: "Revisar y resolver solicitud ordinaria",
        actor: "Subdirección",
        interfaz: "UI.06 → UI.16 · Solicitudes y expediente",
        descripcion:
          "Revisa la solicitud y puede autorizarla, devolverla para corrección o rechazarla con motivo.",
        ruta: "/subdireccion",
        control:
          "Ver detalle → Revisar autorización / Pedir correcciones / Rechazar",
        respuesta:
          "Comprueba la versión y disponibilidad antes de registrar la decisión.",
      },
      {
        id: "CU-OR-04",
        nombre: "Consultar catálogo y detalle de recintos",
        actor: "Solicitante verificado",
        interfaz: "UI.14 → UI.15 · Catálogo y calendario del recinto",
        descripcion:
          "Consulta características, capacidad, distribución y disponibilidad antes de elegir un espacio.",
        ruta: "/recintos",
        control: "Seleccionar recinto → Consultar calendario",
        respuesta:
          "Muestra ubicación, capacidad, equipamiento y disponibilidad sin reservar.",
      },
      {
        id: "CU-OR-05",
        nombre: "Configurar arreglo de asientos",
        actor: "Organizador",
        interfaz: "UI.03 → UI.07 · Distribución antes del envío",
        descripcion: "Configura lugares para un día y recinto del evento.",
        ruta: "/solicitar-evento?distribucion=1",
        control: "Configurar distribución del Día 1 → Confirmar distribución del Día 1",
        respuesta: "Guarda la distribución del día seleccionado.",
      },
      {
        id: "CU-OR-06.1",
        nombre: "Enviar solicitud ordinaria",
        actor: "Solicitante verificado",
        interfaz: "UI.03 → UI.08 → UI.16 · Envío ordinario",
        descripcion:
          "Confirma el envío de la solicitud ordinaria y consulta su folio y estado.",
        ruta: "/solicitar-evento",
        control: "Revisar envío ordinario → Enviar a revisión",
        respuesta: "Valida los datos y conserva el envío inicial del trámite.",
      },
      {
        id: "CU-OR-06.2",
        nombre: "Enviar solicitud extraordinaria",
        actor: "Solicitante verificado",
        interfaz: "UI.03 → UI.08 → UI.16 · Envío extraordinario",
        descripcion:
          "Captura la justificación y confirma el envío extraordinario para revisión prioritaria.",
        ruta: "/solicitar-evento?tipo=extraordinaria",
        control:
          "Motivo de urgencia → Revisar envío extraordinario → Enviar solicitud extraordinaria",
        respuesta: "Envía la propuesta urgente sin ocupar el recinto.",
      },
      {
        id: "CU-OR-07",
        nombre: "Editar solicitud en revisión",
        actor: "Solicitante verificado",
        interfaz: "UI.16 → UI.04 · Edición de solicitud",
        descripcion:
          "Edita los datos permitidos de una solicitud en revisión y guarda la nueva versión.",
        ruta: "/organizador/solicitudes/sol-revision-ordinaria-demo",
        control: "Editar solicitud",
        respuesta: "Guarda una nueva versión sin cambiar el envío original.",
      },
      {
        id: "CU-OR-08",
        nombre: "Corregir solicitud devuelta",
        actor: "Solicitante verificado",
        interfaz: "UI.16 → UI.04 · Corrección de solicitud",
        descripcion:
          "Atiende las observaciones dentro del plazo y reenvía el trámite corregido.",
        ruta: "/organizador/solicitudes/sol-correccion-demo",
        control: "Corregir solicitud",
        respuesta: "Muestra observaciones y valida el plazo de corrección.",
      },
      {
        id: "CU-OR-09",
        nombre: "Cancelar solicitud pendiente",
        actor: "Solicitante verificado",
        interfaz: "UI.16 → UI.05 · Cancelación de solicitud",
        descripcion:
          "Confirma la cancelación de un borrador o trámite aún no resuelto.",
        ruta: "/organizador/solicitudes/sol-borrador-demo",
        control: "Cancelar solicitud → Confirmar cancelación",
        respuesta: "Conserva el trámite cancelado en su historial.",
      },
      {
        id: "CU-OR-10",
        nombre: "Atender solicitud extraordinaria",
        actor: "Subdirección",
        interfaz: "UI.06 → UI.16 · Revisión extraordinaria",
        descripcion:
          "Revisa la justificación, urgencia y disponibilidad, y emite una decisión motivada.",
        ruta: "/subdireccion",
        control: "Ver detalle → Revisar creación extraordinaria",
        respuesta:
          "Exige creación expresa por Subdirección y valida horarios y recintos.",
      },
      {
        id: "CU-OR-11",
        nombre: "Crear evento propio (Autoaprobación)",
        actor: "Subdirección",
        interfaz: "UI.17 · Creación de evento institucional",
        descripcion:
          "Registra y publica directamente un evento institucional, omitiendo la bandeja de revisión y la anticipación de 168 horas.",
        ruta: "/subdireccion?tab=evento_directo",
        control: "Crear evento y continuar",
        respuesta:
          "Valida fecha, horario y disponibilidad; abre el evento creado.",
      },
      {
        id: "CU-OR-12",
        nombre: "Aplicar excepción de anticipación",
        actor: "Subdirección",
        interfaz: "UI.20 → UI.21 · Excepción de anticipación",
        descripcion:
          "Reprograma un evento a menos de 168 horas con justificación, validación de disponibilidad y registro del motivo.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Guardar fecha, horario o recinto",
        respuesta:
          "Solicita motivo de excepción a Subdirección al cambiar el día.",
      },
      {
        id: "CU-OR-15",
        nombre: "Configurar arreglo del recinto",
        actor: "Organizador",
        interfaz:
          "UI.01 → UI.20 → UI.07 · Distribución de lugares",
        descripcion:
          "Abre un evento, selecciona una fecha y configura el arreglo de lugares correspondiente.",
        ruta: "/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos",
        control: "Crear primera distribución / Confirmar versión final",
        respuesta: "Conserva el arreglo del día y recinto.",
      },
      {
        id: "CU-OR-16",
        nombre: "Gestionar versiones de arreglos",
        actor: "Organizador",
        interfaz:
          "UI.07 · Versiones de distribución",
        descripcion:
          "Consulta el historial de arreglos guardados y revisa sus versiones desde el detalle del evento.",
        ruta: "/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos",
        control: "Duplicar distribución → Comparar Versiones",
        respuesta: "Muestra las distribuciones guardadas para compararlas.",
      },
      {
        id: "CU-OR-17",
        nombre: "Establecer versión final del arreglo",
        actor: "Organizador",
        interfaz:
          "UI.07 · Versión final de distribución",
        descripcion:
          "Selecciona una versión guardada y la establece como arreglo final vigente.",
        ruta: "/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos",
        control: "Confirmar versión final",
        respuesta: "Vincula el arreglo final al día del evento.",
      },
      {
        id: "CU-OR-18",
        nombre: "Consultar constancia operativa",
        actor: "Organizador",
        interfaz:
          "UI.20 → UI.22 · Constancia operativa",
        descripcion:
          "Desde el detalle del evento selecciona «Imprimir constancia operativa» para consultar e imprimir la constancia con sus días aprobados.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Imprimir constancia operativa",
        respuesta: "Abre la constancia imprimible con la información vigente.",
      },
      {
        id: "CU-OR-19",
        nombre: "Modificar información de un evento aprobado",
        actor: "Organizador",
        interfaz:
          "UI.20 → UI.21 · Información y confirmación",
        descripcion:
          "Edita los datos permitidos del evento y revisa los cambios antes de confirmarlos.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Revisar cambios → Confirmar cambios",
        respuesta:
          "Conserva motivo, responsable y valores anteriores y nuevos.",
      },
      {
        id: "CU-OR-20",
        nombre: "Reprogramar fecha u horario de un evento",
        actor: "Organizador o Subdirección",
        interfaz:
          "UI.20 → UI.21 · Reprogramación del día",
        descripcion:
          "Propone fecha u horario; el sistema comprueba disponibilidad y solicita confirmación o la excepción institucional correspondiente.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Guardar fecha, horario o recinto",
        respuesta: "Comprueba el nuevo horario y los conflictos.",
      },
      {
        id: "CU-OR-21",
        nombre: "Cambiar recinto de una fecha aprobada",
        actor: "Organizador",
        interfaz:
          "UI.20 → UI.21 · Cambio de recinto",
        descripcion:
          "Propone otro recinto para un día y confirma el cambio después de validar capacidad, disponibilidad y compromisos.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Seleccionar recinto → Guardar fecha, horario o recinto",
        respuesta: "Comprueba disponibilidad y aforo del recinto propuesto.",
      },
      {
        id: "CU-OR-22",
        nombre: "Retirar una fecha o sesión sin compromisos",
        actor: "Organizador",
        interfaz:
          "UI.20 → UI.21 · Retiro de día",
        descripcion:
          "Retira un día sin reservaciones ni otros compromisos, previa confirmación del cambio.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Retirar día",
        respuesta: "Solicita confirmación y registra el retiro permitido.",
      },
      {
        id: "CU-OR-23",
        nombre: "Cancelar evento aprobado",
        actor: "Organizador",
        interfaz: "UI.20 → UI.21 · Cancelación de evento",
        descripcion:
          "Desde el detalle solicita y confirma la cancelación del evento después de revisar sus afectaciones.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Cancelar evento aprobado",
        respuesta: "Solicita motivo y confirmación; conserva el historial.",
      },
      {
        id: "CU-OR-24",
        nombre: "Cancelar una fecha o sesión de un evento",
        actor: "Organizador",
        interfaz:
          "UI.20 → UI.21 · Cancelación de día",
        descripcion:
          "Cancela un día específico tras revisar sus reservaciones y boletos, conservando los demás días.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Cancelar este día",
        respuesta: "Registra la cancelación de la unidad seleccionada.",
      },
      {
        id: "CU-OR-25",
        nombre: "Resolver fecha suspendida por bloqueo institucional",
        actor: "Organizador o Subdirección",
        interfaz:
          "UI.20 → UI.21 · Resolución de día suspendido",
        descripcion:
          "Reprograma o cancela un día suspendido por un bloqueo institucional y confirma la resolución.",
        ruta: "/organizador/eventos/evt-simposio-ia",
        control: "Guardar fecha, horario o recinto / Cancelar este día",
        respuesta: "Permite atender el conflicto sin borrar el historial.",
      },
      {
        id: "CU-OR-26",
        nombre: "Administrar catálogo de recintos",
        actor: "Administrador",
        interfaz: "UI.18 · Administración de recintos",
        descripcion:
          "Registra, actualiza y activa o desactiva recintos institucionales.",
        ruta: "/admin/recintos",
        control: "Agregar recinto / Editar recinto",
        respuesta: "Muestra el catálogo administrativo al Administrador.",
      },
      {
        id: "CU-OR-27",
        nombre: "Gestionar ocupaciones internas",
        actor: "Administrador",
        interfaz: "UI.19 · Actividades internas",
        descripcion:
          "Registra y cancela actividades internas que afectan la disponibilidad de los recintos.",
        ruta: "/admin/ocupaciones",
        control: "Registrar ocupación",
        respuesta: "Comprueba superposiciones y registra la actividad interna.",
      },
      {
        id: "CU-OR-28",
        nombre: "Gestionar bloqueos institucionales",
        actor: "Administrador",
        interfaz: "UI.09 → UI.10 → UI.11 → UI.12 · Bloqueos y afectaciones",
        descripcion:
          "Registra y mantiene bloqueos institucionales, consultando el impacto en los recintos.",
        ruta: "/subdireccion?tab=bloqueos",
        control: "Registrar bloqueo → Confirmar Bloqueo",
        respuesta:
          "El Administrador registra el bloqueo; Subdirección puede consultarlo.",
      },
    ],
  },
  {
    id: "taquilla",
    nombre: "Motor de taquilla",
    resumen: "Los 9 casos CU-MT del documento de Sprint 3.",
    icono: Ticket,
    color: "text-amber-800 bg-amber-50 border-amber-200",
    casos: [
      {
        id: "CU-MT-01",
        nombre: "Explorar cartelera y consultar detalle de evento",
        actor: "Asistente o visitante",
        interfaz: "UI-10 y UI-11 · Cartelera y ficha técnica",
        descripcion:
          "El asistente explora la cartelera, filtra eventos y consulta el detalle con fechas, horarios, recintos y programa.",
        ruta: "/eventos",
        estado: "comprobable",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-MT-02",
        nombre: "Registrar intención de asistencia",
        actor: "Asistente",
        interfaz: "UI-11 · Ficha técnica del evento",
        descripcion:
          "El asistente expresa su intención de asistir un día antes de reservar un lugar, cuando el evento lo permite.",
        ruta: "/eventos/evt-simposio-ia",
        estado: "comprobable",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-MT-03",
        nombre: "Reservar lugar en un día",
        actor: "Asistente",
        interfaz: "UI-40 · Taquilla y selección de lugar",
        descripcion:
          "El asistente selecciona un lugar, obtiene un apartado temporal y confirma la reservación del día.",
        ruta: "/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1",
        estado: "comprobable",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-MT-04",
        nombre: "Participar en lista de espera",
        actor: "Asistente",
        interfaz: "UI-40 · Taquilla y selección de lugar",
        descripcion:
          "Cuando no hay lugares disponibles, el asistente se incorpora a la lista de espera desde la selección del día y consulta su posición.",
        ruta: "/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1",
        estado: "comprobable",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-MT-05",
        nombre: "Consultar mis boletos e historial",
        actor: "Asistente",
        interfaz: "UI-41 · Mis boletos digitales",
        descripcion:
          "El asistente consulta sus boletos vigentes, cancelados y el código QR de cada reservación.",
        ruta: "/mis-reservaciones",
        estado: "comprobable",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-MT-06",
        nombre: "Cancelar reservación activa",
        actor: "Asistente",
        interfaz: "UI-41 · Mis boletos digitales",
        descripcion:
          "El asistente cancela una reservación propia y libera el lugar para la disponibilidad o lista de espera.",
        ruta: "/mis-reservaciones",
        estado: "comprobable",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
      {
        id: "CU-MT-07",
        nombre: "Gestionar boletos especiales",
        actor: "Organizador",
        interfaz: "UI-62 · Gestión de boletos especiales",
        descripcion:
          "El organizador emite y puede invalidar boletos de organización, Staff o invitados VIP.",
        ruta: "/organizador/eventos/evt-simposio-ia/boletos-especiales",
        estado: "comprobable",
        usuarioDemo: "usr-silva",
        rolDemo: "organizador",
      },
      {
        id: "CU-MT-08",
        nombre: "Gestionar apertura y cierre de inscripciones",
        actor: "Organizador",
        interfaz: "UI-63 · Inscripciones por día",
        descripcion:
          "El organizador abre o cierra las inscripciones de uno o varios días del evento.",
        ruta: "/organizador/eventos/evt-simposio-ia/inscripciones",
        estado: "comprobable",
        usuarioDemo: "usr-silva",
        rolDemo: "organizador",
      },
      {
        id: "CU-MT-09",
        nombre: "Consultar panel de taquilla y participación",
        actor: "Organizador",
        interfaz: "UI-64 · Panel por día",
        descripcion:
          "El organizador consulta indicadores de taquilla y participación, desglosados por día.",
        ruta: "/organizador/eventos/evt-simposio-ia/taquilla-participacion",
        estado: "comprobable",
        usuarioDemo: "usr-silva",
        rolDemo: "organizador",
      },
    ],
  },
  {
    id: "checkin",
    nombre: "Check-in",
    resumen: "Selección del día, validación de boletos e historial de accesos.",
    icono: ScanLine,
    color: "text-emerald-800 bg-emerald-50 border-emerald-200",
    casos: [
      {
        id: "CUCI1",
        nombre: "Seleccionar sesión para control de acceso",
        actor: "Staff u Organizador",
        interfaz: "IU-CI01 · Selección de evento y día",
        descripcion:
          "El operador elige un evento autorizado y un día habilitado; el lector solo se abre durante la ventana permitida.",
        ruta: "/staff",
        estado: "comprobable",
        usuarioDemo: "usr-andrea",
        rolDemo: "staff",
      },
      {
        id: "CUCI2",
        nombre: "Registrar entrada mediante código QR",
        actor: "Staff u Organizador",
        interfaz: "IU-CI02 · Lector de boletos",
        descripcion:
          "El operador escanea el QR y el sistema valida evento, día, horario, autorización, vigencia y uso previo antes de registrar una entrada.",
        ruta: "/staff",
        estado: "comprobable",
        usuarioDemo: "usr-andrea",
        rolDemo: "staff",
      },
      {
        id: "CUCI2.1",
        nombre: "Registrar entrada mediante identificador manual",
        actor: "Staff u Organizador",
        interfaz: "IU-CI02 · Lector de boletos",
        descripcion:
          "El operador captura el identificador del boleto cuando la cámara no está disponible; el sistema aplica límites a intentos inexistentes.",
        ruta: "/staff",
        estado: "comprobable",
        usuarioDemo: "usr-andrea",
        rolDemo: "staff",
      },
      {
        id: "CUCI3",
        nombre: "Consultar historial de accesos",
        actor: "Organizador, Subdirección o Administrador",
        interfaz: "IU-CI04 · Historial de accesos",
        descripcion:
          "El actor autorizado consulta, filtra y abre el detalle de los accesos registrados, sin modificarlos.",
        ruta: "/staff/historial",
        estado: "comprobable",
        usuarioDemo: "usr-silva",
        rolDemo: "organizador",
      },
      {
        id: "CUCI4",
        nombre: "Presentar boleto en el acceso",
        actor: "Asistente",
        interfaz: "IU-CI03 · Mi boleto",
        descripcion:
          "El asistente consulta los datos vigentes y presenta el QR o identificador; el registro de entrada lo realiza el operador.",
        ruta: "/mis-reservaciones",
        estado: "comprobable",
        usuarioDemo: "usr-carlos",
        rolDemo: "asistente",
      },
    ],
  },
];

const ESCENARIOS = [
  {
    id: "A",
    titulo: "Registro y acreditación",
    descripcion:
      "Formulario con validaciones para alumnos, profesores, administrativos y externos.",
    ruta: "/perfil",
    usuario: "usr-carlos",
    rol: "asistente" as const,
  },
  {
    id: "B",
    titulo: "Solicitud excepcional",
    descripcion:
      "Solicitud con una fecha menor a siete días y justificación para Subdirección.",
    ruta: "/solicitar-evento",
    usuario: "usr-silva",
    rol: "organizador" as const,
  },
  {
    id: "C",
    titulo: "Solicitudes de Subdirección",
    descripcion: "Detalle de solicitudes, decisiones y agenda de recintos.",
    ruta: "/subdireccion",
    usuario: "usr-subdireccion",
    rol: "subdireccion" as const,
  },
  {
    id: "D",
    titulo: "Editor de distribuciones",
    descripcion: "Diseño de lugares y comparación de versiones del arreglo.",
    ruta: "/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos",
    usuario: "usr-silva",
    rol: "organizador" as const,
  },
  {
    id: "E",
    titulo: "Taquilla digital",
    descripcion: "Selección de lugar y apartado temporal de dos minutos.",
    ruta: "/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1",
    usuario: "usr-carlos",
    rol: "asistente" as const,
  },
  {
    id: "F",
    titulo: "Control de acceso",
    descripcion: "Escaneo de QR y alerta de boleto reutilizado.",
    ruta: "/staff",
    usuario: "usr-andrea",
    rol: "staff" as const,
  },
  {
    id: "G",
    titulo: "Ocupabilidad en vivo",
    descripcion: "Mapa de lugares ocupados, reservados y libres.",
    ruta: "/staff/ocupacion?eventId=evt-simposio-ia&dateId=fec-simposio-d1",
    usuario: "usr-andrea",
    rol: "staff" as const,
  },
];

const PERFILES_DEMO_ORGANIZACION: Record<
  string,
  { usuario: string; rol: NonNullable<CasoDeUso["rolDemo"]> }
> = {
  "CU-OR-01": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-02": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-03": { usuario: "usr-subdireccion", rol: "subdireccion" },
  "CU-OR-04": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-05": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-06.1": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-06.2": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-07": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-08": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-09": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-10": { usuario: "usr-subdireccion", rol: "subdireccion" },
  "CU-OR-11": { usuario: "usr-subdireccion", rol: "subdireccion" },
  "CU-OR-12": { usuario: "usr-subdireccion", rol: "subdireccion" },
  "CU-OR-15": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-16": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-17": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-18": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-19": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-20": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-21": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-22": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-23": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-24": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-25": { usuario: "usr-silva", rol: "organizador" },
  "CU-OR-26": { usuario: "usr-admin", rol: "admin" },
  "CU-OR-27": { usuario: "usr-admin", rol: "admin" },
  "CU-OR-28": { usuario: "usr-admin", rol: "admin" },
};

export const ExploradorCasosUso: React.FC<PropiedadesExploradorCasosUso> = ({
  navegarA,
}) => {
  const [estaAbierto, setEstaAbierto] = useState(false);
  const [vista, setVista] = useState<"casos" | "escenarios">("casos");
  const [subequipoActivo, setSubequipoActivo] =
    useState<IdSubequipo>("identidad");
  const [casoActivo, setCasoActivo] = useState<string | null>("CU-ID01");
  const [escenarioActivo, setEscenarioActivo] = useState<string | null>(null);
  const { cambiarUsuario, cambiarRolActivo } = useAutenticacion();
  const { listaEventos, prepararSuspensionDemostracion, prepararSolicitudDemostracion } = useDatos();
  const { mostrarNotificacion } = useNotificaciones();

  const equipo = useMemo(
    () =>
      SUBEQUIPOS.find((item) => item.id === subequipoActivo) || SUBEQUIPOS[0],
    [subequipoActivo],
  );
  const casoSeleccionado =
    equipo.casos.find((caso) => caso.id === casoActivo) || equipo.casos[0];
  const IconoEquipo = equipo.icono;

  const seleccionarSubequipo = (id: IdSubequipo) => {
    const siguiente =
      SUBEQUIPOS.find((item) => item.id === id) || SUBEQUIPOS[0];
    setSubequipoActivo(id);
    setCasoActivo(siguiente.casos[0].id);
  };

  const abrirPantalla = (caso: CasoDeUso) => {
    setCasoActivo(caso.id);
    const perfilDemo =
      caso.usuarioDemo && caso.rolDemo
        ? { usuario: caso.usuarioDemo, rol: caso.rolDemo }
        : PERFILES_DEMO_ORGANIZACION[caso.id];
    if (perfilDemo) {
      cambiarUsuario(perfilDemo.usuario);
      cambiarRolActivo(perfilDemo.rol);
    }
    if(['CU-OR-07','CU-OR-08','CU-OR-09'].includes(caso.id)){
      const resultado=prepararSolicitudDemostracion(caso.id==='CU-OR-08'?'requiere_correccion':'en_revision');
      if(!resultado.exito){mostrarNotificacion('No se preparó el escenario',resultado.error||'','error');return;}
      setEstaAbierto(false);navegarA('/organizador/solicitudes/'+resultado.id);
      mostrarNotificacion('Solicitud de demostración','Puedes seguir el recorrido desde este expediente vigente.','informacion');
      return;
    }
    if(caso.id==='CU-OR-25'){
      const resultado=prepararSuspensionDemostracion();
      if(!resultado.exito){mostrarNotificacion('No se preparó el escenario',resultado.error||'','error');return;}
      setEstaAbierto(false);navegarA('/organizador/eventos/'+resultado.id);
      mostrarNotificacion('Día suspendido de demostración','Puedes reprogramarlo o cancelarlo desde su configuración.','informacion');
      return;
    }
    if (caso.ruta) {
      setEstaAbierto(false);
      navegarA(resolverRutaDocumentacion(caso, listaEventos) || caso.ruta);
    }
    if (perfilDemo) {
      mostrarNotificacion(
        "Perfil de demostración activado",
        `${caso.actor} · ${caso.interfaz}`,
        "informacion",
      );
    }
  };

  const ejecutarEscenario = (escenario: (typeof ESCENARIOS)[number]) => {
    setEscenarioActivo(escenario.id);
    cambiarUsuario(escenario.usuario);
    cambiarRolActivo(escenario.rol);
    navegarA(escenario.ruta);
    mostrarNotificacion("Escenario activado", escenario.titulo, "informacion");
  };

  if (!modoDemostracionActivo()) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 no-print">
      {!estaAbierto ? (
        <button
          type="button"
          onClick={() => setEstaAbierto(true)}
          className="group flex items-center gap-2.5 rounded-2xl border border-[#7a132b]/20 bg-white px-3.5 py-2.5 text-left shadow-[0_12px_35px_rgba(34,24,24,0.14)] transition hover:-translate-y-0.5 hover:border-[#7a132b]/40 hover:shadow-[0_16px_38px_rgba(34,24,24,0.18)] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/15"
          aria-label="Abrir explorador de casos de uso"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7a132b] text-white">
            <BookOpen className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a132b]">
              Documentación
            </span>
            <span className="block text-xs font-semibold text-neutral-800">
              Casos de uso
            </span>
          </span>
        </button>
      ) : (
        <div className="flex max-h-[85vh] w-[min(94vw,650px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_65px_rgba(34,24,24,0.2)]">
          <div className="flex shrink-0 items-center justify-between bg-[#651127] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <BookOpen className="h-4 w-4 text-amber-200" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200">
                  Ticket Trade · ADS
                </p>
                <h2 className="truncate text-sm font-bold">
                  Explorador de casos de uso
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEstaAbierto(false)}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Cerrar explorador"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 border-b border-neutral-200 bg-neutral-50 p-1.5">
            <button
              type="button"
              onClick={() => setVista("casos")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${vista === "casos" ? "bg-white text-[#7a132b] shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Casos de uso
            </button>
            <button
              type="button"
              onClick={() => setVista("escenarios")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${vista === "escenarios" ? "bg-white text-[#7a132b] shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              <Play className="h-3.5 w-3.5" /> Escenarios de demo
            </button>
          </div>

          {vista === "casos" ? (
            <div className="grid flex-1 min-h-0 grid-cols-1 overflow-y-auto sm:grid-cols-[190px_1fr] sm:overflow-hidden">
              <aside className="border-b border-neutral-200 bg-[#fafaf9] p-2.5 sm:border-b-0 sm:border-r sm:overflow-y-auto">
                <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Subequipos
                </p>
                <div className="space-y-1">
                  {SUBEQUIPOS.map((subequipo) => {
                    const Icono = subequipo.icono;
                    const activo = subequipo.id === subequipoActivo;
                    return (
                      <button
                        type="button"
                        key={subequipo.id}
                        onClick={() => seleccionarSubequipo(subequipo.id)}
                        className={`flex w-full items-center gap-2 rounded-xl p-2 text-left transition ${activo ? "bg-white shadow-sm ring-1 ring-neutral-200" : "hover:bg-white/70"}`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${subequipo.color}`}
                        >
                          <Icono className="h-3.5 w-3.5" />
                        </span>
                        <span
                          className={`text-[11px] font-bold leading-tight ${activo ? "text-neutral-900" : "text-neutral-500"}`}
                        >
                          {subequipo.nombre}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-w-0 overflow-y-auto p-3 sm:p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${equipo.color}`}
                  >
                    <IconoEquipo className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-neutral-900">
                      {equipo.nombre}
                    </h3>
                    <p className="mt-0.5 text-xs leading-5 text-neutral-500">
                      {equipo.resumen}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {equipo.casos.map((caso) => {
                    const activo = caso.id === casoSeleccionado.id;
                    return (
                      <div
                        key={caso.id}
                        className={`rounded-xl border transition ${activo ? "border-[#7a132b]/35 bg-[#7a132b]/[0.035]" : "border-neutral-200 bg-white"}`}
                      >
                        <button
                          type="button"
                          onClick={() => setCasoActivo(caso.id)}
                          className="flex w-full items-start justify-between gap-3 p-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#7a132b]/20"
                        >
                          <span className="min-w-0">
                            <span className="mb-1 flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-[#7a132b]">
                                {caso.id}
                              </span>
                              <span className="text-xs font-bold text-neutral-900">
                                {caso.nombre}
                              </span>
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5 text-[11px] leading-4 text-neutral-500">
                              <span>{caso.interfaz}</span>
                            </span>
                          </span>
                          {activo ? (
                            <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-[#7a132b]" />
                          ) : (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                          )}
                        </button>
                        {activo && (
                          <div className="border-t border-neutral-200/80 px-3 pb-3 pt-2.5">
                            <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                              <div className="rounded-lg bg-white px-2.5 py-2">
                                <span className="block font-bold text-neutral-400">
                                  Actor
                                </span>
                                <span className="text-neutral-700">
                                  {caso.actor}
                                </span>
                              </div>
                              <div className="rounded-lg bg-white px-2.5 py-2">
                                <span className="block font-bold text-neutral-400">
                                  Pantalla relacionada
                                </span>
                                <span className="text-neutral-700">
                                  {caso.interfaz}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-neutral-600">
                              {caso.descripcion}
                            </p>
                            {caso.control && (
                              <p className="mt-3 text-sm text-neutral-700">
                                <strong>Control:</strong> {caso.control}
                              </p>
                            )}
                            {caso.respuesta && (
                              <p className="mt-2 text-sm text-neutral-700">
                                <strong>Respuesta visible:</strong>{" "}
                                {caso.respuesta}
                              </p>
                            )}
                            {caso.ruta ? (
                              <button
                                type="button"
                                onClick={() => abrirPantalla(caso)}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#7a132b] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#620f23] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/15"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Ver
                                pantalla relacionada
                              </button>
                            ) : (
                              <p className="mt-3 text-[11px] font-semibold text-neutral-500">
                                No hay una pantalla implementada para este caso.
                              </p>
                            )}
                            {caso.accesos?.map((acceso) => (
                              <button
                                key={acceso.ruta}
                                type="button"
                                className="ml-2 mt-3 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold"
                                onClick={() =>
                                  abrirPantalla({
                                    ...caso,
                                    ruta: acceso.ruta,
                                    usuarioDemo: acceso.usuario,
                                    rolDemo: acceso.rol,
                                  })
                                }
                              >
                                {acceso.nombre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <div className="flex items-center gap-2 font-bold">
                  <HelpCircle className="h-4 w-4" /> Escenarios de demostración
                </div>
                <p className="mt-1 text-amber-800/80">
                  Estos accesos preparan datos de prueba para recorrer la
                  aplicación. La documentación de casos de uso se encuentra en
                  la pestaña anterior.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ESCENARIOS.map((escenario) => (
                  <button
                    type="button"
                    key={escenario.id}
                    onClick={() => ejecutarEscenario(escenario)}
                    className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#7a132b]/35 hover:shadow-sm ${escenarioActivo === escenario.id ? "border-[#7a132b]/40 bg-[#7a132b]/[0.04]" : "border-neutral-200 bg-white"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7a132b] text-[10px] font-black text-white">
                          {escenario.id}
                        </span>
                        <span className="text-xs font-bold text-neutral-900">
                          {escenario.titulo}
                        </span>
                      </span>
                      <Play className="h-3.5 w-3.5 shrink-0 text-[#7a132b]" />
                    </span>
                    <span className="mt-2 block text-[11px] leading-4 text-neutral-500">
                      {escenario.descripcion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const GuiaDemostracion = ExploradorCasosUso;
