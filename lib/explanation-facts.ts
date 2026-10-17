import {
  alertsFor,
  formatCurrency,
  project,
  subscriptionsFor,
} from "./analysis";
import type { FinancialData, Simulation } from "./types";

export function explanationFacts(
  data: FinancialData,
  simulation: Simulation = {},
) {
  const baseline = project(data);
  const scenario = project(data, simulation);
  const subs = subscriptionsFor(data);
  const alerts = alertsFor(data);
  return [
    {
      id: "cash",
      text: `Available checking and savings total ${formatCurrency(baseline.startingBalanceCents)}. The baseline reaches ${formatCurrency(baseline.lowestBalanceCents)} on ${baseline.lowestBalanceDate}. Review bills around that date.`,
    },
    {
      id: "scenario",
      text: `The simulated ending balance is ${formatCurrency(scenario.endingBalanceCents)}, a change of ${formatCurrency(scenario.endingBalanceCents - baseline.endingBalanceCents)} from baseline. Changes affect future events only.`,
    },
    {
      id: "subscriptions",
      text: `${subs.length} subscription patterns have repeat-charge evidence. Removing a subscription skips only matching future charges. Review the merchant terms before canceling.`,
    },
    {
      id: "alerts",
      text: alerts.length
        ? `${alerts.length} transactions warrant review. ${alerts[0].reason} Verify receipts before taking action.`
        : "No transactions meet the current review rules. Limited history can hide unusual activity; review statements regularly.",
    },
    {
      id: "coverage",
      text: `Forecasts use known bills and inferred recurring events, and exclude ordinary discretionary spending. ${data.warnings.length ? "Data coverage warnings are shown above." : "Check that expected income is represented before relying on the projection."}`,
    },
  ];
}
