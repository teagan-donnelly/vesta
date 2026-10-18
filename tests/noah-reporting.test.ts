import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {initialState,workspaceView,coverage,consentDefault,personalData,type DemoState} from "../lib/collaboration/model";
import {project} from "../lib/analysis";
import {SharedExpenseSummary} from "../components/shared-expense-summary";
import {POST} from "../app/api/demo-snapshot/route";

test("all roommates can see Noah's calculated coverage without a member report or private financial records",()=>{
 const state=initialState();
 for(const viewer of ["kevin","maya","lily"] as const){
  const view=workspaceView(state,"household",viewer);
  assert.ok(view.commitments.every(c=>c.health==="On Track"));
  for(const c of view.commitments){
   const noah=c.contributions.find(a=>a.profile==="noah")!;
   assert.equal(noah.reportedCents,null);
   assert.equal(noah.coveredCents,c.id==="rent"?60000:10000);
   assert.equal(noah.coveredCents,coverage(state,"noah").get(`${c.id}:${c.dueDate}`)!.coveredCents);
   assert.equal(noah.disclosedBalanceCents,undefined);assert.equal(noah.disclosedBills,undefined);assert.equal(noah.disclosedProjection,undefined);assert.deepEqual(noah.disclosedExpenses,[]);
   const dom=new JSDOM(renderToStaticMarkup(createElement(SharedExpenseSummary,{expense:c,viewer,workspace:"household"})));
   const row=[...dom.window.document.querySelectorAll(".contribution-member")].find(e=>e.querySelector(".member-name")!.textContent!.includes("Noah"))!;
   assert.match(row.textContent!,/Member-reported Not reported/);assert.match(row.textContent!,/Predicted estimate \$(600|100)\.00/);assert.doesNotMatch(row.textContent!,/Original estimate|\$0\.00/);
   dom.window.close();
  }
 }
 const trip=workspaceView(state,"vacation","kevin").commitments[0];
 assert.equal(trip.health,"At Risk");assert.equal(trip.contributions[0].coveredCents,20000);assert.equal(project(personalData(state,"kevin")).lowestBalanceCents,-20000);
 // A changed hypothetical expense changes Noah's calculated readiness, proving
 // these are engine projections rather than display-only fixed amounts.
 state.plans.noah.simulation={unexpectedCents:650000,unexpectedDate:"2026-10-18"};
 assert.equal(coverage(state,"noah",true).get("rent:2026-10-25")!.coveredCents,0);
});

test("recipient revocation hides Noah's estimate only for that recipient",()=>{
 const s=initialState();s.consents["household:noah:lily"]=consentDefault();
 assert.equal(workspaceView(s,"household","lily").commitments[0].contributions.find(a=>a.profile==="noah")!.coveredCents,undefined);
 assert.equal(workspaceView(s,"household","kevin").commitments[0].contributions.find(a=>a.profile==="noah")!.coveredCents,60000);
});

test("snapshot upgrade, explicit zero reporting, refresh and reset preserve the report/prediction distinction",async()=>{
 let state:DemoState=initialState();state.snapshotRevision=3;
 for(const c of state.commitments.filter(c=>c.workspaceId==="household")){const a=c.contributions.find(a=>a.profile==="noah")!;delete a.hasReported;a.reportedCents=a.expectedCents;}
 state.consents["household:noah"].coverage=false;
 state.consents["household:noah:lily"]=consentDefault();
 const records=structuredClone(state.plans.kevin.recordSets),permissions=structuredClone(state.consents["vacation:kevin:ava"]);
 const session=randomUUID();
 async function call(profile:string,body?:object){const r=await POST(new Request("https://vesta.example/api/demo-snapshot",{method:"POST",headers:{origin:"https://vesta.example"},body:JSON.stringify({version:1,session,state,path:`/api/collaboration?profile=${profile}`,method:body?"POST":"GET",body:body?{...body,confirmed:true}:undefined})}));assert.equal(r.status,200);const v=await r.json();assert.equal(v.status,200);state=JSON.parse(JSON.stringify(v.state));return v.result;}
 const migrated=await call("kevin");assert.equal(state.snapshotRevision,4);
 assert.equal(migrated.workspaces[0].commitments[0].contributions.find((a:{profile:string})=>a.profile==="noah").reportedCents,null);
 assert.deepEqual(state.plans.kevin.recordSets,records);assert.deepEqual(state.consents["vacation:kevin:ava"],permissions);assert.deepEqual(state.consents["household:noah:lily"],consentDefault());
 await call("noah",{action:"report",id:"rent",amountCents:0});
 let refreshed=await call("kevin");let noah=refreshed.workspaces[0].commitments[0].contributions.find((a:{profile:string})=>a.profile==="noah");
 assert.equal(noah.reportedCents,0);assert.equal(noah.coveredCents,60000);
 state=initialState();refreshed=await call("kevin");
 for(const c of refreshed.workspaces[0].commitments){noah=c.contributions.find((a:{profile:string})=>a.profile==="noah");assert.equal(noah.reportedCents,null);assert.equal(noah.coveredCents,c.id==="rent"?60000:10000);}
});
