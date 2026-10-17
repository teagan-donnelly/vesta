import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Pool } from "pg";
import { GET as financial } from "../app/api/financial-data/route";
import { GET as shared } from "../app/api/collaboration/route";
import { GET as planning } from "../app/api/personal-planning/route";
import { GET as session } from "../app/api/demo-session/route";
import { POST as storage } from "../app/api/planning-storage/route";
import { project } from "../lib/analysis";

test("production sequence: Tiger TLS failure stays isolated; explicit local selection restores shared planning for all profiles", async () => {
  const globals = globalThis as typeof globalThis & { vestaPool?: Pool };
  const previous = globals.vestaPool;
  const env = { ...process.env };
  let connections = 0;
  globals.vestaPool = { connect: async () => {
    connections++;
    throw Object.assign(new Error("sensitive provider detail must not escape"), { code: "SELF_SIGNED_CERT_IN_CHAIN" });
  } } as unknown as Pool;
  process.env.TIGER_DATABASE_URL = "postgresql://fictional-test-only";
  process.env.VERCEL = "1";
  process.env.VESTA_DEMO_DIR = join(process.cwd(), ".tmp", `outage-${randomUUID()}`);
  const cookie = `vesta-demo=${randomUUID()}`;
  const request = (path: string, local = false) => new Request(`https://vesta.example${path}`, { headers: { cookie: cookie + (local ? "; vesta-demo-store=local" : "") } });
  try {
    assert.equal((await session(request("/api/demo-session"))).status, 200);
    assert.equal(connections, 0, "cookie bootstrap cannot contact Tiger");
    for (const profile of ["kevin", "ava", "maya", "kevin"]) {
      const home = await financial(request(`/api/financial-data?mode=demo&customer=demo:${profile}`));
      assert.equal(home.status, 200);
      const base = await home.json();
      assert.equal(base.source, "demo");
      assert.equal(base.accounts.length, 1);
      assert.ok(base.accounts.every((a: { customerId: string }) => a.customerId === profile));
      assert.ok(base.warnings.some((w: string) => w.startsWith("Shared planning is not included")));
      const before: number = connections;
      assert.equal((await shared(request(`/api/collaboration?profile=${profile}`))).status, 503);
      const overlay = await planning(request(`/api/personal-planning?profile=${profile}`));
      assert.equal(overlay.status, 503);
      assert.doesNotMatch(await overlay.text(), /sensitive provider/);
      assert.equal(connections, before + 2);
      assert.equal((await financial(request(`/api/financial-data?mode=demo&customer=demo:${profile}`))).status, 200);
    }
    const choose = await storage(new Request("https://vesta.example/api/planning-storage", {
      method: "POST", headers: { origin: "https://vesta.example", "Content-Type": "application/json" },
      body: JSON.stringify({ store: "local", confirmed: true }),
    }));
    assert.equal(choose.status, 200);
    assert.match(choose.headers.get("set-cookie") || "", /vesta-demo-store=local/);
    const beforeLocal = connections;
    for (const profile of ["ava", "kevin", "maya"]) {
      const workspace = await shared(request(`/api/collaboration?profile=${profile}`, true));
      assert.equal(workspace.status, 200);
      const value = await workspace.json();
      assert.equal(value.profile, profile);
      assert.match(value.storage, /Ephemeral local/);
      if (profile === "maya") assert.deepEqual(value.workspaces, []);
      const overlay = await planning(request(`/api/personal-planning?profile=${profile}`, true));
      assert.equal(overlay.status, 200);
      const data = await overlay.json();
      assert.equal(data.accounts[0].customerId, profile);
      assert.equal(data.bills.some((b: { id: string }) => b.id === "shared-rent"), profile !== "maya");
      if (profile === "kevin") assert.equal(project(data).lowestBalanceCents, -1000);
    }
    assert.equal(connections, beforeLocal, "explicit local choice bypasses Tiger without changing the database");
    delete process.env.NESSIE_API_KEY;
    assert.equal((await financial(request("/api/financial-data?mode=nessie&customer=demo:kevin", true))).status, 502, "Nessie failures must never return demo fixtures");
  } finally {
    globals.vestaPool = previous;
    process.env = env;
  }
});
