"use client";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import { ForecastChart } from "@/components/forecast-chart";
import { useFinancial } from "@/components/financial-provider";
import {
  project,
  formatCurrency,
  liquidBalance,
  alertsFor,
  subscriptionsFor,
  forecastEvents,
} from "@/lib/analysis";
import { ExplanationPanel } from "@/components/explanation-panel";

export default function HomePage() {
  const { data, mode, customer: selected } = useFinancial();
  if (!data)
    return (
      <AegisShell title="Overview" subtitle="Financial command center">
        <p>Select a data source or retry loading records.</p>
      </AegisShell>
    );
  const forecast = project(data);
  const alerts = alertsFor(data);
  const recurring = subscriptionsFor(data);
  const customer =
    data.customers.find((c) => c.id === selected) || data.customers[0];
  const financialConnections = data.bills.map((b) => ({
    id: b.id,
    label: b.name,
    type: "Obligation to review",
    note: "Confirm ownership and payment access before a household transition. Shared ownership is not inferred.",
  }));
  const overviewCards = [
    {
      label: "Total available balance",
      value: formatCurrency(liquidBalance(data)),
      note: "Checking and savings; excludes card debt",
    },
    {
      label: "Upcoming obligations",
      value: formatCurrency(
        forecastEvents(data).reduce(
          (s, e) => s + Math.max(0, -e.amountCents),
          0,
        ),
      ),
      note: "Next 30 days, known and inferred",
    },
    {
      label: "Detected subscriptions",
      value: String(recurring.length),
      note: "Repeat-charge evidence",
    },
    {
      label: "Financial alerts",
      value: String(alerts.length),
      note: "Review flags, not fraud determinations",
    },
  ];

  return (
    <AegisShell title="Overview" subtitle="Financial command center">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Financial health
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {customer?.name || "No customer records"}
              </h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              {mode === "demo" ? "Fictional demo" : "Nessie sandbox records"}
            </span>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Projection as of {data.asOf}. The lowest estimated balance is{" "}
            {formatCurrency(forecast.lowestBalanceCents)} on{" "}
            {forecast.lowestBalanceDate}. Check expected income and obligations
            before making decisions.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Available
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatCurrency(liquidBalance(data))}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Lowest forecast
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatCurrency(forecast.lowestBalanceCents)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Projected gap
              </p>
              <p className="mt-2 text-xl font-semibold">
                {formatCurrency(forecast.shortfallAmountCents)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-50 shadow-sm">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-amber-300" />
            <p className="text-sm uppercase tracking-[0.2em] text-slate-300">
              Priority alerts
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-slate-700 bg-slate-800/80 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {alert.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      {alert.merchant}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-amber-300">
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  Confidence {alert.confidence}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Domino preview
              </p>
              <h3 className="mt-2 text-xl font-semibold">
                30-day balance projection
              </h3>
            </div>
            <Link
              href="/domino"
              className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"
            >
              Explore forecast <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="h-72">
            <ForecastChart
              points={forecast.points}
              height={260}
              color="#0f766e"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-700" />
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Protect
            </p>
          </div>
          <div className="mt-4 space-y-4">
            {recurring.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.merchant}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">
                    {item.confidence}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {formatCurrency(item.amountCents)} • {item.cadence}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/protect"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky-700"
          >
            Review subscriptions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Upcoming risks
            </p>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {forecast.contributingFactors.map((factor) => (
              <li
                key={factor}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                {factor}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Shared connections
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {financialConnections.map((connection) => (
              <div
                key={connection.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{connection.label}</p>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-700">
                    {connection.type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{connection.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Quick actions
          </p>
          <Link href="/settings" className="text-sm font-medium text-sky-700">
            Open settings
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Link
            href="/protect"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50"
          >
            Review subscriptions
          </Link>
          <Link
            href="/domino"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50"
          >
            Explore cash-flow forecast
          </Link>
          <Link
            href="/protect"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50"
          >
            Investigate unusual transaction
          </Link>
          <Link
            href="/deadbolt"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50"
          >
            Start financial separation plan
          </Link>
          <Link
            href="/credit"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50"
          >
            Review credit improvement
          </Link>
        </div>
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Accounts and loans</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.accounts.map((account) => (
            <div key={account.id} className="rounded-xl bg-slate-50 p-4">
              <p className="font-medium">{account.name}</p>
              <p className="text-sm">
                {account.type}: {formatCurrency(account.balanceCents)}
                {account.type === "Credit Card" ? " owed" : ""}
              </p>
            </div>
          ))}
        </div>
        {!data.accounts.length && (
          <p className="mt-3 text-sm">
            No accounts returned for this customer.
          </p>
        )}
        {data.loans.map((loan) => (
          <p key={loan.id} className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
            Loan amount: {formatCurrency(loan.amountCents)} · Monthly payment:{" "}
            {formatCurrency(loan.paymentCents)}. A dated obligation is needed
            for forecasting.
          </p>
        ))}
      </section>
      <ExplanationPanel />
    </AegisShell>
  );
}
