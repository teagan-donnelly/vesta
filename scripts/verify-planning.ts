import { loadEnvConfig } from "@next/env";
import { backboard } from "../lib/collaboration/backboard";
import { pool, storageSource, withDemo } from "../lib/collaboration/store";
import { randomUUID } from "node:crypto";
import { databaseDiagnostic } from "../lib/collaboration/database-diagnostics";
import { verifyDatabaseTls } from "../lib/collaboration/database-health";
import type { Pool, PoolClient } from "pg";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.BACKBOARD_API_KEY)
    console.log("Backboard: not configured; no provider request made.");
  else
    try {
      await backboard("/assistants?limit=1");
      console.log(
        "Backboard: authenticated read succeeded. Memory writes require UI opt-in.",
      );
    } catch {
      console.log("Backboard: connection failed. No credential values logged.");
      process.exitCode = 1;
    }
  if (!process.env.TIGER_DATABASE_URL) {
    console.log("Tiger Data: NOT verified; TIGER_DATABASE_URL is missing. Local planning is not a database verification.");
    process.exitCode = 1;
  }
  else
  {
    let database: Pool | undefined;
    let client: PoolClient | undefined;
    let stage = "configuration";
    try {
      database = pool();
      stage = "connection/TLS";
      client = await database.connect();
      await verifyDatabaseTls(client);
      console.log("Tiger Data: connection, encrypted TLS and certificate/hostname verification succeeded.");
      stage = "Timescale extension";
      const result = await client.query(
        "SELECT extversion FROM pg_extension WHERE extname='timescaledb'",
      );
      if (!result.rowCount) throw Object.assign(new Error(), { code: "0A000" });
      // Read-only checks cover every migrated relation, including the Timescale
      // history view. Never run migrations or mutate existing records here.
      for (const relation of [
        "vesta_demo_sessions", "vesta_demo_profiles", "vesta_workspaces",
        "vesta_memberships", "vesta_commitments", "vesta_contributions",
        "vesta_consents", "vesta_private_plans", "vesta_readiness_snapshots",
        "vesta_daily_readiness",
      ]) {
        stage = `schema: ${relation}`;
        await client.query(`SELECT * FROM ${relation} LIMIT 0`);
      }
      stage = "Timescale hypertable";
      const hypertable = await client.query("SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_schema=current_schema() AND hypertable_name='vesta_readiness_snapshots'");
      if (!hypertable.rowCount) throw Object.assign(new Error(), { code: "HYPERTABLE_MISSING" });
      stage = "Vesta planning adapter";
      const adapter = await withDemo(randomUUID(), () => storageSource(), false, false);
      if (adapter !== "Tiger Data PostgreSQL") throw Object.assign(new Error(), { code: "WRONG_ADAPTER" });
      console.log(
        "Tiger Data: actual PostgreSQL reads, all planning relations, Timescale hypertable and Vesta planning adapter verified. No local fallback used; no records changed.",
      );
    } catch (error) {
      console.error("Tiger Data verification failed:", JSON.stringify({ stage, ...databaseDiagnostic(error) }));
      process.exitCode = 1;
    } finally {
      client?.release();
      if (database) await database.end().catch(() => {});
    }
  }
}
void main();
