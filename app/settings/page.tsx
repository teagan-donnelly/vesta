import { DatabaseZap, Shield, Sparkles } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";

export default function SettingsPage() {
  return (
    <AegisShell title="Settings" subtitle="Data source, privacy posture, and guidance for operating in demo or live modes.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <DatabaseZap className="h-5 w-5 text-sky-700" />
            <h2 className="text-xl font-semibold">Data source</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>Current mode: Synthetic demo data</li>
            <li>Live sandbox: requires Nessie API key</li>
            <li>Gemini: requires optional AI explanation key</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold">Privacy</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>API keys stay server-side only.</li>
            <li>Client code never receives keys.</li>
            <li>Emergency notes remain local or export-only.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-semibold">Educational disclaimer</h2>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Aegis explains cash-flow risk and financial education using deterministic analysis and user-entered facts. It does not guarantee credit outcomes or account actions.
          </p>
        </div>
      </div>
    </AegisShell>
  );
}
