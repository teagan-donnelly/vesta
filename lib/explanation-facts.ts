import {
  alertsFor,
  formatCurrency,
  project,
  subscriptionsFor,
  forecastEvents,
} from "./analysis";
import type { FinancialData, Simulation } from "./types";
import { monthlySubscriptionCost } from "./financial-view";

export function explanationFacts(
  data: FinancialData,
  simulation: Simulation = {},
) {
  const baseline = project(data);
  const scenario = project(data, simulation);
  const subs = subscriptionsFor(data);
  const alerts = alertsFor(data);
  const events = forecastEvents(data);
  const nextIncome = events.find((e) => e.amountCents > 0);
  return [
    {
      id: "cash",
      text: events.length
        ? `Your projected low is ${formatCurrency(baseline.lowestBalanceCents)} on ${baseline.lowestBalanceDate}. ${baseline.shortfallAmountCents > 0 ? "Known and estimated payments exceed your cash buffer. Review payment timing before that date." : `Your starting cash is ${formatCurrency(baseline.startingBalanceCents)}. Keep room for spending not included in the forecast.`}${nextIncome ? ` Next estimated income: ${nextIncome.date}.` : ""}`
        : `No scheduled or recurring cash activity is available. The forecast holds your current ${formatCurrency(baseline.startingBalanceCents)} balance; it does not establish that no future expenses exist.`,
    },
    {
      id: "scenario",
      text: `Your scenario ends at ${formatCurrency(scenario.endingBalanceCents)}, a ${formatCurrency(scenario.endingBalanceCents - baseline.endingBalanceCents)} change from baseline. Its lowest balance is ${formatCurrency(scenario.lowestBalanceCents)} on ${scenario.lowestBalanceDate}. These are hypothetical future changes, not account actions.`,
    },
    {
      id: "subscriptions",
      text: subs.length
        ? `${subs.length} repeated subscription patterns total ${formatCurrency(monthlySubscriptionCost(subs))} in monthly equivalent costs. Test removing services in Protect to compare future cash, then review provider terms before canceling.`
        : "No repeated subscription patterns are available. More history may be needed; recurring rent, utilities and debt are kept separate.",
    },
    {
      id: "alerts",
      text: alerts.length
        ? `${alerts.length} activity records warrant review, including a ${formatCurrency(alerts[0].amountCents)} charge on ${alerts[0].date}. ${alerts[0].reason} Compare it with your receipt.`
        : "No transactions meet the current review rules. Limited history can hide unusual activity; review statements regularly.",
    },
    {
      id: "coverage",
      text: `${data.warnings.some((w) => w.startsWith("Shared planning is not included")) ? "Shared planning is not included: shared obligations and saved scenarios are missing, so this forecast is incomplete. " : ""}Everyday discretionary spending is excluded. Payroll timing is estimated from history, and checking and savings are pooled. Review data coverage in Settings before relying on a projected balance.`,
    },
  ];
}
