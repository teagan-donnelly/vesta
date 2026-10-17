"use client";
import Link from "next/link";
import { useFinancial } from "./financial-provider";
import { Button, Notice } from "./ui";
export function CollaborativeLink({ publish = false }: { publish?: boolean }) {
  const { mode, customer, simulation, reload } = useFinancial();
  const [state, setState] = useState("");
  if (mode !== "demo" || !customer.startsWith("demo:")) return null;
  async function apply() {
    setState("Saving…");
    try {
      const r = await fetch(`/api/collaboration?profile=${customer.slice(5)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scenario",
          simulation,
          confirmed: true,
        }),
      });
      if (!r.ok) throw Error();
      setState(
        "Hypothetical plan saved. Shared readiness reflects only authorized disclosures.",
      );
      reload(true);
    } catch {
      setState("Plan could not be saved.");
    }
  }
  return (
    <Notice>
      <div>
        <strong>Personal decisions, shared commitments</strong>
        <p>
          Your assigned contributions are already included once in this
          forecast.{" "}
          <Link href="/shared">Review shared readiness and privacy</Link> ·{" "}
          <Link href="/assistant">Ask Vesta</Link>
        </p>
        {state && <p role="status">{state}</p>}
      </div>
      {publish && (
        <Button onClick={apply}>Confirm scenario for shared planning</Button>
      )}
    </Notice>
  );
}
import { useState } from "react";
