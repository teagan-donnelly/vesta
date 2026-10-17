"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AegisShell } from "@/components/aegis-shell";
import {
  DemoDisclosure,
  DemoGate,
  useDemoPlanning,
  type PlanningPayload,
} from "@/components/demo-planning";
import {
  Amount,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Notice,
  Panel,
} from "@/components/ui";
import type { Consent } from "@/lib/collaboration/model";
type Workspace = PlanningPayload["workspaces"][number];
type SharedCommitment = Workspace["commitments"][number];
const dollars = (v: FormDataEntryValue | null) => Math.round(Number(v) * 100);
export default function SharedPage() {
  return (
    <AegisShell
      title="Shared planning"
      subtitle="Financial accountability without financial surveillance."
    >
      <Suspense fallback={<LoadingState />}>
        <DemoGate>
          {(profile) => <Shared key={profile} profile={profile} />}
        </DemoGate>
      </Suspense>
    </AegisShell>
  );
}
function Shared({ profile }: { profile: string }) {
  const { data, error, busy, change } = useDemoPlanning(profile);
  const search = useSearchParams();
  const router = useRouter();
  const [edit, setEdit] = useState<SharedCommitment | null>(null);
  const [creating, setCreating] = useState(false);
  if (!data)
    return error ? <Notice tone="risk">{error}</Notice> : <LoadingState />;
  const workspace =
    data.workspaces.find((w) => w.id === search.get("workspace")) ||
    data.workspaces[0];
  return (
    <>
      <DemoDisclosure storage={data.storage} />
      {error && <Notice tone="risk">{error}</Notice>}
      <div className="shared-toolbar">
        <label className="field">
          <span>Your workspaces</span>
          <select
            value={workspace?.id || ""}
            onChange={(e) => {
              router.push(
                `/shared?workspace=${encodeURIComponent(e.target.value)}`,
              );
              setEdit(null);
              setCreating(false);
            }}
          >
            {data.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <Link href="/assistant" className="button button-primary">
          Explore solutions with Vesta
        </Link>
      </div>
      {workspace ? (
        <>
          <Panel
            title={workspace.name}
            description={`${workspace.kind} · ${workspace.members.map((id) => data.profiles.find((p) => p.id === id)?.name).join(", ")}`}
            action={
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setCreating(!creating);
                  setEdit(null);
                }}
              >
                Propose commitment
              </Button>
            }
          >
            <div className="panel-body">
              <p className="subtext">
                Expected contributions are planning assignments. Reported
                amounts are member statements, not confirmed payments. Forecast
                coverage is an estimate.
              </p>
            </div>
            {workspace.owner === profile && (
              <form
                className="member-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await change({
                    action: "member",
                    workspaceId: workspace.id,
                    member: f.get("member"),
                  });
                }}
              >
                <label className="field">
                  <span>Add fictional participant</span>
                  <select name="member" required>
                    {data.profiles
                      .filter((p) => !workspace.members.includes(p.id as "ava"))
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
                <Button
                  variant="secondary"
                  disabled={
                    busy || workspace.members.length === data.profiles.length
                  }
                >
                  Confirm add demo participant
                </Button>
              </form>
            )}
          </Panel>
          <div className="section-gap section-stack">
            {workspace.commitments.length ? (
              workspace.commitments.map((c) => (
                <Panel
                  key={c.id}
                  title={c.name}
                  description={`Due ${c.dueDate} · ${c.recurring ? "Monthly" : "One-time"} · next scheduled occurrence`}
                  action={
                    <Badge
                      tone={
                        c.contributions.some(
                          (a) => a.status === "may be at risk",
                        )
                          ? "risk"
                          : "neutral"
                      }
                    >
                      Readiness estimates
                    </Badge>
                  }
                >
                  <div className="commitment-totals">
                    <div>
                      <span>Total obligation</span>
                      <strong>
                        <Amount cents={c.amountCents} />
                      </strong>
                    </div>
                    <div>
                      <span>Reported by members</span>
                      <strong>
                        <Amount cents={c.reportedCents} />
                      </strong>
                    </div>
                    <div>
                      <span>Projected coverage</span>
                      <strong>
                        {c.projectedCents === null ? (
                          "Not fully shared"
                        ) : (
                          <Amount cents={c.projectedCents} />
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Potential shortfall</span>
                      <strong>
                        {c.shortfallCents === null ? (
                          "Private / unknown"
                        ) : (
                          <Amount cents={c.shortfallCents} />
                        )}
                      </strong>
                    </div>
                  </div>
                  <div className="planning-progress">
                    <label>
                      Member-reported commitments · not collected funds
                      <progress value={c.reportedCents} max={c.amountCents} />
                    </label>
                    {c.projectedCents !== null && (
                      <label>
                        Baseline projected coverage · not guaranteed
                        <progress
                          value={c.projectedCents}
                          max={c.amountCents}
                        />
                      </label>
                    )}
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Participant</th>
                          <th>Expected contribution</th>
                          <th>Reported amount</th>
                          <th>Baseline readiness</th>
                          <th>Hypothetical plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.contributions.map((a) => (
                          <tr key={a.profile}>
                            <td>
                              {a.name}
                              {a.profile === profile ? " (you)" : ""}
                            </td>
                            <td>
                              <Amount cents={a.expectedCents} />
                              <span className="subtext">
                                {a.agreed
                                  ? "Agreed contribution"
                                  : "Proposed assignment"}
                              </span>
                              {a.profile === profile && !a.agreed && (
                                <Button
                                  variant="quiet"
                                  disabled={busy}
                                  onClick={() =>
                                    change({ action: "agree", id: c.id })
                                  }
                                >
                                  Confirm agreement
                                </Button>
                              )}
                            </td>
                            <td>
                              <Amount cents={a.reportedCents} />
                            </td>
                            <td>
                              {a.status}
                              {a.coveredCents !== undefined &&
                                a.coveredCents !== null && (
                                  <span className="subtext">
                                    <Amount cents={a.coveredCents} /> projected
                                  </span>
                                )}
                            </td>
                            <td>
                              {a.scenarioStatus}
                              {a.scenarioCoveredCents !== undefined &&
                                a.scenarioCoveredCents !== null && (
                                  <span className="subtext">
                                    <Amount cents={a.scenarioCoveredCents} />{" "}
                                    projected
                                  </span>
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="panel-body section-gap">
                    <Link className="text-link" href="/domino">
                      Review your contribution in Domino →
                    </Link>
                    {c.contributions
                      .filter(
                        (a) =>
                          a.disclosedBalanceCents !== undefined ||
                          a.disclosedExpenses.length,
                      )
                      .map((a) => (
                        <p className="subtext" key={a.profile}>
                          Explicitly disclosed by {a.name}:{" "}
                          {a.disclosedBalanceCents !== undefined && (
                            <>
                              balance <Amount cents={a.disclosedBalanceCents} />{" "}
                              ·{" "}
                            </>
                          )}
                          {a.disclosedExpenses.map((t) => (
                            <span key={t.id}>
                              {t.date} {t.merchant}{" "}
                              <Amount cents={t.amountCents} /> ·{" "}
                            </span>
                          ))}
                        </p>
                      ))}
                    {c.contributions.some((a) => a.profile === profile) && (
                      <form
                        className="report-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          await change({
                            action: "report",
                            id: c.id,
                            amountCents: dollars(f.get("amount")),
                          });
                        }}
                      >
                        <label className="field">
                          <span>Your reportedly committed amount ($)</span>
                          <input
                            name="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            max={
                              c.contributions.find(
                                (a) => a.profile === profile,
                              )!.expectedCents / 100
                            }
                            required
                          />
                        </label>
                        <Button variant="secondary" disabled={busy}>
                          Confirm report · no payment
                        </Button>
                      </form>
                    )}
                    {c.owner === profile && (
                      <div className="inline-actions section-gap">
                        <Button
                          variant="quiet"
                          onClick={() => {
                            setEdit(c);
                            setCreating(false);
                          }}
                        >
                          Edit your proposal
                        </Button>
                        <Button
                          variant="quiet"
                          onClick={async () => {
                            if (
                              window.confirm(
                                "Remove your proposed commitment from planning? No payment or bank record changes.",
                              )
                            )
                              await change({
                                action: "removeCommitment",
                                id: c.id,
                              });
                          }}
                        >
                          Remove your proposal
                        </Button>
                      </div>
                    )}
                  </div>
                </Panel>
              ))
            ) : (
              <EmptyState
                title="No commitments yet"
                description="Propose an obligation and assign expected contributions to fictional participants."
              />
            )}
          </div>
          {(creating || edit) && (
            <CommitmentForm
              key={edit?.id || workspace.id}
              workspace={workspace}
              edit={edit}
              busy={busy}
              onSave={async (body) => {
                if (await change(body)) {
                  setCreating(false);
                  setEdit(null);
                }
              }}
            />
          )}
          <Privacy
            key={`${workspace.id}:${JSON.stringify(workspace.ownConsent)}`}
            consent={workspace.ownConsent}
            expenses={data.expenses}
            busy={busy}
            save={(consent) =>
              change({ action: "consent", workspaceId: workspace.id, consent })
            }
          />
          {workspace.history.length > 0 && (
            <Panel
              className="section-gap"
              title="Your readiness planning history"
              description="Time-stamped hypothetical evaluations. Only your own history is visible."
            >
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Evaluated</th>
                      <th>Commitment</th>
                      <th>Hypothetical readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.history
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <tr key={i}>
                          <td>{new Date(h.at).toLocaleString()}</td>
                          <td>
                            {workspace.commitments.find(
                              (c) => c.id === h.commitmentId,
                            )?.name || "Previous commitment"}
                          </td>
                          <td>{h.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      ) : (
        <EmptyState
          title="No shared workspace for this profile"
          description="Create one below, or ask a fictional workspace owner to add this demo participant."
        />
      )}
      <Panel
        className="section-gap"
        title="Create a shared workspace"
        description="A separate fictional planning group. No accounts are merged."
      >
        <form
          className="panel-body form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const result = await change({
              action: "workspace",
              name: f.get("name"),
              kind: f.get("kind"),
            });
            if (result) {
              router.push(
                `/shared?workspace=${encodeURIComponent(result.workspaces.at(-1).id)}`,
              );
              form.reset();
            }
          }}
        >
          <label className="field">
            <span>Name</span>
            <input name="name" required maxLength={100} />
          </label>
          <label className="field">
            <span>Group type</span>
            <select name="kind">
              {["Household", "Couple", "Family", "Business", "Custom"].map(
                (k) => (
                  <option key={k}>{k}</option>
                ),
              )}
            </select>
          </label>
          <Button disabled={busy}>Confirm create workspace</Button>
        </form>
      </Panel>
      <p className="subtext section-gap">
        Considering a financial separation?{" "}
        <Link className="text-link" href="/deadbolt">
          Review shared connections in Deadbolt
        </Link>
        . No memberships or obligations change automatically.
      </p>
    </>
  );
}
function CommitmentForm({
  workspace,
  edit,
  busy,
  onSave,
}: {
  workspace: Workspace;
  edit: SharedCommitment | null;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <Panel
      className="section-gap"
      title={
        edit ? "Edit your proposed commitment" : "Propose a shared commitment"
      }
      description="Participants and amounts are planning expectations; creating this never initiates a payment."
    >
      <form
        className="panel-body form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await onSave({
            action: "commitment",
            id: edit?.id,
            workspaceId: workspace.id,
            name: f.get("name"),
            amountCents: dollars(f.get("amount")),
            dueDate: f.get("date"),
            recurring: f.get("recurring") === "on",
            contributions: workspace.members
              .filter((p) => f.get(`include-${p}`) === "on")
              .map((p) => ({
                profile: p,
                expectedCents: dollars(f.get(`amount-${p}`)),
              })),
          });
        }}
      >
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            defaultValue={edit?.name}
            required
            maxLength={100}
          />
        </label>
        <label className="field">
          <span>Total amount ($)</span>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={edit ? edit.amountCents / 100 : undefined}
            required
          />
        </label>
        <label className="field">
          <span>Due date</span>
          <input
            name="date"
            type="date"
            defaultValue={edit?.dueDate}
            required
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            name="recurring"
            defaultChecked={edit?.recurring}
          />
          Monthly recurring
        </label>
        {workspace.members.map((p) => (
          <div key={p}>
            <label className="check-row">
              <input
                name={`include-${p}`}
                type="checkbox"
                defaultChecked={
                  edit ? edit.contributions.some((a) => a.profile === p) : true
                }
              />
              {p} participates
            </label>
            <label className="field">
              <span>Expected contribution ($)</span>
              <input
                name={`amount-${p}`}
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  (edit?.contributions.find((a) => a.profile === p)
                    ?.expectedCents || 0) / 100
                }
              />
            </label>
          </div>
        ))}
        <Button disabled={busy}>Confirm proposed commitment</Button>
      </form>
    </Panel>
  );
}
function Privacy({
  consent,
  expenses,
  busy,
  save,
}: {
  consent: Consent;
  expenses: PlanningPayload["expenses"];
  busy: boolean;
  save: (consent: Consent) => Promise<unknown>;
}) {
  const [value, setValue] = useState(consent);
  return (
    <Panel
      className="section-gap"
      title="Your disclosure choices"
      description="Applies only to you in this workspace. New members share no personal financial details by default."
    >
      <form
        className="panel-body"
        onSubmit={async (e) => {
          e.preventDefault();
          await save(value);
        }}
      >
        {(
          [
            ["readiness", "Contribution readiness only"],
            [
              "coverage",
              "Exact projected coverage amounts (enables group totals when everyone agrees)",
            ],
            ["balance", "Current account balance"],
          ] as const
        ).map(([k, label]) => (
          <label className="check-row" key={k}>
            <input
              type="checkbox"
              checked={value[k]}
              onChange={(e) => setValue({ ...value, [k]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <details>
          <summary>Choose specific expenses to disclose (optional)</summary>
          <div className="disclosure-expenses">
            {expenses.map((t) => (
              <label key={t.id} className="check-row">
                <input
                  type="checkbox"
                  checked={value.expenseIds.includes(t.id)}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      expenseIds: e.target.checked
                        ? [...value.expenseIds, t.id]
                        : value.expenseIds.filter((id) => id !== t.id),
                    })
                  }
                />
                <span>
                  {t.date} · {t.merchant} · <Amount cents={t.amountCents} />
                </span>
              </label>
            ))}
          </div>
        </details>
        <div className="inline-actions section-gap">
          <Button disabled={busy}>Confirm disclosure choices</Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              const cleared = {
                readiness: false,
                coverage: false,
                balance: false,
                expenseIds: [],
              };
              if (await save(cleared)) setValue(cleared);
            }}
          >
            Revoke all disclosures
          </Button>
        </div>
        <p className="subtext section-gap">
          Revocation affects future API responses. Information someone already
          saw cannot be recalled. Readiness and exact projected amounts are
          separate permissions.
        </p>
      </form>
    </Panel>
  );
}
