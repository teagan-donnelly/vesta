# Current architecture notice

The hackathon app now uses the [fixed browser-local snapshot](browser-snapshot-demo.md).
This database-outage investigation is retained for future production development.

# Planning outage repair

The production incident reproduced on October 17, 2026 at
https://vesta-seven-phi.vercel.app: Kevin's financial-data request returned 502,
the collaboration request returned 503, and the financial error identified a
certificate trust failure. The local read-only Tiger check also failed certificate
verification. Backboard authenticated successfully. Schema verification could
not run because TLS failed before database queries.

Two application dependencies amplified the database failure: the browser session
bootstrap queried a database-backed Kevin workspace list, and personal demo
financial retrieval called the collaborative store. Switching profiles correctly
left Nessie mode, but both dependencies then blocked the demo profile's Home.

## Resulting behavior

- `/api/demo-session` establishes an isolated cookie without a database read.
- `/api/financial-data` loads explicitly selected personal demo fixtures independently.
  Nessie retrieval remains exclusively Nessie-backed and never falls back to fixtures.
- `/api/personal-planning` adds only the selected profile's shared obligations and
  saved scenario after a successful planning read. While unavailable or pending,
  Home and Plan Ahead explicitly label forecasts incomplete. Shared records are
  never invented to hide a database failure.
- Shared errors stay on Shared Finances. Explicit local selection remains available
  there and in Settings. Hosted local storage is temporary, separate from Tiger,
  and may disappear or differ between serverless instances. It is not database persistence.
- Aborted profile requests cannot apply another profile's financial snapshot or
  saved scenario. Shared responses and errors are also scoped to their profile.
- Database diagnostics log only an allowlisted error code as `[vesta-planning]`;
  raw provider errors, connection strings, queries and financial data are omitted.

## Tiger configuration and verification

For a newly created paid service, Tiger documents an initial self-signed
certificate while a signed certificate is provisioned, usually within 30 minutes:
[Tiger strict SSL guide](https://d1ovb29l12vjqm.cloudfront.net/use-timescale/latest/security/strict-ssl/).
Wait until at least 30 minutes after creation before treating the initial trust
failure as a permanent CA problem. Do not trust an unverified certificate fetched
from the failed connection. If strict verification still fails, obtain the trusted
chain through the provider/administrator, or ask Tiger support to investigate
certificate issuance for that service.

`db:migrate` now reports whether `.env.local` loaded, whether the effective URL
matches it, and whether an existing shell variable takes precedence. It does not
print values. The migration reports its failing stage, a sanitized error code,
static troubleshooting advice and, when supplied by PostgreSQL, a numeric SQL
position. Failed SQL is explicitly rolled back on the same connection. The SSL
compatibility warning is resolved by explicitly selecting `verify-full` in the
in-memory connection configuration; neither environment file is rewritten.

Before executing migration SQL, the script requires encrypted TLS with an
authorized peer and an available Timescale extension. Its `by_range` hypertable
API is documented for TimescaleDB 2.13 and newer. SQL compatibility on a specific
service cannot be verified until TLS and authentication succeed.

Keep `TIGER_DATABASE_URL` server-side in the correct Vercel environment scope.
Provide the service's trusted PEM certificate chain as `TIGER_DATABASE_CA` when
the certificate is not trusted by Node's default roots. This accepts actual
newlines or literal `\n`. Obtain it from the database provider or administrator;
do not paste a password or the connection URI into this field. Certificate and
hostname verification remain enabled. Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`
or use `rejectUnauthorized: false`.

Redeploy after environment changes. Run `npm run verify:planning` in a trusted
environment with those same server variables. It performs read-only checks of
Timescale and all planning relations. If it reports missing schema, review
`migrations/001_collaborative_planning.sql` and apply the additive migration using
`npm run db:migrate` against the intended database. Do not reset or recreate the
database. The incident repair does not modify existing database records or secrets.

In Vercel, open the Vesta project, select the affected production deployment, and
open its runtime/function logs. Filter for `/api/collaboration` or
`/api/personal-planning` and reproduce the failure. Share only timestamp, deployed
commit, route, HTTP status and `[vesta-planning]` code. Never share credentials,
connection strings, raw provider messages or financial payloads. `42P01` indicates
a missing relation; `28P01` authentication; certificate codes identify TLS trust.

## Verification boundaries

Tests exercise real route handlers with a failing database adapter, explicit local
selection, all three fictional profiles, shared-rent forecasts and strict source
separation. A mounted React regression exercises Nessie → Shared → Kevin → Home,
then Ava/Maya changes and a deliberately late Kevin response. HTTP production
probes are recorded separately from local tests; a successful build alone does
not establish a successful deployment or functioning Tiger connection.
