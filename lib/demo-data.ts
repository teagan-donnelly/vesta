import type {
  Account,
  Bill,
  ContinuityPlan,
  CreditFactor,
  Customer,
  DataSource,
  FinancialAlert,
  FinancialConnection,
  Subscription,
  Transaction,
} from "./types";

export const dataSource: DataSource = "demo";

export const customer: Customer = {
  id: "demo-customer-01",
  name: "Ava Reynolds",
  location: "Austin, TX",
  household: "2 adults + 1 pet",
  incomeCents: 660000,
  monthlyBudgetCents: 420000,
};

export const accounts: Account[] = [
  {
    id: "account-checking",
    customerId: customer.id,
    type: "Checking",
    name: "Everyday Checking",
    balanceCents: 182450,
    institution: "Vesta Demo Bank",
  },
  {
    id: "account-savings",
    customerId: customer.id,
    type: "Savings",
    name: "High Yield Savings",
    balanceCents: 224800,
    institution: "Vesta Demo Bank",
  },
  {
    id: "account-card",
    customerId: customer.id,
    type: "Credit Card",
    name: "Rewards Card",
    balanceCents: 146250,
    institution: "Vesta Demo Bank",
  },
];

export const transactions: Transaction[] = [
  { id: "txn-01", date: "2026-04-01", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-02", date: "2026-04-05", merchant: "Local Market", category: "Groceries", description: "Weekly grocery trip", amountCents: -12480, accountId: "account-checking" },
  { id: "txn-03", date: "2026-04-07", merchant: "Netflix", category: "Subscription", description: "Streaming plan", amountCents: -1599, accountId: "account-checking" },
  { id: "txn-04", date: "2026-04-09", merchant: "City Transit", category: "Transportation", description: "Transit pass", amountCents: -8250, accountId: "account-checking" },
  { id: "txn-05", date: "2026-04-12", merchant: "Apartment Rent", category: "Housing", description: "Rent", amountCents: -195000, accountId: "account-checking" },
  { id: "txn-06", date: "2026-04-15", merchant: "Spotify", category: "Subscription", description: "Music subscription", amountCents: -1099, accountId: "account-checking" },
  { id: "txn-07", date: "2026-04-15", merchant: "Green Energy Co.", category: "Utilities", description: "Electricity bill", amountCents: -11820, accountId: "account-checking" },
  { id: "txn-08", date: "2026-04-18", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-09", date: "2026-04-20", merchant: "Riverside Fitness", category: "Subscription", description: "Gym membership", amountCents: -6499, accountId: "account-checking" },
  { id: "txn-10", date: "2026-04-23", merchant: "Sunny Grocery", category: "Groceries", description: "Weekly groceries", amountCents: -15360, accountId: "account-checking" },
  { id: "txn-11", date: "2026-04-24", merchant: "Northline Credit", category: "Debt Payment", description: "Credit card payment", amountCents: -98000, accountId: "account-checking" },
  { id: "txn-12", date: "2026-05-01", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-13", date: "2026-05-03", merchant: "Local Market", category: "Groceries", description: "Weekly grocery trip", amountCents: -13160, accountId: "account-checking" },
  { id: "txn-14", date: "2026-05-05", merchant: "Netflix", category: "Subscription", description: "Streaming plan", amountCents: -1599, accountId: "account-checking" },
  { id: "txn-15", date: "2026-05-08", merchant: "City Transit", category: "Transportation", description: "Transit pass", amountCents: -8250, accountId: "account-checking" },
  { id: "txn-16", date: "2026-05-12", merchant: "Apartment Rent", category: "Housing", description: "Rent", amountCents: -195000, accountId: "account-checking" },
  { id: "txn-17", date: "2026-05-15", merchant: "Spotify", category: "Subscription", description: "Music subscription", amountCents: -1099, accountId: "account-checking" },
  { id: "txn-18", date: "2026-05-15", merchant: "Green Energy Co.", category: "Utilities", description: "Electricity bill", amountCents: -11820, accountId: "account-checking" },
  { id: "txn-19", date: "2026-05-18", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-20", date: "2026-05-20", merchant: "Riverside Fitness", category: "Subscription", description: "Gym membership", amountCents: -6499, accountId: "account-checking" },
  { id: "txn-21", date: "2026-05-22", merchant: "Sunny Grocery", category: "Groceries", description: "Weekly groceries", amountCents: -16440, accountId: "account-checking" },
  { id: "txn-22", date: "2026-05-23", merchant: "Northline Credit", category: "Debt Payment", description: "Credit card payment", amountCents: -98000, accountId: "account-checking" },
  { id: "txn-23", date: "2026-05-30", merchant: "Apex Digital", category: "Unknown", description: "Unexpected large charge", amountCents: -42850, accountId: "account-checking" },
  { id: "txn-24", date: "2026-06-01", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-25", date: "2026-06-02", merchant: "Local Market", category: "Groceries", description: "Weekly grocery trip", amountCents: -14890, accountId: "account-checking" },
  { id: "txn-26", date: "2026-06-04", merchant: "Netflix", category: "Subscription", description: "Streaming plan", amountCents: -1599, accountId: "account-checking" },
  { id: "txn-27", date: "2026-06-07", merchant: "City Transit", category: "Transportation", description: "Transit pass", amountCents: -8250, accountId: "account-checking" },
  { id: "txn-28", date: "2026-06-12", merchant: "Apartment Rent", category: "Housing", description: "Rent", amountCents: -195000, accountId: "account-checking" },
  { id: "txn-29", date: "2026-06-15", merchant: "Spotify", category: "Subscription", description: "Music subscription", amountCents: -1099, accountId: "account-checking" },
  { id: "txn-30", date: "2026-06-15", merchant: "Green Energy Co.", category: "Utilities", description: "Electricity bill", amountCents: -11820, accountId: "account-checking" },
  { id: "txn-31", date: "2026-06-18", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-32", date: "2026-06-20", merchant: "Riverside Fitness", category: "Subscription", description: "Gym membership", amountCents: -6499, accountId: "account-checking" },
  { id: "txn-33", date: "2026-06-22", merchant: "Sunny Grocery", category: "Groceries", description: "Weekly groceries", amountCents: -17120, accountId: "account-checking" },
  { id: "txn-34", date: "2026-06-23", merchant: "Northline Credit", category: "Debt Payment", description: "Credit card payment", amountCents: -98000, accountId: "account-checking" },
  { id: "txn-35", date: "2026-06-27", merchant: "Coastline Storage", category: "Subscription", description: "Storage fee", amountCents: -2499, accountId: "account-checking" },
  { id: "txn-36", date: "2026-06-29", merchant: "Apex Digital", category: "Unknown", description: "Unexpected large charge", amountCents: -41320, accountId: "account-checking" },
  { id: "txn-37", date: "2026-07-01", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-38", date: "2026-07-03", merchant: "Local Market", category: "Groceries", description: "Weekly grocery trip", amountCents: -13950, accountId: "account-checking" },
  { id: "txn-39", date: "2026-07-05", merchant: "Netflix", category: "Subscription", description: "Streaming plan", amountCents: -1599, accountId: "account-checking" },
  { id: "txn-40", date: "2026-07-08", merchant: "City Transit", category: "Transportation", description: "Transit pass", amountCents: -8250, accountId: "account-checking" },
  { id: "txn-41", date: "2026-07-12", merchant: "Apartment Rent", category: "Housing", description: "Rent", amountCents: -195000, accountId: "account-checking" },
  { id: "txn-42", date: "2026-07-15", merchant: "Spotify", category: "Subscription", description: "Music subscription", amountCents: -1099, accountId: "account-checking" },
  { id: "txn-43", date: "2026-07-15", merchant: "Green Energy Co.", category: "Utilities", description: "Electricity bill", amountCents: -11820, accountId: "account-checking" },
  { id: "txn-44", date: "2026-07-18", merchant: "Employer Payroll", category: "Income", description: "Paycheck deposit", amountCents: 330000, accountId: "account-checking" },
  { id: "txn-45", date: "2026-07-20", merchant: "Riverside Fitness", category: "Subscription", description: "Gym membership", amountCents: -6499, accountId: "account-checking" },
  { id: "txn-46", date: "2026-07-22", merchant: "Sunny Grocery", category: "Groceries", description: "Weekly groceries", amountCents: -17780, accountId: "account-checking" },
  { id: "txn-47", date: "2026-07-23", merchant: "Northline Credit", category: "Debt Payment", description: "Credit card payment", amountCents: -98000, accountId: "account-checking" },
];

export const bills: Bill[] = [
  { id: "bill-rent", name: "Apartment Rent", dueDate: "2026-07-12", amountCents: 195000, category: "Housing", essential: true },
  { id: "bill-utilities", name: "Electricity", dueDate: "2026-07-15", amountCents: 11820, category: "Utilities", essential: true },
  { id: "bill-phone", name: "Phone + Internet", dueDate: "2026-07-19", amountCents: 9800, category: "Utilities", essential: true },
  { id: "bill-gym", name: "Gym Membership", dueDate: "2026-07-20", amountCents: 6499, category: "Health", essential: false },
  { id: "bill-storage", name: "Storage Unit", dueDate: "2026-07-27", amountCents: 2499, category: "Lifestyle", essential: false },
  { id: "bill-card", name: "Credit Card Payment", dueDate: "2026-07-24", amountCents: 98000, category: "Debt", essential: true },
];

export const subscriptions: Subscription[] = [
  { id: "sub-netflix", merchant: "Netflix", amountCents: 1599, cadence: "monthly", lastChargeDate: "2026-07-05", nextChargeDate: "2026-08-05", confidence: "Confirmed recurring", status: "review" },
  { id: "sub-spotify", merchant: "Spotify", amountCents: 1099, cadence: "monthly", lastChargeDate: "2026-07-15", nextChargeDate: "2026-08-15", confidence: "Confirmed recurring", status: "essential" },
  { id: "sub-fitness", merchant: "Riverside Fitness", amountCents: 6499, cadence: "monthly", lastChargeDate: "2026-07-20", nextChargeDate: "2026-08-20", confidence: "Confirmed recurring", status: "review" },
  { id: "sub-storage", merchant: "Coastline Storage", amountCents: 2499, cadence: "monthly", lastChargeDate: "2026-06-27", nextChargeDate: "2026-07-27", confidence: "Likely recurring", status: "simulate-cancel" },
];

export const alerts: FinancialAlert[] = [
  {
    id: "alert-1",
    title: "Large unexplained charge",
    merchant: "Apex Digital",
    date: "2026-06-29",
    amountCents: 41320,
    severity: "High",
    confidence: 88,
    reason: "Charge is 3.4x the customer median for similar merchants and appears outside normal household spending patterns.",
    evidence: ["This merchant has not appeared in prior months", "The transaction is more than 3x the average household spend on non-recurring purchases"],
  },
  {
    id: "alert-2",
    title: "Shortfall before next paycheck",
    merchant: "Cash flow risk",
    date: "2026-07-08",
    amountCents: 45120,
    severity: "Medium",
    confidence: 79,
    reason: "The model predicts a negative balance before the next payroll deposit due to rent, utility, and card payment timing.",
    evidence: ["Upcoming housing and card payments cluster within the same 10-day window", "Projected cash buffer drops below $0 before 2026-07-18"],
  },
];

export const financialConnections: FinancialConnection[] = [
  { id: "conn-1", label: "Shared utility billing", type: "shared-expense", note: "Electricity bill remains shared with household member and should be reviewed before moving out.", amountCents: 11820 },
  { id: "conn-2", label: "Streaming joint decision", type: "shared-billing", note: "Netflix is a shared subscription and has been retained in the household budget for months.", amountCents: 1599 },
  { id: "conn-3", label: "Household budget review", type: "financial-relationship", note: "This budget item should be reviewed before a major household transition.", amountCents: 0 },
];

export const creditFactors: CreditFactor[] = [
  { label: "Payment history", value: "No late payments reported", detail: "The model sees no late payment indicators in tracked spending and obligations." },
  { label: "Credit utilization", value: "Approx. 36% of card limit", detail: "The tracked card balance appears moderate, but is elevated enough to keep utilization in focus." },
  { label: "Length of credit history", value: "4+ years", detail: "Longer tenure is a positive factor, but older relationships should be retained where possible." },
  { label: "Credit mix", value: "Balanced", detail: "The user maintains both revolving and installment obligations." },
  { label: "New credit", value: "Low recent activity", detail: "There are no recent credit applications in the tracked data." },
];

export const continuityPlan: ContinuityPlan = {
  id: "continuity-plan-01",
  emergencyNote: "If illness or travel disrupts my ability to manage finances, keep rent and utilities paid and notify my partner and sister before the due-date window closes.",
  trustedContact: "Jamie Reynolds — sister — (512) 555-0198",
  checklist: [
    "Confirm rent, utilities, and card billing autopay settings",
    "Store a copy of payment schedules in a secure note application",
    "Review access to shared account and recurring subscriptions",
    "Verify authorized financial contacts and emergency instructions",
  ],
  obligations: [
    "Apartment rent due 2026-07-12",
    "Utilities due 2026-07-15",
    "Credit card payment due 2026-07-24",
    "Netflix recurring charge on 2026-08-05",
  ],
};

export const financialScenarioOptions = [
  {
    id: "baseline",
    name: "Baseline",
    description: "Current plan with known obligations and recurring charges.",
    subscriptionSavingsCents: 0,
    delayedExpenseCents: 0,
    unexpectedExpenseCents: 0,
    incomeDelayCents: 0,
    paymentAdjustmentCents: 0,
  },
  {
    id: "subscription-cut",
    name: "Cancel streaming bundle",
    description: "Remove Netflix and storage-related overhead before the next cycle.",
    subscriptionSavingsCents: 1599 + 2499,
    delayedExpenseCents: 0,
    unexpectedExpenseCents: 0,
    incomeDelayCents: 0,
    paymentAdjustmentCents: 0,
  },
  {
    id: "stress-case",
    name: "Stress cash-flow case",
    description: "Expected shortfall worsens when a surprise expense arrives before the next paycheck.",
    subscriptionSavingsCents: 0,
    delayedExpenseCents: 30000,
    unexpectedExpenseCents: 55000,
    incomeDelayCents: 330000,
    paymentAdjustmentCents: 0,
  },
];
