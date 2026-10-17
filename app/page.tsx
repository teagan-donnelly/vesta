"use client";
import Link from "next/link";
import { ArrowUpRight, WalletCards, ArrowRight } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import {
  useFinancial,
  FinancialLoading,
} from "@/components/financial-provider";
import { Panel, Amount, Badge, EmptyState } from "@/components/ui";
import { ActivityTable, dateLabel } from "@/components/activity-table";
import { ForecastChart } from "@/components/forecast-chart";
import { ExplanationPanel } from "@/components/explanation-panel";
import {
  alertsFor,
  forecastEvents,
  formatCurrency,
  liquidBalance,
  project,
  subscriptionsFor,
} from "@/lib/analysis";
import {
  monthlySubscriptionCost,
  projectionSeries,
} from "@/lib/financial-view";
export default function HomePage() {
  const { data } = useFinancial();
  if (!data)
    return (
      <AegisShell
        title="Overview"
        subtitle="Balances, upcoming payments, and your 30-day cash outlook."
      >
        <FinancialLoading />
      </AegisShell>
    );
  const forecast = project(data);
  const events = forecastEvents(data);
  const obligations = events.filter((e) => e.amountCents < 0);
  const alerts = alertsFor(data);
  const subscriptions = subscriptionsFor(data);
  const checking = data.accounts
    .filter((a) => a.type === "Checking")
    .reduce((s, a) => s + a.balanceCents, 0);
  const savings = data.accounts
    .filter((a) => a.type === "Savings")
    .reduce((s, a) => s + a.balanceCents, 0);
  return (
    <AegisShell
      title="Overview"
      subtitle="Balances, upcoming payments, and your 30-day cash outlook."
      actions={
        <Link className="button button-secondary" href="/domino">
          Run a scenario <ArrowUpRight size={13} />
        </Link>
      }
    >
      <section
        className="balance-overview"
        aria-label="Your financial position"
      >
        <div className="balance-primary">
          <p className="balance-label">Available balance</p>
          <div className="balance-value">
            <Amount cents={liquidBalance(data)} />
          </div>
          <p className="balance-description">
            Across your checking and savings accounts
          </p>
          <dl className="balance-breakdown">
            <div>
              <dt>Checking</dt>
              <dd>
                <Amount cents={checking} />
              </dd>
            </div>
            <div>
              <dt>Savings</dt>
              <dd>
                <Amount cents={savings} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="balance-outlook">
          <div className="outlook-row">
            <div>
              <p className="balance-label">Upcoming obligations</p>
              <span className="subtext">
                Known and estimated · next 30 days
              </span>
            </div>
            <strong>
              <Amount
                cents={obligations.reduce((s, e) => s - e.amountCents, 0)}
              />
            </strong>
          </div>
          <div className="outlook-row">
            <div>
              <p className="balance-label">Lowest projected balance</p>
              <span className="subtext">
                {dateLabel(forecast.lowestBalanceDate, true)}
              </span>
            </div>
            <strong
              className={forecast.lowestBalanceCents < 0 ? "negative" : ""}
            >
              <Amount cents={forecast.lowestBalanceCents} />
            </strong>
          </div>
          <Link href="/protect" className="subscription-summary">
            <span>
              {subscriptions.length} recurring services ·{" "}
              <Amount cents={monthlySubscriptionCost(subscriptions)} /> / month
            </span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <div className="dashboard-grid">
        <Panel
          title="Cash outlook"
          description="Where your available cash could go over the next 30 days."
          action={
            <Link href="/domino" className="text-link">
              Explore Domino <ArrowUpRight size={13} />
            </Link>
          }
        >
          <div className="mini-metrics">
            <div>
              <span className="mini-label">Projected ending balance</span>
              <strong>
                <Amount cents={forecast.endingBalanceCents} />
              </strong>
            </div>
            <div>
              <span className="mini-label">Projected shortfall</span>
              <strong
                className={forecast.shortfallAmountCents ? "negative" : ""}
              >
                <Amount cents={forecast.shortfallAmountCents} />
              </strong>
            </div>
          </div>
          <ForecastChart points={projectionSeries(forecast)} height={360} />
          <div className="forecast-caption">
            <span>Known bills and inferred recurring cash activity</span>
            <span>Everyday discretionary spending excluded</span>
          </div>
        </Panel>
        <Panel
          title="Your accounts"
          description="Balances from the selected financial profile."
        >
          {data.accounts.length ? (
            data.accounts.map((account) => (
              <div className="account-row" key={account.id}>
                <div className="account-info">
                  <span className="account-type">
                    <WalletCards size={14} />
                  </span>
                  <div>
                    <strong>{account.name}</strong>
                    <span className="subtext">
                      {account.type}
                      {account.type === "Credit Card" ? " · Amount owed" : ""}
                    </span>
                  </div>
                </div>
                <Amount cents={account.balanceCents} />
              </div>
            ))
          ) : (
            <EmptyState
              title="No accounts found"
              description="No account records were returned for this profile."
            />
          )}
          <div className="account-total">
            <span>Available checking & savings</span>
            <Amount cents={liquidBalance(data)} />
          </div>
          {!!data.loans.length && (
            <div className="panel-body" style={{ paddingTop: 12 }}>
              {data.loans.map((l) => (
                <p className="subtext" key={l.id}>
                  Loan: {formatCurrency(l.amountCents)} ·{" "}
                  {formatCurrency(l.paymentCents)} monthly payment. Review its
                  due date before forecasting.
                </p>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Recent activity"
          description="A closer look at the records behind your balance."
          action={
            <Link href="/protect" className="text-link">
              Review activity <ArrowUpRight size={13} />
            </Link>
          }
        >
          <ActivityTable data={data} />
        </Panel>
        <div className="section-stack">
          <Panel title="Upcoming payments" action={<Badge>Next 30 days</Badge>}>
            {obligations.length ? (
              obligations.slice(0, 5).map((e) => (
                <div className="structured-row" key={`${e.id}:${e.date}`}>
                  <div>
                    <strong style={{ fontSize: 14, fontWeight: 500 }}>
                      {e.label}
                    </strong>
                    <span className="subtext">
                      {dateLabel(e.date)} ·{" "}
                      {e.id.startsWith("bill:")
                        ? "Scheduled"
                        : "Estimated recurring"}
                    </span>
                  </div>
                  <Amount cents={-e.amountCents} />
                </div>
              ))
            ) : (
              <EmptyState
                title="No upcoming payments returned"
                description="Your projection stays flat until scheduled bills or recurring history are available."
              />
            )}
          </Panel>
          <Panel
            title="Worth your attention"
            action={
              <Badge
                tone={
                  alerts.length || forecast.shortfallAmountCents
                    ? "caution"
                    : "neutral"
                }
              >
                {alerts.length + (forecast.shortfallAmountCents ? 1 : 0)} items
              </Badge>
            }
          >
            <div className="insight-list">
              {forecast.shortfallAmountCents > 0 && (
                <article className="insight-row risk-rule">
                  <div className="insight-meta">
                    <Badge tone="risk">Cash-flow risk</Badge>
                    <span>{dateLabel(forecast.lowestBalanceDate)}</span>
                  </div>
                  <h3>Payments could push your balance below zero</h3>
                  <p>
                    Your projected low is{" "}
                    {formatCurrency(forecast.lowestBalanceCents)}. Compare
                    payment timing and subscription changes before this date.
                  </p>
                  <Link href="/domino" className="text-link">
                    Compare your options <ArrowRight size={12} />
                  </Link>
                </article>
              )}
              {alerts.slice(0, 2).map((alert) => (
                <article className="insight-row" key={alert.id}>
                  <div className="insight-meta">
                    <span>{dateLabel(alert.date)}</span>
                    <Amount cents={alert.amountCents} />
                  </div>
                  <h3>{alert.merchant}</h3>
                  <p>{alert.reason}</p>
                  <Link href="/protect" className="text-link">
                    Review this activity <ArrowRight size={12} />
                  </Link>
                </article>
              ))}
              {!alerts.length && !forecast.shortfallAmountCents && (
                <article className="insight-row">
                  <h3>No current review flags</h3>
                  <p>
                    {data.transactions.length
                      ? "No retrieved activity meets the current review rules. Keep checking statements for anything unfamiliar."
                      : "There is not enough activity to assess spending patterns yet. Your forecast reflects only available records."}
                  </p>
                </article>
              )}
            </div>
          </Panel>
        </div>
      </div>
      <ExplanationPanel />
    </AegisShell>
  );
}
