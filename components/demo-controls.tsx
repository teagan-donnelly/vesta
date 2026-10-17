"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFinancial } from "./financial-provider";
import { ensureDemoSession } from "@/lib/demo-session-client";
export function DemoControls() {
  const { mode, customer, setDemoProfile } = useFinancial();
  const router = useRouter();
  const pathname = usePathname();
  const viewer =
    mode === "demo" && customer.startsWith("demo:") ? customer.slice(5) : "";
  const [groups, setGroups] = useState<{
    viewer: string;
    items: { id: string; name: string }[];
  }>({ viewer: "", items: [] });
  useEffect(() => {
    if (!viewer) return;
    const controller = new AbortController();
    const load = () =>
      ensureDemoSession()
        .then(() =>
          fetch(`/api/collaboration?profile=${viewer}&list=1`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        )
        .then((r) => (r.ok ? r.json() : { workspaces: [] }))
        .then((r) => {
          if (!controller.signal.aborted)
            setGroups({ viewer, items: r.workspaces });
        })
        .catch(() => {});
    load();
    window.addEventListener("vesta-workspaces-change", load);
    return () => {
      controller.abort();
      window.removeEventListener("vesta-workspaces-change", load);
    };
  }, [viewer, pathname]);
  if (mode !== "demo") return null;
  return (
    <div className="demo-controls">
      <label>
        Demo profile · not authentication
        <select
          aria-label="Demo Profile Switcher"
          value={viewer}
          onChange={(e) => setDemoProfile(e.target.value)}
        >
          <option value="" disabled>
            Choose fictional profile
          </option>
          <option value="kevin">Kevin</option>
          <option value="ava">Ava</option>
          <option value="maya">Maya</option>
        </select>
      </label>
      <label>
        Workspace
        <select
          aria-label="Workspace"
          value={pathname === "/shared" ? "shared" : "personal"}
          onChange={(e) =>
            router.push(
              e.target.value === "personal"
                ? "/"
                : `/shared?workspace=${encodeURIComponent(e.target.value)}`,
            )
          }
        >
          <option value="personal">Personal workspace</option>
          {pathname === "/shared" && (
            <option value="shared" disabled>
              Shared planning
            </option>
          )}
          {groups.viewer === viewer &&
            groups.items.map((w) => (
              <option value={w.id} key={w.id}>
                {w.name}
              </option>
            ))}
          <option value="new">Create shared workspace…</option>
        </select>
      </label>
    </div>
  );
}
