export async function GET() {
  return Response.json(
    {
      backboardConfigured: Boolean(process.env.BACKBOARD_API_KEY),
      tigerConfigured: Boolean(process.env.TIGER_DATABASE_URL),
      storage: process.env.TIGER_DATABASE_URL
        ? "Tiger Data PostgreSQL (connection verified by a successful planning request)"
        : process.env.VERCEL
          ? "Ephemeral local fictional demo adapter"
          : "Local fictional demo adapter",
      identity: "Fictional profile switching only; no real authentication",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
