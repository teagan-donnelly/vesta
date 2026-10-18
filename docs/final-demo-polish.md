# Final demo: accountability without surveillance

The frozen moment is October 17, 2026 at 12:00 UTC. Tiger is not used. Each browser
owns its fictional snapshot; refreshes and simulated profile changes retain
confirmed changes. Use **Settings → Reset Demo → Confirm Reset Demo** before a
presentation to start with the original scenario. Older browser snapshots retain
their edits and consent, and receive only the newly added baseline dining and
transport budgets once.

## The exact financial story

Kevin has $1,420 in checking. Before his October 27 rent contribution, these
known or estimated events total $620:

| Date | Event | Amount |
| --- | --- | ---: |
| Oct 19 | Electric utility | $100 |
| Oct 20 | Entertainment bundle | $60 |
| Oct 21 | Spotify | $15 |
| Oct 22 | Riverside Fitness | $45 |
| Oct 23 | Bicycle repair invoice | $70 |
| Oct 24 | Optional studio equipment purchase plan | $330 |

This leaves $800 toward Kevin's $1,000 share of the $2,000 household rent, a
**$200 gap on October 27**. His next $1,800 semimonthly paycheck is scheduled for
October 28. The forecast uses explicit payroll dates instead of incorrectly
extrapolating semimonthly history as a biweekly paycheck on October 27.

Two calculated options keep his gym and every contractual payment on time:

1. Postpone the uncommitted $330 equipment purchase from October 24 to October
   30, after payday. Cash on October 27 improves by exactly $330; the 30-day low
   becomes **$130**. Ending cash is unchanged because the purchase still happens
   within the forecast window. Rent coverage improves from $800 to $1,000.
2. Remove the estimated $60 entertainment renewal and reduce the optional
   purchase from $330 to $180. The $210 improvement produces a **$10** minimum.

Spotify alone improves the low from -$200 to -$185; it does not solve rent.
Charges after the deadline are excluded from deadline-solving recommendations.
These are hypothetical plans, not provider cancellations, orders or payments.

## Data and reconciliation

Each profile has 60 days of varied completed activity: distinct employers and
paydays, groceries, restaurants, transportation, shopping, housing, utilities,
subscriptions and selected one-off expenses. Their checking balances are Kevin
$1,420, Ava $6,200 and Maya $5,450. The profiles retain separate credit and payment
history, goals, three budgets, investment valuations, protection and emergency
records. Kevin's completed $3,400 certification tuition on October 14 explains
his depleted buffer; it is already included in closing cash and never deducted
again in the forecast.

Daily fictional closing balances reconcile opening cash plus completed activity
to current checking cash, with no historical overdrafts. Pending plans and future
income are excluded from historical charts and monthly recorded totals. Manual
historical entries do not change reported closing balances; because they have no
verified cash anchor, they hide historical balance charts rather than fabricate
new observations. Nessie never receives this synthetic history.

Kevin's month-to-date recorded income is $1,800; spending is $3,836.09; net cash
flow is -$2,036.09. “Net cash flow this month” is not labeled as actual savings.

## Two-minute presentation

1. Select Kevin from the profile menu on Home. Show the $1,000 responsibility,
   $800 estimated available and $200 gap, alongside the explained payday timing.
2. Open **See shared expenses**. Show his agreed share and explain that members'
   reported contributions are not verified payments.
3. Open **Ask about our expenses**. Select **I want to keep my gym membership.**
   Vesta proposes the optional purchase adjustment using calculated dates and
   amounts. An unconfirmed proposal does not change the plan.
4. Select **Confirm this what-if change**, then open Forecast. Show $800 → $1,000
   toward rent, a $0 remaining gap, the $130 simulated minimum, and the unchanged
   original -$200 line. Refresh: the saved plan remains.
5. Return to Shared Finances. As Kevin, enable only **Share whether I can cover
   my part**, then save. Switch to Ava. She sees Kevin's original and what-if
   readiness statuses, without his balance, exact private shortfall, spending,
   scenario details or AI conversation. Revoke consent as Kevin and refresh as
   Ava to demonstrate that future views hide the statuses again.

Gemini and Backboard interpret questions; Vesta calculates all statements and
proposals. Backboard memory remains opt-in. The fictional gym preference is local
profile context and does not claim permanent remote memory. Simulated profiles
are not real authentication: all fictional data is inspectable in this browser.

## Welcome artwork provenance

`public/brand/vesta-welcome-landscape.png` is original decorative artwork generated
with the built-in imagegen tool. It is not a screenshot or a replacement logo.
The supplied official `vesta-goddess.png` remains unchanged in navigation.

Exact generation prompt:

> Create a standalone decorative website banner illustration, very wide landscape composition approximately 3:1. Premium ivory-and-burgundy classical fintech editorial artwork: a graceful Roman goddess holding a softly glowing golden torch, standing on the RIGHT THIRD, with a tranquil Mediterranean mountain landscape and a small classical temple in the far right distance at sunset. Refined engraved lines blended with soft painted atmosphere, muted warm ivory, dusty peach, restrained burgundy details, subtle warm gold. The LEFT HALF must be nearly empty clean warm ivory (#f8f1e7), fading smoothly into the landscape at center, so real HTML greeting text can remain readable. Artwork only: absolutely no words, letters, logos, wordmarks, charts, frames, screenshots, dashboard UI, or typography. This is decorative scenery, not a logo, and must not imitate or replace an official brand logo. Keep the torch and face inside the frame with generous breathing room; subdued professional composition rather than dramatic fantasy.

## Validation

Regression tests cover reconciled ledgers, income precedence, duplicate avoidance,
the exact gap and both solutions, late charges, preserved baselines, privacy,
snapshot persistence, reset, manual financial management and provider grounding.
The browser smoke test exercises the full presentation through actual controls;
the management smoke test also checks desktop, tablet and mobile layouts.

Local validation passed: 90 automated tests, lint, TypeScript, production build,
the complete rendered presentation flow (including Home's current what-if
summary), refresh/reset/privacy behavior, and the management/responsive smoke
tests at 1536, 1024, 768 and 390 pixels. Actual Home, Ask Vesta, Domino and Ava's
Shared Finances renders were inspected. Live Backboard opt-in memory/proposals,
Gemini explanations and read-only Nessie retrieval succeeded. Nessie returned one
customer and one account with no transactions; fictional records were not used to
fill that upstream gap. No Tiger or Nessie records were changed.
