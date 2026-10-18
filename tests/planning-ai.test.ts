import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/collaboration/model";
import { assistant } from "../lib/collaboration/assistant";
import { clearRemote, remotePreferences } from "../lib/collaboration/backboard";

test("Backboard uses separate assistants, explicit memory CRUD, read-only recall and no banking context", async () => {
  const original = globalThis.fetch;
  const saved = process.env.BACKBOARD_API_KEY;
  process.env.BACKBOARD_API_KEY = "fictional-test-key";
  const calls: {
    url: string;
    method: string;
    body: Record<string, unknown>;
  }[] = [];
  let sequence = 0;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, method: init?.method || "GET", body });
    if (url.endsWith("/assistants") && init?.method === "POST")
      return Response.json({ assistant_id: `assistant-${++sequence}` });
    if (url.endsWith("/memories") && (!init?.method || init.method === "GET"))
      return Response.json({
        memories: [{ id: "old-preference", content: "Old preference" }],
      });
    if (url.endsWith("/threads/messages"))
      return Response.json({
        content: JSON.stringify({ intent: "options", inventedBalance: 999999 }),
      });
    return Response.json({ memory_id: "new-preference" });
  }) as typeof fetch;
  try {
    const s = initialState("2026-10-17");
    s.plans.kevin.memoryOptIn = true;
    s.plans.kevin.preferences = ["Keep my gym"];
    await remotePreferences(
      s.plans.kevin,
      "browser-kevin",
      s.plans.kevin.preferences,
    );
    await remotePreferences(s.plans.ava, "browser-ava", ["Ava preference"]);
    assert.notEqual(s.plans.kevin.assistantId, s.plans.ava.assistantId);
    const response = await assistant(
      s,
      "kevin",
      "How can I improve my outlook?",
      "en",
      "browser-kevin",
    );
    assert.equal(response.source, "backboard");
    assert.ok(!response.reply.includes("999999"));
    const specific = await assistant(
      s,
      "kevin",
      "What happens if I cancel Spotify?",
      "en",
      "browser-kevin",
    );
    assert.equal(specific.proposal?.label, "Spotify");
    const message = calls.find((c) => c.url.endsWith("/threads/messages"))!;
    assert.equal(message.body.assistant_id, s.plans.kevin.assistantId);
    assert.equal(message.body.memory, "Readonly");
    assert.ok(!JSON.stringify(message.body).includes("Ava preference"));
    assert.ok(!JSON.stringify(message.body).includes("128000"));
    assert.ok(!JSON.stringify(message.body).includes("fictional-kevin"));
    assert.ok(
      calls.some(
        (c) => c.method === "DELETE" && c.url.endsWith("old-preference"),
      ),
    );
    const ownId = s.plans.kevin.assistantId;
    await clearRemote(s.plans.kevin);
    assert.equal(s.plans.kevin.assistantId, undefined);
    assert.ok(
      calls.some(
        (c) => c.url.endsWith(`/assistants/${ownId}`) && c.method === "DELETE",
      ),
    );
    assert.ok(s.plans.ava.assistantId);
  } finally {
    globalThis.fetch = original;
    if (saved) process.env.BACKBOARD_API_KEY = saved;
    else delete process.env.BACKBOARD_API_KEY;
  }
});
test("Gemini output cannot inject invented financial statements or perform actions", async () => {
  const original = globalThis.fetch;
  const key = process.env.GEMINI_API_KEY;
  delete process.env.BACKBOARD_API_KEY;
  process.env.GEMINI_API_KEY = "fictional-gemini";
  globalThis.fetch = (async () =>
    Response.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  intent: "risk",
                  reply: "Kevin has $9,999,999 and Ava owes him money",
                }),
              },
            ],
          },
        },
      ],
    })) as typeof fetch;
  try {
    const s = initialState("2026-10-17");
    const r = await assistant(s, "kevin", "Explain rent risk", "en", "scope");
    assert.equal(r.source, "gemini");
    assert.match(r.reply, /-\$200.00/);
    assert.ok(!r.reply.includes("9,999,999"));
    assert.deepEqual(s.plans.kevin.simulation, {});
    assert.deepEqual(s.consents, initialState().consents);
  } finally {
    globalThis.fetch = original;
    if (key) process.env.GEMINI_API_KEY = key;
    else delete process.env.GEMINI_API_KEY;
  }
});
