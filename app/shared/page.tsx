"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GroupHealthCards } from "@/components/group-health";
import { RelationshipPrivacy } from "@/components/relationship-privacy";
import { RelationshipDisclosures } from "@/components/relationship-disclosures";
import { SharedExpenseSummary } from "@/components/shared-expense-summary";
import { PlanningRecovery } from "@/components/planning-recovery";
import { readinessLabel } from "@/lib/navigation";
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
      title="Shared Finances"
      subtitle="Plan expenses together without sharing your entire financial life."
    >
      <DemoGate>
        {(profile) => (
          <Suspense key={profile} fallback={<LoadingState />}>
            <Shared profile={profile} />
          </Suspense>
        )}
      </DemoGate>
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
    return error ? (
      <div>
        <Notice tone="risk">
          Shared finances are unavailable. Check your planning connection in
          Settings.
        </Notice>
        <PlanningRecovery />
      </div>
    ) : (
      <LoadingState />
    );
  const workspace =
    data.workspaces.find((w) => w.id === search.get("workspace")) ||
    data.workspaces.find((w) =>
      w.commitments.some((c) => c.id === search.get("commitment")),
    ) ||
    data.workspaces[0];
  return (
    <>
      <DemoDisclosure storage={data.storage} />
      {error && <Notice tone="risk">{error}</Notice>}
      <GroupHealthCards data={data}/>
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
          Ask about our expenses
        </Link>
      </div>
      {workspace ? (
        <>
          <Panel
            className="household-header"
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
                Add a shared expense
              </Button>
            }
          >
            <details className="secondary-details workspace-people">
              <summary>People & workspace details</summary>
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
                        .filter(
                          (p) => !workspace.members.includes(p.id as "ava"),
                        )
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
            </details>
          </Panel>
          <RelationshipDisclosures workspace={workspace} viewer={profile}/>
          <div className="section-gap section-stack">
            {workspace.commitments.length ? (
              workspace.commitments.map((c) => (
                <Panel
                  className="shared-obligation-panel"
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
                  <SharedExpenseSummary
                    expense={c}
                    viewer={profile}
                    workspace={workspace.id}
                  />
                  <details className="secondary-details expense-details">
                    <summary>Contributions & payment details</summary>
                    <div className="commitment-totals">
                      <div>
                        <span>Total obligation</span>
                        <strong>
                          <Amount cents={c.amountCents} />
                        </strong>
                      </div>
                      <div>
                        <span>Members say they’ve set aside</span>
                        <strong>
                          <Amount cents={c.reportedCents} />
                        </strong>
                      </div>
                      <div>
                        <span>Estimated amount available</span>
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
                          Estimated amount available without changes · not
                          guaranteed
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
                            <th>Can they cover their share?</th>
                            <th>With their changes</th>
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
                                {a.reportedCents === null ? "Not reported" : <Amount cents={a.reportedCents} />}
                              </td>
                              <td>
                                {readinessLabel(a.status, a.name)}
                                {a.coveredCents !== undefined &&
                                  a.coveredCents !== null && (
                                    <span className="subtext">
                                      <Amount cents={a.coveredCents} />{" "}
                                      projected
                                    </span>
                                  )}
                              </td>
                              <td>
                                {readinessLabel(a.scenarioStatus, a.name)}
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
                      <Link className="text-link" href="/plan?section=forecast">
                        Explore your share in Forecast →
                      </Link>
                      {c.contributions
                        .filter(
                          (a) =>
                            a.disclosedBills !== undefined || a.disclosedProjection !== undefined || a.disclosedBalanceCents !== undefined ||
                            a.disclosedExpenses.length,
                        )
                        .map((a) => (
                          <div className="subtext" key={a.profile}>
                            Explicitly disclosed by {a.name}:{" "}
                            {a.disclosedBalanceCents !== undefined && (
                              <>
                                balance{" "}
                                <Amount cents={a.disclosedBalanceCents} />{" "}
                                ·{" "}
                              </>
                            )}
                            {a.disclosedBills && <div><strong>Authorized upcoming bills</strong>{a.disclosedBills.map(b=><p key={b.id}>{b.name} · {b.dueDate} · <Amount cents={b.amountCents}/></p>)}</div>}
                            {a.disclosedProjection && <div><strong>Authorized projected balances · saved hypothetical plan</strong><div className="authorized-projection">{a.disclosedProjection.map(p=><span key={p.date}>{p.date}: <Amount cents={p.balanceCents}/></span>)}</div></div>}
                            {a.disclosedExpenses.map((t) => (
                              <span key={t.id}>
                                {t.date} {t.merchant}{" "}
                                <Amount cents={t.amountCents} /> ·{" "}
                              </span>
                            ))}
                          </div>
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
                            <span>Amount you say you’ve set aside ($)</span>
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
                            Save my update · no payment
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
                  </details>
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
          <details className="secondary-details section-gap" id="sharing">
            <summary>Privacy & sharing · choose what others can see</summary>
            <RelationshipPrivacy key={workspace.id} workspace={workspace} profile={profile}>{(recipient,consent)=><Privacy
              key={`${workspace.id}:${recipient}:${JSON.stringify(consent)}`}
              consent={consent}
              expenses={data.expenses}
              busy={busy}
              save={(consent) =>
                change({
                  action: "consent",
                  workspaceId: workspace.id,
                  recipient,
                  consent,
                })
              }
            />}</RelationshipPrivacy>
          </details>
          {workspace.history.length > 0 && (
            <details className="secondary-details section-gap">
              <summary>Your past estimates</summary>
              <Panel
                className="section-gap"
                title="Your past estimates"
                description="Time-stamped hypothetical evaluations. Only your own history is visible."
              >
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Evaluated</th>
                        <th>Commitment</th>
                        <th>Outlook with your changes</th>
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
            </details>
          )}
        </>
      ) : (
        <EmptyState
          title="No shared workspace for this profile"
          description="Create one below, or ask a fictional workspace owner to add this demo participant."
        />
      )}
      <details
        className="secondary-details section-gap"
        open={!workspace || search.get("workspace") === "new"}
      >
        <summary>Create another shared workspace</summary>
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
      </details>
      <p className="subtext section-gap">
        Considering a financial separation?{" "}
        <Link className="text-link" href="/deadbolt">
          Financial Separation tools
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
      title="Your sharing choices"
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
            ["readiness", "Share whether I can cover my part"],
            ["coverage", "Share the estimated amount available for my share"],
            ["balance", "Share my account balance"],
            ["bills", "Share my upcoming bills"],
            ["projection", "Share my projected balances"],
          ] as const
        ).map(([k, label]) => (
          <label className="check-row" key={k}>
            <input
              type="checkbox"
              checked={Boolean(value[k])}
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
          <Button disabled={busy}>Save sharing choices</Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              const cleared = {
                readiness: false,
                coverage: false,
                balance: false,
                bills: false,
                projection: false,
                expenseIds: [],
              };
              if (await save(cleared)) setValue(cleared);
            }}
          >
            Stop sharing everything
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
