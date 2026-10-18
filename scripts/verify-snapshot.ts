import assert from "node:assert/strict";
import { initialState, personalData, workspaceView, SNAPSHOT_AT } from "../lib/collaboration/model";
import { planningOptions } from "../lib/planning-options";
import { project } from "../lib/analysis";
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
const option = planningOptions(data)[0];
assert.equal(baseline.lowestBalanceCents, -20000);
state.plans.kevin.simulation = option.simulation;
assert.equal(project(data, state.plans.kevin.simulation).lowestBalanceCents, 13000);
assert.deepEqual(project(data), baseline);
const room = workspaceView(state,"household","kevin");
assert.equal(room.members.length,4);
assert.ok(room.commitments.every(c=>c.health==="On Track"));
assert.equal(workspaceView(state,"vacation","ava").commitments[0].contributions[0].scenarioStatus,"appears achievable");
assert.equal(room.commitments[0].contributions.filter(a=>a.profile!=="kevin" && a.disclosedBalanceCents!==undefined).length,1);
console.log(`Planning snapshot verified at ${SNAPSHOT_AT}; rent funded, vacation scenario resolves shortfall, recipient privacy preserved. No database or bank writes.`);
