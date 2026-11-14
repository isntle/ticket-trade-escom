import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { crearAlmacenDisponibilidad } from '../src/servicios/almacenDisponibilidad';
import type { AgendaDisponibilidad, OcupacionDisponibilidad } from '../src/servicios/disponibilidadRecintos';
import { ContextoDatos } from '../src/contextos/almacenes';
import type { ContextoDatosTipo } from '../src/contextos/DatosContexto';
import { AgendaHorarioRecinto } from '../src/componentes/recintos/AgendaHorarioRecinto';
import { CalendarioRecinto } from '../src/componentes/calendario/CalendarioRecinto';
import { VisorDisponibilidadRecintos } from '../src/componentes/recintos/VisorDisponibilidadRecintos';
import { DiaSolicitud } from '../src/componentes/recintos/DiaSolicitud';
import { RECINTOS_INICIALES } from '../src/datos/datosIniciales';

const fecha = '2030-01-25';
const consulta = { fecha };
const recinto = { ...RECINTOS_INICIALES[0], id: '1' };
const actividad = { id:'propuesta',idRecinto:'1',fecha,horaInicio:'10:00',horaFin:'11:00',ponentes:[] };
const ocupacion = (cambios: Partial<OcupacionDisponibilidad> = {}): OcupacionDisponibilidad => ({
  id:'real',idRecinto:'1',nombreRecinto:recinto.nombre,fecha,horaInicio:'12:00',horaFin:'13:00',tipo:'evento',fuente:'evento',informativa:false,titulo:'Actividad autorizada',...cambios,
});
const agenda = (ocupaciones: OcupacionDisponibilidad[] = []): AgendaDisponibilidad => ({
  fecha,consultadoEn:'2030-01-01T18:00:00Z',zonaHoraria:'America/Mexico_City',margenSeparacionMinutos:30,
  recintos:[{id:'1',nombre:recinto.nombre,ocupaciones,franjasLibres:[]}],
});
const servicio = (consultarAgenda: () => Promise<AgendaDisponibilidad>) => ({
  consultarAgenda,
  revisar: async () => ({consultadoEn:'2030-01-01T18:00:00Z',margenSeparacionMinutos:30,actividades:[]}),
});
function diferida<T>() {
  let resolver!: (v:T) => void, rechazar!: (e:Error) => void;
  const promesa = new Promise<T>((r,j)=>{resolver=r;rechazar=j;});
  return {promesa,resolver,rechazar};
}
function contexto(almacen: ReturnType<typeof crearAlmacenDisponibilidad>): ContextoDatosTipo {
  return {
    agendaRemota:almacen,listaRecintos:[recinto],verificarDisponibilidadRecinto:almacen.verificar,
    obtenerOcupacionesRecinto:(id:string,dia:string)=>almacen.leer({fecha:dia}).agenda?.recintos.find(r=>r.id===id)?.ocupaciones||[],
  } as unknown as ContextoDatosTipo;
}
function renderizar(almacen: ReturnType<typeof crearAlmacenDisponibilidad>, componente: React.ReactNode) {
  return renderToStaticMarkup(React.createElement(ContextoDatos.Provider,{value:contexto(almacen)},componente));
}

test('agenda remota: no declara libre antes de cargar, deduplica consultas y respeta vigencia',async()=>{
  const d=diferida<AgendaDisponibilidad>(); let llamadas=0, reloj=100;
  const s=crearAlmacenDisponibilidad(servicio(async()=>{llamadas++;return d.promesa;}),()=>reloj);
  assert.equal(s.verificar('1',fecha,'10:00','11:00').disponible,false);
  const primera=s.cargar(consulta); assert.equal(s.cargar(consulta),primera);
  assert.equal(s.leer(consulta).estado,'cargando'); await Promise.resolve(); assert.equal(llamadas,1);
  d.resolver(agenda()); await primera;
  assert.equal(s.verificar('1',fecha,'10:00','11:00').disponible,true);
  await s.cargar(consulta);assert.equal(llamadas,1);
  reloj+=15000;await s.cargar(consulta);assert.equal(llamadas,2);
});
test('agenda remota: error de actualización retira la afirmación de disponibilidad; permite reintentar',async()=>{
  let fallar=false;
  const s=crearAlmacenDisponibilidad(servicio(async()=>{if(fallar)throw new Error('Sesión vencida');return agenda();}));
  await s.cargar(consulta);fallar=true;await s.cargar(consulta,true);
  assert.equal(s.leer(consulta).estado,'error');assert.equal(s.verificar('1',fecha,'10:00','11:00').disponible,false);
  assert.match(s.verificar('1',fecha,'10:00','11:00').motivo!,/Sesión vencida/);
  const html=renderizar(s,React.createElement(AgendaHorarioRecinto,{actividad,otras:[],alElegir:()=>{}}));
  assert.match(html,/Reintentar consulta/);assert.doesNotMatch(html,/>Disponible</);
  fallar=false;await s.cargar(consulta,true);assert.equal(s.leer(consulta).estado,'listo');
});
test('agenda remota: fecha y exclusión tienen cachés independientes',async()=>{
  const s=crearAlmacenDisponibilidad(servicio(async()=>agenda([ocupacion()])));
  await s.cargar(consulta);await s.cargar({...consulta,idActividadExcluir:'99'});
  assert.equal(s.leer({...consulta,idActividadExcluir:'otro'}).estado,'inicial');
  assert.equal(s.leer({fecha:'2030-01-26'}).estado,'inicial');
  assert.equal(s.leer({...consulta,idActividadExcluir:'99'}).estado,'listo');
});
test('agenda remota: respuestas tardías de otra fecha no sustituyen la selección',async()=>{
  const a=diferida<AgendaDisponibilidad>(), b=diferida<AgendaDisponibilidad>();
  const s=crearAlmacenDisponibilidad({...servicio(async()=>agenda()),consultarAgenda:async q=>q.fecha===fecha?a.promesa:b.promesa});
  const p=s.cargar(consulta),q=s.cargar({fecha:'2030-01-26'});
  b.resolver({...agenda(),fecha:'2030-01-26'});await q;a.resolver(agenda([ocupacion()]));await p;
  assert.equal(s.leer({fecha:'2030-01-26'}).agenda?.fecha,'2030-01-26');
  assert.equal(s.leer(consulta).agenda?.recintos[0].ocupaciones.length,1);
});
test('agenda remota: limpiar una sesión aborta sus lecturas y descarta respuestas tardías',async()=>{
  const d=diferida<AgendaDisponibilidad>();let signal:AbortSignal|undefined;
  const s=crearAlmacenDisponibilidad({...servicio(async()=>agenda()),consultarAgenda:async(_,senial)=>{signal=senial;return d.promesa;}});
  const p=s.cargar(consulta);await Promise.resolve();s.limpiar();
  assert.equal(signal?.aborted,true);d.resolver(agenda());await p;
  assert.equal(s.leer(consulta).estado,'inicial');assert.equal(s.verificar('1',fecha,'10:00','11:00').disponible,false);
});
test('agenda remota: la revisión al enviar siempre consulta el servidor aunque la agenda esté en caché',async()=>{
  let revisiones=0;
  const s=crearAlmacenDisponibilidad({...servicio(async()=>agenda()),revisar:async actividades=>{
    revisiones++;return {consultadoEn:'2030-01-01T18:00:00Z',margenSeparacionMinutos:30,actividades:actividades.map(a=>({...a,disponible:false,conflictos:[ocupacion()],advertencias:[]}))};
  }});
  await s.cargar(consulta);assert.equal(s.verificar('1',fecha,'12:00','13:00').disponible,true);
  assert.equal((await s.revisar([actividad])).actividades[0].disponible,false);
  await s.revisar([actividad]);assert.equal(revisiones,2);
});
test('agenda remota: clases no bloquean; permanecen como advertencia junto a un cruce real',async()=>{
  const s=crearAlmacenDisponibilidad(servicio(async()=>agenda([ocupacion(),ocupacion({id:'clase',fuente:'clase',tipo:'clase',informativa:true})])));
  await s.cargar(consulta);
  const r=s.verificar('1',fecha,'12:00','13:00');assert.equal(r.disponible,false);assert.equal(r.advertencias?.length,1);
  assert.equal(s.verificar('1',fecha,'13:30','14:00').disponible,true);
  assert.equal(s.verificar('2',fecha,'13:30','14:00').disponible,false);
  assert.equal(s.verificar('1',fecha,'21:00','21:30').disponible,false);
});
test('interfaz remota: ocupación parcial conserva bloques libres y clase seleccionable; las propuestas propias también separan',async()=>{
  const s=crearAlmacenDisponibilidad(servicio(async()=>agenda([ocupacion(),ocupacion({id:'clase',tipo:'clase',fuente:'clase',informativa:true,horaInicio:'09:00',horaFin:'11:00'})])));
  await s.cargar(consulta);
  const html=renderizar(s,React.createElement(AgendaHorarioRecinto,{actividad,otras:[{...actividad,id:'otra',horaInicio:'15:00',horaFin:'16:00'}],alElegir:()=>{}}));
  const botones=[...html.matchAll(/<button\b([^>]+)>/g)].map(m=>m[1]);
  const boton=(hora:string)=>botones.find(b=>b.includes(`aria-label="${hora}–`))!;
  assert.match(boton('10:00'),/elegir horario, clase informativa/);assert.doesNotMatch(boton('10:00'),/disabled/);
  assert.match(boton('12:00'),/disabled/);assert.match(boton('11:30'),/disabled/);
  assert.match(boton('14:30'),/disabled/);assert.doesNotMatch(boton('16:30'),/disabled/);
  assert.doesNotMatch(html,/21:30/);assert.match(html,/La selección no aparta/);
});
test('interfaz remota: carga inicial no anuncia espacios libres en agenda, visor o calendario',()=>{
  const s=crearAlmacenDisponibilidad(servicio(async()=>agenda()));
  const html=renderizar(s,React.createElement(React.Fragment,null,
    React.createElement(AgendaHorarioRecinto,{actividad,otras:[],alElegir:()=>{}}),
    React.createElement(VisorDisponibilidadRecintos,{fechaSeleccionada:fecha}),
    React.createElement(CalendarioRecinto,{idRecinto:'1',fechaSeleccionada:fecha})));
  assert.match(html,/Consultando la agenda actual/);assert.doesNotMatch(html,/>Disponible<|Completamente disponible|Sin conflictos registrados para el horario/);
  assert.match(html,/Fecha seleccionada:|Selección actual/);
});
test('interfaz remota: un cruce no deshabilita la fecha completa ni cambia la selección',async()=>{
  const s=crearAlmacenDisponibilidad(servicio(async()=>agenda([ocupacion()])));await s.cargar(consulta);
  const html=renderizar(s,React.createElement(CalendarioRecinto,{idRecinto:'1',fechaSeleccionada:fecha,horaInicio:'12:00',horaFin:'13:00'}));
  const boton=[...html.matchAll(/<button\b([^>]+)>/g)].find(m=>m[1].includes(`aria-label="${fecha}`))![1];
  assert.doesNotMatch(boton,/disabled/);assert.match(boton,/bg-\[#7a132b\]/);
  assert.match(html,/Fecha seleccionada: 2030-01-25/);assert.match(html,/Una ocupación parcial/);
});
test('interfaz remota: captura informa el cruce externo y la clase sin fingir autorización',async()=>{
  Object.assign(globalThis,{window:{location:{search:''}},sessionStorage:{getItem:()=>'{"paso":2}'}});
  const s=crearAlmacenDisponibilidad(servicio(async()=>agenda([ocupacion({horaInicio:'10:00',horaFin:'11:00'}),ocupacion({id:'clase',tipo:'clase',fuente:'clase',informativa:true,horaInicio:'10:00',horaFin:'11:00'})])));await s.cargar(consulta);
  const html=renderizar(s,React.createElement(DiaSolicitud,{dia:actividad,indice:0,modalidad:'registro',aforo:20,puedeEliminar:false,alCambiar:()=>{},alEliminar:()=>{}}));
  assert.match(html,/enviar la propuesta a revisión/);assert.match(html,/También coincide con una clase informativa/);
  assert.doesNotMatch(html,/Recinto disponible para este horario/);
});
