import { readFileSync } from 'node:fs';
/** Certificado de confianza del servidor PostgreSQL, sin desactivar su validación. */
export function opcionesTlsPostgres(connectionString?: string) {
  const ruta = process.env.TT_POSTGRES_CA_FILE;
  const certificado = process.env.TT_POSTGRES_CA_PEM;
  if ((!ruta && !certificado) || !connectionString) return {};
  const url = new URL(connectionString);
  if (!url.hostname.endsWith('.supabase.com') && !url.hostname.endsWith('.supabase.co')) return {};
  // pg sustituye el objeto ssl si encuentra estos parámetros en la URL.
  if (['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some(k => url.searchParams.has(k)))
    throw new Error('Configura TLS mediante TT_POSTGRES_CA_FILE sin parámetros SSL en DATABASE_URL.');
  return {ssl: {rejectUnauthorized: true, ca: certificado || readFileSync(ruta!, 'utf8')}};
}
