"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "./ui";
import { PlanningRecovery } from "./planning-recovery";
import { SNAPSHOT_AT } from "@/lib/collaboration/model";
export function PlanningSettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/planning-status", { signal: controller.signal }).then(r => r.json()).then(v => setConfigured(v.backboardConfigured)).catch(() => {});
    return () => controller.abort();
  }, []);
  return <Panel className="section-gap" title="Collaborative planning & AI memory" description="Fictional profile switching is a demonstration, never secure authentication.">
    <div className="panel-body">
      <p>Snapshot: October 17, 2026 at 12:00 UTC ({SNAPSHOT_AT}). Ava, Kevin and Maya each have independent fictional finances at this same moment.</p>
      <p className="section-gap">Backboard: {configured === null ? "Checking configuration…" : configured ? "Configured; preferences are sent only after you opt in." : "Not configured; local opt-in preferences remain available."}</p>
      <p className="subtext section-gap">Storage: browser-local fictional snapshot. It persists on this browser and site, including profile changes and refreshes. Other browsers and devices have independent snapshots. Fictional records were not retrieved from Nessie.</p>
      <PlanningRecovery />
      <div className="inline-actions section-gap"><Link href="/shared">Manage workspaces and disclosure consent</Link><Link href="/assistant">View, correct, or clear your own memories</Link></div>
    </div>
  </Panel>;
}
