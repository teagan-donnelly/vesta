"use client";
import Link from "next/link";
import { DataStatus, useFinancial } from "./financial-provider";
import {
  ChartNoAxesCombined,
  CircleDashed,
  CreditCard,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  WalletCards,
} from "lucide-react";
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

export function AegisShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { mode, setMode, data, customer, setCustomer } = useFinancial();
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-50 shadow-sm lg:block">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Vesta
            </p>
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

        <main className="min-w-0 flex-1">
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Vesta
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                  {title}
                </h1>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <label>
                  Data source{" "}
                  <select
                    aria-label="Data source"
                    value={mode}
                    onChange={(e) =>
                      setMode(e.target.value as "demo" | "nessie")
                    }
                    className="max-w-44 bg-transparent"
                  >
                    <option value="demo">Demo Mode (fictional)</option>
                    <option value="nessie">Nessie Sandbox Mode</option>
                  </select>
                </label>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
            {mode === "nessie" && !!data?.customers.length && (
              <label className="mt-3 block text-sm">
                Sandbox customer{" "}
                <select
                  aria-label="Sandbox customer"
                  value={customer || data.customers[0].id}
                  onChange={(e) => setCustomer(e.target.value)}
                >
                  {data.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <nav
              aria-label="Mobile navigation"
              className="mt-4 flex flex-wrap gap-3 lg:hidden"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  className="text-sm text-sky-700"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <DataStatus />
          {children}
        </main>
      </div>
    </div>
  );
}
