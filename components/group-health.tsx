"use client";
import Link from "next/link";
import { useDemoPlanning, type PlanningPayload } from "./demo-planning";
import { useFinancial } from "./financial-provider";
import { Amount, Badge } from "./ui";
import { dateLabel } from "./activity-table";
export function GroupHealthCards({data, compact=false}: {data:PlanningPayload; compact?:boolean}) {
  return <section className={`group-health${compact ? " group-health-compact" : ""}`} aria-label="Group Health"><div className="group-health-heading"><h2>Group Health</h2><p>Different commitments. Relationship-specific sharing.</p></div><div className="group-health-grid">{data.workspaces.map(w=> {
    const risk=w.commitments.some(c=>c.health === "At Risk"), known=w.commitments.every(c=>c.health === "On Track");
    return <article key={w.id} className={risk?"group-health-card at-risk":"group-health-card"}>
      <div className="group-health-title"><h3>{w.name}</h3><Badge tone={risk?"risk":"neutral"}>{risk?"At Risk":known?"On Track":"Not fully shared"}</Badge></div>
      <p>{w.members.map(id=>data.profiles.find(p=>p.id===id)?.name).join(" · ")}</p>
      {w.commitments.map(c=>{const own=c.contributions.find(a=>a.profile===data.profile);return <div className="group-commitment" key={c.id}><strong>{c.name} · {dateLabel(c.dueDate)}</strong><div><span>Your agreed share <Amount cents={own?.expectedCents || 0}/></span><span>Projected readiness {own?.scenarioCoveredCents==null?"Unknown":<Amount cents={own.scenarioCoveredCents}/>}</span></div>{own?.scenarioCoveredCents!=null&&<progress aria-label={`${c.name} readiness`} value={own.scenarioCoveredCents} max={own.expectedCents}/>}</div>})}
      <p className="subtext">{w.id==="vacation"?"Vacation readiness is calculated after rent, utilities and other scheduled spending. Detailed sharing is authorized only for this relationship.":"Readiness is shared; individual finances remain private unless each member authorizes more."}</p>
      <div className="inline-actions"><Link className="text-link" href={`/shared?workspace=${w.id}`}>Group details →</Link>{risk&&<Link className="button button-primary" href={`/assistant?workspace=${w.id}&commitment=${w.commitments.find(c=>c.health==="At Risk")?.id}`}>Explore Solutions with Vesta</Link>}</div>
    </article>;
  })}</div></section>;
}
function PersonalGroupHealth({profile}:{profile:string}) {const {data,error}=useDemoPlanning(profile);return data?<GroupHealthCards data={data} compact/>:<p className="subtext">{error?"Group Health is unavailable; personal finances remain available.":"Loading group readiness…"}</p>;}
export function HomeGroupHealth() {const {mode,customer}=useFinancial();return mode==="demo"&&customer.startsWith("demo:")?<PersonalGroupHealth key={customer} profile={customer.slice(5)}/>:null;}
