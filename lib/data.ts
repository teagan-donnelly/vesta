import { accounts, bills, customer, transactions } from "./demo-data";
import { todayIso, shift } from "./analysis";
import type { FinancialData } from "./types";

// Demo snapshots are anchored to today. Balances represent closing balances as of today;
// historical transactions are evidence, never replayed against those balances.
export function demoData(today = todayIso()): FinancialData {
  const offset = Math.round(
    (Date.parse(today) - Date.parse("2026-07-05")) / 86400000,
  );
  const names: Record<string, string> = {
    "bill-utilities": "Green Energy Co.",
    "bill-gym": "Riverside Fitness",
    "bill-storage": "Coastline Storage",
    "bill-card": "Northline Credit",
  };
  return {
    source: "demo",
    asOf: today,
    customers: [customer],
    accounts,
    transactions: transactions
      .filter((t) => t.date <= "2026-07-05")
      .map((t) => ({ ...t, date: shift(t.date, offset) })),
    bills: bills.map((b) => ({
      ...b,
      name: names[b.id] || b.name,
      dueDate: shift(b.dueDate, offset),
    })),
    loans: [],
    warnings: [
      "Fictional demonstration records. Recurring income and expenses are estimates inferred from history; payroll intervals are approximated.",
    ],
  };
}
