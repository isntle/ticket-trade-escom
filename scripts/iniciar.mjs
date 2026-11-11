import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const cwd = fileURLToPath(new URL("../", import.meta.url));
const procesos = [
  spawn(process.execPath, ["--import", "tsx", "backend/server.ts"], {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  }),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--port", "3000", "--host", "127.0.0.1"],
    { cwd, stdio: "inherit", windowsHide: true },
  ),
];
let cerrando = false;
function cerrar(codigo = 0) {
  if (cerrando) return;
  cerrando = true;
  procesos.forEach((p) => p.kill());
  process.exitCode = codigo;
}
procesos.forEach((p) => {
  p.on("error", (e) => {
    console.error(e.message);
    cerrar(1);
  });
  p.on("exit", (codigo) => cerrar(codigo || 0));
});
process.on("SIGINT", () => cerrar());
process.on("SIGTERM", () => cerrar());
