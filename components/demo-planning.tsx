"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFinancial } from "./financial-provider";
import { Button, EmptyState } from "./ui";
import type { payload } from "@/app/api/collaboration/route";
import { ensureDemoSession } from "@/lib/demo-session-client";
export type PlanningPayload = ReturnType<typeof payload>;
export function DemoGate({
  children,
}: {
  children: (profile: string) => ReactNode;
}) {
  const { mode, customer, setDemoProfile } = useFinancial();
  if (mode !== "demo" || !/^demo:(ava|kevin|maya)$/.test(customer))
    return (
      <EmptyState
        title="Explore fictional collaborative planning"
        description="This simulated profile switcher is not authentication. It never attaches Ava, Kevin, or Maya to Nessie accounts. Choose a fictional perspective to continue."
        action={
          <div className="demo-start">
            <Button onClick={() => setDemoProfile("kevin")}>
              Explore as Kevin
            </Button>
            <Button variant="secondary" onClick={() => setDemoProfile("ava")}>
              Explore as Ava
            </Button>
          </div>
        }
      />
    );
  return children(customer.slice(5));
}
export function useDemoPlanning(profile: string) {
  const [data, setData] = useState<PlanningPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { reload } = useFinancial();
  useEffect(() => {
    const controller = new AbortController();
    ensureDemoSession()
      .then(() =>
        fetch(`/api/collaboration?profile=${profile}`, {
          signal: controller.signal,
          cache: "no-store",
        }),
      )
      .then(async (r) => {
        if (!r.ok)
          throw Error("Planning unavailable. Check database configuration.");
        return r.json();
      })
      .then((r) => {
        if (!controller.signal.aborted) setData(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [profile]);
  const change = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`/api/collaboration?profile=${profile}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, confirmed: true }),
        });
        const value = await r.json();
        if (!r.ok) throw Error(value.error);
        setData(value);
        if (body.action === "workspace" || body.action === "member")
          window.dispatchEvent(new Event("vesta-workspaces-change"));
        reload(true);
        return value;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Change unavailable.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [profile, reload],
  );
  return { data, error, busy, change };
}
export function DemoDisclosure({ storage }: { storage?: string }) {
  return (
    <details className="compact-disclosure">
      <summary>Demo data · privacy & storage</summary>
      <p>
        All profiles and activity are fictional. Switching profiles is not
        authentication. Forecasts and members’ updates do not hold, reserve,
        transfer, or confirm money. Storage: {storage || "checking"}.
      </p>
    </details>
  );
}
