"use client";
import Link from "next/link";
import { AegisShell } from "@/components/aegis-shell";
import { ForecastChart } from "@/components/forecast-chart";
import { ExplanationPanel } from "@/components/explanation-panel";
import { useFinancial } from "@/components/financial-provider";
import {
  forecastEvents,
  formatCurrency,
  project,
  shift,
  subscriptionsFor,
} from "@/lib/analysis";
const moneyInput = (value: string) =>
  Math.max(0, Math.min(100000000, Math.round((Number(value) || 0) * 100)));
export default function DominoPage() {
  const { data, simulation, setSimulation } = useFinancial();
  const baseline = data ? project(data) : null;
  const scenario = data ? project(data, simulation) : null;
  const events = data ? forecastEvents(data) : [];
  const subs = data ? subscriptionsFor(data) : [];
  const target = events.find((e) => e.id === simulation.eventId);
  const changed =
    baseline?.points.filter(
      (p, i) => p.balanceCents !== scenario?.points[i].balanceCents,
    ) || [];
  return (
    <AegisShell
      title="Domino"
      subtitle="Deterministic forecasting and scenario simulation for cash-flow decisions."
    >
      {data && baseline && scenario && (
        <>
          <p className="mb-4 text-sm text-slate-600">
            As of {data.asOf}. All simulations stay in this session and never
            change Nessie records.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["Baseline ending balance", baseline.endingBalanceCents],
              ["Scenario ending balance", scenario.endingBalanceCents],
              [
                "Change from baseline",
                scenario.endingBalanceCents - baseline.endingBalanceCents,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatCurrency(Number(value))}
                </p>
              </div>
            ))}
          </div>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold">Scenario simulator</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="font-medium">Subscription removal</h3>
                {subs.map((s) => (
                  <label className="mt-3 block" key={s.id}>
                    <input
                      type="checkbox"
                      checked={
                        simulation.removedSubscriptions?.includes(s.id) || false
                      }
                      onChange={(e) => {
                        const removed = simulation.removedSubscriptions || [];
                        setSimulation({
                          ...simulation,
                          removedSubscriptions: e.target.checked
                            ? [...removed, s.id]
                            : removed.filter((k) => k !== s.id),
                        });
                      }}
                    />{" "}
                    {s.merchant} · {formatCurrency(s.amountCents)}
                  </label>
                ))}
                {!subs.length && (
                  <p className="text-sm">No detected subscription patterns.</p>
                )}
                <Link
                  className="mt-3 block text-sky-700 underline"
                  href="/protect"
                >
                  Review in Protect
                </Link>
              </div>
              <div className="space-y-3">
                <label className="block">
                  Payment or income to adjust
                  <select
                    className="mt-1 block w-full rounded border p-2"
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
                    {events.map((e) => (
                      <option value={e.id} key={e.id}>
                        {e.date} · {e.label} · {formatCurrency(e.amountCents)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  Delay selected event (days)
                  <input
                    className="ml-3 w-24 rounded border p-2"
                    type="number"
                    min="0"
                    max="60"
                    disabled={!target}
                    value={simulation.delayDays || 0}
                    onChange={(e) =>
                      setSimulation({
                        ...simulation,
                        delayDays: Math.min(
                          60,
                          Math.max(0, Math.round(Number(e.target.value) || 0)),
                        ),
                      })
                    }
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Delays move the same event; income is never duplicated. Delay
                  expenses only after confirming terms with the provider.
                </p>
                {target && target.amountCents < 0 && (
                  <label className="block">
                    Adjusted payment ($)
                    <input
                      className="ml-3 w-32 rounded border p-2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        (simulation.paymentCents ??
                          Math.abs(target.amountCents)) / 100
                      }
                      onChange={(e) =>
                        setSimulation({
                          ...simulation,
                          paymentCents: moneyInput(e.target.value),
                        })
                      }
                    />
                  </label>
                )}
                <label className="block">
                  Unexpected expense ($)
                  <input
                    className="ml-3 w-32 rounded border p-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={(simulation.unexpectedCents || 0) / 100}
                    onChange={(e) =>
                      setSimulation({
                        ...simulation,
                        unexpectedCents: moneyInput(e.target.value),
                        unexpectedDate:
                          simulation.unexpectedDate || shift(data.asOf, 1),
                      })
                    }
                  />
                </label>
                <label className="block">
                  Expense date
                  <input
                    className="ml-3 rounded border p-2"
                    type="date"
                    min={shift(data.asOf, 1)}
                    max={baseline.endDate}
                    value={simulation.unexpectedDate || shift(data.asOf, 1)}
                    onChange={(e) =>
                      setSimulation({
                        ...simulation,
                        unexpectedDate: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </div>
            <button
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-white"
              onClick={() => setSimulation({})}
            >
              Reset to baseline
            </button>
          </section>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold">30-day comparison</h2>
            <p className="mt-2 text-sm">
              Baseline lowest: {formatCurrency(baseline.lowestBalanceCents)} on{" "}
              {baseline.lowestBalanceDate}. Scenario lowest:{" "}
              {formatCurrency(scenario.lowestBalanceCents)} on{" "}
              {scenario.lowestBalanceDate}.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3>Baseline</h3>
                <ForecastChart points={baseline.points} />
              </div>
              <div>
                <h3>Scenario</h3>
                <ForecastChart points={scenario.points} color="#0284c7" />
              </div>
            </div>
            <p className="mt-3 text-sm">
              {changed.length
                ? `Balances differ on ${changed.length} dates, from ${changed[0].date} through ${changed.at(-1)!.date}.`
                : "No changes to the baseline yet."}
            </p>
            <div className="mt-4 max-h-72 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Affected date</th>
                    <th className="p-2">Baseline</th>
                    <th className="p-2">Scenario</th>
                    <th className="p-2">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {changed.map((p) => {
                    const s = scenario.points.find((s) => s.date === p.date)!;
                    return (
                      <tr key={p.date}>
                        <td className="p-2">{p.date}</td>
                        <td className="p-2">
                          {formatCurrency(p.balanceCents)}
                        </td>
                        <td className="p-2">
                          {formatCurrency(s.balanceCents)}
                        </td>
                        <td className="p-2">
                          {formatCurrency(s.balanceCents - p.balanceCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <ExplanationPanel />
        </>
      )}
    </AegisShell>
  );
}
