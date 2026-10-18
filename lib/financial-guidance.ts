import { forecastEvents, project } from "./analysis";
import type { FinancialData } from "./types";
import { paymentReadiness } from "./planning-options";
export function financialWarning(data: FinancialData) {
  const point = project(data).points.find((p) => p.balanceCents < 0);
  if (!point) return null;
  const payments = forecastEvents(data).filter(
    (e) => e.date === point.date && e.amountCents < 0,
  );
  const event =
    payments.length === 1
      ? payments[0]
      : payments.find((e) => e.id.startsWith("bill:shared-"));
  const commitment = event?.id.startsWith("bill:shared-")
    ? event.id.replace("bill:shared-", "").split(":")[0]
    : undefined;
  const query = new URLSearchParams({ section: "forecast" });
  if (event) query.set("event", event.id);
  if (commitment) query.set("commitment", commitment);
  const readiness = event ? paymentReadiness(data, event.id) : null;
  const preceding = forecastEvents(data).filter(e => e.date <= point.date && e.id !== event?.id);
  const nextIncome = forecastEvents(data).find(e => e.date > point.date && e.amountCents > 0);
  return {
    date: point.date,
    shortfallCents: -point.balanceCents,
    label: event?.label || "Upcoming payments",
    href: `/plan?${query}`,
    commitment,
    eventId: event?.id,
    shareCents: event ? -event.amountCents : null,
    availableCents: readiness?.coveredCents ?? null,
    precedingExpensesCents: preceding.reduce((sum, e) => sum - Math.min(e.amountCents, 0), 0),
    precedingIncomeCents: preceding.reduce((sum, e) => sum + Math.max(e.amountCents, 0), 0),
    nextIncomeDate: nextIncome?.date,
  };
}
