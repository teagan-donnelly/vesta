import { test } from "node:test";
import assert from "node:assert/strict";
import { loadNessie, cents } from "../lib/nessie";
import { explain } from "../lib/explanations";
import { demoData } from "../lib/data";

test("Nessie normalizes monetary units, statuses, customers and all supported records", async (t) => {
  const original = process.env.NESSIE_API_KEY;
  process.env.NESSIE_API_KEY = "test-placeholder";
  t.after(() => {
    if (original === undefined) delete process.env.NESSIE_API_KEY;
    else process.env.NESSIE_API_KEY = original;
  });
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    assert.equal(input.origin, "https://prod-api.nessieisreal.com");
    assert.equal(input.searchParams.get("key"), "test-placeholder");
    calls.push(input.pathname);
    const routes: Record<string, unknown> = {
      "/customers": [
        { _id: "c", first_name: "Fictional", last_name: "Customer" },
      ],
      "/customers/c/accounts": [
        {
          _id: "a",
          customer_id: "c",
          type: "Checking",
          nickname: "Checking",
          balance: 1234.56,
        },
      ],
      "/accounts/a/deposits": [
        {
          _id: "d",
          transaction_date: "2026-10-01",
          amount: 100.01,
          status: "completed",
          description: "Employer payroll",
        },
      ],
      "/accounts/a/withdrawals": [
        {
          _id: "w",
          transaction_date: "2026-10-02",
          amount: 20.02,
          status: "completed",
          description: "Cash",
        },
        {
          _id: "cancelled",
          transaction_date: "2026-10-02",
          amount: 999,
          status: "cancelled",
        },
      ],
      "/accounts/a/bills": [
        {
          _id: "b",
          payee: "Rent",
          payment_amount: 900.05,
          upcoming_payment_date: "2026-11-01",
          status: "pending",
        },
        { _id: "paid", status: "completed" },
      ],
      "/accounts/a/loans": [{ _id: "l", amount: 5000, monthly_payment: 100 }],
    };
    assert.ok(input.pathname in routes);
    return Response.json(routes[input.pathname]);
  });
  const d = await loadNessie();
  assert.equal(d.source, "nessie");
  assert.equal(d.accounts[0].balanceCents, 123456);
  assert.equal(d.transactions.length, 2);
  assert.equal(
    d.transactions.find((t) => t.id === "w")!.recordType,
    "withdrawal",
  );
  assert.equal(d.transactions.find((t) => t.id === "d")!.amountCents, 10001);
  assert.equal(d.transactions[0].pending, false);
  assert.equal(d.bills.length, 1);
  assert.equal(d.bills[0].amountCents, 90005);
  assert.equal(d.loans[0].paymentCents, 10000);
  assert.ok(!calls.some((path) => path.includes("purchase")));
  assert.ok(d.warnings.some((w) => w.includes("does not document")));
});
test("Nessie failures never silently return demo records and errors redact credentials", async (t) => {
  const original = process.env.NESSIE_API_KEY;
  process.env.NESSIE_API_KEY = "test-placeholder";
  t.after(() => {
    if (original === undefined) delete process.env.NESSIE_API_KEY;
    else process.env.NESSIE_API_KEY = original;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("Do not echo this upstream response", { status: 401 }),
  );
  await assert.rejects(() => loadNessie(), {
    message: "Nessie /customers returned HTTP 401.",
  });
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("https://example.invalid?key=test-placeholder");
  });
  await assert.rejects(() => loadNessie(), {
    message:
      "Nessie connection failed or timed out. No demo data was substituted.",
  });
});
test("invalid monetary fields are rejected rather than turned into invented zero balances", () => {
  assert.equal(cents(10.99), 1099);
  assert.throws(() => cents(undefined));
  assert.throws(() => cents(-10));
  assert.throws(() => cents(Infinity));
});
test("Gemini can order grounded explanations but cannot inject arbitrary financial claims", async (t) => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-placeholder";
  t.after(() => {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: string, options: RequestInit) => {
      const prompt = String(options.body);
      assert.ok(!prompt.includes("Ava Reynolds"));
      assert.ok(!prompt.includes("test-placeholder"));
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '["alerts","cash","scenario","subscriptions","coverage"]',
                },
              ],
            },
          },
        ],
      });
    },
  );
  const success = await explain(demoData("2026-10-17"));
  assert.equal(success.source, "gemini");
  assert.equal(success.explanations.length, 5);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      candidates: [{ content: { parts: [{ text: '["invented balance"]' }] } }],
    }),
  );
  assert.equal((await explain(demoData())).source, "deterministic");
});
test("Gemini server failure keeps deterministic guidance available", async (t) => {
  const original = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-placeholder";
  t.after(() => {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 503 }),
  );
  const result = await explain(demoData());
  assert.equal(result.source, "deterministic");
  assert.equal(result.explanations.length, 5);
});
