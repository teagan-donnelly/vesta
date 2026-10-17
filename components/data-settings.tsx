"use client";
import { useFinancial } from "./financial-provider";
import { Amount, Badge, Button, Notice, Panel } from "./ui";
import { liquidBalance } from "@/lib/analysis";
export function DataSettings() {
  const { data, mode, customer, error, loading, reload } = useFinancial();
  const profile =
    data?.customers.find((c) => c.id === customer) || data?.customers[0];
  return (
    <div className="settings-layout">
      <div className="section-stack">
        <Panel
          title="Financial data"
          description="The source behind your accounts and financial analysis."
          action={
            <Badge tone={data ? "positive" : "neutral"}>
              {loading ? "Loading" : data ? "Loaded" : "Unavailable"}
            </Badge>
          }
        >
          <div className="structured-row">
            <div>
              <strong>Selected source</strong>
              <span className="subtext">
                Change sources using the control in the top bar.
              </span>
            </div>
            <span style={{ fontSize: 14 }}>
              {mode === "nessie" ? "Capital One Nessie" : "Fictional demo"}
            </span>
          </div>
          <div className="structured-row">
            <div>
              <strong>Financial profile</strong>
              <span className="subtext">
                Mode and profile are remembered on this browser.
              </span>
            </div>
            <span style={{ fontSize: 14 }}>
              {profile?.name || "Not loaded"}
            </span>
          </div>
          <div className="structured-row">
            <div>
              <strong>Available cash</strong>
              <span className="subtext">
                Checking and savings, excluding card balances.
              </span>
            </div>
            {data ? <Amount cents={liquidBalance(data)} /> : <span>—</span>}
          </div>
          <div className="structured-row">
            <span className="subtext">
              {data
                ? `${data.accounts.length} accounts · ${data.transactions.length} activity records · ${data.bills.length} bills`
                : "No records have been loaded."}
            </span>
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => reload(true)}
            >
              Refresh records
            </Button>
          </div>
        </Panel>
        <Panel
          title="Data coverage & diagnostics"
          description="Understand what is included before relying on a financial conclusion."
        >
          <ul className="diagnostic-list">
            {data?.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
            <li>
              Current balances are a closing snapshot. Past transactions are
              used as evidence for recurrence and are not replayed against those
              balances.
            </li>
            <li>
              Forecasts include known bills and inferred recurring events.
              Everyday discretionary spending and unsupported income schedules
              are excluded.
            </li>
            {error && <li role="alert">Latest request: {error}</li>}
          </ul>
        </Panel>
      </div>
      <div className="section-stack">
        <Panel
          title="Explanations"
          description="Calculated first. Explained with context."
        >
          <div className="panel-body">
            <p style={{ fontSize: 14, lineHeight: 1.9, color: "#5f6f85" }}>
              Vesta calculates balances and forecasts. Gemini can prioritize
              verified explanations, without adding financial claims or changing
              the numbers.
            </p>
            <div style={{ marginTop: 14 }}>
              <Badge>Deterministic fallback available</Badge>
            </div>
          </div>
        </Panel>
        <Panel title="Privacy & control">
          <div className="reading-list">
            <article className="reading-item">
              <h3>Credentials stay on the server</h3>
              <p>Nessie and Gemini keys are never sent to your browser.</p>
            </article>
            <article className="reading-item">
              <h3>Simulations are hypothetical</h3>
              <p>
                Removing a subscription or changing payment timing in Domino
                does not modify bank records.
              </p>
            </article>
            <article className="reading-item">
              <h3>Remembered preferences</h3>
              <p>
                Only the selected data mode and customer ID are stored as
                browser preferences. Planning notes are not saved automatically.
              </p>
            </article>
          </div>
        </Panel>
        <Notice>
          All Demo Mode activity and the Vesta test sandbox profile are
          fictional. No real banking actions are available.
        </Notice>
      </div>
    </div>
  );
}
