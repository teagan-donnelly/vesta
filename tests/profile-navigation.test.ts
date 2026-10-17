import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { FinancialProvider, useFinancial } from "../components/financial-provider";
import { useDemoPlanning } from "../components/demo-planning";
import { fixtureData, initialState, personalData } from "../lib/collaboration/model";
import { PROFILE_KEY } from "../lib/profile-preferences";

test("mounted provider survives Nessie → Shared → Kevin → Home, isolates profiles and ignores late planning responses", async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://vesta.example" });
  const browserGlobals = { window: dom.window, document: dom.window.document, Event: dom.window.Event };
  for (const [key, value] of Object.entries(browserGlobals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  dom.window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ mode: "nessie", customer: "sandbox-test" }));
  let current!: ReturnType<typeof useFinancial>;
  let shared!: ReturnType<typeof useDemoPlanning>;
  let pendingKevin: ((response: Response) => void) | undefined;
  let holdKevin = false;
  let healthy = false;
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(input);
    const url = new URL(input, "https://vesta.example");
    if (url.pathname === "/api/demo-session") return Response.json({ ready: true });
    if (url.pathname === "/api/financial-data") {
      if (url.searchParams.get("mode") === "nessie") {
        const snapshot = fixtureData("ava", "2026-10-17");
        snapshot.source = "nessie"; // A mocked upstream response, never a live Nessie claim.
        snapshot.accounts[0].balanceCents = 200000;
        return Response.json(snapshot);
      }
      const profile = url.searchParams.get("customer")!.slice(5) as "ava" | "kevin" | "maya";
      const snapshot = fixtureData(profile, "2026-10-17");
      snapshot.warnings.push("Shared planning is not included.");
      return Response.json(snapshot);
    }
    if (url.pathname === "/api/personal-planning" && holdKevin && url.searchParams.get("profile") === "kevin")
      return new Promise<Response>((resolve) => { pendingKevin = resolve; });
    if (url.pathname === "/api/personal-planning" && healthy)
      return Response.json({ ...personalData(initialState("2026-10-17"), url.searchParams.get("profile") as "ava" | "kevin" | "maya"), planningSimulation: {} });
    return Response.json({ error: "Planning unavailable" }, { status: 503 });
  });
  function Home() {
    current = useFinancial();
    return createElement("div", null, current.data?.accounts[0].customerId || current.error || "loading");
  }
  function Shared() {
    current = useFinancial();
    shared = useDemoPlanning(current.customer.slice(5));
    return createElement("div", null, shared.error || "shared");
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  const render = async (page: typeof Home) => {
    await act(async () => { root.render(createElement(FinancialProvider, null, createElement(page))); });
  };
  const switchTo = async (profile: string) => { await act(async () => { current.setDemoProfile(profile); }); };
  try {
    await render(Home);
    assert.equal(current.data?.source, "nessie");
    assert.equal(current.data?.accounts[0].balanceCents, 200000);
    await render(Shared);
    await switchTo("kevin");
    assert.match(shared.error, /Planning unavailable/);
    assert.equal(current.error, "");
    assert.equal(current.data?.source, "demo");
    await render(Home);
    assert.equal(current.data?.accounts[0].customerId, "kevin");
    assert.equal(current.data?.accounts[0].balanceCents, 128000);
    for (const profile of ["ava", "maya", "kevin"]) {
      await switchTo(profile);
      assert.equal(current.data?.accounts[0].customerId, profile);
      assert.equal(current.error, "");
      assert.ok(current.data?.warnings.some((w) => w.startsWith("Shared planning is not included")));
    }
    holdKevin = true;
    await act(async () => { current.reload(); });
    assert.ok(pendingKevin);
    await switchTo("maya");
    await act(async () => { pendingKevin!(Response.json({ ...personalData(initialState("2026-10-17"), "kevin"), planningSimulation: { unexpectedCents: 99999 } })); });
    assert.equal(current.data?.accounts[0].customerId, "maya", "late Kevin response cannot expose his data to Maya");
    assert.deepEqual(current.simulation, {});
    healthy = true;
    holdKevin = false;
    await switchTo("kevin");
    assert.ok(current.data?.bills.some((b) => b.id === "shared-rent"));
    assert.ok(!current.data?.warnings.some((w) => w.startsWith("Shared planning is not included")));
    assert.ok(requests.includes("/api/demo-session"));
    assert.ok(!requests.some((url) => url.includes("list=1")), "session initialization does not use a database-backed list request");
  } finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
  }
});
