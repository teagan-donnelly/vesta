import type { CashFlowProjection, Subscription } from "./types";
export function annualSubscriptionCost(subscriptions: Subscription[]) {
  return subscriptions.reduce((sum, subscription) => sum + subscription.amountCents * (subscription.cadence === "weekly" ? 52 : subscription.cadence === "annual" ? 1 : 12), 0);
}
export function monthlySubscriptionCost(subscriptions: Subscription[]) {
  return subscriptions.reduce(
    (sum, s) =>
      sum +
      Math.round(
        s.amountCents *
          (s.cadence === "weekly"
            ? 52 / 12
            : s.cadence === "annual"
              ? 1 / 12
              : 1),
      ),
    0,
  );
}
export function projectionSeries(projection: CashFlowProjection) {
  return [
    {
      date: projection.startDate,
      balanceCents: projection.startingBalanceCents,
    },
    ...projection.points,
  ];
}
export function affectedBalances(
  baseline: CashFlowProjection,
  scenario: CashFlowProjection,
) {
  const byDate = new Map(scenario.points.map((p) => [p.date, p]));
  return baseline.points.flatMap((p) => {
    const s = byDate.get(p.date);
    return s && s.balanceCents !== p.balanceCents
      ? [
          {
            date: p.date,
            baseline: p.balanceCents,
            scenario: s.balanceCents,
            difference: s.balanceCents - p.balanceCents,
          },
        ]
      : [];
  });
}
export function utilizationPercent(balanceCents: number, limitCents: number) {
  return Number.isSafeInteger(balanceCents) &&
    Number.isSafeInteger(limitCents) &&
    balanceCents >= 0 &&
    limitCents > 0
    ? Math.round((balanceCents / limitCents) * 1000) / 10
    : null;
}
