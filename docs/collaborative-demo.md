# Collaborative financial intelligence

Vesta remains a personal financial intelligence app. Shared planning adds accountability without financial surveillance. All collaborative profiles and financial records are fictional fixtures, never Nessie transactions. The official logo and existing personal pages are preserved.

## Run and configure

1. `npm.cmd install`
2. Preserve the existing `.env.local`. It now has empty `BACKBOARD_API_KEY=` and `TIGER_DATABASE_URL=` entries. Paste values manually; do not commit the file.
3. `npm.cmd run dev`, then open http://localhost:3000/shared.
4. `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` run regression checks. `npm.cmd run demo:smoke` exercises the two-person flow through HTTP against the running localhost server. Set `DEMO_BASE_URL` if using another origin/port.

| Variable             | Obtain / configure                                                                     | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `NESSIE_API_KEY`     | Existing Nessie developer account                                                      | Server-side sandbox reads; unchanged deliberate seeding workflow           |
| `GEMINI_API_KEY`     | Existing Google AI Studio project                                                      | Grounded personal explanations and bounded assistant intent interpretation |
| `BACKBOARD_API_KEY`  | [Backboard dashboard](https://app.backboard.io), API Keys                              | Optional opted-in memory and conversation intent orchestration             |
| `TIGER_DATABASE_URL` | [Tiger Cloud console](https://console.cloud.timescale.com), service connection details | Full PostgreSQL connection URI, including its required TLS settings        |

Configure the same four variables separately in Vercel Project Settings → Environment Variables. Do not prefix secrets with `NEXT_PUBLIC_`. Restart/redeploy after changes. `GEMINI_MODEL` remains an optional model override. Never print connection URLs or API keys.

## Two-minute demonstration

Use a fresh browser demo session (a private window starts a separate fictional namespace). The profile switcher is **not authentication**.

1. **Kevin, personal (20 seconds).** In Shared planning, choose **Explore as Kevin**, then Overview. The local fixture has $1,280, ordinary obligations, three recurring services, and a $1,000 shared rent contribution due in ten days. His baseline low before expected payroll is -$10. The $2,000 rent has Ava and Kevin assigned $1,000 each. The fixture payroll is explicitly expected, not guaranteed.
2. **Shared risk (25 seconds).** Open Shared planning. In **Your disclosure choices**, check **Contribution readiness only**, then **Confirm disclosure choices**. Exact balance, transactions, and coverage amounts remain off. Group projected coverage stays **Not fully shared** rather than exposing an aggregate that reveals Kevin's finances. Agreed, reported, and projected amounts have distinct labels. Ava’s preset $1,000 report is a fictional member statement, never a verified payment.
3. **Private assistance (30 seconds).** Open Ask Vesta. Enter `My gym membership is non-negotiable.` in the preference field and confirm opt-in. Ask **I want to keep my gym; what are my options?**. With Backboard configured, only those explicit preferences are written to its dedicated per-profile assistant; without it, the UI identifies local demo preferences. The provider badge identifies who actually handled intent interpretation; it never claims a provider ran when fallback rules were used.
4. **Confirm a scenario (25 seconds).** Ask **What happens if I cancel Spotify?**. Vesta calculates a -$10 → $5 lowest-balance change and proposes removal from the hypothetical forecast. Click **Confirm hypothetical scenario**, then inspect Domino. Nothing is canceled. The unchanged baseline is still visible. Alternatively edit a scenario directly in Domino and use **Confirm scenario for shared planning**. Draft changes are not automatically published to shared planning.
5. **Ava privacy view (20 seconds).** Switch the clearly labeled demo profile to Ava and open the household. Kevin’s baseline status is **may be at risk** and hypothetical status is **appears achievable**. Neither status guarantees a payment. Kevin’s exact coverage, balance, expenses, preferences, and conversation are absent from Ava’s API response. Switch back to Kevin and revoke disclosure: future Ava responses show **not shared** again.

Spanish: choose **Español** and ask `¿Qué pasa si cancelo Spotify?` or `Explica mi riesgo de alquiler`. Responses use the same cents, USD amounts, and ISO dates; only the explanatory text changes language.

Additional controls: create Household/Couple/Family/Business/Custom workspaces; add Ava/Kevin/Maya as demo participants; propose monthly or one-time obligations; edit/remove your own proposals; confirm your own agreement; report your own amount. A proposal is not an agreement until the assigned participant confirms. The preset rent assignments represent an already agreed fictional arrangement. Creator edits that change an assignment reset its agreement. Deadbolt links to shared connection/disclosure review without changing membership or responsibility.

## Selective-sharing architecture

The HttpOnly, SameSite demo cookie identifies a random browser namespace. Profile IDs are a fixed fictional allowlist, **not authenticated identities**. New profiles never map to a Nessie customer. Only the chosen fictional profile's personal dataset is returned from the demo financial endpoint. Mode switching retains strict source boundaries; failed Nessie requests do not return fixtures.

Shared DTOs are constructed on the server after membership checks. Readiness, exact projected coverage, account balance, and specifically selected expenses have separate, workspace-scoped consent. New memberships default to no disclosure. Contributions and due dates are necessary shared planning records. Coverage totals and shortfall figures are withheld unless all involved members' exact coverage is available to the viewer. Private plans, messages, preferences, provider assistant IDs, and unrelated workspaces are never included in shared DTOs. A profile can change only its own disclosure/report/scenario/preferences; only a proposal owner can edit/remove it. All mutations require same-origin requests and explicit confirmation. Browser storage holds only the existing mode/profile preference, not bank records, conversation history, or financial memories.

Readiness uses `personalData` to add each assignment as one dated bill to the existing `project` engine. No financial engine rewrite was made. Same-day contributions allocate available cents in stable order to avoid duplicate claims on cash. Other private obligations continue affecting readiness without being disclosed. Baseline and saved scenario are evaluated separately. Outside the engine's 30-day horizon, readiness is unknown. Monthly obligations recur through the engine; the tracker displays the next scheduled occurrence. Future income and omitted discretionary spending remain uncertainty sources. This is not a portfolio optimizer or payment system.

Disclosure revocation affects future responses, not screenshots, already delivered responses, or someone else's memory of information. Histories contain only readiness status, are visible only to their owner, and are bounded in the app. A real deployment must replace the switcher with authenticated sessions, verified identity-to-account binding, authorization/RLS for every tenant/member query, secure invitations, rate limiting, consent audit/versioning, encryption and retention controls. Public deployment is safe only as a fictional demo; these controls are not represented as production authentication.

## Tiger Data

Run `npm.cmd run db:migrate` after configuring `TIGER_DATABASE_URL`. Migration `migrations/001_collaborative_planning.sql` creates session/profile, workspace, membership, commitment, contribution, consent, private-plan, and readiness snapshot tables with foreign keys and cents constraints. Bounded extension fields use JSONB alongside relational ownership/assignment columns. Queries use parameters; state mutations run under a transaction and session advisory lock. Only the current fictional browser session is updated.

The migration creates a real Timescale hypertable for time-stamped **status-only** readiness snapshots and a `time_bucket` daily view. Snapshots are written only on confirmed scenario changes, never by generating large time-series fixtures. `npm.cmd run verify:planning` checks a real database read, the Timescale extension, and schema existence. The PostgreSQL adapter/schema is tested against pg-mem; that test does **not** validate Timescale or claim a real Tiger Cloud connection.

Without credentials, `.vesta-demo/` stores fictional planning state locally (Git-ignored, atomic replacement, process-level serialization). On Vercel the fallback uses temporary storage and is explicitly labeled ephemeral; it is not durable across instances or deployments. Use Tiger Data for a persistent hosted demo. Configured-but-failing database connections produce errors rather than silently falling back. Local adapter data is not automatically migrated into Tiger Data; each store initializes its own fictional scenario. Demo cookies last one day. Production account data must never use this adapter.

## Backboard, Gemini, and memory

Implementation follows [Backboard assistant scopes](https://docs.backboard.io/concepts/assistants), [message API](https://docs.backboard.io/concepts/messages), and [memory management](https://docs.backboard.io/concepts/memory). Each browser/profile gets its own provider assistant, whose ID stays server-side. Explicit preference edits use documented memory list/add/delete APIs. Conversations use `memory: Readonly`; only manually confirmed preferences are persisted to semantic memory. Clearing memory deletes that dedicated assistant and its threads/memories. Remote operations are not transactionally atomic with the local/database store; on provider failure, an error is shown and no successful clear is claimed. Retry and inspect after a partial service failure.

Models receive the selected profile's question, recent questions, and opted-in preferences. They do not receive account histories, balances, full financial snapshots, other members' data, or arbitrary shared aggregates. Provider output is constrained to an intent enum; unsolicited facts, amounts, or action instructions are ignored. Vesta's deterministic code renders bounded English/Spanish responses, calculates proposals, and waits for confirmation. This is intentionally a limited conversational planning assistant, not unrestricted chat or personalized professional advice. Backboard is used when opted in and configured; otherwise Gemini can interpret intent. Invalid/unavailable provider output uses labeled bilingual deterministic rules. There are no duplicate Gemini calls when Backboard handles that conversation turn. Existing Gemini explanation prioritization remains unchanged.

Preferences can be viewed/corrected/cleared under Ask Vesta. Conversations are private server-side planning state and can be cleared separately. Stated gym preferences affect review options; opting in controls persistence beyond the conversation. Do not enter real sensitive information or credentials into this fictional demonstration.

## Verified status and limitations

Read-only verification during implementation: Nessie returned one customer and one account, zero transactions/bills/loans. Gemini explanation verification succeeded. No Nessie records were created. The existing Settings → localhost-only sandbox preview/typed confirmation workflow remains available; see the main README. The collaborative dataset is local fictional data even if Nessie has no transactions.

Backboard and Tiger Data credentials were absent during implementation. Client contracts and database behavior are automated-test covered; **live connections and real Timescale behavior remain awaiting credentials**. Run `verify:planning`, migrate the database, and repeat the UI memory flow and `demo:smoke` after configuring them. The smoke script writes only fictional planning data and opted-in test preferences, then clears its test memory. It never seeds Nessie.

Browser inspection may be unavailable in the execution environment. `demo:smoke` checks HTTP response bodies and forbidden cross-profile disclosures but is not visual QA. Manually inspect desktop/mobile sidebar and menus, shared tables, forms, chart labels, profile-switch clearing, and empty/error states before presentation. The prototype intentionally omits payment execution, real authentication/invitations, full internationalization, cross-browser real-person collaboration, and unrestricted model advice.

Windows/OneDrive builds: the prebuild hook clears only generated production server/static cache directories using verified workspace paths and filesystem metadata, avoiding OneDrive directory-reporting EPERM errors. It preserves the development cache and all source files. Stop any production server before rebuilding.
