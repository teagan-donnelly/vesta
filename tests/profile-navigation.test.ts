import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import {
  FinancialProvider,
  useFinancial,
} from "../components/financial-provider";
import { useDemoPlanning } from "../components/demo-planning";
import {
  fixtureData,
  initialState,
  personalData,
} from "../lib/collaboration/model";
import { PROFILE_KEY } from "../lib/profile-preferences";
import type { PersonalRecord } from "../lib/management";

test("record saves serialize and an older read cannot erase a newer confirmed change", async (t) => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://vesta.example",
  });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    Event: dom.window.Event,
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  dom.window.localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ mode: "demo", customer: "demo:kevin" }),
  );
  let current!: ReturnType<typeof useFinancial>;
  let finishRead!: (response: Response) => void;
  let finishWrite!: (response: Response) => void;
    let writes = 0;
    const requests: string[] = [];
  let hold = false;
  let saved: PersonalRecord[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string, options?: RequestInit) => {
        requests.push(input);
        const url = new URL(input, "https://vesta.example");
      if (url.pathname === "/api/records") {
        if (options?.method === "POST") {
          writes++;
          const body = JSON.parse(String(options.body));
          saved = [...saved, body.record];
          if (hold)
            return new Promise<Response>((resolve) => {
              finishWrite = resolve;
            });
          return Response.json({
            records: saved,
            storage: "Local fictional demo adapter",
          });
        }
        return new Promise<Response>((resolve) => {
          finishRead = resolve;
        });
      }
      if (url.pathname === "/api/financial-data")
        return Response.json(fixtureData("kevin", "2026-10-17"));
      if (url.pathname === "/api/demo-session")
        return Response.json({ ready: true });
      return Response.json({}, { status: 503 });
    },
  );
  function Probe() {
    current = useFinancial();
    return null;
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  try {
    await act(async () => {
      root.render(createElement(FinancialProvider, null, createElement(Probe)));
    });
      assert.ok(requests.includes("/api/demo-session"));
      const record: PersonalRecord = {
      id: "one",
      kind: "resource",
      label: "Private resource",
      category: "Document",
      status: "needed",
    };
    await act(async () => {
      await current.saveRecord(record);
    });
    await act(async () => {
      finishRead(
        Response.json({ records: [], storage: "Local fictional demo adapter" }),
      );
    });
    assert.equal(
      current.records.length,
      1,
      "stale GET cannot erase the saved resource",
    );
    hold = true;
    let first!: Promise<void>, second!: Promise<void>;
    await act(async () => {
      first = current.saveRecord({ ...record, id: "two" });
      second = current.saveRecord({ ...record, id: "three" });
      await Promise.resolve();
    });
    assert.equal(writes, 2, "second queued save has not started");
    hold = false;
    await act(async () => {
      finishWrite(
        Response.json({
          records: saved,
          storage: "Local fictional demo adapter",
        }),
      );
      await Promise.all([first, second]);
    });
    assert.equal(writes, 3);
    assert.deepEqual(
      current.records.map((r) => r.id),
      ["one", "two", "three"],
    );
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("mounted provider survives Nessie → Shared → Kevin → Home, isolates profiles and ignores late planning responses", async (t) => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://vesta.example",
  });
  const browserGlobals = {
    window: dom.window,
    document: dom.window.document,
    Event: dom.window.Event,
  };
  for (const [key, value] of Object.entries(browserGlobals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  dom.window.localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ mode: "nessie", customer: "sandbox-test" }),
  );
  let current!: ReturnType<typeof useFinancial>;
  let shared!: ReturnType<typeof useDemoPlanning>;
  let pendingKevin: ((response: Response) => void) | undefined;
  let holdKevin = false;
  let healthy = false;
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(input);
    const url = new URL(input, "https://vesta.example");
    if (url.pathname === "/api/demo-session")
      return Response.json({ ready: true });
    if (url.pathname === "/api/financial-data") {
      if (url.searchParams.get("mode") === "nessie") {
        const snapshot = fixtureData("ava", "2026-10-17");
        snapshot.source = "nessie"; // A mocked upstream response, never a live Nessie claim.
        snapshot.accounts[0].balanceCents = 200000;
        return Response.json(snapshot);
      }
      const profile = url.searchParams.get("customer")!.slice(5) as
        "ava" | "kevin" | "maya";
      const snapshot = fixtureData(profile, "2026-10-17");
      snapshot.warnings.push("Shared planning is not included.");
      return Response.json(snapshot);
    }
    if (
      url.pathname === "/api/personal-planning" &&
      holdKevin &&
      url.searchParams.get("profile") === "kevin"
    )
      return new Promise<Response>((resolve) => {
        pendingKevin = resolve;
      });
    if (url.pathname === "/api/personal-planning" && healthy)
      return Response.json({
        ...personalData(
          initialState("2026-10-17"),
          url.searchParams.get("profile") as "ava" | "kevin" | "maya",
        ),
        planningSimulation: {},
      });
    return Response.json({ error: "Planning unavailable" }, { status: 503 });
  });
  function Home() {
    current = useFinancial();
    return createElement(
      "div",
      null,
      current.data?.accounts[0].customerId || current.error || "loading",
    );
  }
  function Shared() {
    current = useFinancial();
    shared = useDemoPlanning(current.customer.slice(5));
    return createElement("div", null, shared.error || "shared");
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  const render = async (page: typeof Home) => {
    await act(async () => {
      root.render(createElement(FinancialProvider, null, createElement(page)));
    });
  };
  const switchTo = async (profile: string) => {
    await act(async () => {
      current.setDemoProfile(profile);
    });
  };
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
      assert.ok(
        current.data?.warnings.some((w) =>
          w.startsWith("Shared planning is not included"),
        ),
      );
    }
    holdKevin = true;
    await act(async () => {
      current.reload();
    });
    assert.ok(pendingKevin);
    await switchTo("maya");
    await act(async () => {
      pendingKevin!(
        Response.json({
          ...personalData(initialState("2026-10-17"), "kevin"),
          planningSimulation: { unexpectedCents: 99999 },
        }),
      );
    });
    assert.equal(
      current.data?.accounts[0].customerId,
      "maya",
      "late Kevin response cannot expose his data to Maya",
    );
    assert.deepEqual(current.simulation, {});
    healthy = true;
    holdKevin = false;
    await switchTo("kevin");
    assert.ok(current.data?.bills.some((b) => b.id === "shared-rent"));
    assert.ok(
      !current.data?.warnings.some((w) =>
        w.startsWith("Shared planning is not included"),
      ),
    );
    assert.ok(
      !requests.some((url) => url.includes("list=1")),
      "session initialization does not use a database-backed list request",
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    dom.window.close();
  }
});
