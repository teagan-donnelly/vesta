// Frozen fixture for the archived three-profile database schema.
// The active application never imports this adapter or connects to a database.
import { initialState as snapshot, type DemoState } from "../model";
import { shift } from "../../analysis";
export function legacyHousehold(asOf="2026-10-17"):DemoState {
  const s=snapshot(asOf);
  s.workspaces=[{id:"household",name:"Maple Street household",kind:"Household",owner:"ava",members:["ava","kevin"]},{id:"cedar",name:"Cedar Lane household",kind:"Household",owner:"maya",members:["maya"]}];
  s.commitments=[{id:"rent",workspaceId:"household",owner:"ava",name:"Monthly rent",amountCents:200000,dueDate:shift(asOf,10),recurring:true,contributions:[{profile:"ava",expectedCents:100000,reportedCents:100000,agreed:true},{profile:"kevin",expectedCents:100000,reportedCents:0,agreed:true}]},{id:"maya-rent",workspaceId:"cedar",owner:"maya",name:"Cedar Lane rent",amountCents:110000,dueDate:shift(asOf,10),recurring:true,contributions:[{profile:"maya",expectedCents:110000,reportedCents:0,agreed:true}]}];
  s.consents={}; s.plans=Object.fromEntries(Object.entries(s.plans).filter(([id])=>["ava","kevin","maya"].includes(id))) as DemoState["plans"]; return s;
}
