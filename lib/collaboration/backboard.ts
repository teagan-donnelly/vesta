import type { PrivatePlan } from "./model";
const base = "https://app.backboard.io/api";
export async function backboard(path: string, method = "GET", body?: unknown) {
  if (!process.env.BACKBOARD_API_KEY)
    throw new Error("Backboard not configured.");
  const response = await fetch(base + path, {
    method,
    headers: {
      "X-API-Key": process.env.BACKBOARD_API_KEY,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Backboard unavailable (HTTP ${response.status}).`);
  return response.status === 204 ? {} : response.json();
}
export async function ensureAssistant(plan: PrivatePlan, namespace: string) {
  if (!plan.assistantId) {
    const result = await backboard("/assistants", "POST", {
      name: `Vesta fictional demo ${namespace}`,
      system_prompt:
        "Classify financial planning questions. Never calculate money or reveal private information. Remember only explicitly supplied preferences.",
    });
    if (typeof result.assistant_id !== "string")
      throw new Error("Backboard returned an invalid assistant.");
    plan.assistantId = result.assistant_id;
  }
  return plan.assistantId!;
}
export async function remotePreferences(
  plan: PrivatePlan,
  namespace: string,
  preferences: string[],
) {
  const id = await ensureAssistant(plan, namespace);
  const result = await backboard(
    `/assistants/${encodeURIComponent(id)}/memories`,
  );
  for (const memory of result.memories || []) {
    const memoryId = memory.memory_id || memory.id;
    if (typeof memoryId !== "string")
      throw new Error("Backboard memory response invalid.");
    await backboard(
      `/assistants/${encodeURIComponent(id)}/memories/${encodeURIComponent(memoryId)}`,
      "DELETE",
    );
  }
  for (const content of preferences)
    await backboard(`/assistants/${encodeURIComponent(id)}/memories`, "POST", {
      content,
      metadata: { source: "explicit-user-preference" },
    });
}
export async function clearRemote(plan: PrivatePlan) {
  if (plan.assistantId) {
    await backboard(
      `/assistants/${encodeURIComponent(plan.assistantId)}`,
      "DELETE",
    );
    delete plan.assistantId;
  }
}
