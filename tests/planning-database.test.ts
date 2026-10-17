import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { DataType, newDb } from "pg-mem";
import { Pool } from "pg";
import { withDemo } from "../lib/collaboration/store";

test("PostgreSQL adapter round-trips relational planning records and isolates browser sessions", async () => {
  const database = newDb();
  database.public.registerFunction({
    name: "hashtext",
    args: [DataType.text],
    returns: DataType.integer,
    implementation: () => 1,
  });
  database.public.registerFunction({
    name: "pg_advisory_xact_lock",
    args: [DataType.integer],
    returns: DataType.integer,
    implementation: () => 1,
  });
  // pg-mem verifies PostgreSQL relationships and JSON persistence. Timescale-specific
  // hypertable/time_bucket functions require a real Tiger Data instance to verify.
  const sql = readFileSync("migrations/001_collaborative_planning.sql", "utf8")
    .replace("CREATE EXTENSION IF NOT EXISTS timescaledb;", "")
    .replace(/SELECT create_hypertable[^;]+;/, "")
    .replace(/CREATE OR REPLACE VIEW[^;]+;/, "");
  database.public.none(sql);
  const adapter = database.adapters.createPg();
  const pg = new adapter.Pool() as unknown as Pool;
  const globalStore = globalThis as typeof globalThis & { vestaPool?: Pool };
  globalStore.vestaPool = pg;
  process.env.TIGER_DATABASE_URL = "postgresql://fictional-test-only";
  try {
    const id = randomUUID();
    await withDemo(
      id,
      (s) => {
        s.plans.kevin.preferences = ["Private Kevin gym preference"];
        s.consents["household:kevin"] = {
          readiness: true,
          coverage: false,
          balance: false,
          expenseIds: [],
        };
      },
      true,
    );
    const roundtrip = await withDemo(id, (s) => s);
    assert.equal(roundtrip.workspaces[0].members.length, 2);
    assert.equal(
      roundtrip.commitments[0].contributions[1].expectedCents,
      100000,
    );
    assert.equal(
      roundtrip.plans.kevin.preferences[0],
      "Private Kevin gym preference",
    );
    assert.equal(roundtrip.consents["household:kevin"].readiness, true);
    assert.deepEqual(
      (await withDemo(randomUUID(), (s) => s)).plans.kevin.preferences,
      [],
    );
    const invalid = pg.query(
      "INSERT INTO vesta_contributions VALUES($1,$2,$3,$4,$5)",
      [id, "rent", "maya", -1, 0],
    );
    await assert.rejects(invalid);
    roundtrip.workspaces[0].name = "Updated household";
    await withDemo(
      id,
      (s) => {
        s.workspaces = roundtrip.workspaces;
      },
      true,
    );
    assert.equal(
      (await withDemo(id, (s) => s)).workspaces[0].name,
      "Updated household",
    );
  } finally {
    delete process.env.TIGER_DATABASE_URL;
    delete globalStore.vestaPool;
    await pg.end();
  }
});
