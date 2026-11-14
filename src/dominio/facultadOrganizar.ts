/** Facultad para solicitar; no sustituye correo confirmado, sesión activa ni restricciones. */
export function identidadHabilitadaParaOrganizar(cuenta: {roles: readonly string[]; esVerificado?: boolean}): boolean {
  return cuenta.roles.some(rol => rol === 'admin' || rol === 'subdireccion') || cuenta.esVerificado === true;
}
export function cuentaInstitucional(cuenta: {roles: readonly string[]}): boolean {
  return cuenta.roles.some(rol => rol === 'admin' || rol === 'subdireccion');
}
