"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  CreditCard,
  PiggyBank,
  Sparkles,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { AegisShell } from "./aegis-shell";
import { useFinancial, FinancialLoading } from "./financial-provider";
import { Amount, Panel, EmptyState, Badge } from "./ui";
import { AllocationChart } from "./record-charts";
import { dateLabel } from "./activity-table";
import { FinancialRisk } from "./financial-risk";
import { ExplanationPanel } from "./explanation-panel";
import {
  formatCurrency,
  alertsFor,
  forecastEvents,
  liquidBalance,
  project,
} from "@/lib/analysis";
import {
  financialTotals,
  spendingCategories,
} from "@/lib/management";
import { HomeGroupHealth } from "./group-health";
import { HomeHistoryChart } from "./home-history-chart";
import { historyView } from "@/lib/history-view";
export function Dashboard() {
  const { data, recordsError } = useFinancial();
  const [chart, setChart] = useState("balance");
  const [days, setDays] = useState(30);
  if (!data)
    return (
      <AegisShell title="Home" subtitle="Your financial future, protected.">
        <FinancialLoading />
      </AegisShell>
    );
  const name =
    data.customers.find((c) => c.id === data.accounts[0]?.customerId)?.name ||
    "your workspace";
  const totals = financialTotals(data),
    forecast = project(data),
    alerts = alertsFor(data);
  const obligations = forecastEvents(data).filter(
    (event) => event.amountCents < 0,
  );
  const history = historyView(data, days);
  const cards = [
    {
      label: "Total available balance",
      value: liquidBalance(data),
      icon: Wallet,
      note: data.source === "demo" ? "Fictional checking snapshot" : "Reported checking & savings",
    },
    {
      label: "Monthly income",
      value: totals.income,
      icon: TrendingUp,
      note: "Recorded income · month to date",
    },
    {
      label: "Monthly spending",
      value: totals.spending,
      icon: CreditCard,
      note: "Recorded expenses · month to date",
    },
    {
      label: "Net cash flow this month",
      value: totals.savings,
      icon: PiggyBank,
      note: "Income less recorded spending; not money set aside",
    },
  ];
  return (
    <AegisShell title="Home" subtitle="Your financial future, protected.">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">FINANCIAL ACCOUNTABILITY WITHOUT FINANCIAL SURVEILLANCE</span>
          <h1>
            Good to see you, <em>{name}.</em>
          </h1>
          <p>Your financial future, protected.</p>
        </div>
      </section>
      <div className="dashboard-metrics">
        {cards.map(({ label, value, icon: Icon, note }) => (
          <section key={label} className="summary-tile">
            <span className="tile-icon">
              <Icon size={25} strokeWidth={1.7} />
            </span>
            <div>
              <p>{label}</p>
              <strong>
                <Amount cents={value} />
              </strong>
              <span className="subtext">{note}</span>
            </div>
          </section>
        ))}
      </div>
      <div className="overview-main">
        <Panel
          title="Financial overview"
          description="A clear view of the records behind your finances."
          action={
            <div className="segment-control">
              <button
                aria-pressed={chart === "balance"}
                onClick={() => setChart("balance")}
              >
                Balance
              </button>
              <button
                aria-pressed={chart === "expenses"}
                onClick={() => setChart("expenses")}
              >
                Expenses
              </button>
            </div>
          }
        >
          <div className="overview-chart-label">
            <CalendarDays size={16} />
            <span>
              {dateLabel(history.start)} – {dateLabel(history.end, true)}
            </span>
            <Badge>Historical · daily records</Badge>
            <select aria-label="History date range" value={days} onChange={e => setDays(Number(e.target.value))}>{[7,30,60].map(n => <option value={n} key={n}>Last {n} Days</option>)}</select>
          </div>
          {chart === "balance" && history.balances.length ? (
            <HomeHistoryChart data={data} days={days} expenses={false} />
          ) : chart === "expenses" ? (
            data.transactions.some(
              (t) => !t.pending && t.date >= history.start && t.date <= history.end && t.amountCents < 0,
            ) ? (
              <HomeHistoryChart data={data} days={days} expenses />
            ) : (
              <div className="chart-placeholder">
                <EmptyState
                  title="Your spending story starts here"
                  description="No completed spending was returned for this selected date range. Available records will appear here without invented activity."
                  action={
                    <Link className="text-link" href="/transactions">
                      View or track transactions →
                    </Link>
                  }
                />
              </div>
            )
          ) : (
            <div className="chart-placeholder">
              <span className="current-balance">
                <Amount cents={liquidBalance(data)} />
              </span>
              <EmptyState
                title="Current balance, with clarity"
                description="Your source provides the current balance but no verified balance history. Vesta does not reconstruct or invent past bank balances."
                action={
                  <Link
                    className="button button-secondary"
                    href="/plan?section=forecast"
                  >
                    Explore your 30-day forecast <ArrowRight size={15} />
                  </Link>
                }
              />
            </div>
          )}
          <div className="forecast-caption">
            <span>
              {chart === "expenses" ? `${formatCurrency(history.spendingCents)} recorded spending in this ${days}-day window.` : "Historical closing cash, not a future prediction."} Future balances are shown in Plan Ahead.
            </span>
            <Link href="/transactions" className="text-link">
              Explore activity →
            </Link>
          </div>
        </Panel>
        <Panel
          title="AI financial assistant"
          className="insight-card"
          action={<Sparkles color="#c78b30" size={23} />}
        >
          <div className="assistant-summary">
            <span className="insight-spark">✦</span>
            <p>
              {forecast.shortfallAmountCents > 0 ? (
                <>
                  Your upcoming payments could leave a{" "}
                  <Amount cents={forecast.shortfallAmountCents} /> shortfall.
                  Test a change before {dateLabel(forecast.lowestBalanceDate)}.
                </>
              ) : (
                <>
                  Your lowest projected balance is{" "}
                  <Amount cents={forecast.lowestBalanceCents} />. Leave room for
                  expenses that are not included in this estimate.
                </>
              )}
            </p>
          </div>
          <p className="subtext panel-body">
            {data.warnings.some((w) =>
              w.startsWith("Shared planning is not included"),
            )
              ? "Shared planning is not connected; this outlook is incomplete."
              : "Grounded in Vesta’s deterministic calculations. No AI-generated balances."}
          </p>
          <div className="insight-actions">
            <Link className="button button-primary" href="/assistant">
              Ask Vesta
            </Link>
            <Link
              className="button button-secondary"
              href="/plan?section=forecast"
            >
              Explore changes
            </Link>
          </div>
          <details className="panel-body">
            <summary>Understand this insight</summary>
            <ExplanationPanel />
          </details>
        </Panel>
      </div>
      <div className="overview-bottom">
        <Panel
          title="Recent transactions"
          action={
            <Link className="text-link" href="/transactions">
              View all →
            </Link>
          }
        >
          {data.transactions.some(
            (transaction) => transaction.date <= data.asOf,
          ) ? (
            <div className="table-wrap recent-table">
              <table className="data-table">
                <caption className="sr-only">
                  Recent recorded transactions
                </caption>
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions
                    .filter((transaction) => transaction.date <= data.asOf)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 5)
                    .map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <strong>{transaction.merchant}</strong>
                          <span className="subtext">
                            {transaction.provenance === "manual"
                              ? "Manual Vesta entry"
                              : data.source === "nessie"
                                ? "Retrieved Nessie sandbox"
                                : "Fictional demo"}
                          </span>
                        </td>
                        <td>{transaction.category}</td>
                        <td>
                          <Amount cents={transaction.amountCents} signed />
                        </td>
                        <td>{dateLabel(transaction.date)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No completed activity yet"
              description="Transactions appear here when records are available from your selected source."
            />
          )}
        </Panel>
        <Panel
          title="Top spending categories"
          action={
            <Link className="text-link" href="/plan?section=budget">
              Budgets →
            </Link>
          }
        >
          <AllocationChart
            items={spendingCategories(data)}
            label="Total spent"
          />
        </Panel>
        <Panel
          title="Upcoming bills"
          action={
            <Link className="text-link" href="/plan?section=forecast">
              View all →
            </Link>
          }
        >
          {obligations.length ? (
            obligations.slice(0, 4).map((event) => (
              <Link
                href="/plan?section=forecast"
                className="bill-line"
                key={event.id + event.date}
              >
                <span className="merchant-monogram">{event.label[0]}</span>
                <span>
                  <strong>{event.label}</strong>
                  <small>
                    {dateLabel(event.date)} ·{" "}
                    {event.id.startsWith("bill:") ? "Scheduled" : "Estimated"}
                  </small>
                </span>
                <Amount cents={-event.amountCents} />
              </Link>
            ))
          ) : (
            <EmptyState
              title="No scheduled payments returned"
              description="Missing bills are never replaced with illustrative payments."
            />
          )}
        </Panel>
      </div>
      <FinancialRisk />
      <div className="dashboard-links">
        <Link href="/shared">
          Shared Finances <ArrowRight size={16} />
        </Link>
        <Link href="/continuity">
          Emergency Planning <ArrowRight size={16} />
        </Link>
        <Link href="/transactions">
          Financial alerts{" "}
          <Badge tone={alerts.length ? "caution" : "neutral"}>
            {alerts.length}
          </Badge>
        </Link>
      </div>
      <details className="secondary-details">
        <summary>Your accounts & data coverage</summary>
        {data.accounts.map((account) => (
          <div className="structured-row" key={account.id}>
            <span>
              {account.name}
              <small className="subtext">
                {account.institution} · {account.type}
              </small>
            </span>
            <Amount cents={account.balanceCents} />
          </div>
        ))}
        {data.warnings.map((warning, i) => (
          <p className="subtext" key={i}>
            {warning}
          </p>
        ))}
        {recordsError && (
          <p className="subtext">
            {recordsError} <Link href="/settings">Review storage →</Link>
          </p>
        )}
      </details>
      <HomeGroupHealth />
    </AegisShell>
  );
}
