import { Router } from 'express';
import { ruta, idEntero, fallo } from '../../comun/http.js';
import { conConfiguracion, guardarCalendario, leerCalendario } from './calendario.js';
import { cancelarBloqueoServidor, guardarBloqueoServidor, revisarBloqueoServidor } from './bloqueos.js';

/** Se monta después de exigirSesion y origenSeguro del router de Organización. */
export const routerConfiguracionRecintos = Router();
routerConfiguracionRecintos.get('/calendario', ruta(async (_req, res) => {
  const datos = await conConfiguracion(leerCalendario);
  res.set('Cache-Control', 'no-store').json({ datos });
}));
routerConfiguracionRecintos.put('/calendario', ruta(async (req, res) => {
  if (!res.locals.usuario.roles.includes('admin')) fallo('Solo Administración configura el calendario hábil.', 403);
  const datos = await conConfiguracion(c => guardarCalendario(c, res.locals.usuario, req.body));
  res.set('Cache-Control', 'no-store').json({ datos });
}));
routerConfiguracionRecintos.post('/bloqueos/revision', ruta(async (req, res) => {
  const id = req.body?.id === undefined ? undefined : idEntero(req.body.id);
  const datos = await conConfiguracion(async c => {
    const { p: _propuesta, ...revision } = await revisarBloqueoServidor(c, res.locals.usuario, req.body?.propuesta, id);
    return revision;
  });
  res.set('Cache-Control', 'no-store').json({ datos });
}));
routerConfiguracionRecintos.post('/bloqueos', ruta(async (req, res) => {
  const datos = await conConfiguracion(c => guardarBloqueoServidor(c, res.locals.usuario, req.body));
  res.status(201).set('Cache-Control', 'no-store').json({ datos });
}));
routerConfiguracionRecintos.patch('/bloqueos/:id', ruta(async (req, res) => {
  const id = idEntero(req.params.id);
  const datos = await conConfiguracion(c => guardarBloqueoServidor(c, res.locals.usuario, req.body, id));
  res.set('Cache-Control', 'no-store').json({ datos });
}));
routerConfiguracionRecintos.post('/bloqueos/:id/cancelacion', ruta(async (req, res) => {
  const id = idEntero(req.params.id);
  const datos = await conConfiguracion(c => cancelarBloqueoServidor(c, res.locals.usuario, id, req.body || {}));
  res.set('Cache-Control', 'no-store').json({ datos });
}));
