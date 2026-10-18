# Multi-group financial risk and recipient privacy demo

The fictional snapshot is frozen at October 17, 2026, 12:00 UTC. No database, environment change, Nessie seed, payment or actual service cancellation is required. Existing browser snapshots are upgraded to revision 3 while retaining personal edits and saved scenarios. For the original demonstration, use Settings → Reset Demo → Confirm Reset Demo.

## Exact financial story

Maple Street Roommates contains Kevin, Maya, Noah and Lily. Their agreed monthly rent is $2,400 due October 25 ($600 each), plus $400 utilities due October 19 ($100 each). All four have calculated coverage for both obligations. The fictional self-reported amounts are not verified payments or additional money.

Kevin & Ava — Vacation targets $800 by October 27 ($400 each). Kevin's checking snapshot is $1,420. His forecast deducts utilities $100, Entertainment $60, Spotify $15, gym $45, bicycle repair $70 and the optional studio purchase $330: $620 total. It then deducts rent $600, leaving $200 for his $400 vacation share. The vacation shortage is $200. Rent is included once, not reused as vacation savings. The next estimated paycheck is $1,800 on October 28, after the target date.

Moving the actual scheduled optional $330 purchase from October 24 to October 30 improves deadline cash by $330. Vacation coverage becomes $400, the minimum balance becomes $130, and rent/utilities remain covered. Alternatively, remove the estimated $60 Entertainment charge and cap the purchase at $180: a $210 improvement and $10 minimum. Both keep the gym. These are hypothetical plans; baseline bank records and balances remain unchanged. A sufficiently adverse hypothetical expense can affect both groups, and their statuses recalculate accordingly.

## Disclosure model

Consent keys are workspace + owner + recipient, with existing workspace-wide consent retained as a fallback. An explicit recipient rule overrides that fallback, including revocation. Balance, upcoming obligations, projected balances, exact contribution coverage, readiness status and individually selected transactions are separate permissions. Changes require explicit confirmation.

Maya shares her $5,450 balance with Kevin only. Noah and Lily share readiness but no balances, bills, transactions or forecasts. Kevin shares readiness with roommates. Kevin and Ava mutually authorize balances, upcoming obligations, exact readiness and projected balances in the vacation workspace. This does not grant either person access to other workspaces. Aggregate amounts require every component to be authorized; group health uses only disclosed statuses. Private plans, conversations and preferences never enter another member's shared view or the AI provider context. Providers interpret intent; Vesta supplies calculated facts from the requesting profile.

This is simulated identity switching, not production authentication. The browser-owned fictional snapshot supports all simulated perspectives; the shared-view API projections enforce the demonstrated disclosure rules. This is not a security boundary against inspection of the editable demo snapshot itself.

## Two-minute demonstration

1. Reset Demo if needed, select Kevin, open Home. Show roommate On Track and vacation At Risk, with the original personal chart intact.
2. Open roommate details: four members, covered $600 rent/$100 utilities, Maya's authorized balance, other balances private.
3. Choose the vacation warning's **Explore Solutions with Vesta**. The context includes the $400 share, October 27 target, existing rent and gym preference. Ask to keep the gym and resolve the vacation gap.
4. Preview the proposed optional-purchase delay in Domino. Compare original $200 shortage with $130 minimum and $330 deadline improvement. Confirm the hypothetical plan.
5. Return to Shared Finances: vacation becomes On Track; roommate obligations remain On Track. Refresh to show persistence.
6. Switch to Ava to see Kevin's authorized details. Revoke an individual recipient permission as Kevin, refresh Ava's view, then switch to Maya to show that roommate access remains limited. Reset restores the original snapshot.

## Expense chart

Linear dollars remain the default. Optional Log Scale uses the explicitly labeled zero-preserving transform log10(1 + dollars). Categories are grouped in this view because logarithmic heights cannot be stacked additively. Dollar-axis labels invert the transform; tooltips retain original integer cents. Zero dates stay at zero and remain hoverable, with an explicit zero-date list. Scaling never changes records or forecast calculations.

## Verification

101 automated tests cover old household functionality plus multi-group readiness, no double allocation, five reconciled ledgers, recipient authorization/revocation, stateless refreshes, valid AI proposals and scale invariance. Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run verify:planning`.

Browser scripts: `scripts/snapshot-ui-smoke.ts` (full five-profile demonstration), `scripts/ui-smoke.ts` (financial tools and 1024/768/390px navigation/overflow), `scripts/capture-visual-refinement.ts` (1440px captures), and `scripts/expense-scale-ui.ts` (explicit zero-day linear/log tooltip fixture). Local captures are under `.tmp/visual-refinement/multi-group-final` and `.tmp/multi-group-verification`; production captures use a separate phase directory.

Gemini, Backboard and separate read-only Nessie retrieval are verified independently. Nessie's zero retrieved transactions remain zero; no fictional snapshot record is attributed to Nessie. Archived database code retains its own legacy fixture and is outside active application imports.
