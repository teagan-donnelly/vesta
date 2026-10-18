"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFinancial } from "./financial-provider";
import { financialWarning } from "@/lib/financial-guidance";
import { forecastEvents, formatCurrency } from "@/lib/analysis";
import { dateLabel } from "./activity-table";
import { paymentReadiness } from "@/lib/planning-options";
export function FinancialRisk() {
  const { data, simulation } = useFinancial();
  if (!data) return null;
  const risk = financialWarning(data);
  if (!risk) return null;
  const saved = risk.eventId ? paymentReadiness(data, risk.eventId, simulation) : null;
  return (
    <section className="risk-action" aria-label="Upcoming financial risk">
      <div>
        <span className="risk-kicker">Something to plan for</span>
        <h2>
          {risk.commitment ? `Your ${new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(risk.date + "T00:00:00Z"))} ${/rent/i.test(risk.label) ? "rent" : risk.label} contribution may be at risk.` : `${risk.label} may leave you short on ${dateLabel(risk.date)}.`}
        </h2>
        {risk.shareCents !== null && <dl className="risk-figures">
          <div><dt>Your share</dt><dd>{formatCurrency(risk.shareCents)}</dd></div>
          <div><dt>Estimated available by {dateLabel(risk.date)}</dt><dd>{formatCurrency(risk.availableCents || 0)}</dd></div>
          <div><dt>Potential shortage</dt><dd>{formatCurrency(risk.shortfallCents)}</dd></div>
        </dl>}
        <p>{formatCurrency(risk.precedingExpensesCents)} in scheduled or estimated expenses falls before this payment.{risk.nextIncomeDate ? ` Your next expected income arrives ${dateLabel(risk.nextIncomeDate)}, after the deadline.` : ""} Estimates do not reserve funds or confirm payments.</p>
        {saved && saved.coveredCents !== risk.availableCents && <p><strong>Current what-if plan:</strong> {formatCurrency(saved.coveredCents)} estimated toward your share; {saved.shortfallCents === 0 ? "your contribution looks covered" : `${formatCurrency(saved.shortfallCents)} still to cover`}. Your original outlook and actual finances are unchanged.</p>}
      </div>
      <div className="risk-actions">
        <Link className="button button-primary" href={risk.href}>
          Find a way to cover the difference
        </Link>
        {risk.commitment && (
          <Link
            className="text-link"
            href={`/shared?commitment=${encodeURIComponent(risk.commitment)}`}
          >
            See shared expenses →
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
