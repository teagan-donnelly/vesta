// Metadata is decoded only from descriptions/payees actually returned by Nessie.
// It never supplies missing transactions, dates, amounts or balances.
export const SANDBOX_PREFIX = "VESTA_FICTIONAL_V1";
export type SandboxKind =
  | "income"
  | "subscription"
  | "housing"
  | "utilities"
  | "debt"
  | "groceries"
  | "unexpected";
const categories: Record<SandboxKind, string> = {
  income: "Income",
  subscription: "Subscription",
  housing: "Housing",
  utilities: "Utilities",
  debt: "Debt Payment",
  groceries: "Groceries",
  unexpected: "Unknown",
};
export function sandboxLabel(kind: SandboxKind, label: string) {
  return `${SANDBOX_PREFIX}|${kind}|${label}`;
}
export function sandboxDescription(
  kind: SandboxKind,
  label: string,
  reference: string,
) {
  return `${sandboxLabel(kind, label)}|${reference}`;
}
export function parseSandboxLabel(value: string) {
  const [prefix, kind, label, reference] = value.split("|");
  if (prefix !== SANDBOX_PREFIX || !Object.hasOwn(categories, kind) || !label)
    return null;
  return {
    kind: kind as SandboxKind,
    label,
    reference,
    category: categories[kind as SandboxKind],
  };
}
