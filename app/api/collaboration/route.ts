import { randomUUID } from "node:crypto";
import { assistant } from "@/lib/collaboration/assistant";
import { clearRemote, remotePreferences } from "@/lib/collaboration/backboard";
import {
  coverage,
  membership,
  personalData,
  profileId,
  profiles,
  validateSimulation,
  workspaceView,
  type Commitment,
  type DemoState,
  type ProfileId,
} from "@/lib/collaboration/model";
import {
  demoSession,
  localPlanning,
  sessionHeaders,
  storageSource,
  withDemo,
} from "@/lib/collaboration/store";
import { isIsoDate, shift } from "@/lib/analysis";
import { financialWarning } from "@/lib/financial-guidance";
import { planningOptions } from "@/lib/planning-options";

function text(value: unknown, max = 100) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /AIza[\w-]+|postgres(?:ql)?:\/\/|(?:API_KEY|password)\s*[:=]/i.test(value)
  )
    throw new Error(
      "Use fictional planning text only; do not include credentials.",
    );
  return value.trim();
}
function cents(value: unknown) {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 0 ||
    Number(value) > 100000000
  )
    throw new Error("Use a valid nonnegative amount in integer cents.");
  return Number(value);
}
export function payload(s: DemoState, viewer: ProfileId, forceLocal = false) {
  const plan = s.plans[viewer];
  return {
    profile: viewer,
    profiles,
    asOf: s.asOf,
    storage: storageSource(forceLocal),
    backboardConfigured: Boolean(process.env.BACKBOARD_API_KEY),
    workspaces: s.workspaces
      .filter((w) => w.members.includes(viewer))
      .map((w) => workspaceView(s, w.id, viewer)),
    own: {
      simulation: plan.simulation,
      memoryOptIn: plan.memoryOptIn,
      preferences: plan.preferences,
      messages: plan.messages,
    },
    context: {
      risk: financialWarning(personalData(s, viewer)),
      obligations: s.commitments.filter(c=>c.contributions.some(a=>a.profile===viewer)).map(c=>({id:c.id,workspaceId:c.workspaceId,name:c.name,dueDate:c.dueDate,shareCents:c.contributions.find(a=>a.profile===viewer)!.expectedCents,coveredCents:coverage(s,viewer).get(`${c.id}:${c.dueDate}`)?.coveredCents ?? null})),
      preferences: personalData(s, viewer).planningPreferences || [],
      options: planningOptions(personalData(s, viewer), plan.simulation, plan.preferences),
    },
    expenses: personalData(s, viewer)
      .transactions.filter((t) => t.amountCents < 0)
      .map((t) => ({
        id: t.id,
        merchant: t.merchant,
        amountCents: t.amountCents,
        date: t.date,
      })),
  };
}
export async function GET(request: Request) {
  const session = demoSession(request);
  const forceLocal = localPlanning(request);
  const params = new URL(request.url).searchParams;
  try {
    const viewer = profileId(params.get("profile") || "kevin");
    const result = await withDemo(
      session.id,
      (s) =>
        params.get("list") === "1"
          ? {
              workspaces: s.workspaces
                .filter((w) => w.members.includes(viewer))
                .map((w) => ({ id: w.id, name: w.name })),
              storage: storageSource(forceLocal),
            }
          : payload(s, viewer, forceLocal),
      false,
      forceLocal,
    );
    return Response.json(result, { headers: sessionHeaders(request, session) });
  } catch {
    return Response.json(
      {
        error:
          "Fictional planning unavailable. Check profile and browser snapshot.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Same-origin requests only." },
      { status: 403 },
    );
  const session = demoSession(request);
  const forceLocal = localPlanning(request);
  try {
    if (Number(request.headers.get("content-length") || 0) > 20000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const body = await request.json();
    if (JSON.stringify(body).length > 20000)
      throw new Error("Request too large.");
    const viewer = profileId(
      new URL(request.url).searchParams.get("profile") || "kevin",
    );
    if (body.confirmed !== true)
      throw new Error("Confirm this planning change first.");
    const result = await withDemo(
      session.id,
      async (s) => {
        const action = body.action;
        if (action === "workspace") {
          const kind = text(body.kind);
          if (
            !["Household", "Couple", "Family", "Business", "Custom"].includes(
              kind,
            )
          )
            throw new Error("Choose a group type.");
          s.workspaces.push({
            id: randomUUID(),
            name: text(body.name),
            kind,
            owner: viewer,
            members: [viewer],
          });
        } else if (action === "member") {
          const w = membership(s, text(body.workspaceId), viewer);
          if (w.owner !== viewer)
            throw new Error(
              "Only the workspace proposer can add demo participants.",
            );
          const member = profileId(body.member);
          if (!w.members.includes(member)) w.members.push(member);
        } else if (action === "commitment") {
          const w = membership(s, text(body.workspaceId), viewer);
          const old = s.commitments.find((c) => c.id === body.id);
          if (old && (old.owner !== viewer || old.workspaceId !== w.id))
            throw new Error("You can edit only your own proposals.");
          if (
            !isIsoDate(body.dueDate) ||
            body.dueDate <= s.asOf ||
            body.dueDate > shift(s.asOf, 365)
          )
            throw new Error("Choose a future due date within one year.");
          if (
            !Array.isArray(body.contributions) ||
            !body.contributions.length ||
            body.contributions.length > w.members.length
          )
            throw new Error("Choose participating members.");
          const contributions = body.contributions.map(
            (a: { profile: unknown; expectedCents: unknown }) => ({
              profile: profileId(a.profile),
              expectedCents: cents(a.expectedCents),
              reportedCents:
                old?.contributions.find((p) => p.profile === a.profile)
                  ?.reportedCents || 0,
              agreed:
                old?.contributions.some(
                  (p) =>
                    p.profile === a.profile &&
                    p.expectedCents === a.expectedCents &&
                    p.agreed,
                ) || false,
            }),
          );
          if (
            new Set(contributions.map((a: { profile: string }) => a.profile))
              .size !== contributions.length ||
            contributions.some(
              (a: { profile: ProfileId }) => !w.members.includes(a.profile),
            )
          )
            throw new Error("Assignments must use unique workspace members.");
          const amountCents = cents(body.amountCents);
          if (
            !amountCents ||
            contributions.reduce(
              (n: number, a: { expectedCents: number }) => n + a.expectedCents,
              0,
            ) !== amountCents
          )
            throw new Error("Contributions must equal the total obligation.");
          const commitment: Commitment = {
            id: old?.id || randomUUID(),
            owner: viewer,
            workspaceId: w.id,
            name: text(body.name),
            amountCents,
            dueDate: body.dueDate,
            recurring: body.recurring === true,
            contributions: contributions.map(
              (a: Commitment["contributions"][number]) => ({
                ...a,
                reportedCents: Math.min(a.reportedCents, a.expectedCents),
              }),
            ),
          };
          s.commitments = s.commitments
            .filter((c) => c.id !== commitment.id)
            .concat(commitment);
        } else if (action === "removeCommitment") {
          const c = s.commitments.find(
            (c) => c.id === body.id && c.owner === viewer,
          );
          if (!c) throw new Error("Own proposal unavailable.");
          membership(s, c.workspaceId, viewer);
          s.commitments = s.commitments.filter((item) => item.id !== c.id);
        } else if (action === "agree") {
          const c = s.commitments.find((c) => c.id === body.id);
          if (!c) throw Error("Commitment unavailable.");
          membership(s, c.workspaceId, viewer);
          const own = c.contributions.find((a) => a.profile === viewer);
          if (!own) throw Error("Own assignment unavailable.");
          own.agreed = true;
        } else if (action === "report") {
          const c = s.commitments.find((c) => c.id === body.id);
          if (!c) throw new Error("Commitment unavailable.");
          membership(s, c.workspaceId, viewer);
          const a = c.contributions.find((a) => a.profile === viewer);
          if (!a) throw new Error("No own assignment.");
          const amount = cents(body.amountCents);
          if (amount > a.expectedCents)
            throw new Error("Report cannot exceed your assignment.");
          a.reportedCents = amount;
        } else if (action === "consent") {
          const w = membership(s, text(body.workspaceId), viewer);
          const expenses = personalData(s, viewer).transactions.map(
            (t) => t.id,
          );
          if (
            !body.consent ||
            !Array.isArray(body.consent.expenseIds) ||
            !body.consent.expenseIds.every(
              (id: unknown) => typeof id === "string" && expenses.includes(id),
            )
          )
            throw new Error("Choose only your own expenses.");
          const recipient = body.recipient ? profileId(body.recipient) : undefined;
          if (recipient && (recipient === viewer || !w.members.includes(recipient))) throw Error("Choose another workspace member.");
          s.consents[recipient ? `${w.id}:${viewer}:${recipient}` : `${w.id}:${viewer}`] = {
            readiness: body.consent.readiness === true,
            coverage: body.consent.coverage === true,
            balance: body.consent.balance === true,
            bills: body.consent.bills === true,
            projection: body.consent.projection === true,
            expenseIds: [...new Set<string>(body.consent.expenseIds)],
          };
        } else if (action === "scenario") {
          s.plans[viewer].simulation = validateSimulation(
            body.simulation,
            personalData(s, viewer),
          );
          for (const c of s.commitments.filter((c) =>
            c.contributions.some((a) => a.profile === viewer),
          )) {
            const status =
              coverage(s, viewer, true).get(`${c.id}:${c.dueDate}`)?.status ||
              "unknown";
            s.history.push({
              at: new Date().toISOString(),
              profile: viewer,
              workspaceId: c.workspaceId,
              commitmentId: c.id,
              status,
            });
          }
          s.history = s.history.slice(-100);
        } else if (action === "memory") {
          if (!Array.isArray(body.preferences) || body.preferences.length > 10)
            throw new Error("Use up to ten preferences.");
          const preferences = body.preferences.map((p: unknown) =>
            text(p, 300),
          );
          const plan = s.plans[viewer];
          if (body.enabled === true) {
            if (process.env.BACKBOARD_API_KEY)
              await remotePreferences(
                plan,
                `${session.id}-${viewer}`,
                preferences,
              );
            plan.memoryOptIn = true;
            plan.preferences = preferences;
          } else {
            if (plan.assistantId) await clearRemote(plan);
            plan.memoryOptIn = false;
            plan.preferences = [];
          }
        } else if (action === "clearConversation") {
          s.plans[viewer].messages = [];
        } else if (action === "chat") {
          const response = await assistant(
            s,
            viewer,
            text(body.question, 1000),
            body.language === "es" ? "es" : "en",
            `${session.id}-${viewer}`,
          );
          return { ...payload(s, viewer, forceLocal), assistant: response };
        } else throw new Error("Unknown planning action.");
        return payload(s, viewer, forceLocal);
      },
      true,
      forceLocal,
    );
    return Response.json(result, { headers: sessionHeaders(request, session) });
  } catch {
    return Response.json(
      {
        error:
          "Planning change was not completed. Check permissions, amounts, confirmation, and configured services. No financial payment was made.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
