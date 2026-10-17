import { assertLocalRequest, WorkflowError } from "@/lib/sandbox-workflow";
// Retired: all dataset writes must pass through an immutable reviewed preview.
export async function POST(request: Request) {
  try {
    assertLocalRequest(request, true);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof WorkflowError ? error.message : "Localhost only.",
      },
      { status: 403 },
    );
  }
  return Response.json(
    {
      error:
        "This creation endpoint is retired. Use Settings > Preview fictional dataset for the existing fictional customer. No records were written.",
    },
    { status: 410 },
  );
}
