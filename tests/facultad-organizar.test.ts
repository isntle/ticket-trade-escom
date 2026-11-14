import test from 'node:test';
import assert from 'node:assert/strict';
import { identidadHabilitadaParaOrganizar } from '../src/dominio/facultadOrganizar.js';
test('roles institucionales no requieren expediente; rol declarado o Staff no conceden facultad', () => {
  for (const rol of ['admin','subdireccion']) assert.equal(identidadHabilitadaParaOrganizar({roles:[rol],esVerificado:false}),true);
  for (const rol of ['asistente','staff','organizador','administrativo']) assert.equal(identidadHabilitadaParaOrganizar({roles:[rol],esVerificado:false}),false);
  assert.equal(identidadHabilitadaParaOrganizar({roles:['asistente','organizador'],esVerificado:true}),true);
});
