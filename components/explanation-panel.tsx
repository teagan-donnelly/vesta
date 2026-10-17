"use client";
import { useState } from "react";
import { useFinancial } from "./financial-provider";
import { explanationFacts } from "@/lib/explanation-facts";
import { Panel, Button, Badge } from "./ui";
export function ExplanationPanel({ scenario = false }: { scenario?: boolean }) {
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
  const applied = scenario ? simulation : {};
  const current = JSON.stringify({ data, simulation: applied });
  const display = signature === current ? result : null;
  const facts = explanationFacts(data, applied);
  const explanations = (
    display?.explanations || facts.map((f) => f.text)
  ).filter(
    (text) => scenario || facts.find((f) => f.text === text)?.id !== "scenario",
  );
  const headings: Record<string, string> = {
    cash: "Cash outlook",
    scenario: "Scenario impact",
    subscriptions: "Recurring spending",
    alerts: "Activity review",
    coverage: "Plan with context",
  };
  return (
    <Panel
      title={
        scenario ? "Understand the scenario" : "Your financial perspective"
      }
      description="Explanations grounded in the selected financial records."
      className="section-gap"
      action={
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const response = await fetch("/api/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, customer, simulation: applied }),
              });
              const body = await response.json();
              if (!response.ok) throw new Error("Unavailable");
              setResult(body);
              setSignature(current);
            } catch {
              setError(
                "Gemini is unavailable. Your calculated guidance is still shown.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Reviewing..." : "Ask Gemini"}
        </Button>
      }
    >
      <div className="guidance-grid">
        {explanations.slice(0, 3).map((text) => (
          <div className="guidance-item" key={text}>
            <strong>
              {headings[facts.find((f) => f.text === text)?.id || ""] ||
                "Financial perspective"}
            </strong>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="guidance-source" role="status">
        <Badge>
          {display?.source === "gemini"
            ? "Gemini-prioritized"
            : "Calculated guidance"}
        </Badge>{" "}
        <span>
          {error ||
            "Vesta calculates the numbers. Gemini can prioritize the explanations."}
        </span>
      </div>
      <details
        className="panel-body"
        style={{ fontSize: 14, color: "#5f6f85" }}
      >
        <summary>More guidance & assumptions</summary>
        <ul style={{ paddingLeft: 16, marginTop: 10, lineHeight: 1.9 }}>
          {explanations.slice(3).map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </details>
    </Panel>
  );
}
