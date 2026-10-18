export const MAXIMO_CARTEL_BYTES = 5 * 1024 * 1024;

export async function validarArchivoCartel(archivo: File): Promise<void> {
  const cabecera = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
  const esPng = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, indice) => cabecera[indice] === byte);
  const esJpeg = cabecera[0] === 255 && cabecera[1] === 216 && cabecera[2] === 255;
  const formatoValido = (archivo.type === 'image/png' && /\.png$/i.test(archivo.name) && esPng)
    || (archivo.type === 'image/jpeg' && /\.jpe?g$/i.test(archivo.name) && esJpeg);
  if (!formatoValido || archivo.size === 0 || archivo.size > MAXIMO_CARTEL_BYTES)
    throw new Error('ERR-TR-09: selecciona un JPEG o PNG real, con extensión válida y de máximo 5 MiB. Se conserva el cartel anterior.');
}

export async function prepararCartel(archivo: File): Promise<string> {
  await validarArchivoCartel(archivo);
  const urlTemporal = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    await new Promise<void>((resolver, rechazar) => {
      imagen.onload = () => resolver();
      imagen.onerror = () => rechazar(new Error('ERR-TR-09: no se pudo leer la imagen. Se conserva el cartel anterior.'));
      imagen.src = urlTemporal;
    });
    const escala = Math.min(1, 1800 / imagen.naturalWidth, 1200 / imagen.naturalHeight);
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
    lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
    const contexto = lienzo.getContext('2d');
    if (!contexto) throw new Error('No se pudo preparar el cartel. Se conserva el anterior.');
    contexto.fillStyle = '#fff';
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const resultado = lienzo.toDataURL('image/jpeg', 0.78);
    if (resultado.length > 1_500_000) throw new Error('El cartel optimizado no cabe en el almacenamiento local. Prueba una imagen más sencilla.');
    return resultado;
  } finally {
    URL.revokeObjectURL(urlTemporal);
  }
}
