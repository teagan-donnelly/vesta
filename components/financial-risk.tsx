"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFinancial } from "./financial-provider";
import { financialWarning } from "@/lib/financial-guidance";
import { forecastEvents, formatCurrency } from "@/lib/analysis";
import { dateLabel } from "./activity-table";
export function FinancialRisk() {
  const { data } = useFinancial();
  if (!data) return null;
  const risk = financialWarning(data);
  if (!risk) return null;
  return (
    <section className="risk-action" aria-label="Upcoming financial risk">
      <div>
        <span className="risk-kicker">Something to plan for</span>
        <h2>
          {risk.label} may leave you {formatCurrency(risk.shortfallCents)} short
          on {dateLabel(risk.date)}.
        </h2>
        <p>This is an estimate based on your current outlook.</p>
      </div>
      <div className="risk-actions">
        <Link className="button button-primary" href={risk.href}>
          Find a way to cover {formatCurrency(risk.shortfallCents)}
        </Link>
        {risk.commitment && (
          <Link
            className="text-link"
            href={`/shared?commitment=${encodeURIComponent(risk.commitment)}`}
          >
            See the shared expense →
          </Link>
        )}
      </div>
    </section>
  );
}
function Focus() {
  const query = useSearchParams();
  const { data } = useFinancial();
  if (!data) return null;
  const event = forecastEvents(data).find(
    (e) =>
      e.id === query.get("event") ||
      e.id === `bill:shared-${query.get("commitment")}`,
  );
  if (!event) return null;
  return (
    <div className="plan-focus">
      <strong>Planning for {event.label}</strong>
      <span>
        Due {dateLabel(event.date)} ·{" "}
        {formatCurrency(Math.abs(event.amountCents))}. Try an adjustment below,
        then review the change in your balance.
      </span>
    </div>
  );
}
export function PlanFocus() {
  return (
    <Suspense fallback={null}>
      <Focus />
    </Suspense>
  );
}
function ReturnLink() {
  const query = useSearchParams();
  const { data } = useFinancial();
  const id = query.get("commitment");
  const valid = id && data?.bills.some((b) => b.id === `shared-${id}`);
  return (
    <Link
      className="text-link"
      href={valid ? `/shared?commitment=${encodeURIComponent(id!)}` : "/shared"}
    >
      Return to Shared Finances →
    </Link>
  );
}
export function SharedReturnLink() {
  return (
    <Suspense
      fallback={
        <Link className="text-link" href="/shared">
          Return to Shared Finances →
        </Link>
      }
    >
      <ReturnLink />
    </Suspense>
  );
}
