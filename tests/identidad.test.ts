import { lugaresDelRecinto } from "../src/dominio/distribucionSolicitud";
import { RECINTOS_INICIALES } from "../src/datos/datosIniciales";
import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  ProveedorAutenticacion,
  useAutenticacion,
} from "../src/contextos/AutenticacionContexto";
import {
  USUARIOS_INICIALES,
  EVENTOS_INICIALES,
} from "../src/datos/datosIniciales";
import type { DocumentoIdentidad, Usuario } from "../src/tipos";
import {
  boletaIdentidadValida,
  generarTokenIdentidad,
  MENSAJE_RECUPERACION,
  MINUTO,
  puedeAsignarStaff,
  restriccionIdentidadVigente,
  sesionIdentidadVigente,
  siguienteFalloIdentidad,
  validarDominioIdentidad,
  validarExpedienteIdentidad,
  verificacionIdentidadVigente,
} from "../src/dominio/identidad";
import { SUBEQUIPOS } from "../src/componentes/demostracion/ExploradorCasosUso";
import { validarDocumentoIdentidad } from "../src/utilidades/documentosIdentidad";
import { readFile } from "node:fs/promises";
import { ProveedorDatos, useDatos } from "../src/contextos/DatosContexto";
import { SOLICITUDES_INICIALES } from "../src/datos/datosIniciales";
import {
  validarBoletaIPN,
  validarCorreoInstitucional,
} from "../src/utilidades/validaciones";

class AlmacenPrueba {
  datos = new Map<string, string>();
  getItem(k: string) {
    return this.datos.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v);
  }
  removeItem(k: string) {
    this.datos.delete(k);
  }
}
let auth: ReturnType<typeof useAutenticacion>;
function capturar() {
  auth = useAutenticacion();
  return null;
}
function preparar(id = "usr-carlos", cambios: Partial<Usuario> = {}) {
  const local = new AlmacenPrueba(),
    sesion = new AlmacenPrueba();
  Object.assign(globalThis, {
    localStorage: local,
    sessionStorage: sesion,
    window: { location: { search: "", hostname: "localhost" } },
  });
  const cuentas = structuredClone(USUARIOS_INICIALES).map((u) =>
    u.id === id ? { ...u, ...cambios } : u,
  );
  const cuenta = cuentas.find((u) => u.id === id)!;
  local.setItem("tt_usuarios_sistema_v2", JSON.stringify(cuentas));
  local.setItem(
    "tt_datos_almacen_escom_v7_eventos",
    JSON.stringify(EVENTOS_INICIALES),
  );
  local.setItem("tt_rol_activo_v2", cuenta.rolActivo);
  const t = Date.now();
  sesion.setItem(
    "tt_sesion_identidad_v3",
    JSON.stringify({
      id: "sesion-prueba",
      usuario: id,
      inicio: t,
      actividad: t,
      version: cuenta.versionCredenciales || 0,
    }),
  );
  renderToString(
    React.createElement(
      ProveedorAutenticacion,
      null,
      React.createElement(capturar),
    ),
  );
  return {
    local,
    sesion,
    leer: () =>
      JSON.parse(local.getItem("tt_usuarios_sistema_v2")!) as Usuario[],
  };
}
const documento: DocumentoIdentidad = {
  id: "pdf-prueba",
  nombre: "constancia.pdf",
  tipo: "constancia",
  tamano: 200,
  fechaEmision: "2026-10-01",
  periodo: "periodo de prueba",
  periodoActual: true,
};
test("dominios y boletas coinciden con RF: no acepta subdominios ni sufijos engañosos", () => {
  assert.ok(boletaIdentidadValida("PE12345678"));
  assert.ok(boletaIdentidadValida("PP12345678"));
  assert.ok(boletaIdentidadValida("2026630123"));
  assert.ok(!boletaIdentidadValida("PE123"));
  assert.ok(validarDominioIdentidad("a@alumno.ipn.mx", "alumno"));
  assert.ok(!validarDominioIdentidad("a@ipn.mx.ejemplo.com", "profesor"));
  assert.ok(!validarDominioIdentidad("a@escom.ipn.mx", "profesor"));
  assert.ok(!validarDominioIdentidad("a@ipn.mx", "alumno"));
  assert.ok(validarDominioIdentidad("a@ejemplo.com", "externo"));
});
test("registro externo básico no exige empresa ni concede roles; el representante sí exige entidad y cargo", () => {
  const p = preparar();
  assert.equal(
    auth.registrarUsuario({
      nombre: "Persona prueba",
      correo: " NUEVA@ejemplo.com ",
      password: "Password123!",
      afiliacion: "externo",
    }).exito,
    true,
  );
  const nueva = p.leer().find((u) => u.correo === "nueva@ejemplo.com")!;
  assert.deepEqual(nueva.roles, ["asistente"]);
  assert.equal(nueva.esVerificado, false);
  assert.equal(nueva.correoConfirmado, false);
  assert.equal(
    auth.registrarUsuario({
      nombre: "Otra",
      correo: "otra@ejemplo.com",
      password: "Password123!",
      afiliacion: "externo",
      tipoExterno: "representante",
    }).exito,
    false,
  );
  assert.equal(
    auth.registrarUsuario({
      nombre: "Duplicada",
      correo: "NUEVA@ejemplo.com",
      password: "Password123!",
      afiliacion: "externo",
    }).exito,
    false,
  );
});
test("confirmación usa token aleatorio, no se consume vacío y es de un solo uso", () => {
  preparar();
  const r = auth.registrarUsuario({
    nombre: "Prueba",
    correo: "confirmar@ejemplo.com",
    password: "Password123!",
    afiliacion: "externo",
  });
  assert.ok(r.codigoPrueba);
  assert.equal(r.codigoPrueba!.length, 64);
  assert.equal(auth.confirmarCorreo("").exito, false);
  assert.equal(auth.confirmarCorreo(r.codigoPrueba!).exito, true);
  assert.equal(auth.confirmarCorreo(r.codigoPrueba!).exito, false);
  assert.notEqual(generarTokenIdentidad(), generarTokenIdentidad());
});
test("no permite iniciar sesión sin contraseña; quinto fallo bloquea e invalida sesiones anteriores", () => {
  const p = preparar();
  const u = p.leer().find((u) => u.id === "usr-carlos")!;
  assert.equal(auth.iniciarSesion(u.correo).exito, false);
  for (let i = 0; i < 4; i++) auth.iniciarSesion(u.correo, "incorrecta");
  const bloqueada = p.leer().find((u) => u.id === "usr-carlos")!;
  assert.ok(bloqueada.bloqueadaLoginHasta! > Date.now());
  assert.equal(bloqueada.versionCredenciales, 1);
  assert.equal(auth.iniciarSesion(u.correo, u.password).exito, false);
});
test("ventana móvil elimina fallos antiguos y sesiones vencen a 60 minutos o 12 horas", () => {
  const u = { ...USUARIOS_INICIALES[0], fallosLogin: [0, 1] },
    t = 100 * MINUTO;
  assert.deepEqual(siguienteFalloIdentidad(u, t).fallosLogin, [t]);
  const s = { id: "s", usuario: u.id, inicio: t, actividad: t, version: 0 };
  assert.equal(sesionIdentidadVigente(s, u, t + 60 * MINUTO), false);
  assert.equal(
    sesionIdentidadVigente(
      { ...s, actividad: t + 12 * 60 * MINUTO - 1 },
      u,
      t + 12 * 60 * MINUTO,
    ),
    false,
  );
  assert.equal(
    sesionIdentidadVigente(s, { ...u, versionCredenciales: 1 }, t),
    false,
  );
});
test("recuperación responde uniformemente; caduca a 15 minutos y cambio revoca sesión", () => {
  const p = preparar();
  const u = p.leer().find((u) => u.id === "usr-carlos")!;
  const r = auth.solicitarRecuperacionPassword(u.correo);
  assert.equal(r.mensaje, MENSAJE_RECUPERACION);
  assert.equal(
    auth.solicitarRecuperacionPassword("inexistente@ejemplo.com").mensaje,
    r.mensaje,
  );
  const cuenta = p.leer().find((c) => c.id === u.id)!;
  assert.ok(cuenta.tokenExpiracion! <= Date.now() + 15 * MINUTO);
  assert.equal(
    auth.cambiarPassword("incorrecta", "Nueva123!", "Nueva123!").exito,
    false,
  );
  assert.equal(
    auth.restablecerPasswordConToken(r.codigoPrueba!, "Nueva123!").exito,
    true,
  );
  assert.equal(p.sesion.getItem("tt_sesion_identidad_v3"), null);
  assert.equal(
    auth.restablecerPasswordConToken(r.codigoPrueba!, "Otra123!").exito,
    false,
  );
});
test("perfil no puede elevar roles ni editar a otros; cambiar nombre exige nueva revisión", () => {
  const p = preparar("usr-carlos", { esVerificado: true });
  assert.equal(
    auth.actualizarPerfil("usr-admin", { nombre: "No" }).exito,
    false,
  );
  assert.equal(
    auth.actualizarPerfil("usr-carlos", { roles: ["admin"] }).exito,
    false,
  );
  assert.equal(
    auth.actualizarPerfil("usr-carlos", { nombre: "Nombre nuevo" }, 99).exito,
    false,
  );
  assert.equal(
    auth.actualizarPerfil(
      "usr-carlos",
      { nombre: "Nombre nuevo" },
      auth.usuarioActual!.versionIdentidad || 0,
    ).exito,
    true,
  );
  const u = p.leer().find((c) => c.id === "usr-carlos")!;
  assert.equal(u.esVerificado, false);
  assert.equal(u.estadoExpediente, "requiere_correccion");
});
test("cambio de correo conserva el anterior hasta confirmar y comprueba dominio y reenvío", () => {
  const p = preparar("usr-carlos", { esVerificado: true });
  const anterior = p.leer().find((u) => u.id === "usr-carlos")!.correo;
  assert.equal(
    auth.solicitarCambioCorreo("usr-carlos", "no@ejemplo.com").exito,
    false,
  );
  const r = auth.solicitarCambioCorreo("usr-carlos", "nuevo@alumno.ipn.mx");
  assert.equal(r.exito, true);
  assert.equal(p.leer().find((u) => u.id === "usr-carlos")!.correo, anterior);
  assert.equal(
    auth.reenviarConfirmacionCorreo("nuevo@alumno.ipn.mx").exito,
    false,
  );
  assert.equal(auth.confirmarCorreo(r.codigoPrueba!).exito, true);
  const nueva = p.leer().find((u) => u.id === "usr-carlos")!;
  assert.equal(nueva.correo, "nuevo@alumno.ipn.mx");
  assert.equal(nueva.esVerificado, false);
});
test("expediente exige documentos y vigencia por categoría y limita archivos", () => {
  const u = {
    ...USUARIOS_INICIALES.find((u) => u.id === "usr-carlos")!,
    correoConfirmado: true,
  };
  const hoy = new Date("2026-10-18T12:00:00-06:00");
  assert.equal(validarExpedienteIdentidad(u, [documento], hoy), undefined);
  assert.ok(validarExpedienteIdentidad(u, [], hoy));
  assert.ok(validarExpedienteIdentidad(u, Array(6).fill(documento), hoy));
  assert.ok(
    validarExpedienteIdentidad(
      u,
      [{ ...documento, periodoActual: false }],
      hoy,
    ),
  );
  assert.ok(
    validarExpedienteIdentidad(u, [{ ...documento, nombre: "foto.png" }], hoy),
  );
  assert.ok(
    validarExpedienteIdentidad(
      u,
      [{ ...documento, fechaEmision: "2027-01-01" }],
      hoy,
    ),
  );
  const trabajador = {
    ...u,
    afiliacion: "profesor" as const,
    numeroEmpleado: "EMP1",
  };
  assert.equal(
    validarExpedienteIdentidad(
      trabajador,
      [{ ...documento, tipo: "adscripcion", fechaEmision: "2026-10-01" }],
      hoy,
    ),
    undefined,
  );
  assert.ok(
    validarExpedienteIdentidad(
      trabajador,
      [{ ...documento, tipo: "adscripcion", fechaEmision: "2025-01-01" }],
      hoy,
    ),
  );
});
test("Subdirección revisa con periodo y versión; solo Administración revoca", () => {
  const p=preparar('usr-subdireccion');
  const cuentas=p.leer(),u=cuentas.find(c=>c.id==='usr-carlos')!;
  u.estadoExpediente='en_revision';u.versionIdentidad=0;
  p.local.setItem('tt_usuarios_sistema_v2',JSON.stringify(cuentas));
  const periodo={id:'27-1-prueba',inicio:'2026-08-01',fin:'2027-01-31',fuente:'Calendario ficticio de prueba'};
  p.local.setItem('tt_periodos_identidad_v1',JSON.stringify([periodo]));
  renderToString(React.createElement(ProveedorAutenticacion,null,React.createElement(capturar)));
  assert.equal(auth.dictaminarExpediente(u.id,'aprobado','',0,periodo.fin).exito,false);
  assert.equal(auth.dictaminarExpediente(u.id,'aprobado','Revisado',99,periodo.fin).exito,false);
  assert.equal(auth.dictaminarExpediente(u.id,'aprobado','Revisado',0,'2028-01-01').exito,false);
  assert.equal(auth.dictaminarExpediente(u.id,'aprobado','Revisado',0,periodo.fin).exito,true);
  const aprobada=p.leer().find(c=>c.id===u.id)!;
  assert.equal(aprobada.esVerificado,true);
  assert.equal(aprobada.periodoVerificado,periodo.id);
  assert.equal(aprobada.roles.includes('admin'),false);
  assert.equal(auth.dictaminarExpediente(u.id,'revocado','Retiro',aprobada.versionIdentidad!).exito,false);
  const admin=p.leer().find(c=>c.id==='usr-admin')!;
  p.local.setItem('tt_rol_activo_v2','admin');
  p.sesion.setItem('tt_sesion_identidad_v3',JSON.stringify({id:'admin',usuario:admin.id,inicio:Date.now(),actividad:Date.now(),version:admin.versionCredenciales||0}));
  renderToString(React.createElement(ProveedorAutenticacion,null,React.createElement(capturar)));
  assert.equal(auth.dictaminarExpediente(u.id,'rechazado','No corresponde',aprobada.versionIdentidad!).exito,false);
  assert.equal(auth.dictaminarExpediente(u.id,'revocado','Renovar evidencia',aprobada.versionIdentidad!).exito,true);
});
test("Subdirección pide restricción sin aplicarla; Administración resuelve con periodo y versión", () => {
  const p = preparar("usr-subdireccion");
  assert.equal(
    auth.actualizarRestriccionSolicitudes(
      "usr-carlos",
      "2027-01-01",
      "No permitido",
    ).exito,
    false,
  );
  assert.equal(
    auth.solicitarRestriccion("usr-carlos", "aplicar", "Motivo", "sol-prueba")
      .exito,
    true,
  );
  const u = p.leer().find((c) => c.id === "usr-carlos")!;
  assert.equal(u.restriccionSolicitudesHasta, undefined);
  assert.equal(u.peticionesRestriccion?.[0].estado, "pendiente");
  p.local.setItem("tt_rol_activo_v2", "admin");
  const t = Date.now();
  p.sesion.setItem(
    "tt_sesion_identidad_v3",
    JSON.stringify({
      id: "admin",
      usuario: "usr-admin",
      inicio: t,
      actividad: t,
      version: 0,
    }),
  );
  renderToString(
    React.createElement(
      ProveedorAutenticacion,
      null,
      React.createElement(capturar),
    ),
  );
  assert.equal(
    auth.actualizarRestriccionSolicitudes(
      u.id,
      "2027-01-01T12:00:00-06:00",
      "Resuelta",
      "2026-10-01T12:00:00-06:00",
      u.peticionesRestriccion![0].id,
      true,
      u.versionIdentidad,
    ).exito,
    true,
  );
  assert.equal(
    restriccionIdentidadVigente(p.leer().find((c) => c.id === u.id)!),
    true,
  );
});
test("Staff requiere titularidad del evento y cuenta confirmada; no habilita privilegios ajenos", () => {
  const evento = EVENTOS_INICIALES.find(
    (e) => e.idOrganizador === "usr-silva",
  )!;
  const organizador = USUARIOS_INICIALES.find((u) => u.id === "usr-silva")!;
  assert.equal(puedeAsignarStaff(organizador, evento), true);
  assert.equal(
    puedeAsignarStaff(organizador, { ...evento, idOrganizador: "otro" }),
    false,
  );
  const p = preparar("usr-silva");
  assert.equal(
    auth.asociarStaffAEvento("usr-carlos", evento.id, true).exito,
    true,
  );
  assert.ok(
    p
      .leer()
      .find((u) => u.id === "usr-carlos")!
      .eventosAsignadosStaff?.includes(evento.id),
  );
  assert.equal(
    auth.asociarStaffAEvento("usr-carlos", evento.id, false).exito,
    true,
  );
  assert.ok(
    !p
      .leer()
      .find((u) => u.id === "usr-carlos")!
      .eventosAsignadosStaff?.includes(evento.id),
  );
});
test("restricción tiene inicio incluido y fin excluido; verificación vence sin borrar recursos", () => {
  const u = {
    ...USUARIOS_INICIALES[0],
    restriccionSolicitudesDesde: "2026-10-20T00:00:00-06:00",
    restriccionSolicitudesHasta: "2026-10-21T00:00:00-06:00",
    esVerificado: true,
    verificacionHasta: "2026-10-20",
  };
  assert.equal(
    restriccionIdentidadVigente(
      u,
      Date.parse(u.restriccionSolicitudesDesde) - 1,
    ),
    false,
  );
  assert.equal(
    restriccionIdentidadVigente(u, Date.parse(u.restriccionSolicitudesDesde)),
    true,
  );
  assert.equal(
    restriccionIdentidadVigente(u, Date.parse(u.restriccionSolicitudesHasta)),
    false,
  );
  assert.equal(
    verificacionIdentidadVigente(u, Date.parse("2026-10-21T12:00:00-06:00")),
    false,
  );
});
test("los ocho CU-ID tienen pantalla, control y respuesta; permisos y alternativas no se mezclan", () => {
  const casos = SUBEQUIPOS.find((e) => e.id === "identidad")!.casos;
  assert.equal(casos.length, 8);
  for (const c of casos) {
    assert.ok(c.ruta);
    assert.ok(c.control);
    assert.ok(c.respuesta);
  }
  assert.equal(casos[5].ruta, "/mi-expediente");
  assert.equal(casos[6].ruta, "/subdireccion/verificaciones");
  assert.deepEqual(
    casos[7].accesos?.map((a) => a.ruta),
    ["/subdireccion/restricciones", "/admin", "/subdireccion/jefes-academia", "/organizador/staff"],
  );
});
test("la carga comprueba el PDF real y rechaza extensión falsa, cifrado, acciones y exceso de tamaño", async () => {
  const bytes = await readFile(
    new URL("./fixtures/documento-identidad-prueba.pdf", import.meta.url),
  );
  await validarDocumentoIdentidad(
    new File([bytes], "prueba.pdf", { type: "application/pdf" }),
  );
  await assert.rejects(
    validarDocumentoIdentidad(new File(["no es PDF"], "prueba.pdf")),
  );
  await assert.rejects(
    validarDocumentoIdentidad(new File([bytes], "prueba.png")),
  );
  await assert.rejects(
    validarDocumentoIdentidad(
      new File(["%PDF-1.4 /Encrypt 1 0 R %%EOF"], "prueba.pdf"),
    ),
  );
  await assert.rejects(
    validarDocumentoIdentidad(
      new File(["%PDF-1.4 /JavaScript (alert) %%EOF"], "prueba.pdf"),
    ),
  );
  await assert.rejects(
    validarDocumentoIdentidad(
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "prueba.pdf"),
    ),
  );
});

test("aprobar solicitud asigna Organizador al titular junto con evento y días, sin privilegios ajenos", () => {
  const p = preparar("usr-subdireccion");
  const solicitud = {
    ...SOLICITUDES_INICIALES[0],
    id: "sol-integracion-identidad",
    idSolicitante: "usr-carlos",
    nombreSolicitante: "Carlos Méndez Vega",
    estado: "en_revision" as const,
    esExcepcional: false,
    asistenciaEstimada: 10,
    version: 1,
    fechasSolicitadas: [
      {
        distribucion: lugaresDelRecinto(RECINTOS_INICIALES.find(r=>r.id==="rec-auditorio")!),
        distribucionConfirmada: true,
        id: "fecha-prueba",
        fecha: "2030-01-15",
        horaInicio: "10:00",
        horaFin: "12:00",
        idRecinto: "rec-auditorio",
        nombreDia: "Día 1",
      },
    ],
  };
  // Usar un recinto real del catálogo; la prueba no inventa uno para saltarse capacidad.
  const auditorio = EVENTOS_INICIALES.flatMap((e) => e.fechas).find((f) =>
    f.idRecinto.includes("auditorio"),
  )!;
  solicitud.fechasSolicitadas[0].idRecinto = auditorio.idRecinto;
  p.local.setItem(
    "tt_datos_almacen_escom_v7_solicitudes",
    JSON.stringify([solicitud]),
  );
  let datos: ReturnType<typeof useDatos>;
  function capturarDatos() {
    datos = useDatos();
    return null;
  }
  renderToString(
    React.createElement(
      ProveedorAutenticacion,
      null,
      React.createElement(
        ProveedorDatos,
        null,
        React.createElement(capturarDatos),
      ),
    ),
  );
  const r = datos!.dictaminarSolicitud(
    solicitud.id,
    "autorizada",
    "Revisión de prueba",
    undefined,
    1,
  );
  assert.equal(r.exito, true, r.error);
  const titular = p.leer().find((u) => u.id === "usr-carlos")!;
  assert.ok(titular.roles.includes("organizador"));
  assert.ok(!titular.roles.includes("admin"));
  assert.ok(!titular.roles.includes("subdireccion"));
  const evento = JSON.parse(
    p.local.getItem("tt_datos_almacen_escom_v7_eventos")!,
  ).find((e: { idSolicitud: string }) => e.idSolicitud === solicitud.id);
  assert.equal(evento.idOrganizador, titular.id);
});

test("validaciones compartidas no contradicen registro ni rechazan las boletas PE/PP", () => {
  assert.ok(validarBoletaIPN("PE12345678").esValido);
  assert.ok(validarBoletaIPN("PP12345678").esValido);
  assert.equal(validarCorreoInstitucional("x@escom.ipn.mx").esPersonal, false);
});
test("un fallo de almacenamiento no confirma cambios de perfil ni cambia la sesión", () => {
  const p = preparar("usr-carlos");
  const previo = p.local.getItem("tt_usuarios_sistema_v2");
  p.local.setItem = () => {
    throw new Error("Cuota agotada de prueba");
  };
  assert.equal(
    auth.actualizarPerfil("usr-carlos", { nombre: "No debe guardarse" }).exito,
    false,
  );
  assert.equal(p.local.getItem("tt_usuarios_sistema_v2"), previo);
  assert.ok(p.sesion.getItem("tt_sesion_identidad_v3"));
});

test('la jefatura solo la asigna Subdirección a docentes verificados y conserva los roles',()=>{
  let p=preparar('usr-admin');
  assert.equal(auth.cambiarAutoaprobacion('usr-silva',true,'Nombramiento',0).exito,false);
  p=preparar('usr-subdireccion');
  const docente=auth.todosLosUsuarios.find(u=>u.id==='usr-silva')!;
  assert.equal(auth.cambiarAutoaprobacion(docente.id,true,'',docente.versionIdentidad||0).exito,false);
  assert.equal(auth.cambiarAutoaprobacion('usr-carlos',true,'No es docente',0).exito,false);
  assert.equal(auth.cambiarAutoaprobacion(docente.id,true,'Nombramiento revisado',docente.versionIdentidad||0).exito,true);
  const asignado=p.leer().find(u=>u.id===docente.id)!;
  assert.equal(asignado.puedeAutoaprobar,true);
  assert.deepEqual(asignado.roles,docente.roles);
  assert.equal(auth.cambiarAutoaprobacion(docente.id,false,'Retiro',docente.versionIdentidad||0).exito,false);
  assert.equal(auth.cambiarAutoaprobacion(docente.id,false,'Fin del nombramiento',asignado.versionIdentidad).exito,true);
});

test('la pausa de verificación no bloquea la sesión ni cambia los roles',()=>{
  const p=preparar('usr-subdireccion');
  const antes=auth.todosLosUsuarios.find(u=>u.id==='usr-carlos')!;
  assert.equal(auth.silenciarVerificacion(antes.id,'2030-01-01','Reenvíos reiterados',antes.versionIdentidad||0).exito,true);
  const despues=p.leer().find(u=>u.id===antes.id)!;
  assert.equal(despues.estaActivo,antes.estaActivo);
  assert.deepEqual(despues.roles,antes.roles);
  assert.equal(despues.verificacionSilenciadaHasta,'2030-01-01');
  assert.equal(auth.silenciarVerificacion(antes.id,'','Pausa levantada',despues.versionIdentidad!).exito,true);
  assert.equal(p.leer().find(u=>u.id===antes.id)!.verificacionSilenciadaHasta,undefined);
});

test('estudiantes pueden adjuntar horario; el RFC no sustituye el número de empleado',()=>{
  const u={...USUARIOS_INICIALES.find(u=>u.id==='usr-carlos')!,correoConfirmado:true};
  const hoy=new Date('2026-10-25T12:00:00-06:00');
  assert.equal(validarExpedienteIdentidad(u,[{...documento,tipo:'horario'}],hoy),undefined);
  const profesor={...u,afiliacion:'profesor' as const,rfc:'RFCDECLARADO',numeroEmpleado:undefined};
  assert.match(validarExpedienteIdentidad(profesor,[{...documento,tipo:'adscripcion'}],hoy)!,/número de empleado/);
});

test('tres rechazos bloquean el cuarto envío, pero una corrección y un PDF inválido no consumen intentos',()=>{
  const p=preparar('usr-carlos',{esVerificado:false,estadoExpediente:'sin_enviar',versionIdentidad:0});
  p.local.setItem('tt_periodos_identidad_v1',JSON.stringify([{id:'periodo-prueba',inicio:'2026-08-01',fin:'2027-01-31',fuente:'Calendario ficticio'}]));
  const entrar=(id:string)=>{
    const u=p.leer().find(u=>u.id===id)!;
    p.local.setItem('tt_rol_activo_v2',id==='usr-subdireccion'?'subdireccion':'asistente');
    p.sesion.setItem('tt_sesion_identidad_v3',JSON.stringify({id:'prueba',usuario:id,inicio:Date.now(),actividad:Date.now(),version:u.versionCredenciales||0}));
    renderToString(React.createElement(ProveedorAutenticacion,null,React.createElement(capturar)));
  };
  entrar('usr-carlos');
  assert.equal(auth.enviarExpediente('usr-carlos',[],0,'Solicitar eventos').exito,false);
  assert.equal(auth.enviarExpediente('usr-carlos',[documento],0,'').exito,false);
  for(let intento=0;intento<3;intento++){
    entrar('usr-carlos');
    const u=auth.usuarioActual!;
    assert.equal(auth.enviarExpediente(u.id,[documento],u.versionIdentidad||0,'Organizar un taller').exito,true);
    entrar('usr-subdireccion');
    const enviada=auth.todosLosUsuarios.find(u=>u.id==='usr-carlos')!;
    assert.equal(auth.dictaminarExpediente(enviada.id,'rechazado','Documento revisado no vigente',enviada.versionIdentidad||0).exito,true);
  }
  entrar('usr-carlos');
  assert.ok(auth.usuarioActual);
  const r=auth.enviarExpediente('usr-carlos',[documento],auth.usuarioActual!.versionIdentidad||0,'Nuevo envío');
  assert.equal(r.exito,false);
  assert.match(r.mensaje,/tres rechazos/);
  assert.equal(p.leer().find(u=>u.id==='usr-carlos')!.historialExpediente!.filter(h=>h.estado==='rechazado').length,3);
});
