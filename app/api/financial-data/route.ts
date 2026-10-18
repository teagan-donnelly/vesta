import { demoData } from "@/lib/data";
import { loadNessie } from "@/lib/nessie";
import { personalData, profileId } from "@/lib/collaboration/model";
import { withDemo, demoSession } from "@/lib/collaboration/store";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") || "demo";
  if (!["demo", "nessie"].includes(mode))
    return Response.json({ error: "Invalid data mode." }, { status: 400 });
  try {
    if (mode === "demo" && params.get("customer")?.startsWith("demo:")) {
      const viewer = profileId(params.get("customer")!.slice(5));
      const data = await withDemo(demoSession(request).id, s => ({ ...personalData(s, viewer), planningSimulation: s.plans[viewer].simulation }));
      return Response.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json(
      mode === "demo"
        ? demoData()
        : await loadNessie(params.get("customer") || undefined),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: "Financial data unavailable. Check the selected source and server configuration.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
