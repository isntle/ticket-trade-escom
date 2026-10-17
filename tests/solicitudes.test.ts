import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fechaHoyMexico,
  inicioEnMexico,
  esFechaUrgente,
  validarProgramacion,
  validarAnticipacionSolicitud,
  puedeConsultarSolicitud,
  registrarCambioSolicitud,
  solicitudesCoincidentes,
} from "../src/dominio/solicitudes";
import {
  RECINTOS_INICIALES,
  SOLICITUDES_INICIALES,
  USUARIOS_INICIALES,
} from "../src/datos/datosIniciales";

const ahora = new Date("2026-10-17T18:00:00Z");
const dia = {
  id: "d1",
  fecha: "2026-10-25",
  horaInicio: "10:00",
  horaFin: "12:00",
  idRecinto: "rec-auditorio",
};
const solicitud = {
  ...SOLICITUDES_INICIALES[0],
  version: 1,
  estado: "en_revision" as const,
  fechasSolicitadas: [dia],
};

test("usa Ciudad de México incluso al cambiar el día UTC y rechaza fechas imposibles", () => {
  assert.equal(fechaHoyMexico(new Date("2026-10-18T02:00:00Z")), "2026-10-17");
  assert.ok(Number.isNaN(inicioEnMexico("2026-02-30", "10:00")));
});
test("una fecha pasada nunca se trata como urgente; 168 horas exactas es ordinaria", () => {
  assert.equal(esFechaUrgente({ ...dia, fecha: "2026-10-16" }, ahora), false);
  assert.equal(
    esFechaUrgente({ ...dia, fecha: "2026-10-24", horaInicio: "12:00" }, ahora),
    false,
  );
  assert.equal(
    esFechaUrgente({ ...dia, fecha: "2026-10-24", horaInicio: "11:59" }, ahora),
    true,
  );
});
test("impide guardar o enviar horarios pasados, invertidos o días duplicados", () => {
  for (const borrador of [false, true]) {
    assert.match(
      validarProgramacion(
        [{ ...dia, fecha: "2026-10-16" }],
        RECINTOS_INICIALES,
        { ahora, borrador },
      ) || "",
      /pasaron/,
    );
    assert.match(
      validarProgramacion(
        [{ ...dia, fecha: "2026-10-17", horaInicio: "11:59" }],
        RECINTOS_INICIALES,
        { ahora, borrador },
      ) || "",
      /pasaron/,
    );
  }
  assert.match(
    validarProgramacion([{ ...dia, horaFin: "09:00" }], RECINTOS_INICIALES, {
      ahora,
    }) || "",
    /posterior/,
  );
  assert.match(
    validarProgramacion([dia, { ...dia, id: "d2" }], RECINTOS_INICIALES, {
      ahora,
    }) || "",
    /solo recinto/,
  );
  assert.equal(
    validarProgramacion([dia], RECINTOS_INICIALES, { ahora }),
    undefined,
  );
});
test("respeta capacidad física, recintos activos y prohibición de entrada libre en laboratorio", () => {
  assert.match(
    validarProgramacion([dia], RECINTOS_INICIALES, { ahora, aforo: 9999 }) ||
      "",
    /aforo/,
  );
  assert.match(
    validarProgramacion(
      [dia],
      RECINTOS_INICIALES.map((r) => ({ ...r, activo: false })),
      { ahora },
    ) || "",
    /activo/,
  );
  const laboratorio = RECINTOS_INICIALES.find((r) => r.tipo === "laboratorio")!;
  assert.match(
    validarProgramacion(
      [{ ...dia, idRecinto: laboratorio.id }],
      RECINTOS_INICIALES,
      { ahora, modalidad: "libre" },
    ) || "",
    /laboratorios/,
  );
});
test("solo titular, Subdirección y Administrador pueden consultar el expediente", () => {
  const titular = USUARIOS_INICIALES.find(
    (u) => u.id === solicitud.idSolicitante,
  )!;
  assert.equal(puedeConsultarSolicitud(titular, solicitud), true);
  assert.equal(
    puedeConsultarSolicitud(
      USUARIOS_INICIALES.find((u) => u.id === "usr-subdireccion"),
      solicitud,
    ),
    true,
  );
  assert.equal(
    puedeConsultarSolicitud(
      USUARIOS_INICIALES.find((u) => u.id === "usr-admin"),
      solicitud,
    ),
    true,
  );
  assert.equal(puedeConsultarSolicitud(null, solicitud), false);
  assert.equal(
    puedeConsultarSolicitud({ ...titular, id: "otro-organizador" }, solicitud),
    false,
  );
});
test("las versiones conservan antes/después sin reiniciar envío ni mutar el historial", () => {
  const base = { ...solicitud, fechaEnvioInicial: "2026-10-10T12:00:00Z" };
  const nueva = registrarCambioSolicitud(
    base,
    { tituloEvento: "Título corregido" },
    "Responsable",
    "Edición",
    "Corrección",
    ahora,
  );
  assert.equal(nueva.version, 2);
  assert.equal(nueva.fechaEnvioInicial, base.fechaEnvioInicial);
  assert.equal(
    nueva.historialVersiones?.[0].modificaciones[0].anterior,
    base.tituloEvento,
  );
  assert.equal(base.historialVersiones, undefined);
  assert.equal(
    registrarCambioSolicitud(
      nueva,
      { tituloEvento: nueva.tituloEvento },
      "R",
      "Edición",
    ),
    nueva,
  );
  const cancelada = registrarCambioSolicitud(
    nueva,
    { estado: "cancelada" },
    "Titular",
    "Cancelación",
  );
  assert.equal(cancelada.historialVersiones?.length, 2);
  assert.equal(nueva.estado, "en_revision");
});
test("editar una fecha sin cambiar su día conserva la anticipación del envío original", () => {
  const anterior = {
    ...solicitud,
    esExcepcional: false,
    fechasSolicitadas: [{ ...dia, fecha: "2026-10-20" }],
  };
  assert.equal(
    validarAnticipacionSolicitud(anterior, anterior, ahora),
    undefined,
  );
  assert.match(
    validarAnticipacionSolicitud(
      { ...anterior, fechasSolicitadas: [{ ...dia, fecha: "2026-10-21" }] },
      anterior,
      ahora,
    ) || "",
    /168/,
  );
  assert.match(
    validarAnticipacionSolicitud(
      { ...anterior, esExcepcional: true, justificacionExcepcional: "" },
      undefined,
      ahora,
    ) || "",
    /motivo/,
  );
});
test("distingue solicitudes pendientes coincidentes de las ya resueltas y horarios consecutivos", () => {
  assert.equal(
    solicitudesCoincidentes(solicitud, [
      solicitud,
      { ...solicitud, id: "otra" },
    ]).length,
    1,
  );
  assert.equal(
    solicitudesCoincidentes(solicitud, [
      { ...solicitud, id: "otra", estado: "autorizada" },
    ]).length,
    0,
  );
  assert.equal(
    solicitudesCoincidentes(solicitud, [
      {
        ...solicitud,
        id: "otra",
        fechasSolicitadas: [{ ...dia, horaInicio: "12:00", horaFin: "14:00" }],
      },
    ]).length,
    0,
  );
});
