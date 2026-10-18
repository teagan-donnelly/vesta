import { shift } from "../analysis";
import type { FinancialData, Transaction } from "../types";
import type { ProfileId } from "./model";

const people = {
  kevin: { name: "Kevin", balance: 142000, salary: 360000, payday: 28, employer: "Northstar Design payroll", grocery: "Oak Street Grocer", cafe: "Corner Table", transit: "Metro Transit", shop: "Fieldwork Outfitters", housing: "Monthly rent", rent: 100000, subscriptions: [["Spotify", 1500, 21], ["Entertainment bundle", 6000, 20], ["Riverside Fitness", 4500, 22]] },
  ava: { name: "Ava", balance: 620000, salary: 480000, payday: 25, employer: "Harbor Studio payroll", grocery: "Green Basket", cafe: "Juniper Kitchen", transit: "CityRail", shop: "Paper & Pine", housing: "Monthly rent", rent: 100000, subscriptions: [["Cinema Club", 1800, 8], ["Design Cloud", 3200, 23], ["Morning Yoga", 3900, 12]] },
  maya: { name: "Maya", balance: 545000, salary: 420000, payday: 1, employer: "Cedar Health payroll", grocery: "Fresh Fields", cafe: "Saffron Bowl", transit: "CycleShare", shop: "Home & Hearth", housing: "Cedar Lane rent", rent: 110000, subscriptions: [["Book Circle", 1900, 6], ["Language Lab", 2400, 24], ["Trail Pass", 2900, 15]] },
} as const;

export function financialSnapshot(profile: ProfileId, asOf: string): FinancialData {
  const p = people[profile], accountId = `fictional-${profile}`;
  const transactions: Transaction[] = [];
  const monthDate = (offset: number, day: number) => {
    const d = new Date(asOf + "T00:00:00Z");
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, day)).toISOString().slice(0, 10);
  };
  const start = shift(asOf, -59);
  const add = (id: string, date: string, merchant: string, amountCents: number, category: string, pending = false, description = "Fictional completed activity") => {
    transactions.push({ id, date, merchant, amountCents, category, accountId, pending, fictional: true, description });
  };
  // Sixty days of varied, cleared spending. Amounts vary; repeated cafes or
  // grocery purchases are not mislabeled as fixed subscriptions.
  const categories = ["Groceries", "Restaurants", "Transport", "Restaurants", "Shopping", "Groceries", "Transport"];
  for (let day = 0; day < 60; day++) {
    const date = shift(start, day), category = categories[(day + (profile === "ava" ? 2 : profile === "maya" ? 4 : 0)) % 7];
    const seed = (day * 977 + (profile === "ava" ? 421 : profile === "maya" ? 863 : 0)) % 3600;
    const amount = category === "Groceries" ? 3800 + seed : category === "Shopping" ? 1800 + seed : category === "Transport" ? 350 + seed % 900 : 900 + seed % 2300;
    const merchant = category === "Groceries" ? p.grocery : category === "Shopping" ? p.shop : category === "Transport" ? p.transit : p.cafe;
    add(`${profile}-daily-${day}`, date, merchant, -amount, category);
  }
  for (let month = -2; month <= 0; month++) {
    for (const day of [p.payday, profile === "kevin" ? 13 : profile === "ava" ? 10 : 15]) {
      const payroll = monthDate(month, day);
      if (payroll >= start && payroll <= asOf) add(`${profile}-payroll-${month}-${day}`, payroll, p.employer, p.salary / 2, "Income");
    }
    const rent = monthDate(month, 27);
    if (rent >= start && rent <= asOf) add(`${profile}-housing-${month}`, rent, p.housing, -p.rent, "Housing");
    const utility = monthDate(month, 19);
    if (utility >= start && utility <= asOf) add(`${profile}-utility-${month}`, utility, profile === "kevin" ? "Electric utility" : profile === "ava" ? "Harbor Energy" : "Cedar Utilities", -(profile === "kevin" ? 10000 : profile === "ava" ? 12500 : 9500), "Utilities");
    for (const [merchant, amount, day] of p.subscriptions) {
      const date = monthDate(month, day);
      if (date >= start && date <= asOf) add(`${profile}-${merchant}-${-month}`, date, merchant, -amount, "Subscription", false, "Fictional completed recurring service charge");
    }
  }
  if (profile === "kevin") add("kevin-course", shift(asOf, -3), "Professional certification tuition", -340000, "Education", false, "One-time fictional course payment, already included in closing balance");
  if (profile === "maya") add("maya-dental", shift(asOf, -9), "Cedar Dental", -42000, "Healthcare");
  for (const [index, day] of [p.payday, profile === "kevin" ? 13 : profile === "ava" ? 10 : 15].entries()) {
    let nextPay = monthDate(0, day);
    if (nextPay <= asOf) nextPay = monthDate(1, day);
    add(`income-${index}`, nextPay, p.employer, p.salary / 2, "Income", true, "Fictional scheduled semimonthly payroll estimate; not guaranteed");
  }
  if (profile === "kevin") {
    add("planned-headphones", shift(asOf, 7), "Optional studio equipment", -33000, "Shopping", true, "Fictional discretionary purchase plan; not ordered, no contract or payment due");
    transactions.at(-1)!.discretionary = true;
  }
  const utilityName = profile === "kevin" ? "Electric utility" : profile === "ava" ? "Harbor Energy" : "Cedar Utilities";
  const data: FinancialData = {
    source: "demo", asOf,
    planningPreferences: profile === "kevin" ? ["My gym membership is non-negotiable."] : [],
    customers: [{ id: profile, name: p.name, location: "Fictional", household: profile === "maya" ? "Cedar Lane" : "Maple Street", incomeCents: p.salary, monthlyBudgetCents: profile === "kevin" ? 260000 : 320000 }],
    accounts: [{ id: accountId, customerId: profile, name: "Fictional checking", type: "Checking", balanceCents: p.balance, institution: "Fictional snapshot — not Nessie" }],
    transactions: transactions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    bills: [
      { id: "utility", accountId, name: utilityName, dueDate: shift(asOf, 2), amountCents: profile === "kevin" ? 10000 : profile === "ava" ? 12500 : 9500, category: "Utilities", essential: true },
      { id: "repair", accountId, name: profile === "kevin" ? "Bicycle repair invoice" : profile === "ava" ? "Annual renters premium" : "Dental follow-up", dueDate: shift(asOf, 6), amountCents: profile === "kevin" ? 7000 : profile === "ava" ? 18000 : 8500, category: profile === "ava" ? "Insurance" : profile === "maya" ? "Healthcare" : "Transport", essential: true },
    ], loans: [],
    warnings: ["Fictional snapshot at October 17, 2026, 12:00 UTC — not live banking or Nessie records. Completed activity is already reflected in closing balances. Scheduled income and inferred recurrence are estimates."],
  };
  // A fully reconciled fictional ledger, anchored to the reported closing cash.
  // This is never applied to Nessie balances or used as forecast income.
  const cleared = transactions.filter(t => !t.pending);
  let balance = p.balance - cleared.reduce((sum, t) => sum + t.amountCents, 0);
  data.balanceHistory = [{ date: shift(start, -1), value: balance }];
  for (let day = 0; day < 60; day++) {
    const date = shift(start, day);
    balance += cleared.filter(t => t.date === date).reduce((sum, t) => sum + t.amountCents, 0);
    data.balanceHistory.push({ date, value: balance });
  }
  return data;
}
