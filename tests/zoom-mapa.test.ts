import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  ESCALA_MAXIMA_AJUSTE,
  ESCALA_MINIMA_AJUSTE,
  ZOOM_MAXIMO,
  ZOOM_MINIMO_MANUAL,
  acercarZoom,
  alejarZoom,
  calcularEscalaAjuste,
  zoomEfectivo,
  zoomMinimo,
} from "../src/utilidades/zoomMapa";
import { MapaAsientos } from "../src/componentes/asientos/MapaAsientos";
import type { ConfiguracionAsiento } from "../src/tipos";

test("al abrir, el mapa se ajusta al ancho disponible", () => {
  assert.equal(calcularEscalaAjuste(343, 700), 0.49);
  assert.equal(calcularEscalaAjuste(910, 700), 1.3);
  assert.equal(calcularEscalaAjuste(2400, 700), ESCALA_MAXIMA_AJUSTE);
  // Redondea hacia abajo para no provocar desplazamiento por decimales.
  assert.ok(calcularEscalaAjuste(300, 620) * 620 <= 300);
  assert.equal(calcularEscalaAjuste(100, 2000), ESCALA_MINIMA_AJUSTE);
  // Sin medidas (servidor o primer render) se muestra a tamaño natural.
  assert.equal(calcularEscalaAjuste(0, 700), 1);
  assert.equal(calcularEscalaAjuste(343, 0), 1);
});

test("el zoom manual se conserva y prevalece sobre el ajuste", () => {
  assert.equal(zoomEfectivo(null, 0.49), 0.49);
  assert.equal(zoomEfectivo(0.94, 0.49), 0.94);
  assert.equal(zoomEfectivo(0.94, 1.3), 0.94);
});

test("acercar y alejar respetan los límites", () => {
  assert.equal(acercarZoom(0.49), 0.64);
  assert.equal(acercarZoom(1.95), ZOOM_MAXIMO);
  assert.equal(acercarZoom(1.3), 1.45);
  assert.equal(alejarZoom(1, 1), 0.85);
  assert.equal(alejarZoom(0.75, 1), ZOOM_MINIMO_MANUAL);
  // En móvil se puede volver a la vista completa aunque esté por debajo de 70 %.
  assert.equal(zoomMinimo(0.49), 0.49);
  assert.equal(alejarZoom(0.64, 0.49), 0.49);
  assert.equal(alejarZoom(0.55, 0.49), 0.49);
});

const butacas: ConfiguracionAsiento[] = ["A", "B", "C"].flatMap((fila) =>
  Array.from({ length: 20 }, (_, i) => ({
    id: `${fila}-${i + 1}`,
    fila,
    numero: i + 1,
    etiqueta: `${fila}${i + 1}`,
    categoria: "general",
    estaBloqueado: false,
  }) as ConfiguracionAsiento),
);

test("el mapa muestra controles de zoom accesibles en cada tipo de recinto", () => {
  for (const tipoRecinto of ["auditorio", "sala", "laboratorio"]) {
    const html = renderToString(
      React.createElement(MapaAsientos, { asientos: butacas, tipoRecinto, modo: "asistente" }),
    );
    assert.match(html, /aria-label="Alejar vista del mapa"/, tipoRecinto);
    assert.match(html, /aria-label="Acercar vista del mapa"/, tipoRecinto);
    assert.match(html, /aria-label="Escala del mapa 100%, ajustada al ancho"/, tipoRecinto);
    assert.match(html, /data-escala-mapa="1"/, tipoRecinto);
  }
});

test("la selección no cambia la escala del mapa", () => {
  const sinSeleccion = renderToString(
    React.createElement(MapaAsientos, { asientos: butacas, tipoRecinto: "auditorio", modo: "asistente" }),
  );
  const conSeleccion = renderToString(
    React.createElement(MapaAsientos, {
      asientos: butacas,
      tipoRecinto: "auditorio",
      modo: "asistente",
      idAsientoSeleccionado: "B-5",
    }),
  );
  const escala = (html: string) => html.match(/data-escala-mapa="([^"]+)"/)?.[1];
  assert.equal(escala(conSeleccion), escala(sinSeleccion));
  assert.match(conSeleccion, /title="B5 — Tu lugar seleccionado"/);
});
