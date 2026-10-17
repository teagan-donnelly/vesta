"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import {
  useFinancial,
  FinancialLoading,
} from "@/components/financial-provider";
import { Panel, MetricGrid, Amount, Badge, Button } from "@/components/ui";
import { dateLabel } from "@/components/activity-table";
import { ForecastChart } from "@/components/forecast-chart";
import { ExplanationPanel } from "@/components/explanation-panel";
import {
  forecastEvents,
  formatCurrency,
  project,
  shift,
  subscriptionsFor,
  isIsoDate,
} from "@/lib/analysis";
import { affectedBalances, projectionSeries } from "@/lib/financial-view";
const inputCents = (value: string) =>
  Math.max(0, Math.min(100000000, Math.round((Number(value) || 0) * 100)));
export default function DominoPage() {
  const { data, simulation, setSimulation } = useFinancial();
  const [onlyAffected, setOnlyAffected] = useState(false);
  if (!data)
    return (
      <AegisShell
        title="Domino"
        subtitle="See the financial effect of a decision before you make it."
      >
        <FinancialLoading />
      </AegisShell>
    );
  const baseline = project(data);
  const scenario = project(data, simulation);
  const events = forecastEvents(data);
  const subs = subscriptionsFor(data);
  const removed = simulation.removedSubscriptions || [];
  const selected = subs.filter((s) => removed.includes(s.id));
  const target = events.find((e) => e.id === simulation.eventId);
  const changed = affectedBalances(baseline, scenario);
  const difference = scenario.endingBalanceCents - baseline.endingBalanceCents;
  const rows = baseline.points
    .map((point, index) => ({
      date: point.date,
      baseline: point.balanceCents,
      scenario: scenario.points[index].balanceCents,
      difference: scenario.points[index].balanceCents - point.balanceCents,
    }))
    .filter((row) => !onlyAffected || row.difference !== 0);
  const adjustments: string[] = [];
  if (selected.length)
    adjustments.push(
      `${selected.length} subscription${selected.length === 1 ? "" : "s"} removed from matching future charges`,
    );
  if (target && simulation.delayDays)
    adjustments.push(
      `${target.label} moved from ${dateLabel(target.date)} to ${dateLabel(shift(target.date, simulation.delayDays))}`,
    );
  if (target && target.amountCents < 0 && simulation.paymentCents !== undefined)
    adjustments.push(
      `${target.label} adjusted to ${formatCurrency(simulation.paymentCents)}`,
    );
  if (simulation.unexpectedCents && simulation.unexpectedDate)
    adjustments.push(
      `${formatCurrency(simulation.unexpectedCents)} expense added on ${dateLabel(simulation.unexpectedDate)}`,
    );
  const date = simulation.unexpectedDate || shift(data.asOf, 1);
  const dateValid =
    isIsoDate(date) && date > data.asOf && date <= baseline.endDate;
  return (
    <AegisShell
      title="Domino"
      subtitle="See the financial effect of a decision before you make it."
      actions={
        <Button variant="secondary" onClick={() => setSimulation({})}>
          <RotateCcw size={13} />
          Reset scenario
        </Button>
      }
    >
      <MetricGrid
        items={[
          {
            label: "Baseline ending balance",
            value: <Amount cents={baseline.endingBalanceCents} />,
            note: dateLabel(baseline.endDate, true),
          },
          {
            label: "Simulated ending balance",
            value: <Amount cents={scenario.endingBalanceCents} />,
            note: "Your selected changes only",
          },
          {
            label: "Change from baseline",
            value: <Amount cents={difference} signed />,
            note: changed.length
              ? `${changed.length} dates affected`
              : "No changes selected",
            tone:
              difference > 0
                ? "positive"
                : difference < 0
                  ? "negative"
                  : undefined,
          },
          {
            label: "Lowest simulated balance",
            value: <Amount cents={scenario.lowestBalanceCents} />,
            note: dateLabel(scenario.lowestBalanceDate, true),
            tone: scenario.lowestBalanceCents < 0 ? "negative" : undefined,
          },
        ]}
      />
      <div className="scenario-layout">
        <div className="section-stack">
          <Panel
            title="Your 30-day outlook"
            description="Two possibilities. One starting balance. A shared scale."
            action={<Badge>30 days</Badge>}
          >
            <div className="mini-metrics">
              <div>
                <span className="mini-label">Starting cash</span>
                <strong>
                  <Amount cents={baseline.startingBalanceCents} />
                </strong>
              </div>
              <div>
                <span className="mini-label">Baseline low</span>
                <strong
                  className={baseline.lowestBalanceCents < 0 ? "negative" : ""}
                >
                  <Amount cents={baseline.lowestBalanceCents} />
                </strong>
              </div>
            </div>
            <ForecastChart
              points={projectionSeries(baseline)}
              scenarioPoints={projectionSeries(scenario)}
              height={310}
            />
            <div className="forecast-caption">
              <span>
                {dateLabel(baseline.startDate)} –{" "}
                {dateLabel(baseline.endDate, true)}
              </span>
              <span>Red shading indicates a projected negative balance</span>
            </div>
            <div className="simulation-summary">
              {adjustments.length ? (
                <>
                  <strong style={{ color: "#344257", fontWeight: 500 }}>
                    What changed:{" "}
                  </strong>
                  {adjustments.join("; ")}.{" "}
                  {changed.length
                    ? `Balances first differ on ${dateLabel(changed[0].date)} and remain affected through ${dateLabel(changed.at(-1)!.date)}.`
                    : "These changes do not affect balances inside this forecast window."}
                </>
              ) : (
                "Choose a change in the simulation panel. Your baseline stays available for comparison, and no bank records are modified."
              )}
            </div>
          </Panel>
          <Panel
            title="Daily balance comparison"
            description="The exact values behind both chart lines."
            action={
              <label className="check-row" style={{ margin: 0, fontSize: 10 }}>
                <input
                  type="checkbox"
                  checked={onlyAffected}
                  onChange={(e) => setOnlyAffected(e.target.checked)}
                />
                Affected dates only
              </label>
            }
          >
            <div className="table-wrap" style={{ maxHeight: 310 }}>
              <table className="data-table">
                <caption className="sr-only">
                  Daily baseline and simulated cash balances in US dollars
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col" className="align-right">
                      Baseline
                    </th>
                    <th scope="col" className="align-right">
                      Simulation
                    </th>
                    <th scope="col" className="align-right">
                      Difference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.date}>
                      <td>{dateLabel(row.date)}</td>
                      <td className="align-right">
                        <Amount cents={row.baseline} />
                      </td>
                      <td className="align-right">
                        <Amount
                          cents={row.scenario}
                          className={row.scenario < 0 ? "negative" : ""}
                        />
                      </td>
                      <td className="align-right">
                        <Amount cents={row.difference} signed />
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          padding: 28,
                          color: "#5f6f85",
                        }}
                      >
                        No dates differ from the baseline.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
        <Panel
          title="Build a scenario"
          description="Hypothetical changes. No account actions."
          className="scenario-panel"
        >
          <div className="panel-body">
            <div className="control-group">
              <h3>Remove subscriptions</h3>
              {subs.length ? (
                subs.map((s) => (
                  <label key={s.id} className="check-row">
                    <input
                      type="checkbox"
                      aria-label={`Simulate removing ${s.merchant}`}
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
                    <div>
                      <strong>{s.merchant}</strong>
                      <span className="subtext">{s.cadence}</span>
                    </div>
                    <Amount cents={s.amountCents} />
                  </label>
                ))
              ) : (
                <p className="subtext">
                  No repeated subscription activity is available yet.
                </p>
              )}
              <Link href="/protect" className="text-link">
                Review in Protect <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="control-group">
              <h3>Change payment or income timing</h3>
              <label className="field">
                <span>Scheduled event</span>
                <select
                  value={simulation.eventId || ""}
                  onChange={(e) =>
                    setSimulation({
                      ...simulation,
                      eventId: e.target.value,
                      delayDays: 0,
                      paymentCents: undefined,
                    })
                  }
                >
                  <option value="">Choose a future event</option>
                  <optgroup label="Income">
                    {events
                      .filter((e) => e.amountCents > 0)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {dateLabel(e.date)} · {e.label} ·{" "}
                          {formatCurrency(e.amountCents)}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Payments">
                    {events
                      .filter((e) => e.amountCents < 0)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {dateLabel(e.date)} · {e.label} ·{" "}
                          {formatCurrency(-e.amountCents)}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </label>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <label className="field">
                  <span>
                    {target?.amountCents && target.amountCents > 0
                      ? "Delay income (days)"
                      : "Delay payment (days)"}
                  </span>
                  <input
                    aria-label="Delay selected event in days"
                    type="number"
                    min={0}
                    max={60}
                    step={1}
                    disabled={!target}
                    value={simulation.delayDays || 0}
                    onChange={(e) =>
                      setSimulation({
                        ...simulation,
                        delayDays: Math.max(
                          0,
                          Math.min(60, Math.round(Number(e.target.value) || 0)),
                        ),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Payment amount ($)</span>
                  <input
                    aria-label="Adjusted payment amount in dollars"
                    type="number"
                    min={0}
                    max={1000000}
                    step="0.01"
                    disabled={!target || target.amountCents >= 0}
                    value={
                      target && target.amountCents < 0
                        ? (simulation.paymentCents ??
                            Math.abs(target.amountCents)) / 100
                        : 0
                    }
                    onChange={(e) =>
                      setSimulation({
                        ...simulation,
                        paymentCents: inputCents(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="subtext" style={{ lineHeight: 1.7, marginTop: 10 }}>
                Delays move the same event once. Confirm payment terms before
                acting on an expense delay. An event moved past this window is
                excluded from its ending balance.
              </p>
            </div>
            <div className="control-group">
              <h3>Add an unexpected expense</h3>
              <label className="field">
                <span>Amount ($)</span>
                <input
                  aria-label="Unexpected expense in dollars"
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  value={(simulation.unexpectedCents || 0) / 100}
                  onChange={(e) =>
                    setSimulation({
                      ...simulation,
                      unexpectedCents: inputCents(e.target.value),
                      unexpectedDate: date,
                    })
                  }
                />
              </label>
              <label className="field" style={{ marginTop: 12 }}>
                <span>Expense date</span>
                <input
                  type="date"
                  min={shift(data.asOf, 1)}
                  max={baseline.endDate}
                  value={date}
                  aria-invalid={!dateValid}
                  onChange={(e) =>
                    setSimulation({
                      ...simulation,
                      unexpectedDate: e.target.value,
                    })
                  }
                />
                {!dateValid && (
                  <small className="negative">
                    Choose a date within the forecast window.
                  </small>
                )}
              </label>
            </div>
            <p
              className="subtext"
              style={{ fontSize: 10, marginTop: 16, lineHeight: 1.8 }}
            >
              Estimates use known bills and repeated activity. Everyday
              discretionary spending is excluded. This simulation is not a
              payment or cancellation.
            </p>
          </div>
        </Panel>
      </div>
      <ExplanationPanel scenario />
    </AegisShell>
  );
}
