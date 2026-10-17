# Vesta

Financial protection and cash-flow forecasting, built on the existing Next.js interface for Technica 2026.

## Run

Use `npm.cmd install`, then `npm.cmd run dev`. Open http://localhost:3000. Keep `NESSIE_API_KEY` and `GEMINI_API_KEY` in your existing `.env.local`; this file is ignored by Git. Keys are only read by server integration modules. Optional `GEMINI_MODEL` overrides the verified default, `gemini-3.5-flash-lite`.

## Data modes

The **Data source** selector in every page header switches between **Demo Mode (fictional)** and **Nessie Sandbox Mode**. The selection and simulations persist during client navigation in the current session. A full reload starts in Demo Mode. Changing mode or customer resets the simulation and clears previous records before loading.

Overview, Protect and Domino share one normalized snapshot. Nessie failures produce visible errors without substituting fictional records. Select a sandbox customer in the header when multiple customers exist. Use Retry to refresh a failed request.

The real sandbox authenticated successfully during verification but returned **zero customers**. No real sandbox writes were performed. On localhost, the empty state offers **Create fictional sandbox customer**, with an explicit confirmation. It checks for the named fictional customer before creating one customer and a $2,000 checking account. It never creates transactions automatically. If setup is interrupted, inspect the existing customer and accounts through the official Nessie documentation before trying again; duplicate setup is refused. This convenience route rejects hosted and cross-origin requests.

## Protect and Domino walkthrough

1. In Demo Mode, open Protect. Rent, utilities and debt payments are classified separately from subscriptions. Review the transaction explanations; flags are review suggestions, not fraud findings.
2. Select **Simulate removing Spotify**, then use **Compare selected removals in Domino**. The same selection appears in Domino. A subscription whose next charge is outside the 30-day horizon produces no immediate savings.
3. Compare baseline and scenario ending balances, lowest balances, and the table of affected dates. Both chart panels retain the baseline for comparison.
4. Choose a future income event and delay it by several days. The deposit moves once; it is not added again. Delaying past the horizon excludes it from the current window.
5. Try an unexpected expense, delay an optional expense after reviewing its terms, or adjust a selected payment amount. Use **Reset to baseline** to clear all changes. None of these controls writes to Nessie.
6. Select **Prioritize with Gemini** on Overview, Protect or Domino. Gemini orders verified explanations using structured analysis. It cannot add free-form financial claims to the UI. Missing keys, service errors and invalid output retain deterministic explanations.

## Forecast rules and limitations

All calculations use integer cents. Starting liquidity consistently sums checking and savings, excluding card debt. The snapshot is a closing balance as of the displayed date (America/New_York); historical transactions are evidence for recurrence and are never replayed against that balance. Forecast days begin tomorrow.

Known dated bills supersede inferred events for the same merchant/account near the due date. Future pending events are counted once. Weekly, monthly and annual schedules repeat through the horizon; month-end dates are clamped while retaining their original anchor day. Repeated payroll intervals between 12 and 18 days are approximated as biweekly, and this estimate is disclosed. Transfers or unidentified deposits are not assumed to be recurring payroll. Ordinary discretionary spending is not forecast. Loan payments need a dated bill or transaction history, since a monthly amount alone does not establish a due date.

Credit card purchases and card-funded bills do not immediately reduce liquid cash; dated cash-account debt payments do. Checking and savings are pooled, so the forecast does not establish that a specific payment account has enough funds. Credit, Deadbolt and Continuity retain clearly labeled fictional educational/planning examples; they do not infer credit histories, shared ownership or emergency contacts from Nessie.

## Integration references

The Nessie client uses the production HTTPS host listed by the [official Nessie documentation](https://prod.nessieisreal.com/docs) and its [published OpenAPI schema](https://prod.nessieisreal.com/nessie-openapi-spec.yaml). It reads customers, customer accounts, and account deposits, withdrawals, bills and loans. Merchant records enrich purchases when available. Monetary API amounts are converted from dollars to cents.

The current official schema documents single-purchase reads but omits the account purchase-list endpoint. The client probes the legacy read-only `/accounts/{id}/purchases` endpoint. If unsupported or unavailable, it displays an explicit coverage warning; it never fabricates purchases. The real empty sandbox cannot verify account-level retrieval; mocked integration tests cover populated responses.

Gemini uses Google's [server-side generateContent API](https://ai.google.dev/api/generate-content). Only minimal derived explanations are sent; names, account IDs, account numbers, raw transaction descriptions and keys are excluded from prompts. Model-generated IDs are validated against a closed set before verified explanation text is displayed. A live grounded request succeeded with Gemini 3.5 Flash Lite; earlier older-model and larger-model requests returned 404/503 or failed, demonstrating the fallback path.

## Validation

- `npm.cmd test`: financial regression, normalization, error redaction, model-output validation, route validation and duplicate-setup prevention.
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run verify:integrations`: limited read-only Nessie verification and one Gemini request; outputs sanitized status and counts only.
- `npx.cmd tsx scripts/check-secrets.ts`: checks staged files and browser build assets against configured key values without printing them, and verifies `.env.local` remains ignored.

Route smoke checks cover all seven pages and both data-mode endpoints. No connected browser was available for interactive or visual verification in this development session. Sandbox creation is covered by mocked tests and was not executed against the real API.
