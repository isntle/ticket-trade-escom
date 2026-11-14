import "dotenv/config";
import { procesarCorreos } from "../modulos/correos/servicio";
import { pool, seleccionarBaseDatos } from "../bd/pool";
// Ejecución acotada para scheduler/terminal; no depende de la vida de una petición HTTP.
try {
  console.log(await procesarCorreos());
} finally {
  await pool.end();
}
