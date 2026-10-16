import {
  Usuario,
  Recinto,
  SolicitudEvento,
  Evento,
  ArregloAsientos,
  BloqueoRecinto,
  Reservacion,
  BoletoDigital,
  RegistroEscaneo,
  ConfiguracionAsiento,
  HorarioClaseRegular
} from '../tipos';
import { generarIdentificadorQr } from '../utilidades/identificadores';

// Generador de asientos para el Auditorio Principal de ESCOM (Fijo, 11 filas: A-K, 3 bloques: Izq 62, Centro 118, Der 62 = 242 lugares)
export function generarAsientosAuditorio(): ConfiguracionAsiento[] {
  // Distribución real ESCOM: Fila A (frontal/pódium) a Fila K (posterior)
  const configuracionFilas: Array<{
    fila: string;
    cantIzq: number;
    cantCentro: number;
    cantDer: number;
  }> = [
    { fila: 'A', cantIzq: 3, cantCentro: 8, cantDer: 3 }, // 14
    { fila: 'B', cantIzq: 5, cantCentro: 11, cantDer: 5 }, // 21
    { fila: 'C', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'D', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'E', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'F', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'G', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'H', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'I', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'J', cantIzq: 6, cantCentro: 11, cantDer: 6 }, // 23
    { fila: 'K', cantIzq: 6, cantCentro: 11, cantDer: 6 }  // 23
  ];

  const asientos: ConfiguracionAsiento[] = [];

  configuracionFilas.forEach((cfg, indiceFila) => {
    const { fila, cantIzq, cantCentro, cantDer } = cfg;
    let numCorrelativo = 1;

    // 1. Bloque Lateral Izquierdo (Trapecio lateral)
    for (let i = 1; i <= cantIzq; i++) {
      const num = numCorrelativo++;
      const id = `asiento-aud-${fila}-${num}`;
      const etiqueta = `${fila}-${num}`;
      let categoria: ConfiguracionAsiento['categoria'] = 'asistente';
      let estaBloqueado = false;

      // Fila K, primeros 2 asientos para staff técnico
      if (fila === 'K' && i <= 2) {
        categoria = 'staff';
      }

      asientos.push({
        id,
        fila,
        numero: num,
        etiqueta,
        categoria,
        estaBloqueado,
        seccion: 'izq',
        posicionX: i,
        posicionY: indiceFila + 1
      });
    }

    // 2. Bloque Central (Frente al presídium principal)
    for (let i = 1; i <= cantCentro; i++) {
      const num = numCorrelativo++;
      const id = `asiento-aud-${fila}-${num}`;
      const etiqueta = `${fila}-${num}`;
      let categoria: ConfiguracionAsiento['categoria'] = 'asistente';
      let estaBloqueado = false;

      // Fila A: Los 8 asientos frontales del bloque central son VIP directivos
      if (fila === 'A') {
        categoria = 'vip';
      }
      // Fila B: Asientos 10 y 11 para comité organizador
      if (fila === 'B' && (i === 5 || i === 6)) {
        categoria = 'organizador';
      }

      asientos.push({
        id,
        fila,
        numero: num,
        etiqueta,
        categoria,
        estaBloqueado,
        seccion: 'centro',
        posicionX: 7 + i,
        posicionY: indiceFila + 1
      });
    }

    // 3. Bloque Lateral Derecho
    for (let i = 1; i <= cantDer; i++) {
      const num = numCorrelativo++;
      const id = `asiento-aud-${fila}-${num}`;
      const etiqueta = `${fila}-${num}`;
      let categoria: ConfiguracionAsiento['categoria'] = 'asistente';
      let estaBloqueado = false;

      // Fila K: Último asiento bloqueado para paso de cableado de consola y trípode
      if (fila === 'K' && i === cantDer) {
        estaBloqueado = true;
      }

      asientos.push({
        id,
        fila,
        numero: num,
        etiqueta,
        categoria,
        estaBloqueado,
        seccion: 'der',
        posicionX: 19 + i,
        posicionY: indiceFila + 1
      });
    }
  });

  return asientos;
}

// Generador de asientos para Sala 14 (Modular y flexible, 4 filas de 10 sillas)
export function generarAsientosSala14(): ConfiguracionAsiento[] {
  const filas = ['A', 'B', 'C', 'D'];
  const asientos: ConfiguracionAsiento[] = [];

  filas.forEach((fila, indiceFila) => {
    for (let num = 1; num <= 10; num++) {
      const id = `asiento-s14-${fila}-${num}`;
      const etiqueta = `${fila}-${num}`;
      let estaEliminado = false;

      // En Sala 14, se retiraron sillas del pasillo lateral derecho
      if (fila === 'D' && num >= 8) {
        estaEliminado = true;
      }

      asientos.push({
        id,
        fila,
        numero: num,
        etiqueta,
        categoria: 'asistente',
        estaBloqueado: false,
        estaEliminado,
        posicionX: num,
        posicionY: indiceFila + 1
      });
    }
  });

  return asientos;
}

// Generador de estaciones de trabajo para Laboratorios de Cómputo (Boceto real ESCOM: 10 norte, 18 centro, 10 sur = 38 equipos)
export function generarEstacionesLaboratorio(codigoLab: string = 'LAB'): ConfiguracionAsiento[] {
  const estaciones: ConfiguracionAsiento[] = [];
  let contadorPc = 1;

  // 1. ZONA NORTE (5 módulos verticales de 2 equipos = 10 equipos)
  for (let m = 1; m <= 5; m++) {
    for (let pos = 1; pos <= 2; pos++) {
      const numPc = contadorPc++;
      const id = `estacion-${codigoLab.toLowerCase()}-N${m}-${pos}`;
      const etiquetaPc = `PC-${String(numPc).padStart(2, '0')}`;
      const etiqueta = `Mesa N${m} · ${etiquetaPc}`;
      let categoria: ConfiguracionAsiento['categoria'] = 'asistente';
      let estaBloqueado = false;

      // PC-01 reservada para el docente / instructor
      if (numPc === 1) {
        categoria = 'organizador';
      }

      estaciones.push({
        id,
        fila: `N${m}`,
        numero: numPc,
        etiqueta,
        categoria,
        estaBloqueado,
        seccion: 'norte',
        equipoComputo: etiquetaPc,
        posicionX: m,
        posicionY: pos
      });
    }
  }

  // 2. ISLA CENTRAL (Bloque Izquierdo 8, Bloque Derecho 8, Cabecera 2 = 18 equipos)
  // 2.1 Bloque Central 1 (Izquierdo): Doble hilera de 4 equipos (4 arriba, 4 abajo = 8)
  for (let filaRel = 1; filaRel <= 2; filaRel++) {
    const filaLetra = filaRel === 1 ? 'C1-A' : 'C1-B';
    for (let c = 1; c <= 4; c++) {
      const numPc = contadorPc++;
      const id = `estacion-${codigoLab.toLowerCase()}-${filaLetra}-${c}`;
      const etiquetaPc = `PC-${String(numPc).padStart(2, '0')}`;
      const etiqueta = `Isla 1 · ${etiquetaPc}`;

      estaciones.push({
        id,
        fila: filaLetra,
        numero: numPc,
        etiqueta,
        categoria: 'asistente',
        estaBloqueado: false,
        seccion: 'centro',
        equipoComputo: etiquetaPc,
        posicionX: c,
        posicionY: 2 + filaRel
      });
    }
  }

  // 2.2 Bloque Central 2 (Derecho): Doble hilera de 4 equipos (4 arriba, 4 abajo = 8)
  for (let filaRel = 1; filaRel <= 2; filaRel++) {
    const filaLetra = filaRel === 1 ? 'C2-A' : 'C2-B';
    for (let c = 1; c <= 4; c++) {
      const numPc = contadorPc++;
      const id = `estacion-${codigoLab.toLowerCase()}-${filaLetra}-${c}`;
      const etiquetaPc = `PC-${String(numPc).padStart(2, '0')}`;
      const etiqueta = `Isla 2 · ${etiquetaPc}`;

      estaciones.push({
        id,
        fila: filaLetra,
        numero: numPc,
        etiqueta,
        categoria: 'asistente',
        estaBloqueado: false,
        seccion: 'centro',
        equipoComputo: etiquetaPc,
        posicionX: 4 + c,
        posicionY: 2 + filaRel
      });
    }
  }

  // 2.3 Cabecera Lateral Derecha (1 módulo vertical de 2 equipos = 2)
  for (let pos = 1; pos <= 2; pos++) {
    const numPc = contadorPc++;
    const id = `estacion-${codigoLab.toLowerCase()}-C3-${pos}`;
    const etiquetaPc = `PC-${String(numPc).padStart(2, '0')}`;
    const etiqueta = `Cabecera · ${etiquetaPc}`;

    estaciones.push({
      id,
      fila: 'C3',
      numero: numPc,
      etiqueta,
      categoria: 'asistente',
      estaBloqueado: false,
      seccion: 'centro',
      equipoComputo: etiquetaPc,
      posicionX: 9,
      posicionY: 2 + pos
    });
  }

  // 3. ZONA SUR (5 módulos verticales de 2 equipos = 10 equipos)
  for (let m = 1; m <= 5; m++) {
    for (let pos = 1; pos <= 2; pos++) {
      const numPc = contadorPc++;
      const id = `estacion-${codigoLab.toLowerCase()}-S${m}-${pos}`;
      const etiquetaPc = `PC-${String(numPc).padStart(2, '0')}`;
      const etiqueta = `Mesa S${m} · ${etiquetaPc}`;
      let estaBloqueado = false;

      // Último equipo (PC-38) bloqueado por nodo switch/servidor
      if (numPc === 38) {
        estaBloqueado = true;
      }

      estaciones.push({
        id,
        fila: `S${m}`,
        numero: numPc,
        etiqueta,
        categoria: 'asistente',
        estaBloqueado,
        seccion: 'sur',
        equipoComputo: etiquetaPc,
        posicionX: m,
        posicionY: 5 + pos
      });
    }
  }

  return estaciones;
}

// Alias para compatibilidad
export const generarAsientosLaboratorio = () => generarEstacionesLaboratorio('lab3');

// Catálogo Oficial de Usuarios de Prueba
export const USUARIOS_INICIALES: Usuario[] = [
  {
    id: 'usr-silva',
    nombre: 'M. en C. Roberto Silva',
    correo: 'rsilva@ipn.mx',
    password: 'Password123!',
    afiliacion: 'profesor',
    roles: ['asistente', 'organizador'],
    rolActivo: 'organizador',
    numeroEmpleado: 'EMP-98214',
    estaActivo: true,
    esVerificado: true,
    correoConfirmado: true,
    fechaRegistro: '2026-08-15T09:00:00Z'
  },
  {
    id: 'usr-carlos',
    nombre: 'Carlos Méndez Vega',
    correo: 'cmendezv@alumno.ipn.mx',
    password: 'Password123!',
    afiliacion: 'alumno',
    roles: ['asistente'],
    rolActivo: 'asistente',
    boleta: '2022630412',
    estaActivo: true,
    esVerificado: true,
    correoConfirmado: true,
    fechaRegistro: '2026-08-20T10:30:00Z'
  },
  {
    id: 'usr-subdireccion',
    nombre: 'Dra. Patricia González (Subdirectora)',
    correo: 'subdireccion_seis@escom.ipn.mx',
    password: 'Password123!',
    afiliacion: 'administrativo',
    roles: ['asistente', 'organizador', 'subdireccion'],
    rolActivo: 'subdireccion',
    numeroEmpleado: 'DIR-00412',
    estaActivo: true,
    esVerificado: true,
    correoConfirmado: true,
    fechaRegistro: '2026-08-01T08:00:00Z'
  },
  {
    id: 'usr-andrea',
    nombre: 'Andrea Rangel (Staff de Acceso)',
    correo: 'arangelg@ipn.mx',
    password: 'Password123!',
    afiliacion: 'pae',
    roles: ['asistente', 'staff'],
    rolActivo: 'staff',
    numeroEmpleado: 'PAE-44910',
    eventosAsignadosStaff: ['evt-simposio-ia', 'evt-hackathon-sistemas-distribuidos'],
    estaActivo: true,
    esVerificado: true,
    correoConfirmado: true,
    fechaRegistro: '2026-08-25T11:15:00Z'
  },
  {
    id: 'usr-admin',
    nombre: 'Ing. Fernando Castro (TI)',
    correo: 'soporte_ti@escom.ipn.mx',
    password: 'Password123!',
    afiliacion: 'administrativo',
    roles: ['asistente', 'admin'],
    rolActivo: 'admin',
    numeroEmpleado: 'TEC-11002',
    estaActivo: true,
    esVerificado: true,
    correoConfirmado: true,
    fechaRegistro: '2026-08-01T08:00:00Z'
  },
  {
    id: 'usr-externo',
    nombre: 'Lic. Mariana Morales (TechMX)',
    correo: 'mmorales@techmx.org',
    password: 'Password123!',
    afiliacion: 'externo',
    roles: ['asistente'],
    rolActivo: 'asistente',
    nombreOrganizacion: 'Fundación TechMX A.C.',
    puestoContacto: 'Directora de Vinculación Universitaria',
    telefonoContacto: '55-5555-1234',
    nombreDocumento: 'convenio_ipn_techmx_2026.pdf',
    estaActivo: true,
    esVerificado: true,
    correoConfirmado: true,
    fechaRegistro: '2026-09-01T14:20:00Z'
  }
];

// Catálogo Oficial de Recintos Físicos en ESCOM
export const RECINTOS_INICIALES: Recinto[] = [
  {
    id: 'rec-auditorio',
    nombre: 'Auditorio Principal de ESCOM',
    codigo: 'AUD-ESC',
    tipo: 'auditorio',
    capacidad: 242,
    ubicacion: 'Planta Baja, Edificio Central de Gobierno',
    indicaciones: 'Entrada por el vestíbulo principal, frente a la Plaza Roja.',
    equipamiento: ['Proyector láser 4K', 'Consola digital 24 canales', '4 micrófonos inalámbricos', 'Aire acondicionado central'],
    descripcion: 'Espacio institucional principal para congresos, simposios y ceremonias oficiales. Distribución trapezoidal de 3 bloques (Lateral Izquierdo: 62, Central: 118, Lateral Derecho: 62) y 2 pasillos de circulación.',
    permiteEliminarAsientos: false
  },
  {
    id: 'rec-sala14',
    nombre: 'Sala de Usos Múltiples 14',
    codigo: 'SALA-14',
    tipo: 'sala',
    capacidad: 40,
    ubicacion: 'Edificio 1, Segundo Piso',
    indicaciones: 'Al subir la escalera poniente, primera puerta a la izquierda.',
    equipamiento: ['Pantalla interactiva 85"', 'Pizarrón blanco de cristal', 'Mobiliario modular reconfigurable'],
    descripcion: 'Espacio flexible para talleres, defensas de tesis y reuniones de academia. Su arreglo de lugares es completamente modular.',
    permiteEliminarAsientos: true
  },
  {
    id: 'rec-lab-1',
    nombre: 'Laboratorio de Cómputo 1',
    codigo: 'LAB-01',
    tipo: 'laboratorio',
    capacidad: 38,
    ubicacion: 'Edificio de Laboratorios, Planta Baja',
    indicaciones: 'Acceso exclusivo con bata blanca y credencial IPN.',
    equipamiento: ['38 estaciones de trabajo Core i7', 'Red Gigabit con VLAN dedicada', 'Proyector interactivo'],
    descripcion: 'Laboratorio docente para prácticas curriculares. Distribución en islas y módulos perimetrales (10 norte, 18 centro, 10 sur = 38 equipos).',
    permiteEliminarAsientos: false
  },
  {
    id: 'rec-lab-2',
    nombre: 'Laboratorio de Cómputo 2',
    codigo: 'LAB-02',
    tipo: 'laboratorio',
    capacidad: 38,
    ubicacion: 'Edificio de Laboratorios, Planta Baja',
    indicaciones: 'Frente al Laboratorio 1. Credencial IPN visible.',
    equipamiento: ['38 estaciones de trabajo Xeon', 'Servidor local de bases de datos', 'Aire acondicionado'],
    descripcion: 'Laboratorio para asignaturas de bases de datos y ciberseguridad. Distribución espacial de 38 estaciones (10 norte, 18 centro, 10 sur).',
    permiteEliminarAsientos: false
  },
  {
    id: 'rec-lab-3',
    nombre: 'Laboratorio de Cómputo Avanzado 3',
    codigo: 'LAB-03',
    tipo: 'laboratorio',
    capacidad: 38,
    ubicacion: 'Edificio de Laboratorios Pesados, PB',
    indicaciones: 'Requiere bata blanca y credencial IPN visible.',
    equipamiento: ['38 estaciones de trabajo con GPU dedicada', 'Switch 10Gbps', 'Sistema ininterrumpido UPS'],
    descripcion: 'Laboratorio de alto rendimiento para IA y hackathones. Distribución espacial de 38 estaciones (10 norte, 18 centro, 10 sur).',
    permiteEliminarAsientos: false
  },
  // Alias de compatibilidad para eventos existentes
  {
    id: 'rec-lab-computo-3',
    nombre: 'Laboratorio de Cómputo Avanzado 3',
    codigo: 'LAB-03',
    tipo: 'laboratorio',
    capacidad: 38,
    ubicacion: 'Edificio de Laboratorios Pesados, PB',
    indicaciones: 'Requiere bata blanca y credencial IPN visible.',
    equipamiento: ['38 estaciones de trabajo con GPU dedicada', 'Switch 10Gbps', 'Sistema ininterrumpido UPS'],
    descripcion: 'Laboratorio de alto rendimiento para IA y hackathones. Distribución espacial de 38 estaciones (10 norte, 18 centro, 10 sur).',
    permiteEliminarAsientos: false
  }
];

// Horarios de Clases Académicas Regulares en Laboratorios
export const CLASES_REGULARES_INICIALES: HorarioClaseRegular[] = [
  // Laboratorio 1
  {
    id: 'clase-lab1-1',
    idRecinto: 'rec-lab-1',
    diaSemana: 1, // Lunes
    materia: 'Redes y Telecomunicaciones',
    grupo: '3CM2',
    profesor: 'M. en C. Roberto Morales',
    horaInicio: '08:30',
    horaFin: '10:00'
  },
  {
    id: 'clase-lab1-2',
    idRecinto: 'rec-lab-1',
    diaSemana: 2, // Martes
    materia: 'Arquitectura de Computadoras',
    grupo: '2CV1',
    profesor: 'Dr. Alejandro Gutiérrez',
    horaInicio: '11:30',
    horaFin: '13:00'
  },
  {
    id: 'clase-lab1-3',
    idRecinto: 'rec-lab-1',
    diaSemana: 3, // Miércoles
    materia: 'Redes y Telecomunicaciones',
    grupo: '3CM2',
    profesor: 'M. en C. Roberto Morales',
    horaInicio: '08:30',
    horaFin: '10:00'
  },
  {
    id: 'clase-lab1-4',
    idRecinto: 'rec-lab-1',
    diaSemana: 4, // Jueves
    materia: 'Arquitectura de Computadoras',
    grupo: '2CV1',
    profesor: 'Dr. Alejandro Gutiérrez',
    horaInicio: '11:30',
    horaFin: '13:00'
  },
  {
    id: 'clase-lab1-5',
    idRecinto: 'rec-lab-1',
    diaSemana: 5, // Viernes
    materia: 'Compiladores y Traductores',
    grupo: '4CM1',
    profesor: 'M. en C. Roberto Silva',
    horaInicio: '10:00',
    horaFin: '12:00'
  },

  // Laboratorio 2
  {
    id: 'clase-lab2-1',
    idRecinto: 'rec-lab-2',
    diaSemana: 1, // Lunes
    materia: 'Inteligencia Artificial',
    grupo: '4CM2',
    profesor: 'M. en C. Roberto Silva',
    horaInicio: '10:00',
    horaFin: '11:30'
  },
  {
    id: 'clase-lab2-2',
    idRecinto: 'rec-lab-2',
    diaSemana: 2, // Martes
    materia: 'Sistemas Distribuidos',
    grupo: '3CM1',
    profesor: 'Dr. Carlos Mendoza',
    horaInicio: '10:30',
    horaFin: '12:00'
  },
  {
    id: 'clase-lab2-3',
    idRecinto: 'rec-lab-2',
    diaSemana: 3, // Miércoles
    materia: 'Inteligencia Artificial',
    grupo: '4CM2',
    profesor: 'M. en C. Roberto Silva',
    horaInicio: '10:00',
    horaFin: '11:30'
  },
  {
    id: 'clase-lab2-4',
    idRecinto: 'rec-lab-2',
    diaSemana: 4, // Jueves
    materia: 'Sistemas Distribuidos',
    grupo: '3CM1',
    profesor: 'Dr. Carlos Mendoza',
    horaInicio: '10:30',
    horaFin: '12:00'
  },
  {
    id: 'clase-lab2-5',
    idRecinto: 'rec-lab-2',
    diaSemana: 5, // Viernes
    materia: 'Seguridad Informática',
    grupo: '4CV1',
    profesor: 'Dra. Patricia Arriaga',
    horaInicio: '12:00',
    horaFin: '14:00'
  },

  // Laboratorio 3
  {
    id: 'clase-lab3-1',
    idRecinto: 'rec-lab-3',
    diaSemana: 1, // Lunes
    materia: 'Cómputo Paralelo y GPU',
    grupo: '4CM3',
    profesor: 'Dra. Mónica Flores',
    horaInicio: '11:30',
    horaFin: '13:00'
  },
  {
    id: 'clase-lab3-2',
    idRecinto: 'rec-lab-3',
    diaSemana: 2, // Martes
    materia: 'Programación de Dispositivos Móviles',
    grupo: '3CV2',
    profesor: 'Ing. Javier Solís',
    horaInicio: '08:30',
    horaFin: '10:00'
  },
  {
    id: 'clase-lab3-3',
    idRecinto: 'rec-lab-3',
    diaSemana: 3, // Miércoles
    materia: 'Cómputo Paralelo y GPU',
    grupo: '4CM3',
    profesor: 'Dra. Mónica Flores',
    horaInicio: '11:30',
    horaFin: '13:00'
  },
  {
    id: 'clase-lab3-4',
    idRecinto: 'rec-lab-3',
    diaSemana: 4, // Jueves
    materia: 'Programación de Dispositivos Móviles',
    grupo: '3CV2',
    profesor: 'Ing. Javier Solís',
    horaInicio: '08:30',
    horaFin: '10:00'
  },
  // Alias lab computo 3
  {
    id: 'clase-labcomp3-1',
    idRecinto: 'rec-lab-computo-3',
    diaSemana: 2,
    materia: 'Sistemas Distribuidos',
    grupo: '3CM1',
    profesor: 'Dr. Carlos Mendoza',
    horaInicio: '10:30',
    horaFin: '12:00'
  }
];

// Solicitudes Oficiales Iniciales
export const SOLICITUDES_INICIALES: SolicitudEvento[] = [
  {
    id: 'sol-simposio-ia',
    idSolicitante: 'usr-silva',
    nombreSolicitante: 'M. en C. Roberto Silva',
    correoSolicitante: 'rsilva@ipn.mx',
    afiliacionSolicitante: 'profesor',
    identificadorSolicitante: 'EMP-98214',
    tituloEvento: 'Simposio Internacional de Inteligencia Artificial 2026',
    descripcionEvento: 'Ciclo de conferencias magistrales y presentación de investigaciones sobre redes neuronales y visión por computadora en ESCOM.',
    fechasSolicitadas: [
      {
        id: 'fecha-sol-1',
        fecha: '2026-10-15',
        horaInicio: '09:00',
        horaFin: '13:00',
        idRecinto: 'rec-auditorio'
      },
      {
        id: 'fecha-sol-2',
        fecha: '2026-10-16',
        horaInicio: '09:00',
        horaFin: '13:00',
        idRecinto: 'rec-auditorio'
      },
      {
        id: 'fecha-sol-3',
        fecha: '2026-10-17',
        horaInicio: '10:00',
        horaFin: '14:00',
        idRecinto: 'rec-sala14'
      }
    ],
    modalidadAsistencia: 'controlado',
    visibilidad: 'publico',
    asistenciaEstimada: 120,
    estado: 'autorizada',
    esExcepcional: false,
    revisadoPor: 'Dra. Patricia González (Subdirectora)',
    fechaRevision: '2026-09-22T10:00:00Z',
    fechaCreacion: '2026-09-20T08:30:00Z'
  },
  {
    id: 'sol-hackathon-lab',
    idSolicitante: 'usr-silva',
    nombreSolicitante: 'M. en C. Roberto Silva',
    correoSolicitante: 'rsilva@ipn.mx',
    afiliacionSolicitante: 'profesor',
    identificadorSolicitante: 'EMP-98214',
    tituloEvento: 'Hackathon y Reto de Cómputo Paralelo en GPU 2026',
    descripcionEvento: 'Competencia técnica de optimización de algoritmos distribuidos y CUDA en el Laboratorio de Cómputo 3.',
    fechasSolicitadas: [
      {
        id: 'fecha-sol-lab-1',
        fecha: '2026-10-24',
        horaInicio: '09:00',
        horaFin: '15:00',
        idRecinto: 'rec-lab-3'
      }
    ],
    modalidadAsistencia: 'controlado',
    visibilidad: 'publico',
    asistenciaEstimada: 38,
    estado: 'autorizada',
    esExcepcional: false,
    revisadoPor: 'Dra. Patricia González (Subdirectora)',
    fechaRevision: '2026-09-27T11:00:00Z',
    fechaCreacion: '2026-09-25T14:00:00Z'
  },
  {
    id: 'sol-taller-devops',
    idSolicitante: 'usr-silva',
    nombreSolicitante: 'M. en C. Roberto Silva',
    correoSolicitante: 'rsilva@ipn.mx',
    afiliacionSolicitante: 'profesor',
    identificadorSolicitante: 'EMP-98214',
    tituloEvento: 'Taller Práctico de Contenedores y Kubernetes',
    descripcionEvento: 'Sesión práctica de despliegue continuo y microservicios con Docker y clústeres locales K3s.',
    fechasSolicitadas: [
      {
        id: 'fecha-sol-devops-1',
        fecha: '2026-10-22',
        horaInicio: '15:00',
        horaFin: '18:00',
        idRecinto: 'rec-sala14'
      }
    ],
    modalidadAsistencia: 'controlado',
    visibilidad: 'interno',
    asistenciaEstimada: 35,
    estado: 'autorizada',
    esExcepcional: false,
    revisadoPor: 'Dra. Patricia González (Subdirectora)',
    fechaRevision: '2026-09-23T12:00:00Z',
    fechaCreacion: '2026-09-21T09:15:00Z'
  },
  {
    id: 'sol-urgente-ciberseguridad',
    idSolicitante: 'usr-carlos',
    nombreSolicitante: 'Carlos Méndez Vega',
    correoSolicitante: 'cmendezv@alumno.ipn.mx',
    afiliacionSolicitante: 'alumno',
    identificadorSolicitante: '2022630412',
    tituloEvento: 'Taller Extraordinario de Respuesta a Incidentes y Criptografía',
    descripcionEvento: 'Visita no programada de un egresado de ESCOM que trabaja como Lead Security Engineer en Europa. Propuesta tramitada con menos de 7 días de anticipación.',
    fechasSolicitadas: [
      {
        id: 'fecha-sol-urgente-1',
        fecha: '2026-10-04',
        horaInicio: '11:00',
        horaFin: '14:00',
        idRecinto: 'rec-sala14',
        fueraDeAnticipacion: true
      }
    ],
    modalidadAsistencia: 'controlado',
    visibilidad: 'interno',
    asistenciaEstimada: 40,
    estado: 'en_revision',
    esExcepcional: true,
    justificacionExcepcional: 'El ponente invitado viaja de regreso a Alemania el 5 de octubre; se cuenta con carta de aval de la Academia de Ciberseguridad de ESCOM y asistencia garantizada de estudiantes de 7mo semestre.',
    fechaCreacion: '2026-09-29T16:45:00Z'
  },
  {
    id: 'sol-rechazada-empalme',
    idSolicitante: 'usr-externo',
    nombreSolicitante: 'Lic. Mariana Morales (TechMX)',
    correoSolicitante: 'mmorales@techmx.org',
    afiliacionSolicitante: 'externo',
    identificadorSolicitante: 'Fundación TechMX A.C.',
    nombreDocumento: 'convenio_ipn_techmx_2026.pdf',
    tituloEvento: 'Jornada Externa de Reclutamiento de Talento Junior',
    descripcionEvento: 'Evaluación técnica masiva para vacantes de desarrolladores frontend.',
    fechasSolicitadas: [
      {
        id: 'fecha-sol-rechazada-1',
        fecha: '2026-10-15',
        horaInicio: '09:00',
        horaFin: '14:00',
        idRecinto: 'rec-auditorio'
      }
    ],
    modalidadAsistencia: 'controlado',
    visibilidad: 'publico',
    asistenciaEstimada: 120,
    estado: 'rechazada',
    esExcepcional: false,
    motivoRechazo: 'El Auditorio Principal ya se encuentra reservado y autorizado para el Simposio Internacional de IA en esa fecha y horario. Se recomienda solicitar fecha alterna o Sala 14.',
    revisadoPor: 'Dra. Patricia González (Subdirectora)',
    fechaRevision: '2026-09-24T11:30:00Z',
    fechaCreacion: '2026-09-23T14:10:00Z'
  },
  {
    id: 'sol-revision-ordinaria-demo',
    idSolicitante: 'usr-silva',
    nombreSolicitante: 'M. en C. Roberto Silva',
    correoSolicitante: 'rsilva@ipn.mx',
    afiliacionSolicitante: 'profesor',
    identificadorSolicitante: 'EMP-98214',
    tituloEvento: 'Seminario de Sistemas Distribuidos (demostración)',
    descripcionEvento: 'Solicitud ordinaria de prueba para recorrer la revisión de Subdirección y la edición de un trámite en revisión.',
    fechasSolicitadas: [{ id: 'fecha-sol-revision-demo', fecha: '2026-11-03', horaInicio: '09:00', horaFin: '12:00', idRecinto: 'rec-sala14', nombreDia: 'Día 1' }],
    modalidadAsistencia: 'controlado',
    visibilidad: 'interno',
    asistenciaEstimada: 30,
    estado: 'en_revision',
    esExcepcional: false,
    fechaCreacion: '2026-10-15T15:00:00Z'
  },
  {
    id: 'sol-correccion-demo',
    idSolicitante: 'usr-silva',
    nombreSolicitante: 'M. en C. Roberto Silva',
    correoSolicitante: 'rsilva@ipn.mx',
    afiliacionSolicitante: 'profesor',
    identificadorSolicitante: 'EMP-98214',
    tituloEvento: 'Práctica de infraestructura en la nube (demostración)',
    descripcionEvento: 'Trámite de prueba devuelto para completar la justificación y revisar el recinto solicitado.',
    fechasSolicitadas: [{ id: 'fecha-sol-correccion-demo', fecha: '2026-11-05', horaInicio: '13:00', horaFin: '16:00', idRecinto: 'rec-lab-3', nombreDia: 'Día 1' }],
    modalidadAsistencia: 'controlado',
    visibilidad: 'interno',
    asistenciaEstimada: 24,
    estado: 'requiere_correccion',
    esExcepcional: false,
    observacionesCorreccion: 'Confirma el recinto disponible y completa el programa de actividades por día.',
    fechaLimiteCorreccion: '2026-10-18T05:59:00Z',
    revisadoPor: 'Dra. Patricia González (Subdirectora)',
    fechaRevision: '2026-10-16T09:00:00Z',
    fechaCreacion: '2026-10-15T16:00:00Z'
  },
  {
    id: 'sol-borrador-demo',
    idSolicitante: 'usr-silva',
    nombreSolicitante: 'M. en C. Roberto Silva',
    correoSolicitante: 'rsilva@ipn.mx',
    afiliacionSolicitante: 'profesor',
    identificadorSolicitante: 'EMP-98214',
    tituloEvento: 'Encuentro de innovación ESCOM (borrador de demostración)',
    descripcionEvento: 'Borrador de prueba para mostrar la revisión y cancelación de un trámite todavía no resuelto.',
    fechasSolicitadas: [{ id: 'fecha-sol-borrador-demo', fecha: '2026-11-12', horaInicio: '10:00', horaFin: '13:00', idRecinto: 'rec-auditorio', nombreDia: 'Día 1' }],
    modalidadAsistencia: 'controlado',
    visibilidad: 'interno',
    asistenciaEstimada: 60,
    estado: 'borrador',
    esExcepcional: false,
    fechaCreacion: '2026-10-16T10:00:00Z'
  }
];

// Eventos Oficiales Iniciales
export const EVENTOS_INICIALES: Evento[] = [
  {
    id: 'evt-simposio-ia',
    idSolicitud: 'sol-simposio-ia',
    idOrganizador: 'usr-silva',
    nombreOrganizador: 'M. en C. Roberto Silva',
    titulo: 'Simposio Internacional de Inteligencia Artificial 2026',
    descripcion: 'Encuentro académico anual de la Escuela Superior de Cómputo enfocado en los avances de aprendizaje profundo, agentes autónomos y visión computacional. Con la participación de investigadores nacionales e internacionales.',
    categoria: 'Congreso',
    visibilidad: 'publico',
    modalidadAsistencia: 'controlado',
    estado: 'publicado',
    aforoMaximo: 242,
    urlImagen: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
    ponentes: ['Dra. Elena Rostova (MIT)', 'Dr. Carlos Mendoza (CINVESTAV)', 'M. en C. Roberto Silva (ESCOM)'],
    etiquetas: ['Inteligencia Artificial', 'Deep Learning', 'ESCOM', 'IPN'],
    fechaPublicacion: '2026-09-25T10:00:00Z',
    fechas: [
      {
        id: 'fec-simposio-d1',
        idEvento: 'evt-simposio-ia',
        nombreDia: 'Día 1',
        fecha: '2026-10-15',
        horaInicio: '09:00',
        horaFin: '13:00',
        idRecinto: 'rec-auditorio',
        idArregloFinal: 'arr-simposio-d1-final',
        esFinalConfirmado: true,
        ponentes: ['Dra. Elena Rostova (MIT)', 'M. en C. Roberto Silva (ESCOM)'],
        estadoInscripciones: 'abiertas',
        fechaLimiteInscripciones: '2026-10-15T08:00:00-06:00',
        versionInscripciones: 1,
        historialInscripciones: [
          {
            id: 'ins-inicial-simposio-d1',
            estado: 'abiertas',
            fechaCambio: '2026-09-25T10:05:00-06:00',
            idResponsable: 'usr-silva',
            responsable: 'M. en C. Roberto Silva',
            causa: 'apertura_manual'
          }
        ],
        programa: [
          {
            hora: '09:00 - 09:30',
            titulo: 'Registro y Ceremonia Inaugural con Autoridades de ESCOM',
            ponente: 'Dirección y Subdirección ESCOM',
            descripcion: 'Bienvenida oficial y entrega de gafetes a la comunidad politécnica.'
          },
          {
            hora: '09:30 - 11:15',
            titulo: 'Conferencia Magistral: Fronteras de Deep Learning y Redes Transformer Multimodales',
            ponente: 'Dra. Elena Rostova (MIT CSAIL)',
            descripcion: 'Nuevas arquitecturas de atención, inferencia distribuida y aplicaciones en visión artificial.'
          },
          {
            hora: '11:15 - 11:45',
            titulo: 'Receso y Networking Académico',
            descripcion: 'Intercambio de experiencias y café en vestíbulo del Auditorio.'
          },
          {
            hora: '11:45 - 13:00',
            titulo: 'Panel: Estado del Arte en Aprendizaje Profundo en la Industria Tecnológica',
            ponente: 'M. en C. Roberto Silva & Investigadores Invitados',
            descripcion: 'Discusión abierta con preguntas y respuestas de los asistentes.'
          }
        ]
      },
      {
        id: 'fec-simposio-d2',
        idEvento: 'evt-simposio-ia',
        nombreDia: 'Día 2',
        fecha: '2026-10-16',
        horaInicio: '09:00',
        horaFin: '13:00',
        idRecinto: 'rec-auditorio',
        idArregloFinal: 'arr-simposio-d2-final',
        esFinalConfirmado: true,
        ponentes: ['Dr. Carlos Mendoza (CINVESTAV)'],
        estadoInscripciones: 'abiertas',
        fechaLimiteInscripciones: '2026-10-16T08:00:00-06:00',
        versionInscripciones: 1,
        historialInscripciones: [
          {
            id: 'ins-inicial-simposio-d2',
            estado: 'abiertas',
            fechaCambio: '2026-09-25T10:05:00-06:00',
            idResponsable: 'usr-silva',
            responsable: 'M. en C. Roberto Silva',
            causa: 'apertura_manual'
          }
        ],
        programa: [
          {
            hora: '09:00 - 10:30',
            titulo: 'Magistral: Modelos Generativos y Aprendizaje por Refuerzo Autónomo',
            ponente: 'Dr. Carlos Mendoza (CINVESTAV Computación)',
            descripcion: 'Optimización de políticas en entornos de simulación robótica de alta fidelidad.'
          },
          {
            hora: '10:30 - 11:45',
            titulo: 'Sesión de Ponencias Orales de Alumnos de Posgrado ESCOM',
            ponente: 'Tesistas de Maestría y Doctorado',
            descripcion: 'Exposición de proyectos de investigación aplicada y prototipos funcionales.'
          },
          {
            hora: '11:45 - 13:00',
            titulo: 'Mesa de Trabajo: Retos Éticos y Seguridad de Agentes Autónomos',
            ponente: 'Dr. Carlos Mendoza & Academia de Sistemas',
            descripcion: 'Gobernanza de modelos de lenguaje e impacto en la formación académica.'
          }
        ]
      },
      {
        id: 'fec-simposio-d3',
        idEvento: 'evt-simposio-ia',
        nombreDia: 'Día 3',
        fecha: '2026-10-17',
        horaInicio: '10:00',
        horaFin: '14:00',
        idRecinto: 'rec-sala14',
        idArregloFinal: 'arr-simposio-d3-final',
        esFinalConfirmado: true,
        ponentes: ['M. en C. Roberto Silva (ESCOM)'],
        estadoInscripciones: 'cerradas',
        fechaLimiteInscripciones: '2026-10-17T09:00:00-06:00',
        versionInscripciones: 1,
        historialInscripciones: [
          {
            id: 'ins-inicial-simposio-d3',
            estado: 'cerradas',
            fechaCambio: '2026-09-25T10:05:00-06:00',
            idResponsable: 'usr-silva',
            responsable: 'M. en C. Roberto Silva',
            causa: 'cierre_manual'
          }
        ],
        programa: [
          {
            hora: '10:00 - 11:30',
            titulo: 'Demostración en Vivo: Implementación de Modelos Compactos en Edge Devices',
            ponente: 'M. en C. Roberto Silva',
            descripcion: 'Cuantización de pesos y despliegue sobre aceleradores empotrados.'
          },
          {
            hora: '11:30 - 13:00',
            titulo: 'Taller Interactivo de Benchmarking y Validación de Hiperparámetros',
            ponente: 'Laboratorio de Sistemas Inteligentes',
            descripcion: 'Ejercicios prácticos guiados para los asistentes registrados.'
          },
          {
            hora: '13:00 - 14:00',
            titulo: 'Clausura Oficial y Entrega de Reconocimientos con Valor Curricular',
            ponente: 'Comité Organizador',
            descripcion: 'Entrega de constancias académicas firmadas y cierre del simposio.'
          }
        ]
      }
    ]
  },
  {
    id: 'evt-hackathon-sistemas-distribuidos',
    idSolicitud: 'sol-hackathon-lab',
    idOrganizador: 'usr-silva',
    nombreOrganizador: 'M. en C. Roberto Silva',
    titulo: 'Hackathon y Reto de Cómputo Paralelo en GPU 2026',
    descripcion: 'Competencia técnica de optimización de algoritmos distribuidos y CUDA en el Laboratorio de Cómputo 3 de ESCOM. Cupo limitado a 38 estaciones de alto rendimiento en islas y módulos perimetrales.',
    categoria: 'Taller',
    visibilidad: 'publico',
    modalidadAsistencia: 'controlado',
    estado: 'publicado',
    aforoMaximo: 38,
    urlImagen: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    ponentes: ['Dra. Mónica Flores (NVIDIA Research)', 'M. en C. Roberto Silva (ESCOM)'],
    etiquetas: ['Laboratorio', 'GPU', 'CUDA', 'Cómputo Paralelo', 'ESCOM'],
    fechaPublicacion: '2026-09-28T09:00:00Z',
    fechas: [
      {
        id: 'fec-hackathon-d1',
        idEvento: 'evt-hackathon-sistemas-distribuidos',
        nombreDia: 'Día 1',
        fecha: '2026-10-24',
        horaInicio: '09:00',
        horaFin: '15:00',
        idRecinto: 'rec-lab-3',
        idArregloFinal: 'arr-hackathon-lab3-final',
        esFinalConfirmado: true,
        ponentes: ['Dra. Mónica Flores (NVIDIA Research)'],
        programa: [
          {
            hora: '09:00 - 09:30',
            titulo: 'Asignación de Estaciones de Cómputo y Credenciales del Clúster',
            ponente: 'Staff Técnico Lab 3',
            descripcion: 'Configuración de terminales Linux, variables de entorno CUDA y repositorios Git del reto.'
          },
          {
            hora: '09:30 - 11:00',
            titulo: 'Masterclass: Optimización de Kernels de Cómputo Paralelo en Arquitectura Ampere',
            ponente: 'Dra. Mónica Flores',
            descripcion: 'Patrones de acceso coalescente a memoria global, shared memory y perfiles con Nsight Compute.'
          },
          {
            hora: '11:00 - 14:00',
            titulo: 'Desafío Hackathon: Reducción de Latencia en Algoritmo de Detección en Tiempo Real',
            descripcion: 'Fase de desarrollo intensivo y envío de soluciones al juez automatizado en servidor central.'
          },
          {
            hora: '14:00 - 15:00',
            titulo: 'Evaluación del Tablero de Posiciones y Premiación',
            ponente: 'Comité de Evaluación NVIDIA & ESCOM',
            descripcion: 'Análisis de benchmarks de velocidad y entrega de premios a los mejores equipos.'
          }
        ]
      }
    ]
  },
  {
    id: 'evt-feria-empleo-ipn',
    idOrganizador: 'usr-subdireccion',
    nombreOrganizador: 'Subdirección de Servicios Educativos e Integración Social',
    titulo: 'Encuentro de Vinculación Laboral y Residencias Profesionales 2026',
    descripcion: 'Reunión con más de 25 empresas tecnológicas líderes para contratación de pasantes y residentes de ESCOM. Modalidad de acceso libre con conteo de aforo en puerta.',
    categoria: 'Institucional',
    visibilidad: 'interno',
    modalidadAsistencia: 'libre',
    estado: 'publicado',
    aforoMaximo: 200,
    urlImagen: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=80',
    ponentes: ['Directores de Talento TI de Amazon, Google México y Softtek'],
    etiquetas: ['Empleo', 'Bolsa de Trabajo', 'Residencias', 'IPN'],
    fechaPublicacion: '2026-09-26T09:00:00Z',
    fechas: [
      {
        id: 'fec-feria-d1',
        idEvento: 'evt-feria-empleo-ipn',
        nombreDia: 'Día 1',
        fecha: '2026-10-20',
        horaInicio: '10:00',
        horaFin: '16:00',
        idRecinto: 'rec-auditorio',
        esFinalConfirmado: true,
        ponentes: ['Comité de Vinculación ESCOM'],
        programa: [
          {
            hora: '10:00 - 11:30',
            titulo: 'Apertura de Stands de Empleabilidad y Filtro de CVs',
            descripcion: 'Recepción de estudiantes de últimos semestres y revisión de perfiles de LinkedIn y GitHub.'
          },
          {
            hora: '11:30 - 13:00',
            titulo: 'Charla: Qué buscan las Big Tech en las Entrevistas Técnicas para Egresados de ESCOM',
            ponente: 'Tech Recruiters Invitados',
            descripcion: 'Simulación de live-coding, resolución de problemas algorítmicos y preguntas de diseño.'
          },
          {
            hora: '13:00 - 16:00',
            titulo: 'Entrevistas On-Site y Pruebas Rápidas de Admisión',
            descripcion: 'Entrevistas de 20 minutos con gerentes de ingeniería para residencias profesionales inmediatas.'
          }
        ]
      }
    ]
  },
  {
    id: 'evt-reunion-claustro-privado',
    idOrganizador: 'usr-subdireccion',
    nombreOrganizador: 'Subdirección Académica ESCOM',
    titulo: 'Sesión Extraordinaria de Colegio de Profesores de Sistemas',
    descripcion: 'Revisión confidencial y dictamen de acreditación ABET para los planes de estudio 2026. Acceso privado restringido mediante clave.',
    categoria: 'Académico',
    visibilidad: 'privado',
    modalidadAsistencia: 'controlado',
    claveAccesoPrivada: 'ABET-ESCOM-2026',
    estado: 'publicado',
    aforoMaximo: 40,
    urlImagen: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    ponentes: ['Cuerpo Colegiado de Profesores Titulares'],
    etiquetas: ['Claustro', 'Privado', 'Acreditación'],
    fechaPublicacion: '2026-09-27T12:00:00Z',
    fechas: [
      {
        id: 'fec-claustro-d1',
        idEvento: 'evt-reunion-claustro-privado',
        fecha: '2026-10-25',
        horaInicio: '12:00',
        horaFin: '15:00',
        idRecinto: 'rec-sala14',
        idArregloFinal: 'arr-claustro-final',
        esFinalConfirmado: true,
        ponentes: ['Dra. Patricia González']
      }
    ]
  },
  {
    id: 'evt-taller-devops-config',
    idSolicitud: 'sol-taller-devops',
    idOrganizador: 'usr-silva',
    nombreOrganizador: 'M. en C. Roberto Silva',
    titulo: 'Taller Práctico de Contenedores y Kubernetes',
    descripcion: 'Evento en etapa de configuración de arreglos de asientos y lista de verificación previa a publicación.',
    categoria: 'Taller',
    visibilidad: 'interno',
    modalidadAsistencia: 'controlado',
    estado: 'configuracion',
    aforoMaximo: 35,
    urlImagen: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&auto=format&fit=crop&q=80',
    ponentes: ['M. en C. Roberto Silva'],
    etiquetas: ['DevOps', 'Docker', 'Kubernetes'],
    fechas: [
      {
        id: 'fec-devops-d1',
        idEvento: 'evt-taller-devops-config',
        fecha: '2026-10-22',
        horaInicio: '15:00',
        horaFin: '18:00',
        idRecinto: 'rec-sala14',
        esFinalConfirmado: false,
        ponentes: ['M. en C. Roberto Silva']
      }
    ]
  }
];

// Arreglos de Asientos y Lugares Oficiales
const asientosAuditorioSimposioD1 = generarAsientosAuditorio();
const asientosAuditorioSimposioD2 = generarAsientosAuditorio();
const asientosSala14SimposioD3 = generarAsientosSala14();
const asientosSala14Claustro = generarAsientosSala14();
const estacionesLab3Hackathon = generarEstacionesLaboratorio('lab3');
const estacionesLab1Taller = generarEstacionesLaboratorio('lab1');
const estacionesLab2BD = generarEstacionesLaboratorio('lab2');

export const ARREGLOS_INICIALES: ArregloAsientos[] = [
  {
    id: 'arr-hackathon-lab3-final',
    idFechaEvento: 'fec-hackathon-d1',
    idRecinto: 'rec-lab-3',
    nombre: 'Distribución Oficial — 38 Estaciones Lab 3',
    etiquetaVersion: 'v1.0-final',
    estado: 'version_final',
    asientos: estacionesLab3Hackathon,
    totalAsientos: 38,
    asientosAsistente: 36,
    asientosVip: 0,
    asientosOrganizador: 1,
    asientosStaff: 0,
    asientosBloqueados: 1,
    asientosSinAsignar: 0,
    notas: 'Versión final oficial para el Laboratorio de Cómputo 3 (10 norte, 18 centro, 10 sur).',
    fechaCreacion: '2026-09-28T10:00:00Z',
    fechaConfirmacionFinal: '2026-09-28T11:00:00Z'
  },
  {
    id: 'arr-simposio-d1-final',
    idFechaEvento: 'fec-simposio-d1',
    idRecinto: 'rec-auditorio',
    nombre: 'Arreglo Inaugural — Versión Oficial',
    etiquetaVersion: 'v1.0-final',
    estado: 'version_final',
    asientos: asientosAuditorioSimposioD1,
    totalAsientos: 242,
    asientosAsistente: 229,
    asientosVip: 8,
    asientosOrganizador: 2,
    asientosStaff: 2,
    asientosBloqueados: 1,
    asientosSinAsignar: 0,
    notas: 'Versión formal autorizada para la jornada inaugural. 3 bloques con 2 pasillos.',
    fechaCreacion: '2026-09-24T16:00:00Z',
    fechaConfirmacionFinal: '2026-09-25T09:00:00Z'
  },
  {
    id: 'arr-simposio-d2-final',
    idFechaEvento: 'fec-simposio-d2',
    idRecinto: 'rec-auditorio',
    nombre: 'Arreglo Jornada 2 — Distribución Estándar',
    etiquetaVersion: 'v1.0-final',
    estado: 'version_final',
    asientos: asientosAuditorioSimposioD2,
    totalAsientos: 242,
    asientosAsistente: 231,
    asientosVip: 8,
    asientosOrganizador: 2,
    asientosStaff: 0,
    asientosBloqueados: 1,
    asientosSinAsignar: 0,
    fechaCreacion: '2026-09-24T16:30:00Z',
    fechaConfirmacionFinal: '2026-09-25T09:15:00Z'
  },
  {
    id: 'arr-simposio-d3-final',
    idFechaEvento: 'fec-simposio-d3',
    idRecinto: 'rec-sala14',
    nombre: 'Arreglo Clausura — Sala 14 Modular',
    etiquetaVersion: 'v1.0-final',
    estado: 'version_final',
    asientos: asientosSala14SimposioD3,
    totalAsientos: 37,
    asientosAsistente: 37,
    asientosVip: 0,
    asientosOrganizador: 0,
    asientosStaff: 0,
    asientosBloqueados: 0,
    asientosSinAsignar: 0,
    fechaCreacion: '2026-09-24T17:00:00Z',
    fechaConfirmacionFinal: '2026-09-25T09:30:00Z'
  },
  {
    id: 'arr-claustro-final',
    idFechaEvento: 'fec-claustro-d1',
    idRecinto: 'rec-sala14',
    nombre: 'Arreglo Mesa Redonda Claustro',
    etiquetaVersion: 'v1.0-final',
    estado: 'version_final',
    asientos: asientosSala14Claustro,
    totalAsientos: 37,
    asientosAsistente: 37,
    asientosVip: 0,
    asientosOrganizador: 0,
    asientosStaff: 0,
    asientosBloqueados: 0,
    asientosSinAsignar: 0,
    fechaCreacion: '2026-09-27T10:00:00Z',
    fechaConfirmacionFinal: '2026-09-27T11:00:00Z'
  }
];

// Bloqueos de Mantenimiento / Actividad Oficial por Subdirección
export const BLOQUEOS_INICIALES: BloqueoRecinto[] = [
  {
    id: 'bloq-mantenimiento-proyector',
    idRecinto: 'rec-auditorio',
    titulo: 'Mantenimiento Preventivo de Luminarias y Proyector Láser',
    motivo: 'Alineación de óptica, limpieza de filtros y calibración acústica semestral por personal de Infraestructura IPN.',
    fechaInicio: '2026-10-18',
    horaInicio: '08:00',
    fechaFin: '2026-10-19',
    horaFin: '18:00',
    esIndefinido: false,
    creadoPor: 'Dra. Patricia González (Subdirectora)',
    fechaCreacion: '2026-09-15T09:00:00Z'
  },
  {
    id: 'bloq-red-lab2',
    idRecinto: 'rec-lab-2',
    titulo: 'Mantenimiento de Cableado Estructurado y Switch Core',
    motivo: 'Reemplazo de paneles de parcheo y switch de distribución en Laboratorio 2.',
    fechaInicio: '2026-10-21',
    horaInicio: '08:00',
    fechaFin: '2026-10-22',
    horaFin: '18:00',
    esIndefinido: false,
    creadoPor: 'Ing. Fernando Castro (TI)',
    fechaCreacion: '2026-09-20T10:00:00Z'
  }
];

// Reservaciones Iniciales
export const RESERVACIONES_INICIALES: Reservacion[] = [
  {
    id: 'res-carlos-d1',
    idEvento: 'evt-simposio-ia',
    idFechaEvento: 'fec-simposio-d1',
    idUsuario: 'usr-carlos',
    nombreUsuario: 'Carlos Méndez Vega',
    correoUsuario: 'cmendezv@alumno.ipn.mx',
    idAsiento: 'asiento-aud-C-7',
    etiquetaAsiento: 'C-7',
    estado: 'confirmada',
    fechaCreacion: '2026-09-26T11:00:00Z',
    fechaConfirmacion: '2026-09-26T11:02:00Z',
    idBoleto: 'bol-carlos-d1'
  },
  {
    id: 'res-externo-d1',
    idEvento: 'evt-simposio-ia',
    idFechaEvento: 'fec-simposio-d1',
    idUsuario: 'usr-externo',
    nombreUsuario: 'Lic. Mariana Morales (TechMX)',
    correoUsuario: 'mmorales@techmx.org',
    idAsiento: 'asiento-aud-A-5',
    etiquetaAsiento: 'A-5',
    estado: 'confirmada',
    fechaCreacion: '2026-09-26T14:20:00Z',
    fechaConfirmacion: '2026-09-26T14:21:00Z',
    idBoleto: 'bol-externo-vip'
  },
  {
    id: 'res-carlos-d2',
    idEvento: 'evt-simposio-ia',
    idFechaEvento: 'fec-simposio-d2',
    idUsuario: 'usr-carlos',
    nombreUsuario: 'Carlos Méndez Vega',
    correoUsuario: 'cmendezv@alumno.ipn.mx',
    idAsiento: 'asiento-aud-D-8',
    etiquetaAsiento: 'D-8',
    estado: 'confirmada',
    fechaCreacion: '2026-09-27T10:00:00Z',
    fechaConfirmacion: '2026-09-27T10:01:00Z',
    idBoleto: 'bol-carlos-d2-usado'
  },
  {
    id: 'res-carlos-lab',
    idEvento: 'evt-hackathon-sistemas-distribuidos',
    idFechaEvento: 'fec-hackathon-d1',
    idUsuario: 'usr-carlos',
    nombreUsuario: 'Carlos Méndez Vega',
    correoUsuario: 'cmendezv@alumno.ipn.mx',
    idAsiento: 'estacion-lab3-B-3',
    etiquetaAsiento: 'B-3 (PC-09)',
    estado: 'confirmada',
    fechaCreacion: '2026-09-28T12:00:00Z',
    fechaConfirmacion: '2026-09-28T12:02:00Z',
    idBoleto: 'bol-carlos-lab'
  }
];

// Boletos Digitales Emitidos (con Códigos QR de Prueba)
export const BOLETOS_INICIALES: BoletoDigital[] = [
  {
    id: 'bol-carlos-lab',
    idReservacion: 'res-carlos-lab',
    idEvento: 'evt-hackathon-sistemas-distribuidos',
    idFechaEvento: 'fec-hackathon-d1',
    idUsuario: 'usr-carlos',
    nombreUsuario: 'Carlos Méndez Vega',
    correoUsuario: 'cmendezv@alumno.ipn.mx',
    tituloEvento: 'Hackathon y Reto de Cómputo Paralelo en GPU 2026',
    fechaEvento: '2026-10-24',
    horaEvento: '09:00 - 15:00',
    nombreRecinto: 'Laboratorio de Cómputo Avanzado 3',
    etiquetaAsiento: 'B-3 (PC-09)',
    codigoQr: `TT-${generarIdentificadorQr()}`,
    estado: 'valido',
    fechaEmision: '2026-09-28T12:02:00Z'
  },
  {
    id: 'bol-carlos-d1',
    idReservacion: 'res-carlos-d1',
    idEvento: 'evt-simposio-ia',
    idFechaEvento: 'fec-simposio-d1',
    idUsuario: 'usr-carlos',
    nombreUsuario: 'Carlos Méndez Vega',
    correoUsuario: 'cmendezv@alumno.ipn.mx',
    tituloEvento: 'Simposio Internacional de Inteligencia Artificial 2026',
    fechaEvento: '2026-10-15',
    horaEvento: '09:00 - 13:00',
    nombreRecinto: 'Auditorio Principal de ESCOM',
    etiquetaAsiento: 'C-7',
    codigoQr: `TT-${generarIdentificadorQr()}`,
    estado: 'valido',
    fechaEmision: '2026-09-26T11:02:00Z'
  },
  {
    id: 'bol-externo-vip',
    idReservacion: 'res-externo-d1',
    idEvento: 'evt-simposio-ia',
    idFechaEvento: 'fec-simposio-d1',
    idUsuario: 'usr-externo',
    nombreUsuario: 'Lic. Mariana Morales (TechMX)',
    correoUsuario: 'mmorales@techmx.org',
    tituloEvento: 'Simposio Internacional de Inteligencia Artificial 2026',
    fechaEvento: '2026-10-15',
    horaEvento: '09:00 - 13:00',
    nombreRecinto: 'Auditorio Principal de ESCOM',
    etiquetaAsiento: 'A-5 (VIP)',
    codigoQr: `TT-${generarIdentificadorQr()}`,
    estado: 'valido',
    esEspecial: true,
    tipoEspecial: 'vip',
    emitidoPor: 'Mtro. Fernando Silva Reyes',
    fechaEmision: '2026-09-26T14:21:00Z'
  },
  {
    id: 'bol-carlos-d2-usado',
    idReservacion: 'res-carlos-d2',
    idEvento: 'evt-simposio-ia',
    idFechaEvento: 'fec-simposio-d2',
    idUsuario: 'usr-carlos',
    nombreUsuario: 'Carlos Méndez Vega',
    correoUsuario: 'cmendezv@alumno.ipn.mx',
    tituloEvento: 'Simposio Internacional de Inteligencia Artificial 2026',
    fechaEvento: '2026-10-16',
    horaEvento: '09:00 - 13:00',
    nombreRecinto: 'Auditorio Principal de ESCOM',
    etiquetaAsiento: 'D-8',
    codigoQr: `TT-${generarIdentificadorQr()}`,
    estado: 'utilizado',
    fechaCheckIn: '2026-10-16T08:52:14Z',
    revisadoPor: 'Andrea Rangel (Staff de Acceso)',
    fechaEmision: '2026-09-27T10:01:00Z'
  }
];

// Bitácora de Escaneos de Prueba
export const BITACORA_INICIAL_ESCANEOS: RegistroEscaneo[] = [
  {
    id: 'esc-001',
    idBoleto: 'bol-carlos-d2-usado',
    idEvento: 'evt-simposio-ia',
    idFechaEvento: 'fec-simposio-d2',
    fechaEscaneo: '2026-10-16T08:52:14Z',
    escaneadoPor: 'Andrea Rangel (Staff de Acceso)',
    resultado: 'exito',
    nombreAsistente: 'Carlos Méndez Vega',
    etiquetaAsiento: 'D-8',
    notas: 'Ingreso verificado por torniquete poniente'
  }
];
