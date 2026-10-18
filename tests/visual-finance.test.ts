import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { historyView } from "../lib/history-view";
import { initialState, personalData, workspaceView } from "../lib/collaboration/model";
import { project } from "../lib/analysis";
import { planningOptions } from "../lib/planning-options";
import { SharedExpenseSummary } from "../components/shared-expense-summary";
import { ScenarioComparison } from "../components/scenario-comparison";

test("historical windows use inclusive completed records, category sums reconcile and future plans never enter charts", () => {
  const data=personalData(initialState(),"kevin");
  const view=historyView(data,30);
  assert.equal(view.start,"2026-09-18"); assert.equal(view.end,"2026-10-17");
  assert.equal(view.balances.length,30); assert.equal(view.spending.length,30);
  const expected=data.transactions.filter(t=>!t.pending && t.date>="2026-09-18" && t.date<="2026-10-17" && t.amountCents<0).reduce((sum,t)=>sum-t.amountCents,0);
  assert.equal(view.spendingCents,expected);
  for(const row of view.spending) assert.equal(view.series.reduce((sum,s)=>sum+Number(row[s.key]),0),row.total);
  assert.equal(historyView(data,7).balances.length,7);
  assert.equal(historyView(data,60).balances.length,60);
  assert.equal(view.balances.at(-1)!.value,data.accounts[0].balanceCents);
  assert.ok(view.spending.every(p=>p.date<=data.asOf));
});

test("a source without historical balances stays empty rather than acquiring a fabricated trend", () => {
  const data=personalData(initialState(),"kevin");data.source="nessie";delete data.balanceHistory;
  assert.deepEqual(historyView(data,30).balances,[]);
});

test("shared visualizations never reveal undisclosed amounts through labels, bars or household aggregates", () => {
  const state=initialState();
  state.consents['household:kevin']={readiness:true,coverage:false,balance:false,expenseIds:[]};
  const expense=workspaceView(state,'household','ava').commitments[0];
  const html=renderToStaticMarkup(createElement(SharedExpenseSummary,{expense,viewer:'ava',workspace:'household'}));
  assert.doesNotMatch(html,/\$800\.00|\$200\.00|\$1,420\.00|Optional studio|Professional certification/);
  assert.match(html,/Not shared/); assert.match(html,/Household readiness is only partially shared/);
  assert.match(html,/not collected/);
  const own=renderToStaticMarkup(createElement(SharedExpenseSummary,{expense:workspaceView(state,'household','kevin').commitments[0],viewer:'kevin',workspace:'household'}));
  assert.match(own,/\$800\.00/); assert.match(own,/\$200\.00/);
});

test("the outcome comparison uses uncapped deadline cash improvement, not the capped contribution increase", () => {
  const data=personalData(initialState(),'kevin'), baseline=project(data), copy=structuredClone(baseline);
  const scenario=project(data,planningOptions(data)[0].simulation);
  const html=renderToStaticMarkup(createElement(ScenarioComparison,{baseline,scenario,deadline:'2026-10-27'}));
  assert.match(html,/\$200\.00/); assert.match(html,/\$130\.00/); assert.match(html,/\+\$330\.00/);
  assert.deepEqual(baseline,copy);
});
