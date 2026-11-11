import React, { useEffect, useRef, useState } from "react";
import type { ContextoDatosTipo } from "./DatosContexto";
import { ContextoDatos } from "./almacenes";
import { useAutenticacion } from "./AutenticacionContexto";
import { transporteApi } from "../servicios/http";
import { guardarCartelRemoto } from "../servicios/archivos";
import type { Evento, SolicitudEvento } from "../tipos";

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
export function ProveedorDatosRemotos({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuarioActual } = useAutenticacion();
  const [estado, setEstado] = useState<any>(vacio),
    [listo, setListo] = useState(false),
    [error, setError] = useState("");
  const estadoRef = useRef<any>(estado),
    secuencia = useRef(0),
    montado = useRef(true);
  const cargar = async () => {
    const orden = ++secuencia.current;
    const nuevo = await api<any>("/estado");
    if (montado.current && orden === secuencia.current) {
      estadoRef.current = nuevo;
      setEstado(nuevo);
      setError("");
    }
    return nuevo;
  };
  useEffect(() => {
    montado.current = true;
    const refrescar = () => {
      void cargar()
        .catch((e) => setError(e.message))
        .finally(() => setListo(true));
    };
    refrescar();
    const t = window.setInterval(refrescar, 15000);
    window.addEventListener("tt:datos-remotos", refrescar);
    return () => {
      montado.current = false;
      window.clearInterval(t);
      window.removeEventListener("tt:datos-remotos", refrescar);
    };
  }, [usuarioActual?.id]);
  const intentar = async (accion: () => Promise<any>) => {
    try {
      return await accion();
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo guardar en PostgreSQL.";
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
      "Esta operación todavía no está conectada al servidor. No se guardaron cambios.";
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
    const r = await api<any>("/organizacion/solicitudes", {
      metodo: "POST",
      datos: {
        ...d,
        idArchivoCartel,
        enviar,
        fechasSolicitadas: d.fechasSolicitadas.map((a: any) => ({
          ...a,
          asistenciaEstimada: a.asistenciaEstimada || d.asistenciaEstimada,
          modalidadAsistencia: a.modalidadAsistencia || d.modalidadAsistencia,
        })),
      },
    });
    const nuevo = await cargar();
    const s = nuevo.listaSolicitudes.find((s: any) => s.id === r.id);
    if (!s)
      throw new Error(
        "La solicitud se guardó, pero no se pudo recargar. Consulta Mis solicitudes antes de enviar de nuevo.",
      );
    return s;
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
      await cargar();
      return { exito: true };
    });
  const verificarDisponibilidadRecinto = (
    id: string,
    fecha: string,
    inicio: string,
    fin: string,
    excluir?: string,
  ) => {
    const choque = estadoRef.current.listaEventos
      .filter((e: Evento) => e.estado === "publicado")
      .flatMap((e: Evento) => e.fechas.map((f) => ({ ...f, titulo: e.titulo })))
      .find(
        (f: any) =>
          !f.cancelada &&
          f.id !== excluir &&
          f.idRecinto === id &&
          f.fecha === fecha &&
          minutos(inicio) < minutos(f.horaFin) + 30 &&
          minutos(f.horaInicio) < minutos(fin) + 30,
      );
    return choque
      ? {
          disponible: false,
          tipoConflicto: "evento",
          tituloConflicto: choque.titulo,
          motivo:
            "El recinto coincide con " +
            choque.titulo +
            ". Conserva 30 minutos de separación.",
        }
      : { disponible: true };
  };
  const agenda = (fecha: string) =>
    estadoRef.current.listaEventos
      .filter((e: Evento) => e.estado === "publicado")
      .flatMap((e: Evento) =>
        e.fechas
          .filter((f) => f.fecha === fecha && !f.cancelada)
          .map((f) => ({
            id: f.id,
            idRecinto: f.idRecinto,
            nombreRecinto:
              estadoRef.current.listaRecintos.find(
                (r: any) => r.id === f.idRecinto,
              )?.nombre || "",
            fecha: f.fecha,
            horaInicio: f.horaInicio,
            horaFin: f.horaFin,
            tipo: "evento",
            titulo: e.titulo,
            descripcion: f.nombreActividad,
            responsable: e.nombreOrganizador,
          })),
      );
  const operaciones: Record<string, unknown> = {
    ...estado,
    verificarDisponibilidadRecinto,
    obtenerOcupacionesRecinto: (id: string, fecha: string) =>
      agenda(fecha).filter((a: any) => a.idRecinto === id),
    obtenerAgendaMultiRecinto: agenda,
    obtenerListaDeVerificacion: (id: string) => {
      const e = estadoRef.current.listaEventos.find((e: Evento) => e.id === id);
      const pendientes = e ? [] : ["Evento no disponible"];
      return {
        solicitudAutorizada: !!e,
        informacionGeneralCompleta: !!e,
        tieneFechas: !!e?.fechas.length,
        todasLasFechasTienenRecinto: !!e,
        todasLasFechasTienenVersionFinal: !!e?.fechas.every(
          (f: any) =>
            f.modalidadAsistencia !== "controlado" || f.esFinalConfirmado,
        ),
        puedePublicar: false,
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
        await api("/organizacion/solicitudes/" + id, {
          metodo: "PATCH",
          datos: {
            ...cambios,
            idArchivoCartel: cartel,
            enviar: reenviar,
            version,
          },
        });
        await cargar();
        return { exito: true };
      }),
    cancelarSolicitud: (id: string, version: number) =>
      intentar(async () => {
        await api("/organizacion/solicitudes/" + id + "/cancelacion", {
          metodo: "POST",
          datos: { version },
        });
        await cargar();
        return { exito: true };
      }),
    apartarAsiento: (
      _evento: string,
      idActividad: string,
      idAsiento: string,
      _etiqueta: string,
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
            idLugar:
              actividad?.modalidadAsistencia === "controlado"
                ? idAsiento
                : undefined,
          },
        });
        const nuevo = await cargar();
        return {
          exito: true,
          reservacion: nuevo.listaReservaciones.find(
            (x: any) => x.id === "apartado-" + r.id,
          ),
        };
      }),
    liberarApartadoAsiento: (id: string) =>
      intentar(async () => {
        await api(
          "/taquilla/apartados/" + id.replace(/^apartado-/, "") + "/liberacion",
          { metodo: "POST", datos: {} },
        );
        await cargar();
        return { exito: true };
      }),
    confirmarReservacion: (id: string) =>
      intentar(async () => {
        const r = await api<any>(
          "/taquilla/apartados/" +
            id.replace(/^apartado-/, "") +
            "/confirmacion",
          { metodo: "POST", datos: {} },
        );
        const nuevo = await cargar();
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
        await cargar();
        return { exito: true };
      }),
    procesarCheckIn: (codigo: string, _operador: string, idActividad: string) =>
      intentar(async () => {
        const r = await api<any>("/taquilla/checkin", {
          metodo: "POST",
          datos: { codigo, idActividad },
        });
        const nuevo = await cargar();
        return {
          exito: true,
          resultado: "exito",
          mensaje: r.mensaje,
          boleto: nuevo.listaBoletos.find(
            (b: any) => b.idReservacion === r.idReservacion,
          ),
        };
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
  if (!listo)
    return (
      <p role="status" className="p-10 text-center text-sm text-neutral-500">
        Cargando Ticket Trade…
      </p>
    );
  return (
    <ContextoDatos.Provider value={puente}>
      {error && (
        <div
          role="alert"
          className="m-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>{error}</p>
          <button
            className="font-semibold underline"
            onClick={() => void cargar().catch((e) => setError(e.message))}
          >
            Volver a consultar
          </button>
        </div>
      )}
      {children}
    </ContextoDatos.Provider>
  );
}
function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}
