"use client";
import { snapshotFetch } from "@/lib/snapshot-client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  if (mode !== "demo" || !/^demo:(ava|kevin|maya|noah|lily)$/.test(customer))
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
  const [errorProfile, setErrorProfile] = useState("");
  const [busyProfile, setBusyProfile] = useState("");
  const active = useRef(profile);
  const { reload } = useFinancial();
  useEffect(() => {
    active.current = profile;
    const controller = new AbortController();
    ensureDemoSession()
      .then(() =>
        snapshotFetch(`/api/collaboration?profile=${profile}`, {
          signal: controller.signal,
          cache: "no-store",
        }),
      )
      .then(async (r) => {
        if (!r.ok)
          throw Error("Fictional snapshot unavailable. Check browser storage.");
        return r.json();
      })
      .then((r) => {
        if (!controller.signal.aborted) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setErrorProfile(profile);
          setError(e.message);
        }
      });
    return () => { controller.abort(); active.current = ""; };
  }, [profile]);
  const change = useCallback(
    async (body: Record<string, unknown>) => {
      setBusyProfile(profile);
      setError("");
      try {
        const r = await snapshotFetch(`/api/collaboration?profile=${profile}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, confirmed: true }),
        });
        const value = await r.json();
        if (active.current !== profile) return null;
        if (!r.ok) throw Error(value.error);
        setData(value);
        if (body.action === "workspace" || body.action === "member")
          window.dispatchEvent(new Event("vesta-workspaces-change"));
        if (["workspace", "member", "commitment", "removeCommitment", "scenario"].includes(String(body.action))) reload(true);
        return value;
      } catch (e) {
        if (active.current !== profile) return null;
        setErrorProfile(profile);
        setError(e instanceof Error ? e.message : "Change unavailable.");
        return null;
      } finally {
        if (active.current === profile) setBusyProfile("");
      }
    },
    [profile, reload],
  );
  return { data: data?.profile === profile ? data : null, error: errorProfile === profile ? error : "", busy: busyProfile === profile, change };
}
export function DemoDisclosure({ storage }: { storage?: string }) {
  return (
    <details className="compact-disclosure">
      <summary>Demo data · privacy & storage</summary>
      <p>
        All profiles and activity are fictional. Switching profiles is not
        authentication. All three fictional profiles are stored on this browser;
        privacy controls demonstrate selective disclosure within the app, not secure identity separation.
        Forecasts and members’ updates do not hold, reserve,
        transfer, or confirm money. Storage: {storage || "checking"}.
      </p>
    </details>
  );
}
