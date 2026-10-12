import React, { useState, useEffect } from 'react';

// Proveedores de Estado Global Institucional
import { ProveedorAutenticacion, useAutenticacion } from './contextos';
import { ProveedorDatos } from './contextos';
import { ProveedorNotificaciones } from './contextos';
import { ShieldAlert, ArrowLeft, UserCheck } from 'lucide-react';

// Componentes de Estructura y Navegación
import { BarraSuperior, PieDePagina, GuiaDemostracion } from './componentes';

// Páginas de los 4 Subsistemas de Ticket Trade ESCOM
import {
  CarteleraEventosPagina,
  DetalleEventoPagina,
  SeleccionAsientoPagina,
  MisBoletosPagina,
  SolicitudEventoPagina,
  DetalleSolicitudPagina,
  PanelOrganizadorPagina,
  ConfiguracionEventoPagina,
  GestionBoletosEspecialesPagina,
  EditorArreglosPagina,
  DistribucionAsientosPagina,
  PanelSubdireccionPagina,
  EscaneoStaffPagina,
  OcupabilidadVivoPagina,
  AdministracionUsuariosPagina,
  PerfilUsuarioPagina,
  AutenticacionPagina
} from './paginas';

/**
 * Componente principal de contenido y enrutador SPA
 * Maneja la navegación fluida mediante historial del navegador
 */
function ContenidoApp() {
  const [rutaActual, setRutaActual] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [parametrosBusqueda, setParametrosBusqueda] = useState<string>(() => {
    return window.location.search || '';
  });

  // Escuchar eventos de navegación del navegador (adelante / atrás)
  useEffect(() => {
    const alCambiarHistorial = () => {
      setRutaActual(window.location.pathname || '/');
      setParametrosBusqueda(window.location.search || '');
    };
    window.addEventListener('popstate', alCambiarHistorial);
    return () => window.removeEventListener('popstate', alCambiarHistorial);
  }, []);

  // Función de navegación centralizada
  const navegarA = (rutaConParametros: string) => {
    const [ruta, busqueda] = rutaConParametros.split('?');
    const nuevaBusqueda = busqueda ? `?${busqueda}` : '';
    window.history.pushState({}, '', rutaConParametros);
    setRutaActual(ruta);
    setParametrosBusqueda(nuevaBusqueda);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { usuarioActual, rolActivo, cambiarRolActivo } = useAutenticacion();

  // Parámetros de consulta (query params)
  const parametrosUrl = new URLSearchParams(parametrosBusqueda);

  // Mapeo declarativo de rutas de la aplicación
  const renderizarRuta = () => {
    // Protección de rutas administrativas para Alumnos / Asistentes
    const esRutaAdministrativa =
      rutaActual.startsWith('/organizador') ||
      rutaActual.startsWith('/subdireccion') ||
      rutaActual.startsWith('/staff') ||
      rutaActual.startsWith('/admin') ||
      rutaActual === '/distribucion' ||
      rutaActual === '/arreglos' ||
      rutaActual === '/editor-asientos' ||
      rutaActual === '/recintos/distribucion';

    if (esRutaAdministrativa && rolActivo === 'asistente') {
      const tieneRolAutorizado = usuarioActual
        ? usuarioActual.roles.some((r) =>
            ['organizador', 'subdireccion', 'staff', 'admin'].includes(r)
          )
        : false;

      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-8 sm:p-10 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center mx-auto mb-5 text-amber-700">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
              Control de Accesos ESCOM
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 mt-1 mb-3">
              Módulo Reservado para Organizadores y Personal
            </h2>
            <p className="text-sm text-neutral-600 mb-6 leading-relaxed max-w-lg mx-auto">
              La distribución física de asientos, gestión de recintos y configuraciones espaciales están
              restringidas a comités organizadores acreditados y a la Subdirección. Tu sesión activa está en modo{' '}
              <strong className="text-neutral-900 font-bold">Alumno / Asistente</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navegarA('/eventos')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Cartelera de Eventos</span>
              </button>
              {tieneRolAutorizado ? (
                <button
                  type="button"
                  onClick={() => {
                    if (usuarioActual) {
                      const primerRol = usuarioActual.roles.find((r) => r !== 'asistente');
                      if (primerRol) cambiarRolActivo(primerRol);
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#7a132b] hover:bg-[#620f23] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Cambiar a Perspectiva de Organizador</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navegarA('/perfil')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold inline-flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span>Acreditarse como Organizador</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    // -------------------------------------------------------------
    // SUBSISTEMA 03: MOTOR DE TAQUILLA Y CARTELERA DE ASISTENTE
    // -------------------------------------------------------------
    if (rutaActual === '/' || rutaActual === '/eventos') {
      return <CarteleraEventosPagina navigate={navegarA} />;
    }

    if (rutaActual.match(/^\/eventos\/[^/]+\/reservar$/)) {
      const segmentos = rutaActual.split('/');
      const idEvento = segmentos[2];
      const idFecha = parametrosUrl.get('dateId') || '';
      return <SeleccionAsientoPagina eventId={idEvento} dateId={idFecha} navigate={navegarA} />;
    }

    if (rutaActual.startsWith('/eventos/')) {
      const segmentos = rutaActual.split('/');
      const idEvento = segmentos[2];
      const claveAcceso = parametrosUrl.get('key') || undefined;
      return <DetalleEventoPagina eventId={idEvento} accessKey={claveAcceso} navigate={navegarA} />;
    }

    if (rutaActual === '/mis-reservaciones') {
      return <MisBoletosPagina navigate={navegarA} />;
    }

    // -------------------------------------------------------------
    // SUBSISTEMA 02: ORGANIZACIÓN, RECINTOS Y ARREGLOS
    // -------------------------------------------------------------
    if (rutaActual === '/solicitar-evento' || rutaActual === '/organizador/solicitudes/nueva') {
      return <SolicitudEventoPagina navigate={navegarA} />;
    }

    if (rutaActual.startsWith('/organizador/solicitudes/')) {
      const segmentos = rutaActual.split('/');
      const idSolicitud = segmentos[3];
      return <DetalleSolicitudPagina requestId={idSolicitud} navigate={navegarA} />;
    }

    if (rutaActual.match(/^\/organizador\/eventos\/[^/]+\/fechas\/[^/]+\/arreglos$/)) {
      const segmentos = rutaActual.split('/');
      const idEvento = segmentos[3];
      const idFecha = segmentos[5];
      return <EditorArreglosPagina eventId={idEvento} dateId={idFecha} navigate={navegarA} />;
    }

    if (rutaActual.match(/^\/organizador\/eventos\/[^/]+\/boletos-especiales$/)) {
      const segmentos = rutaActual.split('/');
      const idEvento = segmentos[3];
      return <GestionBoletosEspecialesPagina eventId={idEvento} navigate={navegarA} />;
    }

    if (
      rutaActual === '/distribucion' ||
      rutaActual === '/arreglos' ||
      rutaActual === '/editor-asientos' ||
      rutaActual === '/recintos/distribucion'
    ) {
      return <DistribucionAsientosPagina navigate={navegarA} />;
    }

    if (rutaActual.startsWith('/organizador/eventos/')) {
      const segmentos = rutaActual.split('/');
      const idEvento = segmentos[3];
      return <ConfiguracionEventoPagina eventId={idEvento} navigate={navegarA} />;
    }

    if (rutaActual === '/organizador' || rutaActual === '/organizador/eventos') {
      return <PanelOrganizadorPagina navigate={navegarA} />;
    }

    // Operaciones Institucionales de Subdirección
    if (rutaActual.startsWith('/subdireccion')) {
      return <PanelSubdireccionPagina navigate={navegarA} />;
    }

    // -------------------------------------------------------------
    // SUBSISTEMA 04: CONTROL DE ACCESO (CHECK-IN) Y OCUPABILIDAD
    // -------------------------------------------------------------
    if (rutaActual === '/staff' || rutaActual === '/staff/checkin') {
      return <EscaneoStaffPagina navigate={navegarA} />;
    }

    if (rutaActual.startsWith('/staff/ocupacion')) {
      const idEvento = parametrosUrl.get('eventId') || undefined;
      const idFecha = parametrosUrl.get('dateId') || undefined;
      return <OcupabilidadVivoPagina navigate={navegarA} initialEventId={idEvento} initialDateId={idFecha} />;
    }

    // -------------------------------------------------------------
    // SUBSISTEMA 01: IDENTIDAD, PERFILES Y ADMINISTRACIÓN TÉCNICA
    // -------------------------------------------------------------
    if (rutaActual.startsWith('/admin')) {
      return <AdministracionUsuariosPagina navigate={navegarA} />;
    }

    if (rutaActual === '/perfil' || rutaActual === '/mi-cuenta') {
      return <PerfilUsuarioPagina navigate={navegarA} />;
    }

    if (rutaActual === '/login') {
      return <AutenticacionPagina view="login" navigate={navegarA} />;
    }
    if (rutaActual === '/registro') {
      return <AutenticacionPagina view="registro" navigate={navegarA} />;
    }
    if (rutaActual === '/recuperar-password') {
      return <AutenticacionPagina view="recuperar" navigate={navegarA} />;
    }

    // Ruta por defecto: Cartelera general de eventos
    return <CarteleraEventosPagina navigate={navegarA} />;
  };

  const esRutaAutenticacion = ['/login', '/registro', '/recuperar-password'].includes(rutaActual);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-neutral-900 selection:bg-[#7a132b]/15 selection:text-[#7a132b]">
      {!esRutaAutenticacion && <BarraSuperior rutaActual={rutaActual} navegarA={navegarA} />}

      {/* Contenedor Dinámico de la Página */}
      <main className={esRutaAutenticacion ? 'min-h-screen' : 'flex-1'}>
        {renderizarRuta()}
      </main>

      {!esRutaAutenticacion && (
        <>
          {/* Pie de Página Institucional ESCOM */}
          <PieDePagina />

          {/* Guía Flotante de Demostración para Evaluación de los 7 Escenarios */}
          <GuiaDemostracion navegarA={navegarA} />
        </>
      )}
    </div>
  );
}

/**
 * Punto de entrada con proveedores de contexto institucional anidados
 */
export default function App() {
  return (
    <ProveedorNotificaciones>
      <ProveedorAutenticacion>
        <ProveedorDatos>
          <ContenidoApp />
        </ProveedorDatos>
      </ProveedorAutenticacion>
    </ProveedorNotificaciones>
  );
}
