"use client";
import Link from "next/link";
import { AegisShell } from "@/components/aegis-shell";
import { useFinancial } from "@/components/financial-provider";
import { ExplanationPanel } from "@/components/explanation-panel";
import {
  alertsFor,
  classify,
  formatCurrency,
  subscriptionsFor,
} from "@/lib/analysis";
export default function ProtectPage() {
  const { data, simulation, setSimulation } = useFinancial();
  const subs = data ? subscriptionsFor(data) : [];
  const alerts = data ? alertsFor(data) : [];
  return (
    <AegisShell
      title="Protect"
      subtitle="Recurring charge intelligence and suspicious activity review."
    >
      {data && (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Subscriptions</h2>
              <p className="mt-2 text-sm text-slate-600">
                Rent, debt payments and recurring bills are separate
                obligations. Select subscriptions to remove from simulated
                future charges.
              </p>
              {!subs.length && (
                <p className="mt-4">
                  No supported subscription patterns found. More transaction
                  history may be needed.
                </p>
              )}
              <div className="mt-4 space-y-3">
                {subs.map((s) => (
                  <label
                    key={s.id}
                    className="block rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
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
                    <span className="font-medium">
                      Simulate removing {s.merchant}
                    </span>
                    <p className="mt-2 text-sm">
                      {formatCurrency(s.amountCents)} · {s.cadence} ·{" "}
                      {s.confidence}
                    </p>
                    <p className="text-xs text-slate-500">
                      Last {s.lastChargeDate} · Next estimated{" "}
                      {s.nextChargeDate}
                    </p>
                  </label>
                ))}
              </div>
              <Link
                className="mt-4 inline-block text-sky-700 underline"
                href="/domino"
              >
                Compare selected removals in Domino
              </Link>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Suspicious activity</h2>
              <p className="mt-2 text-sm text-slate-600">
                Flags invite review and do not establish fraud.
              </p>
              {!alerts.length && (
                <p className="mt-4">
                  No transactions meet the current review rules.
                </p>
              )}
              <div className="mt-4 space-y-3">
                {alerts.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-xl border border-orange-200 bg-orange-50 p-4"
                  >
                    <h3 className="font-medium">
                      {a.title}: {a.merchant}
                    </h3>
                    <p className="mt-2">
                      {formatCurrency(a.amountCents)} · {a.date}
                    </p>
                    <p className="mt-2 text-sm">{a.reason}</p>
                    {a.evidence.map((e) => (
                      <p key={e} className="mt-1 text-xs">
                        {e}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
            </section>
          </div>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold">
              Transaction classifications
            </h2>
            <div className="mt-4 max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Merchant</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="p-2">{t.date}</td>
                      <td className="p-2">
                        {t.merchant}
                        {t.pending ? " (pending)" : ""}
                      </td>
                      <td className="p-2">{classify(t)}</td>
                      <td className="p-2">{formatCurrency(t.amountCents)}</td>
                    </tr>
                  ))}
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
