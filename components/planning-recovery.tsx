"use client";
import { useState } from "react";
import { resetDemoSnapshot } from "@/lib/snapshot-client";
import { Button } from "./ui";
export function PlanningRecovery() {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  return <div className="planning-recovery">
    <p className="subtext">Fictional plans and tracked records are saved in this browser across refreshes. Simulated profiles share this browser snapshot; switching profiles is not authentication.</p>
    {confirm ? <div className="inline-actions">
      <p>Restore all three profiles to the original snapshot? This removes this browser’s hypothetical changes, tracked records and local conversations, including Nessie planning annotations. It does not change bank records or delete provider memories.</p>
      <Button onClick={() => void resetDemoSnapshot().catch(() => setError("Reset failed. Allow browser site storage and retry."))}>Confirm Reset Demo</Button>
      <Button variant="secondary" onClick={() => setConfirm(false)}>Keep my changes</Button>
    </div> : <Button variant="secondary" onClick={() => setConfirm(true)}>Reset Demo</Button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
