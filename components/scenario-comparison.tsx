"use client";
import type { CashFlowProjection } from "@/lib/types";
import { dateLabel } from "./activity-table";
import { Amount } from "./ui";
export function ScenarioComparison({ baseline, scenario, deadline }: { baseline: CashFlowProjection; scenario: CashFlowProjection; deadline: string }) {
  const before = baseline.points.find(p=>p.date===deadline), after = scenario.points.find(p=>p.date===deadline);
  if (!before || !after) return null;
  return <section className="scenario-outcome" aria-label="Scenario outcome comparison">
    <div className="outcome-before"><span className="eyebrow">BEFORE · ORIGINAL OUTLOOK</span><strong><Amount cents={Math.max(0,-before.balanceCents)}/></strong><p>Projected shortage at the {dateLabel(deadline)} deadline</p></div>
    <div className="outcome-after"><span className="eyebrow">AFTER · YOUR HYPOTHETICAL PLAN</span><strong className={scenario.lowestBalanceCents<0 ? "negative" : "positive"}><Amount cents={scenario.lowestBalanceCents}/></strong><p>Projected minimum balance · {dateLabel(scenario.lowestBalanceDate)}</p></div>
    <div className="outcome-difference"><span className="eyebrow">DEADLINE IMPROVEMENT</span><strong><Amount cents={after.balanceCents-before.balanceCents} signed/></strong><p>More cash by {dateLabel(deadline)}. Your original forecast stays unchanged.</p></div>
  </section>;
}
