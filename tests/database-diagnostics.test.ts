import { test } from "node:test";
import assert from "node:assert/strict";
import { Client, type PoolClient } from "pg";
import { databaseConfig } from "../lib/collaboration/database-config";
import { databaseDiagnostic } from "../lib/collaboration/database-diagnostics";
import { verifyDatabaseTls } from "../lib/collaboration/database-health";

test("database diagnostics suppress raw provider messages, credentials, hints and arbitrary codes", () => {
  const secret = "postgresql://private:secret@private.invalid/db";
  for (const code of ["SELF_SIGNED_CERT_IN_CHAIN", "28P01", "42501", "42883", "0A000", "42P01", secret, "constructor"]) {
    const result = databaseDiagnostic({ code, message: secret, detail: secret, hint: secret, position: "42" });
    assert.ok(!JSON.stringify(result).includes(secret));
    assert.equal(result.position, 42);
    assert.equal(typeof result.guidance, "string");
  }
  assert.equal(databaseDiagnostic({ code: secret }).code, "UNCLASSIFIED");
  assert.equal(databaseDiagnostic({ code: "constructor" }).code, "UNCLASSIFIED");
  assert.equal(databaseDiagnostic({ position: secret }).position, undefined);
  assert.equal(databaseDiagnostic(null).code, "UNCLASSIFIED");
});

test("connection configuration keeps certificate verification explicit and rejects insecure SSL modes", () => {
  const uri = "postgresql://fictional:password@database.invalid/db";
  for (const suffix of ["", "?sslmode=require", "?sslmode=prefer", "?sslmode=verify-ca&uselibpqcompat=true", "?ssl=false"]) {
    const config = databaseConfig(uri + suffix);
    const client = new Client(config);
    const ssl = (client as unknown as { connectionParameters: { ssl: { rejectUnauthorized?: boolean } | boolean } }).connectionParameters.ssl;
    assert.ok(ssl && typeof ssl === "object");
    assert.notEqual((ssl as { rejectUnauthorized?: boolean }).rejectUnauthorized, false);
    assert.equal(new URL(config.connectionString!).searchParams.get("sslmode"), "verify-full");
    assert.equal(new URL(config.connectionString!).searchParams.has("uselibpqcompat"), false);
  }
  for (const mode of ["disable", "no-verify", "invalid"])
    assert.throws(() => databaseConfig(`${uri}?sslmode=${mode}`), { code: "TLS_REQUIRED" });
  assert.equal(uri, "postgresql://fictional:password@database.invalid/db");
});

test("database health requires server-side encryption and an authorized client TLS certificate", async () => {
  const client = (ssl: boolean, authorized: boolean) => ({
    query: async () => ({ rows: [{ ssl }] }),
    connection: { stream: { authorized } },
  }) as unknown as PoolClient;
  await verifyDatabaseTls(client(true, true));
  await assert.rejects(verifyDatabaseTls(client(true, false)), { code: "TLS_REQUIRED" });
  await assert.rejects(verifyDatabaseTls(client(false, true)), { code: "TLS_REQUIRED" });
});
