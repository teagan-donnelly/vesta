"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import {
  useFinancial,
  FinancialLoading,
} from "@/components/financial-provider";
import { Panel, MetricGrid, Amount, Badge, EmptyState } from "@/components/ui";
import { ActivityTable, dateLabel } from "@/components/activity-table";
import { ExplanationPanel } from "@/components/explanation-panel";
import {
  alertsFor,
  forecastEvents,
  formatCurrency,
  subscriptionsFor,
} from "@/lib/analysis";
import { monthlySubscriptionCost } from "@/lib/financial-view";
export default function ProtectPage() {
  const { data, simulation, setSimulation } = useFinancial();
  const [tab, setTab] = useState<"subscriptions" | "activity">("subscriptions");
  if (!data)
    return (
      <AegisShell
        title="Protect"
        subtitle="Understand recurring costs. Review the activity that stands out."
      >
        <FinancialLoading />
      </AegisShell>
    );
  const subscriptions = subscriptionsFor(data);
  const alerts = alertsFor(data);
  const removed = simulation.removedSubscriptions || [];
  const selected = subscriptions.filter((s) => removed.includes(s.id));
  const nextCharges = forecastEvents(data).filter(
    (e) => e.kind === "subscription",
  );
  return (
    <AegisShell
      title="Protect"
      subtitle="Understand recurring costs. Review the activity that stands out."
      actions={
        <Link href="/domino" className="button button-primary">
          Open Domino <ArrowUpRight size={13} />
        </Link>
      }
    >
      <MetricGrid
        items={[
          {
            label: "Monthly recurring services",
            value: <Amount cents={monthlySubscriptionCost(subscriptions)} />,
            note: "Monthly equivalent of detected subscriptions",
          },
          {
            label: "Detected subscriptions",
            value: subscriptions.length,
            note: "Rent, utility bills, and debt excluded",
          },
          {
            label: "Activity to review",
            value: alerts.length,
            note: "Review signals, not fraud determinations",
          },
          {
            label: "Selected for simulation",
            value: selected.length,
            note: `${formatCurrency(monthlySubscriptionCost(selected))} in monthly equivalent costs`,
          },
        ]}
      />
      <div className="dashboard-grid">
        <Panel
          title="Recurring expenses"
          description="Select a service to see its effect on your future cash balance."
        >
          <div
            className="tab-bar"
            role="tablist"
            aria-label="Financial activity"
          >
            <button
              id="subscriptions-tab"
              role="tab"
              aria-selected={tab === "subscriptions"}
              aria-controls="protect-records"
              onClick={() => setTab("subscriptions")}
            >
              Subscriptions
            </button>
            <button
              id="activity-tab"
              role="tab"
              aria-selected={tab === "activity"}
              aria-controls="protect-records"
              onClick={() => setTab("activity")}
            >
              All activity
            </button>
          </div>
          <div
            id="protect-records"
            role="tabpanel"
            aria-labelledby={
              tab === "subscriptions" ? "subscriptions-tab" : "activity-tab"
            }
          >
            {tab === "activity" ? (
              <div style={{ paddingTop: 16 }}>
                <ActivityTable data={data} limit={15} filterable />
              </div>
            ) : subscriptions.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <caption className="sr-only">
                    Select recurring subscriptions to remove in a hypothetical
                    Domino forecast
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Simulate</th>
                      <th scope="col">Service</th>
                      <th scope="col">Frequency</th>
                      <th scope="col">Next estimate</th>
                      <th scope="col" className="align-right">
                        Charge
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <input
                            aria-label={`Simulate removing ${s.merchant}`}
                            type="checkbox"
                            checked={removed.includes(s.id)}
                            onChange={(e) =>
                              setSimulation({
                                ...simulation,
                                removedSubscriptions: e.target.checked
                                  ? [...removed, s.id]
                                  : removed.filter((id) => id !== s.id),
                              })
                            }
                          />
                        </td>
                        <td>
                          <strong style={{ fontWeight: 500 }}>
                            {s.merchant}
                          </strong>
                          <span className="subtext">{s.confidence}</span>
                        </td>
                        <td>{s.cadence}</td>
                        <td>{dateLabel(s.nextChargeDate)}</td>
                        <td className="align-right">
                          <Amount cents={s.amountCents} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No subscription patterns yet"
                description="Vesta needs repeated subscription activity to identify a pattern. Regular rent and debt payments are treated separately."
              />
            )}
          </div>
          {!!selected.length && (
            <div className="selection-bar">
              <span>
                {selected.length} service{selected.length === 1 ? "" : "s"}{" "}
                selected ·{" "}
                {formatCurrency(
                  nextCharges
                    .filter((e) =>
                      selected.some(
                        (s) => s.id === `${e.accountId}:${e.merchantKey}`,
                      ),
                    )
                    .reduce((sum, e) => sum - e.amountCents, 0),
                )}{" "}
                in forecast charges
              </span>
              <Link href="/domino" className="text-link">
                Compare in Domino <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
        </Panel>
        <Panel
          title="Activity review"
          description="Signals worth checking against your receipts."
          action={
            <Badge tone={alerts.length ? "caution" : "neutral"}>
              {alerts.length} flags
            </Badge>
          }
        >
          {!alerts.length ? (
            <EmptyState
              title="Nothing flagged for review"
              description="No activity meets the current rules. Limited transaction history can make unusual patterns harder to identify."
            />
          ) : (
            <div className="insight-list">
              {alerts.map((alert) => (
                <article key={alert.id} className="insight-row">
                  <div className="insight-meta">
                    <Badge tone="caution">Review</Badge>
                    <span>{dateLabel(alert.date)}</span>
                  </div>
                  <h3>
                    {alert.merchant}{" "}
                    <span style={{ float: "right" }}>
                      <Amount cents={alert.amountCents} />
                    </span>
                  </h3>
                  <p>{alert.reason}</p>
                  {alert.evidence.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                  <p>
                    <strong>Next step:</strong> Compare with your receipt and
                    confirm the charge with your financial institution if it is
                    unfamiliar.
                  </p>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <ExplanationPanel />
    </AegisShell>
  );
}
