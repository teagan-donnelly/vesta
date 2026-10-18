import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {initialState,personalData,workspaceView,coverage,consentDefault,profiles,type DemoState} from "../lib/collaboration/model";
import {project,forecastEvents} from "../lib/analysis";
import {planningOptions} from "../lib/planning-options";
import {historyView,expenseChartRows,expenseAxisCents} from "../lib/history-view";
import {POST} from "../app/api/demo-snapshot/route";
import {assistant} from "../lib/collaboration/assistant";

test("four roommates, two Kevin relationships, healthy housing and calculated vacation gap without spending rent twice",()=>{
 const s=initialState(),data=personalData(s,"kevin"),room=workspaceView(s,"household","kevin"),trip=workspaceView(s,"vacation","kevin");
 assert.deepEqual(room.members,["kevin","maya","noah","lily"]);assert.deepEqual(trip.members,["kevin","ava"]);
 assert.equal(s.asOf,"2026-10-17");assert.ok(room.commitments.every(c=>c.health==="On Track"));assert.equal(trip.commitments[0].health,"At Risk");
 assert.equal(coverage(s,"kevin").get("rent:2026-10-25")!.coveredCents,60000);
 assert.equal(coverage(s,"kevin").get("utilities:2026-10-19")!.coveredCents,10000);
 assert.equal(coverage(s,"kevin").get("vacation:2026-10-27")!.coveredCents,20000);
 assert.equal(project(data).lowestBalanceCents,-20000);
 assert.equal(forecastEvents(data).filter(e=>e.merchantKey==="electricutility").length,1);
 assert.equal(forecastEvents(data).filter(e=>e.id==="bill:shared-rent").length,1);
 const beforeTrip=forecastEvents(data).filter(e=>e.date<="2026-10-27" && e.id!=="bill:shared-vacation");
 assert.equal(data.accounts[0].balanceCents+beforeTrip.reduce((sum,e)=>sum+e.amountCents,0),20000);
});

test("only Maya discloses a balance to Kevin; reciprocal vacation details never reach roommates or unrelated workspaces",()=>{
 const s=initialState(),room=workspaceView(s,"household","kevin");
 const others=room.commitments[0].contributions.filter(a=>a.profile!=="kevin");
 assert.deepEqual(others.filter(a=>a.disclosedBalanceCents!==undefined).map(a=>a.profile),["maya"]);
 for(const a of others){assert.equal(a.disclosedBills,undefined);assert.equal(a.disclosedProjection,undefined);assert.deepEqual(a.disclosedExpenses,[]);}
 assert.equal(room.commitments[0].projectedCents,null);
 for(const [viewer,owner] of [["kevin","ava"],["ava","kevin"]] as const){
  const member=workspaceView(s,"vacation",viewer).commitments[0].contributions.find(a=>a.profile===owner)!;
  assert.equal(member.disclosedBalanceCents,personalData(s,owner).accounts[0].balanceCents);
  assert.ok(member.disclosedBills!.length);assert.deepEqual(member.disclosedProjection,project(personalData(s,owner)).points.map(p=>({date:p.date,balanceCents:p.balanceCents})));
 }
 const mayaView=workspaceView(s,"household","maya"),noahView=workspaceView(s,"household","noah");
 assert.doesNotMatch(JSON.stringify(mayaView),/142000|planned-headphones|kevin-course|vacation|fictional-kevin/);
 assert.equal(noahView.commitments[0].contributions.find(a=>a.profile==="maya")!.disclosedBalanceCents,undefined);
 assert.throws(()=>workspaceView(s,"vacation","maya"));assert.throws(()=>workspaceView(s,"household","ava"));
});

test("confirmed scenario resolves vacation while roommate readiness and original records remain unchanged",()=>{
 const s=initialState(),original=personalData(s,"kevin"),before=structuredClone(original),baseline=project(original),rent=coverage(s,"kevin").get("rent:2026-10-25");
 for(const option of planningOptions(original).slice(0,2)){
  s.plans.kevin.simulation=option.simulation;
  assert.equal(workspaceView(s,"vacation","kevin").commitments[0].health,"On Track");
  assert.deepEqual(coverage(s,"kevin",true).get("rent:2026-10-25"),rent);
  assert.equal(coverage(s,"kevin",true).get("vacation:2026-10-27")!.coveredCents,40000);
  assert.equal(coverage(s,"kevin").get("vacation:2026-10-27")!.coveredCents,20000);
  assert.deepEqual(personalData(s,"kevin"),before);assert.deepEqual(project(original),baseline);
 }
 s.plans.kevin.simulation={unexpectedCents:100000,unexpectedDate:"2026-10-24"};
 assert.equal(workspaceView(s,"household","kevin").commitments.find(c=>c.id==="rent")!.health,"At Risk");
});

test("recipient changes and revocation persist through stateless API round trips without affecting other recipients",async()=>{
 let state:DemoState=initialState();const session=randomUUID();
 async function call(profile:string,body?:object){const r=await POST(new Request("https://vesta.example/api/demo-snapshot",{method:"POST",headers:{origin:"https://vesta.example"},body:JSON.stringify({version:1,session,state,path:`/api/collaboration?profile=${profile}`,method:body?"POST":"GET",body:body?{...body,confirmed:true}:undefined})}));assert.equal(r.status,200);const v=await r.json();state=JSON.parse(JSON.stringify(v.state));return v;}
 let v=await call("kevin",{action:"consent",workspaceId:"vacation",recipient:"ava",consent:consentDefault()});assert.equal(v.status,200);
 v=await call("ava");const kevin=v.result.workspaces[0].commitments[0].contributions.find((a:{profile:string})=>a.profile==="kevin");
 assert.equal(kevin.status,"not shared");assert.equal(kevin.disclosedBalanceCents,undefined);assert.equal(kevin.disclosedBills,undefined);assert.equal(kevin.disclosedProjection,undefined);assert.equal(v.result.workspaces[0].commitments[0].scenarioProjectedCents,null);
 v=await call("kevin",{action:"consent",workspaceId:"household",recipient:"maya",consent:{...consentDefault(),balance:true}});assert.equal(v.status,200);
 assert.equal(workspaceView(state,"household","maya").commitments[0].contributions[0].disclosedBalanceCents,142000);
 assert.equal(workspaceView(state,"household","noah").commitments[0].contributions[0].disclosedBalanceCents,undefined);
 assert.equal((await call("kevin",{action:"consent",workspaceId:"household",recipient:"ava",consent:{...consentDefault(),balance:true}})).status,400);
 assert.equal((await call("ava",{action:"consent",workspaceId:"household",recipient:"kevin",consent:consentDefault()})).status,400);
 assert.equal(workspaceView(initialState(),"vacation","ava").commitments[0].contributions[0].disclosedBalanceCents,142000);
});

test("all five fictional ledgers reconcile and profile records stay distinct",()=>{
 const s=initialState();for(const p of profiles){const d=personalData(s,p.id),h=d.balanceHistory!;assert.ok(h.every(x=>x.value>=0));assert.equal(h.at(-1)!.value,d.accounts[0].balanceCents);assert.ok(d.transactions.every(t=>t.accountId===`fictional-${p.id}`));assert.ok(s.plans[p.id].recordSets![`demo:demo:${p.id}`].some(r=>r.kind==="credit"));}
});

test("vacation assistant uses its actual deadline and scheduled purchase while honoring gym preferences",async t=>{
 const env={...process.env};delete process.env.GEMINI_API_KEY;delete process.env.BACKBOARD_API_KEY;t.after(()=>{process.env=env;});
 const s=initialState();s.plans.kevin.preferences=["My gym is non-negotiable."];
 const reply=await assistant(s,"kevin","Help me resolve my vacation shortfall and protect rent; keep my gym.","en","multi-group");
 assert.equal(reply.proposal!.simulation.eventId,"pending:planned-headphones");assert.equal(reply.proposal!.afterCents,13000);assert.match(reply.reply,/gym.*respected/);assert.deepEqual(s.plans.kevin.simulation,{});
});

test("zero-preserving log rendering keeps all dates and exact original cents",()=>{
 const data=personalData(initialState(),"kevin");data.transactions=data.transactions.filter(t=>t.date!=="2026-10-16");
 const view=historyView(data,7),before=structuredClone(view);
 const linear=expenseChartRows(view,false),log=expenseChartRows(view,true);
 assert.deepEqual(log.map(r=>r.date),linear.map(r=>r.date));assert.deepEqual(log.map(r=>r.original),linear.map(r=>r.original));
 for(let i=0;i<log.length;i++)for(const series of view.series){const cents=Number(linear[i].original[series.key]),y=Number((log[i] as Record<string,unknown>)[series.key]);assert.equal(expenseAxisCents(y,true),cents);if(cents===0)assert.equal(y,0);}
 assert.equal(view.spending.find(r=>r.date==="2026-10-16")!.total,0);assert.equal(view.spending.length,7);assert.deepEqual(view,before);
});
