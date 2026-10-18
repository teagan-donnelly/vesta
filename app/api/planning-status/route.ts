export async function GET() {
  return Response.json({ backboardConfigured: Boolean(process.env.BACKBOARD_API_KEY), storage: "Browser-local fictional snapshot", activeStorage: "Browser-local fictional snapshot", identity: "Fictional profile switching only; no real authentication" }, { headers: { "Cache-Control": "no-store" } });
}
