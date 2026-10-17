"use client";
import Link from "next/link";
import { Amount, Badge } from "./ui";
import { dateLabel } from "./activity-table";
import { readinessLabel } from "@/lib/navigation";
import { formatCurrency } from "@/lib/analysis";
import type { PlanningPayload } from "./demo-planning";
type Expense = PlanningPayload["workspaces"][number]["commitments"][number];
export function SharedExpenseSummary({
  expense,
  viewer,
  workspace,
}: {
  expense: Expense;
  viewer: string;
  workspace: string;
}) {
  const own = expense.contributions.find((a) => a.profile === viewer);
  const shortfall =
    own && own.coveredCents != null
      ? Math.max(0, own.expectedCents - own.coveredCents)
      : null;
  const changed = own?.scenarioStatus !== own?.status;
  const query = new URLSearchParams({
    section: "forecast",
    commitment: expense.id,
    workspace,
    event: `bill:shared-${expense.id}`,
  });
  return (
    <div className="shared-expense-summary">
      <div className="shared-key-figures">
        <div>
          <span>Total due</span>
          <strong>
            <Amount cents={expense.amountCents} />
          </strong>
          <time dateTime={expense.dueDate}>
            {dateLabel(expense.dueDate, true)}
          </time>
        </div>
        <div>
          <span>
            {own?.agreed ? "Your agreed share" : "Your proposed share"}
          </span>
          <strong>
            {own ? <Amount cents={own.expectedCents} /> : "Not assigned"}
          </strong>
          {own && (
            <Badge
              tone={
                own.scenarioStatus === "may be at risk"
                  ? "risk"
                  : own.scenarioStatus === "appears achievable"
                    ? "positive"
                    : "neutral"
              }
            >
              {readinessLabel(own.scenarioStatus, "You")}
            </Badge>
          )}
        </div>
      </div>
      {own && (
        <p className={shortfall ? "share-risk" : "share-outlook"}>
          {shortfall ? (
            <>
              Without changes, you may be{" "}
              <strong>{formatCurrency(shortfall)} short</strong> when this
              payment is due.
            </>
          ) : own.status === "appears achievable" ? (
            "Your current outlook suggests you can cover your share. This is an estimate, not a guarantee."
          ) : (
            "We need more information to estimate whether you can cover your share."
          )}
          {changed && (
            <>
              {" "}
              With your changes:{" "}
              <strong>
                {readinessLabel(own.scenarioStatus).toLowerCase()}
              </strong>
              .
            </>
          )}
        </p>
      )}
      <div className="shared-next-action">
        {own && (
          <Link className="button button-primary" href={`/plan?${query}`}>
            {shortfall && !changed
              ? `Find a way to cover ${formatCurrency(shortfall)}`
              : "Explore changes to your plan"}
          </Link>
        )}
        <Link className="text-link" href="/assistant">
          Ask Vesta for help →
        </Link>
      </div>
      <div className="member-outlooks">
        {expense.contributions
          .filter((a) => a.profile !== viewer)
          .map((a) => (
            <p key={a.profile}>
              {a.status === "not shared"
                ? readinessLabel(a.status, a.name)
                : `${a.name}: ${readinessLabel(a.status).toLowerCase()}${a.scenarioStatus !== a.status ? ` · with their changes: ${readinessLabel(a.scenarioStatus).toLowerCase()}` : ""}.`}
            </p>
          ))}
      </div>
      <p className="subtext">
        Estimates and members’ updates are not confirmed payments.
      </p>
    </div>
  );
}
