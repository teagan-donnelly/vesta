import { createHmac, timingSafeEqual } from "node:crypto";
import { GET as readShared, POST as changeShared } from "../collaboration/route";
import { GET as readRecords, POST as changeRecords } from "../records/route";
import { GET as readPlanning } from "../personal-planning/route";
import { GET as readFinancial } from "../financial-data/route";
import { POST as explain } from "../explain/route";
import { initialState, SNAPSHOT_DATE, type DemoState } from "@/lib/collaboration/model";
import { snapshotContext } from "@/lib/collaboration/store";
import { snapshotRecords } from "@/lib/collaboration/snapshot-records";

const handlers: Record<string, Partial<Record<string, (r: Request) => Promise<Response>>>> = {
  "/api/collaboration": { GET: readShared, POST: changeShared },
  "/api/records": { GET: readRecords, POST: changeRecords },
  "/api/personal-planning": { GET: readPlanning },
  "/api/financial-data": { GET: readFinancial },
  "/api/explain": { POST: explain },
};
function proof(session: string, profile: string, id: string) {
  return createHmac("sha256", process.env.BACKBOARD_API_KEY || "unconfigured")
    .update(JSON.stringify([session, profile, id])).digest("hex");
}
function validState(raw: unknown): DemoState {
  if (!raw || typeof raw !== "object") throw Error();
  const s = raw as DemoState;
  if (s.asOf !== SNAPSHOT_DATE || !Array.isArray(s.workspaces) || s.workspaces.length > 100 ||
      !Array.isArray(s.commitments) || s.commitments.length > 500 ||
      !Array.isArray(s.history) || s.history.length > 100 || !s.consents || !s.plans)
    throw Error();
  for (const p of ["ava", "kevin", "maya"] as const) {
    const plan = s.plans[p];
    if (!plan || !plan.simulation || !Array.isArray(plan.preferences) || !Array.isArray(plan.messages) || plan.messages.length > 200) throw Error();
    if ((s.snapshotRevision || 1) < 2) {
      // Add only newly introduced baseline budgets to older browser snapshots.
      // Preserve existing records, deletions, simulations, messages and consent.
      const sets = (plan.recordSets ||= {}), scope = `demo:demo:${p}`;
      const records = (sets[scope] ||= []);
      for (const record of snapshotRecords(p, s.asOf).filter(r => /-(restaurants|transport)-budget$/.test(r.id)))
        if (!records.some(r => r.id === record.id)) records.push(record);
    }
  }
  s.snapshotRevision = 2;
  return s;
}
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin)
    return Response.json({ error: "Same-origin requests only." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 2000000) throw Error();
    const input = JSON.parse(raw);
    if (input.version !== 1 || !/^[a-f0-9-]{36}$/.test(input.session) || typeof input.path !== "string" || !input.path.startsWith("/api/")) throw Error();
    const url = new URL(input.path, origin);
    const handler = url.origin === origin && handlers[url.pathname]?.[input.method];
    if (!handler) throw Error();
    const state = input.state === undefined ? initialState() : validState(input.state);
    // Browser snapshot contents are fictional and editable, never authentication.
    // Provider resource IDs require a server proof, preventing a forged snapshot
    // from reading or deleting another browser/profile's Backboard assistant.
    for (const p of ["ava", "kevin", "maya"] as const) {
      const plan = state.plans[p];
      if (plan.assistantId) {
        const expected = proof(input.session, p, plan.assistantId);
        const supplied = typeof plan.assistantProof === "string" ? plan.assistantProof : "";
        if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
          delete plan.assistantId;
          delete plan.assistantProof;
        }
      }
    }
    const inner = new Request(url, {
      method: input.method,
      headers: { origin, "Content-Type": "application/json", cookie: `vesta-demo=${input.session}` },
      ...(input.method === "POST" ? { body: JSON.stringify(input.body) } : {}),
    });
    const response = await snapshotContext.run(state, () => handler(inner));
    for (const p of ["ava", "kevin", "maya"] as const) {
      const plan = state.plans[p];
      if (plan.assistantId) plan.assistantProof = proof(input.session, p, plan.assistantId);
    }
    return Response.json({ status: response.status, result: await response.json(), state }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Snapshot unavailable. Check browser storage or use Reset Demo in Settings." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
