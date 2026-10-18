"use client";
import type {PlanningPayload} from "./demo-planning";
import {Amount} from "./ui";
import {dateLabel} from "./activity-table";
type Workspace=PlanningPayload["workspaces"][number];
export function RelationshipDisclosures({workspace,viewer}:{workspace:Workspace;viewer:string}) {
 const members=workspace.commitments[0]?.contributions.filter(a=>a.profile!==viewer)||[];
 const deadline=workspace.commitments.map(c=>c.dueDate).sort().at(-1);
 return <section className="relationship-disclosures" aria-label="Relationship-specific disclosure"><h2>Shared with you in this relationship</h2><p>Each person controls what you can see. Permission in another group grants no access here. Fictional identity switching is a demonstration, not authentication.</p><div>{members.map(a=>{
 const point=a.disclosedProjection?.find(p=>p.date===deadline);
 return <article key={a.profile} aria-label={`${a.name} authorized details`}><h3>{a.name}</h3><dl><div><dt>Current account balance</dt><dd>{a.disclosedBalanceCents===undefined?"Private":<Amount cents={a.disclosedBalanceCents}/>}</dd></div><div><dt>Projected balance {deadline?`· ${dateLabel(deadline)}`:""}</dt><dd>{point?<Amount cents={point.balanceCents}/>:"Private"}</dd></div></dl>{a.disclosedBills?<details><summary>Authorized upcoming bills · {a.disclosedBills.length}</summary>{a.disclosedBills.map(b=><p key={b.id}>{b.name} · {dateLabel(b.dueDate)} · <Amount cents={b.amountCents}/></p>)}</details>:<p>Upcoming bills: Private</p>}<small>Contribution readiness: {a.scenarioStatus==="not shared"?"Private":"Shared"}. Transactions remain private except individually disclosed records.</small></article>;
 })}</div></section>;
}
