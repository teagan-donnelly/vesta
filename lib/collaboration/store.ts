import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Pool, type PoolClient } from "pg";
import { initialState, type DemoState } from "./model";
import { databaseConfig } from "./database-config";

const globalStore = globalThis as typeof globalThis & {
  vestaPool?: Pool;
  vestaLocks?: Map<string, Promise<unknown>>;
};
export function pool() {
  if (!process.env.TIGER_DATABASE_URL)
    throw new Error("Tiger Data is not configured.");
  return (globalStore.vestaPool ||= new Pool({
    ...databaseConfig(
      process.env.TIGER_DATABASE_URL,
      process.env.TIGER_DATABASE_CA,
    ),
    max: 4,
    connectionTimeoutMillis: 7000,
    statement_timeout: 10000,
  }));
}
export const localPlanning = (request: Request) =>
  /(?:^|;\s*)vesta-demo-store=local(?:;|$)/.test(
    request.headers.get("cookie") || "",
  );
export const storageSource = (forceLocal = false) =>
  process.env.TIGER_DATABASE_URL && !forceLocal
    ? "Tiger Data PostgreSQL"
    : process.env.VERCEL
      ? "Ephemeral local fictional demo adapter"
      : "Local fictional demo adapter";
export function demoSession(request: Request) {
  const raw = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)vesta-demo=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return { id: raw || randomUUID(), fresh: !raw };
}
export function sessionHeaders(
  request: Request,
  session: ReturnType<typeof demoSession>,
) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Vary: "Cookie",
  };
  if (session.fresh)
    headers["Set-Cookie"] =
      `vesta-demo=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
  return headers;
}
async function dbLoad(client: PoolClient, id: string): Promise<DemoState> {
  const session = await client.query(
    "SELECT as_of FROM vesta_demo_sessions WHERE id=$1",
    [id],
  );
  if (!session.rowCount) return initialState();
  const s = initialState(String(session.rows[0].as_of).slice(0, 10));
  const [workspaces, commitments, consents, plans, history] = await Promise.all(
    [
      client.query("SELECT payload FROM vesta_workspaces WHERE session_id=$1", [
        id,
      ]),
      client.query(
        "SELECT payload FROM vesta_commitments WHERE session_id=$1",
        [id],
      ),
      client.query(
        "SELECT workspace_id,profile_id,payload FROM vesta_consents WHERE session_id=$1",
        [id],
      ),
      client.query(
        "SELECT profile_id,payload FROM vesta_private_plans WHERE session_id=$1",
        [id],
      ),
      client.query(
        "SELECT payload FROM vesta_readiness_snapshots WHERE session_id=$1 ORDER BY recorded_at DESC LIMIT 100",
        [id],
      ),
    ],
  );
  s.workspaces = workspaces.rows.map((r) => r.payload);
  s.commitments = commitments.rows.map((r) => r.payload);
  s.consents = Object.fromEntries(
    consents.rows.map((r) => [`${r.workspace_id}:${r.profile_id}`, r.payload]),
  );
  for (const row of plans.rows)
    s.plans[row.profile_id as keyof typeof s.plans] = row.payload;
  s.history = history.rows.map((r) => r.payload).reverse();
  return s;
}
async function dbSave(client: PoolClient, id: string, s: DemoState) {
  await client.query(
    "INSERT INTO vesta_demo_sessions(id,as_of) VALUES($1,$2) ON CONFLICT(id) DO NOTHING",
    [id, s.asOf],
  );
  for (const profile of ["ava", "kevin", "maya"])
    await client.query(
      "INSERT INTO vesta_demo_profiles(session_id,id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [id, profile],
    );
  // Replace only this isolated fictional browser session's planning records.
  await client.query("DELETE FROM vesta_commitments WHERE session_id=$1", [id]);
  await client.query("DELETE FROM vesta_workspaces WHERE session_id=$1", [id]);
  for (const w of s.workspaces) {
    await client.query(
      "INSERT INTO vesta_workspaces(session_id,id,owner_id,payload) VALUES($1,$2,$3,$4)",
      [id, w.id, w.owner, JSON.stringify(w)],
    );
    for (const member of w.members)
      await client.query("INSERT INTO vesta_memberships VALUES($1,$2,$3)", [
        id,
        w.id,
        member,
      ]);
  }
  for (const c of s.commitments) {
    await client.query(
      "INSERT INTO vesta_commitments(session_id,id,workspace_id,owner_id,amount_cents,due_date,payload) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        id,
        c.id,
        c.workspaceId,
        c.owner,
        c.amountCents,
        c.dueDate,
        JSON.stringify(c),
      ],
    );
    for (const a of c.contributions)
      await client.query(
        "INSERT INTO vesta_contributions VALUES($1,$2,$3,$4,$5)",
        [id, c.id, a.profile, a.expectedCents, a.reportedCents],
      );
  }
  for (const [key, consent] of Object.entries(s.consents)) {
    const [w, p] = key.split(":");
    await client.query("INSERT INTO vesta_consents VALUES($1,$2,$3,$4)", [
      id,
      w,
      p,
      JSON.stringify(consent),
    ]);
  }
  for (const [p, plan] of Object.entries(s.plans))
    await client.query(
      "INSERT INTO vesta_private_plans VALUES($1,$2,$3) ON CONFLICT(session_id,profile_id) DO UPDATE SET payload=excluded.payload",
      [id, p, JSON.stringify(plan)],
    );
  for (const h of s.history)
    await client.query(
      "INSERT INTO vesta_readiness_snapshots(recorded_at,session_id,profile_id,workspace_id,commitment_id,status,payload) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
      [
        h.at,
        id,
        h.profile,
        h.workspaceId,
        h.commitmentId,
        h.status,
        JSON.stringify(h),
      ],
    );
}
export async function withDemo<T>(
  id: string,
  action: (state: DemoState) => Promise<T> | T,
  write = false,
  forceLocal = false,
): Promise<T> {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid demo session.");
  const locks = (globalStore.vestaLocks ||= new Map());
  const prior = locks.get(id) || Promise.resolve();
  const task = prior
    .catch(() => {})
    .then(async () => {
      if (process.env.TIGER_DATABASE_URL && !forceLocal) {
        const client = await pool().connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
            id,
          ]);
          const state = await dbLoad(client, id);
          const value = await action(state);
          if (write) await dbSave(client, id, state);
          await client.query("COMMIT");
          return value;
        } catch {
          await client.query("ROLLBACK");
          throw new Error(
            "Planning database unavailable. Check migrations and connection settings.",
          );
        } finally {
          client.release();
        }
      }
      const root =
        process.env.VESTA_DEMO_DIR ||
        (process.env.VERCEL
          ? join(tmpdir(), "vesta-demo")
          : join(process.cwd(), ".vesta-demo"));
      await mkdir(root, { recursive: true });
      const file = join(root, `${id}.json`);
      let state: DemoState;
      try {
        state = JSON.parse(await readFile(file, "utf8"));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT")
          throw new Error("Demo planning store unavailable.");
        state = initialState();
      }
      const value = await action(state);
      if (write || !(await readFile(file).catch(() => null))) {
        const temp = join(root, `${id}-${randomUUID()}.tmp`);
        await writeFile(temp, JSON.stringify(state), { mode: 0o600 });
        await rename(temp, file);
      }
      return value;
    });
  locks.set(id, task);
  try {
    return await task;
  } finally {
    if (locks.get(id) === task) locks.delete(id);
  }
}
