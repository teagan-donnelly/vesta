"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AegisShell } from "@/components/aegis-shell";
import {
  DemoDisclosure,
  DemoGate,
  useDemoPlanning,
} from "@/components/demo-planning";
import { Button, LoadingState, Notice, Panel } from "@/components/ui";
import { PlanningRecovery } from "@/components/planning-recovery";
import { useFinancial } from "@/components/financial-provider";
import { useAssistantLanguage } from "@/lib/assistant-language";
import type { assistant } from "@/lib/collaboration/assistant";
import { formatCurrency } from "@/lib/analysis";
import { dateLabel } from "@/components/activity-table";
import { AssistantMessage } from "@/components/assistant-message";
import {readRiskDraft,RISK_DRAFT_KEY} from "@/lib/risk-draft";
type Reply = Awaited<ReturnType<typeof assistant>>;
export default function AssistantPage() {
  return (
    <AegisShell
      title="Ask Vesta"
      subtitle="Ask questions and explore options based on your financial outlook."
    >
      <DemoGate>
        {(profile) => <Suspense fallback={<LoadingState/>}><Conversation key={profile} profile={profile} /></Suspense>}
      </DemoGate>
    </AegisShell>
  );
}
function Conversation({ profile }: { profile: string }) {
  const search=useSearchParams();
  const { data, error, busy, change } = useDemoPlanning(profile);
  const { setSimulation } = useFinancial();
  const [language, setLanguage] = useAssistantLanguage();
  const [reply, setReply] = useState<Reply | null>(null);
  const [question, setQuestion] = useState(()=>readRiskDraft(profile,search));
  const [contextGroup] = useState(()=>typeof window!=="undefined" ? new URLSearchParams(window.location.search).get("workspace") : null);
  const [applied, setApplied] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const settings = useRef<HTMLDetailsElement>(null);
  useEffect(()=>{try{const draft=JSON.parse(sessionStorage.getItem(RISK_DRAFT_KEY)||"null");if(draft?.profile===profile)sessionStorage.removeItem(RISK_DRAFT_KEY);}catch{/* No draft is required for ordinary navigation. */}},[profile]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [data?.own.messages.length, busy]);
  const ready = Boolean(data);
  useEffect(() => {
    if (window.location.hash === "#preferences" && settings.current)
      settings.current.open = true;
  }, [ready]);
  async function ask(value: string) {
    setApplied(false);
    const result = await change({ action: "chat", question: value, language });
    if (result) {
      setReply(result.assistant);
      setQuestion("");
    }
  }
  if (!data)
    return error ? (
      <>
        <Notice tone="risk">
          Your conversation is unavailable. Review your planning connection.
        </Notice>
        <PlanningRecovery />
      </>
    ) : (
      <LoadingState />
    );
  const spanish = language === "es";
  return (
    <div className="chat-workspace">
      <DemoDisclosure storage={data.storage} />
      {error && <Notice tone="risk">{error}</Notice>}
      {data.context.risk && <section className="assistant-context" aria-label="Your planning context">
        <span className="eyebrow">YOUR FINANCES, IN CONTEXT</span>
        <h2>Your {data.context.risk.label} contribution may be at risk.</h2>
        <p>{formatCurrency(data.context.risk.availableCents || 0)} is estimated available for your {formatCurrency(data.context.risk.shareCents || 0)} share by {dateLabel(data.context.risk.date)}. Want to explore ways to cover the {formatCurrency(data.context.risk.shortfallCents)} difference?</p>
        {data.context.obligations.map(c=><p key={c.id}>{c.name}: {formatCurrency(c.shareCents)} agreed by {dateLabel(c.dueDate)} · {formatCurrency(c.coveredCents || 0)} projected readiness. {c.id==="rent"?"This rent commitment is already deducted before vacation readiness.":""}</p>)}
        {contextGroup==="vacation" && <Button disabled={busy} onClick={()=>ask("Help me resolve my vacation savings shortfall before October 27 while protecting my rent and keeping my gym membership non-negotiable.")}>Explore vacation solutions</Button>}
        {data.context.preferences.map(p => <p className="preference-chip" key={p}>Your demo preference: {p} Memory sharing is optional.</p>)}
      </section>}
      <Panel
        className="chat-panel"
        title="Your conversation"
        description="Understand your options. You decide what happens."
        action={
          <label className="chat-language">
            <span className="sr-only">Conversation language</span>
            <select
              aria-label="Conversation language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
        }
      >
        <div
          className="conversation"
          role="log"
          aria-label="Your private conversation with Vesta"
          aria-live="polite"
        >
          {data.own.messages.length ? (
            data.own.messages.map((m, i) => (
              <article className={`conversation-message ${m.role}`} key={i}>
                <strong>
                  {m.role === "user" ? (spanish ? "Tú" : "You") : "Vesta"}
                </strong>
                {m.role === "assistant" ? <AssistantMessage content={m.content} presentation={m.presentation} spanish={spanish} onPreview={option=>setSimulation(option.simulation)}/> : <p>{m.content}</p>}
              </article>
            ))
          ) : (
            <article className="conversation-message assistant">
              <strong>Vesta</strong>
              <p>
                {spanish
                  ? "Puedo ayudarte a revisar tus compromisos, explorar cambios y decidir qué compartir. ¿Por dónde empezamos?"
                  : data.context.risk ? "Let's protect your shared contribution while respecting what matters to you. I can compare changes before the deadline and show what each group is authorized to see." : "I can help you understand upcoming payments, explore changes, and decide what to share. What would you like to work on?"}
              </p>
            </article>
          )}
          {busy && (
            <div className="chat-thinking" role="status">
              {spanish ? "Vesta está pensando…" : "Vesta is thinking…"}
            </div>
          )}
          <div ref={bottom} />
        </div>
        {reply?.proposal && (
          <div className="scenario-proposal">
            <strong>
              {spanish ? "Un cambio para explorar" : "A change to explore"}:{" "}
              {reply.proposal.label}
            </strong>
            <p>
              {spanish
                ? "Solo cambia tu plan. No cancela un servicio ni mueve dinero."
                : "This changes your plan only. It does not cancel a service or move money."}
            </p>
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
                  setApplied(true);
                }
              }}
            >
              {spanish
                ? "Confirmar el cambio hipotético"
                : "Confirm this what-if change"}
            </Button>
            <Link href="/plan?section=forecast" className="text-link" onClick={() => setSimulation(reply.proposal!.simulation)}>
              {spanish ? "Vista previa en Domino" : "Preview in Domino"} →
            </Link>
          </div>
        )}
        {applied && (
          <div className="chat-saved" role="status">
            {spanish
              ? "Tu plan se actualizó."
              : "Your what-if plan is updated."}{" "}
            <Link href="/shared">
              {spanish
                ? "Ver tus gastos compartidos"
                : "See the effect on shared expenses"}{" "}
              →
            </Link>
          </div>
        )}
        <div className="assistant-prompts" aria-label="Suggested questions">
          {(spanish
            ? [
                "¿Puedo cubrir mi alquiler?",
                "Quiero mantener el gimnasio; ¿qué opciones tengo?",
                "¿Qué pasa si cancelo Spotify?",
                "¿Cómo afecta esto a mi compañero?",
              ]
            : [
                "Can I afford my rent?",
                ...(data.context.risk ? [`What could I change before ${dateLabel(data.context.risk.date)}?`] : ["What are my options?"]),
                "I want to keep my gym membership.",
                "What happens if I cancel Spotify?",
                "How would this affect my roommate?",
              ]
          ).map((prompt) => (
            <button disabled={busy} onClick={() => ask(prompt)} key={prompt}>
              {prompt}
            </button>
          ))}
        </div>
        <form
          className="chat-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await ask(question);
          }}
        >
          <label className="field">
            <span className="sr-only">
              {spanish ? "Tu pregunta" : "Your question"}
            </span>
            <textarea
              required
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                spanish ? "Pregunta a Vesta…" : "Ask Vesta about your finances…"
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (question.trim() && !busy)
                    e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </label>
          <Button
            aria-label={spanish ? "Enviar pregunta" : "Send question"}
            disabled={busy || !question.trim()}
          >
            {spanish ? "Enviar" : "Send"} →
          </Button>
          <p className="chat-input-note">
            {spanish
              ? "Solo datos ficticios. Los pronósticos son estimaciones."
              : "Fictional information only. Forecasts are estimates."}
          </p>
        </form>
      </Panel>
      <details
        ref={settings}
        className="secondary-details assistant-settings"
        id="preferences"
      >
        <summary>Memory & assistant settings</summary>
        <Panel
          title="What would you like Vesta to remember?"
          description="Memory is optional and private to this demo profile."
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
              <span>Your preferences · one per line</span>
              <textarea
                name="preferences"
                maxLength={3000}
                defaultValue={data.own.preferences.join("\n")}
                placeholder="My gym membership is non-negotiable."
              />
            </label>
            <p className="subtext section-gap">
              {data.own.memoryOptIn ? "Memory is on" : "Memory is off"}.{" "}
              {data.backboardConfigured
                ? "Saving sends these preferences to Backboard for this profile only."
                : "Backboard is unavailable in this environment. Saved preferences use the labeled planning store."}
            </p>
            <Button disabled={busy} className="section-gap">
              Confirm and remember these preferences
            </Button>
          </form>
          <div className="panel-body inline-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                change({ action: "memory", enabled: false, preferences: [] })
              }
            >
              Clear memory and turn off
            </Button>
            <Button
              variant="quiet"
              disabled={busy}
              onClick={async () => {
                if (await change({ action: "clearConversation" })) {
                  setReply(null);
                  setApplied(false);
                }
              }}
            >
              Clear conversation
            </Button>
          </div>
        </Panel>
        <details className="secondary-details">
          <summary>How this answer was prepared</summary>
          <p>{reply?.reason || "No provider has handled a question yet."}</p>
          <p>
            Last response: {reply?.source || "none"}. Vesta calculates the
            financial figures. Gemini or Backboard interprets the question when
            available; provider failures use clearly attributed planning rules.
          </p>
          <p>
            Only your questions and opted-in preferences go to the provider. No
            bank history, other members’ information, or credentials are sent.
            Clearing memory deletes the dedicated Backboard assistant when
            connected; a failed deletion is reported.
          </p>
        </details>
      </details>
    </div>
  );
}
