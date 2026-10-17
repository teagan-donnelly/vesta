"use client";
import { useState } from "react";
import { Download } from "lucide-react";
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
  Button,
  EmptyState,
  Notice,
} from "@/components/ui";
import { ReviewChecklist } from "@/components/review-checklist";
import { dateLabel } from "@/components/activity-table";
import { forecastEvents } from "@/lib/analysis";
export default function ContinuityPage() {
  const { data } = useFinancial();
  const [contact, setContact] = useState("");
  const [instructions, setInstructions] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  if (!data)
    return (
      <AegisShell
        title="Emergency Planning"
        subtitle="Keep essential financial obligations clear when life is interrupted."
      >
        <FinancialLoading />
      </AegisShell>
    );
  const obligations = forecastEvents(data).filter((e) => e.amountCents < 0);
  function exportPlan() {
    if (!data) return;
    const plan = {
      preparedOn: data.asOf,
      dataSource: data.source,
      fictional: true,
      trustedContact: contact || "Not provided",
      instructions: instructions || "Not provided",
      upcomingObligations: obligations.map((e) => ({
        name: e.label,
        date: e.date,
        amountCents: -e.amountCents,
      })),
      note: "Planning information only. No authority over accounts or payment actions is created.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vesta-continuity-${data.asOf}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }
  return (
    <AegisShell
      title="Emergency Planning"
      subtitle="Keep essential financial obligations clear when life is interrupted."
      actions={
        <Button variant="secondary" onClick={exportPlan}>
          <Download size={13} />
          Download plan
        </Button>
      }
    >
      {downloaded && (
        <div role="status">
          <Notice tone="positive">
            Your plan was prepared for download. Keep the file in a place you
            trust.
          </Notice>
        </div>
      )}
      <MetricGrid
        items={[
          {
            label: "Upcoming obligations",
            value: obligations.length,
            note: "Known and inferred · next 30 days",
          },
          {
            label: "Payments to prepare for",
            value: (
              <Amount
                cents={obligations.reduce((s, e) => s - e.amountCents, 0)}
              />
            ),
            note: "Based on the selected financial records",
          },
          {
            label: "Trusted contact",
            value: contact ? "Entered" : "Not set",
            note: "Provided by you, not inferred from bank data",
          },
          {
            label: "Plan status",
            value: "Draft",
            note: "No payment authority or account access created",
          },
        ]}
      />
      <div className="dashboard-grid">
        <div className="section-stack">
          <Panel
            title="Keep essential payments visible"
            description="Share clear instructions, not credentials."
          >
            {obligations.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Obligation</th>
                      <th scope="col">Date</th>
                      <th scope="col" className="align-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {obligations.map((e) => (
                      <tr key={`${e.id}:${e.date}`}>
                        <td>
                          {e.label}
                          <span className="subtext">
                            {e.id.startsWith("bill:")
                              ? "Scheduled payment"
                              : "Recurring estimate"}
                          </span>
                        </td>
                        <td>{dateLabel(e.date)}</td>
                        <td className="align-right">
                          <Amount cents={-e.amountCents} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No upcoming obligations available"
                description="Add payment instructions from your own statements before relying on an emergency plan."
              />
            )}
          </Panel>
          <Panel
            title="Your emergency instructions"
            description="Optional planning notes. Entries remain unsaved until you download the plan."
            action={<Badge>Draft</Badge>}
          >
            <div className="panel-body section-stack">
              <label className="field">
                <span>Trusted contact</span>
                <input
                  autoComplete="off"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    setDownloaded(false);
                  }}
                  placeholder="Name and preferred contact details"
                  maxLength={300}
                />
                <small>
                  This field does not grant account access or send a
                  notification.
                </small>
              </label>
              <label className="field">
                <span>Financial instructions</span>
                <textarea
                  value={instructions}
                  onChange={(e) => {
                    setInstructions(e.target.value);
                    setDownloaded(false);
                  }}
                  placeholder="Which payments matter first? Where are the relevant instructions?"
                  maxLength={4000}
                />
                <small>
                  Do not include passwords, API keys, or complete account
                  numbers.
                </small>
              </label>
            </div>
          </Panel>
        </div>
        <Panel
          title="Preparedness checklist"
          description="A few decisions now can make a difficult week easier."
        >
          <ReviewChecklist
            items={[
              {
                title: "Identify essential obligations",
                detail:
                  "Review housing, utilities, insurance, and debt payments that may fall due.",
              },
              {
                title: "Confirm payment arrangements",
                detail:
                  "Check due dates and available payment options directly with each provider.",
              },
              {
                title: "Choose a trusted contact",
                detail:
                  "Agree on how they can help and where your instructions can be found.",
              },
              {
                title: "Store instructions securely",
                detail:
                  "Use a secure location and review the plan after important household changes.",
              },
            ]}
          />
        </Panel>
      </div>
    </AegisShell>
  );
}
