"use client";
import { useSyncExternalStore } from "react";
import { SandboxScenario } from "./sandbox-scenario";
const subscribe = () => () => {};
const localSnapshot = () =>
  ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
const serverSnapshot = () => false;
export function LocalSandboxSetup() {
  const local = useSyncExternalStore(subscribe, localSnapshot, serverSnapshot);
  if (!local) return null;
  return (
    <details className="panel setup-tool">
      <summary
        style={{
          padding: "17px 20px",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Developer setup · Fictional Nessie scenario (localhost only)
      </summary>
      <div style={{ padding: "0 20px 20px" }}>
        <p className="subtext">
          One-time preparation. Previewing does not create records. Seeding
          requires a separate explicit confirmation and verified read-back.
        </p>
        <SandboxScenario />
      </div>
    </details>
  );
}
