import { loadEnvConfig } from "@next/env";
import { backboard } from "../lib/collaboration/backboard";
import { pool } from "../lib/collaboration/store";
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
  if (!process.env.TIGER_DATABASE_URL)
    console.log("Tiger Data: not configured; using fictional local adapter.");
  else
    try {
      const result = await pool().query(
        "SELECT extversion FROM pg_extension WHERE extname='timescaledb'",
      );
      if (!result.rowCount) throw Error();
      await pool().query("SELECT count(*) FROM vesta_demo_sessions");
      console.log(
        "Tiger Data: database read, Timescale extension, and planning schema verified.",
      );
    } catch {
      console.log(
        "Tiger Data: verification failed. Check connectivity and run db:migrate. No URL logged.",
      );
      process.exitCode = 1;
    } finally {
      await pool().end();
    }
}
void main();
