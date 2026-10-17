import { test } from "node:test";
import assert from "node:assert/strict";
import { chartDomain, comparisonRows, riskIntervals } from "../lib/chart-data";
import {
  affectedBalances,
  monthlySubscriptionCost,
  projectionSeries,
  utilizationPercent,
} from "../lib/financial-view";
import { demoData } from "../lib/data";
import { project, subscriptionsFor } from "../lib/analysis";
import {
  DEFAULT_PROFILE,
  PROFILE_KEY,
  parseProfile,
  profileSnapshot,
  saveProfile,
  serverProfileSnapshot,
  subscribeProfile,
} from "../lib/profile-preferences";

test("comparison chart aligns actual cents by date, never by array position", () => {
  const baseline = [
    { date: "2026-10-17", balanceCents: 200000 },
    { date: "2026-10-18", balanceCents: -45000 },
  ];
  const scenario = [
    { date: "2026-10-18", balanceCents: -39000 },
    { date: "2026-10-17", balanceCents: 200000 },
  ];
  const rows = comparisonRows(baseline, scenario);
  assert.deepEqual(rows, [
    { date: "2026-10-17", baseline: 200000, scenario: 200000 },
    { date: "2026-10-18", baseline: -45000, scenario: -39000 },
  ]);
  const [min, max] = chartDomain(rows);
  assert.ok(min <= -45000 && max >= 200000 && min <= 0 && max >= 0);
  assert.equal(
    comparisonRows(baseline, scenario.slice(0, 1))[0].scenario,
    undefined,
  );
});
test("shared chart scale contains zero even when all balances are positive or flat", () => {
  const rows = comparisonRows([
    { date: "2026-10-17", balanceCents: 200000 },
    { date: "2026-10-18", balanceCents: 200000 },
  ]);
  assert.equal(chartDomain(rows)[0], 0);
  assert.ok(chartDomain(rows)[1] > 200000);
  assert.deepEqual(chartDomain([]), [0, 10000]);
});
test("risk shading reflects negative balances from either actual projection series", () => {
  const rows = [
    { date: "a", baseline: 100, scenario: 100 },
    { date: "b", baseline: -100, scenario: 0 },
    { date: "c", baseline: 100, scenario: -20 },
    { date: "d", baseline: 100, scenario: 100 },
  ];
  assert.deepEqual(riskIntervals(rows), [{ start: "b", end: "d" }]);
  assert.deepEqual(riskIntervals(rows.slice(0, 1)), []);
});
test("chart and results preserve the exact forecast and baseline across subscription simulation", () => {
  const data = demoData("2026-10-17");
  const baseline = project(data);
  const subs = subscriptionsFor(data);
  const original = structuredClone(baseline);
  const scenario = project(data, {
    removedSubscriptions: subs.map((s) => s.id),
  });
  assert.deepEqual(projectionSeries(baseline), [
    { date: baseline.startDate, balanceCents: baseline.startingBalanceCents },
    ...baseline.points,
  ]);
  const rows = comparisonRows(
    projectionSeries(baseline),
    projectionSeries(scenario),
  );
  assert.equal(rows.at(-1)!.scenario, scenario.endingBalanceCents);
  assert.equal(rows.at(-1)!.baseline, baseline.endingBalanceCents);
  assert.ok(affectedBalances(baseline, scenario).length > 0);
  assert.deepEqual(baseline, original);
  assert.deepEqual(project(data), original);
});
test("monthly subscription equivalents use integer cents and do not alter recurring charges", () => {
  const subs = subscriptionsFor(demoData("2026-10-17"));
  const sub = subs[0];
  const original = structuredClone(sub);
  assert.equal(
    monthlySubscriptionCost([
      { ...sub, amountCents: 12000, cadence: "annual" },
    ]),
    1000,
  );
  assert.equal(
    monthlySubscriptionCost([{ ...sub, amountCents: 1200, cadence: "weekly" }]),
    5200,
  );
  assert.deepEqual(sub, original);
});
test("educational utilization does not invent a score or divide by zero", () => {
  assert.equal(utilizationPercent(25000, 100000), 25);
  assert.equal(utilizationPercent(0, 100000), 0);
  assert.equal(utilizationPercent(200000, 100000), 200);
  assert.equal(utilizationPercent(1, 0), null);
  assert.equal(utilizationPercent(-1, 1000), null);
});
test("profile parser tolerates malformed preferences and keeps only mode and customer ID", () => {
  assert.deepEqual(parseProfile("{invalid"), { mode: "demo", customer: "" });
  assert.deepEqual(parseProfile(null), { mode: "demo", customer: "" });
  assert.deepEqual(parseProfile("null"), { mode: "demo", customer: "" });
  assert.deepEqual(
    parseProfile('{"mode":"nessie","customer":"c1","unexpected":"discard"}'),
    { mode: "nessie", customer: "c1" },
  );
  assert.equal(
    parseProfile(JSON.stringify({ mode: "nessie", customer: "x".repeat(201) }))
      .customer,
    "",
  );
  assert.equal(serverProfileSnapshot(), DEFAULT_PROFILE);
});
test("mode and selected customer persist across store reads and mode switches", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const entries = new Map<string, string>();
  const fake = new EventTarget();
  Object.defineProperty(fake, "localStorage", {
    value: {
      getItem: (key: string) => entries.get(key) || null,
      setItem: (key: string, value: string) => entries.set(key, value),
    },
  });
  Object.defineProperty(globalThis, "window", {
    value: fake,
    configurable: true,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  });
  let changes = 0;
  const unsubscribe = subscribeProfile(() => changes++);
  saveProfile({ mode: "nessie", customer: "selected-customer" });
  assert.deepEqual(parseProfile(profileSnapshot()), {
    mode: "nessie",
    customer: "selected-customer",
  });
  assert.deepEqual(parseProfile(entries.get(PROFILE_KEY)!), {
    mode: "nessie",
    customer: "selected-customer",
  });
  saveProfile({ mode: "demo", customer: "selected-customer" });
  saveProfile({ mode: "nessie", customer: "selected-customer" });
  assert.equal(parseProfile(profileSnapshot()).customer, "selected-customer");
  assert.equal(changes, 3);
  unsubscribe();
  fake.dispatchEvent(new Event("storage"));
  assert.equal(changes, 3);
});
