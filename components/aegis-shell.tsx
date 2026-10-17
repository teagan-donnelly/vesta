import Link from "next/link";
import { ChartNoAxesCombined, CircleDashed, CreditCard, ShieldCheck, ShieldPlus, Sparkles, WalletCards } from "lucide-react";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Overview", icon: WalletCards },
  { href: "/protect", label: "Protect", icon: ShieldCheck },
  { href: "/domino", label: "Domino", icon: ChartNoAxesCombined },
  { href: "/credit", label: "Credit", icon: CreditCard },
  { href: "/deadbolt", label: "Deadbolt", icon: ShieldPlus },
  { href: "/continuity", label: "Continuity", icon: CircleDashed },
  { href: "/settings", label: "Settings", icon: Sparkles },
];

export function AegisShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-50 shadow-sm lg:block">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Aegis</p>
            <p className="mt-2 text-2xl font-semibold">Financial safety net</p>
          </div>
          <nav className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Aegis</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Synthetic demo data
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
