import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alternativasDisponibilidad } from '../src/dominio/alternativasDisponibilidad';
import { revisarFranjaRecinto } from '../src/dominio/disponibilidadRecintos';
import { crearServicioDisponibilidad, type AgendaDisponibilidad, type OcupacionDisponibilidad, type RevisionDisponibilidadSolicitud } from '../src/servicios/disponibilidadRecintos';
import { motivoCorreccionDisponibilidad } from '../src/componentes/recintos/RevisionDisponibilidadSolicitud';

const a = {id:'a', idRecinto:'1', fecha:'2099-11-17', horaInicio:'10:00', horaFin:'11:00'};
const ocupacion = (extra: Partial<OcupacionDisponibilidad> = {}): OcupacionDisponibilidad => ({...a, id:'ocupacion', nombreRecinto:'Sala', tipo:'evento', fuente:'evento', informativa:false, titulo:'Actividad autorizada', ...extra});
const agenda = (ocupaciones = [ocupacion()]): AgendaDisponibilidad => ({fecha:a.fecha, consultadoEn:new Date().toISOString(), zonaHoraria:'America/Mexico_City', margenSeparacionMinutos:30,
  recintos:[{id:'1', nombre:'Sala', ocupaciones, franjasLibres:[]}, {id:'2', nombre:'Laboratorio', ocupaciones:[], franjasLibres:[]}, {id:'3', nombre:'Sala pequeña', ocupaciones:[], franjasLibres:[]}]});
const capacidades = new Map([['1',20],['2',30],['3',5]]);

test('alternativas conservan duración y capacidad, aprovechan ocupación parcial y respetan el margen', () => {
  const r = alternativasDisponibilidad(a, [a], agenda(), capacidades, 10, 0);
  assert.deepEqual(r.filter(o => o.idRecinto === '1').map(o => [o.horaInicio,o.horaFin]), [['08:30','09:30'],['11:30','12:30']]);
  assert.ok(r.some(o => o.idRecinto === '2' && o.horaInicio === a.horaInicio));
  assert.ok(r.every(o => o.idRecinto !== '3'));
  for (const o of r) assert.equal(revisarFranjaRecinto(o, agenda().recintos.find(r => r.id === o.idRecinto)!.ocupaciones,30).disponible,true);
});
test('las opciones consideran otras actividades de la solicitud y las clases siguen siendo informativas', () => {
  const otras = [a, {...a,id:'b',horaInicio:'11:30',horaFin:'12:30'}];
  const clase = ocupacion({id:'clase',idRecinto:'2',tipo:'clase',fuente:'clase',informativa:true});
  const ag = agenda(); ag.recintos[1].ocupaciones.push(clase);
  const r = alternativasDisponibilidad(a, otras, ag, capacidades, 10, 0);
  assert.ok(!r.some(o => o.idRecinto === '1' && o.horaInicio === '11:30'));
  assert.ok(r.some(o => o.idRecinto === '2' && o.advertencias[0]?.id === 'clase'));
});
test('no se ofrecen horas pasadas, espacios insuficientes ni horarios fuera de la jornada visible', () => {
  assert.deepEqual(alternativasDisponibilidad(a,[a],agenda(),capacidades,100,0),[]);
  assert.deepEqual(alternativasDisponibilidad(a,[a],agenda(),capacidades,10,Date.parse('2100-01-01T00:00:00Z')),[]);
  const r = alternativasDisponibilidad({...a,horaInicio:'20:00',horaFin:'21:00'},[a],agenda([]),capacidades,10,0);
  assert.ok(r.every(o => o.horaInicio >= '07:00' && o.horaFin <= '21:00'));
});
test('un bloqueo no se considera cerrado solo porque pasó su fin previsto', () => {
  const bloqueo = ocupacion({tipo:'bloqueo',fuente:'bloqueo',horaInicio:'00:00',horaFin:'24:00',finPrevisto:'2099-11-17T09:00:00-06:00'});
  const ag = agenda([bloqueo]); ag.recintos = ag.recintos.slice(0,1);
  assert.deepEqual(alternativasDisponibilidad(a,[a],ag,capacidades,10,0),[]);
});
test('el motivo de corrección identifica actividad, conflicto posterior y sugerencia sin reservar', () => {
  const opcion = {...a,idRecinto:'2',nombreRecinto:'Laboratorio',advertencias:[]};
  const r: RevisionDisponibilidadSolicitud = {idSolicitud:'1',versionSolicitud:1,consultadoEn:'2026-11-20T12:00:00Z',margenSeparacionMinutos:30,
    actividades:[{...a,nombreActividad:'Conferencia',nombreRecinto:'Sala',disponible:false,conflictos:[ocupacion({titulo:'Bloqueo de recinto',posteriorAlEnvio:true})],advertencias:[],alternativas:[opcion]}]};
  const texto = motivoCorreccionDisponibilidad(r,opcion);
  assert.match(texto,/Conferencia: Sala, 2099-11-17, 10:00–11:00/);
  assert.match(texto,/después del envío/); assert.match(texto,/Laboratorio/); assert.match(texto,/no reservan/);
});
test('el servicio consulta el expediente guardado y propaga errores sin anunciar resultados', async () => {
  const rutas: string[] = [];
  const servicio = crearServicioDisponibilidad(async (ruta) => { rutas.push(ruta); throw new Error('Servidor no disponible'); });
  await assert.rejects(servicio.revisarSolicitud('15'),/Servidor no disponible/);
  assert.deepEqual(rutas,['/organizacion/solicitudes/15/disponibilidad']);
});
