import { financialSnapshot } from "./financial-snapshot";
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
  { id: "noah", name: "Noah" },
  { id: "lily", name: "Lily" },
] as const;
export type ProfileId = "ava" | "kevin" | "maya" | "noah" | "lily";
export type Consent = {
  readiness: boolean;
  coverage: boolean;
  balance: boolean;
  bills?: boolean;
  projection?: boolean;
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
    hasReported?: boolean;
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
  snapshotRevision?: number;
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
    snapshotRevision: 4,
    asOf,
    workspaces: [
      { id: "household", name: "Maple Street Roommates", kind: "Household", owner: "kevin", members: ["kevin", "maya", "noah", "lily"] },
      { id: "vacation", name: "Kevin & Ava — Vacation", kind: "Couple", owner: "kevin", members: ["kevin", "ava"] },
    ],
    commitments: [
      { id: "rent", workspaceId: "household", owner: "kevin", name: "Monthly rent", amountCents: 240000, dueDate: shift(asOf,8), recurring: true,
        contributions: (["kevin", "maya", "noah", "lily"] as ProfileId[]).map(profile=>({profile, expectedCents:60000, reportedCents:profile === "noah" ? 0 : 60000, hasReported:profile !== "noah", agreed:true})) },
      { id: "utilities", workspaceId: "household", owner: "kevin", name: "Shared electric utility", amountCents:40000, dueDate:shift(asOf,2), recurring:true,
        contributions: (["kevin", "maya", "noah", "lily"] as ProfileId[]).map(profile=>({profile, expectedCents:10000, reportedCents:profile === "noah" ? 0 : 10000, hasReported:profile !== "noah", agreed:true})) },
      { id: "vacation", workspaceId:"vacation", owner:"kevin", name:"Vacation savings", amountCents:80000, dueDate:shift(asOf,10), recurring:false,
        contributions: (["kevin", "ava"] as ProfileId[]).map(profile=>({profile, expectedCents:40000, reportedCents:0, agreed:true})) },
    ],
    consents: {
      ...Object.fromEntries((["kevin", "maya", "noah", "lily"] as ProfileId[]).map(p=>[`household:${p}`,{...consentDefault(),readiness:true}])),
      "household:maya:kevin": {...consentDefault(),readiness:true,balance:true},
      "household:noah": {...consentDefault(),readiness:true,coverage:true},
      "vacation:kevin:ava": {...consentDefault(),readiness:true,coverage:true,balance:true,bills:true,projection:true},
      "vacation:ava:kevin": {...consentDefault(),readiness:true,coverage:true,balance:true,bills:true,projection:true},
    },
    plans: Object.fromEntries(profiles.map(p=>[p.id,{...privateDefault(),recordSets:{[`demo:demo:${p.id}`]:snapshotRecords(p.id,asOf)}}])) as Record<ProfileId,PrivatePlan>,
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
  recipient?: ProfileId,
) {
  if (recipient && s.consents[`${workspaceId}:${member}:${recipient}`]) return s.consents[`${workspaceId}:${member}:${recipient}`];
  return s.consents[`${workspaceId}:${member}`] || consentDefault();
}
export const fixtureData = financialSnapshot;
export function personalData(s: DemoState, profile: ProfileId) {
  const data = applyPersonalRecords(fixtureData(profile, s.asOf), s.plans[profile].recordSets?.[`demo:demo:${profile}`] || []);
  for (const c of s.commitments) {
    const assignment = c.contributions.find((a) => a.profile === profile);
    if (!assignment) continue;
    const utilityName = c.id === "utilities" ? data.bills.find(b=>b.id === "utility")?.name : undefined;
    if (c.id === "utilities") data.bills = data.bills.filter(b=>b.id !== "utility");
    data.bills.push({
      id: `shared-${c.id}`,
      accountId: data.accounts[0].id,
      name: utilityName || c.name,
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
        const consent = consentFor(s, workspaceId, a.profile, viewer);
        const own = viewer === a.profile;
        const base = coverage(s, a.profile).get(`${c.id}:${c.dueDate}`);
        const simulated = coverage(s, a.profile, true).get(
          `${c.id}:${c.dueDate}`,
        );
        return {
          profile: a.profile,
          name: profiles.find((p) => p.id === a.profile)!.name,
          expectedCents: a.expectedCents,
          reportedCents: a.hasReported === false ? null : a.reportedCents,
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
          ...(consent.bills ? {disclosedBills: forecastEvents(personalData(s,a.profile)).filter(e=>e.amountCents<0).map(e=>({id:e.id,name:e.label,dueDate:e.date,amountCents:-e.amountCents}))} : {}),
          ...(consent.projection ? {disclosedProjection: project(personalData(s,a.profile),s.plans[a.profile].simulation).points.map(p=>({date:p.date,balanceCents:p.balanceCents}))} : {}),
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
        health: contributions.some(a=>a.scenarioStatus === "may be at risk") ? "At Risk" : contributions.every(a=>a.scenarioStatus === "appears achievable") ? "On Track" : "Not fully shared",
        projectedCents,
        scenarioProjectedCents,
        shortfallCents:
          projectedCents === null
            ? null
            : Math.max(0, c.amountCents - projectedCents),
        reportedCents: contributions.reduce((n, a) => n + (a.reportedCents ?? 0), 0),
      };
    });
  return {
    ...workspace,
    commitments,
    ownConsent: consentFor(s, workspaceId, viewer),
    recipientConsents: Object.fromEntries(workspace.members.filter(p=>p!==viewer).map(p=>[p,consentFor(s,workspaceId,viewer,p)])),
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
