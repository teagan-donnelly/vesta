"use client";
export const SNAPSHOT_KEY = "vesta.snapshot.v1";
type Envelope = { version: 1; session: string; state?: unknown };
let queue: Promise<unknown> = Promise.resolve();

function load(): Envelope {
  const raw = window.localStorage.getItem(SNAPSHOT_KEY);
  if (raw) {
    const value = JSON.parse(raw);
    if (value.version !== 1 || !/^[a-f0-9-]{36}$/.test(value.session))
      throw Error("Demo snapshot is invalid. Use Reset Demo in Settings.");
    return value;
  }
  return { version: 1, session: crypto.randomUUID() };
}
// Serialize read/modify/write operations across components and, where supported,
// tabs. Always load the latest browser state after obtaining the lock.
export function snapshotFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const run = async () => {
    if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const envelope = load();
    const response = await fetch("/api/demo-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...envelope, path, method: init.method || "GET", body: init.body ? JSON.parse(String(init.body)) : undefined }),
      // Finish accepted writes even if their original component unmounts.
      ...(init.method === "POST" ? {} : { signal: init.signal }),
      cache: "no-store",
    });
    const value = await response.json();
    if (!response.ok) throw Error(value.error || "Snapshot could not be loaded.");
    if (value.status >= 200 && value.status < 300) {
      try {
        window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ ...envelope, state: value.state }));
      } catch {
        throw Error("Browser storage is unavailable or full. This change was not saved; allow site storage and retry.");
      }
    }
    return Response.json(value.result, { status: value.status });
  };
  const task = queue.catch(() => {}).then(async () => {
    if (navigator.locks) return await navigator.locks.request("vesta-snapshot", run);
    return await run();
  });
  queue = task;
  return task;
}
export async function resetDemoSnapshot() {
  await queue.catch(() => {});
  const reset = () => window.localStorage.removeItem(SNAPSHOT_KEY);
  if (navigator.locks) await navigator.locks.request("vesta-snapshot", reset);
  else reset();
  window.location.reload();
}
