"use client";
import { useState } from "react";
import { useFinancial } from "./financial-provider";
import { explanationFacts } from "@/lib/explanation-facts";
export function ExplanationPanel() {
  const { data, mode, customer, simulation } = useFinancial();
  const [result, setResult] = useState<{
    source: string;
    reason: string;
    explanations: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  if (!data) return null;
  const current = JSON.stringify({ data, simulation });
  const display = signature === current ? result : null;
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold">Grounded financial guidance</h2>
      <p className="mt-2 text-sm text-slate-600">
        {display?.reason ||
          "Deterministic explanations. Gemini can prioritize these verified explanations without adding financial claims."}
      </p>
      <button
        disabled={busy}
        className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/explain", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode, customer, simulation }),
            });
            const body = await r.json();
            if (!r.ok) throw new Error(body.error);
            setResult(body);
            setSignature(current);
          } catch {
            setError(
              "Explanations could not be refreshed. Deterministic guidance remains available.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Requesting Gemini…" : "Prioritize with Gemini"}
      </button>
      <p role="status" className="mt-2 text-sm">
        {error}
        {display && ` Explanation source: ${display.source}`}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {(
          display?.explanations ||
          explanationFacts(data, simulation).map((f) => f.text)
        ).map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </section>
  );
}
