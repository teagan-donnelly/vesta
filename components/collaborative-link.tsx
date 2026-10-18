"use client";
import { snapshotFetch } from "@/lib/snapshot-client";
import Link from "next/link";
import { useState } from "react";
import { useFinancial } from "./financial-provider";
import { Button } from "./ui";
import { SharedReturnLink } from "./financial-risk";
export function CollaborativeLink({ publish = false }: { publish?: boolean }) {
  const { mode, customer, simulation, reload } = useFinancial();
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  if (mode !== "demo" || !customer.startsWith("demo:")) return null;
  async function apply() {
    setSaving(true);
    try {
      const r = await snapshotFetch(`/api/collaboration?profile=${customer.slice(5)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scenario",
          simulation,
          confirmed: true,
        }),
      });
      if (!r.ok) throw Error();
      setStatus(
        "Your what-if plan is saved. Your actual finances and the original outlook are unchanged.",
      );
      reload(true);
    } catch {
      setStatus(
        "Your change could not be saved. Check planning storage in Settings.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (!publish)
    return (
      <div className="connected-links">
        <Link href="/shared">
          See how your outlook affects shared expenses →
        </Link>
      </div>
    );
  return (
    <section className="save-plan">
      <div>
        <strong>See what this means for your shared expenses</strong>
        <p>
          Save your what-if changes to update your shared outlook. Only
          information you agreed to share is visible to others.
        </p>
        {status && <p role="status">{status}</p>}
      </div>
      <Button disabled={saving} onClick={apply}>
        {saving ? "Saving…" : "Confirm and update my plan"}
      </Button>
      <SharedReturnLink />
    </section>
  );
}
