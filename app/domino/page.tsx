import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { AegisShell } from "@/components/aegis-shell";
import { ForecastChart } from "@/components/forecast-chart";
import { financialScenarioOptions } from "@/lib/demo-data";
import { buildForecast, formatCurrency, getScenarioDelta } from "@/lib/financial-engine";

export default function DominoPage() {
  const baseline = buildForecast("baseline");
  const scenario = buildForecast("subscription-cut");
  const delta = getScenarioDelta("subscription-cut");

  return (
    <AegisShell title="Domino" subtitle="Deterministic forecasting and scenario simulation for cash-flow decisions.">
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Baseline</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(baseline.lowestBalanceCents)}</p>
          <p className="mt-1 text-sm text-slate-600">Projected lowest balance</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Scenario</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(scenario.lowestBalanceCents)}</p>
          <p className="mt-1 text-sm text-slate-600">After subscription cut</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Delta</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-600">+{formatCurrency(Math.abs(delta.differenceCents))}</p>
          <p className="mt-1 text-sm text-slate-600">Cash buffer improvement</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Scenario simulator</h2>
          <Link href="/protect" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
            Review subscriptions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {financialScenarioOptions.map((option) => (
            <div key={option.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium">{option.name}</p>
              <p className="mt-2 text-sm text-slate-600">{option.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-700">
          {delta.differenceCents > 0 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-amber-600" />}
          <h2 className="text-xl font-semibold">Projected balance over 30 days</h2>
        </div>
        <div className="h-80">
          <ForecastChart points={scenario.points} height={320} color="#0f766e" />
        </div>
      </div>
    </AegisShell>
  );
}
