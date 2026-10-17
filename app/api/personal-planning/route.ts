import { personalData, profileId } from "@/lib/collaboration/model";
import { demoSession, localPlanning, sessionHeaders, withDemo } from "@/lib/collaboration/store";

export async function GET(request: Request) {
  const session = demoSession(request);
  try {
    const viewer = profileId(new URL(request.url).searchParams.get("profile"));
    const data = await withDemo(session.id, (state) => ({
      ...personalData(state, viewer),
      planningSimulation: state.plans[viewer].simulation,
    }), false, localPlanning(request));
    return Response.json(data, { headers: sessionHeaders(request, session) });
  } catch {
    return Response.json({ error: "Shared planning unavailable. Personal balances and activity remain available." }, {
      status: 503, headers: sessionHeaders(request, session),
    });
  }
}
