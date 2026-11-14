import { app } from "./app";
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(` Servidor backend escuchando en http://localhost:${PORT}`);
});

// Solo en servidor persistente; en serverless ejecutar correos:procesar con un scheduler.
if (process.env.TT_CORREO_ACTIVO === "1") {
  let ocupado = false;
  const ejecutar = async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      const { procesarCorreos } = await import("./modulos/correos/servicio");
      await procesarCorreos();
    } catch {
      console.error(
        "No se pudo procesar la cola de correo. Revisa configuración y migraciones.",
      );
    } finally {
      ocupado = false;
    }
  };
  const reloj = setInterval(() => void ejecutar(), 15000);
  reloj.unref();
  void ejecutar();
}
