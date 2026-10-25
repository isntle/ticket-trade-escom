import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarProgramacion} from '../src/dominio/solicitudes';
import {validarDistribuciones,lugaresDelRecinto} from '../src/dominio/distribucionSolicitud';
import {convertirDiasSolicitud} from '../src/dominio/programa';
import {validarItinerarios} from '../src/dominio/actividades';
import {destinoInternoSeguro,alternativaRegreso,esRegreso,volverA} from '../src/dominio/navegacion';
import {RECINTOS_INICIALES,SOLICITUDES_INICIALES} from '../src/datos/datosIniciales';
import type {ElementoFechaSolicitada} from '../src/tipos';
const ahora=new Date('2030-01-01T12:00:00-06:00');
const base:ElementoFechaSolicitada={id:'act-1',nombreActividad:'Conferencias',descripcionActividad:'Investigación aplicada',fecha:'2030-02-01',horaInicio:'10:00',horaFin:'12:00',idRecinto:'rec-auditorio',modalidadAsistencia:'libre',asistenciaEstimada:80};

test('actividades simultáneas en recintos distintos y consecutivas con margen comparten una fecha',()=>{
  const paralela={...base,id:'act-2',idRecinto:'rec-sala14',asistenciaEstimada:20,modalidadAsistencia:'registro' as const};
  assert.equal(validarProgramacion([base,paralela],RECINTOS_INICIALES,{ahora}),undefined);
  assert.equal(validarProgramacion([base,{...base,id:'act-3',horaInicio:'12:30',horaFin:'14:00'}],RECINTOS_INICIALES,{ahora}),undefined);
  assert.match(validarProgramacion([base,{...base,id:'act-3',horaInicio:'12:29',horaFin:'14:00'}],RECINTOS_INICIALES,{ahora})||'',/30 minutos/);
  assert.match(validarProgramacion([base,{...base,id:'act-3',horaInicio:'11:00',horaFin:'13:00'}],RECINTOS_INICIALES,{ahora})||'',/mismo recinto/);
});
test('la capacidad y distribución se validan por actividad aunque el acceso general sea distinto',()=>{
  const sala=RECINTOS_INICIALES.find(r=>r.id==='rec-sala14')!;
  const reservada={...base,id:'act-2',idRecinto:sala.id,asistenciaEstimada:20,modalidadAsistencia:'controlado' as const};
  const datos={modalidadAsistencia:'libre' as const,asistenciaEstimada:200,fechasSolicitadas:[base,reservada]};
  assert.match(validarDistribuciones(datos,RECINTOS_INICIALES)||'',/distribución/);
  datos.fechasSolicitadas[1]={...reservada,distribucion:lugaresDelRecinto(sala),distribucionConfirmada:true};
  assert.equal(validarDistribuciones(datos,RECINTOS_INICIALES),undefined);
  assert.equal(validarProgramacion(datos.fechasSolicitadas,RECINTOS_INICIALES,{ahora,modalidad:'libre',aforo:200}),undefined);
  assert.match(validarProgramacion([{...reservada,asistenciaEstimada:sala.capacidad+1}],RECINTOS_INICIALES,{ahora})||'',/aforo/);
});
test('la conversión conserva la identidad y los datos de cada actividad sin depender del orden',()=>{
  const otra={...base,id:'act-2',nombreActividad:'Competencia',idRecinto:'rec-sala14',asistenciaEstimada:20};
  const s={...SOLICITUDES_INICIALES[0],fechasSolicitadas:[base,otra]};
  const convertido=convertirDiasSolicitud(s,'evento');
  const invertido=convertirDiasSolicitud({...s,fechasSolicitadas:[otra,base]},'evento');
  assert.equal(convertido[0].id,invertido[1].id);
  assert.equal(convertido[0].nombreActividad,base.nombreActividad);
  assert.equal(convertido[1].asistenciaEstimada,20);
  assert.equal(convertido[1].modalidadAsistencia,'libre');
  assert.equal(convertido[0].descripcionActividad,base.descripcionActividad);
});
test('el itinerario corresponde a una fecha con actividades y no sustituye ni duplica su programación',()=>{
  const itinerario={fecha:base.fecha,nombreArchivo:'itinerario.png',urlImagen:'data:image/png;base64,YQ=='};
  assert.equal(validarItinerarios([itinerario],[base]),undefined);
  assert.match(validarItinerarios([itinerario,itinerario],[base])||'',/uno|solo/);
  assert.match(validarItinerarios([itinerario],[])||'',/no tiene actividades/);
  assert.match(validarItinerarios([{...itinerario,urlImagen:'javascript:alert(1)'}],[base])||'',/JPEG o PNG/);
});
test('el regreso conserva una alternativa interna y no admite redirecciones a otro sitio',()=>{
  const ruta='/subdireccion?tab=solicitudes';
  assert.equal(alternativaRegreso(volverA(ruta)),ruta);
  assert.equal(esRegreso(volverA(ruta)),true);
  for(const externa of ['https://otro.example','//otro.example','/\\otro.example','/\n/sitio']) assert.equal(destinoInternoSeguro(externa),'/eventos');
});

test('un borrador admite actividades por completar, pero no horas inválidas ni programación pasada',()=>{
  const incompleta={...base,idRecinto:'',nombreActividad:''};
  assert.equal(validarProgramacion([incompleta],RECINTOS_INICIALES,{ahora,borrador:true}),undefined);
  assert.ok(validarProgramacion([incompleta],RECINTOS_INICIALES,{ahora}));
  assert.ok(validarProgramacion([{...incompleta,horaInicio:'25:00'}],RECINTOS_INICIALES,{ahora,borrador:true}));
  assert.ok(validarProgramacion([{...incompleta,fecha:'2029-12-31'}],RECINTOS_INICIALES,{ahora,borrador:true}));
});

test('dos identificadores del mismo recinto físico no permiten ocultar un cruce',()=>{
  const recinto=RECINTOS_INICIALES.find(r=>r.id===base.idRecinto)!;
  const alias={...recinto,id:'alias-del-auditorio'};
  assert.match(validarProgramacion([base,{...base,id:'act-alias',idRecinto:alias.id}],[...RECINTOS_INICIALES,alias],{ahora})||'',/mismo recinto/);
});
