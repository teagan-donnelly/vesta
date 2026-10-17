import type { Account, Customer, FinancialData } from "./types";
import { todayIso, isIsoDate, shift } from "./analysis";
import { parseSandboxLabel } from "./sandbox-records";

// Server modules are only imported by Route Handlers and the verification script.
const BASE = "https://prod-api.nessieisreal.com";
type RecordValue = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
export function cents(v: unknown) {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v < 0 ||
    !Number.isSafeInteger(Math.round(v * 100))
  )
    throw new Error("Nessie returned an invalid monetary amount.");
  return Math.round(v * 100);
}
function records(v: unknown): RecordValue[] {
  if (!Array.isArray(v) || v.some((r) => !r || typeof r !== "object"))
    throw new Error("Unexpected Nessie response format.");
  return v;
}
export async function nessieRequest(
  path: string,
  body?: unknown,
): Promise<unknown> {
  const apiKey = process.env.NESSIE_API_KEY;
  if (!apiKey)
    throw new Error("NESSIE_API_KEY is not configured on the server.");
  const url = new URL(path, BASE);
  url.searchParams.set("key", apiKey);
  try {
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        `Nessie ${path.split("?")[0]} returned HTTP ${response.status}.`,
      );
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Nessie "))
      throw error;
    throw new Error(
      "Nessie connection failed or timed out. No demo data was substituted.",
    );
  }
}
export async function loadNessie(customerId?: string): Promise<FinancialData> {
  const today = todayIso();
  const rawCustomers = records(await nessieRequest("/customers"));
  const customers: Customer[] = rawCustomers.map((c) => ({
    id: str(c._id),
    name: `${str(c.first_name)} ${str(c.last_name)}`.trim(),
    location: "",
    household: "Not provided",
    incomeCents: 0,
    monthlyBudgetCents: 0,
  }));
  const selected = customerId
    ? customers.find((c) => c.id === customerId)
    : customers[0];
  if (customerId && !selected)
    throw new Error("Selected Nessie customer was not found.");
  const warnings: string[] = [];
  if (selected?.name === "Vesta Fictional Test")
    warnings.push(
      "Fictional Nessie sandbox data. All activity for this test customer is fictional, not real banking activity.",
    );
  warnings.push(
    "The official Nessie schema does not document account purchase history or purchase creation. Spending here uses retrieved withdrawal records; it is not represented as purchase history.",
  );
  const data: FinancialData = {
    source: "nessie",
    asOf: today,
    customers,
    accounts: [],
    transactions: [],
    bills: [],
    loans: [],
    warnings,
  };
  if (!selected) {
    warnings.push(
      "Nessie authenticated successfully, but this sandbox has no customers.",
    );
    return data;
  }
  const rawAccounts = records(
    await nessieRequest(
      `/customers/${encodeURIComponent(selected.id)}/accounts`,
    ),
  );
  data.accounts = rawAccounts.map((a) => {
    if (!["Checking", "Savings", "Credit Card"].includes(str(a.type)))
      throw new Error("Unsupported Nessie account type.");
    return {
      id: str(a._id),
      customerId: str(a.customer_id),
      type: a.type as Account["type"],
      name: str(a.nickname),
      balanceCents: cents(a.balance),
      institution: "Capital One Nessie sandbox",
    };
  });
  if (!data.accounts.length)
    warnings.push("This customer has no sandbox accounts.");
  for (const account of data.accounts) {
    const path = `/accounts/${encodeURIComponent(account.id)}`;
    const [deposits, withdrawals, bills, loans] = await Promise.all(
      ["deposits", "withdrawals", "bills", "loans"].map(async (kind) =>
        records(await nessieRequest(`${path}/${kind}`)),
      ),
    );
    for (const [items, income] of [
      [deposits, true],
      [withdrawals, false],
    ] as const)
      for (const t of items) {
        if (["cancelled", "canceled"].includes(str(t.status))) continue;
        const date = str(t.transaction_date).slice(0, 10);
        if (!isIsoDate(date)) {
          warnings.push("An undated transaction was excluded.");
          continue;
        }
        // Deposits are not necessarily payroll. Only clearly described income is projected.
        const description = str(t.description);
        const metadata = parseSandboxLabel(description);
        data.transactions.push({
          id: str(t._id),
          accountId: account.id,
          date,
          merchant:
            metadata?.label ||
            description ||
            (income ? "Deposit" : "Withdrawal"),
          description,
          recordType: income ? "deposit" : "withdrawal",
          fictional: Boolean(metadata),
          category:
            metadata?.category ||
            (income
              ? /payroll|salary|paycheck/i.test(description)
                ? "Income"
                : "Deposit"
              : "Unknown"),
          amountCents: cents(t.amount) * (income ? 1 : -1),
          pending: str(t.status) !== "completed",
        });
      }
    for (const b of bills) {
      if (["cancelled", "completed"].includes(str(b.status))) continue;
      let date = str(b.upcoming_payment_date || b.payment_date).slice(0, 10);
      if (
        (!date || date <= today) &&
        b.status === "recurring" &&
        typeof b.recurring_date === "number" &&
        Number.isInteger(b.recurring_date) &&
        b.recurring_date >= 1 &&
        b.recurring_date <= 31
      ) {
        date = shift(today, 1);
        while (
          Number(date.slice(8)) !==
          Math.min(
            b.recurring_date,
            new Date(
              Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0),
            ).getUTCDate(),
          )
        )
          date = shift(date, 1);
      }
      if (!isIsoDate(date)) {
        warnings.push(
          "A bill without a valid due date was excluded from forecasting.",
        );
        continue;
      }
      data.bills.push({
        id: str(b._id),
        accountId: account.id,
        recurringDay:
          b.status === "recurring" &&
          typeof b.recurring_date === "number" &&
          Number.isInteger(b.recurring_date) &&
          b.recurring_date >= 1 &&
          b.recurring_date <= 31
            ? b.recurring_date
            : undefined,
        name:
          parseSandboxLabel(str(b.payee))?.label || str(b.payee || b.nickname),
        dueDate: date,
        amountCents: cents(b.payment_amount),
        category:
          parseSandboxLabel(str(b.payee))?.category ||
          (/credit|loan|debt/i.test(str(b.payee)) ? "Debt" : "Bill"),
        essential: parseSandboxLabel(str(b.payee))?.kind !== "subscription",
      });
    }
    data.loans.push(
      ...loans.map((l) => ({
        id: str(l._id),
        accountId: account.id,
        amountCents: cents(l.amount),
        paymentCents: cents(l.monthly_payment),
      })),
    );
  }
  if (data.loans.length)
    warnings.push(
      "Loans are displayed, but payments require a dated bill or transaction history to enter the forecast.",
    );
  if (data.transactions.some((t) => t.pending && t.date <= today))
    warnings.push(
      "Undated settlement timing for current pending transactions is excluded from the forecast.",
    );
  if (data.accounts.some((a) => a.type === "Credit Card"))
    warnings.push(
      "Credit card purchases and card-funded bills do not directly reduce projected cash. Cash-account debt payments are included when known.",
    );
  data.warnings = [...new Set(warnings)];
  return data;
}
