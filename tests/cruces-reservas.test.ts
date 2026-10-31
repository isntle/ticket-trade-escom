import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reservaIncompatible} from '../src/dominio/crucesReservas';
import {EVENTOS_INICIALES} from '../src/datos/datosIniciales';
import type {Reservacion} from '../src/tipos';
const actividad={...EVENTOS_INICIALES[0].fechas[0],id:'a',fecha:'2030-01-20',horaInicio:'10:00',horaFin:'12:00'};
const eventos=[{...EVENTOS_INICIALES[0],id:'e',fechas:[actividad]},{...EVENTOS_INICIALES[0],id:'f',fechas:[{...actividad,id:'b',horaInicio:'11:00',horaFin:'13:00'}]}];
const propuesta={id:'r',idUsuario:'u',idEvento:'e',idFechaEvento:'a',estado:'apartado_temporal'} as Reservacion;
const otra={...propuesta,id:'otra',idEvento:'f',idFechaEvento:'b',estado:'confirmada'} as Reservacion;
test('rechaza cruce confirmado entre eventos, permite horarios consecutivos y omite cancelados',()=>{
 assert.equal(reservaIncompatible(propuesta,[otra],eventos),true);
 assert.equal(reservaIncompatible(propuesta,[{...otra,idUsuario:'otro'}],eventos),false);
 assert.equal(reservaIncompatible(propuesta,[{...otra,estado:'cancelada'}],eventos),false);
 assert.equal(reservaIncompatible(propuesta,[otra],[eventos[0],{...eventos[1],fechas:[{...eventos[1].fechas[0],horaInicio:'12:00'}]}]),false);
 assert.equal(reservaIncompatible(propuesta,[otra],[eventos[0],{...eventos[1],fechas:[{...eventos[1].fechas[0],cancelada:true}]}]),false);
});
