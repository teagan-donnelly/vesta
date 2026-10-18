# Approved Vesta UI and connected personal records

The approved full-size dashboard defines the ivory canvas, off-white panels,
burgundy controls, rose navigation states, serif page headings and compact tables.
The official transparent goddess logo remains unchanged. Neither reference image
is used as a UI asset; their identities and financial figures were not inserted.

## Navigation

Four primary destinations remain: Home, Shared Finances, Plan Ahead and Ask Vesta.

- Home `/`: source-derived monthly totals, expense chart, honest balance-history
  empty state, spending allocation, upcoming payments, activity and financial risk.
- Transactions `/transactions`: search; account/category/type/date filters; sorting;
  pagination; details; CSV export; manual entries; editable Vesta annotations.
- Plan Ahead `/plan?section=forecast`: original Domino forecast and simulations.
- `/plan?section=spending`: subscription detection, manual tracking, active/upcoming/
  canceled views, monthly/annual costs and scenario-removal controls.
- `/plan?section=goals` and `budget`: goal contributions and category budgets using
  actual completed transactions. Emergency goals are the same records shown in
  Emergency Planning, not copies.
- `/plan?section=credit`: manually entered scores, saved score history, tracked
  accounts, recorded payment observations, known account age and revolving-only
  utilization. No credit-bureau integration or invented scores/limits/history.
- `/plan?section=investing`: manually valued holdings, cost basis, allocation and
  saved valuation history. No live prices, invented returns or securities trading.
- `/plan?section=protection`: self-reported policies, monthly premiums, renewals,
  saved identity/security checklists and links to financial separation.
- `/continuity`: emergency goals, contributions, contacts, document/resource
  checklists plus existing continuity instructions and downloadable plan.
- `/shared`, `/deadbolt`, `/assistant`: existing collaborative commitments,
  disclosure enforcement, separation tools, bilingual assistant, opt-in memory
  and confirmed hypothetical scenarios. No member's private record collection
  is returned in collaborative payloads.
- Settings stays in the profile menu: source/account information, in-app alert
  preferences, light/dark/system appearance, assistant language, date display,
  privacy/memory links and existing connection/developer diagnostics.

Legacy `/domino`, `/protect` and `/credit` routes remain usable. Four main
navigation links and page-specific active sections are verified in a real browser.

## Records, consistency and storage

Personal management records use the existing private-plan JSON persistence,
scoped by browser session, data source and customer/profile. This is an additive
optional `recordSets` field; no destructive SQL or new tables are needed. The
existing Tiger adapter persists it when the database is reachable. Explicit local
planning uses the existing clearly labeled fictional local adapter. Hosted local
storage is ephemeral and may differ between serverless instances.

Personal bank retrieval remains independent from planning availability. Storage
failures are visible and never replaced silently with a second dataset. Profile
changes and late responses cannot display another scope's records.

Manual transactions are labeled separately. Imported Nessie amounts, IDs, dates
and balances are never changed or deleted by management edits. Categories and
notes are Vesta overlays retaining their original values. Historical manual
entries update spending and budgets but do not rewrite reported bank balances.
Future manual transactions enter the existing deterministic forecast once.

Manual subscription rates/dates supply explicit recurring inputs to the existing
engine without manufactured historical transactions. A cancellation changes
self-reported recurring estimates; it does not cancel the service or erase
already scheduled bank payments. Scenario removal remains hypothetical and
preserves the baseline. Annual totals use actual billing cadence, avoiding the
rounding error from multiplying rounded monthly equivalents.

Goals/contributions are recorded progress, not bank transfers or reserved money.
Investment history consists of saved manual observations and carried-forward last
recorded values, never fabricated market prices. Appearance is cached on this
device per profile, and also saved to selected planning storage when available.
Currency stays USD; no exchange-rate conversion is claimed. UI text is English;
the conversational assistant retains English/Spanish support.

Fictional profile switching remains a demonstration, not real authentication.

## Validation

`npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build` cover the
implementation. Management regressions test source boundaries, annotation edits
and restoration, monthly totals, future entries, recurring estimates, baseline
preservation, annual cost precision, credit utilization, goal progress, investment
valuations, API confirmation/origin checks and profile privacy.

With a built server on `http://localhost:3002`, run `npm run test:ui` (installed
Google Chrome required). It creates an isolated browser session, explicitly
selects local fictional planning, exercises manual forms and CSV export, verifies
shared goal records, checks every main/secondary screen and asserts no React page
errors or page overflow at 1536/1024/768/390 pixels. Screenshots go to ignored
`.tmp/ui-verification/`. No banking, Tiger or Backboard records are written by
this browser test.

`DEMO_PLANNING_STORE=local npm run demo:smoke` exercises Kevin → Backboard proposal
→ confirmed Domino scenario → Ava's consent-limited outlook → consent revocation.
It uses a separate fictional local session and removes its opted-in memory.
Live Nessie/Gemini verification is read-only; sandbox seeding still requires the
existing localhost preview and explicit user confirmation.

Tiger verification currently fails at TLS with `SELF_SIGNED_CERT_IN_CHAIN`.
Database persistence and live schema compatibility are not claimed verified.
See [the connection repair notes](planning-outage-repair.md) for trusted-CA setup.

## Deployment verification

The release is live on https://vesta-seven-phi.vercel.app. The deployed Kevin →
Backboard proposal → confirmed scenario → Ava readiness → consent revocation
smoke test passed. The full browser suite passed on the built localhost server,
including all management forms and responsive checks with no page errors.

The stricter production browser test exposed the hosted local adapter's documented
retention limit: a newly created goal did not survive a full page reload into
Emergency Planning. This is not a successful production persistence verification.
The UI and record editor therefore warn explicitly that temporary online demo
records can reset on refresh. Use localhost for reliable local demonstrations,
or repair Tiger TLS, verify its schema, and select **Use configured database**
in Settings before relying on deployed record retention. No automatic fallback
or unverified database-success claim was introduced.
