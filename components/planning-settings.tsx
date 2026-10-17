"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "./ui";
export function PlanningSettings() {
  const [status, setStatus] = useState<{
    backboardConfigured: boolean;
    tigerConfigured: boolean;
    storage: string;
  } | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/planning-status", { signal: c.signal, cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
    return () => c.abort();
  }, []);
  return (
    <Panel
      className="section-gap"
      title="Collaborative planning & AI memory"
      description="Fictional profile switching is a demonstration, never secure authentication."
    >
      <div className="panel-body">
        <p>
          Backboard:{" "}
          {status
            ? status.backboardConfigured
              ? "Credential configured; verify by saving an opted-in preference."
              : "Not configured — local opt-in preferences remain available."
            : "Checking configuration…"}
        </p>
        <p className="section-gap">
          Tiger Data:{" "}
          {status
            ? status.tigerConfigured
              ? "Credential configured. Run the migration, then load shared planning to verify connectivity."
              : "Not configured — local fictional demo adapter."
            : "Checking configuration…"}
        </p>
        <p className="subtext section-gap">
          {status?.storage}. Each browser demo session is separate. Database and
          memory service credentials are server-side only.
        </p>
        <div className="inline-actions section-gap">
          <Link href="/shared">Manage workspaces and disclosure consent</Link>
          <Link href="/assistant">
            View, correct, or clear your own memories
          </Link>
        </div>
      </div>
    </Panel>
  );
}
