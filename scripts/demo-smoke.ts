// Exercises the deployed HTTP surface, including cookies and actual response bodies.
// Only fictional planning metadata is written; this never calls Nessie write APIs.
import assert from "node:assert/strict";
const base = process.env.DEMO_BASE_URL || "http://localhost:3000";
let cookie = "";
let snapshot: unknown;
const snapshotSession = crypto.randomUUID();
const jar = new Map<string, string>();
function remember(response: Response) {
  for (const item of response.headers.getSetCookie()) {
    const pair = item.split(";")[0];
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function api(profile: string, body?: Record<string, unknown>) {
  const response = await fetch(`${base}/api/demo-snapshot`, {
    method: "POST",
    headers: {
      ...(cookie ? { cookie } : {}),
      origin: new URL(base).origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version: 1, session: snapshotSession, state: snapshot, path: `/api/collaboration?profile=${profile}`, method: body ? "POST" : "GET", body: body ? { ...body, confirmed: true } : undefined }),
  });
  assert.equal(response.status, 200);
  const envelope = await response.json();
  snapshot = envelope.state;
  const r = Response.json(envelope.result, { status: envelope.status });
  const value = envelope.result;
  console.log(`Demo ${profile}: ${body?.action || "read"} → HTTP ${r.status}`);
  if (value.assistant)
    console.log(
      `Assistant handler: ${value.assistant.source}; proposal returned: ${Boolean(value.assistant.proposal)}`,
    );
  assert.equal(r.status, 200, value.error);
  return value;
}
async function main() {
  if (process.env.DEMO_PLANNING_STORE === "local") {
    const r = await fetch(`${base}/api/planning-storage`, {
      method: "POST",
      headers: {
        origin: new URL(base).origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ store: "local", confirmed: true }),
    });
    assert.equal(r.status, 200);
    remember(r);
    console.log(
      "Explicitly selected local fictional planning for this isolated smoke-test session.",
    );
  }
  for (const path of [
    "/",
    "/shared",
    "/plan?section=forecast",
    "/plan?section=spending",
    "/plan?section=credit",
    "/assistant",
    "/domino",
    "/protect",
    "/credit",
    "/deadbolt",
    "/continuity",
    "/settings",
  ]) {
    const r = await fetch(base + path);
    const html = await r.text();
    assert.equal(r.status, 200);
    const main =
      html.match(/<nav aria-label="Main navigation">([\s\S]*?)<\/nav>/)?.[1] ||
      "";
    assert.equal((main.match(/class="nav-item/g) || []).length, 4);
    assert.ok(html.includes("/brand/vesta-goddess.png"));
  }
  await api("kevin");
  await api("kevin", {
    action: "consent",
    workspaceId: "household",
    consent: {
      readiness: true,
      coverage: false,
      balance: false,
      expenseIds: [],
    },
  });
  let ava = await api("ava");
  let shared = ava.workspaces[0].commitments[0];
  assert.equal(shared.contributions[1].status, "may be at risk");
  assert.equal(shared.projectedCents, null);
  assert.ok(!JSON.stringify(ava).includes("fictional-kevin"));
  await api("kevin", {
    action: "memory",
    enabled: true,
    preferences: ["My gym membership is non-negotiable."],
  });
  let kevin = await api("kevin", {
    action: "chat",
    question: "What are my options?",
    language: "en",
  });
  assert.match(kevin.assistant.reply, /gym/);
  kevin = await api("kevin", {
    action: "chat",
    question: "What happens if I cancel Spotify?",
    language: "en",
  });
  assert.ok(kevin.assistant.proposal);
  assert.deepEqual(kevin.own.simulation, {});
  await api("kevin", {
    action: "scenario",
    simulation: kevin.assistant.proposal.simulation,
  });
  ava = await api("ava");
  shared = ava.workspaces[0].commitments[0];
  assert.equal(shared.contributions[1].status, "may be at risk");
  assert.equal(shared.contributions[1].scenarioStatus, "appears achievable");
  assert.equal(shared.contributions[1].coveredCents, undefined);
  assert.deepEqual(ava.own.messages, []);
  assert.deepEqual(ava.own.preferences, []);
  await api("kevin", {
    action: "consent",
    workspaceId: "household",
    consent: {
      readiness: false,
      coverage: false,
      balance: false,
      expenseIds: [],
    },
  });
  ava = await api("ava");
  assert.equal(
    ava.workspaces[0].commitments[0].contributions[1].scenarioStatus,
    "not shared",
  );
  await api("kevin", { action: "memory", enabled: false, preferences: [] });
  console.log(
    "PASS: Kevin → private AI proposal → confirmed scenario → Ava readiness only → consent revoked. No banking writes.",
  );
}
main().catch(() => {
  console.error(
    "Demo smoke check failed; no credentials or private responses logged.",
  );
  process.exitCode = 1;
});
