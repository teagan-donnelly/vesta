import { snapshotRecords } from "./snapshot-records";
import type { FinancialData, Simulation } from "../types";
import { applyPersonalRecords, type PersonalRecord } from "../management";
import {
  forecastEvents,
  isIsoDate,
  project,
  shift,
  subscriptionsFor,
} from "../analysis";

export const profiles = [
  { id: "ava", name: "Ava" },
  { id: "kevin", name: "Kevin" },
  { id: "maya", name: "Maya" },
];
export type ProfileId = "ava" | "kevin" | "maya";
export type Consent = {
  readiness: boolean;
  coverage: boolean;
  balance: boolean;
  expenseIds: string[];
};
export type Commitment = {
  id: string;
  workspaceId: string;
  owner: ProfileId;
  name: string;
  amountCents: number;
  dueDate: string;
  recurring: boolean;
  contributions: {
    profile: ProfileId;
    expectedCents: number;
    reportedCents: number;
    agreed: boolean;
  }[];
};
export type PrivatePlan = {
  recordSets?: Record<string, PersonalRecord[]>;
  simulation: Simulation;
  memoryOptIn: boolean;
  preferences: string[];
  assistantId?: string;
  assistantProof?: string;
  messages: { role: "user" | "assistant"; content: string }[];
};
export type DemoState = {
  asOf: string;
  workspaces: {
    id: string;
    name: string;
    kind: string;
    owner: ProfileId;
    members: ProfileId[];
  }[];
  commitments: Commitment[];
  consents: Record<string, Consent>;
  plans: Record<ProfileId, PrivatePlan>;
  history: {
    at: string;
    profile: ProfileId;
    workspaceId: string;
    commitmentId: string;
    status: string;
  }[];
};
export const privateDefault = (): PrivatePlan => ({
  simulation: {},
  memoryOptIn: false,
  preferences: [],
  messages: [],
});
export const consentDefault = (): Consent => ({
  readiness: false,
  coverage: false,
  balance: false,
  expenseIds: [],
});
export function profileId(value: unknown): ProfileId {
  if (!profiles.some((p) => p.id === value))
    throw new Error("Choose a fictional demo profile.");
  return value as ProfileId;
}
export const SNAPSHOT_AT = "2026-10-17T12:00:00.000Z";
export const SNAPSHOT_DATE = SNAPSHOT_AT.slice(0, 10);
export function initialState(asOf = SNAPSHOT_DATE): DemoState {
  return {
    asOf,
    workspaces: [
      {
        id: "household",
        name: "Maple Street household",
        kind: "Household",
        owner: "ava",
        members: ["ava", "kevin"],
      },
      { id: "cedar", name: "Cedar Lane household", kind: "Household", owner: "maya", members: ["maya"] },
    ],
    commitments: [
      {
        id: "rent",
        workspaceId: "household",
        owner: "ava",
        name: "Monthly rent",
        amountCents: 200000,
        dueDate: shift(asOf, 10),
        recurring: true,
        contributions: [
          {
            profile: "ava",
            expectedCents: 100000,
            reportedCents: 100000,
            agreed: true,
          },
          {
            profile: "kevin",
            expectedCents: 100000,
            reportedCents: 0,
            agreed: true,
          },
        ],
      },
      {
        id: "maya-rent", workspaceId: "cedar", owner: "maya", name: "Cedar Lane rent",
        amountCents: 110000, dueDate: shift(asOf, 10), recurring: true,
        contributions: [{ profile: "maya", expectedCents: 110000, reportedCents: 0, agreed: true }],
      },
    ],
    consents: {},
    plans: {
      ava: { ...privateDefault(), recordSets: { "demo:demo:ava": snapshotRecords("ava", asOf) } },
      kevin: { ...privateDefault(), recordSets: { "demo:demo:kevin": snapshotRecords("kevin", asOf) } },
      maya: { ...privateDefault(), recordSets: { "demo:demo:maya": snapshotRecords("maya", asOf) } },
    },
    history: [],
  };
}
export function membership(
  s: DemoState,
  workspaceId: string,
  viewer: ProfileId,
) {
  const w = s.workspaces.find(
    (w) => w.id === workspaceId && w.members.includes(viewer),
  );
  if (!w) throw new Error("Workspace unavailable for this demo profile.");
  return w;
}
export function consentFor(
  s: DemoState,
  workspaceId: string,
  member: ProfileId,
) {
  return s.consents[`${workspaceId}:${member}`] || consentDefault();
}
export function fixtureData(profile: ProfileId, asOf: string): FinancialData {
  const accountId = `fictional-${profile}`;
  const data: FinancialData = {
    source: "demo",
    asOf,
    customers: [
      {
        id: profile,
        name: profiles.find((p) => p.id === profile)!.name,
        location: "Fictional",
        household: "Demo",
        incomeCents: profile === "kevin" ? 360000 : profile === "ava" ? 480000 : 420000,
        monthlyBudgetCents: profile === "kevin" ? 220000 : 280000,
      },
    ],
    accounts: [
      {
        id: accountId,
        customerId: profile,
        name: "Fictional checking",
        type: "Checking",
        balanceCents: profile === "kevin" ? 128000 : profile === "ava" ? 300000 : 245000,
        institution: "Local fictional fixture — not Nessie",
      },
    ],
    transactions: [],
    bills: [],
    loans: [],
    warnings: [
      "Fictional collaborative demo. No authentication or actual payments. Income and recurring spending are estimates, never guaranteed.",
    ],
  };
  for (const [merchant, amountCents, day] of [
    ["Spotify", 1500, 4],
    ["Entertainment bundle", 6000, 3],
    ["Riverside Fitness", 4500, 5],
  ] as const) {
    const next = new Date(shift(asOf, day) + "T00:00:00Z");
    for (let m = 1; m <= 3; m++) {
      const d = new Date(
        Date.UTC(
          next.getUTCFullYear(),
          next.getUTCMonth() - m,
          next.getUTCDate(),
        ),
      );
      data.transactions.push({
        id: `${profile}-${merchant}-${m}`,
        accountId,
        merchant,
        category: "Subscription",
        description: "Fictional recurring service",
        date: d.toISOString().slice(0, 10),
        amountCents: -amountCents,
        fictional: true,
      });
    }
  }
  data.bills = [
    {
      id: "utility",
      accountId,
      name: "Electric utility",
      dueDate: shift(asOf, 2),
      amountCents: 10000,
      category: "Utilities",
      essential: true,
    },
    {
      id: "repair",
      accountId,
      name: "Unexpected bicycle repair",
      dueDate: shift(asOf, 6),
      amountCents: 7000,
      category: "Transport",
      essential: true,
    },
  ];
  for (const day of [14, 28])
    data.transactions.push({
      id: `income-${day}`,
      accountId,
      merchant: "Fictional employer",
      category: "Income",
      description: "Expected payroll — not guaranteed",
      date: shift(asOf, day),
      amountCents: profile === "kevin" ? 180000 : profile === "ava" ? 240000 : 210000,
      pending: true,
      fictional: true,
    });
  // Cleared history supports activity, income and category views without
  // replaying these amounts against the snapshot's closing account balance.
  for (let week = 0; week < 8; week++) {
    data.transactions.push({
      id: `${profile}-groceries-${week}`, accountId, merchant: "Maple Market",
      category: "Groceries", description: "Fictional cleared grocery purchase",
      date: shift(asOf, -3 - week * 7), amountCents: -(6300 + week * 237), fictional: true,
    });
  }
  for (const day of [-14, -28, -42, -56]) {
    data.transactions.push({
      id: `${profile}-cleared-payroll-${-day}`, accountId, merchant: "Fictional employer",
      category: "Income", description: "Fictional cleared payroll",
      date: shift(asOf, day), amountCents: profile === "kevin" ? 180000 : profile === "ava" ? 240000 : 210000,
      fictional: true,
    });
  }
  return data;
}
export function personalData(s: DemoState, profile: ProfileId) {
  const data = applyPersonalRecords(fixtureData(profile, s.asOf), s.plans[profile].recordSets?.[`demo:demo:${profile}`] || []);
  for (const c of s.commitments) {
    const assignment = c.contributions.find((a) => a.profile === profile);
    if (!assignment) continue;
    data.bills.push({
      id: `shared-${c.id}`,
      accountId: data.accounts[0].id,
      name: c.name,
      dueDate: c.dueDate,
      amountCents: assignment.expectedCents,
      category: "Shared obligation",
      essential: true,
      ...(c.recurring ? { recurringDay: Number(c.dueDate.slice(8)) } : {}),
    });
  }
  return data;
}
// Shared assignments enter the existing engine exactly once as dated bills. Allocate
// the cash before same-day shared debits in stable order, so simultaneous obligations
// cannot each claim the same available cents.
export function coverage(s: DemoState, member: ProfileId, scenario = false) {
  const data = personalData(s, member);
  const simulation = scenario ? s.plans[member].simulation : {};
  const projection = project(data, simulation);
  const result = new Map<string, { coveredCents: number; status: string }>();
  const events = forecastEvents(data).filter((e) =>
    e.id.startsWith("bill:shared-"),
  );
  for (const point of projection.points) {
    const due = events
      .filter((e) => e.date === point.date)
      .sort((a, b) => a.id.localeCompare(b.id));
    let available = Math.max(
      0,
      point.balanceCents + due.reduce((sum, e) => sum - e.amountCents, 0),
    );
    for (const e of due) {
      const amount = -e.amountCents;
      const coveredCents = Math.min(amount, available);
      available -= coveredCents;
      result.set(
        `${e.id.replace("bill:shared-", "").split(":")[0]}:${e.date}`,
        {
          coveredCents,
          status:
            coveredCents >= amount ? "appears achievable" : "may be at risk",
        },
      );
    }
  }
  return result;
}
export function workspaceView(
  s: DemoState,
  workspaceId: string,
  viewer: ProfileId,
) {
  const workspace = membership(s, workspaceId, viewer);
  const commitments = s.commitments
    .filter((c) => c.workspaceId === workspaceId)
    .map((c) => {
      const contributions = c.contributions.map((a) => {
        const consent = consentFor(s, workspaceId, a.profile);
        const own = viewer === a.profile;
        const base = coverage(s, a.profile).get(`${c.id}:${c.dueDate}`);
        const simulated = coverage(s, a.profile, true).get(
          `${c.id}:${c.dueDate}`,
        );
        return {
          profile: a.profile,
          name: profiles.find((p) => p.id === a.profile)!.name,
          expectedCents: a.expectedCents,
          reportedCents: a.reportedCents,
          agreed: a.agreed,
          status:
            own || consent.readiness
              ? base?.status || "unknown — outside forecast"
              : "not shared",
          scenarioStatus:
            own || consent.readiness
              ? simulated?.status || "unknown — outside forecast"
              : "not shared",
          ...(own || consent.coverage
            ? {
                coveredCents: base?.coveredCents ?? null,
                scenarioCoveredCents: simulated?.coveredCents ?? null,
              }
            : {}),
          ...(consent.balance
            ? {
                disclosedBalanceCents: personalData(s, a.profile).accounts[0]
                  .balanceCents,
              }
            : {}),
          disclosedExpenses: personalData(s, a.profile)
            .transactions.filter((t) => consent.expenseIds.includes(t.id))
            .map((t) => ({
              id: t.id,
              merchant: t.merchant,
              amountCents: t.amountCents,
              date: t.date,
            })),
        };
      });
      const allKnown = contributions.every(
        (a) => a.coveredCents !== undefined && a.coveredCents !== null,
      );
      const projectedCents = allKnown
        ? contributions.reduce((n, a) => n + a.coveredCents!, 0)
        : null;
      const scenarioProjectedCents = allKnown
        ? contributions.reduce((n, a) => n + (a.scenarioCoveredCents ?? 0), 0)
        : null;
      return {
        ...c,
        contributions,
        projectedCents,
        scenarioProjectedCents,
        shortfallCents:
          projectedCents === null
            ? null
            : Math.max(0, c.amountCents - projectedCents),
        reportedCents: contributions.reduce((n, a) => n + a.reportedCents, 0),
      };
    });
  return {
    ...workspace,
    commitments,
    ownConsent: consentFor(s, workspaceId, viewer),
    history: s.history
      .filter((h) => h.workspaceId === workspaceId && h.profile === viewer)
      .slice(-20),
  };
}
export function validateSimulation(
  raw: unknown,
  data: FinancialData,
): Simulation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid scenario.");
  const r = raw as Record<string, unknown>;
  const result: Simulation = {};
  if (r.removedSubscriptions !== undefined) {
    if (
      !Array.isArray(r.removedSubscriptions) ||
      r.removedSubscriptions.length > 30 ||
      !r.removedSubscriptions.every((id) =>
        subscriptionsFor(data).some((s) => s.id === id),
      )
    )
      throw new Error("Unknown subscription.");
    result.removedSubscriptions = r.removedSubscriptions as string[];
  }
  if (r.eventId !== undefined) {
    if (
      typeof r.eventId !== "string" ||
      !forecastEvents(data).some(
        (e) => e.id === r.eventId && !e.id.startsWith("bill:shared-"),
      )
    )
      throw new Error("Only personal events can be adjusted.");
    result.eventId = r.eventId;
  }
  for (const field of ["delayDays", "paymentCents", "unexpectedCents"] as const)
    if (r[field] !== undefined) {
      if (
        !Number.isSafeInteger(r[field]) ||
        Number(r[field]) < 0 ||
        Number(r[field]) > (field === "delayDays" ? 30 : 100000000)
      )
        throw new Error("Invalid scenario amount.");
      result[field] = Number(r[field]);
    }
  if (r.unexpectedDate !== undefined) {
    if (
      typeof r.unexpectedDate !== "string" ||
      !isIsoDate(r.unexpectedDate) ||
      r.unexpectedDate <= data.asOf ||
      r.unexpectedDate > shift(data.asOf, 30)
    )
      throw new Error("Invalid scenario date.");
    result.unexpectedDate = r.unexpectedDate;
  }
  if (result.unexpectedCents && !result.unexpectedDate)
    throw new Error("Choose an expense date.");
  return result;
}
