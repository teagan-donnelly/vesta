// Real HTTP probes: never seed Nessie or write to Tiger/Backboard.
// Local demonstration storage is selected only with VERIFY_LOCAL_PLANNING=1.
import assert from "node:assert/strict";
import { project, subscriptionsFor } from "../lib/analysis";
import type { FinancialData } from "../lib/types";

const base = process.env.DEMO_BASE_URL || "http://localhost:3002";
const jar = new Map<string, string>();
async function request(path: string, body?: object) {
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
      origin: new URL(base).origin,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0];
    jar.set(pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1));
  }
  return response;
}
async function main() {
  assert.equal((await request("/api/demo-session")).status, 200);
  for (const profile of ["ava", "kevin", "maya", "kevin"]) {
    const home = await request(`/api/financial-data?mode=demo&customer=demo:${profile}`);
    assert.equal(home.status, 200);
    const data = await home.json() as FinancialData;
    assert.equal(data.source, "demo");
    assert.equal(data.accounts.length, 1);
    assert.equal(data.accounts[0].customerId, profile);
    const shared = await request(`/api/collaboration?profile=${profile}`);
    assert.ok([200, 503].includes(shared.status));
    const overlay = await request(`/api/personal-planning?profile=${profile}`);
    assert.equal(overlay.status, shared.status);
    assert.equal((await request(`/api/financial-data?mode=demo&customer=demo:${profile}`)).status, 200);
    console.log(`${profile}: personal/Home HTTP 200 before and after shared HTTP ${shared.status}; planning HTTP ${overlay.status}`);
  }
  if (process.env.VERIFY_NESSIE === "1") {
    const response = await request("/api/financial-data?mode=nessie");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).source, "nessie");
    console.log("Nessie: live retrieval succeeded; records omitted.");
  }
  if (process.env.VERIFY_LOCAL_PLANNING === "1") {
    assert.equal((await request("/api/planning-storage", { store: "local", confirmed: true })).status, 200);
    for (const profile of ["ava", "kevin", "maya"]) {
      const shared = await request(`/api/collaboration?profile=${profile}`);
      assert.equal(shared.status, 200);
      const value = await shared.json();
      assert.match(value.storage, /local/i);
      assert.equal(value.profile, profile);
      if (profile === "maya") assert.deepEqual(value.workspaces, []);
      const overlay = await request(`/api/personal-planning?profile=${profile}`);
      assert.equal(overlay.status, 200);
      const data = await overlay.json() as FinancialData;
      assert.equal(data.accounts[0].customerId, profile);
      assert.equal(data.bills.some((b) => b.id === "shared-rent"), profile !== "maya");
      if (profile === "kevin") {
        const baseline = project(data);
        const spotify = subscriptionsFor(data).find((s) => s.merchant === "Spotify")!;
        assert.ok(project(data, { removedSubscriptions: [spotify.id] }).lowestBalanceCents > baseline.lowestBalanceCents);
        assert.deepEqual(project(data), baseline);
      }
      console.log(`${profile}: explicitly selected local planning HTTP 200; own obligations verified.`);
    }
  }
  for (const path of ["/", "/shared", "/plan", "/assistant", "/settings"])
    assert.equal((await request(path)).status, 200);
  console.log("HTTP flow verified; no Tiger, Backboard or Nessie records changed.");
}
void main().catch(() => {
  console.error("HTTP flow verification failed. Response contents and credentials omitted.");
  process.exitCode = 1;
});
