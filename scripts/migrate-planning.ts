import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { pool } from "../lib/collaboration/archive/database-store";
import { databaseDiagnostic } from "../lib/collaboration/database-diagnostics";
import type { Pool, PoolClient } from "pg";
import { verifyDatabaseTls } from "../lib/collaboration/database-health";
const inheritedDatabaseUrl = Boolean(process.env.TIGER_DATABASE_URL);
const environment = loadEnvConfig(process.cwd());
async function main() {
  let database: Pool | undefined;
  let client: PoolClient | undefined;
  let stage = "configuration";
  console.log(JSON.stringify({
    envLocalLoaded: environment.loadedEnvFiles.some((file) => file.path === ".env.local"),
    databaseUrlPresent: Boolean(process.env.TIGER_DATABASE_URL),
    customCaPresent: Boolean(process.env.TIGER_DATABASE_CA),
    databaseUrlSource: inheritedDatabaseUrl ? "existing process environment" : environment.loadedEnvFiles.find((file) => file.env.TIGER_DATABASE_URL)?.path || "unset",
    localDatabaseUrlMatchesEffective: environment.loadedEnvFiles.find((file) => file.path === ".env.local")?.env.TIGER_DATABASE_URL === process.env.TIGER_DATABASE_URL,
  }));
  console.log("Environment loaded with @next/env; existing process variables take precedence. Values are never logged.");
  try {
    database = pool();
    stage = "connection/TLS";
    client = await database.connect();
    await verifyDatabaseTls(client);
    console.log("Database connected; TLS encryption, certificate trust and hostname verification succeeded.");
    stage = "Timescale availability";
    const extension = await client.query("SELECT name FROM pg_available_extensions WHERE name='timescaledb'");
    if (!extension.rowCount) throw Object.assign(new Error(), { code: "0A000" });
    stage = "migration SQL";
    await client.query(
      await readFile("migrations/001_collaborative_planning.sql", "utf8"),
    );
    console.log(
      "Tiger Data planning schema ready; Timescale hypertable verified.",
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Migration failed:", JSON.stringify({ stage, ...databaseDiagnostic(error) }));
    process.exitCode = 1;
  } finally {
    client?.release();
    if (database) await database.end().catch(() => {});
  }
}
void main();
