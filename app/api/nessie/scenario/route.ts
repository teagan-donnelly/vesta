import {
  assertLocalRequest,
  confirmScenario,
  inspectScenario,
  prepareScenario,
  scenarioRunStatus,
  WorkflowError,
} from "@/lib/sandbox-workflow";
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  return json(
    {
      error:
        error instanceof WorkflowError
          ? error.message
          : "Sandbox request failed. No automatic writes or retries will occur.",
    },
    error instanceof WorkflowError ? error.status : 502,
  );
}
export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const params = new URL(request.url).searchParams;
    const planId = params.get("planId");
    if (planId) return json(await scenarioRunStatus(planId));
    const customerId = params.get("customerId");
    const accountId = params.get("accountId");
    if (!customerId || !accountId)
      return json({ error: "Select a customer and checking account." }, 400);
    return json(await inspectScenario(customerId, accountId));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertLocalRequest(request, true);
    const raw = await request.text();
    if (raw.length > 8000) return json({ error: "Request is too large." }, 400);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON request." }, 400);
    }
    if (
      body?.action === "preview" &&
      typeof body.customerId === "string" &&
      typeof body.accountId === "string"
    )
      return json({
        preview: await prepareScenario(body.customerId, body.accountId),
      });
    if (body?.action === "confirm" && typeof body.planId === "string")
      return json(
        await confirmScenario(
          body.planId,
          body.confirmation,
          body.acknowledgeBalanceEffects,
        ),
      );
    return json(
      { error: "Choose preview or explicitly confirm a saved preview." },
      400,
    );
  } catch (error) {
    return failure(error);
  }
}
