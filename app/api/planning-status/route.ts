import { localPlanning, storageSource } from "@/lib/collaboration/store";
export async function GET(request: Request) {
  const local = localPlanning(request);
  return Response.json(
    {
      backboardConfigured: Boolean(process.env.BACKBOARD_API_KEY),
      tigerConfigured: Boolean(process.env.TIGER_DATABASE_URL),
      activeStorage: storageSource(local),
      storage: storageSource(local),
      connectionState:
        process.env.TIGER_DATABASE_URL && !local
          ? "Configured; this status response does not verify database connectivity."
          : "Local fictional planning selected.",
      identity: "Fictional profile switching only; no real authentication",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
