import type {
  FinancialData,
  ForecastEvent,
  Simulation,
  Subscription,
  Transaction,
  CashFlowProjection,
} from "./types";

export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const key = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
export const iso = (date: Date) => date.toISOString().slice(0, 10);
export const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && iso(date) === value;
}
export function shift(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
function nextMonth(date: string, anchorDay = Number(date.slice(8))) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(anchorDay, end));
  return iso(d);
}
export function classify(t: Transaction): ForecastEvent["kind"] {
  if (t.amountCents > 0) return "income";
  const text = `${t.category} ${t.merchant} ${t.description}`.toLowerCase();
  if (/debt|credit.*payment|loan|mortgage/.test(text)) return "debt";
  if (/housing|rent|utilities|electric|insurance|phone|internet/.test(text))
    return "bill";
  if (
    /subscription|streaming|membership|netflix|spotify|fitness|storage/.test(
      text,
    )
  )
    return "subscription";
  return "purchase";
}
export function liquidBalance(data: FinancialData) {
  return data.accounts
    .filter((a) => a.type !== "Credit Card")
    .reduce((s, a) => s + a.balanceCents, 0);
}
function groups(data: FinancialData) {
  const result = new Map<string, Transaction[]>();
  for (const t of data.transactions.filter(
    (t) => t.date <= data.asOf && !t.pending,
  )) {
    const k = `${t.accountId}:${key(t.merchant)}:${Math.sign(t.amountCents)}`;
    result.set(k, [...(result.get(k) || []), t]);
  }
  return [...result.values()].map((g) =>
    g.sort((a, b) => a.date.localeCompare(b.date)),
  );
}
function recurrence(items: Transaction[]) {
  if (items.length < 2) return null;
  const intervals = items
    .slice(1)
    .map((t, i) => (Date.parse(t.date) - Date.parse(items[i].date)) / 86400000);
  const amounts = items.map((t) => Math.abs(t.amountCents));
  if (Math.max(...amounts) > Math.min(...amounts) * 1.2) return null;
  if (intervals.every((d) => d >= 6 && d <= 8)) return "weekly" as const;
  if (intervals.every((d) => d >= 12 && d <= 18)) return "biweekly" as const;
  if (intervals.every((d) => d >= 26 && d <= 35)) return "monthly" as const;
  if (intervals.every((d) => d >= 360 && d <= 370)) return "annual" as const;
  return null;
}
function advance(
  date: string,
  cadence: string,
  anchorDay = Number(date.slice(8)),
) {
  if (cadence === "monthly") return nextMonth(date, anchorDay);
  if (cadence === "annual") {
    let next = date;
    for (let i = 0; i < 12; i++) next = nextMonth(next, anchorDay);
    return next;
  }
  return shift(date, cadence === "weekly" ? 7 : 14);
}
export function subscriptionsFor(data: FinancialData): Subscription[] {
  const detected = groups(data).flatMap((items) => {
    const cadence = recurrence(items);
    const last = items.at(-1)!;
    if (classify(last) !== "subscription" || !cadence || cadence === "biweekly")
      return [];
    let next = advance(last.date, cadence);
    while (next <= data.asOf)
      next = advance(next, cadence, Number(last.date.slice(8)));
    return [
      {
        id: `${last.accountId}:${key(last.merchant)}`,
        merchant: last.merchant,
        amountCents: Math.abs(last.amountCents),
        cadence,
        lastChargeDate: last.date,
        nextChargeDate: next,
        confidence:
          items.length >= 3 ? "Confirmed recurring" : "Likely recurring",
        status: "review",
      } as Subscription,
    ];
  });
  const manual = (data.manualSubscriptions || []).map((subscription) => {
    let next = subscription.nextChargeDate;
    while (next <= data.asOf)
      next = advance(
        next,
        subscription.cadence,
        Number(subscription.nextChargeDate.slice(8)),
      );
    return { ...subscription, nextChargeDate: next };
  });
  return [
    ...detected.filter((s) => !manual.some((m) => m.id === s.id)),
    ...manual,
  ].filter((s) => !data.canceledSubscriptionIds?.includes(s.id));
}
export function alertsFor(data: FinancialData) {
  return data.transactions
    .filter((t) => t.amountCents < 0 && t.date <= data.asOf && !t.pending)
    .flatMap((t) => {
      const obligation = ["bill", "debt", "subscription"].includes(classify(t));
      const prior = data.transactions.filter(
        (p) =>
          p.date < t.date &&
          p.amountCents < 0 &&
          p.category === t.category &&
          p.id !== t.id,
      );
      const same = prior.filter((p) => key(p.merchant) === key(t.merchant));
      const sample = same.length ? same : prior;
      const amounts = sample
        .map((p) => Math.abs(p.amountCents))
        .sort((a, b) => a - b);
      const typical = amounts[Math.floor(amounts.length / 2)] || 0;
      const duplicate = data.transactions.some(
        (p) =>
          p.id !== t.id &&
          p.date === t.date &&
          p.accountId === t.accountId &&
          key(p.merchant) === key(t.merchant) &&
          p.amountCents === t.amountCents,
      );
      const unusual = obligation
        ? same.length >= 2 &&
          typical > 0 &&
          Math.abs(t.amountCents) > typical * 3
        : typical > 0
          ? Math.abs(t.amountCents) > typical * 3
          : t.category === "Unknown" && Math.abs(t.amountCents) >= 30000;
      if (!duplicate && !unusual) return [];
      return [
        {
          id: `alert-${t.id}`,
          title: duplicate
            ? "Possible duplicate charge"
            : "Unusual discretionary charge",
          merchant: t.merchant,
          date: t.date,
          amountCents: Math.abs(t.amountCents),
          severity: "Medium" as const,
          confidence: typical ? 75 : 55,
          reason: duplicate
            ? "Same merchant, account, date and amount appear more than once. Verify the receipts."
            : typical
              ? "Amount exceeds three times the historical merchant or category median."
              : "Large unclassified charge with limited history. Review it; this is not proof of fraud.",
          evidence: [
            typical
              ? `Historical comparison: ${formatCurrency(typical)}`
              : "Insufficient comparable history",
          ],
        },
      ];
    });
}
export function forecastEvents(data: FinancialData): ForecastEvent[] {
  const end = shift(data.asOf, 30);
  const cashIds = new Set(
    data.accounts.filter((a) => a.type !== "Credit Card").map((a) => a.id),
  );
  const events: ForecastEvent[] = data.bills
    .filter(
      (b) =>
        (!b.accountId || cashIds.has(b.accountId)) &&
        b.dueDate > data.asOf &&
        b.dueDate <= end,
    )
    .map((b) => ({
      id: `bill:${b.id}`,
      date: b.dueDate,
      amountCents: -b.amountCents,
      label: b.name,
      kind: /subscription/i.test(b.category)
        ? "subscription"
        : /debt/i.test(b.category)
          ? "debt"
          : "bill",
      merchantKey: key(b.name),
      accountId: b.accountId,
    }));
  for (const bill of data.bills.filter(
    (b) => b.recurringDay && (!b.accountId || cashIds.has(b.accountId)),
  )) {
    let date = bill.dueDate;
    while (date <= data.asOf) date = nextMonth(date, bill.recurringDay);
    while (date <= end) {
      if (!events.some((e) => e.id === `bill:${bill.id}` && e.date === date))
        events.push({
          id: `bill:${bill.id}:${date}`,
          date,
          amountCents: -bill.amountCents,
          label: bill.name,
          kind: /subscription/i.test(bill.category)
            ? "subscription"
            : /debt/i.test(bill.category)
              ? "debt"
              : "bill",
          merchantKey: key(bill.name),
          accountId: bill.accountId,
        });
      date = nextMonth(date, bill.recurringDay);
    }
  }
  for (const t of data.transactions.filter(
    (t) =>
      t.pending &&
      t.date > data.asOf &&
      t.date <= end &&
      cashIds.has(t.accountId),
  )) {
    const existing = events.find(
      (e) =>
        e.merchantKey === key(t.merchant) &&
        e.date === t.date &&
        e.amountCents === t.amountCents,
    );
    if (!existing)
      events.push({
        id: `pending:${t.id}`,
        date: t.date,
        amountCents: t.amountCents,
        label: t.merchant,
        kind: classify(t),
        merchantKey: key(t.merchant),
        accountId: t.accountId,
      });
  }
  for (const items of groups(data)) {
    const last = items.at(-1)!;
    const cadence = recurrence(items);
    const kind = classify(last);
    const subscriptionId = `${last.accountId}:${key(last.merchant)}`;
    // Explicit upcoming payroll dates supersede inferred cadence. Semimonthly
    // pay is not biweekly: extrapolating 14 days can invent income before rent.
    if (kind === "income" && events.some(e => e.id.startsWith("pending:") && e.kind === "income" && e.accountId === last.accountId && e.merchantKey === key(last.merchant))) continue;
    if (
      kind === "subscription" &&
      (data.canceledSubscriptionIds?.includes(subscriptionId) ||
        data.manualSubscriptions?.some((s) => s.id === subscriptionId))
    )
      continue;
    if (
      !cashIds.has(last.accountId) ||
      !cadence ||
      kind === "purchase" ||
      last.category === "Deposit"
    )
      continue;
    let date = advance(last.date, cadence);
    while (date <= data.asOf)
      date = advance(date, cadence, Number(last.date.slice(8)));
    while (date <= end) {
      // A dated bill supersedes the same merchant's inferred event. Never match
      // unrelated obligations merely because their amounts happen to be equal.
      const existing = events.find(
        (e) =>
          (e.id.startsWith("bill:") || e.id.startsWith("pending:")) &&
          e.merchantKey === key(last.merchant) &&
          (!e.accountId || e.accountId === last.accountId) &&
          Math.abs(Date.parse(e.date) - Date.parse(date)) <=
            (e.id.startsWith("bill:") ? 7 : 0) * 86400000,
      );
      if (!existing)
        events.push({
          id: `${last.accountId}:${key(last.merchant)}:${date}`,
          date,
          amountCents: last.amountCents,
          label: last.merchant,
          kind,
          merchantKey: key(last.merchant),
          accountId: last.accountId,
        });
      else if (kind === "subscription") {
        existing.kind = kind;
        existing.merchantKey = key(last.merchant);
        existing.accountId = last.accountId;
      }
      date = advance(date, cadence, Number(last.date.slice(8)));
    }
  }
  for (const s of data.manualSubscriptions || []) {
    if (data.canceledSubscriptionIds?.includes(s.id)) continue;
    const separator = s.id.indexOf(":");
    const accountId = s.id.slice(0, separator),
      merchantKey = s.id.slice(separator + 1);
    if (!cashIds.has(accountId)) continue;
    let date = s.nextChargeDate;
    while (date <= data.asOf)
      date = advance(date, s.cadence, Number(s.nextChargeDate.slice(8)));
    while (date <= end) {
      if (
        !events.some(
          (e) =>
            e.accountId === accountId &&
            e.date === date &&
            (e.merchantKey === merchantKey ||
              e.merchantKey === key(s.merchant)),
        )
      )
        events.push({
          id: `tracked:${s.id}:${date}`,
          date,
          amountCents: -s.amountCents,
          label: s.merchant,
          kind: "subscription",
          merchantKey,
          accountId,
        });
      date = advance(date, s.cadence, Number(s.nextChargeDate.slice(8)));
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
export function project(
  data: FinancialData,
  simulation: Simulation = {},
): CashFlowProjection {
  const events = forecastEvents(data)
    .filter(
      (e) =>
        !(
          e.kind === "subscription" &&
          simulation.removedSubscriptions?.includes(
            `${e.accountId}:${e.merchantKey}`,
          )
        ),
    )
    .map((e) => ({ ...e }));
  const target = events.find((e) => e.id === simulation.eventId);
  if (target) {
    if (simulation.delayDays)
      target.date = shift(target.date, simulation.delayDays);
    if (simulation.paymentCents !== undefined && target.amountCents < 0)
      target.amountCents = -simulation.paymentCents;
  }
  if (simulation.unexpectedCents && simulation.unexpectedDate)
    events.push({
      id: "unexpected",
      date: simulation.unexpectedDate,
      amountCents: -simulation.unexpectedCents,
      label: "Unexpected expense",
      kind: "purchase",
      merchantKey: "",
    });
  const startingBalanceCents = liquidBalance(data);
  let balance = startingBalanceCents;
  const points = Array.from({ length: 30 }, (_, i) => {
    const date = shift(data.asOf, i + 1);
    const day = events.filter((e) => e.date === date);
    const incomeCents = day.reduce((s, e) => s + Math.max(0, e.amountCents), 0);
    const expenseCents = day.reduce(
      (s, e) => s + Math.max(0, -e.amountCents),
      0,
    );
    balance += incomeCents - expenseCents;
    return { date, balanceCents: balance, incomeCents, expenseCents };
  });
  const low = points.reduce(
    (a, b) => (b.balanceCents < a.balanceCents ? b : a),
    { date: data.asOf, balanceCents: startingBalanceCents },
  );
  return {
    startDate: data.asOf,
    endDate: points.at(-1)!.date,
    startingBalanceCents,
    endingBalanceCents: balance,
    lowestBalanceCents: low.balanceCents,
    lowestBalanceDate: low.date,
    shortfallAmountCents: Math.max(0, -low.balanceCents),
    points,
    riskyDates: points.filter((p) => p.balanceCents < 0).map((p) => p.date),
    contributingFactors: [
      `${events.length} known or inferred events. Recurrence is an estimate.`,
      "Checking and savings are combined; transfers between them are not income.",
      "Ordinary discretionary spending and unsupported income schedules are not predicted.",
    ],
  };
}
