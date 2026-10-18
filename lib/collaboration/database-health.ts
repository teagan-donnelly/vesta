import type { PoolClient } from "pg";

export async function verifyDatabaseTls(client: PoolClient) {
  const result = await client.query("SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()");
  const stream = (client as unknown as { connection?: { stream?: { authorized?: boolean } } }).connection?.stream;
  if (result.rows[0]?.ssl !== true || stream?.authorized !== true)
    throw Object.assign(new Error("Verified TLS required."), { code: "TLS_REQUIRED" });
}
