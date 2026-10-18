import { isIsoDate, todayIso } from "./analysis";
import type { FinancialData, Subscription } from "./types";
export const recordKinds = [
  "transaction",
  "annotation",
  "subscription",
  "score",
  "credit",
  "payment",
  "goal",
  "contribution",
  "budget",
  "holding",
  "valuation",
  "policy",
  "contact",
  "resource",
  "preferences",
] as const;
export type RecordKind = (typeof recordKinds)[number];
export type PersonalRecord = {
  id: string;
  kind: RecordKind;
  label: string;
  date?: string;
  amountCents?: number;
  targetCents?: number;
  balanceCents?: number;
  limitCents?: number;
  priceCents?: number;
  costCents?: number;
  quantity?: number;
  score?: number;
  category?: string;
  accountId?: string;
  referenceId?: string;
  notes?: string;
  status?: string;
  cadence?: "weekly" | "monthly" | "annual";
  openedDate?: string;
  paymentStatus?: string;
};
export function validateRecord(input: unknown): PersonalRecord {
  if (!input || typeof input !== "object") throw Error("Provide a record.");
  const raw = input as Record<string, unknown>;
  if (
    !recordKinds.includes(raw.kind as RecordKind) ||
    typeof raw.id !== "string" ||
    !/^[a-zA-Z0-9:_-]{1,200}$/.test(raw.id)
  )
    throw Error("Invalid record type or identifier.");
  const value: PersonalRecord = {
    id: raw.id,
    kind: raw.kind as RecordKind,
    label: "",
  };
  for (const field of [
    "label",
    "category",
    "accountId",
    "referenceId",
    "notes",
    "status",
    "paymentStatus",
  ] as const) {
    if (raw[field] === undefined || raw[field] === "") continue;
    if (
      typeof raw[field] !== "string" ||
      raw[field].length > (field === "notes" ? 1000 : 200)
    )
      throw Error("Text is too long.");
    value[field] = raw[field].trim();
  }
  if (!value.label) throw Error("A name is required.");
  for (const field of [
    "amountCents",
    "targetCents",
    "balanceCents",
    "limitCents",
    "priceCents",
    "costCents",
  ] as const) {
    if (raw[field] === undefined) continue;
    if (
      !Number.isSafeInteger(raw[field]) ||
      Math.abs(Number(raw[field])) > 10000000000 ||
      (field !== "amountCents" && Number(raw[field]) < 0)
    )
      throw Error("Use a valid amount in cents.");
    value[field] = Number(raw[field]);
  }
  for (const field of ["date", "openedDate"] as const) {
    if (!raw[field]) continue;
    if (typeof raw[field] !== "string" || !isIsoDate(raw[field]))
      throw Error("Choose a valid date.");
    value[field] = raw[field];
  }
  if (raw.quantity !== undefined) {
    if (
      typeof raw.quantity !== "number" ||
      !Number.isFinite(raw.quantity) ||
      raw.quantity < 0 ||
      raw.quantity > 1000000 ||
      Math.abs(Math.round(raw.quantity * 10000) / 10000 - raw.quantity) > 1e-9
    )
      throw Error("Quantity supports up to four decimal places.");
    value.quantity = raw.quantity;
  }
  if (raw.score !== undefined) {
    if (
      !Number.isInteger(raw.score) ||
      Number(raw.score) < 300 ||
      Number(raw.score) > 850
    )
      throw Error("A recorded score must be between 300 and 850.");
    value.score = Number(raw.score);
  }
  if (raw.cadence !== undefined) {
    if (!["weekly", "monthly", "annual"].includes(String(raw.cadence)))
      throw Error("Choose a billing frequency.");
    value.cadence = raw.cadence as PersonalRecord["cadence"];
  }
  const required: Partial<Record<RecordKind, (keyof PersonalRecord)[]>> = {
    transaction: ["date", "amountCents", "accountId", "category"],
    annotation: ["referenceId"],
    subscription: ["date", "amountCents", "accountId", "cadence"],
    score: ["date", "score"],
    credit: ["balanceCents", "category"],
    payment: ["referenceId", "date", "paymentStatus"],
    goal: ["targetCents", "balanceCents", "date"],
    contribution: ["referenceId", "amountCents", "date"],
    budget: ["category", "amountCents", "date"],
    holding: ["quantity", "priceCents", "costCents", "category", "date"],
    policy: ["category", "amountCents", "date"],
    valuation: ["amountCents", "date", "referenceId"],
  };
  for (const field of required[value.kind] || [])
    if (value[field] === undefined || value[field] === "")
      throw Error(`Complete the ${field.replace("Cents", "")} field.`);
  if (value.kind !== "transaction" && (value.amountCents ?? 0) < 0)
    throw Error("Use a nonnegative amount.");
  if (value.kind === "goal" && !value.targetCents)
    throw Error("A goal target must be greater than zero.");
  if (
    value.kind === "credit" &&
    value.category === "Revolving" &&
    !value.limitCents
  )
    throw Error("Revolving accounts need a positive credit limit.");
  if (
    value.kind === "credit" &&
    !["Revolving", "Installment"].includes(value.category || "")
  )
    throw Error("Choose a revolving or installment account.");
  if (
    ["credit", "payment"].includes(value.kind) &&
    value.paymentStatus &&
    !["Unknown", "On time", "Late"].includes(value.paymentStatus)
  )
    throw Error("Choose a valid recorded payment status.");
  if (
    value.kind === "credit" &&
    ["On time", "Late"].includes(value.paymentStatus || "") &&
    !value.date
  )
    throw Error(
      "Enter the date of this payment observation, or choose Unknown.",
    );
  if (
    value.kind === "subscription" &&
    value.status &&
    !["active", "canceled"].includes(value.status)
  )
    throw Error("Choose an active or canceled tracking status.");
  if (
    value.kind === "subscription" &&
    /\b(rent|debt|loan|utility|utilities)\b/i.test(
      `${value.category || ""} ${value.label}`,
    )
  )
    throw Error(
      "Track rent, debt and utilities as obligations, not subscriptions.",
    );
  if (value.kind === "holding" && !Number.isSafeInteger(holdingValue(value)))
    throw Error("Holding value exceeds supported precision.");
  if (
    ["score", "holding", "contribution", "payment", "valuation"].includes(
      value.kind,
    ) &&
    value.date &&
    value.date > todayIso()
  )
    throw Error(
      "Recorded observations cannot be dated in the future. Use a goal target or forecast for future plans.",
    );
  return value;
}
export function recordScope(mode: string, customer: string) {
  if (!["demo", "nessie"].includes(mode) || customer.length > 200)
    throw Error("Invalid financial profile.");
  if (mode === "demo" && customer && !/^demo:(ava|kevin|maya|noah|lily)$/.test(customer))
    throw Error("Choose a fictional profile.");
  if (mode === "nessie" && (!customer || customer.startsWith("demo:")))
    throw Error("Choose a Nessie customer first.");
  return `${mode}:${customer || "generic"}`;
}
export function applyPersonalRecords(
  base: FinancialData,
  records: PersonalRecord[],
): FinancialData {
  const data: FinancialData = {
    ...base,
    warnings: [...base.warnings],
    transactions: base.transactions
      .filter((t) => !t.id.startsWith("manual:"))
      .map((t) => {
        const r = records.find(
          (r) => r.kind === "annotation" && r.referenceId === t.id,
        );
        const category = t.originalCategory ?? t.category;
        const description = t.originalDescription ?? t.description;
        return r || t.originalCategory !== undefined
          ? {
              ...t,
              originalCategory: category,
              originalDescription: description,
              category: r?.category || category,
              description: r?.notes || description,
            }
          : t;
      }),
  };
  for (const r of records.filter((r) => r.kind === "transaction"))
    if (base.accounts.some((a) => a.id === r.accountId))
      data.transactions.push({
        id: `manual:${r.id}`,
        date: r.date!,
        merchant: r.label,
        amountCents: r.amountCents!,
        accountId: r.accountId!,
        category: r.category!,
        description: r.notes || "Manually tracked in Vesta; not a bank record",
        pending: r.date! > base.asOf,
        provenance: "manual",
      });
  data.manualSubscriptions = records
    .filter((r) => r.kind === "subscription" && r.status !== "canceled")
    .map(
      (r) =>
        ({
          id: r.referenceId || `${r.accountId}:manual-${r.id}`,
          merchant: r.label,
          amountCents: r.amountCents!,
          cadence: r.cadence!,
          lastChargeDate: r.date!,
          nextChargeDate: r.date!,
          confidence: "Manually tracked",
          status: "active",
        }) as Subscription,
    );
  if (records.some(r => r.kind === "transaction" && r.date && r.date <= base.asOf))
    delete data.balanceHistory; // Manual observations have no verified historical cash anchor.
  data.canceledSubscriptionIds = records
    .filter((r) => r.kind === "subscription" && r.status === "canceled")
    .map((r) => r.referenceId || `${r.accountId}:manual-${r.id}`);
  if (records.some((r) => r.kind === "transaction"))
    data.warnings.push(
      "Manual entries are self-reported, not Nessie records. Historical entries do not change reported bank balances; future entries enter the forecast.",
    );
  return data;
}
export function periodTransactions(
  data: FinancialData,
  month = data.asOf.slice(0, 7),
) {
  return data.transactions.filter(
    (t) => !t.pending && t.date <= data.asOf && t.date.startsWith(month),
  );
}
export function financialTotals(data: FinancialData) {
  const items = periodTransactions(data);
  const income = items.reduce((s, t) => s + Math.max(t.amountCents, 0), 0);
  const spending = items.reduce((s, t) => s - Math.min(t.amountCents, 0), 0);
  return { income, spending, savings: income - spending };
}
export function spendingCategories(
  data: FinancialData,
  month = data.asOf.slice(0, 7),
) {
  const totals = new Map<string, number>();
  for (const t of periodTransactions(data, month))
    if (t.amountCents < 0)
      totals.set(t.category, (totals.get(t.category) || 0) - t.amountCents);
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
export function goalProgress(goal: PersonalRecord, records: PersonalRecord[]) {
  const saved =
    (goal.balanceCents || 0) +
    records
      .filter((r) => r.kind === "contribution" && r.referenceId === goal.id)
      .reduce((s, r) => s + r.amountCents!, 0);
  return {
    saved,
    percent: Math.min(100, Math.round((saved / goal.targetCents!) * 100)),
  };
}
export function holdingValue(r: PersonalRecord) {
  return Number(
    (BigInt(Math.round((r.quantity || 0) * 10000)) * BigInt(r.priceCents || 0) +
      BigInt(5000)) /
      BigInt(10000),
  );
}
export function creditUtilization(records: PersonalRecord[]) {
  const revolving = records.filter(
    (r) => r.kind === "credit" && r.category === "Revolving",
  );
  const limit = revolving.reduce((s, r) => s + (r.limitCents || 0), 0);
  return limit
    ? (revolving.reduce((s, r) => s + (r.balanceCents || 0), 0) / limit) * 100
    : null;
}
export function expenseDays(data: FinancialData) {
  return Array.from({ length: Number(data.asOf.slice(8)) }, (_, i) => {
    const date = `${data.asOf.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
    return {
      date,
      value: periodTransactions(data)
        .filter((t) => t.date === date && t.amountCents < 0)
        .reduce((s, t) => s - t.amountCents, 0),
    };
  });
}
