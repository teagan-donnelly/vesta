"use client";
import { useState } from "react";
import Link from "next/link";
import { AegisShell } from "./aegis-shell";
import { useFinancial, FinancialLoading } from "./financial-provider";
import {
  Amount,
  Badge,
  MetricGrid,
  Panel,
  Button,
  EmptyState,
  Notice,
} from "./ui";
import { RecordButton } from "./record-editor";
import { ExplanationPanel } from "./explanation-panel";
import { dateLabel } from "./activity-table";
import { subscriptionsFor, shift } from "@/lib/analysis";
import {
  monthlySubscriptionCost,
  annualSubscriptionCost,
} from "@/lib/financial-view";
import { applyPersonalRecords, type PersonalRecord } from "@/lib/management";
export function SubscriptionsPage() {
  const { data, records, recordsError, simulation, setSimulation, saveRecord } =
    useFinancial();
  const [filter, setFilter] = useState("active"),
    [error, setError] = useState("");
  if (!data)
    return (
      <AegisShell
        title="Subscriptions"
        planSection="spending"
        subtitle="Manage recurring services with a clearer view of their cost."
      >
        <FinancialLoading />
      </AegisShell>
    );
  const catalog = subscriptionsFor(
    applyPersonalRecords(
      data,
      records.map((r) =>
        r.kind === "subscription" ? { ...r, status: "active" } : r,
      ),
    ),
  );
  const canceled = new Set(data.canceledSubscriptionIds || []),
    active = catalog.filter((s) => !canceled.has(s.id));
  const rows = catalog.filter((s) =>
    filter === "canceled"
      ? canceled.has(s.id)
      : !canceled.has(s.id) &&
        (filter !== "upcoming" || s.nextChargeDate <= shift(data.asOf, 7)),
  );
  const monthly = monthlySubscriptionCost(active),
    removed = simulation.removedSubscriptions || [];
  return (
    <AegisShell
      title="Subscriptions"
      planSection="spending"
      subtitle="Manage recurring services with a clearer view of their cost."
      actions={<RecordButton kind="subscription" label="Add subscription" />}
    >
      <MetricGrid
        items={[
          {
            label: "Monthly recurring cost",
            value: <Amount cents={monthly} />,
            note: "Monthly equivalent of active tracked services",
          },
          {
            label: "Annualized cost",
            value: <Amount cents={annualSubscriptionCost(active)} />,
            note: "Estimated from current rates",
          },
          {
            label: "Active subscriptions",
            value: active.length,
            note: "Detected and manually tracked",
          },
          {
            label: "Scenario removals",
            value: removed.length,
            note: "Hypothetical; baseline remains unchanged",
          },
        ]}
      />
      {(error || recordsError) && (
        <Notice tone="caution">
          <p>
            {error || recordsError}{" "}
            <Link href="/settings">Review planning storage →</Link>
          </p>
        </Notice>
      )}
      <Panel
        className="section-gap"
        title="Your recurring services"
        action={
          <Link className="text-link" href="/plan?section=forecast">
            Compare your scenario →
          </Link>
        }
      >
        <div className="subscription-tabs">
          {["active", "upcoming", "canceled"].map((tab) => (
            <button
              key={tab}
              aria-pressed={filter === tab}
              onClick={() => setFilter(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
              {tab === "upcoming" ? " · next 7 days" : ""}
            </button>
          ))}
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Billing cycle</th>
                  <th>Next estimate</th>
                  <th>Status</th>
                  <th>Simulate removal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const record = records.find(
                    (r) =>
                      r.kind === "subscription" &&
                      (r.referenceId === s.id ||
                        `${r.accountId}:manual-${r.id}` === s.id),
                  );
                  const defaults: Partial<PersonalRecord> = {
                    label: s.merchant,
                    referenceId: s.id,
                    amountCents: s.amountCents,
                    cadence: s.cadence,
                    date: s.nextChargeDate,
                    accountId: s.id.slice(0, s.id.indexOf(":")),
                    status: canceled.has(s.id) ? "canceled" : "active",
                  };
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className="merchant-cell">
                          <span className="merchant-monogram">
                            {s.merchant[0]}
                          </span>
                          <strong>{s.merchant}</strong>
                        </span>
                        <span className="subtext">{s.confidence}</span>
                      </td>
                      <td>
                        <Amount cents={s.amountCents} />
                      </td>
                      <td>{s.cadence}</td>
                      <td>{dateLabel(s.nextChargeDate)}</td>
                      <td>
                        <Badge
                          tone={canceled.has(s.id) ? "neutral" : "positive"}
                        >
                          {canceled.has(s.id)
                            ? "Canceled in Vesta"
                            : "Active estimate"}
                        </Badge>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Simulate removing ${s.merchant}`}
                          checked={removed.includes(s.id)}
                          disabled={canceled.has(s.id)}
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
                        <details>
                          <summary>Manage</summary>
                          <div className="subscription-actions">
                            <RecordButton
                              kind="subscription"
                              record={record}
                              defaults={defaults}
                              label="Edit tracking"
                            />
                            <Button
                              variant="quiet"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    canceled.has(s.id)
                                      ? "Restore this service in Vesta’s estimates?"
                                      : "Mark canceled in Vesta only? This does not cancel the actual service.",
                                  )
                                )
                                  return;
                                setError("");
                                try {
                                  await saveRecord({
                                    ...defaults,
                                    ...record,
                                    id: record?.id || crypto.randomUUID(),
                                    kind: "subscription",
                                    label: s.merchant,
                                    status: canceled.has(s.id)
                                      ? "active"
                                      : "canceled",
                                  });
                                } catch {
                                  setError(
                                    "This tracking update was not saved.",
                                  );
                                }
                              }}
                            >
                              {canceled.has(s.id)
                                ? "Restore tracking"
                                : "Mark canceled"}
                            </Button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              filter === "canceled"
                ? "No services marked canceled"
                : "No matching subscriptions"
            }
            description="Repeated services are detected from available history. Rent, debt and utilities stay separate; you can add a manually tracked service."
          />
        )}
        <div className="panel-body">
          <p className="subtext">
            Marking canceled only changes your self-reported Vesta estimates. It
            does not cancel a provider service or erase scheduled bank payments.
          </p>
          <Link className="text-link" href="/transactions">
            Review transactions and activity alerts →
          </Link>
        </div>
      </Panel>
      <details className="secondary-details">
        <summary>Grounded financial explanations</summary>
        <ExplanationPanel scenario />
      </details>
    </AegisShell>
  );
}
