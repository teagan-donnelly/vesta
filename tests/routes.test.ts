import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/financial-data/route";
import { POST as seed } from "../app/api/nessie/seed/route";
import { POST as explain } from "../app/api/explain/route";

test("demo data route returns labeled records; invalid modes are rejected", async () => {
  const response = await GET(
    new Request("http://localhost:3000/api/financial-data?mode=demo"),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.source, "demo");
  assert.equal(data.accounts.length, 3);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    (
      await GET(
        new Request("http://localhost:3000/api/financial-data?mode=invalid"),
      )
    ).status,
    400,
  );
});
test("sandbox writes reject hosted and cross-origin requests without contacting Nessie", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Must not make upstream requests");
  });
  assert.equal(
    (
      await seed(
        new Request("https://vesta.example/api/nessie/seed", {
          method: "POST",
          headers: { origin: "https://vesta.example" },
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await seed(
        new Request("http://localhost:3000/api/nessie/seed", {
          method: "POST",
          headers: { origin: "https://other.example" },
        }),
      )
    ).status,
    403,
  );
});
test("retired customer creation endpoint cannot bypass the preview workflow", async (t) => {
  const original = process.env.NESSIE_API_KEY;
  process.env.NESSIE_API_KEY = "test-placeholder";
  t.after(() => {
    if (original === undefined) delete process.env.NESSIE_API_KEY;
    else process.env.NESSIE_API_KEY = original;
  });
  let reads = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: URL, options: RequestInit) => {
      assert.equal(options.method, "GET");
      reads++;
      return Response.json([
        { _id: "exists", first_name: "Vesta", last_name: "Fictional Test" },
      ]);
    },
  );
  const result = await seed(
    new Request("http://localhost:3000/api/nessie/seed", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    }),
  );
  assert.equal(result.status, 410);
  assert.equal(reads, 0);
});
test("explanation route rejects forged origins and invalid simulation amounts", async () => {
  assert.equal(
    (
      await explain(
        new Request("http://localhost:3000/api/explain", { method: "POST" }),
      )
    ).status,
    403,
  );
  const result = await explain(
    new Request("http://localhost:3000/api/explain", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        mode: "demo",
        simulation: { unexpectedCents: -1 },
      }),
    }),
  );
  assert.equal(result.status, 400);
});
