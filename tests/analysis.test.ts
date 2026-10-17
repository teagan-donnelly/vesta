import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alertsFor,
  classify,
  forecastEvents,
  key,
  liquidBalance,
  project,
  subscriptionsFor,
} from "../lib/analysis";
import { demoData } from "../lib/data";
import type { FinancialData, Transaction } from "../lib/types";

const data = demoData("2026-10-17");
function fixture(): FinancialData {
  return {
    source: "demo",
    asOf: "2026-10-17",
    customers: [],
    accounts: [
      {
        id: "cash",
        customerId: "c",
        type: "Checking",
        name: "Cash",
        balanceCents: 100000,
        institution: "Test",
      },
    ],
    transactions: [],
    bills: [],
    loans: [],
    warnings: [],
  };
}
function txn(
  id: string,
  date: string,
  amountCents: number,
  merchant = "Netflix",
  category = "Subscription",
): Transaction {
  return {
    id,
    date,
    amountCents,
    merchant,
    category,
    description: merchant,
    accountId: "cash",
  };
}
test("balances consistently sum liquid accounts and exclude card liabilities", () => {
  assert.equal(liquidBalance(data), 407250);
  assert.equal(project(data).startingBalanceCents, 407250);
});
test("expected rent and monthly obligations are not suspicious or subscriptions", () => {
  assert.ok(!alertsFor(data).some((a) => a.merchant === "Apartment Rent"));
  const subs = subscriptionsFor(data);
  assert.ok(subs.some((s) => s.merchant === "Netflix"));
  assert.ok(!subs.some((s) => /rent|credit|energy/i.test(s.merchant)));
});
test("rent spikes are still reviewable with same-merchant evidence", () => {
  const d = fixture();
  d.transactions = [
    txn("1", "2026-08-01", -100000, "Rent", "Housing"),
    txn("2", "2026-09-01", -100000, "Rent", "Housing"),
    txn("3", "2026-10-01", -500000, "Rent", "Housing"),
  ];
  assert.equal(alertsFor(d).length, 1);
});
test("monthly repeat purchases are not automatically subscriptions", () => {
  assert.equal(
    classify(txn("x", "2026-10-01", -3000, "Market", "Groceries")),
    "purchase",
  );
});
test("no historical replay; positive balances have zero shortfall", () => {
  const d = fixture();
  d.transactions = [txn("old", "2026-09-01", -50000)];
  const p = project(d);
  assert.equal(p.endingBalanceCents, 100000);
  assert.equal(p.shortfallAmountCents, 0);
  assert.equal(p.lowestBalanceCents, 100000);
});
test("known bills and inferred recurring obligations are counted once", () => {
  const d = fixture();
  d.transactions = [
    txn("a", "2026-08-20", -10000, "Rent", "Housing"),
    txn("b", "2026-09-20", -10000, "Rent", "Housing"),
  ];
  d.bills = [
    {
      id: "r",
      name: "Rent",
      dueDate: "2026-10-20",
      amountCents: 10000,
      category: "Housing",
      essential: true,
    },
  ];
  assert.equal(forecastEvents(d).length, 1);
  assert.equal(project(d).endingBalanceCents, 90000);
});
test("unrelated equal amounts do not suppress inferred obligations", () => {
  const d = fixture();
  d.transactions = [
    txn("a", "2026-08-20", -10000),
    txn("b", "2026-09-20", -10000),
  ];
  d.bills = [
    {
      id: "r",
      name: "Rent",
      dueDate: "2026-10-20",
      amountCents: 10000,
      category: "Housing",
      essential: true,
    },
  ];
  assert.equal(forecastEvents(d).length, 2);
});
test("subscription removal saves only matching future events", () => {
  const base = project(data);
  const netflix = forecastEvents(data)
    .filter((e) => e.merchantKey === key("Spotify"))
    .reduce((s, e) => s - e.amountCents, 0);
  assert.ok(netflix > 0);
  const next = project(data, {
    removedSubscriptions: ["account-checking:spotify"],
  });
  assert.equal(next.endingBalanceCents - base.endingBalanceCents, netflix);
  assert.deepEqual(data, demoData("2026-10-17"));
});
test("delayed income is moved, not added twice", () => {
  const d = fixture();
  d.transactions = [
    txn("a", "2026-08-20", 10000, "Payroll", "Income"),
    txn("b", "2026-09-20", 10000, "Payroll", "Income"),
  ];
  const e = forecastEvents(d)[0];
  const base = project(d);
  const delayed = project(d, { eventId: e.id, delayDays: 5 });
  assert.equal(delayed.endingBalanceCents, base.endingBalanceCents);
  assert.equal(
    delayed.points.find((p) => p.date === "2026-10-20")!.incomeCents,
    0,
  );
  assert.equal(
    delayed.points.find((p) => p.date === "2026-10-25")!.incomeCents,
    10000,
  );
  assert.equal(
    project(d, { eventId: e.id, delayDays: 60 }).endingBalanceCents,
    100000,
  );
});
test("unexpected expense, delayed expense and amount adjustment apply exactly once", () => {
  const d = fixture();
  d.bills = [
    {
      id: "b",
      name: "Optional purchase",
      dueDate: "2026-10-18",
      amountCents: 25000,
      category: "Bill",
      essential: false,
    },
  ];
  assert.equal(
    project(d, { unexpectedCents: 12345, unexpectedDate: "2026-10-19" })
      .endingBalanceCents,
    62655,
  );
  assert.equal(
    project(d, { eventId: "bill:b", delayDays: 5 }).endingBalanceCents,
    75000,
  );
  assert.equal(
    project(d, { eventId: "bill:b", paymentCents: 10001 }).endingBalanceCents,
    89999,
  );
});
test("weekly recurrence includes all future charges and month end stays valid", () => {
  const d = fixture();
  d.transactions = [
    txn("a", "2026-10-03", -999),
    txn("b", "2026-10-10", -999),
    txn("c", "2026-10-17", -999),
  ];
  assert.equal(forecastEvents(d).length, 4);
  const m = fixture();
  m.asOf = "2026-01-31";
  m.transactions = [txn("a", "2025-12-31", -123), txn("b", "2026-01-31", -123)];
  assert.equal(forecastEvents(m)[0].date, "2026-02-28");
});
test("all forecast monetary values remain integer cents and dates follow snapshot", () => {
  const p = project(data, {
    unexpectedCents: 12345,
    unexpectedDate: "2026-10-18",
  });
  assert.equal(p.startDate, "2026-10-17");
  assert.equal(p.endDate, "2026-11-16");
  assert.ok(p.points.every((p) => Number.isSafeInteger(p.balanceCents)));
});
test("pending future charges replace inferred duplicates; card-funded bills do not reduce cash", () => {
  const d = fixture();
  d.transactions = [
    txn("a", "2026-08-20", -1000),
    txn("b", "2026-09-20", -1000),
    { ...txn("c", "2026-10-20", -1000), pending: true },
  ];
  d.bills = [
    {
      id: "card",
      accountId: "not-cash",
      name: "Card-funded bill",
      amountCents: 9000,
      dueDate: "2026-10-20",
      essential: true,
      category: "Bill",
    },
  ];
  assert.equal(forecastEvents(d).length, 1);
  assert.equal(project(d).endingBalanceCents, 99000);
});
test("stale month-end recurrence preserves the original day after February", () => {
  const d = fixture();
  d.asOf = "2026-03-01";
  d.transactions = [txn("a", "2025-12-31", -123), txn("b", "2026-01-31", -123)];
  assert.equal(forecastEvents(d)[0].date, "2026-03-31");
});
test("recurring bills include each occurrence within the horizon", () => {
  const d = fixture();
  d.asOf = "2026-01-30";
  d.bills = [
    {
      id: "r",
      name: "Rent",
      dueDate: "2026-01-31",
      recurringDay: 31,
      amountCents: 10000,
      category: "Housing",
      essential: true,
    },
  ];
  const events = forecastEvents(d);
  assert.deepEqual(
    events.map((e) => e.date),
    ["2026-01-31", "2026-02-28"],
  );
  assert.equal(project(d).endingBalanceCents, 80000);
});
test("removing a subscription only affects its selected account", () => {
  const d = fixture();
  d.accounts.push({ ...d.accounts[0], id: "other", balanceCents: 0 });
  d.transactions = [
    txn("a", "2026-08-20", -1000),
    txn("b", "2026-09-20", -1000),
    { ...txn("c", "2026-08-20", -2000), accountId: "other" },
    { ...txn("d", "2026-09-20", -2000), accountId: "other" },
  ];
  assert.equal(
    project(d, { removedSubscriptions: ["cash:netflix"] }).endingBalanceCents,
    98000,
  );
});
