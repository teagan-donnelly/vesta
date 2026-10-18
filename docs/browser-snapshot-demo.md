# Browser-local hackathon snapshot

This is the current demo architecture. Earlier Tiger setup and outage documents
describe the archived production adapter, not a requirement for this application.

All three fictional profiles represent **2026-10-17 at 12:00 UTC**, regardless of
the current date or which profile opens first. Ava starts with $3,000 in checking,
Kevin with $1,280, and Maya with $2,450. Historical activity is already reflected
in those closing balances and is never replayed. Every profile includes payroll,
subscriptions, grocery history, upcoming bills, recorded credit/payment history,
savings goals, budget, investment valuations, a fictional policy and emergency
resources. Goal balances and investment values are separately tracked assets;
they are not added to checking funds.

## Demonstration

1. Open Home and select Kevin in the Demo Profile Switcher. His $1,000 rent share
   is due October 27 before the next expected paycheck on October 31. His
   baseline forecast reaches -$10.
2. Open Plan Ahead → Forecast (Domino). Simulate removing Spotify. The scenario
   low point becomes $5; the baseline stays -$10. Select **Confirm and update my
   plan** to retain the hypothetical scenario, then refresh to verify it.
3. In Shared Finances, open the privacy controls. Kevin initially shares no
   readiness, coverage, balance or individual expenses. Enable readiness only
   and explicitly save the consent.
4. Switch to Ava. Kevin's baseline says “may be at risk” and his scenario says
   “appears achievable.” Kevin's private balance, expense details, coverage
   amounts, preferences, conversation and exact scenario are not displayed.
5. Switch back to Kevin and revoke consent. Refresh as Ava: those statuses are
   hidden again. Ava's own records and simulation are independent.
6. Maya has a separate Cedar Lane household and rent obligation. She cannot
   access the Maple Street household. Creating workspaces, adding simulated
   participants, assigning obligations and recording contributions still work.
7. **Settings → Reset Demo → Confirm Reset Demo** removes this browser snapshot
   and restores all three original profiles. This includes local manual records
   and Nessie annotations. It does not change Nessie records, Tiger records, or
   delete Backboard provider memories. Use the assistant's explicit memory
   clearing control before reset if remote memory deletion is desired.

## Persistence and privacy boundaries

`vesta.snapshot.v1` in localStorage is the single browser-owned envelope. Reads and
confirmed writes go through `/api/demo-snapshot`, which runs the existing route
handlers against request-scoped state and returns an updated envelope. No server
session map, temporary file or database is used. Each request can run on a new
Vercel instance. The client serializes operations and uses Web Locks to coordinate
tabs on browsers that support them. Save failures are reported rather than
pretending a nonpersistent change was saved. Clearing site storage, private
browsing expiration, or changing devices/sites creates a separate fresh demo.

This is fictional role switching, **not authentication**. All three fictional
profiles are present in the browser envelope and inspectable in developer tools.
The existing server projections demonstrate selective disclosure within the UI;
this architecture must not store real multi-user private account datasets.
Remote Backboard assistant IDs have server-generated proofs bound to the browser
session and profile so editing snapshot JSON cannot select another resource.

Nessie requests still use the real server-side integration, and never fall back
to fictional profiles. Locally tracked Nessie annotations remain in independent
mode/customer scopes and do not become bank records. Gemini explanations still
use calculated financial facts. Backboard preferences and conversation are
profile-specific, and remote memory writes remain explicit opt-in actions.

## Setup and verification

No Tiger environment variable, migration, certificate or service is required.
Existing Tiger variables are ignored by application routes and may be removed
manually from Vercel later; their presence does not affect the demo. The actual
Tiger service and all its records remain untouched.

Optional integrations use the existing server-side `NESSIE_API_KEY`,
`GEMINI_API_KEY`, `BACKBOARD_API_KEY`, and optional `GEMINI_MODEL`. LocalStorage
never contains those keys. Vercel must redeploy the GitHub commit to serve this
architecture; a previous deployment continues using its previous code.

Run `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run verify:planning`,
`npm.cmd run build`, then `npm.cmd run start -- --port 3002`.
`npm.cmd run test:ui` checks the rendered management pages. The focused snapshot
browser smoke test is `npx.cmd tsx scripts/snapshot-ui-smoke.ts`.
`DEMO_BASE_URL` may point these smoke scripts at the deployed site.
`npm.cmd run demo:smoke` additionally tests the opted-in Backboard/assistant flow
using isolated fictional resources and clears its remote assistant afterward.

The future PostgreSQL adapter is retained in
`lib/collaboration/archive/database-store.ts`, with its SQL migrations, strict TLS
helpers and database tests. `pg` is development-only. Database scripts are named
`db:migrate:archived` and `verify:tiger:archived`; neither is used by the app or
build. Do not run them as part of the hackathon demo.
