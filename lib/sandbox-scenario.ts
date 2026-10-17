import {
  alertsFor,
  forecastEvents,
  liquidBalance,
  project,
  shift,
  subscriptionsFor,
  todayIso,
} from "./analysis";
import {
  sandboxDescription,
  sandboxLabel,
  type SandboxKind,
} from "./sandbox-records";
import type { FinancialData } from "./types";

export type SeedCollection = "deposits" | "withdrawals" | "bills";
export interface SeedItem {
  reference: string;
  collection: SeedCollection;
  kind: SandboxKind;
  label: string;
  date: string;
  amountCents: number;
  body: Record<string, string | number>;
}
export interface ScenarioMetrics {
  startingBalanceCents: number;
  upcomingObligationsCents: number;
  subscriptionCount: number;
  alertCount: number;
  lowestBalanceCents: number;
  lowestBalanceDate: string;
  endingBalanceCents: number;
  subscriptionRemovalDeltaCents: number;
  checks: { label: string; passed: boolean }[];
}
export interface ScenarioPreview {
  id: string;
  customerId: string;
  customerName: string;
  accountId: string;
  accountName: string;
  asOf: string;
  expiresAt: string;
  balanceBeforeCents: number;
  temporaryPeakBalanceCents: number;
  historyIncomeCents: number;
  historyExpenseCents: number;
  items: SeedItem[];
  expected: ScenarioMetrics;
  limitations: string[];
}

export function scenarioItems(asOf = todayIso()): SeedItem[] {
  const items: SeedItem[] = [];
  function history(
    collection: "deposits" | "withdrawals",
    kind: SandboxKind,
    label: string,
    offset: number,
    amountCents: number,
  ) {
    const date = shift(asOf, offset);
    const reference = `${kind}-${label.toLowerCase().replace(/[^a-z0-9]/g, "")}-${date}`;
    items.push({
      reference,
      collection,
      kind,
      label,
      date,
      amountCents,
      body: {
        medium: "balance",
        transaction_date: date,
        status: "completed",
        amount: amountCents / 100,
        description: sandboxDescription(kind, label, reference),
      },
    });
  }
  // Whole dollars follow the integer amount schema for deposits and withdrawals.
  // History nets to zero, so the expected final balance stays at the retrieved balance.
  for (const day of [-62, -48, -34, -20, -6])
    history("deposits", "income", "Juniper Studio Payroll", day, 150000);
  for (const day of [-57, -27])
    history("withdrawals", "housing", "Cedar Apartments Rent", day, 180000);
  for (const day of [-56, -26])
    history("withdrawals", "utilities", "BrightGrid Utilities", day, 14000);
  for (const day of [-50, -20])
    history("withdrawals", "debt", "Student Loan Payment", day, 100000);
  for (const [label, days, amount] of [
    ["StreamNest", [-58, -28], 2500],
    ["Pulse Music", [-57, -27], 2000],
    ["CloudPocket", [-56, -26], 1500],
  ] as const) {
    for (const day of days)
      history("withdrawals", "subscription", label, day, amount);
  }
  for (const day of [-52, -45, -38, -31, -24, -17, -10, -3])
    history("withdrawals", "groceries", "Maple Market Groceries", day, 10000);
  history("withdrawals", "unexpected", "Unfamiliar Device Repair", -4, 70000);
  function bill(
    kind: SandboxKind,
    label: string,
    offset: number,
    amountCents: number,
    recurring = true,
  ) {
    const date = shift(asOf, offset);
    const reference = `bill-${kind}-${date}`;
    items.push({
      reference,
      collection: "bills",
      kind,
      label,
      date,
      amountCents,
      body: {
        status: recurring ? "recurring" : "pending",
        payee: sandboxLabel(kind, label),
        nickname: sandboxDescription(kind, label, reference),
        payment_date: date,
        payment_amount: amountCents / 100,
        ...(recurring ? { recurring_date: Number(date.slice(8)) } : {}),
      },
    });
  }
  bill("subscription", "StreamNest", 2, 2500);
  bill("subscription", "Pulse Music", 3, 2000);
  bill("subscription", "CloudPocket", 4, 1500);
  bill("housing", "Cedar Apartments Rent", 3, 180000);
  bill("utilities", "BrightGrid Utilities", 4, 14000);
  bill("unexpected", "Emergency Car Repair", 5, 45000, false);
  bill("debt", "Student Loan Payment", 11, 100000);
  // Deposit history is created first so historical debits cannot overdraw the account
  // temporarily if Nessie applies completed transactions to its current balance.
  return items;
}

export function scenarioMetrics(data: FinancialData): ScenarioMetrics {
  const baseline = project(data);
  const subs = subscriptionsFor(data);
  const simulation = project(data, {
    removedSubscriptions: subs.map((s) => s.id),
  });
  const unchanged = JSON.stringify(baseline) === JSON.stringify(project(data));
  return {
    startingBalanceCents: liquidBalance(data),
    upcomingObligationsCents: forecastEvents(data).reduce(
      (s, e) => s + Math.max(0, -e.amountCents),
      0,
    ),
    subscriptionCount: subs.length,
    alertCount: alertsFor(data).length,
    lowestBalanceCents: baseline.lowestBalanceCents,
    lowestBalanceDate: baseline.lowestBalanceDate,
    endingBalanceCents: baseline.endingBalanceCents,
    subscriptionRemovalDeltaCents:
      simulation.endingBalanceCents - baseline.endingBalanceCents,
    checks: [
      {
        label: "At least three subscription patterns have historical evidence",
        passed: subs.length >= 3,
      },
      {
        label: "Rent is not classified as a subscription",
        passed: !subs.some((s) => /rent/i.test(s.merchant)),
      },
      {
        label: "Upcoming obligations appear in the forecast",
        passed: forecastEvents(data).some((e) => e.amountCents < 0),
      },
      {
        label: "Baseline has a temporary low balance below $500",
        passed: baseline.lowestBalanceCents < 50000,
      },
      {
        label: "Removing subscriptions improves the scenario ending balance",
        passed: simulation.endingBalanceCents > baseline.endingBalanceCents,
      },
      { label: "Baseline is unchanged by simulation", passed: unchanged },
      {
        label: "Unusual historical activity has a review flag",
        passed: alertsFor(data).length > 0,
      },
    ],
  };
}

// Only for the explicitly labeled preview. Never passed to the dashboard or
// post-seed verification; those always use loadNessie() responses.
export function projectProposedData(
  live: FinancialData,
  accountId: string,
  items: SeedItem[],
): FinancialData {
  return {
    ...live,
    source: "demo",
    transactions: [
      ...live.transactions,
      ...items
        .filter((i) => i.collection !== "bills")
        .map((i) => ({
          id: `proposed:${i.reference}`,
          date: i.date,
          merchant: i.label,
          category:
            i.kind === "income"
              ? "Income"
              : i.kind === "subscription"
                ? "Subscription"
                : i.kind === "housing"
                  ? "Housing"
                  : i.kind === "utilities"
                    ? "Utilities"
                    : i.kind === "debt"
                      ? "Debt Payment"
                      : i.kind === "groceries"
                        ? "Groceries"
                        : "Unknown",
          description: String(i.body.description),
          accountId,
          amountCents: i.amountCents * (i.collection === "deposits" ? 1 : -1),
          pending: false,
          fictional: true,
        })),
    ],
    bills: [
      ...live.bills,
      ...items
        .filter((i) => i.collection === "bills")
        .map((i) => ({
          id: `proposed:${i.reference}`,
          name: i.label,
          dueDate: i.date,
          amountCents: i.amountCents,
          category:
            i.kind === "subscription"
              ? "Subscription"
              : i.kind === "debt"
                ? "Debt"
                : "Bill",
          essential: i.kind !== "subscription",
          accountId,
          recurringDay:
            typeof i.body.recurring_date === "number"
              ? i.body.recurring_date
              : undefined,
        })),
    ],
  };
}
