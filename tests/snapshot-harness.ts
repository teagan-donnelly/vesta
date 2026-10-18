import { randomUUID } from "node:crypto";
import { snapshotContext } from "../lib/collaboration/store";
import { initialState, type DemoState } from "../lib/collaboration/model";
// Test-owned browser persistence. Production has no per-session server map.
const browsers = new Map<string, DemoState>();
export function browserState(id: string) {
  if (!browsers.has(id)) browsers.set(id, initialState());
  return browsers.get(id)!;
}
export function browserRoute(handler: (r: Request) => Promise<Response>) {
  return (r: Request) => snapshotContext.run(browserState(r.headers.get("cookie")?.match(/vesta-demo=([a-f0-9-]{36})/)?.[1] || randomUUID()), () => handler(r));
}
export async function browserWithDemo<T>(id: string, action: (s: DemoState) => T | Promise<T>, _write = false) {
  void _write;
  return snapshotContext.run(browserState(id), () => action(browserState(id)));
}
