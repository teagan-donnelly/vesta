"use client";
import { useState } from "react";
import Link from "next/link";
import { AegisShell } from "@/components/aegis-shell";
import {
  DemoDisclosure,
  DemoGate,
  useDemoPlanning,
} from "@/components/demo-planning";
import { Badge, Button, LoadingState, Notice, Panel } from "@/components/ui";
import { useFinancial } from "@/components/financial-provider";
import type { assistant } from "@/lib/collaboration/assistant";
type Reply = Awaited<ReturnType<typeof assistant>>;
export default function AssistantPage() {
  return (
    <AegisShell
      title="Ask Vesta"
      subtitle="Understand the risk. Explore an adjustment. Decide what to share."
    >
      <DemoGate>
        {(profile) => <Conversation key={profile} profile={profile} />}
      </DemoGate>
    </AegisShell>
  );
}
function Conversation({ profile }: { profile: string }) {
  const { data, error, busy, change } = useDemoPlanning(profile);
  const { setSimulation } = useFinancial();
  const [language, setLanguage] = useState("en");
  const [reply, setReply] = useState<Reply | null>(null);
  const [question, setQuestion] = useState("");
  async function ask(value: string) {
    const result = await change({ action: "chat", question: value, language });
    if (result) {
      setReply(result.assistant);
      setQuestion("");
    }
  }
  if (!data)
    return error ? <Notice tone="risk">{error}</Notice> : <LoadingState />;
  return (
    <>
      <DemoDisclosure storage={data.storage} />
      {error && <Notice tone="risk">{error}</Notice>}
      <div className="assistant-layout">
        <Panel
          title={`${profile[0].toUpperCase() + profile.slice(1)}’s private conversation`}
          description="Provider interprets intent; Vesta calculates every financial result. Only your own fictional context is used."
          action={<Badge>{reply?.source || "Ready"}</Badge>}
        >
          <div
            className="conversation"
            role="log"
            aria-label="Your assistant conversation"
            aria-live="polite"
          >
            {data.own.messages.length ? (
              data.own.messages.map((m, i) => (
                <article key={i} className={`conversation-message ${m.role}`}>
                  <strong>{m.role === "user" ? "You" : "Vesta"}</strong>
                  <p>{m.content}</p>
                </article>
              ))
            ) : (
              <p className="muted">
                Ask about your rent readiness or explore a hypothetical
                adjustment. Pregunta en español si prefieres.
              </p>
            )}
          </div>
          {reply?.proposal && (
            <div className="scenario-proposal">
              <strong>Proposed simulation · {reply.proposal.label}</strong>
              <p>No cancellation, payment, or disclosure will happen.</p>
              <Button
                disabled={busy}
                onClick={async () => {
                  const result = await change({
                    action: "scenario",
                    simulation: reply.proposal!.simulation,
                  });
                  if (result) {
                    setSimulation(reply.proposal!.simulation);
                    setReply({ ...reply, proposal: null });
                  }
                }}
              >
                Confirm hypothetical scenario
              </Button>
              <Link href="/domino" className="text-link">
                Inspect in Domino →
              </Link>
            </div>
          )}
          <form
            className="chat-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await ask(question);
            }}
          >
            <label className="field">
              <span>Language / Idioma</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <label className="field">
              <span>Your question · fictional information only</span>
              <textarea
                required
                maxLength={1000}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  language === "es"
                    ? "¿Qué pasa si cancelo Spotify?"
                    : "What happens if I cancel Spotify?"
                }
              />
            </label>
            <div className="inline-actions">
              <Button disabled={busy || !question.trim()}>
                {busy ? "Working…" : "Ask Vesta"}
              </Button>
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() => change({ action: "clearConversation" })}
              >
                Clear this conversation
              </Button>
            </div>
          </form>
          <div className="assistant-prompts">
            {(language === "es"
              ? [
                  "Explica mi riesgo de alquiler",
                  "Quiero mantener el gimnasio; ¿qué opciones tengo?",
                  "¿Qué pasa si cancelo Spotify?",
                  "¿Qué información comparto?",
                ]
              : [
                  "Explain my rent risk",
                  "I want to keep my gym; what are my options?",
                  "What happens if I cancel Spotify?",
                  "What information do I share?",
                ]
            ).map((prompt) => (
              <button key={prompt} disabled={busy} onClick={() => ask(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <p className="guidance-source">
            {reply?.reason || "No provider has been called yet."} Responses use
            bounded bilingual templates to prevent invented figures. This
            prototype does not provide unrestricted financial advice.
          </p>
        </Panel>
        <div className="section-stack">
          <Panel
            title="Your remembered preferences"
            description="Opt-in only. Never visible to another demo profile."
          >
            <form
              className="panel-body"
              key={JSON.stringify(data.own.preferences)}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await change({
                  action: "memory",
                  enabled: true,
                  preferences: String(f.get("preferences"))
                    .split("\n")
                    .map((p) => p.trim())
                    .filter(Boolean),
                });
              }}
            >
              <label className="field">
                <span>One preference per line · up to ten</span>
                <textarea
                  name="preferences"
                  maxLength={3000}
                  defaultValue={data.own.preferences.join("\n")}
                  placeholder="My gym membership is non-negotiable."
                />
              </label>
              <p className="subtext section-gap">
                {data.own.memoryOptIn ? "Memory enabled" : "Memory is off"} ·{" "}
                {data.backboardConfigured
                  ? "Saving sends only these explicit preferences to Backboard; provider memory is isolated per profile."
                  : "Backboard is not configured. Preferences stay in the clearly labeled local demo adapter."}
              </p>
              <Button className="section-gap" disabled={busy}>
                Confirm opt-in / correct preferences
              </Button>
            </form>
            <div className="panel-body">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  change({ action: "memory", enabled: false, preferences: [] })
                }
              >
                Clear memories and turn off
              </Button>
              <p className="subtext section-gap">
                Clearing deletes this profile’s dedicated Backboard assistant
                when connected, including its threads and memories. If the
                provider is unavailable, Vesta reports failure instead of
                claiming deletion.
              </p>
            </div>
          </Panel>
          <Notice>
            <p>
              Only your explicit preferences and questions are sent to the AI
              provider. Bank histories, balances, and other participants’
              records are excluded. Gemini remains available for the existing
              personal explanations.
            </p>
          </Notice>
          <Link href="/shared" className="text-link">
            Review shared readiness and disclosures →
          </Link>
        </div>
      </div>
    </>
  );
}
