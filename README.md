# Vesta

Financial protection and cash-flow forecasting, built on the existing Next.js interface for Technica 2026.

## Run

Run `npm.cmd install`, then `npm.cmd run dev`, and open http://localhost:3000. Keep the existing `NESSIE_API_KEY` and `GEMINI_API_KEY` in `.env.local`; never commit that file. Optional `GEMINI_MODEL` overrides the default `gemini-3.5-flash-lite`. Keys are read only by server integration modules.

## Preview and confirm the fictional Nessie dataset

**No records were seeded during this development phase.** Read-only inspection found one **Vesta Fictional Test** customer, one **Vesta fictional checking** account with **$2,000**, and zero deposits, withdrawals, bills, loans or merchants. The real preview endpoint was tested, followed by another read: the balance remained $2,000 and transaction/bill counts remained zero.

1. Start the app with `npm.cmd run dev` and open **http://localhost:3000/settings**.
2. In the header, select **Nessie Sandbox** and **Vesta Fictional Test**. Expand **Developer setup · Fictional Nessie scenario (localhost only)**, then select **Vesta fictional checking** under **Prepare fictional Nessie activity**.
3. Click **Preview fictional dataset**. This only reads Nessie and saves a local proposal; it sends no financial creation requests. Review the record table, expected forecast, balance effects, limitations, and expandable exact request bodies.
4. To authorize writing, check the acknowledgment, type **SEED FICTIONAL DATA** exactly, then click **Confirm and write fictional records to Nessie**. Until you perform this explicit action, no scenario records are created. Previews expire after 30 minutes or when the local date changes. If records or balances change after preview, confirmation is rejected before writing.
5. After confirmation, the workflow submits each record once and immediately retrieves it through its documented collection endpoint. It then performs a final read-back, displays retrieved record IDs, actual balance and analysis checks, and requests a grounded Gemini risk explanation. It refreshes Vesta's shared data snapshot. If Gemini is unavailable, the report clearly identifies deterministic guidance.
6. Use **Verify existing Nessie records (read-only)** whenever you want to re-read the actual scenario records without creating anything. Navigate to Overview, Protect and Domino to demonstrate the shared retrieved data.

The selected mode and Nessie customer are remembered across reloads in this browser. Navigation retains the current simulation; switching profiles clears it. When Nessie is selected, the app automatically retrieves its records without opening Settings or generating a preview. If the dev server uses another port, use that same localhost port for setup. Setup controls are omitted from production builds and their server routes reject production requests even on localhost; use `npm.cmd run dev` for setup.

### Proposed story

The preview proposes **33 fictional records**, anchored to its displayed date:

| Records        | Fictional activity                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5 deposits     | $1,500 payroll every 14 days, with enough history to estimate future paychecks                                                                                        |
| 21 withdrawals | Two rent payments, two utility payments, two student-loan payments, two charges each for three subscriptions, eight grocery trips, and one unusual $700 repair charge |
| 7 bills        | Three subscriptions ($25, $20, $15), $1,800 rent, $140 utilities, a $450 emergency repair, and a $1,000 student-loan payment                                          |

History contains **$7,500 of deposits and $7,500 of withdrawals**, so the expected closing balance remains the balance retrieved at preview. Completed records can temporarily affect the account as the API applies them: deposits are submitted first, so an initial $2,000 could temporarily rise to $9,500. This effect is shown in the preview and requires explicit acknowledgment. The workflow never resets an account balance or assumes that the server applied the expected balance effects.

For the inspected $2,000 account and current preview dates, the proposed forecast has **$3,450 in upcoming obligations**, **three detected subscriptions**, a **-$450 temporary balance before payroll**, and a **$60 ending-balance improvement** when all three subscriptions are removed. These are **proposal calculations**, not claims that records already exist in Nessie. The preview recalculates for its actual date and retrieved balances. Live values are verified only after confirmation and successful retrieval.

### Duplicate and interruption handling

The server saves immutable proposals, account-level submission markers, write intent and retrieved record IDs in **`.vesta-sandbox/`**, which is ignored by Git and excluded from secret-check staging. API keys are never written into these files. Local file locks prevent concurrent submissions. Each financial POST has durable intent written first; no financial write is automatically retried.

A preview can be submitted only once. Existing scenario markers in Nessie also block duplicate datasets, including after a local ledger is lost. An account with any submitted/interrupted run is blocked from a second dataset. If a response is lost, read-back fails, or setup is interrupted, the workflow stops and requires manual review of the local ledger and official Nessie records. **Do not delete the ledger or repeatedly try new previews to bypass that protection.** No automatic rollback, updates or deletion routes exist. Existing unrelated records are preserved.

The old `/api/nessie/seed` customer-creation endpoint is retired (HTTP 410), so it cannot bypass the preview. This workflow operates only on the existing named fictional customer's checking account. It rejects hosted deployments, Vercel environments, and cross-origin confirmation requests.

## Documented endpoint support

Verified against the [official Nessie documentation](https://prod.nessieisreal.com/docs) and its [published OpenAPI schema](https://prod.nessieisreal.com/nessie-openapi-spec.yaml). Requests use `https://prod-api.nessieisreal.com` and the server-side key query parameter.

| Record      | Documented retrieval                                                | Documented creation                 | Scenario use                                                      |
| ----------- | ------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Customers   | `GET /customers`, `GET /customers/{id}`                             | `POST /customers`                   | Read the existing fictional customer only                         |
| Accounts    | `GET /customers/{id}/accounts`, `GET /accounts/{id}`                | `POST /customers/{id}/accounts`     | Read the existing checking account only                           |
| Deposits    | `GET /accounts/{id}/deposits`, `GET /deposits/{id}`                 | `POST /accounts/{id}/deposits`      | Completed payroll history                                         |
| Withdrawals | `GET /accounts/{id}/withdrawals`, `GET /withdrawal/{withdrawal_id}` | `POST /accounts/{id}/withdrawals`   | Fictional spending history                                        |
| Bills       | `GET /accounts/{id}/bills`, `GET /bills/{billId}`                   | `POST /accounts/{id}/bills`         | Dated upcoming obligations                                        |
| Merchants   | `GET /merchants`, `GET /merchants/{id}`                             | `POST /merchants`                   | Supported, but no unused merchant records are created             |
| Loans       | `GET /accounts/{id}/loans`, `GET /loans/{id}`                       | `POST /accounts/{id}/loans`         | Supported reads; student-loan payments use withdrawals and a bill |
| Purchases   | `GET /purchase/{purchase_id}`                                       | **No creation endpoint documented** | Not created or presented as purchase history                      |

The official schema does **not** document an account purchase-list endpoint. The previous legacy probe was removed. Vesta now uses documented withdrawal records as an explicit fictional spending alternative. Protect displays whether each transaction came from a Nessie deposit or withdrawal. No locally generated transactions substitute for missing API responses. `VESTA_FICTIONAL_V1` descriptions/payees carry labels and categories that are decoded only from records actually returned by Nessie; dates, amounts and balances always come from those responses. The pure proposed-data projection is used only in the clearly labeled preview, never as the live data source.

Deposit/withdrawal amounts use whole dollars as documented by the integer schema, with `medium`, `transaction_date`, `status`, `amount` and `description`; the official documentation's withdrawal example supplies those fields. Bills use the documented create schema. The first real writes and read-backs remain pending user confirmation; mocked tests cannot establish server-side write behavior.

## Demonstrate Protect and Domino after confirmation

1. Overview should show the actual retrieved cash balance and upcoming obligations. It pools checking and savings and excludes card debt.
2. Protect should identify **StreamNest**, **Pulse Music**, and **CloudPocket** from repeated withdrawal history. Rent, utilities and debt remain distinct from subscriptions. The unusual $700 expense is a review flag, not a fraud determination.
3. Select **Simulate removing StreamNest**, then open Domino. Compare baseline and scenario ending/lowest balances and affected dates. The baseline remains available. Simulations never change Nessie records.
4. Try removing all three subscriptions, delaying an income event, adding an unexpected expense, delaying an optional payment, or adjusting a payment amount. Reset restores the baseline. Charges outside the 30-day horizon do not generate immediate savings.
5. Review the post-seed grounded risk explanation, or select **Ask Gemini** on Overview, Protect or Domino. Gemini only orders verified explanations; arbitrary financial claims cannot enter the UI. Prompts exclude customer names, account IDs/numbers, raw transaction descriptions and credentials.

Forecasts use integer cents and begin tomorrow from the displayed closing-balance snapshot (America/New_York). Historical records are evidence, not replayed against current cash. Known bills supersede inferred matching obligations to avoid double-counting. Payroll intervals are estimated, ordinary discretionary spending is not forecast, and loan amounts alone do not establish payment dates. Credit, Deadbolt and Continuity retain labeled fictional educational/planning examples.

## Validation

The redesigned workspace uses the supplied Vesta goddess logo, a fixed sidebar with active navigation, a compact profile/data toolbar, consistent tables and controls, and restrained navy/burgundy styling. Overview combines account summaries, upcoming payments, recent activity and derived risks. Protect carries selected subscription removals into Domino. Domino overlays both projections on one shared, zero-inclusive scale with currency/date axes, hover/keyboard tooltips, negative-balance shading and a daily comparison table.

Credit now separates retrieved card/debt information from an optional user-entered utilization worksheet. Deadbolt provides obligation/access review checklists without inferring shared ownership. Continuity provides a draft emergency plan and local download; notes and contact fields are not saved automatically. Technical coverage warnings and developer setup are in Settings. Only mode and customer ID are persisted; financial records and planning notes are not stored as preferences.

Automated checks cover profile preference persistence, malformed preferences, common chart scales and date alignment, preserved forecast cents, subscription scenario changes, credit worksheet edge cases, and production sandbox protection in addition to existing finance/integration tests. Browser visual verification requires a connected browser; none was available during this session.

- `npm.cmd test`: regression and mocked integration tests, including preview without writes, consent, normalized read-back, duplicate/concurrent-write prevention, changed snapshots, expiry, missing records and lost responses. All test financial writes go to mocks, never the real API.
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run inspect:sandbox`: read-only real customer/account/collection inspection; sanitized counts only.
- `npm.cmd run verify:integrations`: read-only Nessie checks and one Gemini request.
- `npx.cmd tsx scripts/check-secrets.ts`: staged-file/browser-asset checks against configured keys, without printing values; verifies `.env.local` remains ignored.

Live scenario seeding, live populated-record retrieval and Gemini explanation of that populated scenario are intentionally pending explicit confirmation. The localhost preview endpoint has been verified against the current real sandbox without creating records.
