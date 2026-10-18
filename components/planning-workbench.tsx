"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { AegisShell } from "./aegis-shell";
import { useFinancial, FinancialLoading } from "./financial-provider";
import { Amount, Badge, Panel, EmptyState, Notice } from "./ui";
import { RecordButton } from "./record-editor";
import { HistoryChart, AllocationChart } from "./record-charts";
import { dateLabel } from "./activity-table";
import {
  creditUtilization,
  goalProgress,
  holdingValue,
  spendingCategories,
  type PersonalRecord,
} from "@/lib/management";
type Section =
  "goals" | "budget" | "credit" | "investing" | "protection" | "emergency";
const names = {
  goals: "Savings goals",
  budget: "Monthly budget",
  credit: "Credit",
  investing: "Investing",
  protection: "Protection",
  emergency: "Emergency Planning",
};
const subtitles = {
  goals: "Build the future you have in mind, one contribution at a time.",
  budget: "Give your spending a plan grounded in your actual records.",
  credit: "Understand the credit information you choose to track.",
  investing: "A clear view of your manually valued portfolio.",
  protection: "Organize the protection that matters to you.",
  emergency: "Be prepared for the unexpected.",
};
export function ManagementPage({ section }: { section: Section }) {
  return (
    <AegisShell
      title={names[section]}
      subtitle={subtitles[section]}
      planSection={section === "emergency" ? undefined : section}
    >
      <ManagementBlock section={section} />
    </AegisShell>
  );
}
export function ManagementBlock({ section }: { section: Section }) {
  const financial = useFinancial();
  const { data, records, recordsError, recordsStorage } = financial;
  if (!data) return <FinancialLoading />;
  return (
    <div className="management-workbench">
      {recordsError && (
        <Notice tone="caution">
          <p>
            {recordsError}{" "}
            <Link href="/settings">Choose planning storage →</Link>
          </p>
        </Notice>
      )}
      <p className="management-storage subtext">
        Self-reported planning records ·{" "}
        {recordsStorage || "storage not connected"} · USD, no currency
        conversion
      </p>
      {section === "goals" ? (
        <Goals records={records} />
      ) : section === "budget" ? (
        <Budgets records={records} />
      ) : section === "credit" ? (
        <Credit records={records} />
      ) : section === "investing" ? (
        <Investments records={records} />
      ) : section === "protection" ? (
        <Protection records={records} />
      ) : (
        <Emergency records={records} />
      )}
    </div>
  );
}
function Goals({
  records,
  emergency = false,
}: {
  records: PersonalRecord[];
  emergency?: boolean;
}) {
  const goals = records.filter(
    (r) => r.kind === "goal" && (!emergency || r.category === "Emergency"),
  );
  return (
    <Panel
      title={emergency ? "Emergency fund" : "Your savings goals"}
      description="Contributions are recorded progress, not transfers or reserved bank funds."
      action={
        <RecordButton
          kind="goal"
          label={emergency ? "Set emergency goal" : "Add goal"}
          defaults={
            emergency
              ? { category: "Emergency", label: "Emergency fund" }
              : undefined
          }
        />
      }
    >
      {goals.length ? (
        goals.map((goal) => {
          const progress = goalProgress(goal, records);
          return (
            <article className="record-list-item" key={goal.id}>
              <div className="record-item-title">
                <div>
                  <h3>{goal.label}</h3>
                  <p>
                    Target {dateLabel(goal.date!, true)} · {goal.category}
                  </p>
                </div>
                <div className="inline-actions">
                  <RecordButton
                    kind="contribution"
                    label="Record contribution"
                    defaults={{
                      referenceId: goal.id,
                      label: `${goal.label} contribution`,
                    }}
                  />
                  <RecordButton kind="goal" record={goal} />
                </div>
              </div>
              <div className="progress-caption">
                <span>
                  <Amount cents={progress.saved} /> /{" "}
                  <Amount cents={goal.targetCents!} />
                </span>
                <span>{progress.percent}%</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label={`${goal.label} progress`}
                aria-valuenow={progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progress.percent}%` }} />
              </div>
              <details className="contribution-details">
                <summary>Contribution history</summary>
                {records
                  .filter(
                    (r) =>
                      r.kind === "contribution" && r.referenceId === goal.id,
                  )
                  .map((r) => (
                    <div className="structured-row" key={r.id}>
                      <span>
                        {r.label}
                        <small className="subtext">
                          {dateLabel(r.date!, true)}
                        </small>
                      </span>
                      <Amount cents={r.amountCents!} />
                      <RecordButton kind="contribution" record={r} />
                    </div>
                  ))}
              </details>
            </article>
          );
        })
      ) : (
        <EmptyState
          title="Every plan starts with a goal"
          description="Set a target, record your starting savings, and track contributions over time."
        />
      )}
      <div className="panel-body">
        <Link className="text-link" href="/shared">
          Review commitments before allocating shared money →
        </Link>
        {!emergency && (
          <Link className="text-link" href="/continuity">
            Manage emergency resources →
          </Link>
        )}
      </div>
    </Panel>
  );
}
function Budgets({ records }: { records: PersonalRecord[] }) {
  const { data } = useFinancial();
  const [month, setMonth] = useState(data!.asOf.slice(0, 7));
  const budgets = records.filter(
    (r) => r.kind === "budget" && r.date?.startsWith(month),
  );
  const spending = spendingCategories(data!, month);
  const total = budgets.reduce((s, r) => s + r.amountCents!, 0),
    actual = spending.reduce((s, r) => s + r.value, 0);
  return (
    <>
      <div className="record-metrics">
        <div>
          <span>Planned category budgets</span>
          <strong>
            <Amount cents={total} />
          </strong>
        </div>
        <div>
          <span>Recorded monthly spending</span>
          <strong>
            <Amount cents={actual} />
          </strong>
        </div>
        <div>
          <span>Unbudgeted spending</span>
          <strong>
            <Amount
              cents={spending
                .filter((s) => !budgets.some((b) => b.category === s.name))
                .reduce((s, r) => s + r.value, 0)}
            />
          </strong>
        </div>
      </div>
      <Panel
        title="Category budgets"
        action={
          <div className="inline-actions">
            <input
              type="month"
              aria-label="Budget month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <RecordButton
              kind="budget"
              label="Add budget"
              defaults={{ date: `${month}-01` }}
            />
          </div>
        }
      >
        {budgets.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budget</th>
                  <th>Actual</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((r) => {
                  const spent =
                    spending.find((s) => s.name === r.category)?.value || 0;
                  const remaining = r.amountCents! - spent;
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.label}</strong>
                        <span className="subtext">{r.category}</span>
                      </td>
                      <td>
                        <Amount cents={r.amountCents!} />
                      </td>
                      <td>
                        <Amount cents={spent} />
                      </td>
                      <td>
                        <span className={remaining < 0 ? "negative" : ""}>
                          <Amount cents={remaining} />
                        </span>
                        {remaining < 0 && (
                          <Badge tone="risk">Over budget</Badge>
                        )}
                      </td>
                      <td>
                        <div className="progress-track">
                          <span
                            style={{
                              width: `${Math.min(100, r.amountCents ? (spent / r.amountCents) * 100 : 100)}%`,
                              background: remaining < 0 ? "#b22b36" : undefined,
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <RecordButton kind="budget" record={r} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Give each category a plan"
            description="Add budgets using categories from your transactions. Completed spending updates progress automatically."
          />
        )}
      </Panel>
      <div className="two-column section-gap">
        <Panel title="Actual category spending">
          <AllocationChart items={spending} label="Recorded spending" />
        </Panel>
        <Panel title="Stay flexible">
          <div className="panel-body">
            <p>
              Budgets describe your intentions. Forecasts describe the timing of
              known and estimated cash events. Neither reserves or moves money.
            </p>
            <Link className="text-link" href="/transactions">
              Review transaction categories →
            </Link>
            <Link className="text-link" href="/plan?section=forecast">
              Test a cash-flow change →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
function Credit({ records }: { records: PersonalRecord[] }) {
  const { data } = useFinancial();
  const scores = records
    .filter((r) => r.kind === "score")
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const latest = scores.at(-1),
    accounts = records.filter((r) => r.kind === "credit"),
    utilization = creditUtilization(records);
  const knownPayments = records.filter(
    (r) =>
      r.kind === "payment" &&
      r.paymentStatus &&
      r.paymentStatus !== "Unknown" &&
      r.date,
  );
  const opened = accounts.filter(
    (r) => r.openedDate && r.openedDate <= data!.asOf,
  );
  const age = opened.length
    ? Math.floor(
        opened.reduce(
          (s, r) =>
            s +
            (Date.parse(data!.asOf) - Date.parse(r.openedDate!)) /
              86400000 /
              30.4375,
          0,
        ) / opened.length,
      )
    : null;
  return (
    <>
      <div className="two-column">
        <Panel
          title="Your recorded credit score"
          action={
            <RecordButton
              kind="score"
              label="Record score"
              defaults={{ label: "Manual credit score" }}
            />
          }
        >
          <div
            className="score-gauge"
            style={
              {
                "--score-progress": `${latest ? ((latest.score! - 300) / 550) * 100 : 0}%`,
              } as CSSProperties
            }
          >
            <span />
            <strong>
              {latest?.score ?? "—"}
              <small>
                {latest
                  ? latest.score! < 580
                    ? "Poor"
                    : latest.score! < 670
                      ? "Fair"
                      : latest.score! < 740
                        ? "Good"
                        : latest.score! < 800
                          ? "Very good"
                          : "Excellent"
                  : "No score recorded"}
              </small>
            </strong>
          </div>
          <p className="panel-body subtext">
            300–850 · Manually entered, not bureau-verified. Nessie and Gemini
            do not provide credit scores.
          </p>
        </Panel>
        <Panel title="Recorded score history">
          <HistoryChart
            points={scores.map((r) => ({ date: r.date!, value: r.score! }))}
            currency={false}
            label="Manually recorded credit score observations"
          />
        </Panel>
      </div>
      <div className="record-metrics">
        <div>
          <span>Revolving utilization</span>
          <strong>
            {utilization === null ? "—" : `${utilization.toFixed(1)}%`}
          </strong>
          <small className="subtext">
            Tracked revolving balances ÷ tracked revolving limits
          </small>
        </div>
        <div>
          <span>Recorded payment observations</span>
          <strong>{knownPayments.length}</strong>
          <small className="subtext">
            {knownPayments.filter((r) => r.paymentStatus === "On time").length}{" "}
            on time ·{" "}
            {knownPayments.filter((r) => r.paymentStatus === "Late").length}{" "}
            late
          </small>
        </div>
        <div>
          <span>Average known account age</span>
          <strong>
            {age === null ? "—" : `${Math.floor(age / 12)}y ${age % 12}m`}
          </strong>
          <small className="subtext">
            Only accounts with a recorded opening date
          </small>
        </div>
      </div>
      <Panel
        title="Tracked credit accounts"
        action={<RecordButton kind="credit" label="Add account" />}
      >
        {accounts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Credit limit</th>
                  <th>Payment observation</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{r.category}</td>
                    <td>
                      <Amount cents={r.balanceCents!} />
                    </td>
                    <td>
                      {r.category === "Revolving" ? (
                        <Amount cents={r.limitCents!} />
                      ) : (
                        "Not revolving"
                      )}
                    </td>
                    <td>
                      {r.paymentStatus || "Unknown"}
                      {r.date && (
                        <span className="subtext">{dateLabel(r.date)}</span>
                      )}
                    </td>
                    <td>
                      <RecordButton kind="credit" record={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Track credit without guesswork"
            description="Record known account balances, credit limits and payment observations. Installment loans are excluded from revolving utilization."
          />
        )}
      </Panel>
      <details className="secondary-details">
        <summary>Score entries & connected debt records</summary>
        <h3>Recorded payment history</h3>
        {knownPayments.length ? (
          knownPayments.map((payment) => (
            <div className="structured-row" key={payment.id}>
              <span>
                {payment.label} · {dateLabel(payment.date!, true)}
              </span>
              <Badge
                tone={payment.paymentStatus === "Late" ? "caution" : "positive"}
              >
                {payment.paymentStatus} · manual
              </Badge>
            </div>
          ))
        ) : (
          <p className="subtext">
            No payment observations recorded. Vesta does not manufacture an
            on-time percentage.
          </p>
        )}
        {scores.map((r) => (
          <div className="structured-row" key={r.id}>
            <span>
              {dateLabel(r.date!, true)} · {r.score} · manual
            </span>
            <RecordButton kind="score" record={r} />
          </div>
        ))}
        {data!.accounts
          .filter((a) => a.type === "Credit Card")
          .map((a) => (
            <div className="structured-row" key={a.id}>
              <span>{a.name} · imported balance, limit unavailable</span>
              <Amount cents={a.balanceCents} />
            </div>
          ))}
        {data!.loans.map((r) => (
          <div className="structured-row" key={r.id}>
            <span>Imported loan · balance / recorded payment</span>
            <Amount cents={r.amountCents} />
            <Amount cents={r.paymentCents} />
          </div>
        ))}
      </details>
      <Notice>
        <p>
          Education: review reports for errors, keep payments timely, and
          consider revolving utilization. These practices do not guarantee score
          improvements. Tracking an account does not connect it to a credit
          bureau.
        </p>
      </Notice>
    </>
  );
}
function Investments({ records }: { records: PersonalRecord[] }) {
  const holdings = records.filter((r) => r.kind === "holding"),
    total = holdings.reduce((s, r) => s + holdingValue(r), 0),
    cost = holdings.reduce((s, r) => s + (r.costCents || 0), 0);
  const allocation = [...new Set(holdings.map((r) => r.category!))].map(
    (name) => ({
      name,
      value: holdings
        .filter((r) => r.category === name)
        .reduce((s, r) => s + holdingValue(r), 0),
    }),
  );
  const valuations = records.filter((r) => r.kind === "valuation");
  const points = [...new Set(valuations.map((r) => r.date!))]
    .sort()
    .flatMap((date) => {
      const entries = holdings.map((h) =>
        valuations
          .filter((v) => v.referenceId === h.id && v.date! <= date)
          .sort((a, b) => a.date!.localeCompare(b.date!))
          .at(-1),
      );
      return entries.length && entries.every(Boolean)
        ? [{ date, value: entries.reduce((s, r) => s + r!.amountCents!, 0) }]
        : [];
    });
  return (
    <>
      <div className="record-metrics">
        <div>
          <span>Manual portfolio value</span>
          <strong>
            <Amount cents={total} />
          </strong>
        </div>
        <div>
          <span>Recorded cost basis</span>
          <strong>
            <Amount cents={cost} />
          </strong>
        </div>
        <div>
          <span>Value less recorded basis</span>
          <strong className={total - cost < 0 ? "negative" : "positive"}>
            <Amount cents={total - cost} />
          </strong>
        </div>
      </div>
      <div className="two-column">
        <Panel
          title="Saved portfolio valuations"
          description="Saved observations with last recorded values; no live market feed."
        >
          <HistoryChart
            points={points}
            label="Saved manual portfolio valuations"
          />
        </Panel>
        <Panel title="Asset allocation">
          <AllocationChart items={allocation} label="Manual valuation" />
        </Panel>
      </div>
      <Panel
        className="section-gap"
        title="Your holdings"
        action={<RecordButton kind="holding" label="Add holding" />}
      >
        {holdings.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Holding</th>
                  <th>Asset class</th>
                  <th>Units</th>
                  <th>Manual unit value</th>
                  <th>Total value</th>
                  <th>Valued on</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{r.category}</td>
                    <td>{r.quantity}</td>
                    <td>
                      <Amount cents={r.priceCents!} />
                    </td>
                    <td>
                      <Amount cents={holdingValue(r)} />
                    </td>
                    <td>{dateLabel(r.date!)}</td>
                    <td>
                      <RecordButton kind="holding" record={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="A portfolio with your own numbers"
            description="Record holdings and their valuations. Vesta does not invent prices, market returns or execute trades."
          />
        )}
      </Panel>
    </>
  );
}
function Protection({ records }: { records: PersonalRecord[] }) {
  const [tab, setTab] = useState("insurance");
  const policies = records.filter((r) => r.kind === "policy");
  const active = policies.filter((r) => r.status === "active");
  const allocation = [...new Set(active.map((r) => r.category!))].map(
    (name) => ({
      name,
      value: active
        .filter((r) => r.category === name)
        .reduce((s, r) => s + r.amountCents!, 0),
    }),
  );
  return (
    <>
      <div className="settings-tabs">
        {["insurance", "identity", "security"].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>
      {tab === "insurance" ? (
        <div className="two-column">
          <Panel
            title="Manually tracked insurance"
            action={<RecordButton kind="policy" label="Add policy" />}
          >
            {policies.length ? (
              policies.map((r) => (
                <article key={r.id} className="record-list-item">
                  <div className="record-item-title">
                    <div>
                      <h3>{r.label}</h3>
                      <p>
                        {r.category} · renews {dateLabel(r.date!, true)}
                      </p>
                    </div>
                    <RecordButton kind="policy" record={r} />
                  </div>
                  <div className="progress-caption">
                    <Badge
                      tone={r.status === "active" ? "positive" : "caution"}
                    >
                      {r.status || "review"} · self-reported
                    </Badge>
                    <span>
                      <Amount cents={r.amountCents!} /> / month
                    </span>
                  </div>
                  <p className="subtext">{r.notes}</p>
                </article>
              ))
            ) : (
              <EmptyState
                title="Keep your policies in view"
                description="Track premiums, renewal dates and provider details. Coverage is self-reported and never independently verified."
              />
            )}
          </Panel>
          <Panel title="Monthly premium breakdown">
            <AllocationChart items={allocation} label="Premiums / month" />
            <div className="panel-body">
              <p className="subtext">
                A premium breakdown is not a measurement of insured coverage.
                Confirm current terms directly with your providers.
              </p>
            </div>
          </Panel>
        </div>
      ) : (
        <Panel
          title={
            tab === "identity"
              ? "Identity protection checklist"
              : "Security habits"
          }
        >
          <SavedChecklist
            prefix={tab}
            items={
              tab === "identity"
                ? [
                    "Review credit reports for unfamiliar accounts",
                    "Review recovery contacts with providers",
                    "Store identity documents securely",
                  ]
                : [
                    "Use unique passwords and a password manager",
                    "Enable multifactor authentication with providers",
                    "Review shared account permissions",
                  ]
            }
          />
          <div className="panel-body">
            <Link href="/deadbolt" className="text-link">
              Open financial separation planning →
            </Link>
            <p className="subtext">
              Completing these self-reported steps does not verify identity
              protection or account security.
            </p>
          </div>
        </Panel>
      )}
    </>
  );
}
export function SavedChecklist({
  prefix,
  items,
}: {
  prefix: string;
  items: string[];
}) {
  const { records, saveRecord } = useFinancial();
  const [error, setError] = useState("");
  return (
    <div className="panel-body">
      {items.map((label, i) => {
        const id = `${prefix}-${i}`,
          record = records.find((r) => r.id === id && r.kind === "resource");
        return (
          <label className="saved-check" key={id}>
            <input
              type="checkbox"
              checked={record?.status === "ready"}
              onChange={async (e) => {
                setError("");
                try {
                  await saveRecord({
                    id,
                    kind: "resource",
                    label,
                    category: "Checklist",
                    status: e.target.checked ? "ready" : "needed",
                  });
                } catch {
                  setError(
                    "This checklist update was not saved. Review planning storage in Settings.",
                  );
                }
              }}
            />
            <span>{label}</span>
          </label>
        );
      })}
      {error && (
        <p role="alert" className="negative">
          {error}
        </p>
      )}
    </div>
  );
}
function Emergency({ records }: { records: PersonalRecord[] }) {
  const resources = records.filter(
      (r) => r.kind === "resource" && r.category !== "Checklist",
    ),
    contacts = records.filter((r) => r.kind === "contact");
  return (
    <>
      <Goals records={records} emergency />
      <div className="two-column section-gap">
        <Panel
          title="Emergency contacts"
          action={<RecordButton kind="contact" label="Add contact" />}
        >
          {contacts.length ? (
            contacts.map((r) => (
              <div className="record-list-item" key={r.id}>
                <div className="record-item-title">
                  <div>
                    <h3>{r.label}</h3>
                    <p>{r.category}</p>
                  </div>
                  <RecordButton kind="contact" record={r} />
                </div>
                <p className="subtext">{r.notes}</p>
              </div>
            ))
          ) : (
            <EmptyState
              title="People you can reach"
              description="Keep contact instructions you choose to record. Vesta does not contact anyone automatically."
            />
          )}
        </Panel>
        <Panel
          title="Important documents & resources"
          action={<RecordButton kind="resource" label="Add resource" />}
        >
          {resources.length ? (
            resources.map((r) => (
              <div className="structured-row" key={r.id}>
                <div>
                  <strong>{r.label}</strong>
                  <span className="subtext">
                    {r.category} · {r.status}
                  </span>
                  <span className="subtext">{r.notes}</span>
                </div>
                <RecordButton kind="resource" record={r} />
              </div>
            ))
          ) : (
            <EmptyState
              title="Prepare without storing secrets"
              description="Record where documents can be found. Do not store passwords, full account numbers or document scans here."
            />
          )}
        </Panel>
      </div>
      <Panel className="section-gap" title="Your readiness checklist">
        <SavedChecklist
          prefix="emergency"
          items={[
            "Review essential bills and payment deadlines",
            "Choose trusted contacts and discuss your plan",
            "Confirm where important documents are stored",
            "Review your emergency savings target",
          ]}
        />
        <div className="panel-body">
          <p className="subtext">
            Common guidance is to consider several months of essential expenses.
            Set a target appropriate to your circumstances; Vesta does not
            assume a monthly expense amount.
          </p>
        </div>
      </Panel>
    </>
  );
}
