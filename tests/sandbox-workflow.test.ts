import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadNessie } from "../lib/nessie";
import { project, subscriptionsFor } from "../lib/analysis";
import { sandboxDescription } from "../lib/sandbox-records";
import { scenarioItems } from "../lib/sandbox-scenario";
import {
  assertLocalRequest,
  confirmScenario,
  inspectScenario,
  prepareScenario,
  scenarioRunStatus,
} from "../lib/sandbox-workflow";
import { POST as scenarioRoute } from "../app/api/nessie/scenario/route";

type Raw = Record<string, unknown>;
async function harness(t: TestContext) {
  const env = {
    nessie: process.env.NESSIE_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  };
  process.env.NESSIE_API_KEY = "test-placeholder";
  process.env.GEMINI_API_KEY = "test-placeholder";
  t.after(() => {
    for (const [key, value] of [
      ["NESSIE_API_KEY", env.nessie],
      ["GEMINI_API_KEY", env.gemini],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  });
  await mkdir(join(process.cwd(), ".tmp"), { recursive: true });
  const root = await mkdtemp(join(process.cwd(), ".tmp", "seed-test-"));
  const state = {
    balance: 2000,
    posts: 0,
    failAfterWrite: false,
    hideCreated: false,
    geminiCalls: 0,
    peak: 2000,
  };
  const records: Record<string, Raw[]> = {
    deposits: [],
    withdrawals: [],
    bills: [],
    loans: [],
  };
  t.mock.method(
    globalThis,
    "fetch",
    async (input: URL | string, options: RequestInit = {}) => {
      const url = new URL(String(input));
      if (url.origin === "https://generativelanguage.googleapis.com") {
        state.geminiCalls++;
        const prompt = String(options.body);
        assert.ok(!prompt.includes("VESTA_FICTIONAL_V1"));
        assert.ok(!prompt.includes("test-placeholder"));
        return Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '["cash","scenario","subscriptions","alerts","coverage"]',
                  },
                ],
              },
            },
          ],
        });
      }
      assert.equal(url.origin, "https://prod-api.nessieisreal.com");
      assert.equal(url.searchParams.get("key"), "test-placeholder");
      const path = url.pathname;
      if (path === "/customers")
        return Response.json([
          { _id: "c", first_name: "Vesta", last_name: "Fictional Test" },
        ]);
      if (path === "/customers/c/accounts")
        return Response.json([
          {
            _id: "a",
            customer_id: "c",
            type: "Checking",
            nickname: "Vesta fictional checking",
            balance: state.balance,
          },
        ]);
      const kind = path.split("/").at(-1)!;
      assert.ok(
        /^\/accounts\/a\/(deposits|withdrawals|bills|loans)$/.test(path),
        `Undocumented request attempted: ${path}`,
      );
      if (options.method === "POST") {
        assert.notEqual(kind, "loans");
        state.posts++;
        const body = JSON.parse(String(options.body));
        const record = { _id: `created-${state.posts}`, ...body };
        records[kind].push(record);
        if (kind === "deposits") state.balance += body.amount;
        if (kind === "withdrawals") state.balance -= body.amount;
        state.peak = Math.max(state.peak, state.balance);
        if (state.failAfterWrite)
          throw new Error("Lost response for key=test-placeholder");
        return Response.json("Created", { status: 201 });
      }
      assert.equal(options.method, "GET");
      return Response.json(state.hideCreated ? [] : records[kind]);
    },
  );
  return { root, state, records };
}

test("preview performs no financial writes and predicts a coherent fictional vulnerability", async (t) => {
  const { root, state } = await harness(t);
  const preview = await prepareScenario("c", "a", root);
  assert.equal(state.posts, 0);
  assert.equal(state.geminiCalls, 0);
  assert.equal(preview.items.length, 33);
  assert.equal(preview.historyIncomeCents, 750000);
  assert.equal(preview.historyExpenseCents, 750000);
  assert.equal(preview.balanceBeforeCents, 200000);
  assert.equal(preview.temporaryPeakBalanceCents, 950000);
  assert.equal(preview.expected.subscriptionCount, 3);
  assert.equal(preview.expected.lowestBalanceCents, -45000);
  assert.ok(preview.expected.subscriptionRemovalDeltaCents >= 6000);
  assert.ok(preview.expected.checks.every((c) => c.passed));
  const live = await loadNessie("c");
  assert.equal(live.transactions.length, 0);
  assert.equal(project(live).endingBalanceCents, 200000);
  assert.equal((await scenarioRunStatus(preview.id, root)).state, "preview");
});
test("seeding cannot start without explicit typed consent and balance acknowledgment", async (t) => {
  const { root, state } = await harness(t);
  const preview = await prepareScenario("c", "a", root);
  await assert.rejects(
    () => confirmScenario(preview.id, "yes", true, root),
    /type SEED FICTIONAL DATA/,
  );
  await assert.rejects(
    () => confirmScenario(preview.id, "SEED FICTIONAL DATA", false, root),
    /acknowledge/,
  );
  assert.equal(state.posts, 0);
});
test("confirmed mock seeding reads every created record back and analyzes only returned Nessie data", async (t) => {
  const { root, state } = await harness(t);
  const preview = await prepareScenario("c", "a", root);
  const result = await confirmScenario(
    preview.id,
    "SEED FICTIONAL DATA",
    true,
    root,
  );
  assert.equal(state.posts, 33);
  assert.equal(result.state, "complete");
  assert.equal(result.verification.source, "nessie");
  assert.equal(result.verification.records.length, 33);
  assert.equal(result.verification.balanceMatchesExpected, true);
  assert.equal(result.verification.balanceCents, 200000);
  assert.equal(state.peak, 9500);
  assert.equal(result.explanation.source, "gemini");
  assert.equal(state.geminiCalls, 1);
  assert.ok(result.verification.metrics.checks.every((c) => c.passed));
  const live = await loadNessie("c");
  const baseline = project(live);
  const unchanged = structuredClone(baseline);
  const sub = subscriptionsFor(live).find((s) => s.merchant === "StreamNest")!;
  assert.ok(sub);
  assert.ok(
    project(live, { removedSubscriptions: [sub.id] }).endingBalanceCents >
      baseline.endingBalanceCents,
  );
  assert.deepEqual(project(live), unchanged);
  assert.ok(
    live.transactions.every(
      (t) => t.recordType === "withdrawal" || t.recordType === "deposit",
    ),
  );
  assert.ok(live.warnings.some((w) => w.includes("Fictional Nessie sandbox")));
  await assert.rejects(
    () => confirmScenario(preview.id, "SEED FICTIONAL DATA", true, root),
    /already been submitted/,
  );
  await assert.rejects(
    () => prepareScenario("c", "a", root),
    /already has a submitted/,
  );
  assert.equal(state.posts, 33);
});
test("changed live balance invalidates confirmation before any write", async (t) => {
  const { root, state } = await harness(t);
  const preview = await prepareScenario("c", "a", root);
  state.balance = 2100;
  await assert.rejects(
    () => confirmScenario(preview.id, "SEED FICTIONAL DATA", true, root),
    /changed since preview/,
  );
  assert.equal(state.posts, 0);
});
test("uncertain upstream writes are durably recorded and cannot be retried with any preview", async (t) => {
  const { root, state } = await harness(t);
  const first = await prepareScenario("c", "a", root);
  const second = await prepareScenario("c", "a", root);
  state.failAfterWrite = true;
  await assert.rejects(
    () => confirmScenario(first.id, "SEED FICTIONAL DATA", true, root),
    /Seeding stopped/,
  );
  const status = await scenarioRunStatus(first.id, root);
  assert.equal(status.state, "needs-review");
  assert.equal(status.verified, 0);
  assert.equal(status.uncertain.length, 1);
  assert.equal(state.posts, 1);
  await assert.rejects(
    () => confirmScenario(first.id, "SEED FICTIONAL DATA", true, root),
    /already been submitted/,
  );
  await assert.rejects(
    () => confirmScenario(second.id, "SEED FICTIONAL DATA", true, root),
    /Another scenario/,
  );
  await assert.rejects(
    () => prepareScenario("c", "a", root),
    /already has a submitted/,
  );
  assert.equal(state.posts, 1);
});
test("missing read-back stops the workflow without substituting planned records", async (t) => {
  const { root, state } = await harness(t);
  const preview = await prepareScenario("c", "a", root);
  state.hideCreated = true;
  await assert.rejects(
    () => confirmScenario(preview.id, "SEED FICTIONAL DATA", true, root),
    /could not be uniquely retrieved/,
  );
  assert.equal(state.posts, 1);
  const live = await inspectScenario("c", "a");
  assert.equal(live.records.length, 0);
  assert.equal(live.metrics.subscriptionCount, 0);
  assert.equal(
    (await scenarioRunStatus(preview.id, root)).state,
    "needs-review",
  );
});
test("existing scenario markers prevent duplicate datasets even without the local ledger", async (t) => {
  const { root, state, records } = await harness(t);
  records.withdrawals.push({
    _id: "existing",
    description: sandboxDescription(
      "subscription",
      "StreamNest",
      "previous-run",
    ),
    transaction_date: "2026-10-01",
    amount: 25,
    status: "completed",
    medium: "balance",
  });
  await assert.rejects(
    () => prepareScenario("c", "a", root),
    /Scenario records already exist/,
  );
  assert.equal(state.posts, 0);
});
test("expired or modified previews never write records", async (t) => {
  const { root, state } = await harness(t);
  const preview = await prepareScenario("c", "a", root);
  const path = join(root, `${preview.id}.json`);
  const plan = JSON.parse(await readFile(path, "utf8"));
  plan.preview.expiresAt = "2020-01-01T00:00:00Z";
  await writeFile(path, JSON.stringify(plan));
  await assert.rejects(
    () => confirmScenario(preview.id, "SEED FICTIONAL DATA", true, root),
    /expired/,
  );
  plan.preview.expiresAt = new Date(Date.now() + 60000).toISOString();
  plan.preview.items[0].body.amount = 1;
  await writeFile(path, JSON.stringify(plan));
  await assert.rejects(
    () => confirmScenario(preview.id, "SEED FICTIONAL DATA", true, root),
    /saved preview changed/,
  );
  assert.equal(state.posts, 0);
});
test("the localhost scenario route rejects hosted, forged and unconfirmed requests", async (t) => {
  const { state } = await harness(t);
  assert.throws(
    () =>
      assertLocalRequest(
        new Request("https://vesta.example/api/nessie/scenario"),
      ),
    /localhost/,
  );
  const forged = await scenarioRoute(
    new Request("http://localhost:3000/api/nessie/scenario", {
      method: "POST",
      headers: { origin: "https://other.example" },
      body: JSON.stringify({
        action: "preview",
        customerId: "c",
        accountId: "a",
      }),
    }),
  );
  assert.equal(forged.status, 403);
  const noConsent = await scenarioRoute(
    new Request("http://localhost:3000/api/nessie/scenario", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: JSON.stringify({ action: "confirm", planId: "not-a-plan" }),
    }),
  );
  assert.equal(noConsent.status, 400);
  assert.equal(state.posts, 0);
});
test("scenario deposits and withdrawals use documented integer dollar payloads", () => {
  const items = scenarioItems("2026-10-17");
  assert.ok(
    items
      .filter((i) => i.collection !== "bills")
      .every((i) => Number.isInteger(i.body.amount)),
  );
  assert.equal(new Set(items.map((i) => i.reference)).size, items.length);
});
test("simultaneous confirmations cannot write the scenario twice", async (t) => {
  const { root, state } = await harness(t);
  const preview = await prepareScenario("c", "a", root);
  const outcomes = await Promise.allSettled([
    confirmScenario(preview.id, "SEED FICTIONAL DATA", true, root),
    confirmScenario(preview.id, "SEED FICTIONAL DATA", true, root),
  ]);
  assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((o) => o.status === "rejected").length, 1);
  assert.equal(state.posts, 33);
});
test("production rejects sandbox setup even when the request hostname is localhost", async (t) => {
  const original = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  t.after(() => {
    if (original === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: original });
  });
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("No upstream call is allowed");
  });
  const result = await scenarioRoute(
    new Request("http://localhost:3000/api/nessie/scenario", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: JSON.stringify({
        action: "preview",
        customerId: "c",
        accountId: "a",
      }),
    }),
  );
  assert.equal(result.status, 403);
});
