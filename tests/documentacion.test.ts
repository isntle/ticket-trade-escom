import { test } from "node:test";
import assert from "node:assert/strict";
import { SUBEQUIPOS } from "../src/componentes/demostracion/ExploradorCasosUso";
import { resolverRutaDocumentacion } from "../src/dominio/navegacionDocumentacion";
import { EVENTOS_INICIALES } from "../src/datos/datosIniciales";
import { pantallasDelCaso } from "../src/dominio/pantallasDocumentacion";

test("la demostración selecciona recursos propios futuros y maneja un catálogo vacío", () => {
  const caso = { id: "CU-OR-19", ruta: "/organizador/eventos/evt-simposio-ia" };
  const ruta = resolverRutaDocumentacion(
    caso,
    EVENTOS_INICIALES,
    new Date("2026-10-18T00:00:00Z"),
  );
  const evento = EVENTOS_INICIALES.find(
    (e) => ruta === `/organizador/eventos/${e.id}`,
  );
  assert.ok(evento);
  assert.equal(evento.idOrganizador, "usr-silva");
  assert.notEqual(evento.id, "evt-simposio-ia");
  assert.equal(resolverRutaDocumentacion(caso, []), "/organizador");
  assert.equal(
    resolverRutaDocumentacion({ id: "CU-OR-26", ruta: "/admin/recintos" }, []),
    "/admin/recintos",
  );
});

test("el catálogo conserva los 49 casos oficiales sin IDs duplicados", () => {
  const casos = SUBEQUIPOS.flatMap((e) => e.casos);
  assert.deepEqual(
    SUBEQUIPOS.map((e) => e.casos.length),
    [8, 27, 9, 5],
  );
  assert.equal(new Set(casos.map((c) => c.id)).size, 49);
  const oficiales = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06.1",
    "06.2",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    ...Array.from({ length: 14 }, (_, i) => String(i + 15)),
  ].map((id) => "CU-OR-" + id);
  assert.deepEqual(
    SUBEQUIPOS.find((e) => e.id === "organizacion")!
      .casos.map((c) => c.id)
      .sort(),
    oficiales.sort(),
  );
});
test("B tiene rutas, controles y respuestas; catálogo y administración no abren el formulario equivocado", () => {
  const casos = SUBEQUIPOS.find((e) => e.id === "organizacion")!.casos;
  for (const caso of casos) {
    assert.ok(caso.ruta?.startsWith("/"), caso.id);
    assert.ok(caso.control, caso.id);
    assert.ok(caso.respuesta, caso.id);
  }
  assert.equal(casos.find((c) => c.id === "CU-OR-04")?.ruta, "/recintos");
  assert.equal(casos.find((c) => c.id === "CU-OR-26")?.ruta, "/admin/recintos");
  assert.equal(
    casos.find((c) => c.id === "CU-OR-27")?.ruta,
    "/admin/ocupaciones",
  );
  assert.equal(casos.find((c) => c.id === "CU-OR-28")?.actor, "Administrador");
});
test("cada UI mencionada tiene su botón y destino individual sin duplicar identificadores", () => {
  for (const caso of SUBEQUIPOS.flatMap(e=>e.casos)) {
    const ids=[...new Set(caso.interfaz.match(/UI-IP-\d+|UI\.\d+|UI-\d+|IU-CI\d+/g)||[])];
    const pantallas=pantallasDelCaso(caso);
    assert.deepEqual(pantallas.map(p=>p.id),ids,caso.id);
    assert.ok(pantallas.length>0,caso.id);
    for(const pantalla of pantallas){
      const url=new URL(pantalla.ruta,'https://ticket-trade.test');
      assert.equal(url.origin,'https://ticket-trade.test');
      assert.equal(url.searchParams.get('interfaz'),pantalla.id);
      assert.equal(url.searchParams.get('caso'),caso.id);
      assert.ok(pantalla.nombre);
    }
  }
});
test("los casos con tres o cuatro interfaces no se reducen a un enlace genérico",()=>{
  const casos=SUBEQUIPOS.flatMap(e=>e.casos);
  assert.equal(pantallasDelCaso(casos.find(c=>c.id==='CU-ID04')!).length,3);
  assert.equal(pantallasDelCaso(casos.find(c=>c.id==='CU-OR-06.1')!).length,3);
  assert.equal(pantallasDelCaso(casos.find(c=>c.id==='CU-OR-28')!).length,4);
  assert.equal(pantallasDelCaso(casos.find(c=>c.id==='CU-MT-01')!).length,2);
});
test("resolver recursos vigentes conserva la interfaz y el caso solicitados",()=>{
  const caso={id:'CU-OR-19',ruta:'/organizador/eventos/evt-simposio-ia?interfaz=UI.21&caso=CU-OR-19'};
  const ruta=resolverRutaDocumentacion(caso,EVENTOS_INICIALES,new Date('2026-10-18'))!;
  const url=new URL(ruta,'https://ticket-trade.test');
  assert.equal(url.searchParams.get('interfaz'),'UI.21');
  assert.equal(url.searchParams.get('caso'),'CU-OR-19');
  const rutaC=resolverRutaDocumentacion({id:'CU-MT-03',ruta:'/eventos/evt-simposio-ia/reservar?dateId=anterior&interfaz=UI-40'},EVENTOS_INICIALES,new Date('2026-10-18'))!;
  assert.match(rutaC,/dateId=fec-hackathon-d1/);
  assert.match(rutaC,/interfaz=UI-40/);
});
