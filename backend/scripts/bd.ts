import { destinoBaseDatos, esPoolerSupabase } from "../bd/destino";
import "dotenv/config";
import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const carpeta = path.join(raiz, "base-de-datos/postgresql");
export const opciones = () =>
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {};
export async function ejecutarSql(c: pg.Pool | pg.Client, nombre: string) {
  const sql = (await fs.readFile(path.join(carpeta, nombre), "utf8")).replace(
    /^\\.*$/gm,
    "",
  );
  await c.query(sql);
}
export async function instalar(c: pg.Pool | pg.Client) {
  if (
    !(await c.query("SELECT to_regnamespace('ticket_trade') existe")).rows[0]
      .existe
  )
    await ejecutarSql(c, "00_instalar_tickettrade.sql");
  await ejecutarSql(c, "migraciones/07_sesiones_http.sql");
  await ejecutarSql(c, "migraciones/10_archivos_servidor.sql");
  await ejecutarSql(c, "migraciones/13_preferencias_perfil.sql");
}
export async function verificarModelo(c: pg.Pool | pg.Client) {
  const modelo = JSON.parse(
    await fs.readFile(path.join(carpeta, "fuentes/modelo.json"), "utf8"),
  );
  const html = await fs.readFile(
    path.join(carpeta, "fuentes/TicketTrade_Modelo_ER_Ultima-Version.html"),
    "utf8",
  );
  const definicion = html
    .split("const [T,R,G,DB]=")[1]
    ?.split("\n")[0]
    ?.replace(/;\s*$/, "");
  if (!definicion)
    throw new Error("No se encontró el modelo dentro del HTML de referencia.");
  const [tablasHtml, relacionesHtml] = JSON.parse(definicion);
  if (JSON.stringify(tablasHtml) !== JSON.stringify(modelo))
    throw new Error("El modelo JSON difiere del HTML de referencia.");
  const tablas = (
    await c.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='ticket_trade' AND table_type='BASE TABLE' ORDER BY table_name",
    )
  ).rows.map((r) => r.table_name);
  if (JSON.stringify(tablas) !== JSON.stringify(Object.keys(modelo).sort()))
    throw new Error("Las tablas no coinciden con las 73 tablas del modelo ER.");
  for (const nombre of tablas) {
    const columnas = (
      await c.query(
        "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='ticket_trade' AND table_name=$1 ORDER BY ordinal_position",
        [nombre],
      )
    ).rows;
    const tipos: Record<string, string> = {
      timestamptz: "timestamp with time zone",
      time: "time without time zone",
    };
    const esperado = modelo[nombre].c;
    if (
      columnas.length !== esperado.length ||
      columnas.some(
        (col, i) =>
          col.column_name !== esperado[i].n ||
          col.data_type !== (tipos[esperado[i].t] || esperado[i].t) ||
          (col.is_nullable === "YES") !== esperado[i].o,
      )
    )
      throw new Error(`Columnas distintas del ER: ${nombre}`);
  }
  const relaciones = (
    await c.query(
      "SELECT count(*)::int n FROM pg_constraint co JOIN pg_namespace n ON n.oid=co.connamespace WHERE n.nspname='ticket_trade' AND contype='f'",
    )
  ).rows[0].n;
  if (relaciones !== 96)
    throw new Error(
      `Se esperaban 96 relaciones, se encontraron ${relaciones}.`,
    );
  const fks = (
    await c.query(`SELECT origen.relname origen,ca.attname columna,destino.relname destino,cb.attname referencia
    FROM pg_constraint co JOIN pg_class origen ON origen.oid=co.conrelid JOIN pg_class destino ON destino.oid=co.confrelid
    JOIN pg_namespace ns ON ns.oid=origen.relnamespace
    JOIN pg_attribute ca ON ca.attrelid=origen.oid AND ca.attnum=co.conkey[1]
    JOIN pg_attribute cb ON cb.attrelid=destino.oid AND cb.attnum=co.confkey[1]
    WHERE ns.nspname='ticket_trade' AND co.contype='f'`)
  ).rows
    .map((r) => [r.origen, r.columna, r.destino, r.referencia].join("."))
    .sort();
  if (
    JSON.stringify(fks) !==
    JSON.stringify(
      relacionesHtml.map((r: string[]) => r.slice(0, 4).join(".")).sort(),
    )
  )
    throw new Error(
      "Las relaciones no coinciden con los extremos declarados en el HTML.",
    );
  await c.query("SELECT ticket_trade.validar_integridad()");
  console.log(
    "Modelo ER: 73 tablas, columnas, tipos, nulabilidad, 96 relaciones e integridad correctos.",
  );
}
export async function sembrar(c: pg.Pool | pg.Client) {
  const n = (await c.query('SELECT count(*)::int n FROM ticket_trade."Cuenta"'))
    .rows[0].n;
  if (!n) await ejecutarSql(c, "05_datos_ejemplo_opcionales.sql");
  // Los SQL anteriores reservan estos IDs para ejemplos; no sobrescribir otra instalación.
  const demos = await c.query(
    `SELECT count(*)::int n FROM ticket_trade."Cuenta" WHERE id_cuenta BETWEEN 1001 AND 1006 AND correo=('cuenta'||id_cuenta::text||'@example.invalid')`,
  );
  if (demos.rows[0].n !== 6)
    throw new Error(
      "La semilla solo admite la instalación académica de ejemplo; no se modificarán otras cuentas.",
    );
  await ejecutarSql(c, "08_semilla_demo.sql");
  await ejecutarSql(c, "09_eventos_reales.sql");
  await c.query("BEGIN");
  try {
    const comprobante = await fs.readFile(
      path.join(raiz, "tests/fixtures/documento-identidad-prueba.pdf"),
    );
    if (
      !(
        await c.query(
          "SELECT 1 FROM infra.archivo_contenido WHERE id_archivo=1001",
        )
      ).rowCount
    ) {
      await c.query(
        'UPDATE ticket_trade."Archivo" SET nombre=$1,tamano_bytes=$2 WHERE id_archivo=1001',
        ["comprobante-demostracion.pdf", comprobante.length],
      );
      await c.query(
        "INSERT INTO infra.archivo_contenido(id_archivo,id_cuenta_propietaria,contenido) VALUES(1001,1005,$1)",
        [comprobante],
      );
    }
    // Completar lugares físicos y sus fichas; las reservas y accesos existentes se conservan.
    await c.query(`INSERT INTO ticket_trade."LugarRecinto"(id_recinto,codigo,fila,posicion_x,posicion_y,id_tipo_lugar)
      SELECT r.id_recinto,'D-'||lpad(s.n::text,3,'0'),chr(65+((s.n-1)/12)::int),((s.n-1)%12)+1,((s.n-1)/12)+1,
        CASE WHEN tr.nombre='Laboratorio' THEN 2 ELSE 1 END FROM ticket_trade."Recinto" r
      JOIN ticket_trade."TipoRecinto" tr USING(id_tipo_recinto) CROSS JOIN LATERAL generate_series(1,r.aforo_maximo) s(n)
      WHERE r.id_recinto BETWEEN 1001 AND 1004 AND s.n>(SELECT count(*) FROM ticket_trade."LugarRecinto" l WHERE l.id_recinto=r.id_recinto AND l.codigo NOT LIKE 'D-%')
      AND NOT EXISTS(SELECT 1 FROM ticket_trade."LugarRecinto" l WHERE l.id_recinto=r.id_recinto AND l.codigo='D-'||lpad(s.n::text,3,'0'))`);
    await c.query(`INSERT INTO ticket_trade."EstacionComputo"(id_lugar_recinto,id_estado_funcionamiento)
      SELECT l.id_lugar_recinto,1 FROM ticket_trade."LugarRecinto" l WHERE l.id_tipo_lugar=2 AND NOT EXISTS(SELECT 1 FROM ticket_trade."EstacionComputo" e WHERE e.id_lugar_recinto=l.id_lugar_recinto)`);
    await c.query(`INSERT INTO ticket_trade."LugarActividad"(id_actividad,id_lugar_recinto,id_categoria_lugar_actividad)
      SELECT a.id_actividad,l.id_lugar_recinto,1 FROM ticket_trade."Actividad" a JOIN ticket_trade."LugarRecinto" l USING(id_recinto)
      WHERE a.id_tipo_acceso=3 AND a.id_evento IN (1001,1002,1010,1011,1012,1013,1014,1015,1016,1017,1018,1033)
      AND NOT EXISTS(SELECT 1 FROM ticket_trade."LugarActividad" la WHERE la.id_actividad=a.id_actividad AND la.id_lugar_recinto=l.id_lugar_recinto)`);
    // No se insertan invitaciones ni asignaciones Staff ajenas a las de la semilla original.
    for (const archivo of (
      await c.query(
        `SELECT id_archivo,nombre FROM ticket_trade."Archivo" WHERE id_archivo BETWEEN 1010 AND 1021`,
      )
    ).rows) {
      const tamano = (
        await fs.stat(
          path.join(
            raiz,
            "public/imagenes/eventos",
            path.basename(archivo.nombre),
          ),
        )
      ).size;
      await c.query(
        'UPDATE ticket_trade."Archivo" SET tamano_bytes=$1 WHERE id_archivo=$2',
        [tamano, archivo.id_archivo],
      );
    }
    await c.query(`DO $$ DECLARE x record; maximo bigint; secuencia regclass; BEGIN
      FOR x IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='ticket_trade' AND is_identity='YES' LOOP
        EXECUTE format('SELECT max(%I) FROM ticket_trade.%I',x.column_name,x.table_name) INTO maximo;
        IF maximo IS NOT NULL THEN secuencia:=pg_get_serial_sequence(format('ticket_trade.%I',x.table_name),x.column_name)::regclass;
          PERFORM setval(secuencia,greatest(maximo,coalesce(pg_sequence_last_value(secuencia),1)),true); END IF;
      END LOOP; END $$`);
    await c.query("COMMIT");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  }
  await verificarModelo(c);
}
async function explorar(c: pg.Client) {
  const tabla = process.argv.slice(3).find((a) => !a.startsWith("--"));
  const tablas = (
    await c.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='ticket_trade' ORDER BY tablename",
    )
  ).rows.map((r) => r.tablename);
  if (tabla && !tablas.includes(tabla)) throw new Error("Tabla desconocida.");
  const candidatos = [
    process.env.PSQL_PATH,
    "D:/PostgreSQL/bin/psql.exe",
    "C:/Program Files/PostgreSQL/17/bin/psql.exe",
    "psql",
  ].filter(Boolean) as string[];
  let ejecutable = "psql";
  for (const ruta of candidatos) {
    const r = spawnSync(ruta, ["--version"], { encoding: "utf8" });
    if (r.status === 0) {
      ejecutable = ruta;
      break;
    }
  }
  const env = {
    ...process.env,
    PGCLIENTENCODING: "UTF8",
    PAGER: "",
    PSQL_PAGER: "",
  };
  if (process.env.DATABASE_URL) {
    const url = new URL(
      (process.argv.includes("--demo")
        ? process.env.DATABASE_URL_DEMO
        : process.env.DATABASE_URL)!,
    );
    Object.assign(env, {
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
    });
  }
  const ui = readline.createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      let elegida = tabla;
      if (!elegida) {
        const conteos: string[] = [];
        for (const nombre of tablas) {
          const r = await c.query(
            `SELECT count(*)::text n FROM ticket_trade."${nombre}"`,
          );
          conteos.push(
            `${tablas.indexOf(nombre) + 1}. ${nombre} (${r.rows[0].n})`,
          );
        }
        console.log(
          "\nPostgreSQL · " +
            (await c.query("SELECT current_database() n")).rows[0].n +
            "\n" +
            conteos.join("\n"),
        );
        const entrada = await ui.question(
          "\nNúmero o nombre de tabla; Enter para salir: ",
        );
        if (!entrada) break;
        elegida =
          tablas[Number(entrada) - 1] ||
          (tablas.includes(entrada) ? entrada : undefined);
        if (!elegida) {
          console.log("Selecciona una tabla de la lista.");
          continue;
        }
      }
      // psql se conecta directamente; no es una copia de registros en el navegador.
      const r = spawnSync(
        ejecutable,
        [
          "--no-password",
          "-X",
          "-P",
          "pager=off",
          "-c",
          `SELECT * FROM ticket_trade."${elegida}";`,
        ],
        { env, stdio: "inherit" },
      );
      if (r.error || r.status !== 0)
        throw new Error(
          "No se pudo ejecutar psql. Configura PSQL_PATH y la conexión de .env.",
        );
      if (tabla) break;
    }
  } finally {
    ui.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const esDemo = process.argv[2] === "demo" || process.argv.includes("--demo");
  if (esDemo && !process.env.DATABASE_URL_DEMO)
    throw new Error(
      "Configura DATABASE_URL_DEMO: la semilla nunca se carga en la base normal.",
    );
  if (
    esDemo &&
    process.env.DATABASE_URL &&
    destinoBaseDatos(process.env.DATABASE_URL) ===
      destinoBaseDatos(process.env.DATABASE_URL_DEMO!)
  )
    throw new Error("La base demo debe ser distinta de la normal.");
  const cliente = new pg.Client({
    ...(esDemo
      ? { connectionString: process.env.DATABASE_URL_DEMO }
      : opciones()),
    ...(!esPoolerSupabase(
      esDemo ? process.env.DATABASE_URL_DEMO : process.env.DATABASE_URL,
    )
      ? { options: "-c timezone=America/Mexico_City -c client_encoding=UTF8" }
      : {}),
  });
  try {
    await cliente.connect();
    const accion = process.argv[2];
    if (accion === "init") {
      await instalar(cliente);
      console.log("Esquema e infraestructura instalados.");
    } else if (accion === "demo") {
      await instalar(cliente);
      await sembrar(cliente);
      console.log("Catálogo y cuentas demo preparados. Clave: Password123!");
    } else if (accion === "verify") await verificarModelo(cliente);
    else if (accion === "explore") await explorar(cliente);
    else throw new Error("Usa init, demo, verify o explore.");
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  } finally {
    await cliente.end();
  }
}
