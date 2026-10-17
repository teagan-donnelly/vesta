import { ArrowRight, CheckCircle2, ShieldAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { AegisShell } from "@/components/aegis-shell";
import { subscriptions } from "@/lib/demo-data";
import { detectRecurringCharges, formatCurrency } from "@/lib/financial-engine";

export default function ProtectPage() {
  const recurring = detectRecurringCharges();

  return (
    <AegisShell title="Protect" subtitle="Recurring charge intelligence and suspicious activity review.">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Wallet className="h-5 w-5 text-sky-700" />
            <h2 className="text-xl font-semibold">Recurring payments</h2>
          </div>
          <div className="mt-4 space-y-3">
            {recurring.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.merchant}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatCurrency(item.amountCents)} • {item.cadence}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700">{item.confidence}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <span>Last: {item.lastChargeDate}</span>
                  <span>Next: {item.nextChargeDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Suspicious activity</h2>
          </div>
          <div className="mt-4 space-y-3">
            {subscriptions.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-xl border border-dashed border-orange-200 bg-orange-50 p-4">
                <p className="font-medium text-orange-700">{item.merchant}</p>
                <p className="mt-2 text-sm text-orange-800">The model flags this as a recurring expense with a moderate chance of being reviewed or canceled. This is not a claim of fraud or a cancellation action.</p>
              </div>
            ))}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mb-2 h-4 w-4" />
              Demo review statuses are safe and local-only for this MVP. Nothing is auto-canceled externally.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Subscription review matrix</h3>
          <Link href="/domino" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
            Sync to Domino <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-3 pr-4 font-medium">Merchant</th>
                <th className="py-3 pr-4 font-medium">Typical</th>
                <th className="py-3 pr-4 font-medium">Frequency</th>
                <th className="py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium">{item.merchant}</td>
                  <td className="py-3 pr-4">{formatCurrency(item.amountCents)}</td>
                  <td className="py-3 pr-4">{item.cadence}</td>
                  <td className="py-3 pr-4">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AegisShell>
  );
}
