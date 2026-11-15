import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  impedimentoApertura,
  indicadoresActividad,
  puedeAdministrarTaquilla,
} from "../src/dominio/taquilla";
import type {
  BoletoDigital,
  Evento,
  FechaEvento,
  Recinto,
  Reservacion,
  Usuario,
} from "../src/tipos";

const recintoBase: Recinto = {
  id: "rec-1",
  nombre: "Auditorio A",
  ubicacion: "Edificio de Gobierno",
  capacidad: 100,
  tipo: "auditorio",
  descripcion: "Auditorio principal",
  imagenes: [],
  equipamiento: [],
};

const actividadBase: FechaEvento = {
  id: "act-101",
  idEvento: "ev-1",
  nombreActividad: "Conferencia Magistral de Sistemas",
  fecha: "2099-11-20",
  horaInicio: "12:00",
  horaFin: "14:00",
  idRecinto: "rec-1",
  modalidadAsistencia: "controlado",
  asistenciaEstimada: 3,
  estadoInscripciones: "abiertas",
  esFinalConfirmado: true,
  ponentes: [],
};

const eventoBase: Evento = {
  id: "ev-1",
  titulo: "Congreso de Ingeniería de Sistemas",
  descripcion: "Evento académico",
  categoria: "Congreso",
  modalidadAsistencia: "controlado",
  aforoMaximo: 3,
  estado: "publicado",
  visibilidad: "publico",
  idOrganizador: "org-1",
  nombreOrganizador: "Organizador Dueño",
  correoContacto: "org@ipn.mx",
  telefonoContacto: "5557296000",
  urlImagen: "/imagenes/eventos/simposio-ia.jpg",
  fechas: [actividadBase],
  fechaCreacion: "2099-10-01",
};

test("boletos especiales por actividad: permisos de emisor, cupo real y liberación al invalidar", () => {
  const organizadorDueno: Usuario = {
    id: "org-1",
    nombre: "Organizador Dueño",
    correo: "org@ipn.mx",
    roles: ["asistente", "organizador"],
    esVerificado: true,
    estaActivo: true,
    fechaRegistro: "2099-01-01",
  };
  const otroOrganizador: Usuario = {
    ...organizadorDueno,
    id: "org-2",
  };
  const staffLector: Usuario = {
    ...organizadorDueno,
    id: "staff-1",
    roles: ["asistente", "staff"],
  };
  const admin: Usuario = {
    ...organizadorDueno,
    id: "adm-1",
    roles: ["admin"],
  };

  assert.equal(puedeAdministrarTaquilla(organizadorDueno, eventoBase), true);
  assert.equal(puedeAdministrarTaquilla(admin, eventoBase), true);
  assert.equal(
    puedeAdministrarTaquilla(otroOrganizador, eventoBase),
    false,
    "Otro organizador no administra boletos especiales de un evento ajeno",
  );
  assert.equal(
    puedeAdministrarTaquilla(staffLector, eventoBase),
    false,
    "Staff lector no emite ni invalida boletos especiales",
  );

  const dosHorasAntes = Date.parse("2099-11-20T10:00:00-06:00");
  assert.equal(
    impedimentoApertura(eventoBase, actividadBase, [], dosHorasAntes),
    undefined,
  );

  const mediaHoraAntes = Date.parse("2099-11-20T11:30:00-06:00");
  assert.ok(
    impedimentoApertura(eventoBase, actividadBase, [], mediaHoraAntes),
    "Rechaza emisión a menos de una hora del inicio",
  );

  const reservaciones: Reservacion[] = [
    {
      id: "res-1",
      idEvento: "ev-1",
      idFechaEvento: "act-101",
      idUsuario: "usr-1",
      nombreUsuario: "Asistente 1",
      correoUsuario: "usr1@alumno.ipn.mx",
      idBoleto: "bol-ord-1",
      estado: "confirmada",
      fechaCreacion: "2099-11-01T10:00:00Z",
    },
  ];

  const boletosActivos: BoletoDigital[] = [
    {
      id: "esp-1",
      idReservacion: "esp-1",
      idEvento: "ev-1",
      idFechaEvento: "act-101",
      idUsuario: "especial-vip-1",
      nombreUsuario: "Invitado VIP #1",
      correoUsuario: "vip1@ipn.mx",
      tituloEvento: eventoBase.titulo,
      fechaEvento: actividadBase.fecha,
      horaEvento: `${actividadBase.horaInicio} - ${actividadBase.horaFin}`,
      nombreRecinto: recintoBase.nombre,
      codigoQr: "TT-0123456789ABCDEF0123456789ABCDEF",
      codigoManual: "0123456789ABCDEF",
      estado: "valido",
      esEspecial: true,
      tipoEspecial: "vip",
      emitidoPor: "Organizador Dueño",
      fechaEmision: "2099-11-01T10:05:00Z",
    },
    {
      id: "esp-2",
      idReservacion: "esp-2",
      idEvento: "ev-1",
      idFechaEvento: "act-101",
      idUsuario: "especial-staff-1",
      nombreUsuario: "Staff #1",
      correoUsuario: "staff1@ipn.mx",
      tituloEvento: eventoBase.titulo,
      fechaEvento: actividadBase.fecha,
      horaEvento: `${actividadBase.horaInicio} - ${actividadBase.horaFin}`,
      nombreRecinto: recintoBase.nombre,
      codigoQr: "TT-FEDCBA9876543210FEDCBA9876543210",
      codigoManual: "FEDCBA9876543210",
      estado: "utilizado",
      esEspecial: true,
      tipoEspecial: "staff",
      emitidoPor: "Organizador Dueño",
      fechaEmision: "2099-11-01T10:06:00Z",
      fechaEscaneo: "2099-11-20T12:05:00Z",
    },
  ];

  const indLleno = indicadoresActividad(
    eventoBase,
    actividadBase,
    {
      recintos: [recintoBase],
      arreglos: [],
      reservaciones,
      boletos: boletosActivos,
      espera: [],
      escaneos: [],
      intenciones: [],
    },
    dosHorasAntes,
  );
  assert.equal(indLleno.aforo, 3);
  assert.equal(indLleno.reservaciones, 1);
  assert.equal(indLleno.especiales, 2);
  assert.equal(indLleno.disponibles, 0);

  const boletosTrasInvalidar: BoletoDigital[] = [
    {
      ...boletosActivos[0],
      estado: "cancelado",
      motivoInvalidacion: "Cambio en la comitiva",
      invalidadoPor: "Organizador Dueño",
      fechaInvalidacion: "2099-11-02T09:00:00Z",
    },
    boletosActivos[1],
  ];

  const indTrasInvalidar = indicadoresActividad(
    eventoBase,
    actividadBase,
    {
      recintos: [recintoBase],
      arreglos: [],
      reservaciones,
      boletos: boletosTrasInvalidar,
      espera: [],
      escaneos: [],
      intenciones: [],
    },
    dosHorasAntes,
  );
  assert.equal(indTrasInvalidar.especiales, 1);
  assert.equal(
    indTrasInvalidar.disponibles,
    1,
    "Invalidar un boleto especial no utilizado libera su cupo en la actividad",
  );
});

test("conexión remota de boletos especiales: rutas separadas, sin bloqueo de servidor pendiente ni correo simulado", async () => {
  const [datosRemotosSrc, paginaSrc, especialesSrc, estadoSrc] =
    await Promise.all([
      readFile(
        new URL("../src/contextos/DatosRemotos.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../src/paginas/GestionBoletosEspecialesPagina.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../backend/modulos/taquilla/especiales.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../backend/modulos/lecturas/estado.ts", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(datosRemotosSrc, /\/taquilla\/especiales/);
  assert.match(datosRemotosSrc, /\/invalidacion/);
  assert.doesNotMatch(
    datosRemotosSrc,
    /La emisión de boletos especiales aún no está disponible/,
  );
  assert.doesNotMatch(
    datosRemotosSrc,
    /La invalidación de boletos especiales aún no está disponible/,
  );

  assert.doesNotMatch(paginaSrc, /Dependencia pendiente en servidor/);
  assert.doesNotMatch(
    paginaSrc,
    /En este prototipo el envío de correo se representa/,
  );
  assert.match(paginaSrc, /claveIdempotencia/);

  assert.match(especialesSrc, /exigirSesion/);
  assert.match(especialesSrc, /conTransaccion/);
  assert.match(especialesSrc, /liberarApartadosVencidos/);
  assert.match(especialesSrc, /crypto\.randomBytes/);
  assert.match(especialesSrc, /EntradaEspecial/);

  assert.match(estadoSrc, /puedeGestionarEspeciales/);
  assert.match(estadoSrc, /infra\.boleto_especial_detalle/);
});
