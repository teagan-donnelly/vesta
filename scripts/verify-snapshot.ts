import assert from "node:assert/strict";
import { initialState, personalData, workspaceView, SNAPSHOT_AT } from "../lib/collaboration/model";
import { project, subscriptionsFor } from "../lib/analysis";
const state = initialState();
for (const profile of ["ava", "kevin", "maya"] as const) {
  const data = personalData(state, profile);
  assert.equal(data.source, "demo");
  assert.equal(data.asOf, SNAPSHOT_AT.slice(0, 10));
  assert.ok(data.transactions.length >= 20);
  assert.ok(data.bills.length);
  assert.ok(state.plans[profile].recordSets?.[`demo:demo:${profile}`]?.some(r => r.kind === "credit"));
  console.log(`${profile}: fixed-date personal records, obligations and financial-management records verified.`);
}
const data = personalData(state, "kevin");
const baseline = project(data);
const spotify = subscriptionsFor(data).find(s => s.merchant === "Spotify")!;
assert.equal(baseline.lowestBalanceCents, -1000);
state.plans.kevin.simulation = { removedSubscriptions: [spotify.id] };
assert.equal(project(data, state.plans.kevin.simulation).lowestBalanceCents, 500);
assert.deepEqual(project(data), baseline);
assert.equal(workspaceView(state, "household", "ava").commitments[0].contributions[1].scenarioStatus, "not shared");
state.consents["household:kevin"] = { readiness: true, coverage: false, balance: false, expenseIds: [] };
const shared = workspaceView(state, "household", "ava").commitments[0].contributions[1];
assert.equal(shared.scenarioStatus, "appears achievable");
assert.equal(shared.coveredCents, undefined);
console.log(`Planning snapshot verified at ${SNAPSHOT_AT}; baseline, simulation and selective disclosure agree. No database or bank writes performed.`);
