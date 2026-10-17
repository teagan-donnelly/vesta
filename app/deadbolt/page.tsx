"use client";
import Link from "next/link";
import { useState } from "react";
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
import { ReviewChecklist } from "@/components/review-checklist";
import { dateLabel } from "@/components/activity-table";
export default function DeadboltPage() {
  const { data } = useFinancial();
  const [review, setReview] = useState<string[]>([]);
  if (!data)
    return (
      <AegisShell
        title="Deadbolt"
        subtitle="A practical plan for financial independence during a life transition."
      >
        <FinancialLoading />
      </AegisShell>
    );
  return (
    <AegisShell
      title="Deadbolt"
      subtitle="A practical plan for financial independence during a life transition."
      actions={
        <Link className="button button-secondary" href="/domino">
          Plan your next budget <ArrowUpRight size={13} />
        </Link>
      }
    >
      <Notice>
        Shared ownership and account access are not established by your
        financial records. Mark obligations you want to review; selections do
        not change payments or permissions.
      </Notice>
      <Notice>
        <p>
          For collaborative planning, review your{" "}
          <Link href="/shared">
            shared commitments and disclosure permissions
          </Link>
          . Agree on responsibility before a transition. Vesta never transfers
          obligations or removes participants automatically.
        </p>
      </Notice>
      <MetricGrid
        items={[
          {
            label: "Accounts to consider",
            value: data.accounts.length,
            note: "From the current financial profile",
          },
          {
            label: "Known obligations",
            value: data.bills.length,
            note: "Review responsibility with each provider",
          },
          {
            label: "Marked for review",
            value: review.length,
            note: "Your selections on this page",
          },
          {
            label: "Shared ownership",
            value: "Unverified",
            note: "Requires confirmation outside Vesta",
          },
        ]}
      />
      <div className="dashboard-grid">
        <Panel
          title="Review financial connections"
          description="Known obligations that may need a conversation or an access review."
        >
          {data.bills.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Review</th>
                    <th scope="col">Obligation</th>
                    <th scope="col">Due</th>
                    <th scope="col" className="align-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.bills.map((bill) => (
                    <tr key={bill.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Review responsibility for ${bill.name}`}
                          checked={review.includes(bill.id)}
                          onChange={(e) =>
                            setReview(
                              e.target.checked
                                ? [...review, bill.id]
                                : review.filter((id) => id !== bill.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <strong style={{ fontWeight: 500 }}>{bill.name}</strong>
                        <span className="subtext">
                          Payment responsibility not verified
                        </span>
                      </td>
                      <td>{dateLabel(bill.dueDate)}</td>
                      <td className="align-right">
                        <Amount cents={bill.amountCents} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No obligations available to review"
              description="Use your provider statements to identify any shared payments or accounts. Vesta will list dated bills when they are returned."
            />
          )}
          <div className="panel-body" style={{ paddingTop: 16 }}>
            <p className="subtext">
              Review selections are not saved. No account access or bank records
              are modified.
            </p>
          </div>
        </Panel>
        <Panel
          title="Separation checklist"
          description="Work through the details at your own pace."
        >
          <ReviewChecklist
            items={[
              {
                title: "Confirm responsibilities",
                detail:
                  "Discuss who is responsible for each bill, subscription, and debt.",
              },
              {
                title: "Review account access",
                detail:
                  "Check authorized users, recovery contacts, and shared credentials with your providers.",
              },
              {
                title: "Update payment arrangements",
                detail:
                  "Confirm new payment methods and due dates before stopping a shared arrangement.",
              },
              {
                title: "Build a personal cash plan",
                detail:
                  "Use Domino to compare the timing and cost of your next financial commitments.",
              },
            ]}
          />
        </Panel>
      </div>
      <Panel
        title="Accounts in this profile"
        description="Account presence does not establish ownership rights or shared access."
        className="section-gap"
      >
        {data.accounts.map((account) => (
          <div key={account.id} className="structured-row">
            <div>
              <strong style={{ fontSize: 14, fontWeight: 500 }}>
                {account.name}
              </strong>
              <span className="subtext">{account.type}</span>
            </div>
            <Badge>Access not verified</Badge>
          </div>
        ))}
        {!data.accounts.length && (
          <EmptyState
            title="No accounts returned"
            description="Select a financial profile to review available accounts."
          />
        )}
      </Panel>
    </AegisShell>
  );
}
