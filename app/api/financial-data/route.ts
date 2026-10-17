import { demoData } from "@/lib/data";
import { loadNessie } from "@/lib/nessie";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") || "demo";
  if (!["demo", "nessie"].includes(mode))
    return Response.json({ error: "Invalid data mode." }, { status: 400 });
  try {
    return Response.json(
      mode === "demo"
        ? demoData()
        : await loadNessie(params.get("customer") || undefined),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Financial data unavailable.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
