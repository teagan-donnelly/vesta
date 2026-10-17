export type DataSource = "demo" | "nessie";

export interface FinancialData {
  source: DataSource;
  asOf: string;
  customers: Customer[];
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  loans: {
    id: string;
    accountId: string;
    amountCents: number;
    paymentCents: number;
  }[];
  warnings: string[];
}

export interface ForecastEvent {
  id: string;
  date: string;
  amountCents: number;
  label: string;
  kind: "subscription" | "bill" | "debt" | "income" | "purchase";
  merchantKey: string;
  accountId?: string;
}

export interface Simulation {
  removedSubscriptions?: string[];
  eventId?: string;
  delayDays?: number;
  paymentCents?: number;
  unexpectedCents?: number;
  unexpectedDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  location: string;
  household: string;
  incomeCents: number;
  monthlyBudgetCents: number;
}

export interface Account {
  id: string;
  customerId: string;
  type: "Checking" | "Savings" | "Credit Card";
  name: string;
  balanceCents: number;
  institution: string;
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  description: string;
  amountCents: number;
  accountId: string;
  pending?: boolean;
  recordType?: "deposit" | "withdrawal" | "purchase";
  fictional?: boolean;
}

export interface Bill {
  id: string;
  name: string;
  dueDate: string;
  amountCents: number;
  category: string;
  essential: boolean;
  accountId?: string;
  recurringDay?: number;
}

export interface Subscription {
  id: string;
  merchant: string;
  amountCents: number;
  cadence: "monthly" | "weekly" | "annual";
  lastChargeDate: string;
  nextChargeDate: string;
  confidence:
    "Confirmed recurring" | "Likely recurring" | "Insufficient evidence";
  status: "essential" | "review" | "simulate-cancel" | "active";
}

export interface FinancialAlert {
  id: string;
  title: string;
  merchant: string;
  date: string;
  amountCents: number;
  severity: "Low" | "Medium" | "High";
  confidence: number;
  reason: string;
  evidence: string[];
}

export interface CashFlowProjectionPoint {
  date: string;
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
}

export interface CashFlowProjection {
  startDate: string;
  endDate: string;
  startingBalanceCents: number;
  endingBalanceCents: number;
  lowestBalanceCents: number;
  lowestBalanceDate: string;
  shortfallAmountCents: number;
  points: CashFlowProjectionPoint[];
  riskyDates: string[];
  contributingFactors: string[];
}

export interface FinancialScenario {
  id: string;
  name: string;
  description: string;
  subscriptionSavingsCents: number;
  delayedExpenseCents: number;
  unexpectedExpenseCents: number;
  incomeDelayCents: number;
  paymentAdjustmentCents: number;
}

export interface CreditFactor {
  label: string;
  value: string;
  detail: string;
}

export interface FinancialConnection {
  id: string;
  label: string;
  type: "shared-expense" | "shared-billing" | "financial-relationship";
  note: string;
  amountCents: number;
}

export interface ContinuityPlan {
  id: string;
  emergencyNote: string;
  trustedContact: string;
  checklist: string[];
  obligations: string[];
}
