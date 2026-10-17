"use client";
import { useState } from "react";
import { useFinancial } from "./financial-provider";
import { formatCurrency } from "@/lib/analysis";
import type { ScenarioMetrics, ScenarioPreview } from "@/lib/sandbox-scenario";

type Verification = {
  source: "nessie";
  fictional: boolean;
  metrics: ScenarioMetrics;
  records: { collection: string; id: string }[];
  balanceCents: number;
  verifiedRecords?: number;
  balanceMatchesExpected?: boolean;
};
type Result = {
  state?: string;
  message?: string;
  verification: Verification;
  explanation?: { source: string; reason: string; explanations: string[] };
};
function Metrics({ value }: { value: ScenarioMetrics }) {
  return (
    <>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Available cash", formatCurrency(value.startingBalanceCents)],
          [
            "30-day obligations",
            formatCurrency(value.upcomingObligationsCents),
          ],
          ["Subscriptions", String(value.subscriptionCount)],
          ["Review flags", String(value.alertCount)],
          [
            "Lowest balance",
            `${formatCurrency(value.lowestBalanceCents)} on ${value.lowestBalanceDate}`,
          ],
          ["Ending balance", formatCurrency(value.endingBalanceCents)],
          [
            "Removing all subscriptions",
            `${formatCurrency(value.subscriptionRemovalDeltaCents)} ending-balance change`,
          ],
        ].map(([label, text]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 font-medium">{text}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 space-y-2 text-sm">
        {value.checks.map((check) => (
          <li key={check.label}>
            {check.passed ? "Pass" : "Needs review"}: {check.label}
          </li>
        ))}
      </ul>
    </>
  );
}

export function SandboxScenario() {
  const { data, mode, customer, reload } = useFinancial();
  const accounts = data?.accounts.filter((a) => a.type === "Checking") || [];
  const customerId =
    customer || accounts[0]?.customerId || data?.customers[0]?.id || "";
  if (mode !== "nessie")
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Fictional sandbox scenario</h2>
        <p className="mt-2 text-sm">
          Switch the Data source selector to Nessie Sandbox Mode to prepare a
          preview. Nothing is seeded automatically.
        </p>
      </section>
    );
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold">
        Prepare fictional Nessie activity
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Localhost only. Preview the exact proposed records, then explicitly
        confirm. Existing records are preserved; actual financial records are
        only shown as Nessie-backed after retrieval.
      </p>
      <ScenarioControls
        key={customerId}
        customerId={customerId}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        onReload={() => reload(true)}
      />
    </section>
  );
}
function ScenarioControls({
  customerId,
  accounts,
  onReload,
}: {
  customerId: string;
  accounts: { id: string; name: string }[];
  onReload: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [preview, setPreview] = useState<ScenarioPreview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("");
  async function call(body: unknown) {
    const response = await fetch("/api/nessie/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const value = await response.json();
    if (!response.ok)
      throw new Error(value.error || "Sandbox operation failed.");
    return value;
  }
  return (
    <>
      <label className="mt-4 block text-sm">
        Target checking account
        <select
          className="ml-2 max-w-full rounded border p-2"
          value={accountId}
          disabled={busy}
          onChange={(e) => {
            setAccountId(e.target.value);
            setPreview(null);
            setResult(null);
            setSubmitted(false);
            setConfirmation("");
            setAcknowledged(false);
            setError("");
          }}
        >
          <option value="">Select a checking account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      {!accounts.length && (
        <p className="mt-2 text-sm">
          No checking account is available. This workflow requires the existing
          Vesta Fictional Test customer and checking account.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          disabled={busy || !accountId}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setError("");
            setResult(null);
            setPreview(null);
            setConfirmation("");
            setAcknowledged(false);
            setSubmitted(false);
            setStatus(
              "Reading Nessie and preparing a local preview. No Nessie records are being written.",
            );
            try {
              const value = await call({
                action: "preview",
                customerId,
                accountId,
              });
              setPreview(value.preview);
              setStatus("Preview ready. No records have been written.");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Preview failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Preview fictional dataset
        </button>
        <button
          disabled={busy || !accountId}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setError("");
            setStatus("Reading actual Nessie records only.");
            try {
              const response = await fetch(
                `/api/nessie/scenario?customerId=${encodeURIComponent(customerId)}&accountId=${encodeURIComponent(accountId)}`,
                { cache: "no-store" },
              );
              const value = await response.json();
              if (!response.ok) throw new Error(value.error);
              setResult({ verification: value });
              setStatus("Read-only verification complete.");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Verification failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Verify existing Nessie records (read-only)
        </button>
      </div>
      <p role="status" className="mt-3 text-sm">
        {busy ? "Working... " : ""}
        {status}
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-orange-50 p-3 text-sm">
          {error}
        </p>
      )}
      {preview && (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <h3 className="text-lg font-semibold">
            Proposed fictional dataset - preview calculations only
          </h3>
          <p className="mt-2 text-sm">
            Customer: {preview.customerName}. Account: {preview.accountName}.
            Snapshot date: {preview.asOf}. Preview expires{" "}
            {new Date(preview.expiresAt).toLocaleString("en-US", {
              timeZone: "America/New_York",
            })}{" "}
            Eastern.
          </p>
          <p className="mt-2 text-sm">
            {preview.items.length} proposed records. History adds{" "}
            {formatCurrency(preview.historyIncomeCents)} in deposits and{" "}
            {formatCurrency(preview.historyExpenseCents)} in withdrawals.
            Retrieved account balance:{" "}
            {formatCurrency(preview.balanceBeforeCents)}. Temporary balance
            could reach {formatCurrency(preview.temporaryPeakBalanceCents)}{" "}
            while deposits are added first; the expected final balance remains{" "}
            {formatCurrency(preview.balanceBeforeCents)}.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {preview.limitations.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <h4 className="mt-5 font-medium">
            Expected analysis of proposed records (not live verification)
          </h4>
          <Metrics value={preview.expected} />
          <div className="mt-4 max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-left">
                Every proposed POST uses the documented /accounts/
                {"{accountId}"}/deposits, /withdrawals or /bills endpoint.
              </caption>
              <thead>
                <tr>
                  <th className="p-2">Record</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Fictional activity</th>
                  <th className="p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((i) => (
                  <tr className="border-t border-slate-100" key={i.reference}>
                    <td className="p-2">{i.collection}</td>
                    <td className="p-2">{i.date}</td>
                    <td className="p-2">
                      {i.label} ({i.kind})
                    </td>
                    <td className="p-2">{formatCurrency(i.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">
              Inspect exact proposed request bodies
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded bg-slate-50 p-3 text-xs">
              {JSON.stringify(
                preview.items.map((i) => ({
                  endpoint: `/accounts/${preview.accountId}/${i.collection}`,
                  body: i.body,
                })),
                null,
                2,
              )}
            </pre>
          </details>
          <label className="mt-5 block text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={submitted || busy}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />{" "}
            I reviewed the fictional records and authorize adding them to this
            account. I understand its balance may change temporarily and
            uncertain writes will not be retried.
          </label>
          <label className="mt-3 block text-sm">
            Type SEED FICTIONAL DATA to confirm
            <input
              className="mt-1 block w-full max-w-md rounded border p-2"
              autoComplete="off"
              disabled={submitted || busy}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <button
            disabled={
              busy ||
              submitted ||
              !acknowledged ||
              confirmation !== "SEED FICTIONAL DATA"
            }
            className="mt-3 rounded-lg bg-orange-700 px-4 py-2 text-white disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              setSubmitted(true);
              setError("");
              setStatus(
                "Explicit confirmation submitted. Writing once and verifying each record from Nessie; do not close this page.",
              );
              try {
                const value = await call({
                  action: "confirm",
                  planId: preview.id,
                  confirmation,
                  acknowledgeBalanceEffects: acknowledged,
                });
                setResult(value);
                setStatus(
                  "Submission finished. Review the retrieved record verification below.",
                );
                onReload();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Submission failed; some records may exist. Do not retry automatically.",
                );
                try {
                  const response = await fetch(
                    `/api/nessie/scenario?planId=${preview.id}`,
                    { cache: "no-store" },
                  );
                  const run = await response.json();
                  if (response.ok)
                    setStatus(
                      `Run state: ${run.state}. Verified records: ${run.verified}. Uncertain submissions: ${run.uncertain.length}. Use read-only verification; manual recovery is required for partial or uncertain runs.`,
                    );
                } catch {
                  setStatus(
                    "Run status unavailable. Do not resubmit; inspect the local ledger and Nessie.",
                  );
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm and write fictional records to Nessie
          </button>
        </div>
      )}
      {result && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="text-lg font-semibold">
            Actual retrieved Nessie records - fictional sandbox data
          </h3>
          <p className="mt-2 text-sm">
            {result.message} Retrieved {result.verification.records.length}{" "}
            scenario records. Live account balance:{" "}
            {formatCurrency(result.verification.balanceCents)}.
            {result.verification.balanceMatchesExpected === false
              ? " Balance differs from preview; investigate before relying on the forecast."
              : ""}
          </p>
          <Metrics value={result.verification.metrics} />
          <details className="mt-3 text-sm">
            <summary>Retrieved record IDs</summary>
            <ul className="mt-2">
              {result.verification.records.map((r) => (
                <li key={`${r.collection}:${r.id}`}>
                  {r.collection}: {r.id}
                </li>
              ))}
            </ul>
          </details>
          {result.explanation && (
            <div className="mt-4">
              <h4 className="font-medium">
                Grounded risk explanation ({result.explanation.source})
              </h4>
              <p className="text-sm">{result.explanation.reason}</p>
              <ul className="mt-2 space-y-2 text-sm">
                {result.explanation.explanations.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-4 text-sm">
            Review Overview, select a subscription in Protect, then compare the
            baseline and changed scenario in Domino. All live analysis uses
            retrieved Nessie records.
          </p>
        </div>
      )}
    </>
  );
}
