import { test } from "node:test";
import assert from "node:assert/strict";
import type { PoolClient } from "pg";
import { franjasLibresRecinto, revisarFranjaRecinto } from "../src/dominio/disponibilidadRecintos";
import { actividadesParaDisponibilidad, consultarAgendaRecintos, revisarDisponibilidadServidor, exigirPropuestaSinCruces } from "../backend/modulos/organizacion/disponibilidad";
import { crearServicioDisponibilidad, type OcupacionDisponibilidad } from "../src/servicios/disponibilidadRecintos";

const usuario = { id: "100", roles: ["organizador"] };
const actividad = { id: "a", idRecinto: "1", fecha: "2030-01-25", horaInicio: "12:00", horaFin: "13:00" };
const ocupacion = (cambios: Partial<OcupacionDisponibilidad> = {}): OcupacionDisponibilidad => ({
  id: "ocupacion", idRecinto: "1", nombreRecinto: "Sala", fecha: actividad.fecha,
  horaInicio: "10:00", horaFin: "11:00", tipo: "evento", fuente: "evento", informativa: false, titulo: "Evento autorizado", ...cambios,
});
interface Datos { eventos?: any[]; bloqueos?: any[]; clases?: any[]; titular?: string }
function cliente(datos: Datos = {}) {
  const consultas: Array<{ sql: string; valores: unknown[] }> = [];
  const c = { query: async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    let rows: any[];
    if (sql.includes('FROM ticket_trade."Recinto"')) rows = [{ id: "1", nombre: "Sala" }, { id: "2", nombre: "Laboratorio" }].filter((r) => !valores[0] || r.id === valores[0]);
    else if (sql.includes('FROM ticket_trade."ActividadInterna"')) rows = datos.clases || [];
    else if (sql.includes('FROM ticket_trade."BloqueoRecinto"')) rows = datos.bloqueos || [];
    else if (sql.includes("SELECT a.id_actividad::text id")) rows = datos.eventos || [];
    else if (sql.includes("titular")) rows = [{ titular: datos.titular || "100", evento: "10" }];
    else throw new Error("Consulta inesperada en la prueba: " + sql);
    return { rows, rowCount: rows.length };
  } } as unknown as Pick<PoolClient, "query">;
  return { c, consultas };
}

test("disponibilidad: una ocupación parcial conserva franjas libres y el margen exacto", () => {
  const agenda = [ocupacion()];
  assert.deepEqual(franjasLibresRecinto(agenda, 30), [{ horaInicio: "00:00", horaFin: "09:30" }, { horaInicio: "11:30", horaFin: "21:00" }]);
  assert.equal(revisarFranjaRecinto(actividad, agenda, 30).disponible, true);
  assert.equal(revisarFranjaRecinto({ ...actividad, horaInicio: "11:29" }, agenda, 30).disponible, false);
  assert.equal(revisarFranjaRecinto({ ...actividad, horaInicio: "11:30" }, agenda, 30).disponible, true);
  assert.equal(revisarFranjaRecinto({ ...actividad, horaInicio: "10:30" }, agenda, 30).conflictos.length, 1);
});

test("disponibilidad: clases visibles e informativas no inutilizan la franja", () => {
  const clase = ocupacion({ tipo: "clase", fuente: "clase", informativa: true });
  const resultado = revisarFranjaRecinto({ ...actividad, horaInicio: "10:15" }, [clase], 30);
  assert.equal(resultado.disponible, true);
  assert.equal(resultado.advertencias.length, 1);
  assert.deepEqual(franjasLibresRecinto([clase], 30), [{ horaInicio: "00:00", horaFin: "21:00" }]);
});

test("disponibilidad: bloqueos usan fin excluido y no añaden el margen de eventos", () => {
  const bloqueo = ocupacion({ tipo: "bloqueo", fuente: "bloqueo" });
  assert.equal(revisarFranjaRecinto({ ...actividad, horaInicio: "10:59" }, [bloqueo], 30).disponible, false);
  assert.equal(revisarFranjaRecinto({ ...actividad, horaInicio: "11:00" }, [bloqueo], 30).disponible, true);
  assert.equal(revisarFranjaRecinto({ ...actividad, idRecinto: "2" }, [bloqueo], 30).disponible, true);
});

test("disponibilidad: el lector no expone el título privado de un evento ajeno", async () => {
  const evento = { id: "10", recinto: "1", inicio: "10:00", fin: "11:00", titulo: "Título privado", actividad: "Descripción privada", titular: "999", visibilidad: "Privado" };
  const { c } = cliente({ eventos: [evento] });
  const agenda = await consultarAgendaRecintos(c, usuario, actividad.fecha, "1");
  assert.equal(agenda.recintos[0].ocupaciones[0].titulo, "Actividad autorizada");
  assert.doesNotMatch(JSON.stringify(agenda), /Título privado|Descripción privada/);
  const auditor = await consultarAgendaRecintos(c, { id: "900", roles: ["subdireccion"] }, actividad.fecha, "1");
  assert.equal(auditor.recintos[0].ocupaciones[0].titulo, "Título privado");
});

test("disponibilidad: temporal, cruce de medianoche y bloqueo futuro se recortan al día consultado", async () => {
  const { c } = cliente({ bloqueos: [
    { id: "1", recinto: "1", inicio: "2030-01-24T23:00:00-06:00", fin: "2030-01-25T01:00:00-06:00" },
    { id: "2", recinto: "1", inicio: "2030-01-25T10:00:00-06:00", fin: "2030-01-25T11:00:00-06:00" },
    { id: "3", recinto: "1", inicio: "2030-01-26T10:00:00-06:00", fin: null },
  ] });
  const agenda = await consultarAgendaRecintos(c, usuario, actividad.fecha, "1");
  assert.deepEqual(agenda.recintos[0].ocupaciones.map((b) => [b.horaInicio, b.horaFin]), [["00:00", "01:00"], ["10:00", "11:00"]]);
  assert.deepEqual(agenda.recintos[0].franjasLibres, [{ horaInicio: "01:00", horaFin: "10:00" }, { horaInicio: "11:00", horaFin: "21:00" }]);
});

test("disponibilidad: un fin previsto no inventa el cierre efectivo de un bloqueo", async () => {
  const { c } = cliente({ bloqueos: [{ id: "1", recinto: "1", inicio: "2030-01-25T10:00:00-06:00", fin: null, fin_previsto: "2030-01-25T11:00:00-06:00" }] });
  const agenda = await consultarAgendaRecintos(c, usuario, actividad.fecha, "1");
  const bloqueo = agenda.recintos[0].ocupaciones[0];
  assert.equal(bloqueo.horaFin, "24:00");
  assert.ok(bloqueo.finPrevisto);
  assert.equal(revisarFranjaRecinto(actividad, [bloqueo], 30).disponible, false);
});

test("disponibilidad: el servidor entrega los horarios informativos desde ActividadInterna", async () => {
  const { c, consultas } = cliente({ clases: [{ id: "77", recinto: "2", inicio: "12:00", fin: "13:00" }] });
  const agenda = await consultarAgendaRecintos(c, usuario, actividad.fecha, "2");
  assert.equal(agenda.recintos[0].ocupaciones[0].informativa, true);
  assert.equal(agenda.recintos[0].ocupaciones[0].tipo, "clase");
  assert.equal(consultas.find((q) => q.sql.includes('"ActividadInterna"'))!.valores[0], actividad.fecha);
});

test("disponibilidad: una exclusión ajena se rechaza antes de consultar la agenda", async () => {
  const { c, consultas } = cliente({ titular: "999" });
  await assert.rejects(consultarAgendaRecintos(c, usuario, actividad.fecha, "1", { idActividadExcluir: "42" }), (e: any) => e.estado === 403);
  assert.equal(consultas.length, 1);
});

test("disponibilidad: solo la actividad autorizada se excluye y los IDs siguen siendo texto", async () => {
  const { c, consultas } = cliente();
  await consultarAgendaRecintos(c, usuario, actividad.fecha, "1", { idActividadExcluir: "9007199254740993" });
  const consulta = consultas.find((q) => q.sql.includes("SELECT a.id_actividad::text id"))!;
  assert.deepEqual(consulta.valores, [actividad.fecha, ["1"], null, "9007199254740993"]);
});

test("disponibilidad: actividades propias se contrastan por posición aunque repitan un id local", async () => {
  const { c } = cliente();
  const propias = [actividad, { ...actividad, horaInicio: "12:30", horaFin: "13:30" }];
  const revision = await revisarDisponibilidadServidor(c, usuario, propias);
  assert.ok(revision.actividades.every((a) => !a.disponible));
  assert.throws(() => exigirPropuestaSinCruces(revision), (e: any) => e.estado === 422);
  const separadas = await revisarDisponibilidadServidor(c, usuario, [actividad, { ...actividad, horaInicio: "13:30", horaFin: "14:30" }]);
  assert.ok(separadas.actividades.every((a) => a.disponible));
});

test("disponibilidad: cada decisión vuelve a leer la agenda y enviar a revisión no ocupa", async () => {
  const datos: Datos = {};
  const { c } = cliente(datos);
  const previa = await revisarDisponibilidadServidor(c, usuario, [actividad]);
  assert.equal(previa.actividades[0].disponible, true);
  datos.eventos = [{ id: "30", recinto: "1", inicio: "12:00", fin: "13:00", titulo: "Evento recién autorizado", actividad: "Otra actividad", titular: "999", visibilidad: "Público" }];
  const actual = await revisarDisponibilidadServidor(c, usuario, [actividad]);
  assert.doesNotThrow(() => exigirPropuestaSinCruces(actual), "Una coincidencia externa se informa al enviar, sin reservar");
  assert.throws(() => exigirPropuestaSinCruces(actual, true), (e: any) => e.estado === 409);
  assert.equal(previa.actividades[0].disponible, true, "La lectura anterior no se modifica ni se utiliza como autorización");
});

test("disponibilidad: entradas inválidas se rechazan antes de ejecutar SQL", () => {
  for (const cambios of [{ fecha: "2030-02-30" }, { fecha: "0000-01-25" }, { horaInicio: "13:00" }, { horaFin: "21:01" }, { idRecinto: "1 OR 1=1" }]) {
    assert.throws(() => actividadesParaDisponibilidad([{ ...actividad, ...cambios }]), (e: any) => e.estado === 422);
  }
  assert.throws(() => actividadesParaDisponibilidad(Array(101).fill(actividad)));
});

test("disponibilidad: el cliente conserva contexto y propaga el error sin simular éxito ni reintentar", async () => {
  const llamadas: any[] = [];
  const error = new Error("Agenda cambió");
  const servicio = crearServicioDisponibilidad(async (ruta, opciones) => { llamadas.push({ ruta, opciones }); throw error; });
  await assert.rejects(servicio.revisar([actividad], { idSolicitud: "10" }), error);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].ruta, "/organizacion/disponibilidad/revision");
  assert.equal(llamadas[0].opciones.datos.idSolicitud, "10");
});
