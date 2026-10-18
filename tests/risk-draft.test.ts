import {test} from "node:test";
import assert from "node:assert/strict";
import {initialState} from "../lib/collaboration/model";
import {payload} from "../app/api/collaboration/route";
import {riskDraft} from "../lib/risk-draft";
test("vacation draft uses actual personal risk, covered commitments and preferences without another member's private data",()=>{
 const s=initialState(),before=JSON.stringify(s),draft=riskDraft(payload(s,"kevin"),"vacation","vacation");
 assert.match(draft,/Kevin & Ava/);assert.match(draft,/\$200.00 short/);assert.match(draft,/\$400.00/);assert.match(draft,/October 27/);assert.match(draft,/Monthly rent and Shared electric utility/);assert.match(draft,/gym membership is non-negotiable/);assert.doesNotMatch(draft,/6200|5900|Ava.*balance/);assert.equal(JSON.stringify(s),before);
});
test("another at-risk group drafts its own obligation and unauthorized groups produce no draft",()=>{
 const s=initialState();s.plans.kevin.simulation={unexpectedCents:100000,unexpectedDate:"2026-10-24"};
 const draft=riskDraft(payload(s,"kevin"),"household","rent");assert.match(draft,/Maple Street Roommates/);assert.match(draft,/Monthly rent/);assert.match(draft,/October 25/);assert.doesNotMatch(draft,/Vacation savings|October 27/);
 assert.equal(riskDraft(payload(s,"ava"),"household","rent"),"");assert.equal(riskDraft(payload(initialState(),"kevin"),"household","rent"),"");
});
