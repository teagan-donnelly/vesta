import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  applyPersonalRecords,
  creditUtilization,
  financialTotals,
  goalProgress,
  holdingValue,
  recordScope,
  spendingCategories,
  validateRecord,
  type PersonalRecord,
} from "../lib/management";
import {
  fixtureData,
  initialState,
  personalData,
  workspaceView,
} from "../lib/collaboration/model";
import { personalRecords } from "../lib/collaboration/records";
import { forecastEvents, project, subscriptionsFor } from "../lib/analysis";
import {
  annualSubscriptionCost,
  monthlySubscriptionCost,
} from "../lib/financial-view";
import { GET as rawGET, POST as rawPOST } from "../app/api/records/route";
import { browserRoute } from "./snapshot-harness";
const GET = browserRoute(rawGET), POST = browserRoute(rawPOST);
import { GET as rawPlanning } from "../app/api/personal-planning/route";
import { GET as rawCollaborative } from "../app/api/collaboration/route";
const planning = browserRoute(rawPlanning), collaborative = browserRoute(rawCollaborative);
delete process.env.TIGER_DATABASE_URL;
delete process.env.BACKBOARD_API_KEY;
delete process.env.GEMINI_API_KEY;
process.env.VESTA_DEMO_DIR = join(
  process.cwd(),
  ".tmp",
  `management-${process.pid}`,
);
const base = () => fixtureData("kevin", "2026-10-17");
const transaction: PersonalRecord = {
  id: "expense",
  kind: "transaction",
  label: "Manual grocery visit",
  date: "2026-10-16",
  accountId: "fictional-kevin",
  category: "Groceries",
  amountCents: -1250,
};
test("manual transaction edits update totals/categories while preserving imported balances and records", () => {
  const original = base();
  original.source = "nessie";
  const before = structuredClone(original);
  const totals = financialTotals(original);
  const added = applyPersonalRecords(original, [transaction]);
  assert.equal(financialTotals(added).spending, totals.spending + 1250);
  assert.equal(
    spendingCategories(added).find((s) => s.name === "Groceries")?.value,
    (spendingCategories(original).find(s => s.name === "Groceries")?.value || 0) + 1250,
  );
  assert.equal(
    added.transactions.find((t) => t.id === "manual:expense")?.provenance,
    "manual",
  );
  assert.deepEqual(original, before);
  assert.deepEqual(added.accounts, original.accounts);
  const edited = applyPersonalRecords(added, [
    { ...transaction, amountCents: -2500, category: "Food" },
  ]);
  assert.equal(
    edited.transactions.filter((t) => t.id === "manual:expense").length,
    1,
  );
  assert.equal(financialTotals(edited).spending, totals.spending + 2500);
  assert.equal(
    spendingCategories(edited).some((s) => s.name === "Groceries"),
    true,
  );
  assert.equal(
    financialTotals(applyPersonalRecords(edited, [])).spending,
    totals.spending,
  );
  const annotation: PersonalRecord = {
    id: "note",
    kind: "annotation",
    label: "My category",
    referenceId: original.transactions[0].id,
    category: "My category",
    notes: "My private note",
  };
  const annotated = applyPersonalRecords(original, [annotation]);
  assert.equal(annotated.transactions[0].description, "My private note");
  assert.notEqual(original.transactions[0].description, "My private note");
  const restored = applyPersonalRecords(annotated, []);
  assert.equal(
    restored.transactions[0].category,
    original.transactions[0].category,
  );
  assert.equal(
    restored.transactions[0].description,
    original.transactions[0].description,
  );
});
test("future manual transactions enter the existing deterministic forecast once, without replaying history", () => {
  const snapshot = base();
  const data = applyPersonalRecords(snapshot, [
    transaction,
    { ...transaction, id: "future", date: "2026-10-20", amountCents: -20000 },
  ]);
  assert.equal(
    forecastEvents(data).filter((e) => e.id === "pending:manual:future").length,
    1,
  );
  assert.equal(
    project(data).endingBalanceCents,
    project(snapshot).endingBalanceCents - 20000,
  );
  assert.equal(
    financialTotals(data).spending,
    financialTotals(snapshot).spending + 1250,
  );
});
test("manually tracked subscriptions project actual cadence without fabricating past transactions; cancellation and scenario stay distinct", () => {
  const record: PersonalRecord = {
    id: "cloud",
    kind: "subscription",
    label: "Cloud plan",
    accountId: "fictional-kevin",
    amountCents: 1200,
    date: "2026-10-19",
    cadence: "weekly",
    status: "active",
  };
  const original = base(),
    data = applyPersonalRecords(original, [record]);
  assert.equal(data.transactions.length, original.transactions.length);
  const id = "fictional-kevin:manual-cloud";
  assert.ok(subscriptionsFor(data).some((s) => s.id === id));
  assert.equal(
    forecastEvents(data).filter((e) => e.id.startsWith(`tracked:${id}:`))
      .length,
    5,
  );
  const baseline = project(data);
  assert.equal(
    project(data, { removedSubscriptions: [id] }).endingBalanceCents,
    baseline.endingBalanceCents + 6000,
  );
  assert.deepEqual(project(data), baseline);
  const canceled = applyPersonalRecords(data, [
    { ...record, status: "canceled" },
  ]);
  assert.ok(!subscriptionsFor(canceled).some((s) => s.id === id));
  assert.equal(
    project(canceled).endingBalanceCents,
    baseline.endingBalanceCents + 6000,
  );
  assert.throws(() =>
    validateRecord({ ...record, label: "Rent", category: "Housing" }),
  );
});
test("manual cancellation does not erase a bank's scheduled payment", () => {
  const data = base();
  const service = subscriptionsFor(data)[0];
  data.transactions.push({
    id: "scheduled-bank",
    date: service.nextChargeDate,
    accountId: "fictional-kevin",
    merchant: service.merchant,
    category: "Subscriptions",
    description: "Scheduled bank payment",
    amountCents: -service.amountCents,
    pending: true,
  });
  data.canceledSubscriptionIds = [service.id];
  assert.ok(
    forecastEvents(data).some((e) => e.id === "pending:scheduled-bank"),
  );
});
test("annualized subscription costs do not amplify rounded monthly equivalents", () => {
  const subscription = {
    ...subscriptionsFor(base())[0],
    cadence: "annual" as const,
    amountCents: 601,
  };
  assert.equal(monthlySubscriptionCost([subscription]), 50);
  assert.equal(annualSubscriptionCost([subscription]), 601);
});
test("credit utilization excludes installments and goal progress shares one goal record with contribution history", () => {
  const records: PersonalRecord[] = [
    {
      id: "card",
      kind: "credit",
      label: "Card",
      category: "Revolving",
      balanceCents: 12000,
      limitCents: 100000,
    },
    {
      id: "loan",
      kind: "credit",
      label: "Loan",
      category: "Installment",
      balanceCents: 999999,
      limitCents: 1,
    },
  ];
  assert.equal(creditUtilization(records), 12);
  assert.equal(creditUtilization([]), null);
  const goal: PersonalRecord = {
    id: "fund",
    kind: "goal",
    label: "Emergency",
    category: "Emergency",
    date: "2026-12-01",
    targetCents: 100000,
    balanceCents: 20000,
  };
  const contributions: PersonalRecord[] = [
    {
      id: "save",
      kind: "contribution",
      label: "Contribution",
      referenceId: "fund",
      date: "2026-10-17",
      amountCents: 15000,
    },
  ];
  assert.deepEqual(goalProgress(goal, contributions), {
    saved: 35000,
    percent: 35,
  });
  assert.equal(
    holdingValue({
      id: "holding",
      kind: "holding",
      label: "Manual asset",
      quantity: 1.2345,
      priceCents: 12345,
    }),
    15240,
  );
  assert.throws(() =>
    validateRecord({ id: "bad", kind: "holding", label: "Bad", quantity: NaN }),
  );
  assert.throws(() =>
    validateRecord({
      id: "score",
      kind: "score",
      label: "Score",
      score: 851,
      date: "2026-10-17",
    }),
  );
});
test("record scopes separate bank customers, generic demos and fictional profiles, and never enter shared payloads", () => {
  assert.throws(() => recordScope("nessie", "demo:kevin"));
  const state = initialState("2026-10-17");
  personalRecords(state, "demo", "demo:kevin").save([transaction]);
  personalRecords(state, "nessie", "customer-a").save([
    { ...transaction, id: "bank-note", label: "PRIVATE NESSIE NOTE" },
  ]);
  assert.ok(personalRecords(state, "demo", "demo:ava").records.every(r => r.id.startsWith("ava-")));
  assert.equal(
    personalRecords(state, "nessie", "customer-b").records.length,
    0,
  );
  assert.equal(personalRecords(state, "demo", "").records.length, 0);
  assert.ok(
    personalData(state, "kevin").transactions.some(
      (t) => t.id === "manual:expense",
    ),
  );
  assert.ok(
    !personalData(state, "ava").transactions.some(
      (t) => t.id === "manual:expense",
    ),
  );
  assert.ok(
    !JSON.stringify(workspaceView(state, "vacation", "ava")).includes(
      "PRIVATE NESSIE NOTE",
    ),
  );
  assert.ok(
    !JSON.stringify(workspaceView(state, "vacation", "ava")).includes(
      "Manual grocery visit",
    ),
  );
});
test("record API persists edits, contributions, holdings history and private cross-page forecasts without banking writes", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw Error("No external banking requests allowed");
  });
  const session = randomUUID();
  const request = (profile: string, body?: object) =>
    new Request(
      `http://localhost:3000/api/records?mode=demo&customer=demo:${profile}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          cookie: `vesta-demo=${session}`,
          origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify({ ...body, confirmed: true }) } : {}),
      },
    );
  const save = async (record: PersonalRecord) => {
    const response = await POST(request("kevin", { action: "save", record }));
    assert.equal(response.status, 200);
    return response.json();
  };
  await save(transaction);
  assert.equal(
    (
      await POST(
        request("kevin", {
          action: "save",
          record: {
            ...transaction,
            id: "wrong-account",
            accountId: "fictional-ava",
          },
        }),
      )
    ).status,
    400,
  );
  await save({ ...transaction, amountCents: -2400 });
  const home = await planning(
    new Request("http://localhost:3000/api/personal-planning?profile=kevin", {
      headers: { cookie: `vesta-demo=${session}` },
    }),
  );
  assert.equal(
    (await home.json()).transactions.find(
      (t: { id: string }) => t.id === "manual:expense",
    ).amountCents,
    -2400,
  );
  assert.ok((await (await GET(request("ava"))).json()).records.every((r: PersonalRecord) => r.id.startsWith("ava-")));
  await save({
    id: "fund",
    kind: "goal",
    label: "Emergency fund",
    category: "Emergency",
    targetCents: 100000,
    balanceCents: 0,
    date: "2026-12-01",
  });
  await save({
    id: "contribution",
    kind: "contribution",
    label: "Saved",
    referenceId: "fund",
    amountCents: 10000,
    date: "2026-10-17",
  });
  const values = await save({
    id: "holding",
    kind: "holding",
    label: "Manual stock",
    quantity: 2,
    priceCents: 1000,
    costCents: 1500,
    category: "Stocks",
    date: "2026-10-17",
  });
  assert.ok(
    values.records.some(
      (r: PersonalRecord) => r.kind === "valuation" && r.amountCents === 2000,
    ),
  );
  const shared = await collaborative(
    new Request("http://localhost:3000/api/collaboration?profile=ava", {
      headers: { cookie: `vesta-demo=${session}` },
    }),
  );
  assert.doesNotMatch(
    JSON.stringify(await shared.json()),
    /Manual grocery visit|Manual stock|recordSets/,
  );
  assert.equal(
    (await POST(request("kevin", { action: "delete", id: "fund" }))).status,
    200,
  );
  const remaining = (await (await GET(request("kevin"))).json()).records;
  assert.ok(!remaining.some((r: PersonalRecord) => r.id === "contribution"));
  assert.equal(
    (
      await POST(
        new Request(
          "http://localhost:3000/api/records?mode=demo&customer=demo:kevin",
          {
            method: "POST",
            headers: { origin: "https://evil.example" },
            body: "{}",
          },
        ),
      )
    ).status,
    403,
  );
});
