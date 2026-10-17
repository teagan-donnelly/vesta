"use client";
import { useState } from "react";
import { Button } from "./ui";
export function PlanningRecovery({
  offerDatabase = false,
}: {
  offerDatabase?: boolean;
}) {
  const [status, setStatus] = useState("");
  async function choose(store: string) {
    setStatus("Switching…");
    try {
      const r = await fetch("/api/planning-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, confirmed: true }),
      });
      if (!r.ok) throw Error();
      window.location.reload();
    } catch {
      setStatus("Could not change planning storage.");
    }
  }
  return (
    <div className="planning-recovery">
      <p className="subtext">
        Local demo planning uses a separate fictional dataset. It does not copy
        or replace database records. On hosted deployments, local storage may be
        temporary.
      </p>
      <div className="inline-actions">
        <Button variant="secondary" onClick={() => choose("local")}>
          Use local demo planning
        </Button>
        {offerDatabase && (
          <Button variant="secondary" onClick={() => choose("database")}>
            Use configured database
          </Button>
        )}
      </div>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
