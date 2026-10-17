import { CheckCircle2, ShieldAlert } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import { financialConnections } from "@/lib/demo-data";

export default function DeadboltPage() {
  return (
    <AegisShell title="Deadbolt" subtitle="Financial separation planning for shared obligations and household transitions.">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">Shared financial connections</h2>
          </div>
          <div className="mt-4 space-y-3">
            {financialConnections.map((connection) => (
              <div key={connection.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{connection.label}</p>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-700">{connection.type}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{connection.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Action checklist</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {[
              "Review utilities and shared subscriptions",
              "Update account access and payment methods",
              "Verify account security and authorized user settings",
              "Create a post-separation budget map",
            ].map((item, index) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <span>{index + 1}. {item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AegisShell>
  );
}
