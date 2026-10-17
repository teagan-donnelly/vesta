import { forecastEvents, project } from "./analysis";
import type { FinancialData } from "./types";
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
  return {
    date: point.date,
    shortfallCents: -point.balanceCents,
    label: event?.label || "Upcoming payments",
    href: `/plan?${query}`,
    commitment,
  };
}
