import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { loadNessie, nessieRequest } from "./nessie";
import { SANDBOX_PREFIX } from "./sandbox-records";
import {
  projectProposedData,
  scenarioItems,
  scenarioMetrics,
  type ScenarioPreview,
  type SeedItem,
  type SeedCollection,
} from "./sandbox-scenario";
import { todayIso } from "./analysis";
import { explain } from "./explanations";

type RawRecord = Record<string, unknown>;
type Step = {
  reference: string;
  collection: SeedCollection;
  state: "intent" | "verified";
  recordId?: string;
};
type StoredPlan = {
  preview: ScenarioPreview;
  snapshotHash: string;
  itemsHash: string;
  state: "preview" | "writing" | "complete" | "needs-review";
  steps: Step[];
  message?: string;
};
export class WorkflowError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export function assertLocalRequest(request: Request, mutating = false) {
  const url = new URL(request.url);
  if (
    process.env.VERCEL ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    (mutating
      ? request.headers.get("origin") !== url.origin
      : request.headers.has("origin") &&
        request.headers.get("origin") !== url.origin)
  )
    throw new WorkflowError(
      "Sandbox preparation and seeding are available only from the same-origin localhost app.",
      403,
    );
}
function hash(value: unknown, sortArrays = false): string {
  function canonical(v: unknown): unknown {
    if (Array.isArray(v)) {
      const entries = v.map(canonical);
      return sortArrays
        ? entries.sort((a, b) =>
            JSON.stringify(a).localeCompare(JSON.stringify(b)),
          )
        : entries;
    }
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, canonical(x)]),
      );
    return v;
  }
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
function asRecords(value: unknown): RawRecord[] {
  if (!Array.isArray(value) || value.some((v) => !v || typeof v !== "object"))
    throw new WorkflowError(
      "Unexpected Nessie collection format; retrieved records could not be verified.",
      502,
    );
  return value;
}
function matches(item: SeedItem, record: RawRecord) {
  const body = item.body;
  if (item.collection === "bills")
    return (
      record.nickname === body.nickname &&
      record.payee === body.payee &&
      record.payment_amount === body.payment_amount &&
      String(record.payment_date || record.upcoming_payment_date).slice(
        0,
        10,
      ) === body.payment_date &&
      record.status === body.status
    );
  return (
    record.description === body.description &&
    record.amount === body.amount &&
    record.transaction_date === body.transaction_date &&
    record.status === body.status &&
    record.medium === body.medium
  );
}
async function snapshot(customerId: string, accountId: string) {
  const data = await loadNessie(customerId);
  const customer = data.customers.find((c) => c.id === customerId);
  const account = data.accounts.find(
    (a) => a.id === accountId && a.type === "Checking",
  );
  if (customer?.name !== "Vesta Fictional Test" || !account)
    throw new WorkflowError(
      "Select the Vesta Fictional Test customer and one of its checking accounts.",
      400,
    );
  const collections = {} as Record<SeedCollection, RawRecord[]>;
  for (const kind of ["deposits", "withdrawals", "bills"] as const)
    collections[kind] = asRecords(
      await nessieRequest(`/accounts/${encodeURIComponent(accountId)}/${kind}`),
    );
  return {
    data,
    customer,
    account,
    collections,
    fingerprint: hash({ accounts: data.accounts, collections }, true),
  };
}
const defaultRoot = () => join(process.cwd(), ".vesta-sandbox");
async function replaceFile(from: string, to: string) {
  // Windows antivirus/OneDrive can briefly hold a file after it is closed.
  // Only local journal renames are retried; financial POSTs are never retried.
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      if (
        attempt >= 5 ||
        !["EPERM", "EACCES", "EBUSY"].includes(
          (error as NodeJS.ErrnoException).code || "",
        )
      )
        throw error;
      await delay(25 * 2 ** attempt);
    }
  }
}
function planPath(root: string, id: string) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id))
    throw new WorkflowError("Invalid preview ID.", 400);
  return join(root, `${id}.json`);
}
async function save(root: string, plan: StoredPlan) {
  await mkdir(root, { recursive: true });
  const path = planPath(root, plan.preview.id);
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(plan, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  await replaceFile(temp, path);
}
async function accountRun(
  root: string,
  accountId: string,
): Promise<{ planId: string; state: string } | null> {
  try {
    return JSON.parse(
      await readFile(join(root, `account-${hash(accountId)}.json`), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new WorkflowError(
      "The local account ledger could not be read. Manual review is required before any writes.",
    );
  }
}
async function saveAccount(root: string, plan: StoredPlan) {
  const path = join(root, `account-${hash(plan.preview.accountId)}.json`);
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(
    temp,
    JSON.stringify({ planId: plan.preview.id, state: plan.state }),
    { flag: "wx", mode: 0o600 },
  );
  await replaceFile(temp, path);
}
async function readPlan(root: string, id: string): Promise<StoredPlan> {
  const path = planPath(root, id);
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new WorkflowError(
      "Preview was not found. Generate a new preview.",
      404,
    );
  }
}
export async function prepareScenario(
  customerId: string,
  accountId: string,
  root = defaultRoot(),
): Promise<ScenarioPreview> {
  if (await accountRun(root, accountId))
    throw new WorkflowError(
      "This account already has a submitted or interrupted scenario run. Use read-only verification. New seeding is blocked to prevent duplicate or uncertain writes; review the local ledger manually.",
    );
  const live = await snapshot(customerId, accountId);
  if (
    Object.values(live.collections)
      .flat()
      .some((r) =>
        String(r.description || r.nickname || r.payee).startsWith(
          SANDBOX_PREFIX,
        ),
      )
  )
    throw new WorkflowError(
      "Scenario records already exist in this account. Use read-only verification; a second dataset will not be appended. Partial runs require manual review.",
    );
  const items = scenarioItems(live.data.asOf);
  const historyIncomeCents = items
    .filter((i) => i.collection === "deposits")
    .reduce((s, i) => s + i.amountCents, 0);
  const historyExpenseCents = items
    .filter((i) => i.collection === "withdrawals")
    .reduce((s, i) => s + i.amountCents, 0);
  const preview: ScenarioPreview = {
    id: randomUUID(),
    customerId,
    customerName: live.customer.name,
    accountId,
    accountName: live.account.name,
    asOf: live.data.asOf,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    balanceBeforeCents: live.account.balanceCents,
    temporaryPeakBalanceCents: live.account.balanceCents + historyIncomeCents,
    historyIncomeCents,
    historyExpenseCents,
    items,
    expected: scenarioMetrics(projectProposedData(live.data, accountId, items)),
    limitations: [
      "This is a proposal, not proof of creation. Preview calculations are not retrieved financial records. Only the separate read-back report verifies actual Nessie records.",
      "All scenario records are fictional. Spending is represented by actual Nessie withdrawals, not purchase records. No merchant or purchase records are created because a documented purchase creation/list endpoint is unavailable.",
      "Completed history may temporarily change the selected account balance as Nessie applies each record. Deposits are added first; historical inflows and outflows net to zero. Final balances must be verified from Nessie, not assumed.",
      "Existing records are preserved. No updates, deletes or balance resets are performed. If a write or retrieval is uncertain, the workflow stops and never automatically retries it.",
      "Dates are anchored to this preview and it expires after 30 minutes. Payroll recurrence is an estimate, not a guaranteed future deposit.",
    ],
  };
  await save(root, {
    preview,
    snapshotHash: live.fingerprint,
    itemsHash: hash(items),
    state: "preview",
    steps: [],
  });
  return preview;
}

export async function inspectScenario(customerId: string, accountId: string) {
  const live = await snapshot(customerId, accountId);
  const records = Object.entries(live.collections).flatMap(
    ([collection, items]) =>
      items
        .filter((r) =>
          String(r.description || r.nickname || r.payee).startsWith(
            SANDBOX_PREFIX,
          ),
        )
        .map((r) => ({
          collection,
          id: String(r._id || ""),
          description: String(r.description || r.nickname || r.payee),
        })),
  );
  return {
    source: "nessie" as const,
    fictional: true,
    metrics: scenarioMetrics(live.data),
    records,
    balanceCents: live.account.balanceCents,
    asOf: live.data.asOf,
  };
}

export async function confirmScenario(
  id: string,
  confirmation: string,
  acknowledgeBalanceEffects: boolean,
  root = defaultRoot(),
) {
  if (
    confirmation !== "SEED FICTIONAL DATA" ||
    acknowledgeBalanceEffects !== true
  )
    throw new WorkflowError(
      "Review the preview, acknowledge balance effects, and type SEED FICTIONAL DATA before confirming.",
      400,
    );
  let plan = await readPlan(root, id);
  if (plan.state !== "preview")
    throw new WorkflowError(
      "This preview has already been submitted. It will not write again. Use read-only verification; partial or uncertain runs require manual review.",
    );
  if (
    Date.parse(plan.preview.expiresAt) < Date.now() ||
    plan.preview.asOf !== todayIso()
  )
    throw new WorkflowError(
      "The preview expired. Generate and review a fresh preview.",
    );
  if (plan.itemsHash !== hash(plan.preview.items))
    throw new WorkflowError("The saved preview changed. No writes were made.");
  const lockPath = join(root, `${hash(plan.preview.accountId)}.lock`);
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch {
    throw new WorkflowError(
      "This account has an active or interrupted seed run. No concurrent writes are allowed. Review the local seed ledger.",
    );
  }
  try {
    plan = await readPlan(root, id);
    if (plan.state !== "preview")
      throw new WorkflowError(
        "This preview was already submitted. No duplicate writes will be made.",
      );
    if (await accountRun(root, plan.preview.accountId))
      throw new WorkflowError(
        "Another scenario was submitted for this account. No new writes are permitted; use read-only verification.",
      );
    const before = await snapshot(
      plan.preview.customerId,
      plan.preview.accountId,
    );
    if (before.fingerprint !== plan.snapshotHash)
      throw new WorkflowError(
        "Nessie records or balances changed since preview. Generate a new preview before confirming.",
      );
    plan.state = "writing";
    await save(root, plan);
    await saveAccount(root, plan);
    for (const item of plan.preview.items) {
      const path = `/accounts/${encodeURIComponent(plan.preview.accountId)}/${item.collection}`;
      // Persist intent BEFORE sending the POST. A process crash or lost response
      // must never cause the same financial write to be replayed automatically.
      const step: Step = {
        reference: item.reference,
        collection: item.collection,
        state: "intent",
      };
      plan.steps.push(step);
      await save(root, plan);
      await nessieRequest(path, item.body);
      const returned = asRecords(await nessieRequest(path)).filter((r) =>
        matches(item, r),
      );
      if (returned.length !== 1 || typeof returned[0]._id !== "string")
        throw new WorkflowError(
          "A submitted record could not be uniquely retrieved from Nessie. Seeding stopped. Do not retry the write; inspect the seed ledger and API records.",
          502,
        );
      step.state = "verified";
      step.recordId = returned[0]._id;
      await save(root, plan);
    }
    const live = await snapshot(
      plan.preview.customerId,
      plan.preview.accountId,
    );
    for (const item of plan.preview.items) {
      const returned = live.collections[item.collection].filter((r) =>
        matches(item, r),
      );
      const step = plan.steps.find((s) => s.reference === item.reference);
      if (returned.length !== 1 || returned[0]._id !== step?.recordId)
        throw new WorkflowError(
          "Final read-back did not match the created record IDs. No further writes will occur; manual review is required.",
          502,
        );
    }
    const verification = {
      ...(await inspectScenario(
        plan.preview.customerId,
        plan.preview.accountId,
      )),
      expectedBalanceCents: plan.preview.balanceBeforeCents,
      balanceMatchesExpected:
        live.account.balanceCents === plan.preview.balanceBeforeCents,
      verifiedRecords: plan.steps.length,
    };
    plan.state = "complete";
    plan.message = verification.balanceMatchesExpected
      ? "Every submitted record was retrieved and the balance matched."
      : "Every submitted record was retrieved, but the live balance differs from the preview. No balance reset was performed.";
    await save(root, plan);
    await saveAccount(root, plan);
    return {
      state: plan.state,
      message: plan.message,
      verification,
      explanation: await explain(live.data),
    };
  } catch (error) {
    if (plan.state === "writing") {
      plan.state = "needs-review";
      plan.message =
        error instanceof WorkflowError
          ? error.message
          : "Seeding stopped after an upstream failure. Some records may already exist. Inspect the local ledger and Nessie before any manual recovery; do not retry automatically.";
      await save(root, plan);
      await saveAccount(root, plan);
    }
    throw error instanceof WorkflowError
      ? error
      : new WorkflowError(
          plan.state === "complete"
            ? "Record submissions finished, but completion tracking failed. Do not resubmit; verify Nessie and review the local ledger."
            : plan.message ||
                "Sandbox operation failed. No automatic retry will occur.",
          502,
        );
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

export async function scenarioRunStatus(id: string, root = defaultRoot()) {
  const plan = await readPlan(root, id);
  return {
    state: plan.state,
    message: plan.message,
    verified: plan.steps.filter((s) => s.state === "verified").length,
    uncertain: plan.steps
      .filter((s) => s.state === "intent")
      .map((s) => s.reference),
  };
}
