"use client";
import Link from "next/link";
import { Amount, Badge } from "./ui";
import { dateLabel } from "./activity-table";
import { readinessLabel } from "@/lib/navigation";
import { formatCurrency } from "@/lib/analysis";
import type { PlanningPayload } from "./demo-planning";
type Expense = PlanningPayload["workspaces"][number]["commitments"][number];
const palette = ["#800f1a", "#ce8c91", "#c9aa79"];
export function SharedExpenseSummary({ expense, viewer, workspace }: { expense: Expense; viewer: string; workspace: string }) {
  const own = expense.contributions.find(a => a.profile === viewer);
  const currentCovered = own?.scenarioCoveredCents ?? own?.coveredCents;
  const shortfall = currentCovered != null && own ? Math.max(0,own.expectedCents-currentCovered) : null;
  const changed = own?.scenarioStatus !== own?.status || own?.scenarioCoveredCents !== own?.coveredCents;
  const query = new URLSearchParams({ section: "forecast", commitment: expense.id, workspace, event: `bill:shared-${expense.id}` });
  const slices = expense.contributions.map((a,i) => {
    const start = expense.amountCents ? expense.contributions.slice(0,i).reduce((sum,p)=>sum+p.expectedCents,0)/expense.amountCents*100 : 0;
    const end = start+(expense.amountCents ? a.expectedCents/expense.amountCents*100 : 0);
    return `${palette[i%palette.length]} ${start}% ${end}%`;
  });
  return <div className="shared-expense-summary intelligence-summary">
    <div className="shared-obligation-top">
      <div><span className="eyebrow">SHARED RESPONSIBILITY · PERSONAL PRIVACY</span><h3>{expense.name}</h3><p>Payment deadline <strong>{dateLabel(expense.dueDate,true)}</strong></p></div>
      <Badge tone={shortfall ? "risk" : "neutral"}>{shortfall ? "Your contribution needs attention" : expense.health}</Badge>
    </div>
    <div className="shared-intelligence-grid">
      <div className="agreed-allocation">
        <div className="agreed-ring" style={{ background: `conic-gradient(${slices.join(",")})` }} role="img" aria-label={`Agreed shares of the ${formatCurrency(expense.amountCents)} obligation; not money collected`}><div><strong><Amount cents={expense.amountCents}/></strong><span>Total obligation</span></div></div>
        <p>Agreed allocation, not collected funds</p>
        <div className="allocation-key">{expense.contributions.map((a,i)=><span key={a.profile}><i style={{background:palette[i%palette.length]}}/>{a.name} · {formatCurrency(a.expectedCents)}</span>)}</div>
      </div>
      <div className="shared-personal-intelligence">
        <div className="shared-key-figures">
          <div><span>{own?.agreed ? "Your agreed share" : "Your proposed share"}</span><strong>{own ? <Amount cents={own.expectedCents}/> : "Not assigned"}</strong></div>
          <div><span>Your estimated available</span><strong>{currentCovered != null ? <Amount cents={currentCovered}/> : "Not available"}</strong><small>By {dateLabel(expense.dueDate)}</small></div>
          <div className={shortfall ? "negative" : ""}><span>Your potential shortfall</span><strong>{shortfall !== null ? <Amount cents={shortfall}/> : "Unknown"}</strong><small>{changed?"Saved hypothetical plan":"Original outlook"}</small></div>
        </div>
        {own && <div className={shortfall ? "shared-risk-callout" : "shared-ready-callout"}>
          <strong>{shortfall ? `${formatCurrency(shortfall)} still to cover before ${dateLabel(expense.dueDate)}` : readinessLabel(own.scenarioStatus,"You")}</strong>
          <p>{shortfall ? "Your original outlook falls short of your agreed responsibility. Explore a change without sharing your private finances." : "Your personal outlook stays separate from other members’ finances."}</p>
          {changed && <p>With your changes: <strong>{readinessLabel(own.scenarioStatus).toLowerCase()}</strong>. Original estimate: {own.coveredCents!=null?formatCurrency(own.coveredCents):"Not shared"}. This is hypothetical; bank records are unchanged.</p>}
          <div className="shared-next-action"><Link className="button button-primary" href={`/plan?${query}`}>Explore solutions</Link><Link className="text-link" href={`/assistant?workspace=${workspace}&commitment=${expense.id}`}>Ask Vesta for help →</Link></div>
        </div>}
      </div>
    </div>
    <div className="contribution-board" aria-label="Contribution planning breakdown">
      <div className="contribution-legend"><span><i className="track-agreed"/>Agreed share</span><span><i className="track-reported"/>Member-reported</span><span><i className="track-projected"/>Projected readiness</span><span><i className="track-private"/>Unknown / undisclosed</span></div>
      {expense.contributions.map(a => {
        const reported = a.expectedCents ? Math.min(100,a.reportedCents/a.expectedCents*100) : 0;
        const covered = a.coveredCents != null && a.expectedCents ? Math.min(100,a.coveredCents/a.expectedCents*100) : null;
        return <div className="contribution-member" key={a.profile}>
          <div className="member-name"><span className="member-avatar">{a.name[0]}</span><div><strong>{a.name}{a.profile===viewer ? " · You" : ""}</strong><small>{a.agreed ? "Agreed" : "Proposed"} {formatCurrency(a.expectedCents)}</small></div></div>
          <div><span>Member-reported <strong>{formatCurrency(a.reportedCents)}</strong></span><div className="contribution-track track-agreed"><i className="track-reported" style={{width:`${reported}%`}}/></div><small>Self-reported, not a verified payment</small></div>
          <div><span>Original estimate <strong>{a.coveredCents != null ? formatCurrency(a.coveredCents) : "Not shared"}</strong></span><div className={`contribution-track ${covered===null ? "track-private" : "track-agreed"}`}><i className="track-projected" style={{width:`${covered || 0}%`}}/></div><small>{readinessLabel(a.status,a.name)}{a.scenarioStatus!==a.status ? ` · What-if: ${readinessLabel(a.scenarioStatus).toLowerCase()}` : ""}</small></div>
        </div>;
      })}
    </div>
    <div className="member-outlooks">{expense.contributions.filter(a=>a.profile!==viewer).map(a=><p key={a.profile}>{a.status==="not shared" ? readinessLabel(a.status,a.name) : `${a.name}: ${readinessLabel(a.status).toLowerCase()}${a.scenarioStatus!==a.status ? ` · with their changes: ${readinessLabel(a.scenarioStatus).toLowerCase()}` : ""}.`}</p>)}</div>
    <p className="subtext">{expense.projectedCents===null ? "Household readiness is only partially shared. No total is inferred from private amounts. " : ""}Estimates and members’ reports are not collected, reserved or confirmed payments.</p>
  </div>;
}
