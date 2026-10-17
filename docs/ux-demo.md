# Vesta: four destinations, one connected flow

## Feature map

| Main destination                         | Features                                                                                                                        | URLs retained                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Home                                     | Accounts, upcoming payments, activity, subscriptions, 30-day outlook, actionable risk warning                                   | `/`                                  |
| Shared Finances                          | Workspaces, expenses, agreements, member updates, authorized outlooks, privacy choices                                          | `/shared`                            |
| Plan Ahead → Forecast                    | Domino chart, original versus changed outlook, subscription what-ifs, payment/income timing, unexpected expenses, shared impact | `/plan?section=forecast`, `/domino`  |
| Plan Ahead → Spending & Subscriptions    | Protect recurring services, unusual activity, cross-page subscription selection                                                 | `/plan?section=spending`, `/protect` |
| Plan Ahead → Credit Guidance             | Existing credit education, obligations and utilization worksheet                                                                | `/plan?section=credit`, `/credit`    |
| Ask Vesta                                | Private conversation, suggestions, English/Spanish, confirmed proposals, opt-in memory                                          | `/assistant`                         |
| Shared Finances → Financial Separation   | Existing Deadbolt review/checklists                                                                                             | `/deadbolt`                          |
| Home / profile menu → Emergency Planning | Existing Continuity contacts, plan and export                                                                                   | `/continuity`                        |
| Profile gear → Data & privacy settings   | Data selection, customer/profile switching, diagnostics, planning storage, localhost-only sandbox setup                         | `/settings`                          |

The four main destinations remain visible on desktop and in the mobile navigation drawer. Profile/data/workspace controls are inside the profile gear. The financial data indicator opens a short source disclosure. Secondary details use keyboard-accessible native disclosure controls. Original URLs remain working compatibility pages, rather than losing features through redirects.

## Preflight and integration status

All four existing credentials were present locally. They were not overwritten, printed, or committed.

- **Nessie:** authenticated retrieval succeeded: one customer/account, zero transaction/bill/loan records. No automatic seeding occurred. The localhost-only preview and typed confirmation workflow remains in Settings → developer diagnostics. No local activity is represented as Nessie-backed.
- **Gemini:** grounded explanation requests succeeded. The deterministic fallback remains available.
- **Backboard:** authenticated reads and live tests of saving, retrieving, correcting, and isolating a fictional preference succeeded. Verification-only assistants were deleted afterward. The live list response uses `id`; the adapter now accepts both `id` and `memory_id`. Opt-in remains required. `npm run verify:memory` repeats the explicit test and cleans up only its verification assistants.
- **Tiger Data:** the configured connection failed TLS validation with `SELF_SIGNED_CERT_IN_CHAIN`. A real database connection, schema, and Timescale operation could not be verified. No database migration or other database write was attempted through an untrusted connection. Certificate verification was not disabled. PostgreSQL adapter/schema regression tests use pg-mem, which does not prove a live Tiger Data connection.

To complete Tiger Data setup, obtain the service's trusted CA certificate through the provider's authenticated service/connection settings. Add `TIGER_DATABASE_CA` manually to `.env.local` with its PEM content (quoted, escaped `\n` line breaks are supported), preserving the populated `TIGER_DATABASE_URL`. Restart the server, run `npm run verify:planning`, then `npm run db:migrate` if planning tables are absent, and verify again. The adapter keeps certificate and hostname validation enabled. Connection-string SSL parameters are removed only when an explicit CA is supplied, so the `pg` driver does not replace that CA configuration. See [node-postgres TLS configuration](https://node-postgres.com/features/ssl) and [Tiger Data strict SSL guidance](https://d1ovb29l12vjqm.cloudfront.net/use-timescale/latest/security/strict-ssl/).

If preparing a demo before that CA is available, choose **Use local demo planning** explicitly in Settings or on the connection error screen. It selects a separate fictional store for that browser session. Nothing is copied from, deleted from, or silently substituted for the database. The shared page's expandable storage disclosure reports the actual selected adapter. **Use configured database** switches back without changing records. On Vercel the local adapter is temporary and not durable across instances; use a verified database for hosted persistence.

For Vercel, set `NESSIE_API_KEY`, `GEMINI_API_KEY`, `BACKBOARD_API_KEY`, `TIGER_DATABASE_URL`, and the required `TIGER_DATABASE_CA` separately in project environment settings, then redeploy. Local configuration does not prove deployed configuration. The status API now evaluates configuration per request instead of freezing it into a static build result. Configured credentials alone are not displayed as verified connectivity. No deployed URL was supplied for a Vercel runtime verification.

## Two-minute walkthrough

1. Run `npm run dev` and open http://localhost:3000. Open the profile gear and choose **Kevin** under the clearly labeled fictional profile switcher. During preflight, select local demo planning if Tiger Data is still blocked. Home calculates the rent warning from the actual forecast; it does not hardcode the $10 outcome.
2. Open **Shared Finances**. The household shows $2,000 rent, the due date, Kevin's $1,000 share, and his own potential $10 shortfall. Contributions/payment details are expandable. Expand **Privacy & sharing**, select **Share whether I can cover my part**, and save. Leave exact amounts, balances, and expense sharing off.
3. Click **Find a way to cover $10** to open **Plan Ahead → Forecast** with the actual payment context. Or open **Ask Vesta**, state that the gym should be kept, and ask what happens if Spotify is canceled. To persist that preference, expand **Memory & assistant settings** and explicitly save it. Provider attribution remains available under **How this answer was prepared**.
4. Confirm the proposed what-if change. The existing engine recalculates the original -$10 low to a $5 low for this fictional fixture; no service is canceled. The original forecast remains available. Use **Return to Shared Finances** or the chat confirmation link to see the changed contribution outlook. Plan Ahead's return link preserves the selected shared expense.
5. Choose **Ava** in the profile gear. Kevin's authorized outlook changes from **May be short** to **Looks on track** with his changes. His exact shortfall, balance, transactions and private conversation are absent from Ava's response unless he explicitly authorized the relevant disclosure. Switch back to Kevin and **Stop sharing everything**; Ava then sees that Kevin has not shared his financial outlook.

Agreed contributions, amounts members report setting aside, estimated availability, and confirmed payments remain different concepts. Vesta does not confirm payments or reserve funds. A positive estimate is not a guarantee. Shared totals remain withheld when they would reveal an undisclosed member amount. Profile switching is a fictional demonstration, not authentication.

## Automated and manual verification

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Start the app, then run `npm run demo:smoke`. Set `DEMO_BASE_URL` for another localhost port. To explicitly test the separate local adapter while database TLS is unresolved, set `DEMO_PLANNING_STORE=local` for that smoke-test process. Its cookie jar preserves both session and storage selection. The script checks four main navigation entries, all canonical planning sections, every former route, and the complete privacy/confirmed-scenario flow. It never seeds Nessie.

No browser surface was available for rendered desktop/mobile inspection. HTTP and server-rendered component tests are not visual QA. Before judging, manually check:

- At desktop and mobile widths, exactly four main links, correct active section, readable logo, no horizontal page overflow, accessible drawer close/Escape/focus, profile and source disclosures.
- Home's real warning → relevant Forecast focus → optional expense/timing controls → shared update; changing sections retains the draft scenario and changing profiles clears private context.
- Shared Finances leads with the payment and your share; details, agreements, member updates, creating/editing/removing own expenses, privacy toggles and stop-sharing remain usable. Other members' private amounts stay absent.
- Ask Vesta's sender bubbles, thinking/error messages, bottom input, Enter/Shift+Enter behavior, English/Spanish, memory settings, confirmation and return link. Keyboard users can operate every disclosure and control.
- Spending selection propagates to Forecast; credit worksheet, Financial Separation, Emergency Planning/export, diagnostics and deliberate sandbox setup remain reachable.

Remaining limitations: no production authentication or real invitations, no actual payment execution, bounded grounded assistant responses rather than unrestricted advice, no verified live Tiger Data until its CA is configured, no browser visual verification, and no verification of Vercel's runtime environment.
