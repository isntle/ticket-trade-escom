import { crearAlmacenDisponibilidad } from "../servicios/almacenDisponibilidad.js";
import { modoDemostracionActivo } from "../dominio/demostracion.js";
import { textoParaUsuario } from '../utilidades/textoParaUsuario.js';
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ContextoDatosTipo } from "./DatosContexto.js";
import { ContextoDatos } from "./almacenes.js";
import { useAutenticacion } from "./AutenticacionContexto.js";
import { transporteApi, ErrorApi } from "../servicios/http.js";
import { tokenEnlacePrivado } from '../servicios/enlacePrivado.js';
import { guardarArchivoRemoto, guardarCartelRemoto } from "../servicios/archivos.js";
import {
  obtenerConflictoReserva,
  obtenerMensajeErrorCruce,
} from "../dominio/crucesReservas.js";
import type { Evento, ResultadoEscaneo, SolicitudEvento, Usuario } from "../tipos/index.js";

function clasificarErrorCheckIn(
  mensaje: string,
  estado?: number,
): ResultadoEscaneo {
  if (
    estado === 401 ||
    estado === 403 ||
    /personal asignado|autorizaci/i.test(mensaje)
  )
    return "no_autorizado";
  if (/ya fue utilizado/i.test(mensaje)) return "ya_utilizado";
  if (/no tiene una reservaci|otra actividad/i.test(mensaje))
    return "fecha_invalida";
  if (/cancelad|invalidad/i.test(mensaje)) return "cancelado";
  if (/30 minutos antes|horario/i.test(mensaje)) return "fuera_de_horario";
  if (/suspendid|no está habilitada/i.test(mensaje)) return "suspendido";
  if (/entrada libre|no disponible|no existe/i.test(mensaje))
    return "evento_invalido";
  if (/no corresponde a un boleto/i.test(mensaje)) return "inexistente";
  return "inexistente";
}

const api = transporteApi();
const vacio = {
  listaEventos: [],
  listaSolicitudes: [],
  listaRecintos: [],
  listaArreglos: [],
  listaBloqueos: [],
  listaReservaciones: [],
  listaBoletos: [],
  listaEspera: [],
  listaIntencionesAsistencia: [],
  bitacoraEscaneos: [],
  listaClasesRegulares: [],
  listaOcupacionesInternas: [],
  calendarioRevision: null,
};
export function ProveedorDatosRemotos({ children }: { children: React.ReactNode }) {
  const { usuarioActual } = useAutenticacion();
  const alcance = JSON.stringify([usuarioActual?.id, usuarioActual?.roles, modoDemostracionActivo()]);
  return <DatosDeSesion key={alcance} usuarioActual={usuarioActual}>{children}</DatosDeSesion>;
}

function DatosDeSesion({ children, usuarioActual }: {
  children: React.ReactNode;
  usuarioActual: Usuario | null | undefined;
}) {
  const agendaRemota = useMemo(() => crearAlmacenDisponibilidad(), []);
  useEffect(() => () => agendaRemota.limpiar(), [agendaRemota]);
  const [estado, setEstado] = useState<any>(vacio),
    [listo, setListo] = useState(false),
    [error, setError] = useState(""),
    [errorLectura, setErrorLectura] = useState("");
  const lecturasActivas = useRef(0);
  const estadoRef = useRef<any>(estado),
    secuencia = useRef(0),
    montado = useRef(true);
  const cargar = async (mensajeSiFalla?: string) => {
    const orden = ++secuencia.current;
    lecturasActivas.current++;
    try {
      const signal = AbortSignal.timeout(15000);
      const nuevo = await api<any>("/estado", { signal });
      const coincidencia = window.location.pathname.match(/^\/eventos\/([^/]+)(?:\/reservar)?\/?$/);
      const token = coincidencia ? tokenEnlacePrivado(decodeURIComponent(coincidencia[1])) : undefined;
      if (coincidencia && token) {
        const idEvento = decodeURIComponent(coincidencia[1]);
        try {
          const acceso = await api<any>('/estado/evento-privado', { metodo: 'POST', datos: { idEvento, token }, signal });
          nuevo.listaEventos = [...nuevo.listaEventos.filter((e: any) => e.id !== idEvento), { ...acceso.evento, accesoPorEnlace: true }];
          nuevo.listaArreglos = [...nuevo.listaArreglos.filter((a: any) => !acceso.arreglos.some((p: any) => p.id === a.id)), ...acceso.arreglos];
          nuevo.listaReservaciones = [...nuevo.listaReservaciones.filter((r: any) => r.idEvento !== idEvento), ...acceso.reservaciones];
        } catch (e) {
          if (!(e instanceof ErrorApi) || e.estado !== 404) throw e;
          nuevo.listaEventos = nuevo.listaEventos.filter((evento: any) => evento.id !== idEvento);
        }
      }
      if (montado.current && orden === secuencia.current) {
        estadoRef.current = nuevo;
        setEstado(nuevo);
        setErrorLectura("");
        setListo(true);
      }
      return nuevo;
    } catch (error) {
      if (montado.current && orden === secuencia.current) {
        setErrorLectura(mensajeSiFalla || (error instanceof Error ? error.message : "No se pudo actualizar la vista."));
      }
      throw error;
    } finally {
      lecturasActivas.current--;
    }
  };

  const actualizarTrasGuardar = () =>
    cargar("El cambio se guardó. Vuelve a consultar para actualizar la vista.")
      .catch(() => estadoRef.current);

  const reconsultar = () => {
    setError("");
    void cargar().catch(() => {});
  };
  useEffect(() => {
    montado.current = true;
    const refrescar = () => void cargar().catch(() => {});
    const refrescarEnSegundoPlano = () => {
      if (!document.hidden && lecturasActivas.current === 0) refrescar();
    };
    refrescar();
    const t = window.setInterval(refrescarEnSegundoPlano, 15000);
    document.addEventListener("visibilitychange", refrescarEnSegundoPlano);
    window.addEventListener("tt:datos-remotos", refrescar);
    const refrescarEnlace = () => {
      const ruta = window.location.pathname.match(/^\/eventos\/([^/]+)(?:\/reservar)?\/?$/);
      const tieneEnlace = ruta && tokenEnlacePrivado(ruta[1]);
      if (tieneEnlace || estadoRef.current.listaEventos.some((evento: any) => evento.accesoPorEnlace)) {
        refrescar();
      }
    };
    window.addEventListener("tt:navegacion", refrescarEnlace);
    window.addEventListener("popstate", refrescarEnlace);
    return () => {
      montado.current = false;
      secuencia.current++;
      document.removeEventListener("visibilitychange", refrescarEnSegundoPlano);
      window.clearInterval(t);
      window.removeEventListener("tt:datos-remotos", refrescar);
      window.removeEventListener("tt:navegacion", refrescarEnlace);
      window.removeEventListener("popstate", refrescarEnlace);
    };
  }, []);
  const intentar = async (accion: () => Promise<any>) => {
    setError("");
    try {
      return await accion();
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudieron guardar los cambios.";
      setError(mensaje);
      return {
        exito: false,
        error: mensaje,
        mensaje,
        resultado: "codigo_no_reconocido",
      };
    }
  };
  const noDisponible = () => {
    const mensaje =
      "Esta función aún no está disponible. No se guardaron cambios.";
    setError(mensaje);
    return {
      exito: false,
      error: mensaje,
      mensaje,
      resultado: "codigo_no_reconocido",
    };
  };
  const crearSolicitud = async (d: any, enviar: boolean) => {
    const idArchivoCartel = await guardarCartelRemoto(
      d.urlImagen,
      d.nombreBanner,
    );
    let itinerarios = d.itinerarios;
    if (Array.isArray(itinerarios)) {
      itinerarios = await Promise.all(
        itinerarios.map(async (i: any) => ({
          ...i,
          idArchivo: await guardarCartelRemoto(i.urlImagen, i.nombreArchivo),
        }))
      );
    }
    const idArchivoDocumento = await guardarArchivoRemoto(
      d.urlDocumento,
      d.nombreDocumento || "documento_respaldo.pdf",
    );
    const r = await api<any>("/organizacion/solicitudes", {
      metodo: "POST",
      datos: {
        ...d,
        idArchivoCartel,
        itinerarios,
        idArchivoDocumento,
        enviar,
        fechasSolicitadas: d.fechasSolicitadas.map((a: any) => ({
          ...a,
          asistenciaEstimada: a.asistenciaEstimada || d.asistenciaEstimada,
          modalidadAsistencia: a.modalidadAsistencia || d.modalidadAsistencia,
        })),
      },
    });
    const nuevo = await actualizarTrasGuardar();
    return nuevo.listaSolicitudes.find((s: SolicitudEvento) => s.id === r.id)
      ?? { ...d, id: r.id, idEvento: r.idEvento, fechaCreacion: new Date().toISOString(), estado: enviar ? "en_revision" : "borrador" };
  };
  const dictaminar = (
    id: string,
    decision: string,
    motivo?: string,
    _revisor?: string,
    version?: number,
  ) =>
    intentar(async () => {
      await api("/organizacion/solicitudes/" + id + "/resolucion", {
        metodo: "POST",
        datos: {
          decision:
            decision === "autorizada"
              ? "Aprobada"
              : decision === "devuelta"
                ? "Devuelta"
                : "Rechazada",
          mensaje: motivo,
          version:
            version ||
            estadoRef.current.listaSolicitudes.find((s: any) => s.id === id)
              ?.version ||
            1,
        },
      });
      await actualizarTrasGuardar();
      return { exito: true };
    });
  const verificarDisponibilidadRecinto = agendaRemota.verificar;
  const agenda = (fecha: string) =>
    agendaRemota.leer({ fecha }).agenda?.recintos.flatMap(r => r.ocupaciones) || [];
  const operaciones: Record<string, unknown> = {
    ...estado,
    agendaRemota,
    verificarDisponibilidadRecinto,
    obtenerOcupacionesRecinto: (id: string, fecha: string) =>
      agenda(fecha).filter((a: any) => a.idRecinto === id),
    obtenerAgendaMultiRecinto: agenda,
    obtenerListaDeVerificacion: (id: string) => {
      const e = estadoRef.current.listaEventos.find((e: Evento) => e.id === id);
      const pendientes = e ? [] : ["Evento no disponible"];
      return {
        solicitudAutorizada: !!e?.solicitudAutorizada,
        informacionGeneralCompleta: !!e,
        tieneFechas: !!e?.fechas.length,
        todasLasFechasTienenRecinto: !!e,
        todasLasFechasTienenVersionFinal: !!e?.fechas.every(
          (f: any) =>
            f.modalidadAsistencia !== "controlado" || f.esFinalConfirmado,
        ),
        puedePublicar: !!e?.solicitudAutorizada && !!e?.urlImagen && !!e?.titulo && !!e?.descripcion && e.fechas.length>0 && e.fechas.every((f:any)=>f.modalidadAsistencia!=="controlado"||f.esFinalConfirmado),
        elementosPendientes: pendientes,
      };
    },
    crearSolicitud: (d: SolicitudEvento) => crearSolicitud(d, true),
    guardarBorradorSolicitud: (d: SolicitudEvento) => crearSolicitud(d, false),
    dictaminarSolicitud: dictaminar,
    devolverSolicitud: (
      id: string,
      motivo: string,
      revisor: string,
      version: number,
    ) => dictaminar(id, "devuelta", motivo, revisor, version),
    atenderSolicitudExtraordinaria: (id: string, version: number) =>
      dictaminar(
        id,
        "autorizada",
        "Autorización extraordinaria revisada",
        undefined,
        version,
      ),
    actualizarSolicitud: (
      id: string,
      cambios: any,
      reenviar: boolean,
      version: number,
    ) =>
      intentar(async () => {
        const cartel = await guardarCartelRemoto(
          cambios.urlImagen,
          cambios.nombreBanner,
        );
        let itinerarios = cambios.itinerarios;
        if (Array.isArray(itinerarios)) {
          itinerarios = await Promise.all(
            itinerarios.map(async (i: any) => ({
              ...i,
              idArchivo: await guardarCartelRemoto(i.urlImagen, i.nombreArchivo),
            }))
          );
        }
        const idArchivoDocumento = await guardarArchivoRemoto(
          cambios.urlDocumento,
          cambios.nombreDocumento || "documento_respaldo.pdf",
        );
        await api("/organizacion/solicitudes/" + id, {
          metodo: "PATCH",
          datos: {
            ...cambios,
            idArchivoCartel: cartel,
            itinerarios,
            idArchivoDocumento,
            enviar: reenviar,
            version,
          },
        });
        await actualizarTrasGuardar();
        return { exito: true };
      }),
    cancelarSolicitud: (id: string, version: number) =>
      intentar(async () => {
        await api("/organizacion/solicitudes/" + id + "/cancelacion", {
          metodo: "POST",
          datos: { version },
        });
        await actualizarTrasGuardar();
        return { exito: true };
      }),
    apartarAsiento: (
      idEvento: string,
      idActividad: string,
      idAsiento: string,
      etiqueta: string,
      idUsuario: string,
    ) =>
      intentar(async () => {
        if (usuarioActual?.id !== idUsuario)
          throw new Error("Solo puedes reservar para tu cuenta.");
        const actividad = estadoRef.current.listaEventos
          .flatMap((e: Evento) => e.fechas)
          .find((a: any) => a.id === idActividad);
        const r = await api<any>("/taquilla/apartados", {
          metodo: "POST",
          datos: {
            idActividad,
            token: tokenEnlacePrivado(idEvento),
            idLugar:
              actividad?.modalidadAsistencia === "controlado"
                ? idAsiento
                : undefined,
          },
        });
        const nuevo = await actualizarTrasGuardar();
        return {
          exito: true,
          reservacion: nuevo.listaReservaciones.find(
            (x: any) => x.id === "apartado-" + r.id,
          ) ?? {
            id: "apartado-" + r.id,
            idEvento,
            idFechaEvento: idActividad,
            idUsuario,
            nombreUsuario: usuarioActual.nombre,
            correoUsuario: usuarioActual.correo,
            fechaCreacion: new Date(Date.parse(r.vence) - 120_000).toISOString(),
            idAsiento: actividad?.modalidadAsistencia === "controlado" ? idAsiento : undefined,
            etiquetaAsiento: etiqueta,
            estado: "apartado_temporal",
            tiempoExpiracionApartado: Date.parse(r.vence),
          },
        };
      }),
    liberarApartadoAsiento: (id: string) =>
      intentar(async () => {
        await api(
          "/taquilla/apartados/" + id.replace(/^apartado-/, "") + "/liberacion",
          { metodo: "POST", datos: {} },
        );
        await actualizarTrasGuardar();
        return { exito: true };
      }),
    confirmarReservacion: (id: string) =>
      intentar(async () => {
        const apartado = estadoRef.current.listaReservaciones.find(
          (x: any) => x.id === id || x.id === "apartado-" + id.replace(/^apartado-/, ""),
        );
        if (apartado) {
          const conflicto = obtenerConflictoReserva(
            apartado,
            estadoRef.current.listaReservaciones,
            estadoRef.current.listaEventos,
          );
          if (conflicto) {
            throw new Error(obtenerMensajeErrorCruce(conflicto));
          }
        }
        const r = await api<any>(
          "/taquilla/apartados/" +
            id.replace(/^apartado-/, "") +
            "/confirmacion",
          { metodo: "POST", datos: { token: apartado?.idEvento ? tokenEnlacePrivado(apartado.idEvento) : undefined } },
        );
        const nuevo = await actualizarTrasGuardar();
        return {
          exito: true,
          boleto: nuevo.listaBoletos.find((b: any) => b.idReservacion === r.id),
        };
      }),
    cancelarReservacion: (id: string) =>
      intentar(async () => {
        await api("/taquilla/reservaciones/" + id + "/cancelacion", {
          metodo: "POST",
          datos: {},
        });
        await actualizarTrasGuardar();
        return { exito: true };
      }),
    emitirBoletosEspeciales: (datos: {
      idEvento: string;
      idFechaEvento: string;
      tipo: string;
      cantidad: number;
      nombreBase: string;
      correoDestino: string;
      emitidoPor?: string;
      idOrganizador?: string;
      claveIdempotencia?: string;
    }) =>
      intentar(async () => {
        const r = await api<any>("/taquilla/especiales", {
          metodo: "POST",
          datos: {
            idEvento: datos.idEvento,
            idFechaEvento: datos.idFechaEvento,
            idActividad: datos.idFechaEvento,
            tipo: datos.tipo,
            cantidad: datos.cantidad,
            nombreBase: datos.nombreBase,
            correoDestino: datos.correoDestino,
            claveIdempotencia: datos.claveIdempotencia,
          },
        });
        const nuevo = await actualizarTrasGuardar();
        const idsEmitidos = new Set(
          (r.ids || []).map((id: string) =>
            String(id).startsWith("boleto-esp-")
              ? String(id)
              : "boleto-esp-" + id,
          ),
        );
        const boletos = nuevo.listaBoletos.filter((b: any) =>
          idsEmitidos.has(b.id),
        );
        return {
          exito: true,
          boletos: boletos.length ? boletos : r.boletos || [],
        };
      }),
    invalidarBoletoEspecial: (idBoleto: string, motivo: string) =>
      intentar(async () => {
        const idLimpio = String(idBoleto ?? "").replace(
          /^(?:boleto-esp-|bol-esp-|esp-)/i,
          "",
        );
        await api("/taquilla/especiales/" + idLimpio + "/invalidacion", {
          metodo: "POST",
          datos: { motivo },
        });
        await actualizarTrasGuardar();
        return { exito: true };
      }),
    procesarCheckIn: async (
      codigo: string,
      _operador: string,
      idActividad?: string,
    ) => {
      if (!idActividad) {
        return {
          exito: false,
          resultado: "evento_invalido" as ResultadoEscaneo,
          mensaje: "Selecciona una actividad válida para registrar accesos.",
        };
      }
      try {
        setError("");
        const r = await api<any>("/taquilla/checkin", {
          metodo: "POST",
          datos: { codigo, idActividad },
        });
        const nuevo = await cargar("El acceso ya se registró. Vuelve a consultar el historial antes de escanear otra vez.")
          .catch(() => estadoRef.current);
        const boleto = nuevo.listaBoletos.find(
          (b: any) =>
            b.idReservacion === r.idReservacion ||
            (r.idBoletoEspecial && b.id === "boleto-esp-" + r.idBoletoEspecial),
        );
        return {
          exito: true,
          resultado: "exito" as ResultadoEscaneo,
          mensaje: boleto
            ? `Acceso concedido a ${boleto.nombreUsuario}. Asiento asignado: ${boleto.etiquetaAsiento || "General"}.`
            : r.mensaje,
          boleto,
        };
      } catch (e) {
        const mensaje =
          e instanceof Error ? e.message : "No se pudo validar el acceso.";
        const estadoHttp = e instanceof ErrorApi ? e.estado : undefined;
        if (estadoHttp && estadoHttp >= 500) setError(mensaje);
        const nuevo = await cargar().catch(() => estadoRef.current);
        const resultado = clasificarErrorCheckIn(mensaje, estadoHttp);
        const codigoNorm = codigo.trim().toUpperCase();
        const boleto =
          resultado === "ya_utilizado" || resultado === "cancelado"
            ? nuevo.listaBoletos?.find(
                (b: any) =>
                  b.idFechaEvento === idActividad &&
                  (String(b.codigoQr || "").toUpperCase() === codigoNorm ||
                    String(b.codigoManual || "").toUpperCase() === codigoNorm),
              )
            : undefined;
        return {
          exito: false,
          error: mensaje,
          mensaje,
          resultado,
          boleto,
        };
      }
    },
    revisarCambioRecinto: (peticion:any) => intentar(async()=>{
      const e=estadoRef.current.listaEventos.find((e:any)=>e.id===peticion.idEvento);
      return api('/organizacion/eventos/'+peticion.idEvento+'/recinto/revision',{metodo:'POST',datos:{peticion,version:e?.versionServidor}});
    }),
    confirmarCambioRecinto: (propuesta:any,aceptarReduccion:boolean) => intentar(async()=>{
      await api('/organizacion/eventos/'+propuesta.peticion.idEvento+'/recinto',{metodo:'POST',datos:{peticion:propuesta.peticion,version:propuesta.firma,aceptarReduccion}});
      await actualizarTrasGuardar();return {exito:true};
    }),
    agregarFechaEvento: (id:string,actividad:any) => intentar(async()=>{
      const e=estadoRef.current.listaEventos.find((e:any)=>e.id===id);
      await api('/organizacion/eventos/'+id+'/actividades',{metodo:'POST',datos:{actividad,version:e?.versionServidor,motivo:actividad.motivo}});
      await actualizarTrasGuardar();return {exito:true};
    }),
    actualizarEvento: (id: string, parcial: any, versionEsperada: string) => intentar(async () => {
      const original=JSON.parse(versionEsperada);
      const datos={...parcial};
      if(parcial.itinerarios)datos.itinerarios=await Promise.all(parcial.itinerarios.map(async(i:any)=>({...i,idArchivo:await guardarCartelRemoto(i.urlImagen,i.nombreArchivo)})));
      if(Object.prototype.hasOwnProperty.call(parcial,'urlImagen') && parcial.urlImagen!==original.urlImagen) datos.idArchivoCartel=await guardarCartelRemoto(parcial.urlImagen);
      await api('/organizacion/eventos/'+id,{metodo:'PATCH',datos:{parcial:datos,version:original.versionServidor,motivo:parcial.historialCambios?.at(-1)?.motivo}});
      await actualizarTrasGuardar(); return {exito:true};
    }),
    cancelarUnidadEvento: (id:string,idActividad:string|undefined,motivo:string,retirar:boolean,version:string) => intentar(async()=>{
      await api('/organizacion/eventos/'+id+'/cancelacion',{metodo:'POST',datos:{idActividad,motivo,retirar,version:JSON.parse(version).versionServidor}});
      await actualizarTrasGuardar();return {exito:true};
    }),
    publicarEvento: (id:string) => intentar(async()=>{
      const e=estadoRef.current.listaEventos.find((e:any)=>e.id===id);
      await api('/organizacion/eventos/'+id+'/publicacion',{metodo:'POST',datos:{version:e?.versionServidor}});
      await actualizarTrasGuardar();return {exito:true};
    }),
    reiniciarDatosIniciales: () => {
      setError(
        "La demostración utiliza una base independiente. Los registros no se borran al cambiar de cuenta ni al salir del modo demo.",
      );
    },
  };
  const puente = new Proxy(operaciones, {
    get(obj, clave) {
      return clave in obj ? obj[clave as string] : noDisponible;
    },
  }) as unknown as ContextoDatosTipo;
  const aviso = (errorLectura || error) && (
    <div
      role="alert"
      className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      <p>{textoParaUsuario(errorLectura || error)}</p>
      <button type="button" className="font-semibold underline" onClick={reconsultar}>
        Volver a consultar
      </button>
    </div>
  );
  if (!listo) {
    return aviso || (
      <p role="status" className="p-10 text-center text-sm text-neutral-500">
        Cargando Ticket Trade…
      </p>
    );
  }
  return (
    <ContextoDatos.Provider value={puente}>
      {aviso}
      {children}
    </ContextoDatos.Provider>
  );
}
