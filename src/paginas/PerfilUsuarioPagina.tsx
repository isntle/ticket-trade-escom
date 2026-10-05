import React, { useState } from 'react';
import { UserCheck, Shield, Upload, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAutenticacion } from '../contextos/AutenticacionContexto';
import { useNotificaciones } from '../contextos/NotificacionesContexto';
import { TipoAfiliacion } from '../tipos';

interface PropiedadesPerfilUsuario {
  navigate: (ruta: string) => void;
}

export const PerfilUsuarioPagina: React.FC<PropiedadesPerfilUsuario> = ({ navigate }) => {
  const { usuarioActual, actualizarPerfil, solicitarPermisoOrganizador } = useAutenticacion();
  const { mostrarNotificacion } = useNotificaciones();

  const [afiliacion, setAfiliacion] = useState<TipoAfiliacion>(usuarioActual.afiliacion);
  const [identificador, setIdentificador] = useState(
    usuarioActual.boleta || usuarioActual.numeroEmpleado || usuarioActual.nombreOrganizacion || ''
  );
  const [nombreDocumento, setNombreDocumento] = useState(usuarioActual.nombreDocumento || '');
  const [nombre, setNombre] = useState(usuarioActual.nombre);

  const manejarGuardar = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones por tipo de afiliación
    if (afiliacion === 'alumno') {
      const boletaValida = /^\d{10}$/.test(identificador.trim());
      if (!boletaValida) {
        mostrarNotificacion(
          'Boleta inválida',
          'La boleta del IPN debe contener exactamente 10 dígitos numéricos (ej: 2022630412).',
          'error'
        );
        return;
      }
    } else if (afiliacion === 'profesor') {
      if (!identificador.trim()) {
        mostrarNotificacion('Número de empleado obligatorio', 'Ingresa tu número de empleado de ESCOM/IPN.', 'error');
        return;
      }
    } else if (afiliacion === 'externo') {
      if (!identificador.trim() || !nombreDocumento.trim()) {
        mostrarNotificacion(
          'Datos de entidad externa requeridos',
          'Debes registrar la razón social de la empresa/institución y adjuntar un documento probatorio.',
          'error'
        );
        return;
      }
    }

    solicitarPermisoOrganizador(afiliacion, identificador.trim(), nombreDocumento.trim());
    actualizarPerfil({ nombre: nombre.trim() });

    mostrarNotificacion(
      'Acreditación institucional actualizada',
      'Tus datos han sido validados exitosamente y se habilitó tu capacidad de organizador.',
      'exito'
    );

    navigate('/organizador');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button
        type="button"
        onClick={() => navigate('/eventos')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la cartelera</span>
      </button>

      <div className="mb-8">
        <span className="text-[11px] font-bold text-[#7a132b] uppercase tracking-wider">
          Identidad Institucional IPN
        </span>
        <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight mt-0.5">
          Acreditación y Perfil de Usuario
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Valida tu afiliación con el Instituto Politécnico Nacional para desbloquear la gestión de eventos y recintos.
        </p>
      </div>

      <form onSubmit={manejarGuardar} className="space-y-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#7a132b]" />
            <span>Datos Personales y Correo</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Correo Institucional</label>
              <input
                type="email"
                disabled
                value={usuarioActual.correo}
                className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Afiliación Institucional */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#7a132b]" />
            <span>Afiliación y Documento Probatorio</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Tipo de Afiliación *</label>
              <select
                value={afiliacion}
                onChange={(e) => {
                  setAfiliacion(e.target.value as TipoAfiliacion);
                  setIdentificador('');
                }}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
              >
                <option value="alumno">Alumno ESCOM (Requiere Boleta)</option>
                <option value="profesor">Profesor / Docente (Requiere Número de Empleado)</option>
                <option value="administrativo">Personal Administrativo / PAE</option>
                <option value="externo">Entidad Externa / Empresa (Requiere Razón Social y Convenio)</option>
              </select>
            </div>

            {/* Campo adaptativo según la afiliación */}
            {afiliacion === 'alumno' && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Número de Boleta IPN (10 dígitos) *
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value.replace(/\D/g, ''))}
                  placeholder="ej: 2022630412"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-sm tracking-wider"
                />
              </div>
            )}

            {afiliacion === 'profesor' && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Número de Empleado Institucional *
                </label>
                <input
                  type="text"
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="ej: EMP-98214"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>
            )}

            {afiliacion === 'externo' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Razón Social de la Empresa o Fundación *
                  </label>
                  <input
                    type="text"
                    required
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    placeholder="ej: Fundación TechMX A.C."
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Documento de Validación o Convenio (PDF) *
                  </label>
                  <div className="p-4 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-neutral-400" />
                      <span className="text-neutral-600">
                        {nombreDocumento || 'convenio_ipn_techmx_2026.pdf'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNombreDocumento('convenio_probatorio_subido.pdf')}
                      className="px-3 py-1 bg-white border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Examinar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="boton-primario px-6 py-2.5 text-xs font-bold cursor-pointer shadow-xs"
          >
            Guardar Acreditación
          </button>
        </div>
      </form>
    </div>
  );
};
