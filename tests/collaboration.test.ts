import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  initialState,
  personalData,
  coverage,
  workspaceView,
  consentDefault,
  validateSimulation,
} from "../lib/collaboration/model";
import { project, shift, subscriptionsFor } from "../lib/analysis";
import { GET as rawGET, POST as rawPOST } from "../app/api/collaboration/route";
import { browserRoute, browserWithDemo as withDemo } from "./snapshot-harness";
const GET = browserRoute(rawGET), POST = browserRoute(rawPOST);
import { GET as financialGET } from "../app/api/financial-data/route";

process.env.VESTA_DEMO_DIR = join(
  process.cwd(),
  ".tmp",
  `planning-tests-${process.pid}`,
);
delete process.env.TIGER_DATABASE_URL;
delete process.env.BACKBOARD_API_KEY;
delete process.env.GEMINI_API_KEY;
const fixed = () => initialState("2026-10-17");
test("due-date readiness, integer cents, baseline and subscription simulation propagate deterministically", () => {
  const s = fixed();
  const data = personalData(s, "kevin");
  const base = project(data);
  const spotify = subscriptionsFor(data).find((s) => s.merchant === "Spotify")!;
  assert.equal(data.bills.filter((b) => b.id === "shared-rent").length, 1);
  assert.equal(base.lowestBalanceCents, -20000);
  assert.equal(
    coverage(s, "kevin").get(`rent:${s.commitments[0].dueDate}`)?.coveredCents,
    80000,
  );
  s.plans.kevin.simulation = { removedSubscriptions: [spotify.id] };
  assert.equal(
    coverage(s, "kevin", true).get(`rent:${s.commitments[0].dueDate}`)
      ?.coveredCents,
    81500,
  );
  assert.equal(project(data, s.plans.kevin.simulation).lowestBalanceCents, -18500);
  assert.deepEqual(project(data), base);
  assert.equal(
    coverage(s, "ava").get(`rent:${s.commitments[0].dueDate}`)?.status,
    "appears achievable",
  );
});
test("same-day assignments cannot spend the same projected money twice", () => {
  const s = fixed();
  s.commitments.push({
    ...structuredClone(s.commitments[0]),
    id: "second",
    amountCents: 20000,
    contributions: [
      {
        profile: "kevin",
        expectedCents: 20000,
        reportedCents: 0,
        agreed: true,
      },
    ],
  });
  const results = [...coverage(s, "kevin").values()];
  assert.equal(
    results.reduce((n, r) => n + r.coveredCents, 0),
    80000,
  );
});
test("delayed income and unexpected expenses affect commitments by their actual deadlines", () => {
  const s = fixed();
  s.commitments[0].dueDate = "2026-11-02";
  const baseline = coverage(s, "kevin").get("rent:2026-11-02")!;
  assert.equal(baseline.status, "appears achievable");
  s.plans.kevin.simulation = { eventId: "pending:income-0", delayDays: 10 };
  assert.equal(
    coverage(s, "kevin", true).get("rent:2026-11-02")?.status,
    "may be at risk",
  );
  s.plans.kevin.simulation = {
    unexpectedCents: 250000,
    unexpectedDate: "2026-10-24",
  };
  assert.equal(
    coverage(s, "kevin", true).get("rent:2026-11-02")?.status,
    "may be at risk",
  );
});
test("minimal disclosure suppresses amounts, aggregates, balances and private histories", () => {
  const s = fixed();
  s.plans.kevin.preferences = ["PRIVATE KEVIN GYM MEMORY"];
  s.plans.kevin.messages = [{ role: "user", content: "PRIVATE CONVERSATION" }];
  let view = workspaceView(s, "household", "ava");
  let kevin = view.commitments[0].contributions.find(
    (a) => a.profile === "kevin",
  )!;
  assert.equal(kevin.status, "not shared");
  assert.equal(kevin.coveredCents, undefined);
  assert.equal(view.commitments[0].projectedCents, null);
  s.consents["household:kevin"] = { ...consentDefault(), readiness: true };
  view = workspaceView(s, "household", "ava");
  kevin = view.commitments[0].contributions.find((a) => a.profile === "kevin")!;
  assert.equal(kevin.status, "may be at risk");
  assert.equal(kevin.coveredCents, undefined);
  assert.equal(view.commitments[0].projectedCents, null);
  const serialized = JSON.stringify(view);
  assert.ok(!serialized.includes("PRIVATE"));
  assert.ok(!serialized.includes("fictional-kevin"));
  s.consents["household:kevin"] = {
    ...consentDefault(),
    readiness: true,
    coverage: true,
    balance: true,
    expenseIds: [personalData(s, "kevin").transactions[0].id],
  };
  view = workspaceView(s, "household", "ava");
  assert.equal(view.commitments[0].projectedCents, 180000);
  assert.equal(view.commitments[0].shortfallCents, 20000);
  s.consents["household:kevin"] = consentDefault();
  view = workspaceView(s, "household", "ava");
  assert.equal(view.commitments[0].projectedCents, null);
  assert.equal(
    view.commitments[0].contributions[1].disclosedBalanceCents,
    undefined,
  );
});
test("workspaces are isolated and unauthorized membership is rejected", () => {
  const s = fixed();
  assert.throws(() => workspaceView(s, "household", "maya"));
  s.workspaces.push({
    id: "private-group",
    name: "Private group",
    kind: "Family",
    owner: "kevin",
    members: ["kevin", "maya"],
  });
  assert.throws(() => workspaceView(s, "private-group", "ava"));
  assert.deepEqual(workspaceView(s, "private-group", "maya").commitments, []);
});
test("unknown data and attempts to change shared bills through a personal scenario are rejected", () => {
  const s = fixed();
  s.commitments[0].dueDate = "2026-12-17";
  assert.match(
    workspaceView(s, "household", "kevin").commitments[0].contributions[1]
      .status,
    /unknown/,
  );
  assert.throws(() =>
    validateSimulation(
      { eventId: "bill:shared-rent", paymentCents: 0 },
      personalData(s, "kevin"),
    ),
  );
  assert.throws(() =>
    validateSimulation(
      { removedSubscriptions: ["someone-else"] },
      personalData(s, "kevin"),
    ),
  );
});

function request(profile: string, id: string, body?: unknown) {
  return new Request(`http://localhost/api/collaboration?profile=${profile}`, {
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    headers: {
      origin: "http://localhost",
      cookie: `vesta-demo=${id}`,
      "Content-Type": "application/json",
    },
  });
}
async function action(
  profile: string,
  id: string,
  body: Record<string, unknown>,
) {
  const response = await POST(
    request(profile, id, { ...body, confirmed: true }),
  );
  return { response, value: await response.json() };
}
test("API enforces confirmation, same origin, own proposals and own contribution reports", async () => {
  const id = randomUUID();
  assert.equal(
    (
      await POST(
        request("kevin", id, {
          action: "workspace",
          name: "No consent",
          kind: "Household",
        }),
      )
    ).status,
    400,
  );
  const forged = request("kevin", id, {
    action: "scenario",
    simulation: {},
    confirmed: true,
  });
  forged.headers.set("origin", "https://attacker.test");
  assert.equal((await POST(forged)).status, 403);
  assert.equal(
    (await action("kevin", id, { action: "removeCommitment", id: "rent" }))
      .response.status,
    400,
  );
  assert.equal(
    (
      await action("maya", id, {
        action: "report",
        id: "rent",
        amountCents: 100,
      })
    ).response.status,
    400,
  );
  const reported = await action("kevin", id, {
    action: "report",
    id: "rent",
    amountCents: 30000,
    profile: "ava",
  });
  assert.equal(
    reported.value.workspaces[0].commitments[0].contributions[1].reportedCents,
    30000,
  );
  assert.equal(
    reported.value.workspaces[0].commitments[0].contributions[0].reportedCents,
    100000,
  );
});
test("API privacy revocation, per-session isolation and selected-expense authorization", async () => {
  const id = randomUUID();
  const consent = { ...consentDefault(), readiness: true };
  await action("kevin", id, {
    action: "consent",
    workspaceId: "household",
    consent,
  });
  let result = await GET(request("ava", id));
  let view = await result.json();
  assert.equal(
    view.workspaces[0].commitments[0].contributions[1].status,
    "may be at risk",
  );
  assert.ok(!JSON.stringify(view).includes("fictional-kevin"));
  assert.equal(view.own.preferences.length, 0);
  const other = await (await GET(request("ava", randomUUID()))).json();
  assert.equal(
    other.workspaces[0].commitments[0].contributions[1].status,
    "not shared",
  );
  await action("kevin", id, {
    action: "consent",
    workspaceId: "household",
    consent: consentDefault(),
  });
  result = await GET(request("ava", id));
  view = await result.json();
  assert.equal(
    view.workspaces[0].commitments[0].contributions[1].status,
    "not shared",
  );
  const bad = await action("ava", id, {
    action: "consent",
    workspaceId: "household",
    consent: { ...consent, expenseIds: ["kevin-Spotify-1"] },
  });
  assert.equal(bad.response.status, 400);
});
test("demo profile financial endpoint returns only that fictional profile, never Nessie", async () => {
  const id = randomUUID();
  const r = await financialGET(
    new Request(
      "http://localhost/api/financial-data?mode=demo&customer=demo:kevin",
      { headers: { cookie: `vesta-demo=${id}` } },
    ),
  );
  const data = await r.json();
  assert.equal(data.source, "demo");
  assert.equal(data.customers[0].id, "kevin");
  assert.equal(data.accounts.length, 1);
  assert.ok(
    data.accounts.every(
      (a: { customerId: string }) => a.customerId === "kevin",
    ),
  );
});
test("private AI memory and conversation remain isolated; proposals require separate confirmation", async () => {
  const id = randomUUID();
  await action("kevin", id, {
    action: "memory",
    enabled: true,
    preferences: ["My gym membership is non-negotiable."],
  });
  let result = await action("kevin", id, {
    action: "chat",
    question: "What are my options?",
    language: "en",
  });
  assert.ok(!result.value.assistant.reply.includes("review Riverside Fitness"));
  assert.match(result.value.assistant.reply, /preference to keep the gym/);
  result = await action("kevin", id, {
    action: "chat",
    question: "¿Qué pasa si cancelo Spotify?",
    language: "es",
  });
  assert.equal(result.value.assistant.source, "deterministic");
  assert.match(result.value.assistant.reply, /Simular/);
  assert.equal(result.value.assistant.proposal.beforeCents, -20000);
  assert.equal(result.value.assistant.proposal.afterCents, -18500);
  assert.deepEqual(result.value.own.simulation, {});
  await action("kevin", id, {
    action: "scenario",
    simulation: result.value.assistant.proposal.simulation,
  });
  const ava = await (await GET(request("ava", id))).json();
  assert.deepEqual(ava.own.preferences, []);
  assert.deepEqual(ava.own.messages, []);
  assert.equal(
    ava.workspaces[0].commitments[0].contributions[1].scenarioStatus,
    "not shared",
  );
  await action("kevin", id, {
    action: "memory",
    enabled: false,
    preferences: [],
  });
  const state = await withDemo(id, (s) => s.plans.kevin);
  assert.equal(state.memoryOptIn, false);
  assert.deepEqual(state.preferences, []);
});
test("browser-owned state retains independent updates across reads", async () => {
  const id = randomUUID();
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      withDemo(
        id,
        (s) => {
          s.plans.kevin.preferences.push(String(i));
        },
        true,
      ),
    ),
  );
  const result = await withDemo(id, (s) => s.plans.kevin.preferences);
  assert.equal(result.length, 5);
});

test("workspace creation, fictional invitations, proposals, agreement and own edits work through the API", async () => {
  const id = randomUUID();
  let result = await action("kevin", id, {
    action: "workspace",
    name: "Trip fund",
    kind: "Custom",
  });
  assert.equal(result.response.status, 200);
  const workspaceId = result.value.workspaces.find(
    (w: { name: string }) => w.name === "Trip fund",
  ).id;
  assert.equal(
    (await action("ava", id, { action: "member", workspaceId, member: "maya" }))
      .response.status,
    400,
  );
  await action("kevin", id, { action: "member", workspaceId, member: "maya" });
  const dueDate = shift(result.value.asOf, 11);
  result = await action("kevin", id, {
    action: "commitment",
    workspaceId,
    name: "Shared savings goal",
    amountCents: 20000,
    dueDate,
    recurring: false,
    contributions: [
      { profile: "kevin", expectedCents: 10000 },
      { profile: "maya", expectedCents: 10000 },
    ],
  });
  assert.equal(result.response.status, 200);
  let commitment = result.value.workspaces.find(
    (w: { id: string }) => w.id === workspaceId,
  ).commitments[0];
  assert.equal(commitment.contributions[0].agreed, false);
  await action("maya", id, { action: "agree", id: commitment.id });
  const maya = await (await GET(request("maya", id))).json();
  assert.equal(
    maya.workspaces[0].commitments[0].contributions.find(
      (a: { profile: string }) => a.profile === "maya",
    ).agreed,
    true,
  );
  assert.equal(
    (
      await action("maya", id, {
        action: "removeCommitment",
        id: commitment.id,
      })
    ).response.status,
    400,
  );
  result = await action("kevin", id, {
    action: "commitment",
    id: commitment.id,
    workspaceId,
    name: "Adjusted savings goal",
    amountCents: 21000,
    dueDate,
    recurring: false,
    contributions: [
      { profile: "kevin", expectedCents: 10000 },
      { profile: "maya", expectedCents: 11000 },
    ],
  });
  assert.equal(result.response.status, 200);
  commitment = result.value.workspaces.find(
    (w: { id: string }) => w.id === workspaceId,
  ).commitments[0];
  assert.equal(
    commitment.contributions.find(
      (a: { profile: string }) => a.profile === "maya",
    ).agreed,
    false,
  );
  assert.equal(
    (
      await action("kevin", id, {
        action: "removeCommitment",
        id: commitment.id,
      })
    ).response.status,
    200,
  );
  const ava = await (await GET(request("ava", id))).json();
  assert.equal(ava.workspaces.length, 1);
  assert.equal(ava.workspaces[0].id, "household");
});
