export const esPoolerSupabase = (url?: string) =>
  !!url && new URL(url).hostname.endsWith(".pooler.supabase.com");
export function destinoBaseDatos(url: string) {
  const u = new URL(url);
  // El pooler compartido de Supabase distingue proyectos por el sufijo del usuario.
  const proyecto = esPoolerSupabase(url)
    ? u.username.split(".").slice(1).join(".")
    : "";
  return `${u.hostname}:${u.port || "5432"}${u.pathname}:${proyecto}`;
}
