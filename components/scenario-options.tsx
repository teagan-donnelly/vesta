"use client";
import { planningOptions } from "@/lib/planning-options";
import { formatCurrency } from "@/lib/analysis";
import { useFinancial } from "./financial-provider";
import { Button, Panel } from "./ui";
export function ScenarioOptions() {
  const { data, setSimulation } = useFinancial();
  if (!data) return null;
  const choices = planningOptions(data);
  if (!choices.length) return null;
  return <Panel className="section-gap recommended-options" title="Ways to cover the difference" description="Your gym stays. Required bills stay on time. Preview an option, then confirm if you want to save it.">
    <div className="scenario-options">
      {choices.slice(0, 2).map(option => <article key={option.label}>
        <h3>{option.label}</h3>
        <p><strong>{formatCurrency(option.beforeCents)} → {formatCurrency(option.afterCents)}</strong> lowest balance</p>
        <p className="subtext">{option.shortfallCents === 0 ? "Your contribution looks covered" : `${formatCurrency(option.shortfallCents)} still to cover`} by {option.dueDate}. Estimates only.</p>
        <Button variant="secondary" onClick={() => setSimulation(option.simulation)}>Preview this option</Button>
        <details><summary>Dates & details</summary><p>{option.description}</p></details>
      </article>)}
    </div>
    <p className="subtext options-disclaimer">Hypothetical only. No service is canceled, payment postponed, or money moved.</p>
  </Panel>;
}
