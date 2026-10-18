import type { PlanningPayload } from "../components/demo-planning";
import {formatCurrency} from "./analysis";
export const RISK_DRAFT_KEY="vesta.assistant-draft.v1";
export function riskDraft(data:PlanningPayload,workspaceId:string,commitmentId:string):string {
 const group=data.workspaces.find(w=>w.id===workspaceId),commitment=group?.commitments.find(c=>c.id===commitmentId);
 if(!group || !commitment || commitment.health!=="At Risk")return "";
 const own=commitment.contributions.find(a=>a.profile===data.profile);if(!own)return "";
 const available=own.scenarioCoveredCents ?? own.coveredCents;
 const shortfall=available==null?null:Math.max(0,own.expectedCents-available);
 const deadline=new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",timeZone:"UTC"}).format(new Date(commitment.dueDate+"T00:00:00Z"));
 const covered=data.workspaces.filter(w=>w.id!==workspaceId).flatMap(w=>w.commitments).filter(c=>c.dueDate<=commitment.dueDate && c.contributions.some(a=>a.profile===data.profile && (a.scenarioCoveredCents ?? a.coveredCents ?? -1)>=a.expectedCents)).slice(0,2).map(c=>c.name);
 const preferences=[...new Set([...data.context.preferences,...(data.own.memoryOptIn?data.own.preferences:[])])].slice(0,3).join(" ").slice(0,200);
 return `For ${group.name}, ${shortfall?`I'm projected to fall ${formatCurrency(shortfall)} short of`:`I'd like help planning`} my ${formatCurrency(own.expectedCents)} contribution to ${commitment.name} by ${deadline}.${covered.length?` My other commitments are already projected to be covered: ${covered.join(" and ")}.`:""}${preferences?` My preferences: ${preferences}`:""} What changes could I make to afford this contribution while respecting my priorities?`.slice(0,1000);
}
export function readRiskDraft(profile:string,params?:Pick<URLSearchParams,"get">):string {
 if(typeof window==="undefined")return "";
 const query=params || new URLSearchParams(window.location.search);if(query.get("draft")!=="1")return "";
 try{const draft=JSON.parse(sessionStorage.getItem(RISK_DRAFT_KEY)||"null");return draft?.profile===profile && draft.workspace===query.get("workspace") && draft.commitment===query.get("commitment") && typeof draft.question==="string"?draft.question.slice(0,1000):"";}catch{return "";}
}
