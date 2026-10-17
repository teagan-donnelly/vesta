"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import {
  useFinancial,
  FinancialLoading,
} from "@/components/financial-provider";
import {
  Panel,
  MetricGrid,
  Amount,
  Badge,
  Notice,
  EmptyState,
} from "@/components/ui";
import { dateLabel } from "@/components/activity-table";
import { forecastEvents } from "@/lib/analysis";
import { utilizationPercent } from "@/lib/financial-view";
export default function CreditPage() {
  const { data } = useFinancial();
  const [balance, setBalance] = useState("");
  const [limit, setLimit] = useState("");
  if (!data)
    return (
      <AegisShell
        title="Credit"
        subtitle="Understand your obligations and the habits behind a stronger credit profile."
      >
        <FinancialLoading />
      </AegisShell>
    );
  const cards = data.accounts.filter((a) => a.type === "Credit Card");
  const debt = forecastEvents(data).filter((e) => e.kind === "debt");
  const utilization =
    balance !== "" && limit !== ""
      ? utilizationPercent(
          Math.round(Number(balance) * 100),
          Math.round(Number(limit) * 100),
        )
      : null;
  return (
    <AegisShell
      title="Credit"
      subtitle="Understand your obligations and the habits behind a stronger credit profile."
    >
      <MetricGrid
        items={[
          {
            label: "Connected card balances",
            value: (
              <Amount cents={cards.reduce((s, a) => s + a.balanceCents, 0)} />
            ),
            note: `${cards.length} credit card account${cards.length === 1 ? "" : "s"}`,
          },
          {
            label: "Upcoming debt payments",
            value: (
              <Amount cents={debt.reduce((s, e) => s - e.amountCents, 0)} />
            ),
            note: "Known and inferred · next 30 days",
          },
          {
            label: "Connected loans",
            value: data.loans.length,
            note: "Loan records from your selected source",
          },
          {
            label: "Credit score",
            value: "—",
            note: "Not provided by this financial data source",
          },
        ]}
      />
      <div className="dashboard-grid">
        <Panel
          title="Your credit-related obligations"
          description="Retrieved balances and dated payments, without inferred credit history."
        >
          {cards.map((card) => (
            <div className="structured-row" key={card.id}>
              <div>
                <strong style={{ fontSize: 14, fontWeight: 500 }}>
                  {card.name}
                </strong>
                <span className="subtext">
                  Card balance · Credit limit not provided
                </span>
              </div>
              <Amount cents={card.balanceCents} />
            </div>
          ))}
          {debt.map((e) => (
            <div className="structured-row" key={e.id}>
              <div>
                <strong style={{ fontSize: 14, fontWeight: 500 }}>
                  {e.label}
                </strong>
                <span className="subtext">
                  {dateLabel(e.date)} · Estimated or scheduled payment
                </span>
              </div>
              <Amount cents={-e.amountCents} />
            </div>
          ))}
          {!cards.length && !debt.length && (
            <EmptyState
              title="No credit-related obligations available"
              description="There are no card accounts or dated debt payments in the selected records."
            />
          )}
          <div className="panel-body" style={{ paddingTop: 16 }}>
            <Link href="/domino" className="text-link">
              Test a payment adjustment in Domino <ArrowUpRight size={12} />
            </Link>
          </div>
        </Panel>
        <Panel
          title="Utilization worksheet"
          description="An educational estimate using amounts you enter."
          action={<Badge>Illustrative</Badge>}
        >
          <div className="panel-body">
            <div className="section-stack">
              <label className="field">
                <span>Card balance ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={balance}
                  aria-invalid={
                    balance !== "" &&
                    (!Number.isFinite(Number(balance)) || Number(balance) < 0)
                  }
                  placeholder="Enter a balance"
                  onChange={(e) => setBalance(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Credit limit ($)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={limit}
                  aria-invalid={
                    limit !== "" &&
                    (!Number.isFinite(Number(limit)) || Number(limit) <= 0)
                  }
                  placeholder="Enter a limit"
                  onChange={(e) => setLimit(e.target.value)}
                />
              </label>
            </div>
            <p style={{ fontSize: 28, fontWeight: 500, marginTop: 20 }}>
              {utilization === null ? "—" : `${utilization}%`}
            </p>
            <p className="subtext" style={{ lineHeight: 1.8 }}>
              Balance ÷ limit. This is not a credit score or a prediction of a
              score change. Values are not saved.
            </p>
            {balance !== "" &&
              (!Number.isFinite(Number(balance)) || Number(balance) < 0) && (
                <p className="subtext negative" role="alert">
                  Enter a finite, non-negative card balance.
                </p>
              )}
            {limit !== "" &&
              (!Number.isFinite(Number(limit)) || Number(limit) <= 0) && (
                <p className="subtext negative" role="alert">
                  Enter a credit limit greater than zero.
                </p>
              )}
          </div>
        </Panel>
      </div>
      <Panel
        title="Build a clearer credit picture"
        description="General education, not an assessment of your credit report."
        className="section-gap"
      >
        <div className="reading-list">
          <article className="reading-item">
            <h3>Keep payment dates visible</h3>
            <p>
              Payment history matters. Use the cash-flow forecast to review
              upcoming debt payments and how they fit around expected income.
            </p>
          </article>
          <article className="reading-item">
            <h3>Understand the balance-to-limit relationship</h3>
            <p>
              Utilization describes how much available revolving credit is being
              used. Your account balance alone cannot establish utilization
              without its credit limit.
            </p>
          </article>
          <article className="reading-item">
            <h3>Start with your credit report</h3>
            <p>
              A credit score is based on information in credit reports. Banking
              activity does not establish your full payment history, credit age,
              or recent credit applications.
            </p>
          </article>
        </div>
        <div className="panel-body">
          <a
            href="https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-score-en-315/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Credit report and score guidance from the CFPB{" "}
            <ArrowUpRight size={12} />
          </a>
        </div>
      </Panel>
      <div className="section-gap">
        <Notice>
          Vesta does not retrieve a credit report or guarantee credit outcomes.
          Account balances are separate from any credit score.
        </Notice>
      </div>
    </AegisShell>
  );
}
