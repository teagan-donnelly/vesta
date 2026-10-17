import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { financialWarning } from "../lib/financial-guidance";
import {
  initialState,
  personalData,
  workspaceView,
} from "../lib/collaboration/model";
import { databaseConfig } from "../lib/collaboration/database-config";
import { localPlanning, withDemo } from "../lib/collaboration/store";
import { POST as chooseStore } from "../app/api/planning-storage/route";
import { GET as readPlanning } from "../app/api/collaboration/route";
import { assistant } from "../lib/collaboration/assistant";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { SharedExpenseSummary } from "../components/shared-expense-summary";
delete process.env.GEMINI_API_KEY;
delete process.env.BACKBOARD_API_KEY;
delete process.env.TIGER_DATABASE_URL;
process.env.VESTA_DEMO_DIR = join(
  process.cwd(),
  ".tmp",
  `ux-tests-${process.pid}`,
);
test("Home warning uses the actual forecast and carries the affected payment to Plan Ahead", () => {
  const state = initialState("2026-10-17");
  const risk = financialWarning(personalData(state, "kevin"))!;
  assert.equal(risk.shortfallCents, 1000);
  assert.equal(risk.date, "2026-10-27");
  assert.equal(risk.label, "Monthly rent");
  const query = new URL(risk.href, "http://localhost").searchParams;
  assert.equal(query.get("commitment"), "rent");
  assert.equal(query.get("event"), "bill:shared-rent");
  assert.equal(query.get("section"), "forecast");
  assert.equal(financialWarning(personalData(state, "ava")), null);
});
test("simplified shared summary uses authorized statuses without revealing another member's private amounts", () => {
  const state = initialState("2026-10-17");
  state.plans.kevin.preferences = ["Private gym preference"];
  const expense = workspaceView(state, "household", "ava").commitments[0];
  const html = renderToStaticMarkup(
    createElement(SharedExpenseSummary, {
      expense,
      viewer: "ava",
      workspace: "household",
    }),
  );
  assert.match(html, /Kevin hasn&#x27;t shared/);
  assert.ok(!html.includes("$990.00"));
  assert.ok(!html.includes("Private gym"));
  assert.ok(!html.includes("Spotify"));
});
test("storage selection requires confirmation and origin checks, never silently replaces database state", async () => {
  const base = "http://localhost/api/planning-storage";
  assert.equal(
    (
      await chooseStore(
        new Request(base, {
          method: "POST",
          headers: { origin: "https://wrong.test" },
          body: JSON.stringify({ store: "local", confirmed: true }),
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await chooseStore(
        new Request(base, {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ store: "local" }),
        }),
      )
    ).status,
    400,
  );
  const r = await chooseStore(
    new Request(base, {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({ store: "local", confirmed: true }),
    }),
  );
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie")!, /HttpOnly/);
  const id = randomUUID();
  const request = new Request(
    "http://localhost/api/collaboration?profile=kevin",
    { headers: { cookie: `vesta-demo=${id}; vesta-demo-store=local` } },
  );
  assert.equal(localPlanning(request), true);
  process.env.TIGER_DATABASE_URL = "postgresql://must-not-be-contacted";
  try {
    const result = await readPlanning(request);
    assert.equal(result.status, 200);
    assert.match((await result.json()).storage, /Local fictional/);
    assert.equal(
      (await withDemo(id, (s) => s, false, true)).workspaces[0].id,
      "household",
    );
  } finally {
    delete process.env.TIGER_DATABASE_URL;
  }
});
test("custom database CA preserves hostname/certificate verification and no-CA settings are not downgraded", () => {
  const uri =
    "postgresql://fictional:password@database.invalid/db?sslmode=require";
  assert.deepEqual(databaseConfig(uri), { connectionString: uri });
  const config = databaseConfig(
    uri,
    "-----BEGIN CERTIFICATE-----\\nfictional\\n-----END CERTIFICATE-----",
  );
  assert.equal(typeof config.ssl, "object");
  assert.equal(
    (config.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized,
    true,
  );
  assert.ok(!config.connectionString!.includes("sslmode"));
  assert.throws(() => databaseConfig(uri, "not a certificate"));
});
test("roommate questions explain the user's own contribution without exposing anyone else's finances", async () => {
  const state = initialState("2026-10-17");
  state.plans.ava.preferences = ["AVA PRIVATE MEMORY"];
  const result = await assistant(
    state,
    "kevin",
    "How would this affect my roommate?",
    "en",
    "test-kevin",
  );
  assert.match(result.reply, /\$1,000.00/);
  assert.match(result.reply, /private/);
  assert.ok(!result.reply.includes("AVA PRIVATE"));
  assert.deepEqual(state.plans.kevin.simulation, {});
});
