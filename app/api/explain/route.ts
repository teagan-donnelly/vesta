import { demoData } from "@/lib/data";
import { loadNessie } from "@/lib/nessie";
import { explain } from "@/lib/explanations";
import type { Simulation } from "@/lib/types";
import { isIsoDate, todayIso } from "@/lib/analysis";
import { fixtureData, personalData, profileId } from "@/lib/collaboration/model";
import {
  demoSession,
  localPlanning,
  withDemo,
} from "@/lib/collaboration/store";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Same-origin requests only." },
      { status: 403 },
    );
  try {
    const body = await request.json();
    if (!["demo", "nessie"].includes(body.mode))
      return Response.json({ error: "Invalid mode." }, { status: 400 });
    const data =
      body.mode === "nessie"
        ? await loadNessie(
            typeof body.customer === "string" ? body.customer : undefined,
          )
        : typeof body.customer === "string" && body.customer.startsWith("demo:")
          ? body.personalOnly === true
            ? (() => {
                const snapshot = fixtureData(profileId(body.customer.slice(5)), todayIso());
                snapshot.warnings.push("Shared planning is not included; the forecast excludes shared obligations and saved scenarios.");
                return snapshot;
              })()
            : await withDemo(
              demoSession(request).id,
              (s) => personalData(s, profileId(body.customer.slice(5))),
              false,
              localPlanning(request),
            )
          : demoData();
    const raw = body.simulation || {};
    const simulation: Simulation = {};
    if (Array.isArray(raw.removedSubscriptions))
      simulation.removedSubscriptions = raw.removedSubscriptions
        .filter((s: unknown) => typeof s === "string")
        .slice(0, 50);
    if (typeof raw.eventId === "string")
      simulation.eventId = raw.eventId.slice(0, 200);
    for (const field of [
      "delayDays",
      "paymentCents",
      "unexpectedCents",
    ] as const)
      if (raw[field] !== undefined) {
        if (
          !Number.isSafeInteger(raw[field]) ||
          raw[field] < 0 ||
          raw[field] > (field === "delayDays" ? 60 : 100000000)
        )
          return Response.json(
            { error: "Invalid simulation amount." },
            { status: 400 },
          );
        simulation[field] = raw[field];
      }
    if (typeof raw.unexpectedDate === "string" && isIsoDate(raw.unexpectedDate))
      simulation.unexpectedDate = raw.unexpectedDate;
    return Response.json(await explain(data, simulation), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Unable to load financial data for explanations." },
      { status: 502 },
    );
  }
}
