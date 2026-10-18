import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { POST } from "../app/api/demo-snapshot/route";
import { initialState, SNAPSHOT_DATE, type DemoState } from "../lib/collaboration/model";
import { planningOptions } from "../lib/planning-options";
import { project, subscriptionsFor } from "../lib/analysis";

test("Kevin → Domino → Shared → Ava survives stateless round trips with disclosure and baseline isolation", async () => {
  const prior = process.env.TIGER_DATABASE_URL;
  process.env.TIGER_DATABASE_URL = "postgresql://must-never-connect.invalid";
  const session = randomUUID();
  let state: DemoState | undefined;
  async function call(path: string, body?: object) {
    const response = await POST(new Request("https://vesta.example/api/demo-snapshot", {
      method: "POST", headers: { origin: "https://vesta.example" },
      body: JSON.stringify({ version: 1, session, state, path, method: body ? "POST" : "GET", body: body ? { ...body, confirmed: true } : undefined }),
    }));
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value.status, 200);
    // JSON serialization represents browser persistence and a fresh server call.
    state = JSON.parse(JSON.stringify(value.state));
    return value.result;
  }
  try {
    const before = await call("/api/personal-planning?profile=kevin");
    assert.equal(before.source, "demo");
    assert.equal(before.asOf, SNAPSHOT_DATE);
    const baseline = project(before);
    assert.equal(baseline.lowestBalanceCents, -20000);
    assert.ok(before.bills.some((b: { id: string }) => b.id === "shared-rent"));
    assert.ok(subscriptionsFor(before).every(s => !/rent/i.test(s.merchant)));
    await call("/api/collaboration?profile=kevin", { action: "scenario", simulation: planningOptions(before)[0].simulation });
    const refreshed = await call("/api/personal-planning?profile=kevin");
    assert.deepEqual(project(refreshed), baseline);
    assert.equal(project(refreshed, refreshed.planningSimulation).lowestBalanceCents, 13000);
    let ava = await call("/api/collaboration?profile=ava");
    let kevin = ava.workspaces[0].commitments[0].contributions.find((p: { profile: string }) => p.profile === "kevin");
    assert.equal(kevin.scenarioStatus, "not shared");
    assert.equal(kevin.coveredCents, undefined);
    await call("/api/collaboration?profile=kevin", { action: "consent", workspaceId: "household", consent: { readiness: true, coverage: false, balance: false, expenseIds: [] } });
    ava = await call("/api/collaboration?profile=ava");
    kevin = ava.workspaces[0].commitments[0].contributions.find((p: { profile: string }) => p.profile === "kevin");
    assert.equal(kevin.status, "may be at risk");
    assert.equal(kevin.scenarioStatus, "appears achievable");
    assert.equal(kevin.disclosedBalanceCents, undefined);
    assert.equal(kevin.coveredCents, undefined);
    assert.deepEqual(kevin.disclosedExpenses, []);
    assert.deepEqual(ava.own.simulation, {});
    assert.doesNotMatch(JSON.stringify(ava), /fictional-kevin|kevin-credit|kevin-Spotify/);
    await call("/api/collaboration?profile=kevin", { action: "consent", workspaceId: "household", consent: { readiness: false, coverage: false, balance: false, expenseIds: [] } });
    assert.equal((await call("/api/collaboration?profile=ava")).workspaces[0].commitments[0].contributions[1].scenarioStatus, "not shared");
    for (const profile of ["ava", "kevin", "maya"]) {
      const data = await call(`/api/financial-data?mode=demo&customer=demo:${profile}`);
      assert.equal(data.asOf, SNAPSHOT_DATE);
      assert.ok(data.accounts.every((a: { customerId: string }) => a.customerId === profile));
      const records = await call(`/api/records?mode=demo&customer=demo:${profile}`);
      assert.ok(records.records.some((r: { kind: string }) => r.kind === "credit"));
      assert.ok(records.records.every((r: { id: string }) => r.id.startsWith(profile + "-")));
      assert.ok((await call(`/api/collaboration?profile=${profile}`)).workspaces.length);
    }
    assert.deepEqual(initialState().plans.kevin.simulation, {}, "reset creates an untouched original snapshot");
  } finally {
    if (prior === undefined) delete process.env.TIGER_DATABASE_URL;
    else process.env.TIGER_DATABASE_URL = prior;
  }
});

test("snapshot transport rejects forged origins, paths, dates and remote resource IDs", async () => {
  const session = randomUUID();
  const state = initialState();
  state.plans.kevin.assistantId = "someone-elses-assistant";
  state.plans.kevin.assistantProof = "a".repeat(64);
  const input = { version: 1, session, state, path: "/api/collaboration?profile=kevin", method: "GET" };
  const request = (body: object, origin = "https://vesta.example") => new Request("https://vesta.example/api/demo-snapshot", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
  assert.equal((await POST(request(input, "https://attacker.example"))).status, 403);
  assert.equal((await POST(request({ ...input, path: "https://attacker.example" }))).status, 400);
  const result = await (await POST(request(input))).json();
  assert.equal(result.state.plans.kevin.assistantId, undefined);
  state.asOf = "2027-01-01";
  assert.equal((await POST(request(input))).status, 400);
});

test("older browser snapshots receive new budgets once without losing edits, deletions, consent or saved plans", async () => {
  const state = initialState();
  delete state.snapshotRevision;
  const records = state.plans.kevin.recordSets!["demo:demo:kevin"];
  state.plans.kevin.recordSets!["demo:demo:kevin"] = records.filter(r => !/-(restaurants|transport)-budget$/.test(r.id) && r.id !== "kevin-travel");
  state.plans.kevin.preferences = ["Keep my private preference"];
  state.plans.kevin.simulation = { eventId: "pending:planned-headphones", delayDays: 6 };
  state.consents["household:kevin"] = { readiness: true, coverage: false, balance: false, expenseIds: [] };
  async function read(value: typeof state) {
    const r = await POST(new Request("https://vesta.example/api/demo-snapshot", { method: "POST", headers: { origin: "https://vesta.example" }, body: JSON.stringify({ version: 1, session: randomUUID(), state: value, path: "/api/records?mode=demo&customer=demo:kevin", method: "GET" }) }));
    assert.equal(r.status, 200);
    return (await r.json()).state as typeof state;
  }
  const migrated = await read(state);
  assert.equal(migrated.snapshotRevision, 2);
  assert.deepEqual(migrated.plans.kevin.simulation, state.plans.kevin.simulation);
  assert.deepEqual(migrated.consents, state.consents);
  assert.deepEqual(migrated.plans.kevin.preferences, state.plans.kevin.preferences);
  assert.ok(!migrated.plans.kevin.recordSets!["demo:demo:kevin"].some(r=>r.id==='kevin-travel'));
  assert.equal(migrated.plans.kevin.recordSets!["demo:demo:kevin"].filter(r=>r.kind==='budget').length, 3);
  migrated.plans.kevin.recordSets!["demo:demo:kevin"] = migrated.plans.kevin.recordSets!["demo:demo:kevin"].filter(r=>r.id!=='kevin-transport-budget');
  assert.ok(!(await read(migrated)).plans.kevin.recordSets!["demo:demo:kevin"].some(r=>r.id==='kevin-transport-budget'));
});
