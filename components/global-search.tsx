"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Bell } from "lucide-react";
import { useFinancial } from "./financial-provider";
import { alertsFor } from "@/lib/analysis";
const tools = [
  ["Transactions", "/transactions"],
  ["Subscriptions", "/plan?section=spending"],
  ["Goals & budgets", "/plan?section=goals"],
  ["Credit", "/plan?section=credit"],
  ["Investing", "/plan?section=investing"],
  ["Protection", "/plan?section=protection"],
  ["Emergency planning", "/continuity"],
  ["Shared Finances", "/shared"],
];
export function GlobalSearch() {
  const [query, setQuery] = useState("");
  return (
    <div className="global-search">
      <Search size={20} aria-hidden="true" />
      <form action="/transactions">
        <input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions, subscriptions, or financial tools…"
          aria-label="Search transactions or tools"
        />
      </form>
      {query && (
        <div className="search-results">
          <Link
            href={`/transactions?q=${encodeURIComponent(query)}`}
            onClick={() => setQuery("")}
          >
            Search activity for “{query}” →
          </Link>
          {tools
            .filter(([name]) =>
              name.toLowerCase().includes(query.toLowerCase()),
            )
            .map(([name, href]) => (
              <Link key={href} href={href} onClick={() => setQuery("")}>
                {name}
              </Link>
            ))}
          <Link href="/assistant" onClick={() => setQuery("")}>
            Ask Vesta a financial question →
          </Link>
          <button type="button" onClick={() => setQuery("")}>
            Close search
          </button>
        </div>
      )}
    </div>
  );
}
export function FinancialNotifications() {
  const { data, records } = useFinancial();
  const alerts = data ? alertsFor(data) : [];
  const disabled =
    records.find((r) => r.kind === "preferences" && r.id === "notifications")
      ?.status === "off";
  return (
    <details className="notification-menu">
      <summary
        aria-label={`Financial notifications: ${disabled ? "disabled" : alerts.length}`}
      >
        <Bell size={21} />
        {!disabled && alerts.length > 0 && <i />}
      </summary>
      <div className="profile-popover">
        <strong>Financial notifications</strong>
        {disabled ? (
          <p className="subtext">Notifications are paused in Settings.</p>
        ) : alerts.length ? (
          alerts.slice(0, 4).map((a) => (
            <Link key={a.id} href="/transactions">
              {a.merchant}
              <span className="subtext">{a.reason}</span>
            </Link>
          ))
        ) : (
          <p className="subtext">
            No activity currently meets the review rules. Limited records may
            hide unusual activity.
          </p>
        )}
        <Link href="/settings">Notification preferences →</Link>
      </div>
    </details>
  );
}
