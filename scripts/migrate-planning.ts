import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { pool } from "../lib/collaboration/store";
loadEnvConfig(process.cwd());
async function main() {
  try {
    await pool().query(
      await readFile("migrations/001_collaborative_planning.sql", "utf8"),
    );
    console.log(
      "Tiger Data planning schema ready; Timescale hypertable verified.",
    );
  } catch {
    console.error(
      "Migration failed. Check TIGER_DATABASE_URL, permissions, and Timescale availability. No credentials logged.",
    );
    process.exitCode = 1;
  } finally {
    if (process.env.TIGER_DATABASE_URL) await pool().end();
  }
}
void main();
