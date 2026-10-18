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
  return <Panel className="section-gap" title="Ways to cover the difference" description="Calculated against your original outlook. Your gym stays in the plan; required bills stay on time.">
    <div className="scenario-options">
      {choices.slice(0, 2).map(option => <article key={option.label}>
        <h3>{option.label}</h3><p>{option.description}</p>
        <p><strong>{formatCurrency(option.beforeCents)} → {formatCurrency(option.afterCents)}</strong> lowest balance</p>
        <p className="subtext">{option.shortfallCents === 0 ? "Your rent contribution looks covered" : `${formatCurrency(option.shortfallCents)} still to cover`} by {option.dueDate}. Estimates only.</p>
        <Button variant="secondary" onClick={() => setSimulation(option.simulation)}>Preview this option</Button>
      </article>)}
    </div>
    <p className="subtext panel-body">Preview changes the chart only. Use “Confirm and update my plan” to save the scenario for Shared Finances. No service is canceled or money moved.</p>
  </Panel>;
}
