import { BadgeCheck, CircleHelp } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import { creditFactors } from "@/lib/demo-data";

export default function CreditPage() {
  return (
    <AegisShell title="Credit" subtitle="Education and guidance grounded in user-entered values and proxy signals only.">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold">Credit guidance</h2>
          </div>
          <div className="mt-5 space-y-4">
            {creditFactors.map((factor) => (
              <div key={factor.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium">{factor.label}</p>
                <p className="mt-1 text-sm text-slate-600">{factor.value}</p>
                <p className="mt-2 text-xs text-slate-500">{factor.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CircleHelp className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-semibold">Educational suggestions</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Reduce card utilization before the next statement closes.</li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Keep recurring bills and due dates aligned with the next pay cycle.</li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">Review account behavior before major life changes for a cleaner credit picture.</li>
          </ul>
        </div>
      </div>
    </AegisShell>
  );
}
