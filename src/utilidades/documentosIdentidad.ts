/** Almacén del prototipo en este navegador. No sustituye almacenamiento privado de servidor. */
async function abrirAlmacen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open("tt_documentos_identidad", 1);
    peticion.onupgradeneeded = () =>
      peticion.result.createObjectStore("archivos");
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () =>
      reject(new Error("No se pudo abrir el almacenamiento de documentos."));
  });
}
export async function validarDocumentoIdentidad(archivo: File) {
  if (
    !/\.pdf$/i.test(archivo.name) ||
    archivo.size <= 0 ||
    archivo.size > 10 * 1024 * 1024
  )
    throw new Error("Solo PDF de hasta 10 MiB por archivo.");
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const texto = new TextDecoder("latin1").decode(bytes);
  if (
    !texto.startsWith("%PDF-") ||
    !texto.includes("%%EOF") ||
    /\/Encrypt\b/.test(texto)
  )
    throw new Error(
      "El archivo no es un PDF válido o está protegido por contraseña.",
    );
  if (/\/(JavaScript|JS|Launch|EmbeddedFiles)\b/.test(texto))
    throw new Error("El PDF contiene acciones o adjuntos no admitidos.");
}
export async function guardarDocumentoIdentidad(id: string, archivo: File) {
  await validarDocumentoIdentidad(archivo);
  const db = await abrirAlmacen();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("archivos", "readwrite");
      tx.objectStore("archivos").put(archivo, id);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(
          new Error("No se guardó el documento. Revisa el espacio disponible."),
        );
    });
  } finally {
    db.close();
  }
}
export async function leerDocumentoIdentidad(id: string): Promise<Blob> {
  const db = await abrirAlmacen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("archivos", "readonly");
      const lectura = tx.objectStore("archivos").get(id);
      lectura.onsuccess = () =>
        lectura.result
          ? resolve(lectura.result)
          : reject(new Error("Documento no disponible en este navegador."));
      lectura.onerror = () =>
        reject(new Error("No se pudo leer el documento."));
    });
  } finally {
    db.close();
  }
}
