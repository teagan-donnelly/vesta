import { ClipboardList, Mail } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import { continuityPlan } from "@/lib/demo-data";

export default function ContinuityPage() {
  return (
    <AegisShell
      title="Continuity"
      subtitle="Emergency financial preparedness for interruptions and household changes."
    >
      <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm">
        Fictional preparedness example, including the contact and dates below.
        This page does not store an emergency plan. Review current obligations
        on Overview before preparing your own secure instructions.
      </p>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-700" />
            <h2 className="text-xl font-semibold">Preparedness summary</h2>
          </div>
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {continuityPlan.emergencyNote}
          </p>
          <div className="mt-5 space-y-3">
            {continuityPlan.obligations.map((obligation) => (
              <div
                key={obligation}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"
              >
                {obligation}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-semibold">Trusted contacts</h2>
          </div>
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {continuityPlan.trustedContact}
          </p>
          <div className="mt-4 space-y-3">
            {continuityPlan.checklist.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AegisShell>
  );
}
