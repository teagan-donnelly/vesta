import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { initialState, type DemoState } from "./model";

// Request-scoped computation only. Persistence belongs to the browser, never
// server memory, temporary files, cookies, or an optional production database.
export const snapshotContext = new AsyncLocalStorage<DemoState>();
export const storageSource = (forceLocal = true) => { void forceLocal; return "Browser-local fictional snapshot"; };
export const localPlanning = (request: Request) => { void request; return true; };
export function demoSession(request: Request) {
  const raw = request.headers.get("cookie")?.match(/(?:^|;\s*)vesta-demo=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return { id: raw || randomUUID(), fresh: !raw };
}
export function sessionHeaders(request: Request, session: ReturnType<typeof demoSession>) {
  return {
    "Cache-Control": "no-store",
    Vary: "Cookie",
    ...(session.fresh ? { "Set-Cookie": `vesta-demo=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` } : {}),
  };
}
export async function withDemo<T>(
  _id: string,
  action: (state: DemoState) => Promise<T> | T,
  write = false,
  _forceLocal = true,
): Promise<T> {
  void _id; void _forceLocal;
  const state = snapshotContext.getStore();
  if (write && !state) throw Error("Send confirmed changes through the browser snapshot workflow.");
  return action(state || initialState());
}
