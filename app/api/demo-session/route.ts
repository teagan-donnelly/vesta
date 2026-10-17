import { demoSession, sessionHeaders } from "@/lib/collaboration/store";

// Establish browser isolation without requiring a planning database connection.
export async function GET(request: Request) {
  return Response.json({ ready: true }, {
    headers: sessionHeaders(request, demoSession(request)),
  });
}
