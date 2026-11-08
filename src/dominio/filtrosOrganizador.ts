/** La búsqueda ignora mayúsculas y acentos; recibe únicamente registros propios. */
export function filtrarPorTituloYEstado<T extends { estado: string }>(
  registros: T[],
  titulo: (registro: T) => string,
  busqueda: string,
  estado: string,
): T[] {
  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const termino = normalizar(busqueda);
  return registros.filter(
    (registro) =>
      normalizar(titulo(registro)).includes(termino) &&
      (estado === "TODOS" || registro.estado === estado),
  );
}
export function nombreEstadoOrganizador(estado: string): string {
  const nombres: Record<string, string> = {
    borrador: "Borrador",
    configuracion: "En configuración",
    publicado: "Publicado",
    en_curso: "En curso",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
    en_revision: "En revisión",
    requiere_correccion: "Por corregir",
    autorizada: "Autorizada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
  };
  return nombres[estado] || estado.replace(/_/g, " ");
}
