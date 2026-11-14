import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { readFile } from "node:fs/promises";
import type { DocumentoIdentidad } from "../src/tipos";
import {
  BotonVerDocumento,
  VisorDocumentoIdentidad,
  etiquetaTipoDocumento,
} from "../src/componentes/identidad/VisorDocumentoIdentidad";
import { VentanaModal } from "../src/componentes/ui/VentanaModal";

const archivo: DocumentoIdentidad = {
  id: "doc-1",
  nombre: "constancia-2026.pdf",
  tipo: "constancia",
  tamano: 1024,
  fechaEmision: "2026-08-01",
};

test("el botón Ver documento es una acción visible con nombre y tipo", () => {
  const html = renderToString(
    React.createElement(BotonVerDocumento, { archivo, onClick: () => {} }),
  );
  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, />Ver documento<\/button>|Ver documento/);
  assert.match(
    html,
    /aria-label="Ver documento constancia-2026\.pdf \(Constancia de estudios, PDF\)"/,
  );
  assert.match(html, /focus-visible:ring-2/);
  assert.doesNotMatch(html, /underline/);
});

test("el tipo de documento se muestra con nombre legible", () => {
  assert.equal(etiquetaTipoDocumento("horario"), "Comprobante de horario");
  assert.equal(etiquetaTipoDocumento("representacion"), "Poder o nombramiento de representación");
  assert.equal(etiquetaTipoDocumento("desconocido"), "Documento");
});

test("el visor abre una ventana identificada en estado Cargando", () => {
  const html = renderToString(
    React.createElement(VisorDocumentoIdentidad, {
      archivo,
      titular: "Ana Pérez",
      puedeDescargar: true,
      alCerrar: () => {},
      leer: () => new Promise<Blob>(() => {}),
    }),
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  const etiqueta = html.match(/aria-labelledby="([^"]+)"/)?.[1];
  assert.ok(etiqueta, "la ventana debe estar etiquetada por su título");
  assert.match(html, new RegExp(`<h3 id="${etiqueta}"[^>]*>Vista previa: constancia-2026\\.pdf</h3>`));
  assert.match(html, /Constancia de estudios · PDF · Titular: Ana Pérez/);
  assert.match(html, /role="status"/);
  assert.match(html, /Cargando documento…/);
  assert.match(html, />Cerrar</);
  // La descarga y la vista solo aparecen cuando el documento ya se obtuvo.
  assert.doesNotMatch(html, /Descargar PDF/);
  assert.doesNotMatch(html, /<iframe/);
});

test("la ventana cerrada no deja contenido en la página", () => {
  const html = renderToString(
    React.createElement(VentanaModal, { estaAbierto: false, alCerrar: () => {}, titulo: "X", children: "contenido" }),
  );
  assert.equal(html, "");
});

test("GestionIdentidad conserva el permiso y no publica URLs del documento", async () => {
  const pagina = await readFile("src/paginas/GestionIdentidadPagina.tsx", "utf8");
  assert.match(pagina, /cuenta\.id !== titular\.id && !admin && !subdireccion/);
  assert.match(pagina, /No tienes permiso para consultar este documento\./);
  assert.match(pagina, /<VisorDocumentoIdentidad/);
  assert.match(pagina, /<BotonVerDocumento/);
  assert.doesNotMatch(pagina, /createObjectURL|urlArchivo/);
  const visor = await readFile("src/componentes/identidad/VisorDocumentoIdentidad.tsx", "utf8");
  assert.match(visor, /URL\.revokeObjectURL/);
  assert.doesNotMatch(visor, /\/api\/archivos|urlArchivo/);
});
