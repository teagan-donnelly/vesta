import { alerts, bills, customer, financialScenarioOptions, subscriptions, transactions } from "./demo-data";
import type {
  CashFlowProjection,
  FinancialAlert,
  FinancialScenario,
  Subscription,
  Transaction,
} from "./types";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

function parseIsoDate(dateValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function detectRecurringCharges(): Subscription[] {
  const byMerchant = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    if (txn.amountCents >= 0) continue;
    const key = txn.merchant.toLowerCase().replace(/\s+/g, "").trim();
    const bucket = byMerchant.get(key) ?? [];
    bucket.push(txn);
    byMerchant.set(key, bucket);
  }

  const results: Subscription[] = [];

  for (const [merchant, items] of byMerchant.entries()) {
    if (items.length < 2) continue;
    const sorted = [...items].sort(
      (left, right) => parseIsoDate(left.date).getTime() - parseIsoDate(right.date).getTime(),
    );
    const amounts = sorted.map((item) => Math.abs(item.amountCents));
    const average = Math.round(amounts.reduce((sum, entry) => sum + entry, 0) / amounts.length);
    const daysBetween = sorted.length > 1
      ? Math.round(
          (parseIsoDate(sorted[sorted.length - 1].date).getTime() -
            parseIsoDate(sorted[0].date).getTime()) /
            (1000 * 60 * 60 * 24 * (sorted.length - 1)),
        )
      : 30;

    let cadence: Subscription["cadence"] = "monthly";
    let confidence: Subscription["confidence"] = "Insufficient evidence";

    if (daysBetween >= 20 && daysBetween <= 50) {
      cadence = "monthly";
      confidence = "Confirmed recurring";
    } else if (daysBetween >= 4 && daysBetween <= 15) {
      cadence = "weekly";
      confidence = "Likely recurring";
    } else if (daysBetween > 300) {
      cadence = "annual";
      confidence = "Likely recurring";
    }

    if (items.length < 3 && cadence === "monthly") {
      confidence = "Likely recurring";
    }

    const last = sorted[sorted.length - 1];
    const next = new Date(parseIsoDate(last.date));
    next.setUTCDate(next.getUTCDate() + (daysBetween > 0 ? daysBetween : 30));

    results.push({
      id: `sub-${merchant}`,
      merchant: merchant === "nordlinecredit" ? "Northline Credit" : items[0].merchant,
      amountCents: average,
      cadence,
      lastChargeDate: last.date,
      nextChargeDate: dateToIso(next),
      confidence,
      status: "review",
    });
  }

  return results
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 4);
}

export function detectSuspiciousTransactions(): FinancialAlert[] {
  const sorted = [...transactions]
    .filter((txn) => txn.amountCents < 0)
    .sort((a, b) => Math.abs(b.amountCents) - Math.abs(a.amountCents));

  const amounts = sorted.map((txn) => Math.abs(txn.amountCents));
  const median = amounts[Math.floor(amounts.length / 2)] ?? 0;

  const alertsList: FinancialAlert[] = [];
  const seen = new Map<string, number>();

  for (const txn of sorted) {
    const absAmount = Math.abs(txn.amountCents);
    const repeated = seen.get(txn.merchant) ?? 0;
    seen.set(txn.merchant, repeated + 1);

    if (absAmount > median * 3 || repeated > 0) {
      alertsList.push({
        id: `alert-${txn.id}`,
        title: absAmount > median * 3 ? "Large unexplained charge" : "Repeat purchase pattern",
        merchant: txn.merchant,
        date: txn.date,
        amountCents: absAmount,
        severity: absAmount > median * 3 ? "High" : "Medium",
        confidence: absAmount > median * 3 ? 88 : 72,
        reason:
          absAmount > median * 3
            ? "Transaction exceeds the household median substantially and is inconsistent with prior purchases."
            : "This merchant appears multiple times in quick succession within the current spending cycle.",
        evidence: [
          `Median household expense is ${formatCurrency(median)}`,
          `This charge is ${formatCurrency(absAmount)} compared with the typical spend for the customer.`,
        ],
      });
    }
  }

  return alertsList.slice(0, 3);
}

export function buildForecast(scenarioId?: string): CashFlowProjection {
  const scenario = financialScenarioOptions.find((entry) => entry.id === scenarioId) ?? financialScenarioOptions[0];
  const startDate = parseIsoDate("2026-07-05");
  const points: CashFlowProjection["points"] = [];

  let balance = 182450;
  const recurringCharges = subscriptions.map((sub) => ({
    merchant: sub.merchant,
    amountCents: sub.amountCents,
    chargeDate: sub.nextChargeDate,
  }));

  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
    const currentDate = addDays(startDate, dayIndex);
    const iso = dateToIso(currentDate);
    const income = transactions
      .filter((txn) => txn.date === iso && txn.amountCents > 0)
      .reduce((sum, entry) => sum + entry.amountCents, 0);

    let expenses = transactions
      .filter((txn) => txn.date === iso && txn.amountCents < 0)
      .reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0);

    const chargeDateMatches = recurringCharges.filter((item) => item.chargeDate === iso);
    for (const charge of chargeDateMatches) {
      expenses += charge.amountCents;
    }

    if (iso === "2026-07-12") expenses += 195000;
    if (iso === "2026-07-15") expenses += 11820 + 9800;
    if (iso === "2026-07-20") expenses += 6499;
    if (iso === "2026-07-24") expenses += 98000;

    if (scenario.subscriptionSavingsCents > 0 && iso === "2026-08-05") {
      expenses -= scenario.subscriptionSavingsCents;
    }

    if (scenario.delayedExpenseCents > 0 && iso === "2026-07-18") {
      expenses += scenario.delayedExpenseCents;
    }

    if (scenario.unexpectedExpenseCents > 0 && iso === "2026-07-16") {
      expenses += scenario.unexpectedExpenseCents;
    }

    if (scenario.incomeDelayCents > 0 && iso === "2026-07-18") {
      balance += scenario.incomeDelayCents;
    }

    if (scenario.paymentAdjustmentCents > 0 && iso === "2026-07-24") {
      expenses += scenario.paymentAdjustmentCents;
    }

    balance += income - expenses;
    points.push({ date: iso, balanceCents: balance, incomeCents: income, expenseCents: expenses });
  }

  const lowestBalance = Math.min(...points.map((point) => point.balanceCents));
  const lowestPoint = points.find((point) => point.balanceCents === lowestBalance) ?? points[0];
  const riskyDates = points.filter((point) => point.balanceCents < 0).map((point) => point.date);

  return {
    startDate: dateToIso(startDate),
    endDate: points[points.length - 1]?.date ?? dateToIso(startDate),
    startingBalanceCents: 182450,
    endingBalanceCents: points[points.length - 1]?.balanceCents ?? 182450,
    lowestBalanceCents: lowestBalance,
    lowestBalanceDate: lowestPoint.date,
    shortfallAmountCents: Math.max(0, Math.abs(lowestBalance)),
    points,
    riskyDates,
    contributingFactors: [
      "Rent and utility dates cluster before the next paycheck.",
      "The household is carrying a recurring streaming and storage burden.",
      "A one-off financial shock is reducing the cash buffer materially.",
    ],
  };
}

export function getOverviewCards() {
  const totalBalance = customer.incomeCents * 2 + 180000;
  const upcomingObligations = bills.reduce((sum, bill) => sum + bill.amountCents, 0);
  const monthlyExpenses = subscriptions.reduce((sum, sub) => sum + sub.amountCents, 0) + 118200;

  return [
    { label: "Total available balance", value: formatCurrency(totalBalance), note: "Across checking and savings" },
    { label: "Upcoming obligations", value: formatCurrency(upcomingObligations), note: "Next 30 days" },
    { label: "Recurring monthly expenses", value: formatCurrency(monthlyExpenses), note: "Subscriptions + utilities" },
    { label: "Financial alerts", value: `${alerts.length}`, note: "Priority review items" },
  ];
}

export function getPriorityAlerts() {
  return detectSuspiciousTransactions().slice(0, 3);
}

export function getRecurringPreview() {
  return detectRecurringCharges();
}

export function getDemoNarrative() {
  return {
    headline: "Cash buffer tightens before next payroll",
    summary:
      "Ava has enough available liquidity today, but the next 10 days compress cash flow before her next paycheck. Removing the streaming and storage subscriptions would materially stabilize the projection.",
  };
}

export function getCreditGuidance() {
  return [
    {
      title: "Reduce card utilization before the next statement closes",
      description: "A lower revolving balance creates more margin and reduces reliance on high-interest debt. The current balance is near the 36% utilization range.",
    },
    {
      title: "Keep due dates in front of the next pay cycle",
      description: "Upcoming rent and card payments are due before payroll. Align autopay or buffers to reduce stress and avoid late fees.",
    },
  ];
}

export function getDeadboltChecklist() {
  return [
    "Review shared electricity payment and account access",
    "Split Netflix subscription ownership and payment method",
    "Verify who receives billing notices for household services",
    "Update shared security credentials before household changes",
  ];
}

export function getContinuitySummary() {
  return [
    "Prepare rent and utility autopay in advance",
    "Keep a one-page emergency contact and account list",
    "Review annual and monthly recurring subscriptions",
  ];
}

export function getScenarioDelta(scenarioId?: string) {
  const baseline = buildForecast("baseline");
  const scenario = buildForecast(scenarioId ?? "baseline");
  return {
    baseline,
    scenario,
    differenceCents: scenario.endingBalanceCents - baseline.endingBalanceCents,
  };
}
