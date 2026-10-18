import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, personalData, fixtureData, coverage, workspaceView } from "../lib/collaboration/model";
import { forecastEvents, project, subscriptionsFor } from "../lib/analysis";
import { financialTotals, spendingCategories, expenseDays, applyPersonalRecords } from "../lib/management";
import { financialWarning } from "../lib/financial-guidance";
import { paymentReadiness, planningOptions } from "../lib/planning-options";
import { assistant } from "../lib/collaboration/assistant";

test("three distinct 60-day ledgers reconcile opening cash, completed activity, closing balances and dashboard totals", () => {
  const state = initialState();
  const merchants = new Set<string>();
  for (const profile of ["ava", "kevin", "maya"] as const) {
    const data = personalData(state, profile), completed = data.transactions.filter(t => !t.pending);
    const history = data.balanceHistory!;
    assert.equal(history.length, 61);
    assert.equal(history[0].date, "2026-08-18");
    assert.equal(history.at(-1)!.date, "2026-10-17");
    assert.ok(history.every(p => Number.isSafeInteger(p.value) && p.value >= 0));
    assert.equal(history[0].value + completed.reduce((sum,t) => sum+t.amountCents,0), data.accounts[0].balanceCents);
    assert.equal(history.at(-1)!.value, data.accounts[0].balanceCents);
    for (let i=1; i<history.length; i++) assert.equal(history[i].value-history[i-1].value, completed.filter(t=>t.date===history[i].date).reduce((sum,t)=>sum+t.amountCents,0));
    const totals = financialTotals(data);
    assert.equal(totals.spending, spendingCategories(data).reduce((sum,c)=>sum+c.value,0));
    assert.equal(totals.spending, expenseDays(data).reduce((sum,p)=>sum+p.value,0));
    assert.equal(totals.savings, totals.income-totals.spending);
    assert.ok(totals.income>0);
    assert.ok(spendingCategories(data).length>=5);
    assert.ok(completed.length>=70);
    assert.ok(subscriptionsFor(data).every(s=>!/rent/i.test(s.merchant)));
    const grocery = completed.find(t=>t.category==='Groceries')!.merchant;
    assert.ok(!merchants.has(grocery)); merchants.add(grocery);
    assert.ok(state.plans[profile].recordSets![`demo:demo:${profile}`].filter(r=>r.kind==='budget').length>=3);
  }
  assert.deepEqual(financialTotals(personalData(state,"kevin")), { income:180000, spending:383609, savings:-203609 });
});

test("known semimonthly payroll never invents a biweekly deposit on the rent deadline", () => {
  const data=personalData(initialState(),"kevin"), events=forecastEvents(data);
  assert.deepEqual(events.filter(e=>e.kind==='income').map(e=>[e.date,e.amountCents]), [['2026-10-28',180000],['2026-11-13',180000]]);
  assert.equal(events.filter(e=>e.id==='bill:shared-rent').length,1);
  assert.equal(events.filter(e=>e.id==='bill:utility').length,1);
});

test("Kevin's $200 rent gap is derived from $1420 cash less $620 before his $1000 rent share", () => {
  const data=personalData(initialState(),"kevin"), risk=financialWarning(data)!;
  assert.equal(risk.date,'2026-10-27');
  assert.equal(risk.precedingExpensesCents,62000);
  assert.equal(risk.precedingIncomeCents,0);
  assert.equal(risk.availableCents,80000);
  assert.equal(risk.shortfallCents,20000);
  assert.equal(risk.nextIncomeDate,'2026-10-28');
  assert.equal(project(data).lowestBalanceCents,-20000);
});

test("both proposed solutions close the rent gap exactly, keep the gym and preserve the original ledger and baseline", () => {
  const state=initialState(), data=personalData(state,'kevin'), before=structuredClone(data), baseline=project(data);
  const options=planningOptions(data);
  assert.equal(options[0].simulation.eventId,'pending:planned-headphones');
  assert.equal(options[0].simulation.delayDays,6);
  assert.equal(options[0].afterCents,13000);
  assert.equal(options[1].afterCents,1000);
  assert.equal(options[1].simulation.paymentCents,18000);
  const rent = (simulation = {}) => project(data, simulation).points.find(p=>p.date==='2026-10-27')!.balanceCents;
  assert.equal(rent(options[0].simulation)-rent(),33000);
  assert.equal(rent(options[1].simulation)-rent(),21000);
  for(const option of options.slice(0,2)) {
    assert.equal(option.afterCoveredCents,100000);
    assert.equal(option.shortfallCents,0);
    assert.ok(!option.simulation.removedSubscriptions?.includes('fictional-kevin:riversidefitness'));
    assert.ok(!option.simulation.eventId?.startsWith('bill:'));
  }
  assert.deepEqual(data,before); assert.deepEqual(project(data),baseline);
});

test("small and late subscription removals never claim to resolve the rent gap", () => {
  const data=personalData(initialState(),'kevin');
  const spotify=subscriptionsFor(data).find(s=>s.merchant==='Spotify')!;
  assert.equal(paymentReadiness(data,'bill:shared-rent',{removedSubscriptions:[spotify.id]})!.shortfallCents,18500);
  data.manualSubscriptions=[{id:'fictional-kevin:late',merchant:'Late service',amountCents:5000,cadence:'monthly',lastChargeDate:'2026-09-29',nextChargeDate:'2026-10-29',confidence:'Manually tracked',status:'active'}];
  assert.equal(paymentReadiness(data,'bill:shared-rent',{removedSubscriptions:['fictional-kevin:late']})!.coveredCents,80000);
  assert.ok(planningOptions(data).every(o=>!o.simulation.removedSubscriptions?.includes('fictional-kevin:late')));
});

test("a confirmed plan changes shared readiness only; Ava never receives Kevin's private plan, ledger or context", () => {
  const state=initialState();
  state.plans.kevin.simulation=planningOptions(personalData(state,'kevin'))[0].simulation;
  state.plans.kevin.preferences=['PRIVATE GYM MEMORY'];
  let view=workspaceView(state,'household','ava');
  assert.equal(view.commitments[0].contributions[1].scenarioStatus,'not shared');
  state.consents['household:kevin']={readiness:true,coverage:false,balance:false,expenseIds:[]};
  view=workspaceView(state,'household','ava');
  assert.equal(view.commitments[0].contributions[1].status,'may be at risk');
  assert.equal(view.commitments[0].contributions[1].scenarioStatus,'appears achievable');
  assert.equal(view.commitments[0].contributions[1].coveredCents,undefined);
  assert.doesNotMatch(JSON.stringify(view),/PRIVATE GYM|Professional certification|Optional studio|142000/);
  assert.equal(coverage(state,'kevin').get('rent:2026-10-27')!.coveredCents,80000);
});

test("deterministic assistant proposes an achievable option without claiming unconfirmed memory or changing the plan", async t => {
  const keys={...process.env}; delete process.env.GEMINI_API_KEY;delete process.env.BACKBOARD_API_KEY;
  t.after(()=>{process.env=keys;});
  const state=initialState();
  const answer=await assistant(state,'kevin','What could I change before October 27 while keeping my gym?','en','fictional-test');
  assert.equal(answer.source,'deterministic');
  assert.equal(answer.proposal!.afterCents,13000);
  assert.match(answer.reply,/gym.*respected/);
  assert.doesNotMatch(answer.reply,/permanently|persistently|remembered forever/);
  assert.deepEqual(state.plans.kevin.simulation,{});
  assert.equal(state.plans.kevin.memoryOptIn,false);
  const spanish = await assistant(state,'kevin','Quiero mantener el gimnasio; ¿qué opciones tengo?','es','fictional-test');
  assert.equal(spanish.proposal!.afterCents,13000);
  assert.match(spanish.reply,/Posponer la compra opcional/);
  assert.doesNotMatch(spanish.reply,/Move the optional purchase/);
});

test("unanchored manual history does not masquerade as reconciled bank balance history", () => {
  const data=fixtureData('kevin','2026-10-17');
  const manual=applyPersonalRecords(data,[{id:'extra',kind:'transaction',label:'Self-reported expense',category:'Shopping',accountId:data.accounts[0].id,date:'2026-10-10',amountCents:-2500}]);
  assert.equal(manual.balanceHistory,undefined);
  assert.equal(manual.accounts[0].balanceCents,data.accounts[0].balanceCents);
  assert.ok(data.balanceHistory?.length);
});
