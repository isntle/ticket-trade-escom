import React, { useMemo, useState } from 'react';
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
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAutenticacion } from '../../contextos/AutenticacionContexto';
import { useNotificaciones } from '../../contextos/NotificacionesContexto';

interface PropiedadesExploradorCasosUso {
  navegarA: (ruta: string) => void;
}

type IdSubequipo = 'identidad' | 'organizacion' | 'taquilla' | 'checkin';
type EstadoCaso = 'comprobable' | 'parcial' | 'pendiente';

interface CasoDeUso {
  id: string;
  nombre: string;
  actor: string;
  interfaz: string;
  descripcion: string;
  ruta?: string;
  estado?: EstadoCaso;
}

interface Subequipo {
  id: IdSubequipo;
  nombre: string;
  resumen: string;
  icono: LucideIcon;
  color: string;
  casos: CasoDeUso[];
}

/* Catálogo anterior conservado temporalmente como referencia histórica.
const SUBEQUIPOS_ANTERIOR: Subequipo[] = [
  {
    id: 'identidad',
    nombre: 'Identidad y perfiles',
    resumen: 'Cuentas, acreditaciones, acceso y permisos institucionales.',
    icono: ShieldCheck,
    color: 'text-[#7a132b] bg-[#7a132b]/10 border-[#7a132b]/20',
    casos: [
      {
        id: 'CU-AUT-01',
        nombre: 'Iniciar sesión',
        actor: 'Usuario registrado',
        interfaz: 'UI-01 · Inicio de Sesión Institucional',
        descripcion: 'El usuario captura sus credenciales institucionales y accede al sistema según sus permisos.',
        ruta: '/login'
      },
      {
        id: 'CU-AUT-02',
        nombre: 'Registrar usuario',
        actor: 'Alumno, profesor o externo',
        interfaz: 'UI-02 · Registro y Acreditación',
        descripcion: 'El visitante crea una cuenta y proporciona la información necesaria para identificar su afiliación.',
        ruta: '/registro'
      },
      {
        id: 'CU-AUT-03',
        nombre: 'Acreditar perfil',
        actor: 'Usuario registrado',
        interfaz: 'UI-02 · Registro y Acreditación',
        descripcion: 'El usuario consulta y completa los datos de su perfil institucional para solicitar facultades adicionales.',
        ruta: '/perfil'
      },
      {
        id: 'CU-AUT-04',
        nombre: 'Recuperar contraseña',
        actor: 'Usuario registrado',
        interfaz: 'UI-03 · Recuperación de Acceso',
        descripcion: 'El usuario solicita recuperar su acceso y establece una nueva contraseña mediante el flujo de verificación.',
        ruta: '/recuperar-password'
      },
      {
        id: 'CU-ADM-01',
        nombre: 'Administrar cuentas y roles',
        actor: 'Administrador TI',
        interfaz: 'UI-70 · Administración Técnica de Usuarios',
        descripcion: 'El administrador consulta cuentas, asigna roles, activa o suspende usuarios y relaciona Staff con eventos.',
        ruta: '/admin'
      }
    ]
  },
  {
    id: 'organizacion',
    nombre: 'Organización y recintos',
    resumen: 'Solicitudes, dictámenes, agenda, recintos y distribución de lugares.',
    icono: Building2,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    casos: [
      {
        id: 'CU-ORG-01',
        nombre: 'Solicitar evento y recinto',
        actor: 'Organizador',
        interfaz: 'UI-20 · Solicitud Formal de Evento',
        descripcion: 'El organizador registra la información general del evento y solicita fechas, horarios y recintos.',
        ruta: '/solicitar-evento'
      },
      {
        id: 'CU-ORG-02',
        nombre: 'Consultar estado de solicitud',
        actor: 'Organizador o Subdirección',
        interfaz: 'UI-21 · Detalle y Dictamen de Solicitud',
        descripcion: 'El actor consulta el avance, los datos enviados y el dictamen asociado a una solicitud.',
        ruta: '/organizador/solicitudes/sol-simposio-ia'
      },
      {
        id: 'CU-ORG-03',
        nombre: 'Gestionar eventos propios',
        actor: 'Organizador',
        interfaz: 'UI-30 · Panel de Organización',
        descripcion: 'El organizador consulta sus eventos y entra a las herramientas de configuración y distribución.',
        ruta: '/organizador'
      },
      {
        id: 'CU-ORG-04',
        nombre: 'Configurar evento',
        actor: 'Organizador',
        interfaz: 'UI-31 · Configuración y Checklist de Evento',
        descripcion: 'El organizador revisa fechas, recintos y requisitos antes de publicar su evento.',
        ruta: '/organizador/eventos/evt-taller-devops-config'
      },
      {
        id: 'CU-ORG-05',
        nombre: 'Diseñar distribución de lugares',
        actor: 'Organizador',
        interfaz: 'UI-35 · Editor de Distribución de Lugares',
        descripcion: 'El organizador configura la distribución del recinto y clasifica los lugares para su evento.',
        ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos'
      },
      {
        id: 'CU-ORG-06',
        nombre: 'Comparar distribuciones',
        actor: 'Organizador',
        interfaz: 'UI-36 · Comparador Visual de Arreglos',
        descripcion: 'El organizador compara dos versiones de una distribución antes de conservar la versión elegida.',
        ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos'
      },
      {
        id: 'CU-SUB-01',
        nombre: 'Dictaminar solicitudes',
        actor: 'Subdirección',
        interfaz: 'UI-50 · Bandeja de Dictamen de Subdirección',
        descripcion: 'Subdirección revisa solicitudes y registra una autorización o rechazo con el motivo correspondiente.',
        ruta: '/subdireccion'
      },
      {
        id: 'CU-SUB-02',
        nombre: 'Consultar agenda multi-recinto',
        actor: 'Subdirección u Organizador',
        interfaz: 'UI-51 · Agenda Multi-Recinto de Ocupación',
        descripcion: 'El actor consulta la disponibilidad cruzada de fechas y recintos para detectar conflictos.',
        ruta: '/subdireccion?tab=agenda'
      },
      {
        id: 'CU-SUB-03',
        nombre: 'Administrar bloqueos',
        actor: 'Subdirección',
        interfaz: 'UI-52 · Gestión de Bloqueos Extraordinarios',
        descripcion: 'Subdirección registra o consulta bloqueos temporales de los recintos institucionales.',
        ruta: '/subdireccion?tab=bloqueos'
      },
      {
        id: 'CU-SUB-04',
        nombre: 'Crear evento oficial directo',
        actor: 'Subdirección',
        interfaz: 'UI-53 · Creación Directa de Evento Oficial',
        descripcion: 'Subdirección registra un evento oficial sin pasar por una solicitud ordinaria.',
        ruta: '/subdireccion?tab=evento_directo'
      }
    ]
  },
  {
    id: 'taquilla',
    nombre: 'Motor de taquilla',
    resumen: 'Cartelera, detalle de eventos, reservaciones y boletos digitales.',
    icono: Ticket,
    color: 'text-amber-800 bg-amber-50 border-amber-200',
    casos: [
      {
        id: 'CU-TAQ-01',
        nombre: 'Consultar cartelera',
        actor: 'Asistente o comunidad',
        interfaz: 'UI-10 · Cartelera General de Eventos',
        descripcion: 'El asistente consulta los eventos publicados y utiliza filtros para encontrar una actividad.',
        ruta: '/eventos'
      },
      {
        id: 'CU-TAQ-02',
        nombre: 'Ver detalle de evento',
        actor: 'Asistente u Organizador',
        interfaz: 'UI-11 · Ficha Técnica del Evento',
        descripcion: 'El usuario revisa descripción, ponentes, fechas, horarios, recinto y programa del evento.',
        ruta: '/eventos/evt-simposio-ia'
      },
      {
        id: 'CU-TAQ-03',
        nombre: 'Apartar y reservar lugar',
        actor: 'Asistente',
        interfaz: 'UI-40 · Taquilla y Selección de Lugar',
        descripcion: 'El asistente selecciona un lugar, cuenta con un apartado temporal y confirma su reservación.',
        ruta: '/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1'
      },
      {
        id: 'CU-TAQ-04',
        nombre: 'Consultar y cancelar boletos',
        actor: 'Asistente',
        interfaz: 'UI-41 · Mis Boletos Digitales',
        descripcion: 'El asistente consulta sus boletos digitales, visualiza el código QR y puede cancelar una reservación propia.',
        ruta: '/mis-reservaciones'
      }
    ]
  },
  {
    id: 'checkin',
    nombre: 'Check-in',
    resumen: 'Validación de boletos y seguimiento de ocupabilidad durante el evento.',
    icono: ScanLine,
    color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    casos: [
      {
        id: 'CU-STF-01',
        nombre: 'Controlar acceso en puerta',
        actor: 'Staff de acceso',
        interfaz: 'UI-60 · Escáner de Acceso Mobile-First',
        descripcion: 'El Staff valida el código QR y recibe el resultado de acceso válido, cancelado o reutilizado.',
        ruta: '/staff'
      },
      {
        id: 'CU-STF-02',
        nombre: 'Monitorear ocupabilidad en tiempo real',
        actor: 'Staff u Organizador',
        interfaz: 'UI-61 · Monitor de Ocupabilidad en Vivo',
        descripcion: 'El actor consulta el estado de ocupación del recinto durante el desarrollo del evento.',
        ruta: '/staff/ocupacion?eventId=evt-simposio-ia&dateId=fec-simposio-d1'
      }
    ]
  }
];

*/

const SUBEQUIPOS: Subequipo[] = [
  {
    id: 'identidad',
    nombre: 'Identidad y perfiles',
    resumen: 'Los 8 casos CU-ID del documento de Sprint 3.',
    icono: ShieldCheck,
    color: 'text-[#7a132b] bg-[#7a132b]/10 border-[#7a132b]/20',
    casos: [
      { id: 'CU-ID01', nombre: 'Registrar cuenta de usuario', actor: 'Visitante', interfaz: 'UI-02 · Registro y acreditación', descripcion: 'El visitante captura sus datos, elige su afiliación y crea una cuenta sin recibir automáticamente habilitación documental.', ruta: '/registro', estado: 'parcial' },
      { id: 'CU-ID02', nombre: 'Confirmar correo electrónico', actor: 'Titular de cuenta', interfaz: 'UI-02 · Registro y acreditación', descripcion: 'El titular valida el token de confirmación y puede solicitar un reenvío dentro de los límites establecidos.', ruta: '/registro', estado: 'pendiente' },
      { id: 'CU-ID03', nombre: 'Iniciar y cerrar sesión', actor: 'Visitante o usuario registrado', interfaz: 'UI-01 · Inicio de sesión institucional', descripcion: 'El usuario captura sus credenciales, accede con el rol permitido y puede cerrar la sesión activa.', ruta: '/login', estado: 'parcial' },
      { id: 'CU-ID04', nombre: 'Recuperar y cambiar contraseña', actor: 'Titular de cuenta', interfaz: 'UI-03 · Recuperación de acceso', descripcion: 'El titular solicita un código de recuperación y define una nueva contraseña cuando el token es válido.', ruta: '/recuperar-password', estado: 'parcial' },
      { id: 'CU-ID05', nombre: 'Gestionar perfil y cambio de correo', actor: 'Usuario registrado', interfaz: 'UI-04 · Perfil de usuario', descripcion: 'El usuario consulta y edita los datos permitidos de su perfil y solicita la confirmación de un nuevo correo.', ruta: '/perfil', estado: 'parcial' },
      { id: 'CU-ID06', nombre: 'Gestionar expediente de verificación documental', actor: 'Usuario registrado', interfaz: 'UI-04 · Perfil de usuario', descripcion: 'El usuario integra o corrige evidencias para solicitar la revisión documental que le permite obtener facultades adicionales.', ruta: '/perfil', estado: 'pendiente' },
      { id: 'CU-ID07', nombre: 'Evaluar expediente y revocar o renovar verificación', actor: 'Subdirección', interfaz: 'UI-05 · Revisión de expedientes', descripcion: 'Subdirección revisa evidencias, registra un dictamen y puede revocar o renovar una verificación con motivo.', ruta: '/subdireccion', estado: 'pendiente' },
      { id: 'CU-ID08', nombre: 'Gestionar restricciones y asignación de roles', actor: 'Subdirección o Administrador', interfaz: 'UI-70 · Administración técnica de usuarios', descripcion: 'El actor autorizado restringe solicitudes o administra roles, estado de cuenta y asociación de Staff a eventos.', ruta: '/admin', estado: 'comprobable' }
    ]
  },
  {
    id: 'organizacion',
    nombre: 'Organización y recintos',
    resumen: 'Los 27 casos CU-OR del documento de Sprint 3.',
    icono: Building2,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    casos: [
      { id: 'CU-OR-01', nombre: 'Preparar borrador de solicitud', actor: 'Organizador', interfaz: 'UI-20 · Solicitud formal de evento', descripcion: 'El organizador captura los datos del evento, sesiones, horarios y recintos para preparar un borrador.', ruta: '/solicitar-evento', estado: 'comprobable' },
      { id: 'CU-OR-02', nombre: 'Consultar historial de solicitudes propias', actor: 'Organizador', interfaz: 'UI-21 · Detalle y dictamen de solicitud', descripcion: 'El organizador consulta las solicitudes que ha creado y abre el detalle de una de ellas.', ruta: '/organizador', estado: 'parcial' },
      { id: 'CU-OR-03', nombre: 'Revisar y resolver solicitud ordinaria', actor: 'Subdirección', interfaz: 'UI-50 · Bandeja de dictamen de Subdirección', descripcion: 'Subdirección revisa una solicitud ordinaria y registra el dictamen correspondiente.', ruta: '/subdireccion', estado: 'comprobable' },
      { id: 'CU-OR-04', nombre: 'Consultar catálogo y detalle de recintos', actor: 'Organizador', interfaz: 'UI-20 · Selector y disponibilidad de recintos', descripcion: 'El organizador consulta los recintos disponibles, sus características y la ocupación para elegir uno compatible.', ruta: '/solicitar-evento', estado: 'parcial' },
      { id: 'CU-OR-05', nombre: 'Configurar arreglo de asientos', actor: 'Organizador', interfaz: 'UI-35 · Editor de distribución de lugares', descripcion: 'El organizador configura el arreglo de lugares asociado a una fecha y recinto.', ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos', estado: 'comprobable' },
      { id: 'CU-OR-06.1', nombre: 'Enviar solicitud ordinaria', actor: 'Organizador', interfaz: 'UI-20 · Solicitud formal de evento', descripcion: 'El organizador valida el borrador y envía una solicitud ordinaria para revisión institucional.', ruta: '/solicitar-evento', estado: 'parcial' },
      { id: 'CU-OR-06.2', nombre: 'Enviar solicitud extraordinaria', actor: 'Organizador', interfaz: 'UI-20 · Solicitud formal de evento', descripcion: 'El organizador envía una solicitud extraordinaria con la justificación obligatoria cuando no cumple la anticipación requerida.', ruta: '/solicitar-evento', estado: 'parcial' },
      { id: 'CU-OR-07', nombre: 'Editar solicitud en revisión', actor: 'Organizador', interfaz: 'UI-21 · Detalle y dictamen de solicitud', descripcion: 'El organizador consulta una solicitud en revisión y edita los datos que todavía pueden modificarse.', ruta: '/organizador/solicitudes/sol-simposio-ia', estado: 'parcial' },
      { id: 'CU-OR-08', nombre: 'Corregir solicitud devuelta', actor: 'Organizador', interfaz: 'UI-21 · Detalle y dictamen de solicitud', descripcion: 'El organizador revisa las observaciones de devolución y corrige la solicitud antes de reenviarla.', ruta: '/organizador/solicitudes/sol-simposio-ia', estado: 'pendiente' },
      { id: 'CU-OR-09', nombre: 'Cancelar solicitud pendiente', actor: 'Organizador', interfaz: 'UI-21 · Detalle y dictamen de solicitud', descripcion: 'El organizador solicita la cancelación de una solicitud que todavía no ha sido resuelta.', ruta: '/organizador/solicitudes/sol-simposio-ia', estado: 'pendiente' },
      { id: 'CU-OR-10', nombre: 'Atender solicitud extraordinaria', actor: 'Subdirección', interfaz: 'UI-50 · Bandeja de dictamen de Subdirección', descripcion: 'Subdirección revisa una solicitud extraordinaria y registra la decisión institucional con su justificación.', ruta: '/subdireccion', estado: 'parcial' },
      { id: 'CU-OR-11', nombre: 'Crear evento propio con autoaprobación', actor: 'Organizador verificado', interfaz: 'UI-30 · Panel de organización', descripcion: 'El organizador verificado crea un evento propio cuando las reglas de autoaprobación lo permiten.', ruta: '/organizador', estado: 'pendiente' },
      { id: 'CU-OR-12', nombre: 'Aplicar excepción de anticipación', actor: 'Subdirección', interfaz: 'UI-53 · Creación directa de evento oficial', descripcion: 'Subdirección registra una excepción motivada a la regla de anticipación de una solicitud.', ruta: '/subdireccion?tab=evento_directo', estado: 'pendiente' },
      { id: 'CU-OR-15', nombre: 'Configurar arreglo del recinto', actor: 'Organizador', interfaz: 'UI-35 · Editor de distribución de lugares', descripcion: 'El organizador modifica la distribución de lugares del recinto para una fecha concreta.', ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos', estado: 'comprobable' },
      { id: 'CU-OR-16', nombre: 'Gestionar versiones de arreglos', actor: 'Organizador', interfaz: 'UI-35 · Editor de distribución de lugares', descripcion: 'El organizador consulta y administra las versiones guardadas de un arreglo.', ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos', estado: 'parcial' },
      { id: 'CU-OR-17', nombre: 'Establecer versión final del arreglo', actor: 'Organizador', interfaz: 'UI-35 · Editor de distribución de lugares', descripcion: 'El organizador valida y confirma una versión final de lugares para habilitar el acceso controlado.', ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos', estado: 'comprobable' },
      { id: 'CU-OR-18', nombre: 'Consultar constancia operativa', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador consulta la constancia y el estado operativo de un evento aprobado.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'parcial' },
      { id: 'CU-OR-19', nombre: 'Modificar información de un evento aprobado', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador modifica la información permitida de un evento aprobado respetando sus restricciones.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'parcial' },
      { id: 'CU-OR-20', nombre: 'Reprogramar fecha u horario de un evento', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador propone un cambio de fecha u horario y el sistema valida sus restricciones.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'pendiente' },
      { id: 'CU-OR-21', nombre: 'Cambiar recinto de una fecha aprobada', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador propone otro recinto para una fecha aprobada y el sistema verifica disponibilidad y compatibilidad.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'pendiente' },
      { id: 'CU-OR-22', nombre: 'Retirar una fecha o sesión sin compromisos', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador retira una fecha o sesión cuando no existen reservaciones o compromisos que lo impidan.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'pendiente' },
      { id: 'CU-OR-23', nombre: 'Cancelar evento aprobado', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador inicia la cancelación de un evento aprobado y el sistema aplica las reglas de afectación.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'pendiente' },
      { id: 'CU-OR-24', nombre: 'Cancelar una fecha o sesión de un evento', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador cancela una sola fecha o sesión y el sistema conserva las demás cuando corresponde.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'pendiente' },
      { id: 'CU-OR-25', nombre: 'Resolver fecha suspendida por bloqueo institucional', actor: 'Organizador o Subdirección', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El actor autorizado revisa una fecha suspendida y registra una resolución compatible con el bloqueo institucional.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'pendiente' },
      { id: 'CU-OR-26', nombre: 'Administrar catálogo de recintos', actor: 'Administrador o Subdirección', interfaz: 'UI-20 · Catálogo y disponibilidad de recintos', descripcion: 'El actor autorizado administra los datos, capacidad y estado operativo de los recintos.', ruta: '/solicitar-evento', estado: 'pendiente' },
      { id: 'CU-OR-27', nombre: 'Gestionar ocupaciones internas', actor: 'Subdirección', interfaz: 'UI-51 · Agenda multi-recinto de ocupación', descripcion: 'Subdirección registra y consulta ocupaciones internas que afectan la disponibilidad de los recintos.', ruta: '/subdireccion?tab=agenda', estado: 'parcial' },
      { id: 'CU-OR-28', nombre: 'Gestionar bloqueos institucionales', actor: 'Subdirección', interfaz: 'UI-52 · Gestión de bloqueos extraordinarios', descripcion: 'Subdirección crea, consulta y mantiene bloqueos institucionales de recintos.', ruta: '/subdireccion?tab=bloqueos', estado: 'comprobable' }
    ]
  },
  {
    id: 'taquilla',
    nombre: 'Motor de taquilla',
    resumen: 'Los 9 casos CU-MT del documento de Sprint 3.',
    icono: Ticket,
    color: 'text-amber-800 bg-amber-50 border-amber-200',
    casos: [
      { id: 'CU-MT-01', nombre: 'Explorar cartelera y consultar detalle de evento', actor: 'Asistente o visitante', interfaz: 'UI-10 y UI-11 · Cartelera y ficha técnica', descripcion: 'El asistente explora la cartelera, filtra eventos y consulta el detalle con fechas, horarios, recintos y programa.', ruta: '/eventos', estado: 'comprobable' },
      { id: 'CU-MT-02', nombre: 'Registrar intención de asistencia', actor: 'Asistente', interfaz: 'UI-11 · Ficha técnica del evento', descripcion: 'El asistente expresa su intención de asistir a una sesión antes de reservar un lugar, cuando el evento lo permite.', ruta: '/eventos/evt-simposio-ia', estado: 'pendiente' },
      { id: 'CU-MT-03', nombre: 'Reservar lugar en sesión', actor: 'Asistente', interfaz: 'UI-40 · Taquilla y selección de lugar', descripcion: 'El asistente selecciona un lugar, obtiene un apartado temporal y confirma la reservación de la sesión.', ruta: '/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1', estado: 'comprobable' },
      { id: 'CU-MT-04', nombre: 'Participar en lista de espera', actor: 'Asistente', interfaz: 'UI-11 · Ficha técnica del evento', descripcion: 'El asistente se incorpora a la lista de espera cuando una sesión no tiene cupo y consulta su posición.', ruta: '/eventos/evt-simposio-ia', estado: 'pendiente' },
      { id: 'CU-MT-05', nombre: 'Consultar mis boletos e historial', actor: 'Asistente', interfaz: 'UI-41 · Mis boletos digitales', descripcion: 'El asistente consulta sus boletos vigentes, cancelados y el código QR de cada reservación.', ruta: '/mis-reservaciones', estado: 'comprobable' },
      { id: 'CU-MT-06', nombre: 'Cancelar reservación activa', actor: 'Asistente', interfaz: 'UI-41 · Mis boletos digitales', descripcion: 'El asistente cancela una reservación propia y libera el lugar para la disponibilidad o lista de espera.', ruta: '/mis-reservaciones', estado: 'comprobable' },
      { id: 'CU-MT-07', nombre: 'Gestionar boletos especiales', actor: 'Organizador, Staff o VIP', interfaz: 'UI-30 · Panel de organización', descripcion: 'El personal autorizado administra boletos especiales para organizadores, Staff o invitados VIP.', ruta: '/organizador', estado: 'pendiente' },
      { id: 'CU-MT-08', nombre: 'Gestionar apertura y cierre de inscripciones', actor: 'Organizador', interfaz: 'UI-31 · Configuración y checklist de evento', descripcion: 'El organizador configura las condiciones y el periodo de apertura o cierre de inscripciones.', ruta: '/organizador/eventos/evt-taller-devops-config', estado: 'parcial' },
      { id: 'CU-MT-09', nombre: 'Consultar panel de taquilla y participación', actor: 'Organizador', interfaz: 'UI-30 · Panel de organización', descripcion: 'El organizador consulta indicadores de reservaciones, participación y lista de espera de sus eventos.', ruta: '/organizador', estado: 'pendiente' }
    ]
  },
  {
    id: 'checkin',
    nombre: 'Check-in',
    resumen: 'Los 5 casos CUCI del documento de Sprint 3.',
    icono: ScanLine,
    color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    casos: [
      { id: 'CUCI1', nombre: 'Seleccionar sesión para control de acceso', actor: 'Staff u Organizador', interfaz: 'UI-60 · Escáner de acceso', descripcion: 'El operador selecciona el evento y la sesión que quedarán asociadas al lector de acceso.', ruta: '/staff', estado: 'comprobable' },
      { id: 'CUCI2', nombre: 'Registrar entrada mediante código QR', actor: 'Staff u Organizador', interfaz: 'UI-60 · Escáner de acceso', descripcion: 'El operador valida el QR, comprueba que el boleto sea vigente y registra la entrada una sola vez.', ruta: '/staff', estado: 'parcial' },
      { id: 'CUCI2.1', nombre: 'Registrar entrada mediante identificador manual', actor: 'Staff u Organizador', interfaz: 'UI-60 · Escáner de acceso', descripcion: 'El operador captura manualmente el identificador impreso cuando la lectura de cámara no está disponible.', ruta: '/staff', estado: 'comprobable' },
      { id: 'CUCI3', nombre: 'Consultar historial de accesos', actor: 'Organizador, Subdirección o Administrador', interfaz: 'UI-61 · Monitor de ocupabilidad', descripcion: 'El actor autorizado consulta el historial de entradas registradas para auditar la asistencia del evento.', ruta: '/staff/ocupacion?eventId=evt-simposio-ia&dateId=fec-simposio-d1', estado: 'pendiente' },
      { id: 'CUCI4', nombre: 'Presentar boleto en el acceso', actor: 'Asistente', interfaz: 'UI-41 · Mis boletos digitales', descripcion: 'El asistente consulta y presenta el QR o identificador de su boleto; el registro lo realiza el operador.', ruta: '/mis-reservaciones', estado: 'comprobable' }
    ]
  }
];

const ESCENARIOS = [
  { id: 'A', titulo: 'Registro y acreditación', descripcion: 'Formulario con validaciones para alumnos, profesores, administrativos y externos.', ruta: '/perfil', usuario: 'usr-carlos', rol: 'asistente' as const },
  { id: 'B', titulo: 'Solicitud excepcional', descripcion: 'Solicitud con una fecha menor a siete días y justificación para Subdirección.', ruta: '/solicitar-evento', usuario: 'usr-silva', rol: 'organizador' as const },
  { id: 'C', titulo: 'Dictamen de Subdirección', descripcion: 'Bandeja de revisión, autorización y bloqueo de recintos.', ruta: '/subdireccion', usuario: 'usr-subdireccion', rol: 'subdireccion' as const },
  { id: 'D', titulo: 'Editor de distribuciones', descripcion: 'Diseño de lugares y comparación de versiones del arreglo.', ruta: '/organizador/eventos/evt-taller-devops-config/fechas/fec-devops-d1/arreglos', usuario: 'usr-silva', rol: 'organizador' as const },
  { id: 'E', titulo: 'Taquilla digital', descripcion: 'Selección de lugar y apartado temporal de diez minutos.', ruta: '/eventos/evt-simposio-ia/reservar?dateId=fec-simposio-d1', usuario: 'usr-carlos', rol: 'asistente' as const },
  { id: 'F', titulo: 'Control de acceso', descripcion: 'Escaneo de QR y alerta de boleto reutilizado.', ruta: '/staff', usuario: 'usr-andrea', rol: 'staff' as const },
  { id: 'G', titulo: 'Ocupabilidad en vivo', descripcion: 'Mapa de lugares ocupados, reservados y libres.', ruta: '/staff/ocupacion?eventId=evt-simposio-ia&dateId=fec-simposio-d1', usuario: 'usr-andrea', rol: 'staff' as const }
];

export const ExploradorCasosUso: React.FC<PropiedadesExploradorCasosUso> = ({ navegarA }) => {
  const [estaAbierto, setEstaAbierto] = useState(false);
  const [vista, setVista] = useState<'casos' | 'escenarios'>('casos');
  const [subequipoActivo, setSubequipoActivo] = useState<IdSubequipo>('identidad');
  const [casoActivo, setCasoActivo] = useState<string | null>('CU-ID01');
  const [escenarioActivo, setEscenarioActivo] = useState<string | null>(null);
  const { cambiarUsuario, cambiarRolActivo } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const equipo = useMemo(
    () => SUBEQUIPOS.find((item) => item.id === subequipoActivo) || SUBEQUIPOS[0],
    [subequipoActivo]
  );
  const casoSeleccionado = equipo.casos.find((caso) => caso.id === casoActivo) || equipo.casos[0];
  const IconoEquipo = equipo.icono;

  const seleccionarSubequipo = (id: IdSubequipo) => {
    const siguiente = SUBEQUIPOS.find((item) => item.id === id) || SUBEQUIPOS[0];
    setSubequipoActivo(id);
    setCasoActivo(siguiente.casos[0].id);
  };

  const abrirPantalla = (caso: CasoDeUso) => {
    setCasoActivo(caso.id);
    if (caso.ruta) {
      navegarA(caso.ruta);
    }
  };

  const ejecutarEscenario = (escenario: (typeof ESCENARIOS)[number]) => {
    setEscenarioActivo(escenario.id);
    cambiarUsuario(escenario.usuario);
    cambiarRolActivo(escenario.rol);
    navegarA(escenario.ruta);
    mostrarNotificacion('Escenario activado', escenario.titulo, 'informacion');
  };

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
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a132b]">Documentación</span>
            <span className="block text-xs font-semibold text-neutral-800">Casos de uso</span>
          </span>
        </button>
      ) : (
        <div className="w-[min(94vw,650px)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_65px_rgba(34,24,24,0.2)]">
          <div className="flex items-center justify-between bg-[#651127] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <BookOpen className="h-4 w-4 text-amber-200" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200">Ticket Trade · ADS</p>
                <h2 className="truncate text-sm font-bold">Explorador de casos de uso</h2>
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

          <div className="flex border-b border-neutral-200 bg-neutral-50 p-1.5">
            <button
              type="button"
              onClick={() => setVista('casos')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${vista === 'casos' ? 'bg-white text-[#7a132b] shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Casos de uso
            </button>
            <button
              type="button"
              onClick={() => setVista('escenarios')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${vista === 'escenarios' ? 'bg-white text-[#7a132b] shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              <Play className="h-3.5 w-3.5" /> Escenarios de demo
            </button>
          </div>

          {vista === 'casos' ? (
            <div className="grid max-h-[72vh] min-h-[430px] grid-cols-1 sm:grid-cols-[190px_1fr]">
              <aside className="border-b border-neutral-200 bg-[#fafaf9] p-2.5 sm:border-b-0 sm:border-r">
                <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Subequipos</p>
                <div className="space-y-1">
                  {SUBEQUIPOS.map((subequipo) => {
                    const Icono = subequipo.icono;
                    const activo = subequipo.id === subequipoActivo;
                    return (
                      <button
                        type="button"
                        key={subequipo.id}
                        onClick={() => seleccionarSubequipo(subequipo.id)}
                        className={`flex w-full items-center gap-2 rounded-xl p-2 text-left transition ${activo ? 'bg-white shadow-sm ring-1 ring-neutral-200' : 'hover:bg-white/70'}`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${subequipo.color}`}>
                          <Icono className="h-3.5 w-3.5" />
                        </span>
                        <span className={`text-[11px] font-bold leading-tight ${activo ? 'text-neutral-900' : 'text-neutral-500'}`}>{subequipo.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-w-0 overflow-y-auto p-3 sm:p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${equipo.color}`}>
                    <IconoEquipo className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-neutral-900">{equipo.nombre}</h3>
                    <p className="mt-0.5 text-xs leading-5 text-neutral-500">{equipo.resumen}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {equipo.casos.map((caso) => {
                    const activo = caso.id === casoSeleccionado.id;
                    const etiquetaEstado = caso.estado === 'comprobable'
                      ? 'Comprobable'
                      : caso.estado === 'parcial'
                      ? 'Parcial'
                      : 'Pendiente';
                    const colorEstado = caso.estado === 'comprobable'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : caso.estado === 'parcial'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200';
                    return (
                      <div key={caso.id} className={`rounded-xl border transition ${activo ? 'border-[#7a132b]/35 bg-[#7a132b]/[0.035]' : 'border-neutral-200 bg-white'}`}>
                        <button
                          type="button"
                          onClick={() => setCasoActivo(caso.id)}
                          className="flex w-full items-start justify-between gap-3 p-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#7a132b]/20"
                        >
                          <span className="min-w-0">
                            <span className="mb-1 flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-[#7a132b]">{caso.id}</span>
                              <span className="text-xs font-bold text-neutral-900">{caso.nombre}</span>
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5 text-[11px] leading-4 text-neutral-500">
                              <span>{caso.interfaz}</span>
                              <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${colorEstado}`}>
                                {etiquetaEstado}
                              </span>
                            </span>
                          </span>
                          {activo ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-[#7a132b]" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />}
                        </button>
                        {activo && (
                          <div className="border-t border-neutral-200/80 px-3 pb-3 pt-2.5">
                            <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                              <div className="rounded-lg bg-white px-2.5 py-2"><span className="block font-bold text-neutral-400">Actor</span><span className="text-neutral-700">{caso.actor}</span></div>
                              <div className="rounded-lg bg-white px-2.5 py-2"><span className="block font-bold text-neutral-400">Pantalla relacionada</span><span className="text-neutral-700">{caso.interfaz}</span></div>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-neutral-600">{caso.descripcion}</p>
                            {caso.ruta ? (
                              <button
                                type="button"
                                onClick={() => abrirPantalla(caso)}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#7a132b] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#620f23] focus:outline-none focus:ring-4 focus:ring-[#7a132b]/15"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Ver pantalla relacionada
                              </button>
                            ) : (
                              <p className="mt-3 text-[11px] font-semibold text-neutral-500">No hay una pantalla implementada para este caso.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="max-h-[72vh] overflow-y-auto p-3 sm:p-4">
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <div className="flex items-center gap-2 font-bold"><HelpCircle className="h-4 w-4" /> Escenarios de demostración</div>
                <p className="mt-1 text-amber-800/80">Estos accesos preparan datos de prueba para recorrer la aplicación. La documentación de casos de uso se encuentra en la pestaña anterior.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ESCENARIOS.map((escenario) => (
                  <button
                    type="button"
                    key={escenario.id}
                    onClick={() => ejecutarEscenario(escenario)}
                    className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#7a132b]/35 hover:shadow-sm ${escenarioActivo === escenario.id ? 'border-[#7a132b]/40 bg-[#7a132b]/[0.04]' : 'border-neutral-200 bg-white'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7a132b] text-[10px] font-black text-white">{escenario.id}</span><span className="text-xs font-bold text-neutral-900">{escenario.titulo}</span></span>
                      <Play className="h-3.5 w-3.5 shrink-0 text-[#7a132b]" />
                    </span>
                    <span className="mt-2 block text-[11px] leading-4 text-neutral-500">{escenario.descripcion}</span>
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
