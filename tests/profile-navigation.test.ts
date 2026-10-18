import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { FinancialProvider, useFinancial } from "../components/financial-provider";
import { POST } from "../app/api/demo-snapshot/route";
import { PROFILE_KEY } from "../lib/profile-preferences";
import { SNAPSHOT_KEY, snapshotFetch } from "../lib/snapshot-client";

test("mounted profiles and manual records persist through browser storage and concurrent confirmed changes", async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://vesta.example" });
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  t.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
    if (url === "/api/demo-session") return Response.json({ ready: true });
    assert.equal(url, "/api/demo-snapshot");
    return POST(new Request("https://vesta.example/api/demo-snapshot", { ...options, headers: { origin: "https://vesta.example" } }));
  });
  dom.window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ mode: "demo", customer: "demo:kevin" }));
  let current!: ReturnType<typeof useFinancial>;
  function Probe() { current = useFinancial(); return null; }
  const root = createRoot(dom.window.document.getElementById("root")!);
  async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)); }); }
  try {
    await act(async () => root.render(createElement(FinancialProvider, null, createElement(Probe))));
    await settle();
    assert.equal(current.data?.accounts[0].customerId, "kevin");
    assert.ok(current.records.some(r => r.kind === "credit"));
    await act(async () => {
      await Promise.all(["one", "two", "three"].map(id => current.saveRecord({ id, kind: "resource", label: `Kevin private ${id}` })));
    });
    assert.equal(current.records.filter(r => r.id === "one" || r.id === "two" || r.id === "three").length, 3);
    const stored = dom.window.localStorage.getItem(SNAPSHOT_KEY)!;
    assert.match(stored, /Kevin private one/);
    for (const profile of ["ava", "maya", "kevin"]) {
      await act(async () => current.setDemoProfile(profile));
      await settle();
      assert.equal(current.data?.accounts[0].customerId, profile);
      assert.equal(current.error, "");
      assert.equal(current.records.some(r => r.id === "one"), profile === "kevin");
    }
    const refreshed = await (await snapshotFetch("/api/records?mode=demo&customer=demo:kevin")).json();
    assert.ok(refreshed.records.some((r: { id: string }) => r.id === "one"));
    dom.window.localStorage.removeItem(SNAPSHOT_KEY);
    const reset = await (await snapshotFetch("/api/records?mode=demo&customer=demo:kevin")).json();
    assert.ok(!reset.records.some((r: { id: string }) => r.id === "one"));
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
