import { randomUUID } from "node:crypto";
import {
  demoSession,
  localPlanning,
  sessionHeaders,
  storageSource,
  withDemo,
} from "@/lib/collaboration/store";
import { personalRecords } from "@/lib/collaboration/records";
import { fixtureData, profileId } from "@/lib/collaboration/model";
import { demoData } from "@/lib/data";
import { loadNessie } from "@/lib/nessie";
import { todayIso } from "@/lib/analysis";
import {
  holdingValue,
  recordScope,
  validateRecord,
  type PersonalRecord,
} from "@/lib/management";
function context(request: Request) {
  const query = new URL(request.url).searchParams;
  const mode = query.get("mode") || "demo",
    customer = query.get("customer") || "";
  recordScope(mode, customer);
  return {
    mode,
    customer,
    session: demoSession(request),
    local: localPlanning(request),
  };
}
export async function GET(request: Request) {
  try {
    const { mode, customer, session, local } = context(request);
    const records = await withDemo(
      session.id,
      (s) => personalRecords(s, mode, customer).records,
      false,
      local,
    );
    return Response.json(
      { records, storage: storageSource(local) },
      { headers: sessionHeaders(request, session) },
    );
  } catch {
    return Response.json(
      {
        error:
          "Personal planning records are unavailable. Choose storage in Settings; bank data remains available.",
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
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 16000) throw Error();
    body = JSON.parse(raw);
    if (body.confirmed !== true || !["save", "delete"].includes(body.action))
      throw Error();
    if (body.action === "save") body.record = validateRecord(body.record);
    else if (
      typeof body.id !== "string" ||
      !/^[a-zA-Z0-9:_-]{1,200}$/.test(body.id)
    )
      throw Error();
  } catch {
    return Response.json(
      { error: "Check the record fields and explicitly confirm this change." },
      { status: 400 },
    );
  }
  try {
    const { mode, customer, session, local } = context(request);
    if (
      body.action === "save" &&
      ["transaction", "subscription", "annotation"].includes(body.record.kind)
    ) {
      const data =
        mode === "nessie"
          ? await loadNessie(customer)
          : customer.startsWith("demo:")
            ? fixtureData(profileId(customer.slice(5)), todayIso())
            : demoData();
      if (
        body.record.kind === "annotation"
          ? !data.transactions.some(
              (transaction) => transaction.id === body.record.referenceId,
            )
          : !data.accounts.some(
              (account) => account.id === body.record.accountId,
            )
      )
        return Response.json(
          {
            error:
              "Choose an account or imported transaction belonging to this selected profile.",
          },
          { status: 400 },
        );
    }
    const records = await withDemo(
      session.id,
      (state) => {
        const bucket = personalRecords(state, mode, customer);
        let records = bucket.records;
        if (body.action === "delete")
          records = records.filter(
            (r) => r.id !== body.id && r.referenceId !== body.id,
          );
        else {
          const record = body.record as PersonalRecord;
          const previous = records.find((r) => r.id === record.id);
          if (previous && previous.kind !== record.kind)
            throw Error("Record types cannot change.");
          if (records.length >= 500 && !previous)
            throw Error("Record limit reached.");
          if (
            record.kind === "contribution" &&
            !records.some(
              (r) => r.kind === "goal" && r.id === record.referenceId,
            )
          )
            throw Error("Own goal required.");
          if (
            record.kind === "budget" &&
            records.some(
              (r) =>
                r.kind === "budget" &&
                r.id !== record.id &&
                r.category === record.category &&
                r.date?.slice(0, 7) === record.date?.slice(0, 7),
            )
          )
            throw Error("One budget per category and month.");
          records = records
            .filter(
              (r) =>
                r.id !== record.id &&
                !(
                  record.referenceId &&
                  ["annotation", "subscription"].includes(record.kind) &&
                  r.kind === record.kind &&
                  r.referenceId === record.referenceId
                ),
            )
            .concat(record);
          if (record.kind === "holding") {
            records = records.filter(
              (r) =>
                !(
                  r.kind === "valuation" &&
                  r.referenceId === record.id &&
                  r.date === record.date
                ),
            );
            records.push({
              id: randomUUID(),
              kind: "valuation",
              referenceId: record.id,
              label: record.label,
              amountCents: holdingValue(record),
              date: record.date,
            });
          }
          if (
            record.kind === "credit" &&
            record.date &&
            ["On time", "Late"].includes(record.paymentStatus || "")
          ) {
            records = records.filter(
              (r) =>
                !(
                  r.kind === "payment" &&
                  r.referenceId === record.id &&
                  r.date === record.date
                ),
            );
            records.push({
              id: randomUUID(),
              kind: "payment",
              label: record.label,
              referenceId: record.id,
              date: record.date,
              paymentStatus: record.paymentStatus,
            });
          }
        }
        bucket.save(records);
        return records;
      },
      true,
      local,
    );
    return Response.json(
      { records, storage: storageSource(localPlanning(request)) },
      { headers: sessionHeaders(request, session) },
    );
  } catch {
    return Response.json(
      {
        error:
          "The change was not saved. Check personal record limits, linked goals and planning storage.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
