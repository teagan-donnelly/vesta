import type { PersonalRecord } from "../management";

// Recorded balances already include historical activity. Goals and holdings are
// separately tracked assets, not extra checking-account funds.
export function snapshotRecords(profile: string, asOf: string): PersonalRecord[] {
  const index = Math.max(0, ["ava", "kevin", "maya"].indexOf(profile));
  const records: PersonalRecord[] = [
    { id: `${profile}-credit`, kind: "credit", label: "Fictional everyday card", category: "Revolving", balanceCents: [42000, 68000, 26500][index], limitCents: [500000, 300000, 400000][index], openedDate: "2023-04-01", paymentStatus: "On time", date: asOf },
    { id: `${profile}-emergency`, kind: "goal", label: "Emergency reserve", category: "Emergency", targetCents: 600000, balanceCents: [240000, 85000, 320000][index], date: "2027-06-01", notes: "Separately tracked fictional savings; excluded from checking balance." },
    { id: `${profile}-travel`, kind: "goal", label: "Summer travel", category: "Travel", targetCents: 180000, balanceCents: [60000, 24000, 75000][index], date: "2027-07-01" },
    { id: `${profile}-groceries-budget`, kind: "budget", label: "Monthly groceries", category: "Groceries", amountCents: [35000, 30000, 40000][index], date: asOf },
    { id: `${profile}-index`, kind: "holding", label: "Fictional broad market fund", quantity: [12, 4, 18][index], priceCents: 10500, costCents: 9500, category: "ETF", date: asOf },
    { id: `${profile}-renters`, kind: "policy", label: "Fictional renters coverage", category: "Renters", amountCents: 2000000, date: "2027-04-01", status: "Active", notes: "Illustrative policy only; no real insurance coverage." },
    { id: `${profile}-contact`, kind: "contact", label: "Jordan — fictional emergency contact", notes: "Fictional contact. No real phone number or personal data." },
    { id: `${profile}-documents`, kind: "resource", label: "Emergency document checklist", notes: "Keep copies of identification, policy details, and emergency contacts in a secure place." },
  ];
  for (let month = 7; month <= 10; month++) {
    const date = `2026-${String(month).padStart(2, "0")}-01`;
    records.push({ id: `${profile}-score-${month}`, kind: "score", label: "Fictional recorded credit score", score: [730, 681, 754][index] + month - 7, date });
    records.push({ id: `${profile}-payment-${month}`, kind: "payment", label: "Fictional everyday card", referenceId: `${profile}-credit`, paymentStatus: "On time", date });
    records.push({ id: `${profile}-valuation-${month}`, kind: "valuation", label: "Fictional broad market fund", referenceId: `${profile}-index`, amountCents: [12, 4, 18][index] * (9900 + (month - 7) * 200), date });
  }
  records.push(
    { id: `${profile}-restaurants-budget`, kind: "budget", label: "Dining with intention", category: "Restaurants", amountCents: [22000, 16000, 25000][index], date: asOf },
    { id: `${profile}-transport-budget`, kind: "budget", label: "Getting around", category: "Transport", amountCents: [14000, 12000, 9000][index], date: asOf },
  );
  return records;
}
